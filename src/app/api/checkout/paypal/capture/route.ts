import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { capturePayPalOrder, isPayPalConfigured } from '@/lib/paypal';

type CaptureResponse = {
  id: string;
  status: string;
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{ status?: string }>;
    };
  }>;
};

function isCaptureCompleted(capture: CaptureResponse): boolean {
  if (capture.status === 'COMPLETED') return true;
  const nested = capture.purchase_units?.[0]?.payments?.captures?.[0]?.status;
  return nested === 'COMPLETED';
}

/**
 * POST /api/checkout/paypal/capture
 * Body: { bookingId: string, paypalOrderId: string }
 * Captures an approved PayPal order and marks booking confirmed.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { bookingId, paypalOrderId } = body as {
    bookingId?: string;
    paypalOrderId?: string;
  };

  if (!bookingId || !paypalOrderId) {
    return NextResponse.json(
      { error: 'bookingId and paypalOrderId required' },
      { status: 400 }
    );
  }

  const order = await prisma.order.findUnique({
    where: { bookingId },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (order.status === 'paid') {
    return NextResponse.json({
      success: true,
      alreadyPaid: true,
      message: 'Order already paid.',
      orderId: order.id,
      bookingId,
    });
  }

  if (!isPayPalConfigured()) {
    return NextResponse.json(
      { error: 'PayPal is not configured; use demo create endpoint instead.' },
      { status: 400 }
    );
  }

  if (order.paypalOrderId && order.paypalOrderId !== paypalOrderId) {
    return NextResponse.json(
      { error: 'paypalOrderId does not match this booking order' },
      { status: 400 }
    );
  }

  try {
    const capture = (await capturePayPalOrder(paypalOrderId)) as CaptureResponse;

    if (!isCaptureCompleted(capture)) {
      return NextResponse.json(
        {
          error: `PayPal capture not completed (status: ${capture.status})`,
          success: false,
        },
        { status: 402 }
      );
    }

    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'paid',
          paypalOrderId,
        },
      }),
      prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'confirmed' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      demoMode: false,
      message: 'PayPal payment captured — booking confirmed.',
      amount: order.total,
      orderId: order.id,
      bookingId,
      paypalOrderId,
      paypalStatus: capture.status,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'PayPal capture failed';
    return NextResponse.json({ error: message, success: false }, { status: 500 });
  }
}
