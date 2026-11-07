# Belevdere 2.0

A short-term rental matching, booking, and supplies/equipment ordering platform built with Next.js 15.

## Features

- 🏠 **Property Search** — Search available rentals by city, dates, and guest count with Mapbox geocoding
- 🗺️ **Interactive Map** — Listings plotted on a Mapbox map with price pins and popups
- 📅 **Availability Ranking** — Listings ranked by open nights, price, and manager rating
- 👤 **Property Managers** — Browse managers by city with SLA, rating, and contact info
- 🛒 **Supplies Ordering** — Add toiletries, food, and equipment to your booking
- 🌅 **Meal Options** — Pre-order breakfast or dinner packages delivered to your rental
- 💳 **Stripe Checkout** — Secure payment via Stripe Payment Intents
- 🅿️ **PayPal Checkout** — Pay with PayPal (Orders API + JS SDK) alongside Stripe; demo stub when keys are missing
- 💙 **PayPal.me footer tip** — Configurable support/donate link via `NEXT_PUBLIC_PAYPAL_ME_URL`
- 📱 **Mobile-friendly** — Responsive checkout, search, cart, and footer for narrow viewports (~320px+)
- 🤖 **Chat Assistant** — Rule-based assistant to filter listings and add items to cart

## Tech Stack

- **Next.js 15** (App Router, TypeScript)
- **Prisma + PostgreSQL** — Data model for listings, bookings, orders, catalog
- **Mapbox** — Map display and geocoding
- **Stripe** — Card payments and webhooks
- **PayPal** — Orders API v2 + JS SDK (optional)
- **Tailwind CSS** — Styling

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual credentials:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/belevdere"
MAPBOX_TOKEN="pk.your_mapbox_token_here"
NEXT_PUBLIC_MAPBOX_TOKEN="pk.your_mapbox_token_here"
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key"

# PayPal (optional — demo stub without these)
PAYPAL_CLIENT_ID="your_paypal_client_id"
PAYPAL_CLIENT_SECRET="your_paypal_client_secret"
PAYPAL_MODE="sandbox"
NEXT_PUBLIC_PAYPAL_CLIENT_ID="your_paypal_client_id"

# Footer tip link (optional)
NEXT_PUBLIC_PAYPAL_ME_URL="https://paypal.me/YourName"
```

### 3. Set up the database

```bash
npm run db:generate    # Generate Prisma client
npm run db:migrate:deploy  # Apply committed migrations (prod)
# or: npm run db:migrate    # Dev migrate
npm run db:seed        # Seed with listings, managers, catalog items, meals
```

### 4. Start the dev server

```bash
npm run dev
```

Open http://localhost:3000.


## Deploy (Render Blueprint)

This repo includes a `render.yaml` Blueprint:

1. In Render: **New → Blueprint** → connect this repo / branch.
2. Render creates a Postgres DB + Node web service. `DATABASE_URL` is wired automatically.
3. Set dashboard env vars marked `sync: false` in the Blueprint:
   - `NEXT_PUBLIC_MAPBOX_TOKEN` / `MAPBOX_TOKEN` (map + geocoding)
   - `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` (optional)
   - `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID` (optional)
   - `NEXT_PUBLIC_PAYPAL_ME_URL` (optional footer tip link, e.g. `https://paypal.me/YourName`)
4. Checkout runs in **DEMO_MODE** (order → `paid`, booking → `confirmed`, no charge) **only** when `DEMO_MODE=true` is set explicitly. Without it, missing/placeholder Stripe or PayPal keys make checkout return `503 PAYMENTS_NOT_CONFIGURED` and leave the order pending. The Stripe webhook also returns 503 until a real `STRIPE_WEBHOOK_SECRET` is configured.
5. After first deploy, seed demo data once from a Render shell:
   ```bash
   npm run db:seed
   ```

Build/start (Blueprint):
- build: `npm install && npx prisma generate && npm run build`
- start: `npx prisma migrate deploy && npm run start`

## PayPal notes

| Env var | Where used | Notes |
|---------|------------|--------|
| `PAYPAL_CLIENT_ID` | Server | REST app client ID |
| `PAYPAL_CLIENT_SECRET` | Server | REST app secret (never expose to client) |
| `PAYPAL_MODE` | Server | `sandbox` (default) or `live` |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Client JS SDK | Usually same value as `PAYPAL_CLIENT_ID` |
| `NEXT_PUBLIC_PAYPAL_ME_URL` | Footer tip link | e.g. `https://paypal.me/YourName`; if unset, footer shows a demo note |
| `DEMO_MODE` | Server | `true` only for a public demo — marks orders paid with no charge |
| `SESSION_SECRET` | Server | Required in production (16+ chars); signs session/booking cookies |
| `ADMIN_PASSWORD` | Server | Basic-auth password for `/admin` and `/api/admin`; admin disabled if unset |
| `SENTRY_DSN` | Server | Optional error reporting |

Checkout UI lets the guest pick **Card / Stripe** or **PayPal**. Live PayPal uses create → approve (JS SDK) → verify amount/currency/references → capture → re-verify captured amount. Without credentials, PayPal returns 503 unless `DEMO_MODE=true`.

