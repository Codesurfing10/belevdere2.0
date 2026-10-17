import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BOOKING_COOKIE, cookieOptions, sign } from '@/lib/security';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { listingId, startDate, endDate, guests, guestName, guestEmail } = body;

  if (!listingId || !startDate || !endDate || !guests) {
    return NextResponse.json({ error: 'listingId, startDate, endDate, guests required' }, { status: 400 });
  }

  if (!guestName || !String(guestName).trim() || !guestEmail || !String(guestEmail).trim()) {
    return NextResponse.json({ error: 'guestName and guestEmail required' }, { status: 400 });
  }

  const listing = await prisma.rentalListing.findUnique({ where: { id: listingId } });
  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json({ error: 'Invalid dates' }, { status: 400 });
  }
  const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (nights < 1 || nights > 365) {
    return NextResponse.json({ error: 'endDate must be after startDate (max 365 nights)' }, { status: 400 });
  }
  const totalPrice = listing.nightlyPrice * nights + listing.cleaningFee + listing.serviceFee;

  const booking = await prisma.booking.create({
    data: {
      listingId,
      startDate: start,
      endDate: end,
      guests: parseInt(guests),
      status: 'hold',
      totalPrice,
      guestName: String(guestName).trim(),
      guestEmail: String(guestEmail).trim(),
    }
  });

  const order = await prisma.order.create({
    data: {
      bookingId: booking.id,
      subtotal: 0,
      total: totalPrice,
      status: 'pending',
    }
  });

  const res = NextResponse.json({ booking, order });
  // Proves ownership of this booking for cart/checkout calls.
  res.cookies.set(BOOKING_COOKIE, await sign(booking.id), { ...cookieOptions, maxAge: 60 * 60 * 24 });
  return res;
}
