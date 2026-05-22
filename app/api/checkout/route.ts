import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function POST(req: NextRequest) {
  const { checkinId } = await req.json();

  if (!checkinId) {
    return NextResponse.json({ error: 'checkinId 필요' }, { status: 400 });
  }

  try {
    await store.checkout(checkinId);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
