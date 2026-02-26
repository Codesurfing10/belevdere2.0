'use client';
import { useState } from 'react';

interface Props {
  managers: any[];
}

export default function ManagersPanel({ managers }: Props) {
  const [search, setSearch] = useState('');

  const filtered = managers.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.serviceAreas?.some((a: string) => a.toLowerCase().includes(search.toLowerCase()))
  );

  if (managers.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-4xl mb-3">👤</div>
        <p>Search for a city to see property managers</p>
      </div>
    );
  }

  return (
    <div>
      <input
        type="text"
        placeholder="Filter managers..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="border rounded-lg px-3 py-2 text-sm w-full mb-4"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((manager: any) => (
          <div key={manager.id} className="border rounded-xl p-3 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                {manager.name.split(' ').map((n: string) => n[0]).join('')}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm">{manager.name}</p>
                <p className="text-xs text-gray-500">⭐ {manager.rating} · {manager.responseSla}h response</p>
              </div>
              <div className="ml-auto text-xs text-gray-500 text-right shrink-0">
                <p>{manager._count?.listings || 0} listings</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">{manager.bio}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {manager.serviceAreas?.map((area: string) => (
                <span key={area} className="text-xs bg-blue-50 text-blue-600 rounded-full px-2 py-0.5">{area}</span>
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              📧 {manager.email} · 📞 {manager.phone}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
