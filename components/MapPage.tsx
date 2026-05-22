'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import BarModal from './BarModal';

const MapClient = dynamic(() => import('./MapClient'), { ssr: false });

interface BarWithStats {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  description: string;
  capacity: number;
  ownerName: string;
  openHours: string;
  tags: string[];
  stats: { male: number; female: number };
}

interface ActiveCheckin {
  checkinId: string;
  barId: string;
  nickname: string;
  gender: string;
}

const STORAGE_KEY = 'honseul_checkin';

export default function MapPage() {
  const [bars, setBars] = useState<BarWithStats[]>([]);
  const [selectedBarId, setSelectedBarId] = useState<string | null>(null);
  const [activeCheckin, setActiveCheckin] = useState<ActiveCheckin | null>(null);

  const selectedBar = bars.find((b) => b.id === selectedBarId) ?? null;

  // Load active checkin from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setActiveCheckin(JSON.parse(stored));
    } catch {}
  }, []);

  const fetchBars = useCallback(async () => {
    try {
      const res = await fetch('/api/bars');
      const data = await res.json();
      setBars(data);
    } catch {}
  }, []);

  // Initial fetch + polling every 5s
  useEffect(() => {
    fetchBars();
    const id = setInterval(fetchBars, 5000);
    return () => clearInterval(id);
  }, [fetchBars]);

  function handleCheckin(checkinId: string, barId: string, nickname: string, gender: string) {
    const checkin = { checkinId, barId, nickname, gender };
    setActiveCheckin(checkin);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(checkin));
    fetchBars();
  }

  function handleCheckout() {
    setActiveCheckin(null);
    localStorage.removeItem(STORAGE_KEY);
    fetchBars();
  }

  const activeBar = activeCheckin ? bars.find((b) => b.id === activeCheckin.barId) : null;

  return (
    <div className="relative w-screen h-screen bg-[#0d0d14] overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-[500] flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div className="pointer-events-auto">
          <h1 className="text-xl font-black text-amber-400 tracking-tight">🍺 대동혼술지도</h1>
          <p className="text-xs text-white/40">서울 혼술바 실시간 남녀 현황</p>
        </div>
        <a
          href="/owner"
          className="pointer-events-auto text-xs bg-white/10 hover:bg-white/20 text-white/70 px-3 py-1.5 rounded-full transition-colors"
        >
          사장님 등록 →
        </a>
      </div>

      {/* Map */}
      <MapClient bars={bars} onBarClick={setSelectedBarId} selectedBarId={selectedBarId} />

      {/* Active checkin banner */}
      {activeCheckin && activeBar && (
        <div className="absolute bottom-6 left-4 right-4 z-[500]">
          <div
            className="bg-[#1a1a2e] border border-amber-500/40 rounded-2xl px-4 py-3 flex items-center justify-between cursor-pointer shadow-2xl"
            onClick={() => setSelectedBarId(activeCheckin.barId)}
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <div>
                <p className="text-sm font-semibold text-white">
                  {activeCheckin.gender === 'male' ? '🙋‍♂️' : '🙋‍♀️'} {activeCheckin.nickname}
                </p>
                <p className="text-xs text-white/50">{activeBar.name} 체크인 중</p>
              </div>
            </div>
            <button
              onClick={async (e) => {
                e.stopPropagation();
                await fetch('/api/checkout', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ checkinId: activeCheckin.checkinId }),
                });
                handleCheckout();
              }}
              className="text-xs bg-white/10 hover:bg-white/20 text-white/60 px-3 py-1.5 rounded-full transition-colors"
            >
              체크아웃
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-6 right-4 z-[500] bg-black/60 backdrop-blur-sm rounded-xl p-3 text-xs text-white/50 space-y-1">
        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />여유</div>
        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />보통</div>
        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />혼잡</div>
      </div>

      {/* Bar modal */}
      {selectedBar && (
        <BarModal
          bar={selectedBar}
          onClose={() => setSelectedBarId(null)}
          activeCheckin={activeCheckin}
          onCheckin={handleCheckin}
          onCheckout={handleCheckout}
        />
      )}
    </div>
  );
}
