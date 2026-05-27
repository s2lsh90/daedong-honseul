'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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

// ── 서울 지하철 노선 GeoJSON (공식 색상, 주요 역 좌표) ─────────────────
// 좌표: [경도(lng), 위도(lat)] — Mapbox 표준
const METRO_GEOJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    // 1호선 Blue #0052A4
    { type: 'Feature', properties: { color: '#0052A4' }, geometry: { type: 'LineString', coordinates: [
      [126.8818,37.5023],[126.9057,37.5149],[126.9238,37.5172],[126.9457,37.5264],
      [126.9707,37.5551],[126.9774,37.5652],[126.9918,37.5666],[127.0176,37.5787],
      [127.0391,37.5797],[127.0617,37.5881],
    ]}},
    // 2호선 Green #00A84D (순환)
    { type: 'Feature', properties: { color: '#00A84D' }, geometry: { type: 'LineString', coordinates: [
      [126.9774,37.5652],[126.9918,37.5659],[127.0090,37.5647],[127.0266,37.5613],
      [127.0391,37.5613],[127.0565,37.5443],[127.0706,37.5408],[127.0940,37.5336],
      [127.1008,37.5133],[127.0940,37.5061],[127.0737,37.5202],[127.0627,37.5088],
      [127.0276,37.4979],[127.0137,37.4930],[126.9975,37.4810],[126.9784,37.4765],
      [126.9528,37.4808],[126.9297,37.4842],[126.9006,37.4932],[126.8960,37.5257],
      [126.9006,37.5377],[126.9137,37.5493],[126.9238,37.5572],[126.9609,37.5585],
      [126.9774,37.5652],
    ]}},
    // 3호선 Orange #EF7C1C
    { type: 'Feature', properties: { color: '#EF7C1C' }, geometry: { type: 'LineString', coordinates: [
      [126.8349,37.6581],[126.9224,37.6183],[126.9559,37.5932],[126.9777,37.5832],
      [126.9918,37.5719],[127.0057,37.5464],[127.0057,37.5241],[127.0267,37.5114],
      [127.0627,37.4879],[127.0827,37.4962],[127.1097,37.4916],
    ]}},
    // 4호선 SkyBlue #00A5DE
    { type: 'Feature', properties: { color: '#00A5DE' }, geometry: { type: 'LineString', coordinates: [
      [127.0681,37.6556],[127.0175,37.5916],[127.0083,37.5799],[127.0024,37.5694],
      [127.0090,37.5647],[126.9827,37.5541],[126.9707,37.5441],[126.9784,37.4765],
      [126.9630,37.4521],[126.9392,37.4260],[126.8391,37.3217],
    ]}},
    // 5호선 Purple #996CAC
    { type: 'Feature', properties: { color: '#996CAC' }, geometry: { type: 'LineString', coordinates: [
      [126.8012,37.5701],[126.8690,37.5538],[126.9081,37.5538],[126.9465,37.5416],
      [126.9746,37.5707],[126.9918,37.5719],[127.0391,37.5613],[127.0706,37.5408],
      [127.0980,37.5382],[127.1241,37.5382],[127.1517,37.5367],
    ]}},
    // 6호선 Brown #CD7C2F
    { type: 'Feature', properties: { color: '#CD7C2F' }, geometry: { type: 'LineString', coordinates: [
      [126.9101,37.5981],[126.9224,37.6183],[126.9137,37.5493],[126.9359,37.5510],
      [126.9465,37.5416],[126.9768,37.5375],[127.0022,37.5348],[127.0198,37.5167],
      [127.0266,37.5613],[127.0090,37.5647],
    ]}},
    // 7호선 Olive #747F00
    { type: 'Feature', properties: { color: '#747F00' }, geometry: { type: 'LineString', coordinates: [
      [127.0454,37.6865],[127.0681,37.6280],[127.0566,37.5880],[127.0706,37.5408],
      [127.0566,37.5443],[127.0397,37.5209],[126.9960,37.5104],[126.9617,37.4874],
      [126.9101,37.5011],[126.9006,37.4932],[126.8818,37.5023],[126.7936,37.5032],
    ]}},
    // 8호선 Pink #E6186C
    { type: 'Feature', properties: { color: '#E6186C' }, geometry: { type: 'LineString', coordinates: [
      [127.1241,37.5382],[127.1100,37.5026],[127.1008,37.5133],[127.0940,37.5061],
      [127.1080,37.4811],[127.1241,37.4765],[127.1392,37.4381],[127.2030,37.4290],
    ]}},
    // 9호선 Gold #BDB092
    { type: 'Feature', properties: { color: '#BDB092' }, geometry: { type: 'LineString', coordinates: [
      [126.8012,37.5701],[126.8690,37.5538],[126.9006,37.5377],[126.9359,37.5348],
      [126.9609,37.5267],[126.9784,37.5139],[127.0022,37.5012],[127.0137,37.4930],
      [127.0276,37.4979],[127.0627,37.5088],[127.1241,37.5382],
    ]}},
    // 신분당선 Red #D31145
    { type: 'Feature', properties: { color: '#D31145' }, geometry: { type: 'LineString', coordinates: [
      [127.0276,37.4979],[127.0398,37.4658],[127.0501,37.4333],
      [127.0627,37.3983],[127.0985,37.3908],[127.1073,37.2981],
    ]}},
    // 수인분당선 Yellow-Orange #F5A200
    { type: 'Feature', properties: { color: '#F5A200' }, geometry: { type: 'LineString', coordinates: [
      [127.0391,37.5613],[127.0627,37.5088],[127.1008,37.5133],
      [127.0985,37.3908],[127.0627,37.2800],[127.0283,37.2644],
    ]}},
    // 경의중앙선 Teal #77C4A3
    { type: 'Feature', properties: { color: '#77C4A3' }, geometry: { type: 'LineString', coordinates: [
      [126.7936,37.5700],[126.8488,37.5585],[126.9137,37.5493],
      [126.9465,37.5416],[126.9707,37.5551],[127.0391,37.5613],[127.0617,37.5881],
    ]}},
    // 공항철도 Blue #0090D2
    { type: 'Feature', properties: { color: '#0090D2' }, geometry: { type: 'LineString', coordinates: [
      [126.4912,37.4481],[126.6120,37.4812],[126.7936,37.5700],
      [126.8488,37.5585],[126.9238,37.5572],[126.9465,37.5416],[126.9707,37.5551],
    ]}},
  ],
};

