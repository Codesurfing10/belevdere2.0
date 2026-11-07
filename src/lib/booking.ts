import type { Prisma, PrismaClient } from '@prisma/client';

/** Unpaid holds block the calendar for this long, then stop counting as conflicts. */
export const HOLD_TTL_MINUTES = 30;
export const MAX_NIGHTS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type HoldInput = {
  listingId: string;
  start: Date;
  end: Date;
  nights: number;
  guests: number;
  guestName: string;
  guestEmail: string;
};

export class BookingError extends Error {
  constructor(public status: number, message: string, public code: string) {
    super(message);
  }
}

function parseDay(v: unknown): Date | null {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(v)) return null;
  const d = new Date(v.slice(0, 10) + 'T00:00:00.000Z');
  return isNaN(d.getTime()) ? null : d;
}

/** Validates the raw request body. Dates are normalized to UTC midnight (night-based stays). */
export function validateHoldInput(body: Record<string, unknown>, now = new Date()): HoldInput {
  const { listingId, startDate, endDate, guests, guestName, guestEmail } = body;
  if (typeof listingId !== 'string' || !listingId || listingId.length > 64) {
    throw new BookingError(400, 'listingId, startDate, endDate, guests required', 'INVALID_INPUT');
  }
  const start = parseDay(startDate);
  const end = parseDay(endDate);
  if (!start || !end) throw new BookingError(400, 'Invalid dates (use YYYY-MM-DD)', 'INVALID_DATES');
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  // allow "today" in any timezone: accept dates from yesterday UTC onward
  if (start.getTime() < today - DAY_MS) throw new BookingError(400, 'startDate is in the past', 'INVALID_DATES');
  const nights = Math.round((end.getTime() - start.getTime()) / DAY_MS);
  if (nights < 1 || nights > MAX_NIGHTS) {
    throw new BookingError(400, `endDate must be after startDate (max ${MAX_NIGHTS} nights)`, 'INVALID_DATES');
  }
  const g = typeof guests === 'string' ? Number(guests) : guests;
  if (typeof g !== 'number' || !Number.isInteger(g) || g < 1 || g > 50) {
    throw new BookingError(400, 'guests must be a whole number from 1 to 50', 'INVALID_GUESTS');
  }
  const name = typeof guestName === 'string' ? guestName.trim() : '';
  const email = typeof guestEmail === 'string' ? guestEmail.trim() : '';
  if (!name || name.length > 100) throw new BookingError(400, 'guestName and guestEmail required', 'INVALID_GUEST');
  if (!EMAIL_RE.test(email) || email.length > 254) throw new BookingError(400, 'A valid guestEmail is required', 'INVALID_GUEST');
  return { listingId, start, end, nights, guests: g, guestName: name, guestEmail: email };
}

type Tx = Prisma.TransactionClient;

/**
 * Creates a hold + pending order atomically. Locks the listing row (SELECT ... FOR UPDATE)
 * so concurrent holds for the same listing are serialized and cannot both pass the
 * overlap check.
 */
export async function createHold(prisma: PrismaClient, input: HoldInput, now = new Date()) {
  return prisma.$transaction(async (tx: Tx) => {
    const locked = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "RentalListing" WHERE "id" = ${input.listingId} FOR UPDATE`;
    if (!locked.length) throw new BookingError(404, 'Listing not found', 'NOT_FOUND');
    const listing = await tx.rentalListing.findUnique({ where: { id: input.listingId } });
    if (!listing) throw new BookingError(404, 'Listing not found', 'NOT_FOUND');
    if (input.guests > listing.maxGuests) {
      throw new BookingError(400, `This listing allows at most ${listing.maxGuests} guests`, 'OVER_CAPACITY');
    }

    const holdCutoff = new Date(now.getTime() - HOLD_TTL_MINUTES * 60 * 1000);
    const overlapping = await tx.booking.count({
      where: {
        listingId: input.listingId,
        startDate: { lt: input.end },
        endDate: { gt: input.start },
        OR: [{ status: 'confirmed' }, { status: 'hold', createdAt: { gt: holdCutoff } }],
      },
    });
    if (overlapping > 0) throw new BookingError(409, 'Those dates are no longer available', 'DATES_UNAVAILABLE');

    const blocked = await tx.availabilityBlock.count({
      where: {
        listingId: input.listingId,
        isAvailable: false,
        startDate: { lt: input.end },
        endDate: { gt: input.start },
      },
    });
    if (blocked > 0) throw new BookingError(409, 'Those dates are no longer available', 'DATES_UNAVAILABLE');

    const totalPrice = listing.nightlyPrice * input.nights + listing.cleaningFee + listing.serviceFee;
    const booking = await tx.booking.create({
      data: {
        listingId: input.listingId,
        startDate: input.start,
        endDate: input.end,
        guests: input.guests,
        status: 'hold',
        totalPrice,
        guestName: input.guestName,
        guestEmail: input.guestEmail,
      },
    });
    const order = await tx.order.create({
      data: { bookingId: booking.id, subtotal: 0, total: totalPrice, status: 'pending' },
    });
    return { booking, order };
  });
}

export function isHoldExpired(booking: { status: string; createdAt: Date | string }, now = new Date()): boolean {
  if (booking.status !== 'hold') return false;
  return new Date(booking.createdAt).getTime() < now.getTime() - HOLD_TTL_MINUTES * 60 * 1000;
}
