'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // URL의 ?code= 파라미터를 Supabase가 자동으로 감지해 세션으로 교환함
    // SIGNED_IN 이벤트가 오면 홈으로 이동
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.replace('/');
      }
    });

    // 이미 세션이 있으면 바로 이동
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/');
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0d0d14] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="text-4xl animate-bounce">🍺</div>
        <p className="text-white/40 text-sm">카카오 로그인 처리 중...</p>
      </div>
    </div>
  );
}
