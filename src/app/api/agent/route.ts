import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** Extracts a numeric quantity from a natural-language message, defaulting to `defaultQty`. */
function extractQuantity(msg: string, defaultQty: number): number {
  const match = msg.match(/(\d+)/);
  return match ? parseInt(match[1]) : defaultQty;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { message, context } = body;
  const lowerMsg = (message as string).toLowerCase();

  let response = '';
  let action: Record<string, unknown> | null = null;

  if (lowerMsg.includes('cheaper') || lowerMsg.includes('budget') || lowerMsg.includes('affordable')) {
    response = "I'll filter to more budget-friendly options! Showing listings under $200/night.";
    action = { type: 'FILTER_PRICE', maxPrice: 200 };
  } else if (lowerMsg.includes('pet') || lowerMsg.includes('dog') || lowerMsg.includes('cat')) {
    response = "Looking for pet-friendly properties! These listings welcome your furry friends.";
    action = { type: 'FILTER_AMENITY', amenity: 'Pet Friendly' };
  } else if (lowerMsg.includes('pool')) {
    response = "Showing listings with pools! Perfect for a relaxing stay.";
    action = { type: 'FILTER_AMENITY', amenity: 'Pool' };
  } else if (lowerMsg.includes('breakfast')) {
    const qty = extractQuantity(lowerMsg, 2);
    const meal = await prisma.mealOption.findFirst({ where: { type: 'breakfast' } });
    if (meal && context?.bookingId) {
      response = `Adding breakfast for ${qty} to your cart!`;
      action = { type: 'ADD_TO_CART', itemType: 'meal', mealOptionId: meal.id, qty, bookingId: context.bookingId };
    } else {
      response = "I can add breakfast once you've selected a property. Which breakfast option would you like? We have Continental Sunrise, Full American Breakfast, and Healthy Start.";
    }
  } else if (lowerMsg.includes('dinner')) {
    const qty = extractQuantity(lowerMsg, 2);
    const meal = await prisma.mealOption.findFirst({ where: { type: 'dinner' } });
    if (meal && context?.bookingId) {
      response = `Adding dinner for ${qty} to your cart!`;
      action = { type: 'ADD_TO_CART', itemType: 'meal', mealOptionId: meal.id, qty, bookingId: context.bookingId };
    } else {
      response = "I can add dinner once you've selected a property. Would you like BBQ Night, Seafood Feast, or Italian Dinner Night?";
    }
  } else if (lowerMsg.includes('bike') || lowerMsg.includes('bicycle')) {
    const qty = extractQuantity(lowerMsg, 1);
    const item = await prisma.catalogItem.findFirst({ where: { name: { contains: 'Bike', mode: 'insensitive' } } });
    if (item && context?.bookingId) {
      response = `Adding ${qty} bike rental(s) to your cart!`;
      action = { type: 'ADD_TO_CART', itemType: 'catalog', itemId: item.id, qty, bookingId: context.bookingId };
    } else {
      response = "Beach Cruiser Bikes are available at $35/day. Book a property first and I'll add them to your cart!";
    }
  } else if (lowerMsg.includes('kayak')) {
    const item = await prisma.catalogItem.findFirst({ where: { name: { contains: 'Kayak', mode: 'insensitive' } } });
    if (item && context?.bookingId) {
      response = "Adding kayak rental to your cart!";
      action = { type: 'ADD_TO_CART', itemType: 'catalog', itemId: item.id, qty: 1, bookingId: context.bookingId };
    } else {
      response = "Kayak rentals are available at $55/day. Book a property first!";
    }
  } else if (lowerMsg.includes('toiletries') || lowerMsg.includes('towels') || lowerMsg.includes('supplies')) {
    const item = await prisma.catalogItem.findFirst({ where: { category: 'toiletries' } });
    if (item && context?.bookingId) {
      response = "Adding a Premium Toiletry Kit to your cart!";
      action = { type: 'ADD_TO_CART', itemType: 'catalog', itemId: item.id, qty: 1, bookingId: context.bookingId };
    } else {
      response = "We have toiletry kits, spa towels, beach kits, and more. Book a property and I'll add them to your cart!";
    }
  } else if (lowerMsg.includes('search') || lowerMsg.includes('find') || lowerMsg.includes('show')) {
    const cities = ['Miami', 'Austin', 'Denver'];
    const matchedCity = cities.find(c => lowerMsg.includes(c.toLowerCase()));
    if (matchedCity) {
      response = `Searching for rentals in ${matchedCity}!`;
      action = { type: 'SEARCH', city: matchedCity };
    } else {
      response = "I can search in Miami, Austin, or Denver! Which city interests you?";
    }
  } else if (lowerMsg.includes('hello') || lowerMsg.includes('hi') || lowerMsg.includes('hey')) {
    response = "Hi there! I'm your rental assistant. I can help you find properties, filter by price or amenities, and add meals or equipment to your stay. What can I do for you?";
  } else {
    response = "I can help you with: searching for properties, filtering by price/amenities, adding breakfast or dinner, or renting equipment like bikes and kayaks. What would you like?";
  }

  return NextResponse.json({ response, action });
}
