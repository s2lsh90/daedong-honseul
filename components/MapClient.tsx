'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kakao: any;
  }
}

interface BarWithStats {
  id: string;
  name: string;
  lat: number;
  lng: number;
  capacity: number;
  stats: { male: number; female: number };
}

interface Props {
  bars: BarWithStats[];
  onBarClick: (barId: string) => void;
  selectedBarId: string | null;
}

function getOccupancyColor(total: number, capacity: number): string {
  const ratio = capacity > 0 ? total / capacity : 0;
  if (ratio < 0.4) return '#22c55e';
  if (ratio < 0.7) return '#f59e0b';
  return '#ef4444';
}

function buildPinHTML(bar: BarWithStats, isSelected: boolean): string {
  const { male, female } = bar.stats;
  const total = male + female;
  const color = getOccupancyColor(total, bar.capacity);
  const border = isSelected ? '2px solid #f59e0b' : `2px solid ${color}`;
  const shadow = isSelected
    ? '0 0 0 3px rgba(245,158,11,0.3), 0 6px 20px rgba(0,0,0,0.6)'
    : '0 4px 14px rgba(0,0,0,0.5)';
  const scale = isSelected ? 'scale(1.12)' : 'scale(1)';

  return `
    <div style="
      background: #1a1a2e;
      border: ${border};
      border-radius: 10px;
      padding: 5px 10px;
      text-align: center;
      min-width: 90px;
      max-width: 110px;
      box-shadow: ${shadow};
      transform: ${scale};
      cursor: pointer;
      user-select: none;
      transition: transform 0.15s ease;
    ">
      <div style="
        font-size: 11px;
        font-weight: 700;
        color: #fff;
        margin-bottom: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      ">${bar.name}</div>
      <div style="display: flex; gap: 8px; justify-content: center; align-items: center;">
        <span style="font-size: 12px; color: #60a5fa; font-weight: 600;">♂ ${male}</span>
        <span style="font-size: 12px; color: #f472b6; font-weight: 600;">♀ ${female}</span>
      </div>
      <div style="
        position: absolute;
        bottom: -7px;
        left: 50%;
        transform: translateX(-50%);
        width: 0; height: 0;
        border-left: 7px solid transparent;
        border-right: 7px solid transparent;
        border-top: 7px solid ${isSelected ? '#f59e0b' : color};
      "></div>
    </div>
  `;
}

export default function MapClient({ bars, onBarClick, selectedBarId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const overlaysRef = useRef<Map<string, any>>(new Map());
  const [mapReady, setMapReady] = useState(false);

  // 카카오맵 초기화
  useEffect(() => {
    if (!containerRef.current) return;

    const initMap = () => {
      window.kakao.maps.load(() => {
        const center = new window.kakao.maps.LatLng(37.5519, 126.9918);
        const map = new window.kakao.maps.Map(containerRef.current, {
          center,
          level: 7,
        });
        mapRef.current = map;
        setMapReady(true);
      });
    };

    if (window.kakao) {
      initMap();
      return;
    }

    // 스크립트 동적 주입
    const existing = document.querySelector('script[src*="dapi.kakao.com"]');
    if (existing) {
      existing.addEventListener('load', initMap);
      return;
    }

    const script = document.createElement('script');
    script.src =
      '//dapi.kakao.com/v2/maps/sdk.js?appkey=65f89f3c518bd9cb7689641cf9cfde13&autoload=false';
    script.async = true;
    script.onload = initMap;
    document.head.appendChild(script);
  }, []);

  // 오버레이(핀) 업데이트
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    const existingIds = new Set(overlaysRef.current.keys());

    bars.forEach((bar) => {
      const isSelected = bar.id === selectedBarId;
      const content = buildPinHTML(bar, isSelected);

      if (overlaysRef.current.has(bar.id)) {
        // 기존 오버레이 내용 업데이트
        const overlay = overlaysRef.current.get(bar.id);
        const el = overlay.getContent() as HTMLElement;
        el.innerHTML = content;
        // 클릭 핸들러 재등록
        el.onclick = () => onBarClick(bar.id);
      } else {
        // 새 오버레이 생성
        const el = document.createElement('div');
        el.innerHTML = content;
        el.style.position = 'relative';
        el.onclick = () => onBarClick(bar.id);

        const overlay = new window.kakao.maps.CustomOverlay({
          position: new window.kakao.maps.LatLng(bar.lat, bar.lng),
          content: el,
          xAnchor: 0.5,
          yAnchor: 1.3,
          zIndex: isSelected ? 10 : 1,
        });
        overlay.setMap(mapRef.current);
        overlaysRef.current.set(bar.id, overlay);
      }

      existingIds.delete(bar.id);
    });

    // 삭제된 바 핀 제거
    existingIds.forEach((id) => {
      overlaysRef.current.get(id)?.setMap(null);
      overlaysRef.current.delete(id);
    });
  }, [bars, selectedBarId, onBarClick, mapReady]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0d0d14]">
          <div className="text-center space-y-3">
            <div className="text-4xl animate-bounce">🍺</div>
            <p className="text-white/40 text-sm">지도 불러오는 중...</p>
          </div>
        </div>
      )}
    </div>
  );
}
