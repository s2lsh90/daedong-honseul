import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET() {
  try {
    const bars = await store.getBarsWithStats();
    return NextResponse.json(bars);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