// ── 주요 지하철역 GeoJSON (커스텀 역이름 레이블용) ─────────────────────
const STATION_GEOJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    // [lng, lat], n = 역이름
    [[126.9707,37.5551],'서울역'],[[126.9774,37.5652],'시청'],
    [[126.9827,37.5699],'종각'],[[126.9918,37.5719],'종로3가'],
    [[127.0090,37.5715],'동대문'],[[127.0057,37.5641],'동대입구'],
    [[126.9827,37.5659],'을지로입구'],[[126.9918,37.5660],'을지로3가'],
    [[126.9238,37.5572],'홍대입구'],[[126.9137,37.5493],'합정'],
    [[126.9224,37.5530],'상수'],[[126.9006,37.5538],'망원'],
    [[126.9369,37.5596],'신촌'],[[126.9465,37.5582],'이대'],
    [[126.9519,37.5427],'공덕'],[[126.9652,37.5296],'용산'],
    [[126.9945,37.5347],'이태원'],[[126.9882,37.5303],'녹사평'],
    [[127.0276,37.4979],'강남'],[[127.0366,37.5001],'역삼'],
    [[127.0490,37.5046],'선릉'],[[127.0627,37.5088],'삼성'],
    [[127.0940,37.5133],'잠실'],[[127.0868,37.5089],'잠실나루'],
    [[127.0706,37.5408],'건대입구'],[[127.0566,37.5443],'성수'],
    [[127.0462,37.5467],'뚝섬'],[[127.0391,37.5613],'왕십리'],
    [[126.9784,37.4765],'사당'],[[127.0137,37.4930],'교대'],
    [[127.0057,37.5041],'고속터미널'],[[126.9297,37.4842],'신림'],
    [[126.9528,37.4808],'서울대입구'],[[127.0681,37.6556],'노원'],
    [[127.0278,37.5274],'압구정'],[[127.0198,37.5167],'신사'],
    [[126.9006,37.5377],'당산'],[[126.9006,37.5097],'신도림'],
    [[126.8960,37.4932],'구로디지털단지'],[[126.9081,37.5218],'영등포시장'],
    [[127.1241,37.5382],'강동/천호'],[[127.0266,37.5581],'한양대'],
    [[126.9559,37.5932],'불광'],[[126.9224,37.6183],'연신내'],
    [[127.0175,37.5916],'성신여대'],[[127.0627,37.4879],'양재'],
  ].map(([c,n]) => ({
    type: 'Feature' as const,
    properties: { n },
    geometry: { type: 'Point' as const, coordinates: c as [number,number] },
  })),
};

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

