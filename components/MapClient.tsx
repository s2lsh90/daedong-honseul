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

// ── 지역 레이블 ───────────────────────────────────────────────────────
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
  if (r < 0.4) return { color: '#4ade80', label: '여유' };
  if (r < 0.7) return { color: '#fb923c', label: '보통' };
  return           { color: '#f87171', label: '혼잡' };
}

// ── 한국어 레이블 (최초 style.load 시 1회) ────────────────────────────
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

// ── 타일 색상 (UI #08081a 팔레트와 통일) ─────────────────────────────
function setTileColors(map: mapboxgl.Map) {
  const pairs: [string, string][] = [
    ['land',                     'background-color:#08081a'],
    ['land-structure',           'background-color:#08081a'],
    ['landcover',                'fill-color:#08081a'],
    ['landuse',                  'fill-color:#0c0c1e'],
    ['landuse-residential',      'fill-color:#0c0c1e'],
    ['national-park',            'fill-color:#0b1710'],
    ['landuse_overlay',          'fill-color:#0b1710'],
    ['water',                    'fill-color:#070f1c'],
    ['water-depth',              'fill-color:#060d18'],
    ['waterway',                 'line-color:#0a1525'],
    ['waterway-shadow',          'line-color:#0a1525'],
    ['road-motorway-trunk',      'line-color:#141e32'],
    ['road-primary',             'line-color:#111828'],
    ['road-secondary-tertiary',  'line-color:#0e1520'],
    ['road-street',              'line-color:#0d1320'],
    ['road-local',               'line-color:#0b1020'],
    ['road-pedestrian',          'line-color:#0d1220'],
    ['road-minor',               'line-color:#0b1020'],
    ['road-motorway-trunk-case', 'line-color:#0a1028'],
    ['road-primary-case',        'line-color:#0a1028'],
    ['building',                 'fill-color:#0d1220'],
    ['building-outline',         'line-color:#111828'],
    ['aeroway-polygon',          'fill-color:#0b0f1a'],
    ['aeroway-line',             'line-color:#131c2e'],
    ['tunnel-motorway-trunk',    'line-color:#0d1528'],
    ['tunnel-primary',           'line-color:#0c1325'],
  ];
  for (const [id, propVal] of pairs) {
    const [prop, color] = propVal.split(':') as [string, string];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    try { map.setPaintProperty(id, prop as any, color); } catch { /* skip */ }
  }
}

// ── 컴팩트 핀 HTML ────────────────────────────────────────────────────
function buildClusterHTML(cluster: Cluster): string {
  const total = cluster.male + cluster.female;
  const occ   = getOccupancyColor(total, cluster.count * 20);
  return `<div style="text-align:center;cursor:pointer;user-select:none;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="
      background:rgba(10,10,22,0.9);
      border:1px solid rgba(79,195,247,0.3);
      border-radius:8px;padding:5px 12px;
      backdrop-filter:blur(12px);
      box-shadow:0 0 16px rgba(79,195,247,0.1),0 4px 16px rgba(0,0,0,0.6);
      white-space:nowrap;">
      <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.85);
        letter-spacing:0.2px;margin-bottom:3px;">
        ${cluster.label}
      </div>
      <div style="display:flex;gap:6px;align-items:center;justify-content:center;">
        <span style="font-size:10px;color:#90cdf4;font-weight:600;">♂${cluster.male}</span>
        <span style="font-size:10px;color:#f9a8d4;font-weight:600;">♀${cluster.female}</span>
        <span style="font-size:9px;color:${occ.color};font-weight:700;
          padding:1px 5px;border-radius:99px;
          background:${occ.color}18;border:1px solid ${occ.color}44;">
          ${cluster.count}곳
        </span>
      </div>
    </div>
    <div style="display:flex;justify-content:center;margin-top:-1px;">
      <div style="width:0;height:0;
        border-left:5px solid transparent;border-right:5px solid transparent;
        border-top:6px solid rgba(79,195,247,0.3);">
      </div>
    </div>
  </div>`;
}

