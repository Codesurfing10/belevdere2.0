import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';
import { isDemoMode, isPlaceholderStripeKey, PAYMENTS_NOT_CONFIGURED } from '@/lib/payments';
import { ownsBooking } from '@/lib/security';
import { captureError } from '@/lib/monitoring';


export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { bookingId } = body;

  if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 });

  if (!(await ownsBooking(req, bookingId))) {
    return NextResponse.json({ error: 'Not authorized for this booking' }, { status: 403 });
  }

  const order = await prisma.order.findUnique({
    where: { bookingId },
    include: { booking: { include: { listing: true } } }
  });

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (order.status === 'paid') {
    return NextResponse.json({ success: true, alreadyPaid: true, orderId: order.id, bookingId });
  }

  // Explicit opt-in only: DEMO_MODE=true marks paid without charging (public demo).
  if (isDemoMode()) {
    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'paid',
          stripePaymentIntentId: `demo_pi_${order.id}`,
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
      message: 'Demo checkout complete — order marked paid, booking confirmed (no Stripe charge).',
      amount: order.total,
      orderId: order.id,
      bookingId,
    });
  }

  if (isPlaceholderStripeKey(stripeKey)) {
    // Fail safe: no keys and no DEMO_MODE -> leave order pending / booking on hold.
    return NextResponse.json(PAYMENTS_NOT_CONFIGURED, { status: 503 });
  }

  try {
    const stripe = new Stripe(stripeKey!, {
      apiVersion: '2023-10-16' as const,
    });

    const amountCents = Math.round(order.total * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      metadata: {
        bookingId,
        orderId: order.id,
      },
      description: `Booking: ${order.booking.listing.title}`,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { stripePaymentIntentId: paymentIntent.id }
    });

    return NextResponse.json({
      demoMode: false,
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: order.total,
      message: 'PaymentIntent created. Complete payment with Stripe on the client.',
    });
  } catch (err: unknown) {
    await captureError(err, { route: 'checkout', bookingId });
    const message = err instanceof Error ? err.message : 'Stripe checkout failed';
    return NextResponse.json({ error: message, success: false }, { status: 500 });
  }
}
