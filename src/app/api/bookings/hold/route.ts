import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BOOKING_COOKIE, cookieOptions, sign } from '@/lib/security';
import { BookingError, createHold, validateHoldInput } from '@/lib/booking';
import { serverError } from '@/lib/http';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  try {
    const input = validateHoldInput(body && typeof body === 'object' ? body : {});
    const { booking, order } = await createHold(prisma, input);
    const res = NextResponse.json({ booking, order });
    // Proves ownership of this booking for cart/checkout calls.
    res.cookies.set(BOOKING_COOKIE, await sign(booking.id), { ...cookieOptions, maxAge: 60 * 60 * 24 });
    return res;
  } catch (err) {
    if (err instanceof BookingError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return serverError('bookings/hold', err);
  }
}
