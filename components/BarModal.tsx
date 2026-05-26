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

// ── 색상 팔레트 (보드게임 스타일) ──
const C = {
  bg:        'linear-gradient(160deg, #f9f1d8 0%, #f0e0a8 55%, #e6d08a 100%)',
  border:    '#7a4f10',
  borderLight: 'rgba(122,79,16,0.3)',
  text:      '#3a1c00',
  textMid:   '#7a4f10',
  textMuted: 'rgba(90,48,16,0.55)',
  gold:      '#c8952a',
  male:      '#2a4e7a',
  maleBg:    'rgba(42,78,122,0.1)',
  maleBorder:'rgba(42,78,122,0.3)',
  female:    '#7a2848',
  femaleBg:  'rgba(122,40,72,0.1)',
  femaleBorder:'rgba(122,40,72,0.3)',
  green:     '#2d6a4a',
  greenBg:   'rgba(45,106,74,0.1)',
  greenBorder:'rgba(45,106,74,0.3)',
  amber:     '#b5730a',
  amberBg:   'rgba(181,115,10,0.1)',
  amberBorder:'rgba(181,115,10,0.3)',
  scrollRoller: 'linear-gradient(180deg,#e8c060 0%,#c8952a 48%,#e8c060 100%)',
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
          style={{ color: (hovered || value) >= s ? C.gold : 'rgba(90,48,16,0.2)' }}
        >★</button>
      ))}
    </div>
  );
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span className="text-sm">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} style={{ color: rating >= s ? C.gold : 'rgba(90,48,16,0.2)' }}>★</span>
      ))}
    </span>
  );
}

