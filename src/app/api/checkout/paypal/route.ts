import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  createPayPalOrder,
  isPayPalConfigured,
} from '@/lib/paypal';

/**
 * POST /api/checkout/paypal
 * Body: { bookingId: string }
 *
 * - Demo (no PayPal credentials / DEMO_MODE): marks order paid + booking confirmed.
 * - Live: creates a PayPal Order (intent CAPTURE) and returns { paypalOrderId } for the JS SDK.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { bookingId } = body as { bookingId?: string };

  if (!bookingId) {
    return NextResponse.json({ error: 'bookingId required' }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { bookingId },
    include: { booking: { include: { listing: true } } },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (order.status === 'paid' || order.booking.status === 'confirmed') {
    return NextResponse.json({
      success: true,
      alreadyPaid: true,
      message: 'Order already paid / booking already confirmed.',
      amount: order.total,
      orderId: order.id,
      bookingId,
    });
  }

  if (!isPayPalConfigured()) {
    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'paid',
          paypalOrderId: `demo_paypal_${order.id}`,
        },
      }),
      prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'confirmed' },
      }),
    ]);

    return NextResponse.json({
      demoMode: true,
      success: true,
      message:
        'Demo PayPal checkout complete — order marked paid, booking confirmed (no PayPal charge). Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET for live PayPal.',
      amount: order.total,
      orderId: order.id,
      bookingId,
    });
  }

  try {
    const paypalOrder = await createPayPalOrder({
      amount: order.total,
      currency: 'USD',
      description: `Booking: ${order.booking.listing.title}`,
      bookingId,
      orderId: order.id,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { paypalOrderId: paypalOrder.id },
    });

    return NextResponse.json({
      demoMode: false,
      success: true,
      paypalOrderId: paypalOrder.id,
      amount: order.total,
      orderId: order.id,
      bookingId,
      message: 'PayPal order created. Approve payment with the PayPal buttons.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'PayPal checkout failed';
    return NextResponse.json({ error: message, success: false }, { status: 500 });
  }
}

/** GET — whether PayPal is configured (for client UI). Never returns secrets. */
export async function GET() {
  const configured = isPayPalConfigured();
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID || '';
  const publicClientId =
    configured && clientId && !clientId.toLowerCase().includes('your_')
      ? clientId.trim()
      : null;

  return NextResponse.json({
    configured,
    demoMode: !configured,
    clientId: publicClientId,
    mode: process.env.PAYPAL_MODE === 'live' ? 'live' : 'sandbox',
  });
}