// ── 체인명 추출 + 3D 글라스 타입 결정 ────────────────────────────────
const LOCATION_RE = /(서울|홍대|강남|신촌|이태원|합정|종로|성수|건대|신림|마포|혜화|압구정|선릉|잠실|분당|판교|여의도|용산|삼성|역삼|서초|방배|상수|연남|망원|공덕|문래|수원|의정부|노원|천호|성북|도봉|영등포|구로|관악|동작|은평|광진|중랑|동대문|강서|강동|송파)(점|지점|본점|\d+호점)?$/u;

function getChainName(name: string): string {
  return name.replace(LOCATION_RE, '').trim() || name;
}

function strHash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

type GlassType = 'beer' | 'whiskey' | 'wine';

function getGlassType(name: string): GlassType {
  if (/위스키|버번|바틀|블렌디드|싱글몰트/u.test(name)) return 'whiskey';
  if (/와인|비노|포도|리슬링|피노/u.test(name))          return 'wine';
  // 체인명 해시 → 3종 중 하나 고정 배정
  const chain = getChainName(name);
  const types: GlassType[] = ['beer', 'whiskey', 'wine'];
  return types[strHash(chain) % 3];
}

// 체인별 고정 강조색 (8색 팔레트 순환)
const CHAIN_PALETTE = ['#4fc3f7','#f9a8d4','#86efac','#fbbf24','#c084fc','#fb923c','#67e8f9','#a3e635'];
function getChainColor(name: string): string {
  return CHAIN_PALETTE[strHash(getChainName(name)) % CHAIN_PALETTE.length];
}

// ── 아이소메트릭 3D 글라스 SVG ─────────────────────────────────────────
// 크기: 기존 대비 ~55% 축소 / 색상: 지도 다크 네이비 톤으로 통일
// 앞면(#0a1428) + 오른쪽면(#030608) + 윗면(accent색) → 지도에 자연스럽게 녹아듦
// anchor='bottom' → SVG 맨 아래 그림자 = 지도 좌표 지면
function beerMugSVG(accent: string, selected: boolean): string {
  const h = accent.slice(1);
  const sel = selected;
  // isometric offset: dx=+7, dy=-5
  // 앞면: x=2..25, y=16..44 (23×28)
  // 오른쪽면: M25,16 L32,11 L32,39 L25,44
  // 윗면: M2,16 L25,16 L32,11 L9,11
  return `<svg width="38" height="54" viewBox="0 0 38 54" xmlns="http://www.w3.org/2000/svg">
  <!-- 지면 그림자 -->
  <ellipse cx="16" cy="52" rx="15" ry="3" fill="rgba(0,0,0,0.45)"/>
  <!-- ① 오른쪽면 (거의 검정) -->
  <path d="M25 16 L32 11 L32 39 L25 44 Z" fill="#03060e"/>
  <!-- ② 앞면 (지도 다크 네이비) -->
  <rect x="2" y="16" width="23" height="28" fill="#0a1428"/>
  <!-- accent 세로 반사선 (왼쪽 가장자리) -->
  <rect x="2" y="16" width="2.5" height="28" rx="1" fill="${accent}" opacity="0.4"/>
  ${sel ? `<rect x="2" y="16" width="23" height="28" fill="none" stroke="#fbbf24" stroke-width="1.5"/>` : ''}
  <!-- 손잡이 외곽(검정) + 측면(네이비) + accent 하이라이트 -->
  <path d="M25 21 C36 21 36 37 25 37" fill="none" stroke="#030608" stroke-width="7" stroke-linecap="round"/>
  <path d="M25 21 C34 21 34 37 25 37" fill="none" stroke="#0a1428" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M25 21 C32 22 32 36 25 37" fill="none" stroke="${accent}" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
  <!-- ③ 윗면 배경 (어두운 기저) -->
  <path d="M2 16 L25 16 L32 11 L9 11 Z" fill="#050c1a"/>
  <!-- 거품 표면 (흰색 — 위에서 내려다봄) -->
  <path d="M2 15 L25 15 L32 10 L9 10 Z" fill="rgba(255,255,255,0.82)"/>
  <ellipse cx="14" cy="13" rx="7"   ry="2.5" fill="white"/>
  <ellipse cx="22" cy="12" rx="4.5" ry="1.8" fill="white" opacity="0.9"/>
  <ellipse cx="8"  cy="13.5" rx="3" ry="1.3" fill="white" opacity="0.85"/>
  <!-- 림 accent 테두리 -->
  <path d="M2 15 L25 15 L32 10 L9 10 Z" fill="none"
    stroke="${sel ? '#fbbf24' : accent}" stroke-width="0.9" opacity="${sel ? 1 : 0.65}"/>
</svg>`;
}