// ── 스크롤 장식 구분선 ──
function Divider() {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, transparent, ${C.borderLight})` }} />
      <div className="w-1.5 h-1.5 rotate-45" style={{ background: C.gold }} />
      <div className="flex-1 h-px" style={{ background: `linear-gradient(to left, transparent, ${C.borderLight})` }} />
    </div>
  );
}

export default function BarModal({ bar, onClose, activeCheckin, onCheckin, onCheckout }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<'status' | 'reviews'>('status');

  // 로그인 유저면 이름 자동 세팅
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

  const occupancyColor = occupancy < 40 ? C.green : occupancy < 70 ? C.amber : '#a0332b';
  const occupancyBg    = occupancy < 40 ? C.greenBg : occupancy < 70 ? C.amberBg : 'rgba(160,51,43,0.1)';

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      {/* 배경 오버레이 */}
      <div className="absolute inset-0" style={{ background: 'rgba(60,30,5,0.55)', backdropFilter: 'blur(4px)' }} />

      {/* 모달 본체 */}
      <div
        className="relative w-full max-w-md overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
        style={{
          background: C.bg,
          border: `3px solid ${C.border}`,
          borderRadius: '6px',
          boxShadow: `4px 6px 24px rgba(40,20,0,0.5), inset 0 1px 0 rgba(255,255,255,0.55), 0 0 0 1px ${C.gold}55`,
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 스크롤 롤러 장식 */}
        <div className="absolute top-0 left-0 right-0 h-[6px]" style={{ background: `linear-gradient(90deg, ${C.border}, ${C.gold}, ${C.border})` }} />

        {/* ── 헤더 ── */}
        <div className="px-5 pt-6 pb-3 flex-shrink-0" style={{ borderBottom: `1.5px solid ${C.borderLight}` }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold leading-tight" style={{ color: C.text }}>{bar.name}</h2>
              <p className="text-xs mt-0.5 truncate italic" style={{ color: C.textMuted }}>📍 {bar.address}</p>
            </div>
            <button
              onClick={onClose}
              className="text-2xl leading-none mt-0.5 flex-shrink-0 transition-opacity hover:opacity-60"
              style={{ color: C.textMid }}
            >×</button>
          </div>

          {/* 태그 */}
          {bar.tags.length > 0 && (
            <div className="flex gap-1.5 mt-2.5 flex-wrap">
              {bar.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5"
                  style={{
                    background: 'rgba(122,79,16,0.1)',
                    border: `1px solid ${C.borderLight}`,
                    borderRadius: '3px',
                    color: C.textMid,
                  }}
                >{tag}</span>
              ))}
            </div>
          )}

          {/* 탭 */}
          <div className="flex gap-1 mt-3 p-1" style={{ background: 'rgba(122,79,16,0.08)', borderRadius: '4px', border: `1px solid ${C.borderLight}` }}>
            {(['status', 'reviews'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 py-1.5 text-sm font-bold transition-all flex items-center justify-center gap-1.5"
                style={{
                  borderRadius: '3px',
                  background: tab === t ? C.gold : 'transparent',
                  color: tab === t ? '#fff' : C.textMid,
                  boxShadow: tab === t ? `1px 2px 4px rgba(0,0,0,0.2)` : 'none',
                  fontFamily: "Georgia, serif",
                }}
              >
                {t === 'status' ? '📊 현황' : '✍️ 리뷰'}
                {t === 'reviews' && reviews.length > 0 && tab !== 'reviews' && (
                  <span className="text-xs px-1.5 rounded-full" style={{ background: `${C.gold}33`, color: C.gold }}>
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
                  { label: '남성 🙋‍♂️', value: bar.stats.male, color: C.male, bg: C.maleBg, border: C.maleBorder },
                  { label: '여성 🙋‍♀️', value: bar.stats.female, color: C.female, bg: C.femaleBg, border: C.femaleBorder },
                  { label: '총 인원', value: total, color: C.textMid, bg: 'rgba(122,79,16,0.08)', border: C.borderLight },
                ].map(({ label, value, color, bg, border }) => (
                  <div key={label} className="p-3 text-center" style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: '4px' }}>
                    <div className="text-2xl font-bold" style={{ color }}>{value}</div>
                    <div className="text-xs mt-0.5" style={{ color: C.textMuted }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* 혼잡도 바 */}
              <div>
                <div className="flex justify-between text-xs mb-1.5" style={{ color: C.textMuted }}>
                  <span>혼잡도</span>
                  <span style={{ color: occupancyColor, fontWeight: 700 }}>{occupancy}% ({total}/{bar.capacity}명)</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(122,79,16,0.15)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(occupancy, 100)}%`, background: occupancyColor, boxShadow: `0 0 6px ${occupancyBg}` }}
                  />
                </div>
              </div>

              <Divider />

              {/* 기본 정보 */}
              <div className="space-y-2">
                {[
                  { icon: '🕐', text: bar.openHours },
                  { icon: '👤', text: `사장님: ${bar.ownerName}` },
                  { icon: '💬', text: bar.description },
                ].map(({ icon, text }) => (
                  <div key={icon} className="flex gap-2 text-sm" style={{ color: C.textMuted }}>
                    <span>{icon}</span><span>{text}</span>
                  </div>
                ))}

                {/* 인스타그램 */}
                {bar.instagram && (
                  <a
                    href={`https://instagram.com/${bar.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm transition-opacity hover:opacity-75"
                    style={{ color: C.textMuted, textDecoration: 'none' }}
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
                    <span className="text-xs" style={{ color: C.borderLight, WebkitTextFillColor: C.borderLight }}>↗</span>
                  </a>
                )}
              </div>

              <Divider />

              {/* ── 체크인 영역 ── */}
              {isCheckedInHere ? (
                <div className="space-y-2">
                  <div className="p-3 text-center" style={{ background: C.greenBg, border: `1.5px solid ${C.greenBorder}`, borderRadius: '4px' }}>
                    <p className="text-sm font-bold" style={{ color: C.green }}>
                      {activeCheckin!.gender === 'male' ? '🙋‍♂️' : '🙋‍♀️'} {activeCheckin!.nickname}님 탐방 중!
                    </p>
                  </div>
                  <button
                    onClick={handleCheckout}
                    disabled={checkinLoading}
                    className="w-full py-2.5 font-bold text-sm transition-all disabled:opacity-50"
                    style={{
                      background: 'rgba(122,79,16,0.1)',
                      border: `2px solid ${C.border}`,
                      borderRadius: '4px',
                      color: C.text,
                    }}
                  >
                    {checkinLoading ? '처리 중...' : '🚪 귀가하기'}
                  </button>
                </div>
              ) : isCheckedInElsewhere ? (
                <div className="p-3 text-center" style={{ background: C.amberBg, border: `1.5px solid ${C.amberBorder}`, borderRadius: '4px' }}>
                  <p className="text-sm" style={{ color: C.amber }}>다른 바에 탐방 중입니다. 먼저 귀가해주세요.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-bold" style={{ color: C.textMid }}>🍺 이 바에 체크인하기</p>

                  {/* 로그인 유저면 이름 뱃지, 비로그인이면 입력 필드 */}
                  {user ? (
                    <div className="flex items-center gap-2 px-4 py-2.5"
                      style={{ background: 'rgba(255,248,230,0.8)', border: `1.5px solid ${C.borderLight}`, borderRadius: '4px' }}>
                      <span className="text-base">👤</span>
                      <span className="text-sm font-bold" style={{ color: C.text }}>{userNickname}</span>
                      <span className="text-xs italic ml-auto" style={{ color: C.textMuted }}>카카오 계정</span>
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
                        background: 'rgba(255,248,230,0.8)',
                        border: `1.5px solid ${C.borderLight}`,
                        borderRadius: '4px',
                        color: C.text,
                        fontFamily: "Georgia, serif",
                      }}
                    />
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {(['male', 'female'] as const).map((g) => (
                      <button
                        key={g}
                        onClick={() => setGender(g)}
                        className="py-2.5 font-bold text-sm transition-all"
                        style={{
                          background: gender === g
                            ? (g === 'male' ? C.male : C.female)
                            : (g === 'male' ? C.maleBg : C.femaleBg),
                          border: `1.5px solid ${g === 'male' ? C.maleBorder : C.femaleBorder}`,
                          borderRadius: '4px',
                          color: gender === g ? '#fff' : (g === 'male' ? C.male : C.female),
                        }}
                      >
                        {g === 'male' ? '🙋‍♂️ 남성' : '🙋‍♀️ 여성'}
                      </button>
                    ))}
                  </div>
                  {checkinError && <p className="text-xs text-center" style={{ color: '#a0332b' }}>{checkinError}</p>}
                  <button
                    onClick={handleCheckin}
                    disabled={checkinLoading}
                    className="w-full py-3 font-bold text-sm transition-all disabled:opacity-50"
                    style={{
                      background: `linear-gradient(135deg, ${C.gold}, #b5730a)`,
                      border: `2px solid ${C.border}`,
                      borderRadius: '4px',
                      color: '#fff',
                      boxShadow: '2px 3px 6px rgba(60,30,0,0.25)',
                      fontFamily: "Georgia, serif",
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
                  <div className="p-4 text-center" style={{ background: C.greenBg, border: `1.5px solid ${C.greenBorder}`, borderRadius: '4px' }}>
                    <div className="text-2xl mb-1">🎉</div>
                    <p className="text-sm font-bold" style={{ color: C.green }}>리뷰가 등록되었습니다!</p>
                    <button
                      onClick={() => setReviewSuccess(false)}
                      className="mt-2 text-xs"
                      style={{ color: C.textMuted }}
                    >다시 작성</button>
                  </div>
                ) : (
                  <div className="p-4 space-y-3" style={{ background: 'rgba(255,248,230,0.6)', border: `1.5px solid ${C.borderLight}`, borderRadius: '4px' }}>
                    <p className="text-sm font-bold" style={{ color: C.textMid }}>✍️ 방문 후기 남기기</p>
                    <StarPicker value={rating} onChange={setRating} />
                    <textarea
                      placeholder="이 바는 어떠셨나요? (5자 이상)"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      maxLength={200}
                      rows={3}
                      className="w-full px-3 py-2.5 text-sm focus:outline-none resize-none"
                      style={{
                        background: 'rgba(255,248,230,0.9)',
                        border: `1.5px solid ${C.borderLight}`,
                        borderRadius: '4px',
                        color: C.text,
                        fontFamily: "Georgia, serif",
                      }}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: C.textMuted }}>{content.length}/200</span>
                      {reviewError && <span className="text-xs" style={{ color: '#a0332b' }}>{reviewError}</span>}
                      <button
                        onClick={handleReviewSubmit}
                        disabled={reviewLoading}
                        className="px-4 py-1.5 text-sm font-bold transition-all disabled:opacity-50"
                        style={{
                          background: `linear-gradient(135deg, ${C.gold}, #b5730a)`,
                          border: `1.5px solid ${C.border}`,
                          borderRadius: '3px',
                          color: '#fff',
                          boxShadow: '1px 2px 4px rgba(60,30,0,0.2)',
                        }}
                      >
                        {reviewLoading ? '등록 중...' : '등록'}
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="p-4 text-center space-y-2" style={{ background: 'rgba(255,248,230,0.6)', border: `1.5px solid ${C.borderLight}`, borderRadius: '4px' }}>
                  <p className="text-sm" style={{ color: C.textMuted }}>로그인하면 후기를 남길 수 있어요</p>
                  <button
                    onClick={() => router.push('/login')}
                    className="px-4 py-1.5 text-sm font-bold"
                    style={{
                      background: C.amberBg,
                      border: `1.5px solid ${C.amberBorder}`,
                      borderRadius: '3px',
                      color: C.amber,
                    }}
                  >로그인하기</button>
                </div>
              )}

              {/* 리뷰 목록 */}
              {reviewsLoading ? (
                <div className="text-center py-6 text-sm" style={{ color: C.textMuted }}>후기 불러오는 중...</div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <div className="text-3xl">📜</div>
                  <p className="text-sm" style={{ color: C.textMuted }}>아직 후기가 없어요</p>
                  <p className="text-xs" style={{ color: 'rgba(90,48,16,0.35)' }}>첫 번째 탐방기를 남겨보세요!</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {/* 평균 별점 */}
                  <div className="flex items-center gap-2 pb-2" style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                    <span className="text-2xl font-black" style={{ color: C.gold }}>{avgRating.toFixed(1)}</span>
                    <StarDisplay rating={Math.round(avgRating)} />
                    <span className="text-xs" style={{ color: C.textMuted }}>({reviews.length}개)</span>
                  </div>

                  {reviews.map((review) => (
                    <div key={review.id} className="py-3" style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold" style={{ color: C.text }}>{review.nickname}</span>
                          <StarDisplay rating={review.rating} />
                        </div>
                        <span className="text-xs" style={{ color: C.textMuted }}>
                          {new Date(review.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: 'rgba(90,48,16,0.75)' }}>{review.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 하단 롤러 장식 */}
        <div className="h-[5px] flex-shrink-0" style={{ background: `linear-gradient(90deg, ${C.border}, ${C.gold}, ${C.border})` }} />
      </div>
    </div>
  );
}
