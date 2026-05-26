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

      {/* ── 액자 프레임 오버레이 ── */}
      <div className="absolute inset-0 z-[300] pointer-events-none overflow-hidden">

        {/* 비네트 */}
        <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 120px rgba(0,0,0,0.6)' }} />

        {/* 바깥 두꺼운 테두리 */}
        <div
          className="absolute rounded-[24px]"
          style={{
            inset: '14px',
            border: '3.5px solid rgba(245,158,11,0.78)',
            boxShadow:
              '0 0 0 1px rgba(245,158,11,0.15), inset 0 0 30px rgba(245,158,11,0.05), 0 0 28px rgba(245,158,11,0.12)',
          }}
        />

        {/* 안쪽 얇은 이중선 */}
        <div
          className="absolute rounded-[18px]"
          style={{
            inset: '24px',
            border: '1px solid rgba(245,158,11,0.32)',
          }}
        />

        {/* ── 코너 메달리온 (술 아이콘) ── */}
        {/* 상단 왼쪽 🍺 */}
        <div
          className="absolute top-[3px] left-[3px] w-[46px] h-[46px] rounded-full flex items-center justify-center text-[22px]"
          style={{
            background: 'radial-gradient(circle at 38% 32%, #3d2804, #180e01)',
            border: '3px solid rgba(245,158,11,0.85)',
            boxShadow: '0 0 16px rgba(245,158,11,0.6), 0 0 5px rgba(245,158,11,1), inset 0 1px 0 rgba(255,220,100,0.18)',
          }}
        >🍺</div>

        {/* 상단 오른쪽 🥃 */}
        <div
          className="absolute top-[3px] right-[3px] w-[46px] h-[46px] rounded-full flex items-center justify-center text-[22px]"
          style={{
            background: 'radial-gradient(circle at 38% 32%, #3d2804, #180e01)',
            border: '3px solid rgba(245,158,11,0.85)',
            boxShadow: '0 0 16px rgba(245,158,11,0.6), 0 0 5px rgba(245,158,11,1), inset 0 1px 0 rgba(255,220,100,0.18)',
          }}
        >🥃</div>

        {/* 하단 왼쪽 🍷 */}
        <div
          className="absolute bottom-[3px] left-[3px] w-[46px] h-[46px] rounded-full flex items-center justify-center text-[22px]"
          style={{
            background: 'radial-gradient(circle at 38% 32%, #3d2804, #180e01)',
            border: '3px solid rgba(245,158,11,0.85)',
            boxShadow: '0 0 16px rgba(245,158,11,0.6), 0 0 5px rgba(245,158,11,1), inset 0 1px 0 rgba(255,220,100,0.18)',
          }}
        >🍷</div>

        {/* 하단 오른쪽 🍸 */}
        <div
          className="absolute bottom-[3px] right-[3px] w-[46px] h-[46px] rounded-full flex items-center justify-center text-[22px]"
          style={{
            background: 'radial-gradient(circle at 38% 32%, #3d2804, #180e01)',
            border: '3px solid rgba(245,158,11,0.85)',
            boxShadow: '0 0 16px rgba(245,158,11,0.6), 0 0 5px rgba(245,158,11,1), inset 0 1px 0 rgba(255,220,100,0.18)',
          }}
        >🍸</div>

        {/* ── 모서리 중간 장식 ── */}
        {/* 상단 중앙 */}
        <div className="absolute top-[13px] left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-[7px]">
          <div className="h-[1.5px] w-14 bg-gradient-to-r from-transparent to-amber-400/55" />
          <div className="w-[9px] h-[9px] rotate-45 bg-amber-400" style={{ boxShadow: '0 0 7px rgba(245,158,11,0.9)' }} />
          <div className="h-[1.5px] w-14 bg-gradient-to-l from-transparent to-amber-400/55" />
        </div>

        {/* 하단 중앙 — 혼술지도 스탬프 */}
        <div className="absolute bottom-[13px] left-1/2 -translate-x-1/2 translate-y-1/2 flex items-center gap-[8px]">
          <div className="h-[1.5px] w-10 bg-gradient-to-r from-transparent to-amber-400/55" />
          <span
            className="text-[10px] font-black tracking-[4px] text-amber-400"
            style={{ textShadow: '0 0 10px rgba(245,158,11,0.75)' }}
          >혼술지도</span>
          <div className="h-[1.5px] w-10 bg-gradient-to-l from-transparent to-amber-400/55" />
        </div>

        {/* 좌측 중앙 */}
        <div className="absolute left-[13px] top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-[7px]">
          <div className="w-[1.5px] h-12 bg-gradient-to-b from-transparent to-amber-400/55" />
          <div className="w-[9px] h-[9px] rotate-45 bg-amber-400" style={{ boxShadow: '0 0 7px rgba(245,158,11,0.9)' }} />
          <div className="w-[1.5px] h-12 bg-gradient-to-t from-transparent to-amber-400/55" />
        </div>

        {/* 우측 중앙 */}
        <div className="absolute right-[13px] top-1/2 translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-[7px]">
          <div className="w-[1.5px] h-12 bg-gradient-to-b from-transparent to-amber-400/55" />
          <div className="w-[9px] h-[9px] rotate-45 bg-amber-400" style={{ boxShadow: '0 0 7px rgba(245,158,11,0.9)' }} />
          <div className="w-[1.5px] h-12 bg-gradient-to-t from-transparent to-amber-400/55" />
        </div>

      </div>

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
