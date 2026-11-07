import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { toCents } from '@/lib/money';

export type PaymentIntentLike = {
  id: string;
  amount_received: number;
  currency: string;
  status?: string;
  metadata?: Record<string, string> | null;
};

export type ApplyResult =
  | { outcome: 'paid' | 'already_paid' | 'duplicate' }
  | { outcome: 'rejected'; reason: string };

/**
 * Idempotently applies a payment_intent.succeeded event. Records the event id and
 * updates order + booking in one transaction; only marks paid when the intent matches
 * the order's stored PaymentIntent id, booking, currency and amount.
 */
export async function applyStripePaymentSucceeded(
  prisma: PrismaClient,
  eventId: string,
  pi: PaymentIntentLike
): Promise<ApplyResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.processedWebhookEvent.create({
        data: { id: eventId, provider: 'stripe', type: 'payment_intent.succeeded' },
      });
      const orderId = pi.metadata?.orderId;
      const bookingId = pi.metadata?.bookingId;
      if (!orderId || !bookingId) return { outcome: 'rejected', reason: 'missing metadata' } as const;
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order || order.bookingId !== bookingId) return { outcome: 'rejected', reason: 'unknown order/booking' } as const;
      if (order.status === 'paid') return { outcome: 'already_paid' } as const;
      if (order.stripePaymentIntentId !== pi.id) return { outcome: 'rejected', reason: 'payment intent mismatch' } as const;
      if ((pi.currency || '').toLowerCase() !== 'usd') return { outcome: 'rejected', reason: 'currency mismatch' } as const;
      if (pi.amount_received !== toCents(order.total)) return { outcome: 'rejected', reason: 'amount mismatch' } as const;

      const updated = await tx.order.updateMany({
        where: { id: order.id, status: 'pending' },
        data: { status: 'paid' },
      });
      if (updated.count !== 1) return { outcome: 'already_paid' } as const;
      await tx.booking.update({ where: { id: bookingId }, data: { status: 'confirmed' } });
      return { outcome: 'paid' } as const;
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return { outcome: 'duplicate' };
    }
    throw err;
  }
}
