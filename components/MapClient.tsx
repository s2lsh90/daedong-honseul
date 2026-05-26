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

interface Cluster {
  lat: number;
  lng: number;
  male: number;
  female: number;
  count: number;
  label: string;
}

// ─── 줌 임계값: 이 레벨 이상이면 클러스터 모드 ───
const CLUSTER_THRESHOLD = 6;

// ─── 지역 중심 좌표 ───
const AREA_LABELS = [
  { name: '홍대',      lat: 37.5558, lng: 126.9236 },
  { name: '합정·망원', lat: 37.5490, lng: 126.9140 },
  { name: '이태원',    lat: 37.5347, lng: 126.9945 },
  { name: '강남',      lat: 37.4979, lng: 127.0276 },
  { name: '을지로·종로', lat: 37.5700, lng: 126.9910 },
  { name: '성수',      lat: 37.5437, lng: 127.0566 },
  { name: '건대·군자', lat: 37.5404, lng: 127.0706 },
  { name: '잠실·송파', lat: 37.5070, lng: 127.0980 },
  { name: '문래',      lat: 37.5172, lng: 126.8978 },
  { name: '마곡·발산', lat: 37.5592, lng: 126.8339 },
  { name: '성신여대',  lat: 37.5916, lng: 127.0175 },
  { name: '연신내',    lat: 37.6183, lng: 126.9224 },
  { name: '용산',      lat: 37.5296, lng: 126.9652 },
  { name: '사당·동작', lat: 37.5043, lng: 126.9798 },
  { name: '신림',      lat: 37.4844, lng: 126.9298 },
  { name: '노원',      lat: 37.6556, lng: 127.0681 },
  { name: '천호',      lat: 37.5382, lng: 127.1240 },
  { name: '압구정·선릉', lat: 37.5259, lng: 127.0388 },
];

function getNearestArea(lat: number, lng: number): string {
  let minDist = Infinity;
  let name = '서울';
  for (const area of AREA_LABELS) {
    const d = (lat - area.lat) ** 2 + (lng - area.lng) ** 2;
    if (d < minDist) { minDist = d; name = area.name; }
  }
  return name;
}

function computeClusters(bars: BarWithStats[], gridSize: number): Cluster[] {
  const cells = new Map<string, { bars: BarWithStats[]; sumLat: number; sumLng: number }>();

  for (const bar of bars) {
    const cellLat = Math.round(bar.lat / gridSize) * gridSize;
    const cellLng = Math.round(bar.lng / gridSize) * gridSize;
    const key = `${cellLat.toFixed(4)},${cellLng.toFixed(4)}`;
    if (!cells.has(key)) cells.set(key, { bars: [], sumLat: 0, sumLng: 0 });
    const cell = cells.get(key)!;
    cell.bars.push(bar);
    cell.sumLat += bar.lat;
    cell.sumLng += bar.lng;
  }

  return Array.from(cells.values()).map((cell) => {
    const n = cell.bars.length;
    const avgLat = cell.sumLat / n;
    const avgLng = cell.sumLng / n;
    const male   = cell.bars.reduce((s, b) => s + b.stats.male, 0);
    const female = cell.bars.reduce((s, b) => s + b.stats.female, 0);
    return { lat: avgLat, lng: avgLng, male, female, count: n, label: getNearestArea(avgLat, avgLng) };
  });
}

// ─── 색상 ───
function getOccupancyColor(total: number, capacity: number): string {
  const ratio = capacity > 0 ? total / capacity : 0;
  if (ratio < 0.4) return '#10b981';
  if (ratio < 0.7) return '#f59e0b';
  return '#f43f5e';
}

