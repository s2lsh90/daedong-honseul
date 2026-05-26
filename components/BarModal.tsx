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
  instagram?: string;
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

// ── 다크 테마 색상 팔레트 ──────────────────────────────────────────────
const D = {
  bg:           'rgba(10,10,24,0.97)',
  surface:      'rgba(255,255,255,0.04)',
  surfaceHover: 'rgba(255,255,255,0.07)',
  border:       'rgba(255,255,255,0.08)',
  borderAccent: 'rgba(79,195,247,0.3)',
  text:         'rgba(255,255,255,0.9)',
  textSub:      'rgba(255,255,255,0.55)',
  textMuted:    'rgba(255,255,255,0.3)',
  cyan:         '#4fc3f7',
  cyanBg:       'rgba(79,195,247,0.1)',
  cyanBorder:   'rgba(79,195,247,0.25)',
  blue:         '#90cdf4',
  blueBg:       'rgba(144,205,244,0.1)',
  blueBorder:   'rgba(144,205,244,0.25)',
  pink:         '#f9a8d4',
  pinkBg:       'rgba(249,168,212,0.1)',
  pinkBorder:   'rgba(249,168,212,0.25)',
  green:        '#4ade80',
  greenBg:      'rgba(74,222,128,0.08)',
  greenBorder:  'rgba(74,222,128,0.25)',
  amber:        '#fb923c',
  amberBg:      'rgba(251,146,60,0.08)',
  amberBorder:  'rgba(251,146,60,0.25)',
  red:          '#f87171',
  redBg:        'rgba(248,113,113,0.08)',
  redBorder:    'rgba(248,113,113,0.25)',
  gold:         '#fbbf24',
};

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
          style={{ color: (hovered || value) >= s ? D.gold : 'rgba(255,255,255,0.15)' }}
        >★</button>
      ))}
    </div>
  );
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span className="text-sm">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} style={{ color: rating >= s ? D.gold : 'rgba(255,255,255,0.15)' }}>★</span>
      ))}
    </span>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
    </div>
  );
}

