import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');

  const items = await prisma.catalogItem.findMany({
    where: category ? { category } : undefined,
    orderBy: { name: 'asc' }
  });

  return NextResponse.json({ items });
}