// ─── 클러스터 핀 HTML ───
function buildClusterHTML(cluster: Cluster): string {
  const total    = cluster.male + cluster.female;
  const color    = getOccupancyColor(total, cluster.count * 20);
  const statusLabel = cluster.count === 0 ? '없음' : total === 0 ? '한산' : '영업중';

  return `
    <div style="
      position: relative;
      background: rgba(8,8,16,0.96);
      border: 2px solid ${color};
      border-radius: 18px;
      padding: 10px 16px 11px;
      min-width: 138px;
      box-shadow: 0 6px 28px rgba(0,0,0,0.7), 0 0 20px ${color}40, 0 0 0 1px rgba(255,255,255,0.05);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      cursor: pointer;
      user-select: none;
      transition: filter 0.15s ease;
    "
    onmouseover="this.style.filter='brightness(1.2)'"
    onmouseout="this.style.filter='brightness(1)'"
    >
      <div style="display:flex; align-items:center; gap:5px; margin-bottom:3px;">
        <div style="width:6px; height:6px; border-radius:50%; background:${color}; box-shadow:0 0 6px ${color};"></div>
        <div style="font-size:12.5px; font-weight:800; color:#f0f0f0; letter-spacing:-0.4px; white-space:nowrap;">
          ${cluster.label} 혼술바
        </div>
      </div>
      <div style="font-size:10px; color:rgba(255,255,255,0.35); margin-bottom:8px; padding-left:11px;">
        ${cluster.count}개 · ${statusLabel}
      </div>
      <div style="display:flex; gap:5px;">
        <div style="
          background:rgba(96,165,250,0.14); border:1px solid rgba(96,165,250,0.3);
          border-radius:99px; padding:2px 10px; font-size:11.5px; color:#93c5fd; font-weight:700;
        ">♂ ${cluster.male}</div>
        <div style="
          background:rgba(244,114,182,0.14); border:1px solid rgba(244,114,182,0.3);
          border-radius:99px; padding:2px 10px; font-size:11.5px; color:#f9a8d4; font-weight:700;
        ">♀ ${cluster.female}</div>
      </div>
      <div style="
        position:absolute; bottom:-9px; left:50%; transform:translateX(-50%);
        width:0; height:0;
        border-left:9px solid transparent; border-right:9px solid transparent;
        border-top:9px solid rgba(8,8,16,0.96);
      "></div>
    </div>
  `;
}

// ─── 개별 핀 HTML ───
function buildPinHTML(bar: BarWithStats, isSelected: boolean): string {
  const { male, female } = bar.stats;
  const total    = male + female;
  const ratio    = bar.capacity > 0 ? total / bar.capacity : 0;
  const color    = getOccupancyColor(total, bar.capacity);
  const statusLabel = ratio < 0.4 ? '여유' : ratio < 0.7 ? '보통' : '혼잡';
  const barWidth = Math.min(100, Math.round(ratio * 100));

  const shadow = isSelected
    ? `0 0 0 2px #f59e0b, 0 0 18px rgba(245,158,11,0.45), 0 8px 28px rgba(0,0,0,0.7)`
    : `0 4px 20px rgba(0,0,0,0.55), 0 1px 4px rgba(0,0,0,0.4)`;
  const scale          = isSelected ? 'scale(1.1)' : 'scale(1)';
  const topBorderColor = isSelected ? '#f59e0b' : color;

  return `
    <div style="
      position:relative;
      background:rgba(10,10,18,0.94);
      border:1px solid rgba(255,255,255,${isSelected ? '0.18' : '0.07'});
      border-top:3px solid ${topBorderColor};
      border-radius:14px;
      padding:8px 11px 9px;
      min-width:110px; max-width:140px;
      box-shadow:${shadow};
      transform:${scale}; transform-origin:bottom center;
      cursor:pointer; user-select:none;
      font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    ">
      <div style="font-size:11.5px; font-weight:700; color:#f0f0f0;
        white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        margin-bottom:7px; letter-spacing:-0.3px;">
        ${bar.name}
      </div>
      <div style="display:flex; gap:5px; align-items:center; margin-bottom:7px;">
        <div style="background:rgba(96,165,250,0.14); border:1px solid rgba(96,165,250,0.28);
          border-radius:99px; padding:2px 8px; font-size:11px; color:#93c5fd; font-weight:600;">
          ♂ ${male}
        </div>
        <div style="background:rgba(244,114,182,0.14); border:1px solid rgba(244,114,182,0.28);
          border-radius:99px; padding:2px 8px; font-size:11px; color:#f9a8d4; font-weight:600;">
          ♀ ${female}
        </div>
        <div style="margin-left:auto; font-size:9.5px; font-weight:700; color:${color};
          letter-spacing:-0.2px; white-space:nowrap;">
          ${statusLabel}
        </div>
      </div>
      <div style="height:3px; background:rgba(255,255,255,0.07); border-radius:99px; overflow:hidden;">
        <div style="height:100%; width:${barWidth}%;
          background:linear-gradient(90deg,${color}88,${color}); border-radius:99px;"></div>
      </div>
      <div style="position:absolute; bottom:-8px; left:50%; transform:translateX(-50%);
        width:0; height:0;
        border-left:8px solid transparent; border-right:8px solid transparent;
        border-top:8px solid rgba(10,10,18,0.94);"></div>
    </div>
  `;
}

