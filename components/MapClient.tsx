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
const INIT_LNG  = 126.9918;
const INIT_LAT  = 37.5519;
const INIT_ZOOM = 11;

// 이 줌 이하면 클러스터 뷰 (Mapbox는 숫자 클수록 확대)
const CLUSTER_ZOOM = 12;

// 양피지 느낌 CSS 필터 — 맵 캔버스에만 적용 (마커는 별도)
const MAP_CANVAS_FILTER = 'sepia(0.38) brightness(1.12) saturate(0.58) contrast(0.87)';

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

// ── 유틸 함수 ──────────────────────────────────────────────────────────
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
    const avgLat = cell.sumLat / n, avgLng = cell.sumLng / n;
    const male   = cell.bars.reduce((s, b) => s + b.stats.male, 0);
    const female = cell.bars.reduce((s, b) => s + b.stats.female, 0);
    return { lat: avgLat, lng: avgLng, male, female, count: n, label: getNearestArea(avgLat, avgLng) };
  });
}

function getOccupancyColor(total: number, capacity: number): string {
  const ratio = capacity > 0 ? total / capacity : 0;
  if (ratio < 0.4) return '#2d8a5e';
  if (ratio < 0.7) return '#b5730a';
  return '#a0332b';
}

/** 위경도 중심 + 반지름(m) → GeoJSON Polygon (원 근사) */
function createGeoJSONCircle(
  lat: number, lng: number, radiusMeters: number, points = 48,
): GeoJSON.Geometry {
  const coords: [number, number][] = [];
  const dLng = radiusMeters / (111320 * Math.cos((lat * Math.PI) / 180));
  const dLat = radiusMeters / 110540;
  for (let i = 0; i < points; i++) {
    const theta = (i / points) * 2 * Math.PI;
    coords.push([lng + dLng * Math.cos(theta), lat + dLat * Math.sin(theta)]);
  }
  coords.push(coords[0]);
  return { type: 'Polygon', coordinates: [coords] };
}

// ── 핀 HTML ────────────────────────────────────────────────────────────
function buildClusterHTML(cluster: Cluster): string {
  const total = cluster.male + cluster.female;
  const color = getOccupancyColor(total, cluster.count * 20);
  const statusLabel = total === 0 ? '한산' : color === '#2d8a5e' ? '여유' : color === '#b5730a' ? '보통' : '혼잡';

  return `
    <div style="position:relative;text-align:center;font-family:Georgia,'Times New Roman',serif;cursor:pointer;user-select:none;">
      <div style="
        position:relative;
        background:linear-gradient(160deg,#f9f1d8 0%,#f0e0a8 55%,#e6d08a 100%);
        border:2.5px solid #7a4f10;
        border-radius:3px;
        padding:9px 22px;
        box-shadow:3px 4px 10px rgba(60,30,0,0.45),inset 0 1px 0 rgba(255,255,255,0.55),inset 0 -1px 0 rgba(120,70,10,0.15);
        min-width:128px;
      ">
        <div style="position:absolute;left:-9px;top:50%;transform:translateY(-50%);
          width:18px;height:30px;
          background:linear-gradient(180deg,#e8c060 0%,#c8952a 48%,#e8c060 100%);
          border-radius:4px;border:2px solid #7a4f10;
          box-shadow:2px 2px 5px rgba(0,0,0,0.3);"></div>
        <div style="position:absolute;right:-9px;top:50%;transform:translateY(-50%);
          width:18px;height:30px;
          background:linear-gradient(180deg,#e8c060 0%,#c8952a 48%,#e8c060 100%);
          border-radius:4px;border:2px solid #7a4f10;
          box-shadow:2px 2px 5px rgba(0,0,0,0.3);"></div>
        <div style="font-size:13px;font-weight:800;color:#3a1c00;white-space:nowrap;letter-spacing:-0.3px;text-shadow:0 1px 0 rgba(255,255,255,0.5);">
          ${cluster.label} 혼술바
        </div>
        <div style="margin-top:5px;display:flex;gap:7px;justify-content:center;align-items:center;">
          <span style="font-size:11px;color:#2a4e7a;font-weight:700;">♂ ${cluster.male}</span>
          <span style="font-size:9px;color:#9a7030;opacity:0.6;">·</span>
          <span style="font-size:11px;color:#7a2848;font-weight:700;">♀ ${cluster.female}</span>
          <span style="font-size:9px;color:#9a7030;opacity:0.6;">·</span>
          <span style="font-size:10px;color:${color};font-weight:700;">${cluster.count}곳 ${statusLabel}</span>
        </div>
      </div>
      <div style="display:flex;justify-content:center;">
        <div style="width:0;height:0;border-left:9px solid transparent;border-right:9px solid transparent;border-top:11px solid #7a4f10;"></div>
      </div>
    </div>`;
}

