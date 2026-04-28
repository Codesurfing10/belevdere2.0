import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city');

  const managers = await prisma.propertyManager.findMany({
    where: city ? { serviceAreas: { has: city } } : undefined,
    include: {
      _count: { select: { listings: true } }
    },
    orderBy: { rating: 'desc' }
  });

  return NextResponse.json({ managers });
}
