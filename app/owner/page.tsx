'use client';

import { useState } from 'react';
import Link from 'next/link';

const SEOUL_AREAS = [
  { name: '홍대', lat: 37.5522, lng: 126.9230 },
  { name: '이태원', lat: 37.5347, lng: 126.9945 },
  { name: '강남', lat: 37.5029, lng: 127.0244 },
  { name: '신촌', lat: 37.5596, lng: 126.9369 },
  { name: '합정', lat: 37.5494, lng: 126.9143 },
  { name: '종로', lat: 37.5701, lng: 126.9914 },
  { name: '건대', lat: 37.5407, lng: 127.0696 },
  { name: '성수', lat: 37.5443, lng: 127.0557 },
  { name: '마포', lat: 37.5538, lng: 126.9081 },
  { name: '서울숲', lat: 37.5446, lng: 127.0374 },
];

const TAG_OPTIONS = ['와인', '위스키', '맥주', '칵테일', '전통주', '내추럴와인', '소규모', '조용한', '활기찬', '바좌석', '안주', '가성비', '프리미엄', '시가'];

export default function OwnerPage() {
  const [form, setForm] = useState({
    name: '',
    address: '',
    lat: '',
    lng: '',
    description: '',
    capacity: '',
    ownerName: '',
    openHours: '18:00 - 02:00',
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedArea, setSelectedArea] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  function handleAreaSelect(area: typeof SEOUL_AREAS[0]) {
    setSelectedArea(area.name);
    setForm((f) => ({ ...f, lat: String(area.lat), lng: String(area.lng) }));
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.address || !form.lat || !form.lng || !form.ownerName) {
      return setError('필수 항목을 모두 입력해주세요');
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, tags: selectedTags }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setSuccess(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0d0d14] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-6xl">🍺</div>
          <h2 className="text-2xl font-bold text-amber-400">등록 완료!</h2>
          <p className="text-white/50">가게가 지도에 추가되었습니다.</p>
          <Link href="/" className="block mt-6 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-colors">
            지도로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d14] text-white">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="text-white/40 hover:text-white transition-colors">←</Link>
          <div>
            <h1 className="text-xl font-black text-amber-400">사장님 가게 등록</h1>
            <p className="text-xs text-white/40">혼술바를 지도에 등록하세요</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 기본 정보 */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">기본 정보</h2>
            <div>
              <label className="text-xs text-white/50 mb-1 block">가게 이름 *</label>
              <input
                type="text"
                placeholder="예: 혼술공간 홍대점"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">도로명 주소 *</label>
              <input
                type="text"
                placeholder="예: 서울 마포구 어울마당로 31"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">사장님 이름 *</label>
              <input
                type="text"
                placeholder="예: 김혼술"
                value={form.ownerName}
                onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50 text-sm"
              />
            </div>
          </section>

          {/* 위치 */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">위치 선택 *</h2>
            <div className="grid grid-cols-5 gap-2">
              {SEOUL_AREAS.map((area) => (
                <button
                  key={area.name}
                  type="button"
                  onClick={() => handleAreaSelect(area)}
                  className={`py-2 rounded-xl text-xs font-medium transition-all ${
                    selectedArea === area.name
                      ? 'bg-amber-500 text-black'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {area.name}
                </button>
              ))}
            </div>
            {selectedArea && (
              <p className="text-xs text-white/40 text-center">
                📍 {selectedArea} ({form.lat}, {form.lng})
              </p>
            )}
          </section>

          {/* 운영 정보 */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">운영 정보</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">수용 인원</label>
                <input
                  type="number"
                  placeholder="20"
                  min="1"
                  max="100"
                  value={form.capacity}
                  onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">영업시간</label>
                <input
                  type="text"
                  placeholder="18:00 - 02:00"
                  value={form.openHours}
                  onChange={(e) => setForm((f) => ({ ...f, openHours: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">가게 소개</label>
              <textarea
                placeholder="혼술족들에게 한 마디..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50 text-sm resize-none"
              />
            </div>
          </section>

          {/* 태그 */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">분위기 태그</h2>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedTags.includes(tag)
                      ? 'bg-amber-500/30 text-amber-400 border border-amber-500/50'
                      : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </section>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-base transition-colors disabled:opacity-50"
          >
            {loading ? '등록 중...' : '🍺 지도에 등록하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
