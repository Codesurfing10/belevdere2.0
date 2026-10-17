import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Protected by Basic auth (ADMIN_PASSWORD) in src/middleware.ts.
export async function GET() {
  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { order: true, listing: { select: { title: true, city: true } } },
  });
  return NextResponse.json({ bookings });
}
