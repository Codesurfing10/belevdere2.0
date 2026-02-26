import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { bookingId } = body;

  if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { bookingId },
    include: { booking: { include: { listing: true } } }
  });

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
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
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amount: order.total,
  });
}