> Note: the Stripe card form (Stripe Elements) is **not implemented yet** — `/api/checkout` only creates a PaymentIntent. Real card payments need that UI before launch.

## Safety rules (bookings & payments)

- **Holds** validate dates (UTC days, not in the past, 1–365 nights), whole-number guests within `maxGuests`, name and email. Each hold runs in a transaction that locks the listing row (`SELECT … FOR UPDATE`) and rejects overlaps with confirmed bookings, unexpired holds (30 min), and `isAvailable=false` blocks (`409`).
- **Stripe webhook** fails closed without a secret, verifies the signature, records each event id in `ProcessedWebhookEvent` (duplicates are ignored), and only marks paid when the PaymentIntent id, booking/order, currency (USD) and amount match. Order + booking are updated in one transaction. Mismatches are logged and left pending for manual review.
- **PayPal capture** only accepts the PayPal order the server created for that booking, checks amount/currency before capturing, and re-checks the captured amount before confirming.
- Adding cart items after checkout started clears the stored PaymentIntent / PayPal order so the next checkout uses the new total; carts can't change after payment.
- Unexpected server errors return a generic message; details go to server logs / optional Sentry.

## Installable app (PWA)

- Web app manifest at `/manifest.webmanifest` (from `src/app/manifest.ts`), icons in `public/icons/` (regenerate with `node scripts/generate-icons.mjs`).
- `public/sw.js` is registered in production only. It caches only `/offline.html`, icons and immutable `/_next/static` assets. It **never** caches or intercepts `/api/*`, `/admin`, checkout/payment URLs, or non-GET requests; pages are always fetched from the network with an offline fallback page.
- Install: Android/desktop Chrome/Edge show an **Install** prompt (or browser menu → *Install app*). iPhone/iPad Safari: **Share → Add to Home Screen**. Installation requires HTTPS (localhost is fine for testing).
- After changing `sw.js` caching rules, bump `VERSION` in it so old caches are cleared.

## Tests & CI

```bash
npm run lint
npm run typecheck
npm test                     # unit + route tests (DB mocked)
# Optional real-Postgres integration tests (concurrency, webhook idempotency):
export TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/belevdere_test"
DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy && npm test
```

A ready-to-use GitHub Actions workflow is in `docs/ci-workflow.yml` (lint, typecheck, tests with a throwaway Postgres service, build; read-only, no secrets, no deploy). Enable it by copying it to `.github/workflows/ci.yml` (pushing workflow files requires a token with the `workflow` scope or the GitHub web UI).

## Migrations rollout

`20261106000000_webhook_events_and_booking_indexes` adds the `ProcessedWebhookEvent` table and a `Booking(listingId, startDate, endDate)` index. It is additive. With the Render Blueprint, the start command runs `prisma migrate deploy` automatically on the next deploy. Take a database backup first, and deploy app + migration together (the new webhook code needs the table).

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/search` | Search listings by city/dates/guests |
| GET | `/api/managers` | List property managers (filter by city) |
| GET | `/api/listings/:id` | Get a single listing with availability |
| POST | `/api/bookings/hold` | Create a hold booking + order |
| GET | `/api/catalog/items` | List catalog items (filter by category) |
| GET | `/api/catalog/meals` | List meal options (filter by type) |
| GET | `/api/cart` | Get cart/order for a booking |
| POST | `/api/cart/add` | Add item or meal to cart |
| POST | `/api/checkout` | Create Stripe Payment Intent (or demo) |
| GET | `/api/checkout/paypal` | PayPal config status (no secrets) |
| POST | `/api/checkout/paypal` | Create PayPal order (or demo success) |
| POST | `/api/checkout/paypal/capture` | Capture approved PayPal order |
| POST | `/api/webhooks/stripe` | Stripe webhook handler |
| POST | `/api/agent` | Rule-based chat assistant |

## Data Model

- **PropertyManager** — manages multiple listings
- **RentalListing** — property with geo, pricing, amenities
- **AvailabilityBlock** — per-day availability for each listing
- **Booking** — guest hold/confirmation with dates and pricing
- **Order** — associated with a booking, holds cart items (`stripePaymentIntentId`, `paypalOrderId`)
- **CartItem** — links order to catalog items or meal options
- **ProcessedWebhookEvent** — provider webhook event ids already handled (idempotency)
- **CatalogItem** — toiletries, food, or equipment for sale
- **MealOption** — breakfast or dinner packages

## Project Structure

```
src/
  app/
    api/           # Next.js API routes (incl. checkout/paypal)
    layout.tsx
    page.tsx       # Main app page
    globals.css
  components/
    SearchBar.tsx
    MapView.tsx
    ListingsPanel.tsx
    ManagersPanel.tsx
    InventoryPanel.tsx
    CartPanel.tsx
    PayPalCheckoutButton.tsx
    Footer.tsx
    ChatDrawer.tsx
  lib/
    prisma.ts
    paypal.ts      # PayPal Orders API helpers
    utils.ts
prisma/
  schema.prisma
  seed.ts
```
