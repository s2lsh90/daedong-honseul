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
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: '#08081a' }}>

      {/* ── 헤더 ── */}
      <div
        className="absolute top-0 left-0 right-0 z-[500] flex items-center justify-between px-5 py-3 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(8,8,26,0.96) 0%, rgba(8,8,26,0.65) 80%, transparent 100%)',
        }}
      >
        <div className="pointer-events-auto">
          <h1
            className="text-xl font-black tracking-tight"
            style={{ color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
          >
            <span style={{ color: '#4fc3f7' }}>🍺</span> 대동혼술지도
          </h1>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.3px' }}>
            서울 혼술바 실시간 현황
          </p>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          {!authLoading && (
            user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs hidden sm:block" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {(user.user_metadata?.name as string) ||
                    (user.user_metadata?.full_name as string) ||
                    (user.user_metadata?.nickname as string) ||
                    user.email?.split('@')[0]}
                </span>
                <button
                  onClick={signOut}
                  className="text-xs px-3 py-1.5 transition-all hover:opacity-80"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '6px',
                    color: 'rgba(255,255,255,0.65)',
                  }}
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <button
                onClick={() => router.push('/login')}
                className="text-xs px-3 py-1.5 font-bold transition-all hover:opacity-80"
                style={{
                  background: 'rgba(79,195,247,0.12)',
                  border: '1px solid rgba(79,195,247,0.35)',
                  borderRadius: '6px',
                  color: '#4fc3f7',
                }}
              >
                로그인
              </button>
            )
          )}
          <a
            href="/owner"
            className="text-xs px-3 py-1.5 transition-all hover:opacity-80"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
              color: 'rgba(255,255,255,0.45)',
            }}
          >
            사장님 등록
          </a>
        </div>
      </div>

      {/* ── 지도 ── */}
      <MapClient bars={bars} onBarClick={setSelectedBarId} selectedBarId={selectedBarId} />

      {/* ── 활성 체크인 배너 ── */}
      {activeCheckin && activeBar && (
        <div className="absolute bottom-6 left-4 z-[500]" style={{ right: '88px' }}>
          <div
            className="px-4 py-3 flex items-center justify-between cursor-pointer transition-all hover:opacity-90"
            style={{
              background: 'rgba(10,10,28,0.92)',
              border: '1px solid rgba(79,195,247,0.25)',
              borderRadius: '12px',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 0 24px rgba(79,195,247,0.08), 0 8px 32px rgba(0,0,0,0.5)',
            }}
            onClick={() => setSelectedBarId(activeCheckin.barId)}
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: '#4ade80', boxShadow: '0 0 8px #4ade80' }} />
              <div>
                <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.88)' }}>
                  {activeCheckin.gender === 'male' ? '🙋‍♂️' : '🙋‍♀️'} {activeCheckin.nickname}님 탐방 중
                </p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.38)' }}>
                  📍 {activeBar.name}
                </p>
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
              className="text-xs px-3 py-1.5 transition-all hover:opacity-80 ml-3 flex-shrink-0"
              style={{
                background: 'rgba(248,113,113,0.1)',
                border: '1px solid rgba(248,113,113,0.28)',
                borderRadius: '6px',
                color: '#f87171',
              }}
            >
              귀가
            </button>
          </div>
        </div>
      )}

      {/* ── 범례 ── */}
      <div
        className="absolute bottom-6 right-4 z-[500] p-3 text-xs space-y-1.5"
        style={{
          background: 'rgba(10,10,28,0.88)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '10px',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          color: 'rgba(255,255,255,0.55)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: '#4ade80', boxShadow: '0 0 6px #4ade8066' }} /> 여유
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: '#fb923c', boxShadow: '0 0 6px #fb923c66' }} /> 보통
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: '#f87171', boxShadow: '0 0 6px #f8717166' }} /> 혼잡
        </div>
      </div>

      {/* ── 바 모달 ── */}
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
