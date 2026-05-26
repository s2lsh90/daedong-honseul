'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BarModal from './BarModal';
import { useAuth } from './AuthContext';

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
  instagram?: string;
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
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
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
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: '#e8d5a0' }}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-[500] flex items-center justify-between px-4 py-3 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(100,60,10,0.96) 0%, rgba(100,60,10,0.75) 80%, transparent 100%)',
          borderBottom: '2.5px solid #8b6010',
        }}>
        <div className="pointer-events-auto">
          <h1 className="text-xl font-black tracking-tight" style={{ color: '#f5e8c0', fontFamily: "Georgia, 'Times New Roman', serif", textShadow: '1px 1px 3px rgba(0,0,0,0.4)' }}>🍺 대동혼술지도</h1>
          <p className="text-xs italic" style={{ color: 'rgba(245,220,150,0.65)' }}>서울 혼술바 탐방 안내도 — 실시간 현황</p>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          {!authLoading && (
            user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs hidden sm:block" style={{ color: 'rgba(245,220,150,0.6)' }}>
                  {(user.user_metadata?.name as string) ||
                    (user.user_metadata?.full_name as string) ||
                    (user.user_metadata?.nickname as string) ||
                    user.email?.split('@')[0]}
                </span>
                <button
                  onClick={signOut}
                  className="text-xs px-3 py-1.5 transition-colors"
                  style={{ background: 'rgba(80,45,5,0.7)', border: '1.5px solid #c8952a', color: '#f5e8c0', borderRadius: '3px', fontFamily: "Georgia, serif" }}
                >
                  귀가
                </button>
              </div>
            ) : (
              <button
                onClick={() => router.push('/login')}
                className="text-xs px-3 py-1.5 transition-colors font-bold"
                style={{ background: 'rgba(80,45,5,0.8)', border: '2px solid #c8952a', color: '#f5e8c0', borderRadius: '3px', fontFamily: "Georgia, serif" }}
              >
                로그인
              </button>
            )
          )}
          <a
            href="/owner"
            className="text-xs px-3 py-1.5 transition-colors"
            style={{ background: 'rgba(80,45,5,0.6)', border: '1.5px solid #8b6010', color: 'rgba(245,220,150,0.8)', borderRadius: '3px', fontFamily: "Georgia, serif" }}
          >
            사장님 등록
          </a>
        </div>
      </div>

      {/* Map */}
      <MapClient bars={bars} onBarClick={setSelectedBarId} selectedBarId={selectedBarId} />

      {/* ── 보드게임 빈티지 액자 프레임 ── */}
      <div className="absolute inset-0 z-[300] pointer-events-none overflow-hidden">

        {/* 바깥 두꺼운 나무 테두리 */}
        <div className="absolute" style={{
          inset: '8px',
          border: '4px solid #6b4010',
          borderRadius: '6px',
          boxShadow: 'inset 0 0 0 2px #c8952a, inset 0 0 0 5px #6b4010, 0 0 0 1px #6b4010, inset 0 0 60px rgba(0,0,0,0.15)',
        }} />

        {/* 안쪽 얇은 이중선 */}
        <div className="absolute" style={{
          inset: '20px',
          border: '1px solid rgba(107,64,16,0.45)',
          borderRadius: '2px',
        }} />

        {/* 코너 장식 🌿 */}
        <div className="absolute top-[4px] left-[4px] text-[20px]" style={{ lineHeight: 1 }}>🌿</div>
        <div className="absolute top-[4px] right-[4px] text-[20px]" style={{ lineHeight: 1, transform: 'scaleX(-1)' }}>🌿</div>
        <div className="absolute bottom-[4px] left-[4px] text-[20px]" style={{ lineHeight: 1, transform: 'scaleY(-1)' }}>🌿</div>
        <div className="absolute bottom-[4px] right-[4px] text-[20px]" style={{ lineHeight: 1, transform: 'scale(-1,-1)' }}>🌿</div>

        {/* 상단 중앙 장식 */}
        <div className="absolute top-[10px] left-1/2 -translate-x-1/2 flex items-center gap-[6px]">
          <div className="h-[1.5px] w-12" style={{ background: 'linear-gradient(to right, transparent, rgba(107,64,16,0.6))' }} />
          <div className="w-[8px] h-[8px] rotate-45" style={{ background: '#8b6010' }} />
          <div className="h-[1.5px] w-12" style={{ background: 'linear-gradient(to left, transparent, rgba(107,64,16,0.6))' }} />
        </div>

        {/* 하단 중앙 스탬프 */}
        <div className="absolute bottom-[10px] left-1/2 -translate-x-1/2 flex items-center gap-[8px]">
          <div className="h-[1.5px] w-10" style={{ background: 'linear-gradient(to right, transparent, rgba(107,64,16,0.6))' }} />
          <span className="text-[10px] font-black tracking-[4px]" style={{ color: '#6b4010', fontFamily: "Georgia, serif" }}>혼술지도</span>
          <div className="h-[1.5px] w-10" style={{ background: 'linear-gradient(to left, transparent, rgba(107,64,16,0.6))' }} />
        </div>

        {/* 좌측 중앙 */}
        <div className="absolute left-[10px] top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-[6px]">
          <div className="w-[1.5px] h-10" style={{ background: 'linear-gradient(to bottom, transparent, rgba(107,64,16,0.6))' }} />
          <div className="w-[8px] h-[8px] rotate-45" style={{ background: '#8b6010' }} />
          <div className="w-[1.5px] h-10" style={{ background: 'linear-gradient(to top, transparent, rgba(107,64,16,0.6))' }} />
        </div>

        {/* 우측 중앙 */}
        <div className="absolute right-[10px] top-1/2 translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-[6px]">
          <div className="w-[1.5px] h-10" style={{ background: 'linear-gradient(to bottom, transparent, rgba(107,64,16,0.6))' }} />
          <div className="w-[8px] h-[8px] rotate-45" style={{ background: '#8b6010' }} />
          <div className="w-[1.5px] h-10" style={{ background: 'linear-gradient(to top, transparent, rgba(107,64,16,0.6))' }} />
        </div>

      </div>

      {/* Active checkin banner */}
      {activeCheckin && activeBar && (
        <div className="absolute bottom-6 left-4 right-4 z-[500]">
          <div
            className="px-4 py-3 flex items-center justify-between cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #f8f0d8 0%, #f0e0a8 60%, #e6d08a 100%)',
              border: '2px solid #7a4f10',
              borderRadius: '4px',
              boxShadow: '3px 4px 12px rgba(60,30,0,0.35), inset 0 1px 0 rgba(255,255,255,0.5)',
              fontFamily: "Georgia, 'Times New Roman', serif",
            }}
            onClick={() => setSelectedBarId(activeCheckin.barId)}
          >
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: '#2d8a5e', boxShadow: '0 0 6px #2d8a5e' }} />
              <div>
                <p className="text-sm font-bold" style={{ color: '#3a1c00' }}>
                  {activeCheckin.gender === 'male' ? '🙋‍♂️' : '🙋‍♀️'} {activeCheckin.nickname}님 탐방 중
                </p>
                <p className="text-xs italic" style={{ color: '#8b6010' }}>📍 {activeBar.name}</p>
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
              className="text-xs px-3 py-1.5 transition-colors"
              style={{ background: 'rgba(80,45,5,0.15)', border: '1.5px solid #8b6010', color: '#5a3010', borderRadius: '3px' }}
            >
              귀가
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-6 right-4 z-[500] p-3 text-xs space-y-1.5"
        style={{
          background: 'linear-gradient(135deg, #f8f0d8, #f0e0a8)',
          border: '2px solid #7a4f10',
          borderRadius: '3px',
          boxShadow: '2px 3px 8px rgba(60,30,0,0.3)',
          fontFamily: "Georgia, serif",
          color: '#5a3010',
        }}>
        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#2d8a5e' }} />여유</div>
        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#b5730a' }} />보통</div>
        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#a0332b' }} />혼잡</div>
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
