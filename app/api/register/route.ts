import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, address, lat, lng, description, capacity, ownerName, openHours, tags } = body;

  if (!name || !address || !lat || !lng || !ownerName) {
    return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 });
  }

  try {
    const bar = await store.addBar({
      name,
      address,
      lat: Number(lat),
      lng: Number(lng),
      description: description || '',
      capacity: Number(capacity) || 20,
      owner_name: ownerName,
      open_hours: openHours || '18:00 - 02:00',
      tags: tags || [],
    });
    return NextResponse.json({ success: true, bar });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
