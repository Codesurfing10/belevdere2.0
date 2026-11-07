import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';

const db = vi.hoisted(() => ({
  rentalListing: { findUnique: vi.fn() },
  availabilityBlock: { count: vi.fn() },
  booking: { create: vi.fn(), update: vi.fn(), count: vi.fn() },
  order: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  processedWebhookEvent: { create: vi.fn() },
  $transaction: vi.fn(),
  $queryRaw: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma: db }));

import { BookingError, validateHoldInput, isHoldExpired } from '@/lib/booking';
import { POST as hold } from '@/app/api/bookings/hold/route';
import { POST as stripeWebhook } from '@/app/api/webhooks/stripe/route';
import { POST as paypalCapture } from '@/app/api/checkout/paypal/capture/route';
import { POST as checkout } from '@/app/api/checkout/route';
import { POST as cartAdd } from '@/app/api/cart/add/route';
import { applyStripePaymentSucceeded } from '@/lib/stripeWebhook';
import { verifyPayPalCapture, verifyPayPalOrderBeforeCapture } from '@/lib/paypalVerify';
import { GENERIC_ERROR } from '@/lib/http';
import { BOOKING_COOKIE, sign } from '@/lib/security';
import manifest from '@/app/manifest';

const now = new Date('2026-11-06T12:00:00Z');
const day = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
const base = { listingId: 'l1', guests: 2, guestName: 'Ann', guestEmail: 'ann@example.com' };
const listing = { id: 'l1', title: 'Beach', nightlyPrice: 100, cleaningFee: 50, serviceFee: 25, maxGuests: 4 };

