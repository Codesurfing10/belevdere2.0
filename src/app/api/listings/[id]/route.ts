import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const listing = await prisma.rentalListing.findUnique({
    where: { id: params.id },
    include: {
      manager: true,
      availabilityBlocks: {
        where: { startDate: { gte: new Date() } },
        orderBy: { startDate: 'asc' },
        take: 60,
      }
    }
  });

  if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ listing });
}
