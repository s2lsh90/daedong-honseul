'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// ── 타입 ──────────────────────────────────────────────────────────────
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

// ── 상수 ──────────────────────────────────────────────────────────────
const INIT_LNG     = 126.9918;
const INIT_LAT     = 37.5519;
const CLUSTER_ZOOM = 12;

// ── 지역 레이블 ────────────────────────────────────────────────────────
const AREA_LABELS = [
  { name: '홍대',        lat: 37.5558, lng: 126.9236 },
  { name: '합정·망원',   lat: 37.5490, lng: 126.9140 },
  { name: '이태원',      lat: 37.5347, lng: 126.9945 },
  { name: '강남',        lat: 37.4979, lng: 127.0276 },
  { name: '을지로·종로', lat: 37.5700, lng: 126.9910 },
  { name: '성수',        lat: 37.5437, lng: 127.0566 },
  { name: '건대·군자',   lat: 37.5404, lng: 127.0706 },
  { name: '잠실·송파',   lat: 37.5070, lng: 127.0980 },
  { name: '문래',        lat: 37.5172, lng: 126.8978 },
  { name: '마곡·발산',   lat: 37.5592, lng: 126.8339 },
  { name: '성신여대',    lat: 37.5916, lng: 127.0175 },
  { name: '연신내',      lat: 37.6183, lng: 126.9224 },
  { name: '용산',        lat: 37.5296, lng: 126.9652 },
  { name: '사당·동작',   lat: 37.5043, lng: 126.9798 },
  { name: '신림',        lat: 37.4844, lng: 126.9298 },
  { name: '노원',        lat: 37.6556, lng: 127.0681 },
  { name: '천호',        lat: 37.5382, lng: 127.1240 },
  { name: '압구정·선릉', lat: 37.5259, lng: 127.0388 },
];

function getNearestArea(lat: number, lng: number): string {
  let minDist = Infinity, name = '서울';
  for (const a of AREA_LABELS) {
    const d = (lat - a.lat) ** 2 + (lng - a.lng) ** 2;
    if (d < minDist) { minDist = d; name = a.name; }
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
    cell.bars.push(bar); cell.sumLat += bar.lat; cell.sumLng += bar.lng;
  }
  return Array.from(cells.values()).map(cell => {
    const n = cell.bars.length;
    const male   = cell.bars.reduce((s, b) => s + b.stats.male, 0);
    const female = cell.bars.reduce((s, b) => s + b.stats.female, 0);
    return { lat: cell.sumLat / n, lng: cell.sumLng / n, male, female, count: n,
      label: getNearestArea(cell.sumLat / n, cell.sumLng / n) };
  });
}

function getOccupancyColor(total: number, capacity: number) {
  const r = capacity > 0 ? total / capacity : 0;
  if (r < 0.4) return { color: '#4ade80', glow: 'rgba(74,222,128,0.3)',   label: '여유' };
  if (r < 0.7) return { color: '#fb923c', glow: 'rgba(251,146,60,0.3)',   label: '보통' };
  return           { color: '#f87171', glow: 'rgba(248,113,113,0.3)',     label: '혼잡' };
}

