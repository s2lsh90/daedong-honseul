import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const barId = req.nextUrl.searchParams.get('barId');
  if (!barId) return NextResponse.json({ error: 'barId 필요' }, { status: 400 });

  const { data, error } = await supabase
    .from('reviews')
    .select('id, nickname, rating, content, created_at')
    .eq('bar_id', barId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const { barId, rating, content } = await req.json();

  if (!barId || !rating || !content?.trim()) {
    return NextResponse.json({ error: '필수 값 누락' }, { status: 400 });
  }
  if (content.trim().length < 5) {
    return NextResponse.json({ error: '리뷰를 5자 이상 작성해주세요' }, { status: 400 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: '인증 실패' }, { status: 401 });

  // 카카오: user_metadata.name / full_name / nickname 순서로 시도
  const nickname =
    (user.user_metadata?.name as string) ||
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.nickname as string) ||
    user.email?.split('@')[0] ||
    '혼술러';

  const { data, error } = await supabase
    .from('reviews')
    .insert({ bar_id: barId, user_id: user.id, rating, content: content.trim(), nickname })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 이 바에 리뷰를 작성하셨습니다' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