function post(url: string, body: unknown, cookie?: string) {
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  for (const k of ['DEMO_MODE', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET']) delete process.env[k];
  db.$transaction.mockImplementation(async (fn: unknown) => (typeof fn === 'function' ? fn(db) : Promise.all(fn as unknown[])));
  db.$queryRaw.mockResolvedValue([{ id: 'l1' }]);
  db.rentalListing.findUnique.mockResolvedValue(listing);
  db.booking.count.mockResolvedValue(0);
  db.availabilityBlock.count.mockResolvedValue(0);
});

describe('booking input validation', () => {
  const ok = { ...base, startDate: '2026-11-10', endDate: '2026-11-12' };
  it('accepts valid input and normalizes', () => {
    const v = validateHoldInput({ ...ok, guests: '3' }, now);
    expect(v.nights).toBe(2);
    expect(v.guests).toBe(3);
    expect(v.start.toISOString()).toBe('2026-11-10T00:00:00.000Z');
  });
  it.each([
    [{ guests: 0 }], [{ guests: 2.5 }], [{ guests: 'abc' }], [{ guests: 999 }],
    [{ guestEmail: 'nope' }], [{ guestName: '   ' }], [{ startDate: 'garbage' }],
    [{ startDate: '2026-10-01', endDate: '2026-10-03' }], [{ endDate: '2026-11-10' }],
    [{ startDate: '2026-11-10', endDate: '2028-11-10' }], [{ listingId: 42 }],
  ])('rejects %j', (patch) => {
    expect(() => validateHoldInput({ ...ok, ...patch }, now)).toThrow(BookingError);
  });
  it('hold expiry', () => {
    expect(isHoldExpired({ status: 'hold', createdAt: new Date(now.getTime() - 31 * 60000) }, now)).toBe(true);
    expect(isHoldExpired({ status: 'hold', createdAt: new Date(now.getTime() - 5 * 60000) }, now)).toBe(false);
  });
});

describe('booking hold route', () => {
  const body = { ...base, startDate: day(10), endDate: day(12) };
  it('rejects guests over listing capacity', async () => {
    const res = await hold(post('http://x/api/bookings/hold', { ...body, guests: 5 }));
    expect(res.status).toBe(400);
    expect(db.booking.create).not.toHaveBeenCalled();
  });
  it('rejects overlapping confirmed / active holds with 409', async () => {
    db.booking.count.mockResolvedValue(1);
    const res = await hold(post('http://x/api/bookings/hold', body));
    expect(res.status).toBe(409);
    expect(db.booking.create).not.toHaveBeenCalled();
  });
  it('rejects explicitly unavailable dates', async () => {
    db.availabilityBlock.count.mockResolvedValue(1);
    const res = await hold(post('http://x/api/bookings/hold', body));
    expect(res.status).toBe(409);
  });
  it('locks the listing row inside the transaction', async () => {
    db.booking.create.mockImplementation(async ({ data }) => ({ id: 'b1', ...data }));
    db.order.create.mockImplementation(async ({ data }) => ({ id: 'o1', ...data }));
    const res = await hold(post('http://x/api/bookings/hold', body));
    expect(res.status).toBe(200);
    const sql = (db.$queryRaw.mock.calls[0][0] as TemplateStringsArray).join('?');
    expect(sql).toContain('FOR UPDATE');
  });
  it('returns a generic error on unexpected DB failure', async () => {
    db.$transaction.mockRejectedValue(new Error('connection string postgres://secret@host'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await hold(post('http://x/api/bookings/hold', body));
    const data = await res.json();
    expect(res.status).toBe(500);
    expect(data.error).toBe(GENERIC_ERROR);
    expect(JSON.stringify(data)).not.toContain('secret');
  });
});

describe('stripe webhook', () => {
  it('fails closed (503) when the webhook secret is missing', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_realistic_key_123';
    const res = await stripeWebhook(post('http://x/api/webhooks/stripe', { type: 'payment_intent.succeeded' }));
    expect(res.status).toBe(503);
    expect(db.order.updateMany).not.toHaveBeenCalled();
  });
  it('rejects a bad signature', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_realistic_key_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret_value';
    const req = new NextRequest('http://x/api/webhooks/stripe', {
      method: 'POST', body: '{}', headers: { 'stripe-signature': 't=1,v1=deadbeef' },
    });
    const res = await stripeWebhook(req);
    expect(res.status).toBe(400);
  });
  it('accepts a correctly signed event and applies it', async () => {
    const Stripe = (await import('stripe')).default;
    process.env.STRIPE_SECRET_KEY = 'sk_test_realistic_key_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret_value';
    const payload = JSON.stringify({
      id: 'evt_1', type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_1', amount_received: 27500, currency: 'usd', metadata: { orderId: 'o1', bookingId: 'b1' } } },
    });
    const header = new Stripe('sk_test_x').webhooks.generateTestHeaderString({ payload, secret: 'whsec_test_secret_value' });
    db.order.findUnique.mockResolvedValue({ id: 'o1', bookingId: 'b1', status: 'pending', total: 275, stripePaymentIntentId: 'pi_1' });
    db.order.updateMany.mockResolvedValue({ count: 1 });
    const res = await stripeWebhook(new NextRequest('http://x/api/webhooks/stripe', {
      method: 'POST', body: payload, headers: { 'stripe-signature': header },
    }));
    expect(res.status).toBe(200);
    expect(db.processedWebhookEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ id: 'evt_1' }) });
    expect(db.booking.update).toHaveBeenCalledWith({ where: { id: 'b1' }, data: { status: 'confirmed' } });
  });
});

describe('applyStripePaymentSucceeded', () => {
  const pi = { id: 'pi_1', amount_received: 27500, currency: 'usd', metadata: { orderId: 'o1', bookingId: 'b1' } };
  const order = { id: 'o1', bookingId: 'b1', status: 'pending', total: 275, stripePaymentIntentId: 'pi_1' };
  const run = (p = pi) => applyStripePaymentSucceeded(db as never, 'evt_1', p);

  it('marks paid when everything matches', async () => {
    db.order.findUnique.mockResolvedValue(order);
    db.order.updateMany.mockResolvedValue({ count: 1 });
    expect(await run()).toEqual({ outcome: 'paid' });
  });
  it.each([
    ['amount mismatch', { amount_received: 100 }],
    ['currency mismatch', { currency: 'eur' }],
    ['payment intent mismatch', { id: 'pi_other' }],
    ['missing metadata', { metadata: {} }],
  ])('rejects %s without marking paid', async (reason, patch) => {
    db.order.findUnique.mockResolvedValue(order);
    expect(await run({ ...pi, ...patch } as typeof pi)).toEqual({ outcome: 'rejected', reason });
    expect(db.order.updateMany).not.toHaveBeenCalled();
    expect(db.booking.update).not.toHaveBeenCalled();
  });
  it('rejects unknown or mismatched order/booking', async () => {
    db.order.findUnique.mockResolvedValue({ ...order, bookingId: 'other' });
    expect((await run()).outcome).toBe('rejected');
    db.order.findUnique.mockResolvedValue(null);
    expect((await run()).outcome).toBe('rejected');
  });
  it('treats a replayed event id as duplicate', async () => {
    db.processedWebhookEvent.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' })
    );
    expect(await run()).toEqual({ outcome: 'duplicate' });
    expect(db.booking.update).not.toHaveBeenCalled();
  });
});