function whiskeyGlassSVG(accent: string, selected: boolean): string {
  const h = accent.slice(1);
  const sel = selected;
  // 온더록스: 앞면(4,14)→(26,14)→(24,44)→(6,44) 22×30
  // 오른쪽: M26,14 L33,9 L31,39 L24,44  offset +7,-5
  // 윗면: M4,14 L26,14 L33,9 L11,9
  return `<svg width="38" height="52" viewBox="0 0 38 52" xmlns="http://www.w3.org/2000/svg">
  <!-- 지면 그림자 -->
  <ellipse cx="17" cy="50" rx="15" ry="3" fill="rgba(0,0,0,0.45)"/>
  <!-- ① 오른쪽면 (거의 검정) -->
  <path d="M26 14 L33 9 L31 39 L24 44 Z" fill="#03060e"/>
  <!-- ② 앞면 (지도 네이비) -->
  <path d="M4 14 L6 44 L24 44 L26 14 Z" fill="#0a1428"/>
  <!-- accent 세로 반사선 -->
  <path d="M4 14 L4.5 44 L7.5 44 L7 14 Z" fill="${accent}" opacity="0.4" rx="1"/>
  ${sel ? `<path d="M4 14 L6 44 L24 44 L26 14 Z" fill="none" stroke="#fbbf24" stroke-width="1.5"/>` : ''}
  <!-- ③ 윗면 배경 -->
  <path d="M4 14 L26 14 L33 9 L11 9 Z" fill="#050c1a"/>
  <!-- 액체 표면 (accent 컬러 — 위에서 내려다봄) -->
  <path d="M4 13 L26 13 L33 8 L11 8 Z" fill="${accent}" opacity="0.35"/>
  <path d="M5 12.5 L25 12.5 L32 8 L12 8 Z" fill="${accent}" opacity="0.45"/>
  <!-- 얼음 — 아이소메트릭 3면 -->
  <rect x="10" y="9" width="9"  height="6"  rx="0.8" fill="rgba(200,235,255,0.88)"/>
  <path d="M19 9  L23 6  L23 11 L19 14 Z"   fill="rgba(170,215,245,0.72)"/>
  <path d="M10 9  L19 9  L23 6  L14 6 Z"    fill="rgba(225,245,255,0.9)"/>
  <!-- 유리 두께선 -->
  <path d="M4 14 L26 14 L33 9 L11 9 Z" fill="none" stroke="rgba(5,10,25,0.95)" stroke-width="2"/>
  <path d="M4 13 L26 13 L33 8 L11 8 Z" fill="none"
    stroke="${sel ? '#fbbf24' : accent}" stroke-width="0.9" opacity="${sel ? 1 : 0.65}"/>
</svg>`;
}

