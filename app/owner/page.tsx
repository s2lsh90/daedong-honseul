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

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  padding: '12px 16px',
  color: 'rgba(255,255,255,0.9)',
  fontSize: '14px',
  outline: 'none',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

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
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: '#08081a', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
      >
        <div className="text-center space-y-4">
          <div className="text-6xl" style={{ filter: 'drop-shadow(0 0 20px rgba(79,195,247,0.4))' }}>🍺</div>
          <h2 className="text-2xl font-bold" style={{ color: '#4fc3f7' }}>등록 완료!</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>가게가 지도에 추가되었습니다.</p>
          <Link
            href="/"
            className="block mt-6 px-6 py-3 font-bold rounded-xl transition-all hover:opacity-80"
            style={{
              background: 'rgba(79,195,247,0.15)',
              border: '1px solid rgba(79,195,247,0.4)',
              color: '#4fc3f7',
            }}
          >
            지도로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: '#08081a', color: 'rgba(255,255,255,0.9)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      {/* 배경 그라디언트 */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(79,195,247,0.04) 0%, transparent 60%)' }}
      />

      <div className="max-w-lg mx-auto px-4 py-8 relative z-10">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/"
            className="transition-colors"
            style={{ color: 'rgba(255,255,255,0.35)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#4fc3f7')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
          >
            ←
          </Link>
          <div>
            <h1 className="text-xl font-black" style={{ color: '#4fc3f7' }}>사장님 가게 등록</h1>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>혼술바를 지도에 등록하세요</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* 기본 정보 */}
          <section
            className="rounded-2xl p-5 space-y-4"
            style={{
              background: 'rgba(10,10,28,0.8)',
              border: '1px solid rgba(255,255,255,0.07)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(79,195,247,0.7)' }}>
              기본 정보
            </h2>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'rgba(255,255,255,0.45)' }}>가게 이름 *</label>
              <input
                type="text"
                placeholder="예: 혼술공간 홍대점"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(79,195,247,0.4)')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'rgba(255,255,255,0.45)' }}>도로명 주소 *</label>
              <input
                type="text"
                placeholder="예: 서울 마포구 어울마당로 31"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(79,195,247,0.4)')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'rgba(255,255,255,0.45)' }}>사장님 이름 *</label>
              <input
                type="text"
                placeholder="예: 김혼술"
                value={form.ownerName}
                onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(79,195,247,0.4)')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>
          </section>

          {/* 위치 */}
          <section
            className="rounded-2xl p-5 space-y-4"
            style={{
              background: 'rgba(10,10,28,0.8)',
              border: '1px solid rgba(255,255,255,0.07)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(79,195,247,0.7)' }}>
              위치 선택 *
            </h2>
            <div className="grid grid-cols-5 gap-2">
              {SEOUL_AREAS.map((area) => (
                <button
                  key={area.name}
                  type="button"
                  onClick={() => handleAreaSelect(area)}
                  className="py-2 rounded-xl text-xs font-medium transition-all"
                  style={
                    selectedArea === area.name
                      ? {
                          background: 'rgba(79,195,247,0.2)',
                          border: '1px solid rgba(79,195,247,0.5)',
                          color: '#4fc3f7',
                        }
                      : {
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          color: 'rgba(255,255,255,0.5)',
                        }
                  }
                >
                  {area.name}
                </button>
              ))}
            </div>
            {selectedArea && (
              <p className="text-xs text-center" style={{ color: 'rgba(79,195,247,0.5)' }}>
                📍 {selectedArea} ({form.lat}, {form.lng})
              </p>
            )}
          </section>

          {/* 운영 정보 */}
          <section
            className="rounded-2xl p-5 space-y-4"
            style={{
              background: 'rgba(10,10,28,0.8)',
              border: '1px solid rgba(255,255,255,0.07)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(79,195,247,0.7)' }}>
              운영 정보
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'rgba(255,255,255,0.45)' }}>수용 인원</label>
                <input
                  type="number"
                  placeholder="20"
                  min="1"
                  max="100"
                  value={form.capacity}
                  onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = 'rgba(79,195,247,0.4)')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'rgba(255,255,255,0.45)' }}>영업시간</label>
                <input
                  type="text"
                  placeholder="18:00 - 02:00"
                  value={form.openHours}
                  onChange={(e) => setForm((f) => ({ ...f, openHours: e.target.value }))}
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = 'rgba(79,195,247,0.4)')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'rgba(255,255,255,0.45)' }}>가게 소개</label>
              <textarea
                placeholder="혼술족들에게 한 마디..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                style={{ ...inputStyle, resize: 'none' }}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(79,195,247,0.4)')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>
          </section>

          {/* 태그 */}
          <section
            className="rounded-2xl p-5 space-y-4"
            style={{
              background: 'rgba(10,10,28,0.8)',
              border: '1px solid rgba(255,255,255,0.07)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(79,195,247,0.7)' }}>
              분위기 태그
            </h2>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={
                    selectedTags.includes(tag)
                      ? {
                          background: 'rgba(79,195,247,0.15)',
                          border: '1px solid rgba(79,195,247,0.45)',
                          color: '#4fc3f7',
                        }
                      : {
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: 'rgba(255,255,255,0.4)',
                        }
                  }
                >
                  {tag}
                </button>
              ))}
            </div>
          </section>

          {error && (
            <p className="text-sm text-center" style={{ color: '#f87171' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl font-black text-base transition-all hover:opacity-85 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'rgba(79,195,247,0.15)',
              border: '1px solid rgba(79,195,247,0.4)',
              color: '#4fc3f7',
              boxShadow: '0 0 30px rgba(79,195,247,0.12)',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            {loading ? '등록 중...' : '🍺 지도에 등록하기'}
          </button>

        </form>
      </div>
    </div>
  );
}
