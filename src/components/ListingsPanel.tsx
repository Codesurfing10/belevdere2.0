'use client';
import { ensureArray } from '@/lib/utils';

interface Props {
  listings: any[];
  onBook: (listing: any) => void;
  selectedListing: any;
}

export default function ListingsPanel({ listings, onBook, selectedListing }: Props) {
  if (listings.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-4xl mb-3">🏠</div>
        <p className="font-medium">Search for a city to see available listings</p>
        <p className="text-sm mt-1">Try Miami, Austin, or Denver</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {listings.map((listing: any) => {
        const images = ensureArray<string>(listing.images);
        const amenities = ensureArray<string>(listing.amenities);
        const isSelected = selectedListing?.id === listing.id;

        return (
          <div
            key={listing.id}
            className={`border rounded-xl overflow-hidden hover:shadow-md transition-shadow ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
          >
            <div className="h-36 bg-gradient-to-br from-blue-100 to-indigo-100 relative overflow-hidden">
              {images[0] && (
                <img src={images[0]} alt={listing.title} className="w-full h-full object-cover" />
              )}
              <div className="absolute top-2 right-2 bg-white rounded-full px-2 py-0.5 text-xs font-bold text-green-600">
                {listing.openNights} open nights
              </div>
            </div>
            <div className="p-3">
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-sm">{listing.title}</h3>
                <span className="font-bold text-indigo-600">
                  ${listing.nightlyPrice}<span className="text-xs text-gray-400">/night</span>
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{listing.city} · Up to {listing.maxGuests} guests</p>
              <p className="text-xs text-gray-400 mt-1">⭐ {listing.manager?.rating} · {listing.manager?.name}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {amenities.slice(0, 3).map((a: string) => (
                  <span key={a} className="text-xs bg-gray-100 rounded-full px-2 py-0.5">{a}</span>
                ))}
              </div>
              <button
                onClick={() => onBook(listing)}
                className="mt-3 w-full bg-indigo-600 text-white text-xs py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Book Now
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
