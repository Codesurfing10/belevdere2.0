'use client';
import { useState } from 'react';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface Props {
  listings: any[];
  center: { lat: number; lng: number } | null;
  onSelectListing: (listing: any) => void;
  selectedListing: any;
}

export default function MapView({ listings, center, onSelectListing, selectedListing }: Props) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
  const [popupListing, setPopupListing] = useState<any>(null);

  const defaultCenter = center || { lat: 25.7617, lng: -80.1918 };

  if (!token || token.includes('your_mapbox')) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center">
        <div className="text-center p-6">
          <div className="text-4xl mb-2">🗺️</div>
          <p className="text-gray-700 font-medium">Map Preview</p>
          <p className="text-gray-500 text-sm mt-1">Add NEXT_PUBLIC_MAPBOX_TOKEN to enable map</p>
          <p className="text-gray-500 text-sm mt-2">{listings.length} listings available</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {listings.slice(0, 5).map((l: any) => (
              <button
                key={l.id}
                onClick={() => onSelectListing(l)}
                className="bg-white rounded-full px-3 py-1 text-xs shadow hover:bg-indigo-50"
              >
                📍 ${l.nightlyPrice}/night
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Map
      initialViewState={{
        longitude: defaultCenter.lng,
        latitude: defaultCenter.lat,
        zoom: 11,
      }}
      style={{ width: '100%', height: '100%' }}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      mapboxAccessToken={token}
    >
      <NavigationControl />
      {listings.map((listing: any) => (
        <Marker
          key={listing.id}
          longitude={listing.lng}
          latitude={listing.lat}
          onClick={e => {
            e.originalEvent.stopPropagation();
            setPopupListing(listing);
            onSelectListing(listing);
          }}
        >
          <div
            className={`cursor-pointer bg-white border-2 rounded-full px-2 py-1 text-xs font-bold shadow-md transition-transform hover:scale-110 ${
              selectedListing?.id === listing.id
                ? 'border-indigo-500 bg-indigo-50 scale-110'
                : 'border-gray-300'
            }`}
          >
            ${listing.nightlyPrice}
          </div>
        </Marker>
      ))}
      {popupListing && (
        <Popup
          longitude={popupListing.lng}
          latitude={popupListing.lat}
          anchor="bottom"
          onClose={() => setPopupListing(null)}
        >
          <div className="text-sm">
            <p className="font-bold">{popupListing.title}</p>
            <p className="text-gray-600">${popupListing.nightlyPrice}/night</p>
            <p className="text-gray-500">{popupListing.city}</p>
          </div>
        </Popup>
      )}
    </Map>
  );
}
