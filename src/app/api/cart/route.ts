import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get('bookingId');

  if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 });

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
