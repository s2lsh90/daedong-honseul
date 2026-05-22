import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function POST(req: NextRequest) {
  const { barId, nickname, gender } = await req.json();

  if (!barId || !nickname || !gender) {
    return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 });
  }

  try {
    const bars = await store.getBars();
    const bar = bars.find((b) => b.id === barId);
    if (!bar) return NextResponse.json({ error: '바를 찾을 수 없습니다' }, { status: 404 });

    const checkin = await store.addCheckin({ bar_id: barId, nickname, gender });
    return NextResponse.json({ checkinId: checkin.id, barId, nickname, gender });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
