import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { isPlaceholderStripeKey } from '@/lib/payments';
import { applyStripePaymentSucceeded } from '@/lib/stripeWebhook';
import { captureError } from '@/lib/monitoring';
import { serverError } from '@/lib/http';

function webhookSecretConfigured(secret: string | undefined): secret is string {
  return !!secret && secret.startsWith('whsec_') && !secret.includes('your_');
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const key = process.env.STRIPE_SECRET_KEY;
  // Fail closed: never process unauthenticated events.
  if (!webhookSecretConfigured(secret) || isPlaceholderStripeKey(key)) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });

  const stripe = new Stripe(key!, { apiVersion: '2023-10-16' as const });
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type !== 'payment_intent.succeeded') {
    return NextResponse.json({ received: true });
  }

  try {
    const pi = event.data.object as Stripe.PaymentIntent;
    const result = await applyStripePaymentSucceeded(prisma, event.id, pi);
    if (result.outcome === 'rejected') {
      // Acknowledge (so Stripe stops retrying) but flag for manual review; order stays pending.
      await captureError(new Error(`Stripe payment not applied: ${result.reason}`), {
        route: 'webhooks/stripe',
        eventId: event.id,
        paymentIntentId: pi.id,
      });
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    // 500 lets Stripe retry; the event id was not recorded because the transaction rolled back.
    return serverError('webhooks/stripe', err, { eventId: event.id });
  }
}
