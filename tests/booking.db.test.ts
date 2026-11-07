/**
 * Real-Postgres integration tests. Skipped unless TEST_DATABASE_URL is set
 * (CI provides a throwaway Postgres service; locally point it at a disposable DB).
 * Run migrations first: DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createHold, validateHoldInput, BookingError } from '@/lib/booking';
import { applyStripePaymentSucceeded } from '@/lib/stripeWebhook';

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d('booking + payments against Postgres', () => {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  let listingId = '';
  const run = Math.random().toString(36).slice(2);
  const day = (o: number) => new Date(Date.now() + o * 86400000).toISOString().slice(0, 10);
  const input = (s: number, e: number, guests = 2) =>
    validateHoldInput({ listingId, startDate: day(s), endDate: day(e), guests, guestName: 'T', guestEmail: 't@example.com' });

  beforeAll(async () => {
    const m = await prisma.propertyManager.create({ data: { name: 'M', email: 'm@example.com', phone: '1' } });
    const l = await prisma.rentalListing.create({
      data: { managerId: m.id, title: 'IT', description: 'd', address: 'a', city: 'Testville', lat: 0, lng: 0, nightlyPrice: 100, cleaningFee: 50, serviceFee: 25, maxGuests: 4 },
    });
    listingId = l.id;
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('only one of many concurrent overlapping holds succeeds', async () => {
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => createHold(prisma, input(30, 33))));
    const ok = results.filter((r) => r.status === 'fulfilled');
    const conflicts = results.filter((r) => r.status === 'rejected' && (r.reason as BookingError).status === 409);
    expect(ok).toHaveLength(1);
    expect(conflicts).toHaveLength(7);
    const count = await prisma.booking.count({ where: { listingId, startDate: new Date(day(30)) } });
    expect(count).toBe(1);
  });

  it('allows back-to-back (non-overlapping) stays', async () => {
    await expect(createHold(prisma, input(33, 35))).resolves.toBeTruthy();
  });

  it('rejects over-capacity', async () => {
    await expect(createHold(prisma, input(40, 41, 5))).rejects.toMatchObject({ status: 400 });
  });

  it('stripe webhook is idempotent and validates amount', async () => {
    const { booking, order } = await createHold(prisma, input(50, 52));
    await prisma.order.update({ where: { id: order.id }, data: { stripePaymentIntentId: `pi_it_${run}` } });
    const pi = { id: `pi_it_${run}` as string, amount_received: 27500, currency: 'usd', metadata: { orderId: order.id, bookingId: booking.id } };

    expect(await applyStripePaymentSucceeded(prisma, `evt_bad_${run}`, { ...pi, amount_received: 100 })).toMatchObject({ outcome: 'rejected' });
    expect((await prisma.order.findUnique({ where: { id: order.id } }))!.status).toBe('pending');

    const [a, b] = await Promise.all([
      applyStripePaymentSucceeded(prisma, `evt_ok_${run}`, pi),
      applyStripePaymentSucceeded(prisma, `evt_ok_${run}`, pi),
    ]);
    expect([a.outcome, b.outcome].sort()).toEqual(['duplicate', 'paid']);
    expect((await prisma.booking.findUnique({ where: { id: booking.id } }))!.status).toBe('confirmed');
    expect(await applyStripePaymentSucceeded(prisma, `evt_other_${run}`, pi)).toEqual({ outcome: 'already_paid' });
  });
});
