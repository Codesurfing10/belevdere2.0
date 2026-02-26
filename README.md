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
- 🤖 **Chat Assistant** — Rule-based assistant to filter listings and add items to cart

## Tech Stack

- **Next.js 15** (App Router, TypeScript)
- **Prisma + PostgreSQL** — Data model for listings, bookings, orders, catalog
- **Mapbox** — Map display and geocoding
- **Stripe** — Payments and webhooks
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
```

### 3. Set up the database

```bash
npm run db:generate    # Generate Prisma client
npm run db:migrate     # Run migrations (creates tables)
npm run db:seed        # Seed with 30 listings, 10 managers, catalog items, meals
```

### 4. Start the dev server

```bash
npm run dev
```

Open http://localhost:3000.

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
| POST | `/api/checkout` | Create Stripe Payment Intent |
| POST | `/api/webhooks/stripe` | Stripe webhook handler |
| POST | `/api/agent` | Rule-based chat assistant |

## Data Model

- **PropertyManager** — manages multiple listings
- **RentalListing** — property with geo, pricing, amenities
- **AvailabilityBlock** — per-day availability for each listing
- **Booking** — guest hold/confirmation with dates and pricing
- **Order** — associated with a booking, holds cart items
- **CartItem** — links order to catalog items or meal options
- **CatalogItem** — toiletries, food, or equipment for sale
- **MealOption** — breakfast or dinner packages

## Project Structure

```
src/
  app/
    api/           # Next.js API routes
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
    ChatDrawer.tsx
  lib/
    prisma.ts      # Prisma client singleton
prisma/
  schema.prisma
  seed.ts
```
