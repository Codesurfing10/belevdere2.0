import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { capturePayPalOrder, getPayPalOrder, isPayPalConfigured, type PayPalOrderDetails } from '@/lib/paypal';
import { verifyPayPalCapture, verifyPayPalOrderBeforeCapture } from '@/lib/paypalVerify';
import { ownsBooking } from '@/lib/security';
import { captureError } from '@/lib/monitoring';
import { serverError } from '@/lib/http';

/**
 * POST /api/checkout/paypal/capture
 * Body: { bookingId: string, paypalOrderId: string }
 * Verifies the PayPal order belongs to this booking and matches the order total/currency,
 * captures it, re-verifies the captured amount, then atomically marks order paid + booking confirmed.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { bookingId, paypalOrderId } = body as { bookingId?: string; paypalOrderId?: string };

  if (typeof bookingId !== 'string' || !bookingId || typeof paypalOrderId !== 'string' || !paypalOrderId) {
    return NextResponse.json({ error: 'bookingId and paypalOrderId required' }, { status: 400 });
  }

  if (!(await ownsBooking(req, bookingId))) {
    return NextResponse.json({ error: 'Not authorized for this booking' }, { status: 403 });
  }

  const order = await prisma.order.findUnique({ where: { bookingId } });
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  if (order.status === 'paid') {
    return NextResponse.json({ success: true, alreadyPaid: true, message: 'Order already paid.', orderId: order.id, bookingId });
  }

  if (!isPayPalConfigured()) {
    return NextResponse.json(
      { error: 'PayPal is not configured; no charge was made.', code: 'PAYMENTS_NOT_CONFIGURED' },
      { status: 503 }
    );
  }

  // Must be the PayPal order our server created for this booking.
  if (!order.paypalOrderId || order.paypalOrderId !== paypalOrderId) {
    return NextResponse.json({ error: 'paypalOrderId does not match this booking order' }, { status: 400 });
  }

  const expected = { total: order.total, currency: 'USD', bookingId, orderId: order.id };

  try {
    const details = await getPayPalOrder(paypalOrderId);
    const preProblem = verifyPayPalOrderBeforeCapture(details, expected);
    if (preProblem) {
      await captureError(new Error(`PayPal pre-capture check failed: ${preProblem}`), { route: 'checkout/paypal/capture', bookingId });
      return NextResponse.json(
        { error: 'Your order changed since PayPal was opened. No charge was made; please start checkout again.', code: 'ORDER_CHANGED' },
        { status: 409 }
      );
    }

    const capture = (await capturePayPalOrder(paypalOrderId)) as PayPalOrderDetails;
    const problem = verifyPayPalCapture(capture, expected);
    if (problem) {
      await captureError(new Error(`PayPal capture not applied: ${problem}`), {
        route: 'checkout/paypal/capture',
        bookingId,
        paypalOrderId,
      });
      return NextResponse.json(
        { error: 'Payment could not be confirmed. Your booking is still pending; contact support if you were charged.', success: false },
        { status: 402 }
      );
    }

    await prisma.$transaction(async (tx) => {
      const updated = await tx.order.updateMany({
        where: { id: order.id, status: 'pending', paypalOrderId },
        data: { status: 'paid' },
      });
      if (updated.count === 1) {
        await tx.booking.update({ where: { id: bookingId }, data: { status: 'confirmed' } });
      }
    });

    return NextResponse.json({
      success: true,
      demoMode: false,
      message: 'PayPal payment captured — booking confirmed.',
      amount: order.total,
      orderId: order.id,
      bookingId,
      paypalOrderId,
    });
  } catch (err: unknown) {
    return serverError('checkout/paypal/capture', err, { bookingId });
  }
}
