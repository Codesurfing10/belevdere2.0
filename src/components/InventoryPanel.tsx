'use client';
import { useState, useEffect } from 'react';
import { ensureArray } from '@/lib/utils';

type InventoryTab = 'breakfast' | 'dinner' | 'toiletries' | 'equipment';

interface Props {
  activeTab: InventoryTab;
  onAddToCart: (type: 'catalog' | 'meal', id: string, qty: number) => void;
  hasBooking: boolean;
}

export default function InventoryPanel({ activeTab, onAddToCart, hasBooking }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        if (activeTab === 'breakfast' || activeTab === 'dinner') {
          const res = await fetch(`/api/catalog/meals?type=${activeTab}`);
          const data = await res.json();
          setItems(data.meals || []);
        } else {
          const res = await fetch(`/api/catalog/items?category=${activeTab}`);
          const data = await res.json();
          setItems(data.items || []);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [activeTab]);

  if (loading) return <div className="py-8 text-center text-gray-400">Loading...</div>;

  const isMeal = activeTab === 'breakfast' || activeTab === 'dinner';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {!hasBooking && (
        <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
          💡 Select and book a listing to add items to your cart
        </div>
      )}
      {items.map((item: any) => {
        const itemsList = isMeal ? ensureArray<string>(item.items) : [];

        return (
          <div key={item.id} className="border rounded-xl p-3 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-sm">{item.name}</h3>
              <span className="font-bold text-indigo-600">${item.price.toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{item.description}</p>
            {isMeal && itemsList.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-400 font-medium">Includes:</p>
                <ul className="text-xs text-gray-500 mt-1 space-y-0.5">
                  {(itemsList as string[]).map((i: string) => <li key={i}>• {i}</li>)}
                </ul>
              </div>
            )}
            {!isMeal && (
              <p className="text-xs text-gray-400 mt-1">In stock: {item.stockQty}</p>
            )}
            <button
              onClick={() => onAddToCart(isMeal ? 'meal' : 'catalog', item.id, 1)}
              disabled={!hasBooking}
              className="mt-3 w-full bg-indigo-600 text-white text-xs py-1.5 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {hasBooking ? 'Add to Cart' : 'Book a listing first'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