/** 모든 심볼 레이어 텍스트를 한국어로 변경 */
function setKorean(map: mapboxgl.Map) {
  try {
    for (const layer of map.getStyle().layers) {
      if (layer.type !== 'symbol') continue;
      try {
        const f = map.getLayoutProperty(layer.id, 'text-field');
        if (f) map.setLayoutProperty(layer.id, 'text-field',
          ['coalesce', ['get', 'name_ko'], ['get', 'name']]);
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
}

/**
 * 타일 색상 커스터마이징 — dark-v11 위에 레이어별로 컬러 오버라이드
 * 배경 #08081a (UI와 동일) / 물 #0d1f3c / 공원 #0b1a0e / 도로 계열 어두운 네이비
 */
function setTileColors(map: mapboxgl.Map) {
  const pairs: [string, string, string][] = [
    // [레이어id, paintProp, color]
    // ── 배경 / 육지 ──
    ['land',                     'background-color', '#08081a'],
    ['land-structure',           'background-color', '#08081a'],
    ['landcover',                'fill-color',       '#08081a'],
    ['landuse',                  'fill-color',       '#0c0c1e'],
    ['landuse-residential',      'fill-color',       '#0c0c1e'],
    // ── 공원 / 자연 ──
    ['national-park',            'fill-color',       '#0b1710'],
    ['landuse_overlay',          'fill-color',       '#0b1710'],
    // ── 물 ──
    ['water',                    'fill-color',       '#070f1c'],
    ['water-depth',              'fill-color',       '#060d18'],
    ['waterway',                 'line-color',       '#0a1525'],
    ['waterway-shadow',          'line-color',       '#0a1525'],
    // ── 도로 (어두운 네이비 계열) ──
    ['road-motorway-trunk',      'line-color',       '#141e32'],
    ['road-primary',             'line-color',       '#111828'],
    ['road-secondary-tertiary',  'line-color',       '#0e1520'],
    ['road-street',              'line-color',       '#0d1320'],
    ['road-local',               'line-color',       '#0b1020'],
    ['road-pedestrian',          'line-color',       '#0d1220'],
    ['road-minor',               'line-color',       '#0b1020'],
    // ── 도로 케이싱 ──
    ['road-motorway-trunk-case', 'line-color',       '#0a1028'],
    ['road-primary-case',        'line-color',       '#0a1028'],
    // ── 건물 ──
    ['building',                 'fill-color',       '#0d1220'],
    ['building-outline',         'line-color',       '#111828'],
    // ── 공항·기차역 ──
    ['aeroway-polygon',          'fill-color',       '#0b0f1a'],
    ['aeroway-line',             'line-color',       '#131c2e'],
    // ── 터널 ──
    ['tunnel-motorway-trunk',    'line-color',       '#0d1528'],
    ['tunnel-primary',           'line-color',       '#0c1325'],
  ];

  for (const [id, prop, color] of pairs) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    try { map.setPaintProperty(id, prop as any, color); } catch { /* 레이어 없으면 skip */ }
  }
}

// ── 핀 HTML ────────────────────────────────────────────────────────────
function buildClusterHTML(cluster: Cluster): string {
  const total = cluster.male + cluster.female;
  const occ   = getOccupancyColor(total, cluster.count * 20);
  return `<div style="
    position:relative;text-align:center;cursor:pointer;user-select:none;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="
      background:rgba(10,10,22,0.92);
      border:1px solid rgba(79,195,247,0.35);
      border-radius:10px;padding:10px 20px;min-width:130px;
      backdrop-filter:blur(12px);
      box-shadow:0 0 24px rgba(79,195,247,0.12),0 8px 32px rgba(0,0,0,0.6);">
      <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.92);
        white-space:nowrap;letter-spacing:0.3px;margin-bottom:6px;">
        📍 ${cluster.label} 혼술바
      </div>
      <div style="display:flex;gap:8px;justify-content:center;align-items:center;">
        <span style="font-size:11px;color:#90cdf4;font-weight:600;">♂ ${cluster.male}</span>
        <span style="width:1px;height:10px;background:rgba(255,255,255,0.15);"></span>
        <span style="font-size:11px;color:#f9a8d4;font-weight:600;">♀ ${cluster.female}</span>
        <span style="width:1px;height:10px;background:rgba(255,255,255,0.15);"></span>
        <span style="font-size:10px;color:${occ.color};font-weight:700;
          background:${occ.glow};padding:2px 7px;border-radius:99px;
          border:1px solid ${occ.color}55;">
          ${cluster.count}곳 ${occ.label}
        </span>
      </div>
    </div>
    <div style="display:flex;justify-content:center;margin-top:-1px;">
      <div style="width:0;height:0;
        border-left:8px solid transparent;border-right:8px solid transparent;
        border-top:10px solid rgba(79,195,247,0.35);">
      </div>
    </div>
  </div>`;
}

function buildPinHTML(bar: BarWithStats, isSelected: boolean): string {
  const { male, female } = bar.stats;
  const occ = getOccupancyColor(male + female, bar.capacity);
  const pinColor    = isSelected ? '#fbbf24' : '#4fc3f7';
  const borderColor = isSelected ? 'rgba(251,191,36,0.5)' : 'rgba(79,195,247,0.35)';
  const glowColor   = isSelected ? 'rgba(251,191,36,0.2)' : 'rgba(79,195,247,0.12)';
  return `<div style="
    position:relative;text-align:center;cursor:pointer;user-select:none;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="
      background:rgba(10,10,22,0.92);
      border:1px solid ${borderColor};border-radius:8px;
      padding:6px 14px;margin-bottom:4px;min-width:90px;
      backdrop-filter:blur(12px);
      box-shadow:0 0 20px ${glowColor},0 4px 20px rgba(0,0,0,0.5);">
      <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.92);
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px;
        letter-spacing:0.2px;margin-bottom:4px;">
        ${bar.name}
      </div>
      <div style="display:flex;gap:5px;justify-content:center;align-items:center;">
        <span style="font-size:10px;color:#90cdf4;font-weight:600;">♂ ${male}</span>
        <span style="font-size:10px;color:#f9a8d4;font-weight:600;">♀ ${female}</span>
        <span style="font-size:8px;color:${occ.color};
          background:${occ.glow};padding:1px 6px;border-radius:99px;
          border:1px solid ${occ.color}44;font-weight:700;">
          ${occ.label}
        </span>
      </div>
    </div>
    <div style="display:flex;justify-content:center;">
      <svg width="20" height="27" viewBox="0 0 20 27"
        style="filter:drop-shadow(0 0 6px ${pinColor}88);"
        xmlns="http://www.w3.org/2000/svg">
        <path d="M10 26 C10 26,1 16,1 10 A9 9 0 0 1 19 10 C19 16,10 26,10 26Z"
          fill="${pinColor}" stroke="rgba(0,0,0,0.5)" stroke-width="1"/>
        <circle cx="10" cy="10" r="4" fill="rgba(255,255,255,0.3)"/>
      </svg>
    </div>
  </div>`;
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────
export default function MapClient({ bars, onBarClick, selectedBarId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<mapboxgl.Map | null>(null);
  const markersRef   = useRef<mapboxgl.Marker[]>([]);
  const [mapReady,   setMapReady]  = useState(false);
  const [introText,  setIntroText] = useState('지구를 탐색 중...');
  const [zoom,       setZoom]      = useState(11);

  // ── 지도 초기화 ──
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      projection: 'globe' as any,   // 지구본 프로젝션
      center: [126.0, 30.0],        // 시작: 한반도 남쪽 우주
      zoom: 2,                      // minZoom 없이 시작해야 지구본이 보임
      pitch: 0,
      bearing: 10,
      // minZoom은 인트로 종료 후 setMinZoom(10)으로 설정
      maxZoom: 18,
      attributionControl: false,
    });

    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: true }),
      'bottom-right',
    );

    map.on('load', () => {
      // ── 우주 대기권 + 별 ──
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (map as any).setFog({
        color:            'rgba(120, 160, 210, 0.4)',
        'high-color':     'rgba(20, 60, 180, 0.9)',
        'horizon-blend':  0.04,
        'space-color':    '#08081a',
        'star-intensity': 0.85,
      });

      // ── 한국어 레이블 + 타일 색상 ──
      setKorean(map);
      setTileColors(map);
      map.on('styledata', () => { setKorean(map); setTileColors(map); });

      // ── 3D 빌딩 ──
      map.addLayer({
        id: '3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        minzoom: 14,
        paint: {
          'fill-extrusion-color': [
            'interpolate', ['linear'], ['get', 'height'],
            0,   '#0f172a',
            40,  '#1e3a5f',
            150, '#1e40af',
          ],
          'fill-extrusion-height':  ['interpolate', ['linear'], ['zoom'], 14, 0, 14.05, ['get', 'height']],
          'fill-extrusion-base':    ['interpolate', ['linear'], ['zoom'], 14, 0, 14.05, ['get', 'min_height']],
          'fill-extrusion-opacity': 0.8,
        },
      });

      // ── 지구본 → 서울 인트로 비행 ──
      setTimeout(() => {
        setIntroText('서울로 이동 중...');
        map.flyTo({
          center:   [INIT_LNG, INIT_LAT],
          zoom:     11,
          pitch:    45,
          bearing:  -10,
          duration: 5500,
          curve:    1.8,
          essential: true,
        });
      }, 1200);

      // flyTo 끝나면 minZoom 잠금 + 인트로 종료
      map.once('moveend', () => {
        map.setMinZoom(10);
        setMapReady(true);
      });
    });

    map.on('zoom', () => setZoom(map.getZoom()));

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // ── 마커 업데이트 ──
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const isClustered = zoom < CLUSTER_ZOOM;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (isClustered) {
      const gs = zoom < 11 ? 0.06 : 0.028;
      computeClusters(bars, gs).forEach(cluster => {
        const el = document.createElement('div');
        el.innerHTML = buildClusterHTML(cluster);
        el.addEventListener('click', () =>
          map.flyTo({ center: [cluster.lng, cluster.lat], zoom: 13, pitch: 45, duration: 700 }),
        );
        markersRef.current.push(
          new mapboxgl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([cluster.lng, cluster.lat])
            .addTo(map),
        );
      });
    } else {
      bars.forEach(bar => {
        const isSelected = bar.id === selectedBarId;
        const el = document.createElement('div');
        el.innerHTML = buildPinHTML(bar, isSelected);
        el.addEventListener('click', () => onBarClick(bar.id));
        el.style.transition = 'transform 0.15s';
        el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.06)'; });
        el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });
        markersRef.current.push(
          new mapboxgl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([bar.lng, bar.lat])
            .addTo(map),
        );
      });
    }
  }, [bars, selectedBarId, onBarClick, mapReady, zoom]);

  const isClustered = zoom < CLUSTER_ZOOM;

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* 줌 안내 */}
      {mapReady && isClustered && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[400] pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-2 text-xs whitespace-nowrap"
            style={{
              background: 'rgba(10,10,22,0.82)',
              border: '1px solid rgba(79,195,247,0.25)',
              borderRadius: '99px',
              color: 'rgba(255,255,255,0.6)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            }}>
            <span>🔍</span>
            <span>클릭하거나 확대하면 개별 혼술바를 볼 수 있어요</span>
          </div>
        </div>
      )}

      {/* 인트로 오버레이 */}
      {!mapReady && (
        <div
          className="absolute inset-0 z-[400] flex flex-col items-center justify-end pb-16 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(8,8,26,0.85) 0%, transparent 50%)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: '#4fc3f7', boxShadow: '0 0 8px #4fc3f7' }} />
            <span className="text-sm font-medium"
              style={{ color: 'rgba(255,255,255,0.7)', letterSpacing: '0.5px' }}>
              {introText}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
