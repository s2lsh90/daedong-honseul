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
      await signInWithKakao(); // 카카오 로그인 페이지로 리다이렉트
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '로그인 중 오류가 발생했습니다');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0d14] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xs text-center space-y-10">

        {/* 로고 */}
        <div className="space-y-2">
          <div className="text-6xl">🍺</div>
          <h1 className="text-2xl font-black text-amber-400 tracking-tight">대동혼술지도</h1>
          <p className="text-white/35 text-sm">서울 혼술바 실시간 남녀 현황</p>
        </div>

        {/* 로그인 카드 */}
        <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
          <div className="space-y-1">
            <p className="text-white/80 text-sm font-semibold">로그인</p>
            <p className="text-white/35 text-xs">로그인하면 방문한 혼술바에 리뷰를 남길 수 있어요</p>
          </div>

          <button
            onClick={handleKakaoLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-xl font-bold text-[#191919] text-sm transition-all hover:brightness-95 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: '#FEE500' }}
          >
            {loading ? (
              <span className="animate-spin text-lg">⏳</span>
            ) : (
              <KakaoIcon />
            )}
            {loading ? '연결 중...' : '카카오로 시작하기'}
          </button>

          {error && (
            <p className="text-red-400 text-xs text-center">{error}</p>
          )}
        </div>

        <button
          onClick={() => router.push('/')}
          className="text-white/25 hover:text-white/45 text-sm transition-colors"
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
