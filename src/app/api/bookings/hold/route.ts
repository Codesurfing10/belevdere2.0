import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { listingId, startDate, endDate, guests, guestName, guestEmail } = body;

  if (!listingId || !startDate || !endDate || !guests) {
    return NextResponse.json({ error: 'listingId, startDate, endDate, guests required' }, { status: 400 });
  }

  const listing = await prisma.rentalListing.findUnique({ where: { id: listingId } });
  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

  const start = new Date(startDate);
  const end = new Date(endDate);
  const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const totalPrice = listing.nightlyPrice * nights + listing.cleaningFee + listing.serviceFee;

  const booking = await prisma.booking.create({
    data: {
      listingId,
      startDate: start,
      endDate: end,
      guests: parseInt(guests),
      status: 'hold',
      totalPrice,
      guestName: guestName || null,
      guestEmail: guestEmail || null,
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

  return NextResponse.json({ booking, order });
}
