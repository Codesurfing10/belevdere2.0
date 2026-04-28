import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');

  const meals = await prisma.mealOption.findMany({
    where: type ? { type } : undefined,
    orderBy: { name: 'asc' }
  });

  return NextResponse.json({ meals });
}