function wineGlassSVG(accent: string, selected: boolean): string {
  const h = accent.slice(1);
  const sel = selected;
  // 볼(상)+스템+받침, 전체 높이 60
  // 볼 앞면: bezier, 오른쪽면, 윗면 (와인 액체)
  return `<svg width="36" height="62" viewBox="0 0 36 62" xmlns="http://www.w3.org/2000/svg">
  <!-- 지면 그림자 -->
  <ellipse cx="15" cy="60" rx="13" ry="3" fill="rgba(0,0,0,0.45)"/>

  <!-- === 받침 === -->
  <path d="M21 52 L27 48 L27 52 L21 56 Z" fill="#03060e"/>
  <rect x="8" y="52" width="13" height="4" rx="2" fill="#0a1428"/>
  <path d="M8 52 L21 52 L27 48 L14 48 Z" fill="#050c1a"/>

  <!-- === 스템 === -->
  <path d="M14 33 L17 30 L17 48 L14 52 Z" fill="#03060e"/>
  <rect x="12" y="33" width="4" height="19" fill="#0a1428"/>

  <!-- === 볼 === -->
  <!-- 오른쪽면 -->
  <path d="M25 8 L30 5 L28 31 L22 33 Z" fill="#03060e"/>
  <!-- 앞면 (다크 네이비) -->
  <path d="M3 6 C2 20 5 33 14 33 C23 33 27 20 26 6 Z" fill="#0a1428"/>
  <!-- accent 세로 반사선 (볼 왼쪽) -->
  <path d="M3 6 C2 20 5 33 7 33 C5 33 4 20 4 6 Z" fill="${accent}" opacity="0.35"/>
  ${sel ? `<path d="M3 6 C2 20 5 33 14 33 C23 33 27 20 26 6 Z" fill="none" stroke="#fbbf24" stroke-width="1.5"/>` : ''}
  <!-- ③ 볼 윗면 배경 -->
  <path d="M3 6 L26 6 L30 3 L7 3 Z" fill="#050c1a"/>
  <!-- 와인 표면 (accent 컬러 — 위에서 내려다봄) -->
  <path d="M3 5 L26 5 L30 2 L7 2 Z" fill="${accent}" opacity="0.4"/>
  <path d="M4 4.5 L25 4.5 L29 2 L8 2 Z" fill="${accent}" opacity="0.55"/>
  <!-- 와인 하이라이트 -->
  <ellipse cx="14" cy="3.5" rx="7" ry="1.5" fill="${accent}" opacity="0.3"/>
  <!-- 유리 두께선 -->
  <path d="M3 6 L26 6 L30 3 L7 3 Z" fill="none" stroke="rgba(3,5,15,0.95)" stroke-width="2"/>
  <path d="M3 5 L26 5 L30 2 L7 2 Z" fill="none"
    stroke="${sel ? '#fbbf24' : accent}" stroke-width="0.9" opacity="${sel ? 1 : 0.65}"/>
</svg>`;
}

function buildGlassSVG(glassType: GlassType, accent: string, selected: boolean): string {
  if (glassType === 'whiskey') return whiskeyGlassSVG(accent, selected);
  if (glassType === 'wine')    return wineGlassSVG(accent, selected);
  return beerMugSVG(accent, selected);
}

// ── 한국어 레이블 ─────────────────────────────────────────────────────
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

// ── 타일 기본 색상 ────────────────────────────────────────────────────
function setTileColors(map: mapboxgl.Map) {
  const pairs: [string, string, string][] = [
    ['land',                     'background-color', '#08081a'],
    ['land-structure',           'background-color', '#08081a'],
    ['landcover',                'fill-color',       '#08081a'],
    ['landuse',                  'fill-color',       '#0c0c1e'],
    ['landuse-residential',      'fill-color',       '#0c0c1e'],
    ['national-park',            'fill-color',       '#0b1710'],
    ['landuse_overlay',          'fill-color',       '#0b1710'],
    ['water',                    'fill-color',       '#070f1c'],
    ['water-depth',              'fill-color',       '#060d18'],
    ['waterway',                 'line-color',       '#0a1525'],
    ['waterway-shadow',          'line-color',       '#0a1525'],
    ['road-motorway-trunk',      'line-color',       '#141e32'],
    ['road-primary',             'line-color',       '#111828'],
    ['road-secondary-tertiary',  'line-color',       '#0e1520'],
    ['road-street',              'line-color',       '#0d1320'],
    ['road-local',               'line-color',       '#0b1020'],
    ['road-pedestrian',          'line-color',       '#0d1220'],
    ['road-minor',               'line-color',       '#0b1020'],
    ['road-motorway-trunk-case', 'line-color',       '#0a1028'],
    ['road-primary-case',        'line-color',       '#0a1028'],
    ['building',                 'fill-color',       '#0d1220'],
    ['building-outline',         'line-color',       '#111828'],
    ['aeroway-polygon',          'fill-color',       '#0b0f1a'],
    ['aeroway-line',             'line-color',       '#131c2e'],
    ['tunnel-motorway-trunk',    'line-color',       '#0d1528'],
    ['tunnel-primary',           'line-color',       '#0c1325'],
  ];
  for (const [id, prop, color] of pairs) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    try { map.setPaintProperty(id, prop as any, color); } catch { /* skip */ }
  }
}