export default function MapClient({ bars, onBarClick, selectedBarId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef       = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const overlaysRef  = useRef<any[]>([]);
  const [mapReady,  setMapReady]  = useState(false);
  const [zoomLevel, setZoomLevel] = useState(7);

  // ── 카카오맵 초기화 ──
  useEffect(() => {
    if (!containerRef.current) return;

    const initMap = () => {
      window.kakao.maps.load(() => {
        const center = new window.kakao.maps.LatLng(37.5519, 126.9918);
        const map    = new window.kakao.maps.Map(containerRef.current, { center, level: 7 });
        mapRef.current = map;

        // 줌 변경 감지
        window.kakao.maps.event.addListener(map, 'zoom_changed', () => {
          setZoomLevel(map.getLevel());
        });

        setMapReady(true);
      });
    };

    if (window.kakao) { initMap(); return; }

    const interval = setInterval(() => {
      if (window.kakao) { clearInterval(interval); initMap(); }
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // ── 오버레이 업데이트 ──
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    // 기존 오버레이 전부 제거
    overlaysRef.current.forEach((ov) => ov.setMap(null));
    overlaysRef.current = [];

    const isClustered = zoomLevel >= CLUSTER_THRESHOLD;

    if (isClustered) {
      // 줌 레벨별 그리드 크기 (도 단위, 서울에서 약 1~4km)
      const gridSize = zoomLevel >= 8 ? 0.05 : zoomLevel === 7 ? 0.03 : 0.018;
      const clusters = computeClusters(bars, gridSize);

      clusters.forEach((cluster) => {
        const el       = document.createElement('div');
        el.innerHTML   = buildClusterHTML(cluster);
        el.style.position = 'relative';

        // 클릭 시 해당 위치로 줌인 → 개별 핀 모드로 자동 전환
        el.onclick = () => {
          const pos = new window.kakao.maps.LatLng(cluster.lat, cluster.lng);
          mapRef.current.setCenter(pos);
          mapRef.current.setLevel(4, { animate: true });
        };

        const overlay = new window.kakao.maps.CustomOverlay({
          position: new window.kakao.maps.LatLng(cluster.lat, cluster.lng),
          content:  el,
          xAnchor:  0.5,
          yAnchor:  1.3,
          zIndex:   1,
        });
        overlay.setMap(mapRef.current);
        overlaysRef.current.push(overlay);
      });
    } else {
      // 개별 핀 모드
      bars.forEach((bar) => {
        const isSelected = bar.id === selectedBarId;
        const el         = document.createElement('div');
        el.innerHTML     = buildPinHTML(bar, isSelected);
        el.style.position = 'relative';
        el.onclick       = () => onBarClick(bar.id);

        const overlay = new window.kakao.maps.CustomOverlay({
          position: new window.kakao.maps.LatLng(bar.lat, bar.lng),
          content:  el,
          xAnchor:  0.5,
          yAnchor:  1.3,
          zIndex:   isSelected ? 10 : 1,
        });
        overlay.setMap(mapRef.current);
        overlaysRef.current.push(overlay);
      });
    }
  }, [bars, selectedBarId, onBarClick, mapReady, zoomLevel]);

  const isClustered = zoomLevel >= CLUSTER_THRESHOLD;

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* 줌 안내 힌트 */}
      {mapReady && isClustered && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[400] pointer-events-none">
          <div className="flex items-center gap-2 bg-black/55 backdrop-blur-sm rounded-full px-4 py-2 text-white/60 text-xs whitespace-nowrap">
            <span className="text-base">🔍</span>
            클릭하거나 확대하면 개별 혼술바를 볼 수 있어요
          </div>
        </div>
      )}

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
