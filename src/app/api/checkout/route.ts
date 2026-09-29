import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

function isDemoStripeKey(key: string | undefined): boolean {
  if (!key || !key.trim()) return true;
  const k = key.trim();
  if (k === 'sk_test_placeholder') return true;
  if (k.includes('your_stripe')) return true;
  if (k.startsWith('sk_test_your_') || k.startsWith('sk_live_your_')) return true;
  return false;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { bookingId } = body;

  if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { bookingId },
    include: { booking: { include: { listing: true } } }
  });

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const forceDemo = process.env.DEMO_MODE === 'true' || process.env.DEMO_MODE === '1';
  const demoMode = forceDemo || isDemoStripeKey(stripeKey);

  if (demoMode) {
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
    const message = err instanceof Error ? err.message : 'Stripe checkout failed';
    return NextResponse.json({ error: message, success: false }, { status: 500 });
  }
}