/** 서울 지하철 — 커스텀 GeoJSON 소스로 공식 노선색 + glow */
function setTransitStyle(map: mapboxgl.Map) {
  // 기존 road-rail 숨기기
  for (const id of ['road-rail', 'road-rail-tracks', 'transit-line']) {
    try { map.setLayoutProperty(id, 'visibility', 'none'); } catch { /* skip */ }
  }

  // GeoJSON 소스 등록 (이미 있으면 skip)
  if (!map.getSource('metro')) {
    map.addSource('metro', { type: 'geojson', data: METRO_GEOJSON });
  }

  const insertBefore = map.getLayer('transit-label') ? 'transit-label'
    : map.getLayer('road-label') ? 'road-label'
    : undefined;

  // glow 레이어
  if (!map.getLayer('metro-glow')) {
    try {
      map.addLayer({
        id: 'metro-glow',
        type: 'line',
        source: 'metro',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 12, 14, 22] as mapboxgl.Expression,
          'line-opacity': 0.18,
          'line-blur': 8,
        },
      }, insertBefore);
    } catch { /* skip */ }
  }

  // main 레이어 (이전보다 약간 얇게)
  if (!map.getLayer('metro-lines')) {
    try {
      map.addLayer({
        id: 'metro-lines',
        type: 'line',
        source: 'metro',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 12, 3, 14, 4.5, 16, 6] as mapboxgl.Expression,
          'line-opacity': 0.88,
        },
      }, insertBefore);
    } catch { /* skip */ }
  }

  // 기존 transit-label 강화 (존재하면)
  for (const lid of ['transit-label']) {
    try { map.setLayoutProperty(lid, 'visibility', 'visible'); } catch {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    try { map.setPaintProperty(lid, 'text-color' as any, 'rgba(255,255,255,0.0)'); } catch {}
    // 기존 레이블은 숨기고 커스텀으로 대체
  }

  // ── 커스텀 역이름 레이어 (항상 표시, 크고 선명하게) ──────────────────
  if (!map.getSource('stations')) {
    map.addSource('stations', { type: 'geojson', data: STATION_GEOJSON });
  }
  // 역 도트
  if (!map.getLayer('station-dots')) {
    try {
      map.addLayer({
        id: 'station-dots',
        type: 'circle',
        source: 'stations',
        minzoom: 10,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3.5, 14, 5.5] as mapboxgl.Expression,
          'circle-color': '#ffffff',
          'circle-stroke-color': '#08081a',
          'circle-stroke-width': 2,
          'circle-opacity': 0.95,
        },
      });
    } catch { /* skip */ }
  }
  // 역 이름 레이블
  if (!map.getLayer('station-labels')) {
    try {
      map.addLayer({
        id: 'station-labels',
        type: 'symbol',
        source: 'stations',
        minzoom: 10,
        layout: {
          'text-field': ['get', 'n'] as mapboxgl.Expression,
          'text-size': ['interpolate', ['linear'], ['zoom'], 10, 10.5, 12, 12.5, 14, 14] as mapboxgl.Expression,
          'text-offset': [0, 1.1] as [number, number],
          'text-anchor': 'top',
          'text-allow-overlap': false,
          'text-ignore-placement': false,
        },
        paint: {
          'text-color': 'rgba(255,255,255,0.97)',
          'text-halo-color': 'rgba(4,4,18,0.99)',
          'text-halo-width': 2.5,
        },
      });
    } catch { /* skip */ }
  }
}

