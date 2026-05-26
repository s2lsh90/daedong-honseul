'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithKakao } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/');
    });
  }, [router]);

  async function handleKakaoLogin() {
    setLoading(true);
    setError('');
    try {
      await signInWithKakao();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '로그인 중 오류가 발생했습니다');
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: '#08081a', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      {/* 배경 별빛 효과 */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(79,195,247,0.06) 0%, transparent 70%)',
        }}
      />

      <div className="w-full max-w-xs text-center space-y-10 relative z-10">

        {/* 로고 */}
        <div className="space-y-3">
          <div className="text-6xl" style={{ filter: 'drop-shadow(0 0 20px rgba(79,195,247,0.4))' }}>🍺</div>
          <h1
            className="text-2xl font-black tracking-tight"
            style={{ color: '#fff' }}
          >
            <span style={{ color: '#4fc3f7' }}>대동</span>혼술지도
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
            서울 혼술바 실시간 남녀 현황
          </p>
        </div>

        {/* 로그인 카드 */}
        <div
          className="rounded-2xl p-6 space-y-5"
          style={{
            background: 'rgba(10,10,28,0.92)',
            border: '1px solid rgba(79,195,247,0.15)',
            boxShadow: '0 0 40px rgba(79,195,247,0.06), 0 20px 60px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* 상단 액센트 라인 */}
          <div
            className="h-px -mx-6 -mt-6 mb-5"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(79,195,247,0.5), transparent)' }}
          />

          <div className="space-y-1">
            <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>로그인</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              로그인하면 방문한 혼술바에 리뷰를 남길 수 있어요
            </p>
          </div>

          <button
            onClick={handleKakaoLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-xl font-bold text-[#191919] text-sm transition-all hover:brightness-95 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: '#FEE500',
              boxShadow: '0 4px 20px rgba(254,229,0,0.25)',
            }}
          >
            {loading ? (
              <span className="animate-spin text-lg">⏳</span>
            ) : (
              <KakaoIcon />
            )}
            {loading ? '연결 중...' : '카카오로 시작하기'}
          </button>

          {error && (
            <p className="text-xs text-center" style={{ color: '#f87171' }}>{error}</p>
          )}
        </div>

        <button
          onClick={() => router.push('/')}
          className="text-sm transition-colors"
          style={{ color: 'rgba(255,255,255,0.25)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(79,195,247,0.6)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
        >
          ← 지도로 돌아가기
        </button>
      </div>
    </div>
  );
}

function KakaoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3C6.477 3 2 6.82 2 11.49c0 2.96 1.78 5.56 4.48 7.08-.19.74-.7 2.67-.8 3.09-.13.52.19.51.4.37.16-.11 2.59-1.76 3.64-2.47.66.1 1.35.15 2.04.15C17.523 19.71 22 16.16 22 11.49 22 6.82 17.523 3 12 3z"
        fill="#191919"
      />
    </svg>
  );
}
