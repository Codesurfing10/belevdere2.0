'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import SearchBar from '@/components/SearchBar';
import ListingsPanel from '@/components/ListingsPanel';
import ManagersPanel from '@/components/ManagersPanel';
import InventoryPanel from '@/components/InventoryPanel';
import CartPanel from '@/components/CartPanel';
import ChatDrawer from '@/components/ChatDrawer';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

type TabType = 'listings' | 'managers' | 'breakfast' | 'dinner' | 'toiletries' | 'equipment';

interface SearchParams {
  city: string;
  startDate: string;
  endDate: string;
  guests: number;
}

export default function Home() {
  const [searchParams, setSearchParams] = useState<SearchParams>({ city: '', startDate: '', endDate: '', guests: 2 });
  const [listings, setListings] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [booking, setBooking] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('listings');
  const [chatOpen, setChatOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async (params: SearchParams) => {
    setLoading(true);
    setSearchParams(params);
    try {
      const res = await fetch(
        `/api/search?city=${encodeURIComponent(params.city)}&startDate=${params.startDate}&endDate=${params.endDate}&guests=${params.guests}`
      );
      const data = await res.json();
      setListings(data.listings || []);
      if (data.center?.lat) setCenter(data.center);

      const mgrRes = await fetch(`/api/managers?city=${encodeURIComponent(params.city)}`);
      const mgrData = await mgrRes.json();
      setManagers(mgrData.managers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleBookNow = async (listing: any) => {
    if (!searchParams.startDate || !searchParams.endDate) {
      alert('Please select dates first');
      return;
    }
    const res = await fetch('/api/bookings/hold', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listingId: listing.id,
        startDate: searchParams.startDate,
        endDate: searchParams.endDate,
        guests: searchParams.guests,
      })
    });
    const data = await res.json();
    setSelectedListing(listing);
    setBooking(data.booking);
    setOrder(data.order);
    setCartItems([]);
    setActiveTab('breakfast');
  };

  const handleAddToCart = async (type: 'catalog' | 'meal', id: string, qty: number = 1) => {
    if (!booking) { alert('Please select a listing first'); return; }
    const body: Record<string, unknown> = { bookingId: booking.id, qty };
    if (type === 'meal') { body.mealOptionId = id; body.type = 'meal'; }
    else { body.itemId = id; }

    await fetch('/api/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const cartRes = await fetch(`/api/cart?bookingId=${booking.id}`);
    const cartData = await cartRes.json();
    setCartItems(cartData.order?.cartItems || []);
    setOrder(cartData.order);
  };

  const handleCheckout = async () => {
    if (!booking) return;
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: booking.id })
    });
    const data = await res.json();
    if (data.clientSecret) {
      alert(`Checkout initiated! Payment Intent: ${data.paymentIntentId}\nTotal: $${data.amount.toFixed(2)}\n\nIn production, this would redirect to Stripe checkout.`);
    } else if (data.error) {
      alert(`Checkout error: ${data.error}`);
    }
  };

  const handleAgentAction = useCallback((action: any) => {
    if (action.type === 'FILTER_PRICE') {
      setListings(prev => prev.filter((l: any) => l.nightlyPrice <= action.maxPrice));
    } else if (action.type === 'FILTER_AMENITY') {
      setListings(prev => prev.filter((l: any) => {
        const amenities = Array.isArray(l.amenities) ? l.amenities : JSON.parse(l.amenities || '[]');
        return amenities.some((a: string) => a.toLowerCase().includes(action.amenity.toLowerCase()));
      }));
    } else if (action.type === 'SEARCH') {
      handleSearch({ ...searchParams, city: action.city });
    } else if (action.type === 'ADD_TO_CART') {
      handleAddToCart(action.itemType === 'meal' ? 'meal' : 'catalog', action.mealOptionId || action.itemId, action.qty);
    }
    // 'listings' is omitted from deps intentionally; FILTER actions use functional setState(prev => ...)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, handleSearch]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <h1 className="text-2xl font-bold text-indigo-600">🏠 Belevdere</h1>
          <div className="flex-1">
            <SearchBar onSearch={handleSearch} loading={loading} />
          </div>
          {booking && (
            <div className="text-sm text-gray-600 shrink-0">
              📋 <span className="font-medium text-green-600">{selectedListing?.title}</span>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex gap-4">
          {/* Left: Map + Content */}
          <div className="flex-1 min-w-0">
            {/* Map */}
            <div className="rounded-xl overflow-hidden shadow-md mb-4" style={{ height: '400px' }}>
              <MapView
                listings={listings}
                center={center}
                onSelectListing={setSelectedListing}
                selectedListing={selectedListing}
              />
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-md">
              <div className="flex border-b overflow-x-auto">
                {(['listings', 'managers', 'breakfast', 'dinner', 'toiletries', 'equipment'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-3 text-sm font-medium capitalize whitespace-nowrap border-b-2 transition-colors ${activeTab === tab ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  >
                    {tab === 'listings' ? `🏠 Listings (${listings.length})` :
                     tab === 'managers' ? '👤 Managers' :
                     tab === 'breakfast' ? '🌅 Breakfast' :
                     tab === 'dinner' ? '🌙 Dinner' :
                     tab === 'toiletries' ? '🧴 Toiletries' : '🚴 Equipment'}
                  </button>
                ))}
              </div>
              <div className="p-4">
                {activeTab === 'listings' && (
                  <ListingsPanel listings={listings} onBook={handleBookNow} selectedListing={selectedListing} />
                )}
                {activeTab === 'managers' && <ManagersPanel managers={managers} />}
                {(activeTab === 'breakfast' || activeTab === 'dinner' || activeTab === 'toiletries' || activeTab === 'equipment') && (
                  <InventoryPanel activeTab={activeTab} onAddToCart={handleAddToCart} hasBooking={!!booking} />
                )}
              </div>
            </div>
          </div>

          {/* Right: Cart */}
          <div className="w-80 shrink-0">
            <CartPanel
              booking={booking}
              listing={selectedListing}
              cartItems={cartItems}
              order={order}
              onCheckout={handleCheckout}
            />
          </div>
        </div>
      </div>

      {/* Chat Button */}
      <button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-6 right-6 bg-indigo-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-colors z-50 text-2xl"
        aria-label="Open chat assistant"
      >
        💬
      </button>

      {/* Chat Drawer */}
      {chatOpen && (
        <ChatDrawer
          onClose={() => setChatOpen(false)}
          onAction={handleAgentAction}
          bookingId={booking?.id}
        />
      )}
    </div>
  );
}
