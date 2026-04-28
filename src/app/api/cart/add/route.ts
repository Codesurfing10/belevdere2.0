import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { bookingId, itemId, mealOptionId, qty = 1, type } = body;

  if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 });

  const order = await prisma.order.findUnique({ where: { bookingId } });
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  let unitPrice = 0;
  const cartItemData: {
    orderId: string;
    quantity: number;
    unitPrice: number;
    mealOptionId?: string;
    catalogItemId?: string;
  } = { orderId: order.id, quantity: qty, unitPrice: 0 };

  if (type === 'meal' && mealOptionId) {
    const meal = await prisma.mealOption.findUnique({ where: { id: mealOptionId } });
    if (!meal) return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
    unitPrice = meal.price;
    cartItemData.mealOptionId = mealOptionId;
  } else if (itemId) {
    const item = await prisma.catalogItem.findUnique({ where: { id: itemId } });
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    unitPrice = item.price;
    cartItemData.catalogItemId = itemId;
  } else {
    return NextResponse.json({ error: 'itemId or mealOptionId required' }, { status: 400 });
  }

  cartItemData.unitPrice = unitPrice;

  const cartItem = await prisma.cartItem.create({ data: cartItemData });

  const allItems = await prisma.cartItem.findMany({ where: { orderId: order.id } });
  const subtotal = allItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  const total = subtotal + (booking?.totalPrice || 0);

  await prisma.order.update({
    where: { id: order.id },
    data: { subtotal, total }
  });

  return NextResponse.json({ cartItem, subtotal, total });
}
