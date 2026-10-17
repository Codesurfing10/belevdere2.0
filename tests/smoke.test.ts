import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const db = vi.hoisted(() => ({
  rentalListing: { findMany: vi.fn(), findUnique: vi.fn() },
  availabilityBlock: { findMany: vi.fn() },
  booking: { create: vi.fn(), update: vi.fn() },
  order: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma: db }));

import { GET as search } from '@/app/api/search/route';
import { POST as hold } from '@/app/api/bookings/hold/route';
import { POST as checkout } from '@/app/api/checkout/route';
import { POST as paypalCheckout } from '@/app/api/checkout/paypal/route';
import { middleware } from '@/middleware';
import { BOOKING_COOKIE, sign, rateLimit, resetRateLimits } from '@/lib/security';

const listing = {
  id: 'l1', title: 'Beach House', city: 'Miami', nightlyPrice: 100, cleaningFee: 50,
  serviceFee: 25, maxGuests: 4, amenities: [], images: [], manager: { rating: 4.5 },
  availabilityBlocks: [{ isAvailable: true }, { isAvailable: true }],
};

function post(url: string, body: unknown, cookie?: string) {
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimits();
  delete process.env.DEMO_MODE;
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.PAYPAL_CLIENT_ID;
  delete process.env.PAYPAL_CLIENT_SECRET;
  delete process.env.MAPBOX_TOKEN;
});

describe('search', () => {
  it('rejects missing params', async () => {
    const res = await search(new NextRequest('http://x/api/search?city=Miami'));
    expect(res.status).toBe(400);
  });
  it('returns available listings', async () => {
    db.rentalListing.findMany.mockResolvedValue([listing]);
    db.availabilityBlock.findMany.mockResolvedValue([{}, {}, {}]);
    const res = await search(
      new NextRequest('http://x/api/search?city=Miami&startDate=2026-11-01&endDate=2026-11-03&guests=2')
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.listings).toHaveLength(1);
    expect(data.listings[0].openNights).toBe(3);
  });
});

describe('booking hold', () => {
  it('creates a hold + pending order and sets ownership cookie', async () => {
    db.rentalListing.findUnique.mockResolvedValue(listing);
    db.booking.create.mockImplementation(async ({ data }) => ({ id: 'b1', ...data }));
    db.order.create.mockImplementation(async ({ data }) => ({ id: 'o1', ...data }));
    const res = await hold(post('http://x/api/bookings/hold', {
      listingId: 'l1', startDate: '2026-11-01', endDate: '2026-11-03', guests: 2,
      guestName: 'Test', guestEmail: 't@example.com',
    }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.booking.status).toBe('hold');
    expect(data.order.status).toBe('pending');
    expect(data.order.total).toBe(275);
    expect(res.cookies.get(BOOKING_COOKIE)?.value).toBeTruthy();
  });
  it('rejects bad date ranges', async () => {
    db.rentalListing.findUnique.mockResolvedValue(listing);
    const res = await hold(post('http://x/api/bookings/hold', {
      listingId: 'l1', startDate: '2026-11-03', endDate: '2026-11-01', guests: 2,
      guestName: 'T', guestEmail: 't@example.com',
    }));
    expect(res.status).toBe(400);
  });
});

describe('checkout fail-safe', () => {
  const order = { id: 'o1', bookingId: 'b1', total: 275, status: 'pending', booking: { status: 'hold', listing } };

  it('refuses checkout for a booking the caller does not own', async () => {
    const res = await checkout(post('http://x/api/checkout', { bookingId: 'b1' }));
    expect(res.status).toBe(403);
    expect(db.order.update).not.toHaveBeenCalled();
  });

  it('Stripe: no keys and no DEMO_MODE -> 503, order stays pending', async () => {
    db.order.findUnique.mockResolvedValue(order);
    const cookie = `${BOOKING_COOKIE}=${await sign('b1')}`;
    const res = await checkout(post('http://x/api/checkout', { bookingId: 'b1' }, cookie));
    const data = await res.json();
    expect(res.status).toBe(503);
    expect(data.code).toBe('PAYMENTS_NOT_CONFIGURED');
    expect(db.order.update).not.toHaveBeenCalled();
    expect(db.booking.update).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('PayPal: no keys and no DEMO_MODE -> 503, nothing marked paid', async () => {
    db.order.findUnique.mockResolvedValue(order);
    const cookie = `${BOOKING_COOKIE}=${await sign('b1')}`;
    const res = await paypalCheckout(post('http://x/api/checkout/paypal', { bookingId: 'b1' }, cookie));
    expect(res.status).toBe(503);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('explicit DEMO_MODE=true still allows the demo flow', async () => {
    process.env.DEMO_MODE = 'true';
    db.order.findUnique.mockResolvedValue(order);
    db.$transaction.mockResolvedValue([]);
    const cookie = `${BOOKING_COOKIE}=${await sign('b1')}`;
    const res = await checkout(post('http://x/api/checkout', { bookingId: 'b1' }, cookie));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.demoMode).toBe(true);
    expect(db.$transaction).toHaveBeenCalledOnce();
  });
});

describe('middleware auth + rate limit', () => {
  it('blocks mutating API calls without a session', async () => {
    const res = await middleware(post('http://x/api/checkout', { bookingId: 'b1' }));
    expect(res.status).toBe(401);
  });
  it('issues a session cookie on page load', async () => {
    const res = await middleware(new NextRequest('http://x/'));
    expect(res.cookies.get('bv_session')?.value).toBeTruthy();
  });
  it('requires admin password for /api/admin', async () => {
    delete process.env.ADMIN_PASSWORD;
    const res = await middleware(new NextRequest('http://x/api/admin/bookings'));
    expect(res.status).toBe(401);
  });
  it('rate limits after the limit', () => {
    for (let i = 0; i < 3; i++) expect(rateLimit('k', 3)).toBe(true);
    expect(rateLimit('k', 3)).toBe(false);
  });
});