function buildPinHTML(bar: BarWithStats, isSelected: boolean): string {
  const { male, female } = bar.stats;
  const occ = getOccupancyColor(male + female, bar.capacity);
  const pinColor    = isSelected ? '#fbbf24' : '#4fc3f7';
  const borderColor = isSelected ? 'rgba(251,191,36,0.45)' : 'rgba(79,195,247,0.3)';
  const glowColor   = isSelected ? 'rgba(251,191,36,0.15)' : 'rgba(79,195,247,0.08)';
  const name = bar.name.length > 10 ? bar.name.slice(0, 9) + '…' : bar.name;
  return `<div style="text-align:center;cursor:pointer;user-select:none;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="
      background:rgba(10,10,22,0.88);
      border:1px solid ${borderColor};border-radius:6px;
      padding:4px 9px;margin-bottom:3px;
      backdrop-filter:blur(10px);
      box-shadow:0 0 12px ${glowColor},0 3px 12px rgba(0,0,0,0.5);">
      <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.88);
        white-space:nowrap;letter-spacing:0.1px;margin-bottom:2px;">
        ${name}
      </div>
      <div style="display:flex;gap:4px;justify-content:center;align-items:center;">
        <span style="font-size:9px;color:#90cdf4;font-weight:600;">♂${male}</span>
        <span style="font-size:9px;color:#f9a8d4;font-weight:600;">♀${female}</span>
        <span style="display:inline-block;width:6px;height:6px;border-radius:50%;
          background:${occ.color};box-shadow:0 0 4px ${occ.color}88;flex-shrink:0;">
        </span>
      </div>
    </div>
    <div style="display:flex;justify-content:center;">
      <svg width="14" height="19" viewBox="0 0 14 19"
        style="filter:drop-shadow(0 0 4px ${pinColor}77);"
        xmlns="http://www.w3.org/2000/svg">
        <path d="M7 18C7 18,1 12,1 7A6 6 0 0 1 13 7C13 12,7 18,7 18Z"
          fill="${pinColor}" stroke="rgba(0,0,0,0.4)" stroke-width="0.8"/>
        <circle cx="7" cy="7" r="2.5" fill="rgba(255,255,255,0.3)"/>
      </svg>
    </div>
  </div>`;
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────
export default function MapClient({ bars, onBarClick, selectedBarId }: Props) {
  const containerRef    = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<mapboxgl.Map | null>(null);
  const markersRef      = useRef<mapboxgl.Marker[]>([]);

  // 줌은 ref로 관리 → 매 프레임 React 리렌더 방지
  const zoomRef         = useRef(11);
  // 클러스터 전환 여부만 state로 관리 (임계값 통과 시에만 리렌더)
  const isClusteredRef  = useRef(true);
  const [isClustered,   setIsClustered]  = useState(true);

  const [mapReady,      setMapReady]     = useState(false);
  const [introText,     setIntroText]    = useState('지구를 탐색 중...');

  // ── 지도 초기화 ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      projection: 'globe' as any,
      center: [126.0, 30.0],   // 우주에서 시작
      zoom: 2,                  // minZoom 없이 → 지구본 보임
      pitch: 0,
      bearing: 10,
      maxZoom: 18,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'bottom-right');

    map.on('load', () => {
      // 우주 대기권 + 별
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (map as any).setFog({
        color:            'rgba(120, 160, 210, 0.4)',
        'high-color':     'rgba(20, 60, 180, 0.9)',
        'horizon-blend':  0.04,
        'space-color':    '#08081a',
        'star-intensity': 0.85,
      });

      // 한국어 + 타일 색상 — style.load 시에만 (styledata 대신)
      setKorean(map);
      setTileColors(map);
      map.on('style.load', () => { setKorean(map); setTileColors(map); });

      // 3D 빌딩
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
            0, '#0f172a', 40, '#1e3a5f', 150, '#1e40af',
          ],
          'fill-extrusion-height':  ['interpolate', ['linear'], ['zoom'], 14, 0, 14.05, ['get', 'height']],
          'fill-extrusion-base':    ['interpolate', ['linear'], ['zoom'], 14, 0, 14.05, ['get', 'min_height']],
          'fill-extrusion-opacity': 0.8,
        },
      });

      // 지구본 → 서울 인트로 비행
      setTimeout(() => {
        setIntroText('서울로 이동 중...');
        map.flyTo({
          center: [INIT_LNG, INIT_LAT],
          zoom: 11, pitch: 45, bearing: -10,
          duration: 5500, curve: 1.8, essential: true,
        });
      }, 1200);

      // 인트로 종료 타이밍 = 딜레이 + flyTo 시간 + 여유 300ms
      setTimeout(() => {
        map.setMinZoom(10);
        setMapReady(true);
        // 초기 클러스터 상태 설정
        const z = map.getZoom();
        zoomRef.current = z;
        const c = z < CLUSTER_ZOOM;
        isClusteredRef.current = c;
        setIsClustered(c);
      }, 1200 + 5500 + 300);
    });

    // 줌 변경 시 클러스터 임계값 교차 시에만 state 업데이트
    map.on('zoom', () => {
      const z = map.getZoom();
      zoomRef.current = z;
      const nowClustered = z < CLUSTER_ZOOM;
      if (nowClustered !== isClusteredRef.current) {
        isClusteredRef.current = nowClustered;
        setIsClustered(nowClustered);
      }
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // ── 마커 업데이트 — isClustered 변경 시에만 전체 재생성 ──────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (isClustered) {
      const gs = zoomRef.current < 11 ? 0.06 : 0.028;
      computeClusters(bars, gs).forEach(cluster => {
        const el = document.createElement('div');
        el.innerHTML = buildClusterHTML(cluster);
        el.addEventListener('click', () =>
          map.flyTo({ center: [cluster.lng, cluster.lat], zoom: 13, pitch: 45, duration: 700 }),
        );
        markersRef.current.push(
          new mapboxgl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([cluster.lng, cluster.lat]).addTo(map),
        );
      });
    } else {
      bars.forEach(bar => {
        const isSelected = bar.id === selectedBarId;
        const el = document.createElement('div');
        el.innerHTML = buildPinHTML(bar, isSelected);
        el.addEventListener('click', () => onBarClick(bar.id));
        el.style.transition = 'transform 0.12s';
        el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.08)'; });
        el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });
        markersRef.current.push(
          new mapboxgl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([bar.lng, bar.lat]).addTo(map),
        );
      });
    }
  }, [bars, selectedBarId, onBarClick, mapReady, isClustered]);

  // ── 선택 상태 변경 시 핀만 갱신 (전체 재생성 없이) ─────────────────
  useEffect(() => {
    if (!mapReady || isClustered || !mapRef.current) return;
    const map = mapRef.current;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    bars.forEach(bar => {
      const isSelected = bar.id === selectedBarId;
      const el = document.createElement('div');
      el.innerHTML = buildPinHTML(bar, isSelected);
      el.addEventListener('click', () => onBarClick(bar.id));
      el.style.transition = 'transform 0.12s';
      el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.08)'; });
      el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });
      markersRef.current.push(
        new mapboxgl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([bar.lng, bar.lat]).addTo(map),
      );
    });
  // selectedBarId 변경 시에만 별도로 실행
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBarId]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* 줌 안내 */}
      {mapReady && isClustered && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[400] pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-2 text-xs whitespace-nowrap"
            style={{
              background: 'rgba(10,10,22,0.82)',
              border: '1px solid rgba(79,195,247,0.22)',
              borderRadius: '99px',
              color: 'rgba(255,255,255,0.55)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            }}>
            <span>🔍</span>
            <span>확대하면 개별 혼술바를 볼 수 있어요</span>
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