describe('paypal verification', () => {
  const e = { total: 275, currency: 'USD', bookingId: 'b1', orderId: 'o1' };
  const cap = (amount: { currency_code: string; value: string }, status = 'COMPLETED') => ({
    id: 'P1', status, purchase_units: [{ payments: { captures: [{ status, amount }] } }],
  });
  it('accepts matching capture', () => {
    expect(verifyPayPalCapture(cap({ currency_code: 'USD', value: '275.00' }), e)).toBeNull();
  });
  it('rejects wrong amount, currency, or status', () => {
    expect(verifyPayPalCapture(cap({ currency_code: 'USD', value: '1.00' }), e)).toBe('amount mismatch');
    expect(verifyPayPalCapture(cap({ currency_code: 'EUR', value: '275.00' }), e)).toBe('currency mismatch');
    expect(verifyPayPalCapture(cap({ currency_code: 'USD', value: '275.00' }, 'PENDING'), e)).toBe('capture not completed');
  });
  it('pre-capture checks amount and references', () => {
    const o = (v: string, custom = 'b1') => ({ id: 'P1', status: 'APPROVED', purchase_units: [{ amount: { currency_code: 'USD', value: v }, custom_id: custom, invoice_id: 'o1' }] });
    expect(verifyPayPalOrderBeforeCapture(o('275.00'), e)).toBeNull();
    expect(verifyPayPalOrderBeforeCapture(o('200.00'), e)).toBe('amount mismatch');
    expect(verifyPayPalOrderBeforeCapture(o('275.00', 'b2'), e)).toBe('booking mismatch');
  });
});

describe('paypal capture route', () => {
  const cookie = async () => `${BOOKING_COOKIE}=${await sign('b1')}`;
  beforeEach(() => {
    process.env.PAYPAL_CLIENT_ID = 'real_looking_id';
    process.env.PAYPAL_CLIENT_SECRET = 'real_looking_secret';
  });
  function mockPayPal(orderValue: string, captureValue: string) {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes('/oauth2/token')) return new Response(JSON.stringify({ access_token: 't' }));
      if (url.endsWith('/capture')) {
        return new Response(JSON.stringify({ id: 'P1', status: 'COMPLETED', purchase_units: [{ payments: { captures: [{ status: 'COMPLETED', amount: { currency_code: 'USD', value: captureValue } }] } }] }));
      }
      expect(init?.method ?? 'GET').toBe('GET');
      return new Response(JSON.stringify({ id: 'P1', status: 'APPROVED', purchase_units: [{ amount: { currency_code: 'USD', value: orderValue }, custom_id: 'b1', invoice_id: 'o1' }] }));
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }
  it('refuses a paypalOrderId not created for this order', async () => {
    db.order.findUnique.mockResolvedValue({ id: 'o1', bookingId: 'b1', status: 'pending', total: 275, paypalOrderId: null });
    const res = await paypalCapture(post('http://x', { bookingId: 'b1', paypalOrderId: 'P1' }, await cookie()));
    expect(res.status).toBe(400);
  });
  it('does not capture when the PayPal amount differs from the order', async () => {
    db.order.findUnique.mockResolvedValue({ id: 'o1', bookingId: 'b1', status: 'pending', total: 275, paypalOrderId: 'P1' });
    const f = mockPayPal('10.00', '10.00');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await paypalCapture(post('http://x', { bookingId: 'b1', paypalOrderId: 'P1' }, await cookie()));
    expect(res.status).toBe(409);
    expect(f.mock.calls.some(([u]) => String(u).endsWith('/capture'))).toBe(false);
    expect(db.order.updateMany).not.toHaveBeenCalled();
  });
  it('confirms when amounts match', async () => {
    db.order.findUnique.mockResolvedValue({ id: 'o1', bookingId: 'b1', status: 'pending', total: 275, paypalOrderId: 'P1' });
    db.order.updateMany.mockResolvedValue({ count: 1 });
    mockPayPal('275.00', '275.00');
    const res = await paypalCapture(post('http://x', { bookingId: 'b1', paypalOrderId: 'P1' }, await cookie()));
    expect(res.status).toBe(200);
    expect(db.booking.update).toHaveBeenCalledWith({ where: { id: 'b1' }, data: { status: 'confirmed' } });
  });
});