export default function BarModal({ bar, onClose, activeCheckin, onCheckin, onCheckout }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<'status' | 'reviews'>('status');

  const userNickname =
    (user?.user_metadata?.name as string) ||
    (user?.user_metadata?.full_name as string) ||
    (user?.user_metadata?.nickname as string) ||
    user?.email?.split('@')[0] || '';

  const [nickname, setNickname] = useState(userNickname);
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinError, setCheckinError] = useState('');

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

  const occColor  = occupancy < 40 ? D.green  : occupancy < 70 ? D.amber  : D.red;
  const occBg     = occupancy < 40 ? D.greenBg : occupancy < 70 ? D.amberBg : D.redBg;
  const occBorder = occupancy < 40 ? D.greenBorder : occupancy < 70 ? D.amberBorder : D.redBorder;

  const fetchReviews = useCallback(async () => {
    setReviewsLoading(true);
    try {
      const res = await fetch(`/api/reviews?barId=${bar.id}`);
      const data = await res.json();
      setReviews(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    finally { setReviewsLoading(false); }
  }, [bar.id]);

  useEffect(() => { if (tab === 'reviews') fetchReviews(); }, [tab, fetchReviews]);

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
    } finally { setCheckinLoading(false); }
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
    } finally { setCheckinLoading(false); }
  }

  async function handleReviewSubmit() {
    if (!rating) return setReviewError('별점을 선택해주세요');
    if (content.trim().length < 5) return setReviewError('리뷰를 5자 이상 작성해주세요');
    setReviewLoading(true); setReviewError('');
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ barId: bar.id, rating, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReviewSuccess(true);
      setRating(0); setContent('');
      fetchReviews();
    } catch (e: unknown) {
      setReviewError(e instanceof Error ? e.message : '오류가 발생했습니다');
    } finally { setReviewLoading(false); }
  }

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      />

      {/* 모달 본체 */}
      <div
        className="relative w-full max-w-md overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
        style={{
          background: D.bg,
          border: `1px solid ${D.borderAccent}`,
          borderRadius: '16px',
          boxShadow: '0 0 60px rgba(79,195,247,0.08), 0 24px 80px rgba(0,0,0,0.8)',
          fontFamily: font,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 액센트 라인 */}
        <div
          className="absolute top-0 left-0 right-0 h-[1px]"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(79,195,247,0.6), transparent)' }}
        />

        {/* ── 헤더 ── */}
        <div
          className="px-5 pt-5 pb-4 flex-shrink-0"
          style={{ borderBottom: `1px solid ${D.border}` }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold leading-tight" style={{ color: D.text }}>
                {bar.name}
              </h2>
              <p className="text-xs mt-0.5 truncate" style={{ color: D.textMuted }}>
                📍 {bar.address}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-xl leading-none mt-0.5 flex-shrink-0 transition-opacity hover:opacity-60"
              style={{ color: D.textSub }}
            >×</button>
          </div>

          {/* 태그 */}
          {bar.tags.length > 0 && (
            <div className="flex gap-1.5 mt-3 flex-wrap">
              {bar.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5"
                  style={{
                    background: D.surface,
                    border: `1px solid ${D.border}`,
                    borderRadius: '4px',
                    color: D.textSub,
                  }}
                >{tag}</span>
              ))}
            </div>
          )}

          {/* 탭 */}
          <div
            className="flex gap-1 mt-3 p-1"
            style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: `1px solid ${D.border}` }}
          >
            {(['status', 'reviews'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 py-1.5 text-sm font-semibold transition-all flex items-center justify-center gap-1.5"
                style={{
                  borderRadius: '6px',
                  background: tab === t ? 'rgba(79,195,247,0.15)' : 'transparent',
                  color: tab === t ? D.cyan : D.textSub,
                  border: tab === t ? `1px solid ${D.cyanBorder}` : '1px solid transparent',
                }}
              >
                {t === 'status' ? '📊 현황' : '✍️ 리뷰'}
                {t === 'reviews' && reviews.length > 0 && tab !== 'reviews' && (
                  <span
                    className="text-xs px-1.5 rounded-full"
                    style={{ background: D.cyanBg, color: D.cyan }}
                  >
                    {reviews.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── 콘텐츠 ── */}
        <div className="overflow-y-auto flex-1">

          {/* ── 현황 탭 ── */}
          {tab === 'status' && (
            <div className="px-5 py-4 space-y-4">

              {/* 남녀 현황 카드 */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '남성 🙋‍♂️', value: bar.stats.male, color: D.blue, bg: D.blueBg, border: D.blueBorder },
                  { label: '여성 🙋‍♀️', value: bar.stats.female, color: D.pink, bg: D.pinkBg, border: D.pinkBorder },
                  { label: '총 인원', value: total, color: D.textSub, bg: D.surface, border: D.border },
                ].map(({ label, value, color, bg, border }) => (
                  <div
                    key={label}
                    className="p-3 text-center"
                    style={{ background: bg, border: `1px solid ${border}`, borderRadius: '10px' }}
                  >
                    <div className="text-2xl font-bold" style={{ color }}>{value}</div>
                    <div className="text-xs mt-0.5" style={{ color: D.textMuted }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* 혼잡도 바 */}
              <div>
                <div className="flex justify-between text-xs mb-1.5" style={{ color: D.textMuted }}>
                  <span>혼잡도</span>
                  <span style={{ color: occColor, fontWeight: 700 }}>
                    {occupancy}% ({total}/{bar.capacity}명)
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(occupancy, 100)}%`,
                      background: occColor,
                      boxShadow: `0 0 8px ${occBg}`,
                    }}
                  />
                </div>
              </div>

              <Divider />

              {/* 기본 정보 */}
              <div className="space-y-2.5">
                {[
                  { icon: '🕐', text: bar.openHours },
                  { icon: '👤', text: `사장님 · ${bar.ownerName}` },
                  { icon: '💬', text: bar.description },
                ].map(({ icon, text }) => (
                  <div key={icon} className="flex gap-2.5 text-sm" style={{ color: D.textSub }}>
                    <span className="flex-shrink-0">{icon}</span>
                    <span style={{ lineHeight: '1.5' }}>{text}</span>
                  </div>
                ))}

                {/* 인스타그램 */}
                {bar.instagram && (
                  <a
                    href={`https://instagram.com/${bar.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm transition-opacity hover:opacity-75"
                    style={{ textDecoration: 'none' }}
                  >
                    <span>📸</span>
                    <span
                      className="font-semibold"
                      style={{
                        background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      @{bar.instagram}
                    </span>
                    <span style={{ color: D.textMuted, fontSize: '12px' }}>↗</span>
                  </a>
                )}
              </div>

              <Divider />

              {/* ── 체크인 영역 ── */}
              {isCheckedInHere ? (
                <div className="space-y-2">
                  <div
                    className="p-3 text-center"
                    style={{ background: D.greenBg, border: `1px solid ${D.greenBorder}`, borderRadius: '10px' }}
                  >
                    <p className="text-sm font-bold" style={{ color: D.green }}>
                      {activeCheckin!.gender === 'male' ? '🙋‍♂️' : '🙋‍♀️'} {activeCheckin!.nickname}님 탐방 중!
                    </p>
                  </div>
                  <button
                    onClick={handleCheckout}
                    disabled={checkinLoading}
                    className="w-full py-2.5 font-semibold text-sm transition-all disabled:opacity-50 hover:opacity-80"
                    style={{
                      background: D.redBg,
                      border: `1px solid ${D.redBorder}`,
                      borderRadius: '10px',
                      color: D.red,
                    }}
                  >
                    {checkinLoading ? '처리 중...' : '🚪 귀가하기'}
                  </button>
                </div>
              ) : isCheckedInElsewhere ? (
                <div
                  className="p-3 text-center"
                  style={{ background: D.amberBg, border: `1px solid ${D.amberBorder}`, borderRadius: '10px' }}
                >
                  <p className="text-sm" style={{ color: D.amber }}>
                    다른 바에 탐방 중입니다. 먼저 귀가해주세요.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold" style={{ color: D.textSub }}>🍺 이 바에 체크인하기</p>

                  {user ? (
                    <div
                      className="flex items-center gap-2 px-4 py-2.5"
                      style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: '10px' }}
                    >
                      <span>👤</span>
                      <span className="text-sm font-semibold" style={{ color: D.text }}>{userNickname}</span>
                      <span className="text-xs ml-auto" style={{ color: D.textMuted }}>카카오 계정</span>
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="닉네임 입력"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      maxLength={10}
                      className="w-full px-4 py-2.5 text-sm focus:outline-none"
                      style={{
                        background: D.surface,
                        border: `1px solid ${D.border}`,
                        borderRadius: '10px',
                        color: D.text,
                        fontFamily: font,
                      }}
                    />
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {(['male', 'female'] as const).map((g) => (
                      <button
                        key={g}
                        onClick={() => setGender(g)}
                        className="py-2.5 font-semibold text-sm transition-all hover:opacity-80"
                        style={{
                          background: gender === g
                            ? (g === 'male' ? D.blueBg : D.pinkBg)
                            : D.surface,
                          border: `1px solid ${gender === g ? (g === 'male' ? D.blueBorder : D.pinkBorder) : D.border}`,
                          borderRadius: '10px',
                          color: gender === g ? (g === 'male' ? D.blue : D.pink) : D.textSub,
                        }}
                      >
                        {g === 'male' ? '🙋‍♂️ 남성' : '🙋‍♀️ 여성'}
                      </button>
                    ))}
                  </div>

                  {checkinError && (
                    <p className="text-xs text-center" style={{ color: D.red }}>{checkinError}</p>
                  )}

                  <button
                    onClick={handleCheckin}
                    disabled={checkinLoading}
                    className="w-full py-3 font-bold text-sm transition-all disabled:opacity-50 hover:opacity-85"
                    style={{
                      background: 'rgba(79,195,247,0.15)',
                      border: `1px solid ${D.cyanBorder}`,
                      borderRadius: '10px',
                      color: D.cyan,
                      boxShadow: '0 0 20px rgba(79,195,247,0.08)',
                    }}
                  >
                    {checkinLoading ? '처리 중...' : '🍺 체크인하기'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── 리뷰 탭 ── */}
          {tab === 'reviews' && (
            <div className="px-5 py-4 space-y-4">

              {/* 리뷰 작성 */}
              {user ? (
                reviewSuccess ? (
                  <div
                    className="p-4 text-center"
                    style={{ background: D.greenBg, border: `1px solid ${D.greenBorder}`, borderRadius: '10px' }}
                  >
                    <div className="text-2xl mb-1">🎉</div>
                    <p className="text-sm font-bold" style={{ color: D.green }}>리뷰가 등록되었습니다!</p>
                    <button
                      onClick={() => setReviewSuccess(false)}
                      className="mt-2 text-xs"
                      style={{ color: D.textMuted }}
                    >다시 작성</button>
                  </div>
                ) : (
                  <div
                    className="p-4 space-y-3"
                    style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: '10px' }}
                  >
                    <p className="text-sm font-semibold" style={{ color: D.textSub }}>✍️ 방문 후기 남기기</p>
                    <StarPicker value={rating} onChange={setRating} />
                    <textarea
                      placeholder="이 바는 어떠셨나요? (5자 이상)"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      maxLength={200}
                      rows={3}
                      className="w-full px-3 py-2.5 text-sm focus:outline-none resize-none"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: `1px solid ${D.border}`,
                        borderRadius: '8px',
                        color: D.text,
                        fontFamily: font,
                      }}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: D.textMuted }}>{content.length}/200</span>
                      {reviewError && (
                        <span className="text-xs" style={{ color: D.red }}>{reviewError}</span>
                      )}
                      <button
                        onClick={handleReviewSubmit}
                        disabled={reviewLoading}
                        className="px-4 py-1.5 text-sm font-semibold transition-all disabled:opacity-50 hover:opacity-80"
                        style={{
                          background: D.cyanBg,
                          border: `1px solid ${D.cyanBorder}`,
                          borderRadius: '6px',
                          color: D.cyan,
                        }}
                      >
                        {reviewLoading ? '등록 중...' : '등록'}
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div
                  className="p-4 text-center space-y-2"
                  style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: '10px' }}
                >
                  <p className="text-sm" style={{ color: D.textSub }}>로그인하면 후기를 남길 수 있어요</p>
                  <button
                    onClick={() => router.push('/login')}
                    className="px-4 py-1.5 text-sm font-semibold hover:opacity-80 transition-all"
                    style={{
                      background: D.cyanBg,
                      border: `1px solid ${D.cyanBorder}`,
                      borderRadius: '6px',
                      color: D.cyan,
                    }}
                  >로그인하기</button>
                </div>
              )}

              {/* 리뷰 목록 */}
              {reviewsLoading ? (
                <div className="text-center py-6 text-sm" style={{ color: D.textMuted }}>
                  후기 불러오는 중...
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <div className="text-3xl">🌙</div>
                  <p className="text-sm" style={{ color: D.textSub }}>아직 후기가 없어요</p>
                  <p className="text-xs" style={{ color: D.textMuted }}>첫 번째 방문기를 남겨보세요!</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div
                    className="flex items-center gap-2 pb-3"
                    style={{ borderBottom: `1px solid ${D.border}` }}
                  >
                    <span className="text-2xl font-black" style={{ color: D.gold }}>
                      {avgRating.toFixed(1)}
                    </span>
                    <StarDisplay rating={Math.round(avgRating)} />
                    <span className="text-xs" style={{ color: D.textMuted }}>({reviews.length}개)</span>
                  </div>

                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="py-3"
                      style={{ borderBottom: `1px solid ${D.border}` }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold" style={{ color: D.text }}>
                            {review.nickname}
                          </span>
                          <StarDisplay rating={review.rating} />
                        </div>
                        <span className="text-xs" style={{ color: D.textMuted }}>
                          {new Date(review.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: D.textSub }}>
                        {review.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 하단 패딩 */}
        <div className="h-2 flex-shrink-0" />
      </div>
    </div>
  );
}
