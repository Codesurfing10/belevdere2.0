import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const guests = parseInt(searchParams.get('guests') || '1');

  if (!city || !startDate || !endDate) {
    return NextResponse.json({ error: 'city, startDate, endDate required' }, { status: 400 });
  }

  let bbox = { minLat: -90, maxLat: 90, minLng: -180, maxLng: 180 };
  let centerLat = 0, centerLng = 0;
  const mapboxToken = process.env.MAPBOX_TOKEN;

  if (mapboxToken && !mapboxToken.includes('your_mapbox')) {
    try {
      const geoRes = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(city)}.json?types=place&access_token=${mapboxToken}`
      );
      const geoData = await geoRes.json();
      if (geoData.features && geoData.features.length > 0) {
        const feature = geoData.features[0];
        centerLng = feature.center[0];
        centerLat = feature.center[1];
        if (feature.bbox) {
          bbox = { minLng: feature.bbox[0], minLat: feature.bbox[1], maxLng: feature.bbox[2], maxLat: feature.bbox[3] };
        } else {
          const delta = 0.5;
          bbox = { minLat: centerLat - delta, maxLat: centerLat + delta, minLng: centerLng - delta, maxLng: centerLng + delta };
        }
      }
    } catch (e) {
      console.error('Geocoding error:', e);
    }
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  let listings;
  if (centerLat !== 0) {
    listings = await prisma.rentalListing.findMany({
      where: {
        maxGuests: { gte: guests },
        lat: { gte: bbox.minLat, lte: bbox.maxLat },
        lng: { gte: bbox.minLng, lte: bbox.maxLng },
      },
      include: {
        manager: true,
        availabilityBlocks: {
          where: {
            startDate: { gte: start },
            endDate: { lte: end },
          }
        }
      }
    });
  } else {
    listings = await prisma.rentalListing.findMany({
      where: {
        city: { contains: city, mode: 'insensitive' },
        maxGuests: { gte: guests },
      },
      include: {
        manager: true,
        availabilityBlocks: {
          where: {
            startDate: { gte: start },
            endDate: { lte: end },
          }
        }
      }
    });
  }

  const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  const available = listings.filter(listing => {
    const availBlocks = listing.availabilityBlocks.filter(b => b.isAvailable);
    return availBlocks.length >= nights;
  });

  const now = new Date();
  const future60 = new Date();
  future60.setDate(now.getDate() + 60);

  const scored = await Promise.all(
    available.map(async (listing) => {
      const blocks60 = await prisma.availabilityBlock.findMany({
        where: {
          listingId: listing.id,
          startDate: { gte: now, lte: future60 },
          isAvailable: true,
        }
      });
      const openNights = blocks60.length;
      // Scoring: open nights favored (+1 per night), high price penalized (-0.05/$/night),
      // high manager rating favored (+5 per rating point, scale 0-5).
      const availabilityScore = openNights - listing.nightlyPrice * 0.05 + listing.manager.rating * 5;

      return {
        ...listing,
        amenities: listing.amenities as string[],
        images: listing.images as string[],
        availabilityScore,
        openNights,
      };
    })
  );

  scored.sort((a, b) => b.availabilityScore - a.availabilityScore);

  return NextResponse.json({ listings: scored, center: { lat: centerLat, lng: centerLng } });
}
