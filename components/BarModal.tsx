'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import { getAccessToken } from '@/lib/auth';

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

interface Review {
  id: string;
  nickname: string;
  rating: number;
  content: string;
  created_at: string;
}

interface Props {
  bar: BarWithStats;
  onClose: () => void;
  activeCheckin: ActiveCheckin | null;
  onCheckin: (checkinId: string, barId: string, nickname: string, gender: string) => void;
  onCheckout: () => void;
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(s)}
          className="text-2xl transition-transform hover:scale-110"
        >
          <span className={(hovered || value) >= s ? 'text-amber-400' : 'text-white/20'}>★</span>
        </button>
      ))}
    </div>
  );
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span className="text-sm">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={rating >= s ? 'text-amber-400' : 'text-white/20'}>★</span>
      ))}
    </span>
  );
}

export default function BarModal({ bar, onClose, activeCheckin, onCheckin, onCheckout }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<'status' | 'reviews'>('status');

  // 체크인 상태
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinError, setCheckinError] = useState('');

  // 리뷰 상태
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const total = bar.stats.male + bar.stats.female;
  const occupancy = bar.capacity > 0 ? Math.round((total / bar.capacity) * 100) : 0;
  const isCheckedInHere = activeCheckin?.barId === bar.id;
  const isCheckedInElsewhere = activeCheckin && activeCheckin.barId !== bar.id;

  const fetchReviews = useCallback(async () => {
    setReviewsLoading(true);
    try {
      const res = await fetch(`/api/reviews?barId=${bar.id}`);
      const data = await res.json();
      setReviews(Array.isArray(data) ? data : []);
    } catch {
      /* ignore */
    } finally {
      setReviewsLoading(false);
    }
  }, [bar.id]);

  useEffect(() => {
    if (tab === 'reviews') fetchReviews();
  }, [tab, fetchReviews]);

  async function handleCheckin() {
    if (!nickname.trim()) return setCheckinError('닉네임을 입력해주세요');
    if (!gender) return setCheckinError('성별을 선택해주세요');
    setCheckinLoading(true); setCheckinError('');
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
      setCheckinError(e instanceof Error ? e.message : '오류가 발생했습니다');
    } finally {
      setCheckinLoading(false);
    }
  }

  async function handleCheckout() {
    if (!activeCheckin) return;
    setCheckinLoading(true);
    try {
      await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkinId: activeCheckin.checkinId }),
      });
      onCheckout();
    } finally {
      setCheckinLoading(false);
    }
  }

  async function handleReviewSubmit() {
    if (!rating) return setReviewError('별점을 선택해주세요');
    if (content.trim().length < 5) return setReviewError('리뷰를 5자 이상 작성해주세요');
    setReviewLoading(true); setReviewError('');
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ barId: bar.id, rating, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReviewSuccess(true);
      setRating(0); setContent('');
      fetchReviews();
    } catch (e: unknown) {
      setReviewError(e instanceof Error ? e.message : '오류가 발생했습니다');
    } finally {
      setReviewLoading(false);
    }
  }

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-[#1a1a2e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 헤더 ── */}
        <div className="px-5 pt-5 pb-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white leading-tight">{bar.name}</h2>
              <p className="text-xs text-white/40 mt-0.5 truncate">{bar.address}</p>
            </div>
            <button onClick={onClose} className="text-white/40 hover:text-white text-2xl leading-none mt-0.5 flex-shrink-0">×</button>
          </div>
          <div className="flex gap-1.5 mt-2.5 flex-wrap">
            {bar.tags.map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">{tag}</span>
            ))}
          </div>

          {/* 탭 */}
          <div className="flex gap-0 mt-3 bg-white/5 rounded-xl p-1">
            <button
              onClick={() => setTab('status')}
              className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                tab === 'status' ? 'bg-amber-500 text-black' : 'text-white/50 hover:text-white/70'
              }`}
            >
              현황
            </button>
            <button
              onClick={() => setTab('reviews')}
              className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                tab === 'reviews' ? 'bg-amber-500 text-black' : 'text-white/50 hover:text-white/70'
              }`}
            >
              리뷰
              {reviews.length > 0 && tab !== 'reviews' && (
                <span className="bg-amber-500/30 text-amber-400 text-xs px-1.5 rounded-full">{reviews.length}</span>
              )}
            </button>
          </div>
        </div>

        {/* ── 콘텐츠 (스크롤 가능) ── */}
        <div className="overflow-y-auto flex-1">
          {tab === 'status' && (
            <div className="px-5 py-4 space-y-4">
              {/* 남녀 현황 */}
              <div className="grid grid-cols-3 gap-2">
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

              {/* 혼잡도 바 */}
              <div>
                <div className="flex justify-between text-xs text-white/40 mb-1">
                  <span>혼잡도</span>
                  <span>{occupancy}% ({total}/{bar.capacity}명)</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      occupancy < 40 ? 'bg-emerald-400' : occupancy < 70 ? 'bg-amber-400' : 'bg-rose-400'
                    }`}
                    style={{ width: `${Math.min(occupancy, 100)}%` }}
                  />
                </div>
              </div>

              {/* 기본 정보 */}
              <div className="text-sm text-white/50 space-y-1.5">
                <div className="flex gap-2"><span>🕐</span><span>{bar.openHours}</span></div>
                <div className="flex gap-2"><span>👤</span><span>사장님: {bar.ownerName}</span></div>
                <div className="flex gap-2"><span>💬</span><span>{bar.description}</span></div>
              </div>

              {/* 체크인 / 체크아웃 */}
              {isCheckedInHere ? (
                <div className="space-y-2">
                  <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-xl p-3 text-center">
                    <p className="text-emerald-400 text-sm font-medium">
                      {activeCheckin!.gender === 'male' ? '🙋‍♂️' : '🙋‍♀️'} {activeCheckin!.nickname}님 체크인 중
                    </p>
                  </div>
                  <button
                    onClick={handleCheckout}
                    disabled={checkinLoading}
                    className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition-colors disabled:opacity-50"
                  >
                    {checkinLoading ? '처리 중...' : '🚪 체크아웃'}
                  </button>
                </div>
              ) : isCheckedInElsewhere ? (
                <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-3 text-center">
                  <p className="text-amber-400 text-sm">다른 바에 체크인 중입니다. 먼저 체크아웃 해주세요.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="닉네임 입력"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    maxLength={10}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    {(['male', 'female'] as const).map((g) => (
                      <button
                        key={g}
                        onClick={() => setGender(g)}
                        className={`py-2.5 rounded-xl font-medium text-sm transition-all ${
                          gender === g
                            ? g === 'male' ? 'bg-blue-500 text-white' : 'bg-pink-500 text-white'
                            : g === 'male'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20'
                              : 'bg-pink-500/10 text-pink-400 border border-pink-500/30 hover:bg-pink-500/20'
                        }`}
                      >
                        {g === 'male' ? '🙋‍♂️ 남성' : '🙋‍♀️ 여성'}
                      </button>
                    ))}
                  </div>
                  {checkinError && <p className="text-red-400 text-xs text-center">{checkinError}</p>}
                  <button
                    onClick={handleCheckin}
                    disabled={checkinLoading}
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold transition-colors disabled:opacity-50"
                  >
                    {checkinLoading ? '처리 중...' : '🍺 체크인하기'}
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === 'reviews' && (
            <div className="px-5 py-4 space-y-4">
              {/* 리뷰 쓰기 */}
              {user ? (
                reviewSuccess ? (
                  <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-xl p-4 text-center">
                    <div className="text-2xl mb-1">🎉</div>
                    <p className="text-emerald-400 text-sm font-medium">리뷰가 등록되었습니다!</p>
                    <button
                      onClick={() => setReviewSuccess(false)}
                      className="mt-2 text-xs text-white/40 hover:text-white/60"
                    >
                      다시 작성
                    </button>
                  </div>
                ) : (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                    <p className="text-sm font-semibold text-white/80">리뷰 작성</p>
                    <StarPicker value={rating} onChange={setRating} />
                    <textarea
                      placeholder="이 바는 어떠셨나요? (5자 이상)"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      maxLength={200}
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50 text-sm resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/30">{content.length}/200</span>
                      {reviewError && <span className="text-red-400 text-xs">{reviewError}</span>}
                      <button
                        onClick={handleReviewSubmit}
                        disabled={reviewLoading}
                        className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold transition-colors disabled:opacity-50"
                      >
                        {reviewLoading ? '등록 중...' : '등록'}
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center space-y-2">
                  <p className="text-white/50 text-sm">로그인하면 리뷰를 작성할 수 있어요</p>
                  <button
                    onClick={() => router.push('/login')}
                    className="px-4 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-sm font-semibold border border-amber-500/30 transition-colors"
                  >
                    로그인하기
                  </button>
                </div>
              )}

              {/* 리뷰 목록 */}
              {reviewsLoading ? (
                <div className="text-center py-6 text-white/30 text-sm">리뷰 불러오는 중...</div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <div className="text-3xl">🍺</div>
                  <p className="text-white/30 text-sm">아직 리뷰가 없어요</p>
                  <p className="text-white/20 text-xs">첫 번째 리뷰를 남겨보세요!</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {/* 평균 별점 */}
                  <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                    <span className="text-2xl font-black text-amber-400">{avgRating.toFixed(1)}</span>
                    <StarDisplay rating={Math.round(avgRating)} />
                    <span className="text-xs text-white/30">({reviews.length}개)</span>
                  </div>

                  {reviews.map((review) => (
                    <div key={review.id} className="py-3 border-b border-white/5 last:border-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white/80">{review.nickname}</span>
                          <StarDisplay rating={review.rating} />
                        </div>
                        <span className="text-xs text-white/25">
                          {new Date(review.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-sm text-white/60 leading-relaxed">{review.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
