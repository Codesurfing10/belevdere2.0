import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ownsBooking } from '@/lib/security';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get('bookingId');

  if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 });

  if (!(await ownsBooking(req, bookingId))) {
    return NextResponse.json({ error: 'Not authorized for this booking' }, { status: 403 });
  }

  const order = await prisma.order.findUnique({
    where: { bookingId },
    include: {
      cartItems: {
        include: {
          catalogItem: true,
          mealOption: true,
        }
      },
      booking: {
        include: { listing: true }
      }
    }
  });

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  return NextResponse.json({ order });
}