describe('checkout + cart guards', () => {
  const cookie = async () => `${BOOKING_COOKIE}=${await sign('b1')}`;
  it('refuses checkout on an expired hold', async () => {
    process.env.DEMO_MODE = 'true';
    db.order.findUnique.mockResolvedValue({
      id: 'o1', bookingId: 'b1', total: 275, status: 'pending',
      booking: { status: 'hold', createdAt: new Date(Date.now() - 3600_000), listing },
    });
    const res = await checkout(post('http://x/api/checkout', { bookingId: 'b1' }, await cookie()));
    expect(res.status).toBe(409);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it('refuses cart changes after payment', async () => {
    db.order.findUnique.mockResolvedValue({ id: 'o1', bookingId: 'b1', status: 'paid' });
    const res = await cartAdd(post('http://x/api/cart/add', { bookingId: 'b1', itemId: 'i1', quantity: 1 }, await cookie()));
    expect(res.status).toBe(409);
  });
});

describe('PWA', () => {
  it('manifest is installable', () => {
    const m = manifest();
    expect(m.display).toBe('standalone');
    expect(m.start_url).toBe('/');
    const sizes = (m.icons || []).map((i) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect((m.icons || []).some((i) => i.purpose === 'maskable')).toBe(true);
  });
  it('icons are valid PNGs of the declared size', () => {
    for (const [f, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['maskable-512.png', 512], ['apple-touch-icon.png', 180]] as const) {
      const b = readFileSync(`public/icons/${f}`);
      expect(b.subarray(1, 4).toString()).toBe('PNG');
      expect(b.readUInt32BE(16)).toBe(size);
    }
  });
  it('service worker never caches API/admin/checkout or non-GET requests', async () => {
    const src = readFileSync('public/sw.js', 'utf8');
    const listeners: Record<string, (e: unknown) => void> = {};
    const put = vi.fn();
    const sandbox = {
      self: { addEventListener: (t: string, fn: (e: unknown) => void) => (listeners[t] = fn), location: { origin: 'https://app.test' }, skipWaiting: vi.fn(), clients: { claim: vi.fn() } },
      caches: { open: vi.fn(async () => ({ put, addAll: vi.fn() })), match: vi.fn(async () => undefined), keys: vi.fn(async () => []) },
      fetch: vi.fn(async () => new Response('x')),
      URL,
    };
    new Function('self', 'caches', 'fetch', 'URL', src)(sandbox.self, sandbox.caches, sandbox.fetch, sandbox.URL);
    const fire = (url: string, method = 'GET', mode = 'cors') => {
      const respondWith = vi.fn();
      listeners.fetch({ request: { url, method, mode }, respondWith });
      return respondWith;
    };
    for (const u of ['/api/cart?bookingId=b1', '/api/checkout', '/admin', '/api/admin/bookings', '/checkout/paypal']) {
      expect(fire(`https://app.test${u}`)).not.toHaveBeenCalled();
      expect(fire(`https://app.test${u}`, 'GET', 'navigate')).not.toHaveBeenCalled();
    }
    expect(fire('https://app.test/api/bookings/hold', 'POST')).not.toHaveBeenCalled();
    expect(fire('https://api.mapbox.com/x')).not.toHaveBeenCalled();
    expect(fire('https://app.test/_next/static/chunk.js')).toHaveBeenCalled();
    expect(fire('https://app.test/', 'GET', 'navigate')).toHaveBeenCalled();
  });
});