/** 레이블 정리: 동/구/시 지명만 + POI 숨김 */
function setLabelStyle(map: mapboxgl.Map) {
  try {
    map.setFilter('place-label', [
      'match', ['get', 'class'],
      ['neighbourhood', 'suburb', 'district', 'city', 'town'],
      true, false,
    ]);
  } catch { /* skip */ }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  try { map.setPaintProperty('place-label', 'text-color' as any, [
    'match', ['get', 'class'],
    ['city'], 'rgba(255,255,255,0.80)',
    ['suburb','district'], 'rgba(255,255,255,0.58)',
    'rgba(255,255,255,0.42)',
  ]); } catch {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  try { map.setPaintProperty('place-label', 'text-halo-color' as any, 'rgba(8,8,26,0.9)'); } catch {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  try { map.setPaintProperty('place-label', 'text-halo-width' as any, 1.2); } catch {}
  try { map.setLayoutProperty('poi-label', 'visibility', 'none'); } catch {}
  for (const id of ['building-number-label', 'gate-label', 'address-label']) {
    try { map.setLayoutProperty(id, 'visibility', 'none'); } catch {}
  }
}

// ── 클러스터 핀 HTML ──────────────────────────────────────────────────
function buildClusterHTML(cluster: Cluster): string {
  const total = cluster.male + cluster.female;
  const occ   = getOccupancyColor(total, cluster.count * 20);
  return `<div style="text-align:center;cursor:pointer;user-select:none;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="
      background:rgba(10,10,22,0.93);border:1px solid rgba(79,195,247,0.3);
      border-radius:8px;padding:5px 12px;
      box-shadow:0 0 16px rgba(79,195,247,0.1),0 4px 16px rgba(0,0,0,0.6);
      white-space:nowrap;">
      <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.85);
        letter-spacing:0.2px;margin-bottom:3px;">${cluster.label}</div>
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

// ── 아이소메트릭 글라스 마커 HTML ─────────────────────────────────────
// anchor='bottom' → div 맨 아래 = SVG 지면 그림자 = 지도 좌표 (건물처럼 서 있음)
function buildPinHTML(bar: BarWithStats, isSelected: boolean): string {
  const { male, female } = bar.stats;
  const occ       = getOccupancyColor(male + female, bar.capacity);
  const glassType = getGlassType(bar.name);
  const accent    = getChainColor(bar.name);
  const glassSVG  = buildGlassSVG(glassType, accent, isSelected);
  const shortName = bar.name.length > 9 ? bar.name.slice(0, 8) + '…' : bar.name;
  const labelBorder = isSelected ? 'rgba(251,191,36,0.65)' : `${accent}50`;

  // 라벨(위) → 글라스 SVG(아래) 순서로 쌓아야
  // anchor:bottom 기준으로 SVG 바닥 그림자가 정확히 지도 좌표에 닿음
  return `<div style="
    display:flex;flex-direction:column;align-items:center;
    cursor:pointer;user-select:none;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <!-- 정보 라벨 (소형 · 반투명) -->
    <div style="
      background:rgba(5,8,20,0.82);
      border:1px solid ${labelBorder};
      border-radius:4px;padding:2px 6px 1px;
      margin-bottom:1px;
      box-shadow:0 1px 6px rgba(0,0,0,0.5);
      white-space:nowrap;">
      <div style="font-size:8px;font-weight:700;color:rgba(255,255,255,0.85);
        letter-spacing:0.1px;margin-bottom:1px;">${shortName}</div>
      <div style="display:flex;gap:4px;justify-content:center;align-items:center;">
        <span style="font-size:7.5px;color:#93c5fd;font-weight:600;">♂${male}</span>
        <span style="font-size:7.5px;color:#f9a8d4;font-weight:600;">♀${female}</span>
        <span style="display:inline-block;width:4px;height:4px;border-radius:50%;
          background:${occ.color};flex-shrink:0;"></span>
      </div>
    </div>
    <!-- 아이소메트릭 글라스 (SVG 바닥 그림자가 지도 지면) -->
    ${glassSVG}
  </div>`;
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────
export default function MapClient({ bars, onBarClick, selectedBarId }: Props) {
  const containerRef    = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<mapboxgl.Map | null>(null);
  const markersRef      = useRef<mapboxgl.Marker[]>([]);
  const mapReadyRef     = useRef(false);
  const introTimersRef  = useRef<ReturnType<typeof setTimeout>[]>([]);
  const zoomRef         = useRef(11);
  const isClusteredRef  = useRef(true);
  const [isClustered,   setIsClustered]  = useState(true);
  const [mapReady,      setMapReady]     = useState(false);
  const [introText,     setIntroText]    = useState('지구를 탐색 중...');

  // ── 인트로 스킵 ─────────────────────────────────────────────────────
  const skipIntro = useCallback(() => {
    if (mapReadyRef.current || !mapRef.current) return;
    introTimersRef.current.forEach(clearTimeout);
    introTimersRef.current = [];
    mapRef.current.stop();
    mapRef.current.jumpTo({ center: [INIT_LNG, INIT_LAT], zoom: 11, pitch: 45, bearing: -10 });
    mapRef.current.setMinZoom(10);
    mapReadyRef.current    = true;
    zoomRef.current        = 11;
    isClusteredRef.current = false;
    setMapReady(true);
    setIsClustered(false);
  }, []);

  // ── 지도 초기화 ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      projection: 'globe' as any,
      center:  [126.0, 30.0],
      zoom:    2,
      pitch:   0,
      bearing: 10,
      maxZoom: 17,
      maxPitch: 60,
      attributionControl: false,
      fadeDuration: 0,
      crossSourceCollisions: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'bottom-right');
    map.on('click',      skipIntro);
    map.on('touchstart', skipIntro);

    map.on('load', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (map as any).setFog({
        color: 'rgba(120,160,210,0.4)', 'high-color': 'rgba(20,60,180,0.9)',
        'horizon-blend': 0.04, 'space-color': '#08081a', 'star-intensity': 0.85,
      });

      setKorean(map);
      setTileColors(map);
      setTransitStyle(map);
      setLabelStyle(map);
      map.on('style.load', () => {
        setKorean(map);
        setTileColors(map);
        setTransitStyle(map);
        setLabelStyle(map);
      });

      // 랜드마크 3D 빌딩 (height ≥ 100m)
      map.addLayer({
        id: '3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        filter: ['all', ['==', 'extrude', 'true'], ['>=', ['get', 'height'], 100]],
        type: 'fill-extrusion',
        minzoom: 15,
        paint: {
          'fill-extrusion-color': [
            'interpolate', ['linear'], ['get', 'height'],
            100, '#1e3a5f', 200, '#1e40af', 400, '#3b5bdb',
          ],
          'fill-extrusion-height':  ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'height']],
          'fill-extrusion-base':    ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'min_height']],
          'fill-extrusion-opacity': 0.75,
        },
      });
      for (const id of ['building', 'building-outline']) {
        try { map.setLayoutProperty(id, 'visibility', 'none'); } catch { /* skip */ }
      }

      const t1 = setTimeout(() => {
        setIntroText('서울로 이동 중...');
        map.flyTo({ center: [INIT_LNG, INIT_LAT], zoom: 11, pitch: 45, bearing: -10,
          duration: 5500, curve: 1.8, essential: true });
      }, 1200);
      const t2 = setTimeout(() => {
        if (mapReadyRef.current) return;
        map.setMinZoom(10);
        mapReadyRef.current = true;
        zoomRef.current = map.getZoom();
        const c = zoomRef.current < CLUSTER_ZOOM;
        isClusteredRef.current = c;
        setMapReady(true);
        setIsClustered(c);
      }, 1200 + 5500 + 300);
      introTimersRef.current = [t1, t2];
    });

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
  }, [skipIntro]);

  // ── 마커 업데이트 ─────────────────────────────────────────────────────
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
        const el    = document.createElement('div');
        const inner = document.createElement('div');
        inner.innerHTML = buildPinHTML(bar, bar.id === selectedBarId);
        inner.style.transition = 'transform 0.12s';
        el.appendChild(inner);
        el.addEventListener('click', () => onBarClick(bar.id));
        el.addEventListener('mouseenter', () => { inner.style.transform = 'scale(1.08)'; });
        el.addEventListener('mouseleave', () => { inner.style.transform = 'scale(1)'; });
        markersRef.current.push(
          new mapboxgl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([bar.lng, bar.lat]).addTo(map),
        );
      });
    }
  }, [bars, selectedBarId, onBarClick, mapReady, isClustered]);

  // 선택 상태만 변경 시 핀 갱신
  useEffect(() => {
    if (!mapReady || isClustered || !mapRef.current) return;
    const map = mapRef.current;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    bars.forEach(bar => {
      const el    = document.createElement('div');
      const inner = document.createElement('div');
      inner.innerHTML = buildPinHTML(bar, bar.id === selectedBarId);
      inner.style.transition = 'transform 0.12s';
      el.appendChild(inner);
      el.addEventListener('click', () => onBarClick(bar.id));
      el.addEventListener('mouseenter', () => { inner.style.transform = 'scale(1.08)'; });
      el.addEventListener('mouseleave', () => { inner.style.transform = 'scale(1)'; });
      markersRef.current.push(
        new mapboxgl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([bar.lng, bar.lat]).addTo(map),
      );
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBarId]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {mapReady && isClustered && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[400] pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-2 text-xs whitespace-nowrap"
            style={{
              background: 'rgba(10,10,22,0.82)', border: '1px solid rgba(79,195,247,0.22)',
              borderRadius: '99px', color: 'rgba(255,255,255,0.55)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            }}>
            <span>🔍</span>
            <span>확대하면 개별 혼술바를 볼 수 있어요</span>
          </div>
        </div>
      )}

      {!mapReady && (
        <div
          className="absolute inset-0 z-[400] flex flex-col items-center justify-end pb-14 cursor-pointer select-none"
          style={{ background: 'linear-gradient(to top, rgba(8,8,26,0.88) 0%, transparent 55%)' }}
          onClick={skipIntro}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: '#4fc3f7', boxShadow: '0 0 8px #4fc3f7' }} />
              <span className="text-sm font-medium"
                style={{ color: 'rgba(255,255,255,0.75)', letterSpacing: '0.5px' }}>
                {introText}
              </span>
            </div>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.28)', letterSpacing: '0.3px' }}>
              탭하면 바로 이동
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
