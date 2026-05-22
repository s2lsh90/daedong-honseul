'use client';

import { useState } from 'react';

interface BarWithStats {
  id: string;
  name: string;
  address: string;
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

interface Props {
  bar: BarWithStats;
  onClose: () => void;
  activeCheckin: ActiveCheckin | null;
  onCheckin: (checkinId: string, barId: string, nickname: string, gender: string) => void;
  onCheckout: () => void;
}

export default function BarModal({ bar, onClose, activeCheckin, onCheckin, onCheckout }: Props) {
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const total = bar.stats.male + bar.stats.female;
  const occupancy = bar.capacity > 0 ? Math.round((total / bar.capacity) * 100) : 0;

  const isCheckedInHere = activeCheckin?.barId === bar.id;
  const isCheckedInElsewhere = activeCheckin && activeCheckin.barId !== bar.id;

  async function handleCheckin() {
    if (!nickname.trim()) return setError('닉네임을 입력해주세요');
    if (!gender) return setError('성별을 선택해주세요');
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barId: bar.id, nickname: nickname.trim(), gender }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onCheckin(data.checkinId, data.barId, data.nickname, data.gender);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckout() {
    if (!activeCheckin) return;
    setLoading(true);
    try {
      await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkinId: activeCheckin.checkinId }),
      });
      onCheckout();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-[#1a1a2e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-white/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-white">{bar.name}</h2>
              <p className="text-sm text-white/50 mt-0.5">{bar.address}</p>
            </div>
            <button onClick={onClose} className="text-white/40 hover:text-white text-2xl leading-none mt-0.5">×</button>
          </div>

          <div className="flex gap-2 mt-3 flex-wrap">
            {bar.tags.map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">{tag}</span>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="px-5 py-4">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-blue-500/15 border border-blue-500/30 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-blue-400">{bar.stats.male}</div>
              <div className="text-xs text-white/50 mt-0.5">남성 🙋‍♂️</div>
            </div>
            <div className="bg-pink-500/15 border border-pink-500/30 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-pink-400">{bar.stats.female}</div>
              <div className="text-xs text-white/50 mt-0.5">여성 🙋‍♀️</div>
            </div>
            <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-amber-400">{total}</div>
              <div className="text-xs text-white/50 mt-0.5">총 인원</div>
            </div>
          </div>

          {/* Occupancy bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-white/40 mb-1">
              <span>혼잡도</span>
              <span>{occupancy}% ({total}/{bar.capacity}명)</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  occupancy < 40 ? 'bg-green-400' : occupancy < 70 ? 'bg-amber-400' : 'bg-red-400'
                }`}
                style={{ width: `${Math.min(occupancy, 100)}%` }}
              />
            </div>
          </div>

          {/* Info */}
          <div className="text-sm text-white/50 space-y-1 mb-4">
            <div className="flex gap-2"><span>🕐</span><span>{bar.openHours}</span></div>
            <div className="flex gap-2"><span>👤</span><span>사장님: {bar.ownerName}</span></div>
            <div className="flex gap-2"><span>💬</span><span>{bar.description}</span></div>
          </div>

          {/* Checkin / Checkout */}
          {isCheckedInHere ? (
            <div className="space-y-3">
              <div className="bg-green-500/15 border border-green-500/30 rounded-xl p-3 text-center">
                <p className="text-green-400 text-sm font-medium">
                  {activeCheckin!.gender === 'male' ? '🙋‍♂️' : '🙋‍♀️'} {activeCheckin!.nickname}님 체크인 중
                </p>
              </div>
              <button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition-colors disabled:opacity-50"
              >
                {loading ? '처리 중...' : '🚪 체크아웃'}
              </button>
            </div>
          ) : isCheckedInElsewhere ? (
            <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-3 text-center">
              <p className="text-amber-400 text-sm">다른 바에 체크인 중입니다. 먼저 체크아웃 해주세요.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="닉네임 입력"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={10}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setGender('male')}
                  className={`py-2.5 rounded-xl font-medium text-sm transition-all ${
                    gender === 'male'
                      ? 'bg-blue-500 text-white'
                      : 'bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20'
                  }`}
                >
                  🙋‍♂️ 남성
                </button>
                <button
                  onClick={() => setGender('female')}
                  className={`py-2.5 rounded-xl font-medium text-sm transition-all ${
                    gender === 'female'
                      ? 'bg-pink-500 text-white'
                      : 'bg-pink-500/10 text-pink-400 border border-pink-500/30 hover:bg-pink-500/20'
                  }`}
                >
                  🙋‍♀️ 여성
                </button>
              </div>
              {error && <p className="text-red-400 text-xs text-center">{error}</p>}
              <button
                onClick={handleCheckin}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold transition-colors disabled:opacity-50"
              >
                {loading ? '처리 중...' : '🍺 체크인하기'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