function buildPinHTML(bar: BarWithStats, isSelected: boolean): string {
  const { male, female } = bar.stats;
  const total  = male + female;
  const color  = getOccupancyColor(total, bar.capacity);
  const statusLabel = total === 0 ? '한산' : color === '#2d8a5e' ? '여유' : color === '#b5730a' ? '보통' : '혼잡';
  const pinFill = isSelected ? '#c8952a' : '#c0392b';
  const pinDark = isSelected ? '#7a4f10' : '#8b2020';
  const shadow  = isSelected
    ? '0 0 0 2.5px #c8952a, 3px 4px 10px rgba(60,30,0,0.5)'
    : '2px 3px 8px rgba(60,30,0,0.38)';

  return `
    <div style="position:relative;text-align:center;font-family:Georgia,serif;cursor:pointer;user-select:none;">
      <div style="
        position:relative;
        background:linear-gradient(160deg,#f9f1d8 0%,#f0e0a8 55%,#e6d08a 100%);
        border:2px solid #7a4f10;
        border-radius:3px;
        padding:5px 17px;
        margin-bottom:5px;
        box-shadow:${shadow},inset 0 1px 0 rgba(255,255,255,0.55);
        min-width:92px;
      ">
        <div style="position:absolute;left:-7px;top:50%;transform:translateY(-50%);
          width:14px;height:22px;
          background:linear-gradient(180deg,#e8c060,#c8952a,#e8c060);
          border-radius:3px;border:1.5px solid #7a4f10;
          box-shadow:1px 1px 3px rgba(0,0,0,0.25);"></div>
        <div style="position:absolute;right:-7px;top:50%;transform:translateY(-50%);
          width:14px;height:22px;
          background:linear-gradient(180deg,#e8c060,#c8952a,#e8c060);
          border-radius:3px;border:1.5px solid #7a4f10;
          box-shadow:1px 1px 3px rgba(0,0,0,0.25);"></div>
        <div style="font-size:11px;font-weight:800;color:#3a1c00;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:115px;letter-spacing:-0.3px;text-shadow:0 1px 0 rgba(255,255,255,0.5);">
          ${bar.name}
        </div>
        <div style="display:flex;gap:5px;justify-content:center;margin-top:3px;align-items:center;">
          <span style="font-size:10px;color:#2a4e7a;font-weight:700;">♂ ${male}</span>
          <span style="font-size:10px;color:#7a2848;font-weight:700;">♀ ${female}</span>
          <span style="font-size:8px;color:${color};font-weight:800;background:rgba(0,0,0,0.07);padding:1px 5px;border-radius:99px;border:1px solid ${color}55;">${statusLabel}</span>
        </div>
      </div>
      <div style="display:flex;justify-content:center;">
        <svg width="20" height="27" viewBox="0 0 20 27" style="filter:drop-shadow(1px 2px 3px rgba(0,0,0,0.3));" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 26 C10 26,1 16,1 10 A9 9 0 0 1 19 10 C19 16,10 26,10 26Z" fill="${pinFill}" stroke="${pinDark}" stroke-width="1.5"/>
          <circle cx="10" cy="10" r="4" fill="rgba(255,255,255,0.32)"/>
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
  const [zoom,       setZoom]      = useState(INIT_ZOOM);

  // ── 지도 초기화 ──
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center:  [INIT_LNG, INIT_LAT],
      zoom:    INIT_ZOOM,
      minZoom: 10,
      maxZoom: 17,
      attributionControl: false,
    });

    // 줌 버튼 (우하단)
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');

    map.on('load', () => {
      // ── 캔버스에만 양피지 필터 적용 (마커는 영향 없음) ──
      map.getCanvas().style.filter = MAP_CANVAS_FILTER;

      // ── 빈 GeoJSON 소스 + 서클 레이어 등록 ──
      map.addSource('circles', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'circle-fill',
        type: 'fill',
        source: 'circles',
        paint: {
          'fill-color':   ['get', 'color'],
          'fill-opacity': ['get', 'fillOpacity'],
        },
      });

      map.addLayer({
        id: 'circle-line',
        type: 'line',
        source: 'circles',
        paint: {
          'line-color':   '#8b6010',
          'line-width':   1.5,
          'line-opacity': ['get', 'strokeOpacity'],
        },
      });

      setMapReady(true);
    });

    map.on('zoom', () => setZoom(map.getZoom()));

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // ── 마커 & 서클 업데이트 ──
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const isClustered = zoom < CLUSTER_ZOOM;

    // 기존 마커 제거
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const circleFeatures: GeoJSON.Feature[] = [];

    if (isClustered) {
      const gridSize = zoom < 11 ? 0.05 : 0.025;
      const clusters  = computeClusters(bars, gridSize);

      clusters.forEach(cluster => {
        const total  = cluster.male + cluster.female;
        const color  = getOccupancyColor(total, cluster.count * 20);
        const radius = Math.min(2000, 800 + cluster.count * 250);

        circleFeatures.push(
          { type: 'Feature', geometry: createGeoJSONCircle(cluster.lat, cluster.lng, radius),
            properties: { color, fillOpacity: 0.07, strokeOpacity: 0.45 } },
          { type: 'Feature', geometry: createGeoJSONCircle(cluster.lat, cluster.lng, radius * 0.5),
            properties: { color, fillOpacity: 0.11, strokeOpacity: 0.28 } },
        );

        const el = document.createElement('div');
        el.innerHTML = buildClusterHTML(cluster);
        el.addEventListener('click', () =>
          map.flyTo({ center: [cluster.lng, cluster.lat], zoom: 13, duration: 600 }),
        );

        markersRef.current.push(
          new mapboxgl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([cluster.lng, cluster.lat])
            .addTo(map),
        );
      });

    } else {
      bars.forEach(bar => {
        const total = bar.stats.male + bar.stats.female;
        const color = getOccupancyColor(total, bar.capacity);

        circleFeatures.push(
          { type: 'Feature', geometry: createGeoJSONCircle(bar.lat, bar.lng, 320),
            properties: { color, fillOpacity: 0.09, strokeOpacity: 0.40 } },
          { type: 'Feature', geometry: createGeoJSONCircle(bar.lat, bar.lng, 140),
            properties: { color, fillOpacity: 0.14, strokeOpacity: 0.25 } },
        );

        const isSelected = bar.id === selectedBarId;
        const el = document.createElement('div');
        el.innerHTML = buildPinHTML(bar, isSelected);
        el.addEventListener('click', () => onBarClick(bar.id));
        el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.05)'; });
        el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });
        el.style.transition = 'transform 0.15s';

        markersRef.current.push(
          new mapboxgl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([bar.lng, bar.lat])
            .addTo(map),
        );
      });
    }

    // 서클 데이터 갱신
    (map.getSource('circles') as mapboxgl.GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: circleFeatures,
    });

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
              background: 'rgba(240,224,168,0.92)',
              border: '1.5px solid #8b6010',
              borderRadius: '3px',
              color: '#5a3010',
              fontFamily: "Georgia, 'Times New Roman', serif",
              boxShadow: '2px 3px 8px rgba(60,30,0,0.3)',
            }}>
            <span className="text-sm">🗺</span>
            클릭하거나 확대하면 개별 혼술바를 탐방할 수 있어요
          </div>
        </div>
      )}

      {/* 로딩 */}
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center"
          style={{ background: '#f0e0a8' }}>
          <div className="text-center space-y-3">
            <div className="text-4xl animate-bounce">🗺️</div>
            <p className="text-sm" style={{ color: '#8b6010', fontFamily: 'Georgia, serif' }}>
              지도 펼치는 중...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
