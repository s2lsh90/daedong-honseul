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

// ── 서울 지하철 노선 GeoJSON — 역 좌표와 정확히 일치하도록 재작성 ────────
// 모든 노드 좌표 = STATION_GEOJSON 좌표와 동일하게 맞춤
const METRO_GEOJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    // 1호선 Blue #0052A4 — 구로↔청량리
    { type: 'Feature', properties: { color: '#0052A4' }, geometry: { type: 'LineString', coordinates: [
      [126.8822,37.5015], // 구로
      [126.8912,37.5088], // 신도림
      [126.9068,37.5161], // 영등포
      [126.9205,37.5142], // 신길
      [126.9292,37.5124], // 대방
      [126.9426,37.5136], // 노량진
      [126.9652,37.5296], // 용산
      [126.9719,37.5450], // 남영
      [126.9707,37.5551], // 서울역
      [126.9774,37.5652], // 시청
      [126.9821,37.5702], // 종각
      [126.9918,37.5719], // 종로3가
      [126.9993,37.5702], // 종로5가
      [127.0157,37.5716], // 동묘앞
      [127.0083,37.5714], // 동대문
      [127.0224,37.5742], // 신설동
      [127.0363,37.5745], // 제기동
      [127.0452,37.5803], // 청량리
    ]}},

    // 2호선 Green #00A84D — 순환선 (모든 주요역 포함)
    { type: 'Feature', properties: { color: '#00A84D' }, geometry: { type: 'LineString', coordinates: [
      [126.9774,37.5652], // 시청
      [126.9827,37.5659], // 을지로입구
      [126.9918,37.5660], // 을지로3가
      [127.0009,37.5672], // 을지로4가
      [127.0092,37.5647], // 동대문역사문화공원
      [127.0176,37.5657], // 신당
      [127.0277,37.5613], // 상왕십리
      [127.0391,37.5613], // 왕십리
      [127.0489,37.5553], // 한양대
      [127.0540,37.5470], // 뚝섬
      [127.0566,37.5443], // 성수
      [127.0706,37.5408], // 건대입구
      [127.0837,37.5393], // 구의
      [127.0939,37.5341], // 강변
      [127.0939,37.5225], // 잠실나루
      [127.1000,37.5133], // 잠실
      [127.1092,37.5102], // 잠실새내
      [127.1187,37.5120], // 종합운동장
      [127.0627,37.5088], // 삼성
      [127.0490,37.5046], // 선릉
      [127.0366,37.5001], // 역삼
      [127.0276,37.4979], // 강남
      [127.0137,37.4930], // 교대
      [127.0022,37.4834], // 서초
      [126.9960,37.4813], // 방배
      [126.9784,37.4765], // 사당
      [126.9630,37.4748], // 낙성대
      [126.9528,37.4808], // 서울대입구
      [126.9297,37.4842], // 신림
      [126.9148,37.4870], // 신대방
      [126.9006,37.4932], // 구로디지털단지
      [126.8960,37.5010], // 대림
      [126.8912,37.5088], // 신도림
      [126.8963,37.5172], // 문래
      [126.9006,37.5261], // 영등포구청
      [126.9006,37.5377], // 당산
      [126.9137,37.5493], // 합정
      [126.9238,37.5572], // 홍대입구
      [126.9369,37.5596], // 신촌
      [126.9465,37.5582], // 이대
      [126.9559,37.5575], // 아현
      [126.9641,37.5597], // 충정로
      [126.9774,37.5652], // 시청 (순환 완성)
    ]}},

    // 3호선 Orange #EF7C1C — 구파발↔오금
    { type: 'Feature', properties: { color: '#EF7C1C' }, geometry: { type: 'LineString', coordinates: [
      [126.9224,37.6183], // 연신내
      [126.9321,37.6134], // 불광
      [126.9279,37.6027], // 녹번
      [126.9337,37.5901], // 홍제
      [126.9455,37.5792], // 무악재
      [126.9558,37.5743], // 독립문
      [126.9748,37.5776], // 경복궁
      [126.9851,37.5776], // 안국
      [126.9918,37.5719], // 종로3가
      [126.9967,37.5605], // 충무로
      [127.0057,37.5541], // 동대입구
      [127.0103,37.5491], // 약수
      [127.0178,37.5454], // 금호
      [127.0181,37.5388], // 옥수
      [127.0278,37.5274], // 압구정
      [127.0198,37.5167], // 신사
      [127.0100,37.5111], // 잠원
      [127.0057,37.5041], // 고속터미널
      [127.0137,37.4930], // 교대
      [127.0057,37.4856], // 남부터미널
      [127.0341,37.4840], // 양재
      [127.0470,37.4825], // 매봉
      [127.0550,37.4860], // 도곡
      [127.0627,37.4879], // 대치
      [127.1097,37.4916], // 가락시장
    ]}},

    // 4호선 SkyBlue #00A5DE — 당고개↔사당
    { type: 'Feature', properties: { color: '#00A5DE' }, geometry: { type: 'LineString', coordinates: [
      [127.0681,37.6556], // 노원
      [127.0474,37.6527], // 창동
      [127.0375,37.6489], // 쌍문
      [127.0246,37.6376], // 수유
      [127.0259,37.6257], // 미아
      [127.0282,37.6145], // 미아사거리
      [127.0240,37.6025], // 길음
      [127.0175,37.5916], // 성신여대입구
      [127.0076,37.5877], // 한성대입구
      [127.0024,37.5829], // 혜화
      [127.0083,37.5714], // 동대문
      [127.0092,37.5647], // 동대문역사문화공원
      [126.9967,37.5605], // 충무로
      [126.9874,37.5615], // 명동
      [126.9799,37.5583], // 회현
      [126.9707,37.5551], // 서울역
      [126.9730,37.5449], // 숙대입구
      [126.9772,37.5373], // 삼각지
      [126.9784,37.5302], // 신용산
      [126.9657,37.5211], // 이촌
      [126.9814,37.4978], // 동작
      [126.9828,37.4897], // 총신대입구
      [126.9784,37.4765], // 사당
    ]}},

    // 5호선 Purple #996CAC — 방화↔하남
    { type: 'Feature', properties: { color: '#996CAC' }, geometry: { type: 'LineString', coordinates: [
      [126.8012,37.5701], // 방화
      [126.8339,37.5592], // 마곡나루
      [126.8690,37.5538], // 발산
      [126.9068,37.5161], // 영등포시장 (5호선 경유)
      [126.9247,37.5214], // 여의도
      [126.9323,37.5276], // 여의나루
      [126.9465,37.5416], // 마포
      [126.9519,37.5427], // 공덕
      [126.9559,37.5473], // 애오개
      [126.9641,37.5597], // 충정로
      [126.9768,37.5718], // 광화문
      [126.9918,37.5719], // 종로3가
      [127.0009,37.5672], // 을지로4가
      [127.0092,37.5647], // 동대문역사문화공원
      [127.0176,37.5657], // 청구(신당)
      [127.0391,37.5613], // 왕십리
      [127.0706,37.5408], // 군자(건대입구)
      [127.0980,37.5382], // 강동
      [127.1241,37.5382], // 천호
      [127.1382,37.5382], // 강동(동쪽)
    ]}},

    // 6호선 Brown #CD7C2F — 응암↔봉화산
    { type: 'Feature', properties: { color: '#CD7C2F' }, geometry: { type: 'LineString', coordinates: [
      [126.9101,37.5981], // 응암(새절)
      [126.9279,37.6027], // 녹번
      [126.9321,37.6134], // 불광
      [126.9224,37.6183], // 연신내
      [126.9163,37.6057], // 새절(구산)
      [126.8966,37.5763], // DMC(디지털미디어시티)
      [126.9040,37.5549], // 마포구청
      [126.9101,37.5538], // 망원
      [126.9137,37.5493], // 합정
      [126.9178,37.5509], // 상수
      [126.9465,37.5416], // 마포
      [126.9519,37.5427], // 공덕
      [126.9641,37.5450], // 효창공원앞
      [126.9772,37.5373], // 삼각지
      [126.9882,37.5303], // 녹사평
      [126.9945,37.5347], // 이태원
      [127.0050,37.5420], // 한강진
      [127.0103,37.5491], // 약수
      [127.0160,37.5580], // 청구
      [127.0176,37.5657], // 신당
      [127.0157,37.5716], // 동묘앞
      [127.0220,37.5800], // 보문(창신)
      [127.0279,37.5895], // 고려대
      [127.0566,37.5880], // 태릉입구(석계)
    ]}},

    // 7호선 Olive #747F00 — 노원↔온수
    { type: 'Feature', properties: { color: '#747F00' }, geometry: { type: 'LineString', coordinates: [
      [127.0681,37.6556], // 노원
      [127.0681,37.6280], // 중계
      [127.0566,37.5880], // 먹골(태릉입구)
      [127.0706,37.5408], // 건대입구(군자)
      [127.0566,37.5443], // 어린이대공원(뚝섬유원지)
      [127.0391,37.5613], // 뚝섬유원지(상왕십리)
      [127.0264,37.5111], // 논현
      [127.0057,37.5041], // 고속터미널
      [126.9960,37.5104], // 이수(총신대입구)
      [126.9828,37.4897], // 남성
      [126.9006,37.4932], // 구로디지털단지
      [126.8820,37.4795], // 가산디지털단지
      [126.7936,37.5032], // 온수
    ]}},

    // 8호선 Pink #E6186C — 천호↔별내
    { type: 'Feature', properties: { color: '#E6186C' }, geometry: { type: 'LineString', coordinates: [
      [127.1241,37.5382], // 천호
      [127.1177,37.5200], // 몽촌토성(올림픽공원)
      [127.1000,37.5133], // 잠실
      [127.1097,37.4916], // 가락시장
      [127.1241,37.4765], // 문정
      [127.1392,37.4381], // 산성
    ]}},

    // 9호선 Gold #BDB092 — 마곡나루↔중앙보훈병원
    { type: 'Feature', properties: { color: '#BDB092' }, geometry: { type: 'LineString', coordinates: [
      [126.8339,37.5592], // 마곡나루
      [126.8690,37.5538], // 가양
      [126.9006,37.5377], // 당산
      [126.9247,37.5214], // 여의도
      [126.9426,37.5136], // 노들
      [127.0057,37.5041], // 고속터미널
      [127.0274,37.5044], // 신논현
      [127.0490,37.5046], // 선정릉(선릉)
      [127.0596,37.5155], // 봉은사
      [127.1187,37.5120], // 종합운동장
      [127.1241,37.5382], // 천호 방향
    ]}},

    // 신분당선 Red #D31145 — 강남↔광교
    { type: 'Feature', properties: { color: '#D31145' }, geometry: { type: 'LineString', coordinates: [
      [127.0276,37.4979], // 강남
      [127.0341,37.4840], // 양재
      [127.0501,37.4333], // 양재시민의숲
      [127.0985,37.3908], // 판교
    ]}},

    // 수인분당선 Yellow-Orange #F5A200 — 왕십리↔수원
    { type: 'Feature', properties: { color: '#F5A200' }, geometry: { type: 'LineString', coordinates: [
      [127.0391,37.5613], // 왕십리
      [127.0566,37.5443], // 서울숲
      [127.0627,37.5088], // 삼성
      [127.1000,37.5133], // 잠실
      [127.1097,37.4916], // 수서(가락시장)
      [127.0985,37.3908], // 판교
    ]}},

    // 경의중앙선 Teal #77C4A3 — 문산↔지평
    { type: 'Feature', properties: { color: '#77C4A3' }, geometry: { type: 'LineString', coordinates: [
      [126.7936,37.5700], // 능곡(수색)
      [126.8966,37.5763], // DMC
      [126.9238,37.5572], // 홍대입구
      [126.9519,37.5427], // 공덕
      [126.9707,37.5551], // 서울역
      [126.9652,37.5296], // 용산
      [126.9657,37.5211], // 이촌
      [127.0181,37.5388], // 옥수(응봉)
      [127.0391,37.5613], // 왕십리
      [127.0452,37.5803], // 청량리
    ]}},

    // 공항철도 Blue #0090D2 — 인천공항↔서울역
    { type: 'Feature', properties: { color: '#0090D2' }, geometry: { type: 'LineString', coordinates: [
      [126.4912,37.4481], // 인천공항
      [126.6120,37.4812], // 검암
      [126.8017,37.5627], // 김포공항
      [126.8339,37.5592], // 마곡나루
      [126.8966,37.5763], // DMC
      [126.9238,37.5572], // 홍대입구
      [126.9519,37.5427], // 공덕
      [126.9707,37.5551], // 서울역
    ]}},
  ],
};

// ── 주요 지하철역 GeoJSON (커스텀 역이름 레이블용) ─────────────────────
const STATION_GEOJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: ([
    // ── 도심/종로/광화문 ──────────────────────────────────────────────
    [[126.9707,37.5551],'서울역'],
    [[126.9774,37.5652],'시청'],
    [[126.9821,37.5702],'종각'],
    [[126.9918,37.5719],'종로3가'],
    [[126.9993,37.5702],'종로5가'],
    [[127.0157,37.5716],'동묘앞'],
    [[126.9768,37.5718],'광화문'],
    [[126.9748,37.5776],'경복궁'],
    [[126.9851,37.5776],'안국'],
    [[127.0024,37.5829],'혜화'],
    // ── 을지로/명동/충무로 ──────────────────────────────────────────
    [[126.9827,37.5659],'을지로입구'],
    [[126.9918,37.5660],'을지로3가'],
    [[127.0009,37.5672],'을지로4가'],
    [[126.9874,37.5615],'명동'],
    [[126.9799,37.5583],'회현'],
    [[126.9967,37.5605],'충무로'],
    // ── 동대문/신당/청량리 ──────────────────────────────────────────
    [[127.0083,37.5714],'동대문'],
    [[127.0092,37.5647],'동대문역사문화공원'],
    [[127.0057,37.5541],'동대입구'],   // 수정 (기존 37.5641 → 37.5541)
    [[127.0103,37.5491],'약수'],
    [[127.0181,37.5388],'옥수'],
    [[127.0176,37.5657],'신당'],
    [[127.0224,37.5742],'신설동'],
    [[127.0363,37.5745],'제기동'],
    [[127.0452,37.5803],'청량리'],
    // ── 홍대/마포/합정/신촌 ─────────────────────────────────────────
    [[126.9238,37.5572],'홍대입구'],
    [[126.9137,37.5493],'합정'],
    [[126.9178,37.5509],'상수'],
    [[126.9101,37.5538],'망원'],
    [[126.9369,37.5596],'신촌'],
    [[126.9465,37.5582],'이대'],
    [[126.9559,37.5575],'아현'],
    [[126.9641,37.5597],'충정로'],
    [[126.9519,37.5427],'공덕'],
    [[126.9465,37.5416],'마포'],
    [[126.9559,37.5473],'애오개'],
    // ── 용산/이태원/삼각지 ──────────────────────────────────────────
    [[126.9719,37.5450],'남영'],
    [[126.9652,37.5296],'용산'],
    [[126.9945,37.5347],'이태원'],
    [[126.9882,37.5303],'녹사평'],
    [[126.9772,37.5373],'삼각지'],
    [[126.9784,37.5302],'신용산'],
    [[126.9730,37.5449],'숙대입구'],
    [[126.9657,37.5211],'이촌'],
    // ── 여의도/노량진 ───────────────────────────────────────────────
    [[126.9247,37.5214],'여의도'],
    [[126.9323,37.5276],'여의나루'],
    [[126.9426,37.5136],'노량진'],
    [[126.9292,37.5124],'대방'],
    [[126.9205,37.5142],'신길'],
    [[126.9068,37.5161],'영등포'],
    // ── 강남/서초/사당/동작 ─────────────────────────────────────────
    [[127.0276,37.4979],'강남'],
    [[127.0366,37.5001],'역삼'],
    [[127.0490,37.5046],'선릉'],
    [[127.0627,37.5088],'삼성'],
    [[127.0137,37.4930],'교대'],
    [[127.0022,37.4834],'서초'],
    [[126.9960,37.4813],'방배'],
    [[126.9784,37.4765],'사당'],
    [[126.9630,37.4748],'낙성대'],
    [[126.9528,37.4808],'서울대입구'],
    [[126.9297,37.4842],'신림'],
    [[126.9148,37.4870],'신대방'],
    [[127.0341,37.4840],'양재'],    // 수정 (기존 127.0627,37.4879 → 127.0341,37.4840)
    [[127.0057,37.5041],'고속터미널'],
    [[127.0057,37.4856],'남부터미널'],
    [[126.9814,37.4978],'동작'],
    [[126.9828,37.4897],'총신대입구'],
    // ── 압구정/청담/강남구청/논현 ───────────────────────────────────
    [[127.0278,37.5274],'압구정'],
    [[127.0198,37.5167],'신사'],
    [[127.0264,37.5111],'논현'],
    [[127.0386,37.5111],'학동'],
    [[127.0470,37.5187],'강남구청'],
    [[127.0552,37.5187],'청담'],
    [[127.0274,37.5044],'신논현'],
    // ── 성수/건대/왕십리 ────────────────────────────────────────────
    [[127.0566,37.5443],'성수'],
    [[127.0540,37.5470],'뚝섬'],   // 수정 (기존 127.0462 → 127.0540)
    [[127.0489,37.5553],'한양대'], // 수정 (기존 127.0266,37.5581 → 127.0489,37.5553)
    [[127.0277,37.5613],'상왕십리'],
    [[127.0391,37.5613],'왕십리'],
    [[127.0706,37.5408],'건대입구'],
    [[127.0837,37.5393],'구의'],
    [[127.0939,37.5341],'강변'],
    // ── 잠실/송파/강동 ──────────────────────────────────────────────
    [[127.0939,37.5225],'잠실나루'],
    [[127.1000,37.5133],'잠실'],
    [[127.1092,37.5102],'잠실새내'],
    [[127.1187,37.5120],'종합운동장'],
    [[127.1177,37.5200],'올림픽공원'],
    [[127.1241,37.5382],'천호'],   // 분리 (기존 강동/천호 → 천호, 강동 각각)
    [[127.1382,37.5382],'강동'],
    [[127.1097,37.4916],'가락시장'],
    // ── 영등포/구로/신도림 ──────────────────────────────────────────
    [[126.8912,37.5088],'신도림'],
    [[126.8963,37.5172],'문래'],
    [[126.9006,37.5261],'영등포구청'],
    [[126.9006,37.5377],'당산'],
    [[126.8822,37.5015],'구로'],
    [[126.9006,37.4932],'구로디지털단지'],
    [[126.8820,37.4795],'가산디지털단지'],
    // ── 강북/노원/도봉 ──────────────────────────────────────────────
    [[127.0681,37.6556],'노원'],
    [[127.0474,37.6527],'창동'],
    [[127.0375,37.6489],'쌍문'],
    [[127.0246,37.6376],'수유'],
    [[127.0259,37.6257],'미아'],
    [[127.0282,37.6145],'미아사거리'],
    [[127.0240,37.6025],'길음'],
    [[127.0175,37.5916],'성신여대입구'],
    [[127.0076,37.5877],'한성대입구'],
    // ── 은평/서대문 ─────────────────────────────────────────────────
    [[126.9321,37.6134],'불광'],   // 수정 (기존 126.9559,37.5932 → 126.9321,37.6134)
    [[126.9224,37.6183],'연신내'],
    [[126.9279,37.6027],'녹번'],
    [[126.9337,37.5901],'홍제'],
    [[126.9455,37.5792],'무악재'],
    [[126.9558,37.5743],'독립문'],
    // ── 마곡/김포공항 ───────────────────────────────────────────────
    [[126.8339,37.5592],'마곡나루'],
    [[126.8017,37.5627],'김포공항'],
  ] as [[number,number], string][]).map(([c,n]) => ({
    type: 'Feature' as const,
    properties: { n },
    geometry: { type: 'Point' as const, coordinates: c as [number,number] },
  })),
};

// ── 주요 랜드마크 GeoJSON — 카테고리별 Mapbox Maki 아이콘 + 컬러 ──────
// icon: Mapbox Maki 아이콘 이름 (SDF 방식 → icon-color 로 자유롭게 채색)
// cat : 카테고리 (컬러 분류용)
const LANDMARK_GEOJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: ([
    // [coords, name, maki-icon, category]
    // 궁궐 / 역사
    [[126.9770,37.5796],'경복궁',       'castle',             'palace'],
    [[126.9910,37.5794],'창덕궁',       'castle',             'palace'],
    [[126.9748,37.5659],'덕수궁',       'castle',             'palace'],
    [[126.9941,37.5749],'종묘',         'historic',           'palace'],
    [[126.9769,37.5860],'청와대',       'town-hall',          'palace'],
    [[126.9853,37.5825],'북촌한옥마을', 'attraction',         'palace'],
    // 타워 / 고층빌딩
    [[126.9882,37.5512],'N서울타워',    'monument',           'tower'],
    [[127.1024,37.5126],'롯데월드타워', 'monument',           'tower'],
    [[126.9404,37.5201],'63빌딩',       'monument',           'tower'],
    // 문화 / 복합시설
    [[127.0096,37.5659],'동대문DDP',    'art-gallery',        'culture'],
    [[127.0588,37.5128],'COEX',         'attraction',         'culture'],
    [[126.9802,37.5240],'국립중앙박물관','museum',            'culture'],
    [[127.0031,37.4814],'예술의전당',   'theatre',            'culture'],
    [[126.9852,37.5741],'인사동',       'art-gallery',        'culture'],
    // 종교
    [[126.9878,37.5636],'명동성당',     'religious-christian','religion'],
    [[127.0596,37.5155],'봉은사',       'place-of-worship',   'religion'],
    // 시장 / 거리
    [[127.0059,37.5697],'광장시장',     'shop',               'market'],
    [[126.9769,37.5591],'남대문시장',   'shop',               'market'],
    [[127.0228,37.5173],'가로수길',     'shop',               'market'],
    // 공원 / 자연
    [[127.0374,37.5446],'서울숲',       'park',               'park'],
    [[126.9994,37.5126],'반포한강공원', 'park',               'park'],
    [[126.9323,37.5228],'여의도한강공원','park',              'park'],
    // 대학교
    [[126.9368,37.5649],'연세대',       'college',            'univ'],
    [[127.0279,37.5895],'고려대',       'college',            'univ'],
  ] as [[number,number], string, string, string][]).map(([c,n,icon,cat]) => ({
    type: 'Feature' as const,
    properties: { n, icon, cat },
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
// 크기: beer 30×42, whiskey 28×40, wine 24×46
// 앞면 #1a2e50(밝은 네이비) + 오른쪽면 #0b1a30(어두운 면) + 윗면 accent
function beerMugSVG(accent: string, selected: boolean): string {
  const sel = selected;
  // isometric dx=+5, dy=-4 / 앞면 x=2..21, y=13..34 (19×21)
  return `<svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg">
  <!-- 지면 그림자 -->
  <ellipse cx="13" cy="40" rx="12" ry="2.5" fill="rgba(0,0,0,0.4)"/>
  <!-- ① 오른쪽면 -->
  <path d="M21 13 L26 9 L26 30 L21 34 Z" fill="#0b1a30"/>
  <!-- ② 앞면 (밝은 네이비) -->
  <rect x="2" y="13" width="19" height="21" fill="#1a2e50"/>
  <rect x="2" y="13" width="2" height="21" rx="1" fill="${accent}" opacity="0.6"/>
  ${sel ? `<rect x="2" y="13" width="19" height="21" fill="none" stroke="#fbbf24" stroke-width="1.5"/>` : ''}
  <!-- 손잡이 -->
  <path d="M21 17 C29 17 29 28 21 28" fill="none" stroke="#060f1c" stroke-width="6" stroke-linecap="round"/>
  <path d="M21 17 C27 17 27 28 21 28" fill="none" stroke="#1a2e50" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M21 17 C26 18 26 27 21 28" fill="none" stroke="${accent}" stroke-width="1.2" stroke-linecap="round" opacity="0.65"/>
  <!-- ③ 윗면 기저 -->
  <path d="M2 13 L21 13 L26 9 L7 9 Z" fill="#0d1e38"/>
  <!-- 거품 (흰색) -->
  <path d="M2 12 L21 12 L26 8 L7 8 Z" fill="rgba(255,255,255,0.92)"/>
  <ellipse cx="13" cy="10.5" rx="6"   ry="2.2" fill="white"/>
  <ellipse cx="20" cy="10"   rx="3.5" ry="1.5" fill="white" opacity="0.9"/>
  <ellipse cx="7"  cy="10.5" rx="2.5" ry="1.2" fill="white" opacity="0.85"/>
  <path d="M2 12 L21 12 L26 8 L7 8 Z" fill="none"
    stroke="${sel ? '#fbbf24' : accent}" stroke-width="0.9" opacity="${sel ? 1 : 0.7}"/>
</svg>`;
}

function whiskeyGlassSVG(accent: string, selected: boolean): string {
  const sel = selected;
  // dx=+5,dy=-4 / 앞면 M3,11 L5,33 L19,33 L21,11
  return `<svg width="28" height="40" viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="13" cy="38" rx="12" ry="2.5" fill="rgba(0,0,0,0.4)"/>
  <!-- ① 오른쪽면 -->
  <path d="M21 11 L26 7 L24 29 L19 33 Z" fill="#0b1a30"/>
  <!-- ② 앞면 -->
  <path d="M3 11 L5 33 L19 33 L21 11 Z" fill="#1a2e50"/>
  <path d="M3 11 L4 33 L6 33 L5 11 Z" fill="${accent}" opacity="0.6"/>
  ${sel ? `<path d="M3 11 L5 33 L19 33 L21 11 Z" fill="none" stroke="#fbbf24" stroke-width="1.5"/>` : ''}
  <!-- ③ 윗면 기저 -->
  <path d="M3 11 L21 11 L26 7 L8 7 Z" fill="#0d1e38"/>
  <!-- 액체 (accent) -->
  <path d="M3 10 L21 10 L26 6 L8 6 Z" fill="${accent}" opacity="0.5"/>
  <path d="M4 9.5 L20 9.5 L25 6 L9 6 Z" fill="${accent}" opacity="0.65"/>
  <!-- 얼음 3면 -->
  <rect x="8" y="6.5" width="7" height="5" rx="0.7" fill="rgba(200,235,255,0.85)"/>
  <path d="M15 6.5 L18 4.5 L18 9  L15 11 Z" fill="rgba(170,215,245,0.7)"/>
  <path d="M8  6.5 L15 6.5 L18 4.5 L11 4.5 Z" fill="rgba(225,245,255,0.9)"/>
  <path d="M3 11 L21 11 L26 7 L8 7 Z" fill="none" stroke="rgba(5,12,28,0.9)" stroke-width="1.8"/>
  <path d="M3 10 L21 10 L26 6 L8 6 Z" fill="none"
    stroke="${sel ? '#fbbf24' : accent}" stroke-width="0.9" opacity="${sel ? 1 : 0.7}"/>
</svg>`;
}

function wineGlassSVG(accent: string, selected: boolean): string {
  const sel = selected;
  // 볼+스템+받침 dx=+4,dy=-3
  return `<svg width="24" height="46" viewBox="0 0 24 46" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="11" cy="44" rx="10" ry="2" fill="rgba(0,0,0,0.4)"/>
  <!-- 받침 오른쪽면 -->
  <path d="M15 38 L19 35 L19 38 L15 41 Z" fill="#0b1a30"/>
  <rect x="5" y="38" width="10" height="3" rx="1.5" fill="#1a2e50"/>
  <path d="M5 38 L15 38 L19 35 L9 35 Z" fill="#0d1e38"/>
  <!-- 스템 오른쪽면 -->
  <path d="M10 24 L12 22 L12 35 L10 38 Z" fill="#0b1a30"/>
  <rect x="8" y="24" width="4" height="14" fill="#1a2e50"/>
  <rect x="8" y="24" width="1.2" height="14" fill="${accent}" opacity="0.5"/>
  <!-- 볼 오른쪽면 -->
  <path d="M17 5 L20 3 L19 22 L15 24 Z" fill="#0b1a30"/>
  <!-- 볼 앞면 -->
  <path d="M2 4 C1 14 4 24 10 24 C16 24 19 14 18 4 Z" fill="#1a2e50"/>
  <path d="M2 4 C1 14 4 24 4.5 24 C3 24 2.5 14 3 4 Z" fill="${accent}" opacity="0.5"/>
  ${sel ? `<path d="M2 4 C1 14 4 24 10 24 C16 24 19 14 18 4 Z" fill="none" stroke="#fbbf24" stroke-width="1.5"/>` : ''}
  <!-- 윗면 기저 -->
  <path d="M2 4 L18 4 L21 2 L5 2 Z" fill="#0d1e38"/>
  <!-- 와인 (accent) -->
  <path d="M2 3 L18 3 L21 1 L5 1 Z" fill="${accent}" opacity="0.55"/>
  <path d="M3 2.5 L17 2.5 L20 1 L6 1 Z" fill="${accent}" opacity="0.7"/>
  <path d="M2 4 L18 4 L21 2 L5 2 Z" fill="none" stroke="rgba(5,12,28,0.9)" stroke-width="1.8"/>
  <path d="M2 3 L18 3 L21 1 L5 1 Z" fill="none"
    stroke="${sel ? '#fbbf24' : accent}" stroke-width="0.9" opacity="${sel ? 1 : 0.7}"/>
  <path d="M4 7 C3 14 4 20 6 23" stroke="rgba(255,255,255,0.18)" stroke-width="1.5" fill="none" stroke-linecap="round"/>
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

// 카테고리별 컬러 매핑 (Maki SDF 아이콘 채색용)
const LANDMARK_CAT_COLOR: mapboxgl.Expression = [
  'match', ['get', 'cat'],
  'palace',   '#fbbf24', // 앰버 — 궁궐/역사
  'tower',    '#38bdf8', // 스카이블루 — 타워/빌딩
  'culture',  '#f472b6', // 핑크 — 문화시설
  'religion', '#c084fc', // 보라 — 종교
  'market',   '#fde047', // 레몬 — 시장/거리
  'park',     '#4ade80', // 그린 — 공원
  'univ',     '#fb923c', // 오렌지 — 대학
  '#e2e8f0',             // default
];

/** 주요 랜드마크 — Mapbox Maki 아이콘 (SDF) + 카테고리별 컬러 */
function setLandmarkStyle(map: mapboxgl.Map) {
  if (!map.getSource('landmarks')) {
    map.addSource('landmarks', { type: 'geojson', data: LANDMARK_GEOJSON });
  }

  // ① 후광 glow circle (카테고리 색)
  if (!map.getLayer('landmark-glow')) {
    try {
      map.addLayer({
        id: 'landmark-glow',
        type: 'circle',
        source: 'landmarks',
        minzoom: 9,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 14, 14, 26] as mapboxgl.Expression,
          'circle-color': LANDMARK_CAT_COLOR,
          'circle-opacity': 0.08,
          'circle-blur': 1.5,
        },
      });
    } catch { /* skip */ }
  }

  // ② 배경 원 (아이콘 뒤에 진한 원 — 가독성 향상)
  if (!map.getLayer('landmark-bg')) {
    try {
      map.addLayer({
        id: 'landmark-bg',
        type: 'circle',
        source: 'landmarks',
        minzoom: 9,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 9, 12, 12, 14, 15] as mapboxgl.Expression,
          'circle-color': '#08081a',
          'circle-stroke-color': LANDMARK_CAT_COLOR,
          'circle-stroke-width': 1.8,
          'circle-opacity': 0.85,
        },
      });
    } catch { /* skip */ }
  }

  // ③ Mapbox Maki 아이콘 (SDF → icon-color 로 카테고리별 채색)
  if (!map.getLayer('landmark-icons')) {
    try {
      map.addLayer({
        id: 'landmark-icons',
        type: 'symbol',
        source: 'landmarks',
        minzoom: 9,
        layout: {
          'icon-image': ['get', 'icon'] as mapboxgl.Expression,
          'icon-size': ['interpolate', ['linear'], ['zoom'], 9, 0.55, 12, 0.75, 14, 0.9] as mapboxgl.Expression,
          'icon-allow-overlap': false,
          'icon-ignore-placement': false,
          // 아이콘 아래 이름 레이블
          'text-field': ['get', 'n'] as mapboxgl.Expression,
          'text-size': ['interpolate', ['linear'], ['zoom'], 9, 9, 12, 10.5, 14, 12.5] as mapboxgl.Expression,
          'text-offset': [0, 1.5] as [number, number],
          'text-anchor': 'top',
          'text-allow-overlap': false,
          'text-ignore-placement': false,
        },
        paint: {
          // SDF 아이콘 채색 (카테고리별)
          'icon-color': LANDMARK_CAT_COLOR,
          'icon-halo-color': 'rgba(4,4,18,0.8)',
          'icon-halo-width': 1.5,
          // 텍스트 (카테고리별)
          'text-color': LANDMARK_CAT_COLOR,
          'text-halo-color': 'rgba(4,4,18,0.97)',
          'text-halo-width': 2.2,
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

// ── 팝업 HTML (두 번째 클릭 시 표시) ─────────────────────────────────
function buildPopupHTML(bar: BarWithStats): string {
  const { male, female } = bar.stats;
  const total  = male + female;
  const occ    = getOccupancyColor(total, bar.capacity);
  const glass  = getGlassType(bar.name);
  const emoji  = glass === 'beer' ? '🍺' : glass === 'whiskey' ? '🥃' : '🍷';
  const accent = getChainColor(bar.name);
  return `<div style="
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    min-width:190px;
    background:rgba(5,9,22,0.97);
    border:1px solid ${accent}45;
    border-radius:12px;
    padding:14px 16px 12px;
    color:rgba(255,255,255,0.9);
    box-shadow:0 8px 32px rgba(0,0,0,0.7),0 0 24px ${accent}18;">
    <div style="font-size:13px;font-weight:800;margin-bottom:10px;">${emoji} ${bar.name}</div>
    <div style="display:flex;gap:0;margin-bottom:10px;
      background:rgba(255,255,255,0.04);border-radius:8px;overflow:hidden;">
      <div style="flex:1;text-align:center;padding:8px 4px;">
        <div style="font-size:22px;font-weight:800;color:#93c5fd;line-height:1;">${male}</div>
        <div style="font-size:8px;color:rgba(255,255,255,0.35);margin-top:3px;">남성</div>
      </div>
      <div style="width:1px;background:rgba(255,255,255,0.06);"></div>
      <div style="flex:1;text-align:center;padding:8px 4px;">
        <div style="font-size:22px;font-weight:800;color:#f9a8d4;line-height:1;">${female}</div>
        <div style="font-size:8px;color:rgba(255,255,255,0.35);margin-top:3px;">여성</div>
      </div>
      <div style="width:1px;background:rgba(255,255,255,0.06);"></div>
      <div style="flex:1;text-align:center;padding:8px 4px;">
        <div style="font-size:22px;font-weight:800;color:${occ.color};line-height:1;">${total}</div>
        <div style="font-size:8px;color:rgba(255,255,255,0.35);margin-top:3px;">현재</div>
      </div>
    </div>
    <div style="
      background:${occ.color}16;border:1px solid ${occ.color}40;
      border-radius:6px;padding:5px 10px;
      font-size:10px;color:${occ.color};
      text-align:center;font-weight:700;">
      ${occ.label} · 정원 ${bar.capacity}명
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
  // 마커 라벨에서만 "혼술바" 제거 (팝업은 원래 이름 유지)
  const displayName = bar.name.replace(/혼술바/g, '').trim();
  const shortName = displayName.length > 9 ? displayName.slice(0, 8) + '…' : displayName;
  const labelBorder = isSelected ? 'rgba(251,191,36,0.65)' : `${accent}50`;

  const ringClass   = isSelected ? 'hon-ring hon-ring-sel'   : 'hon-ring';
  const ringClassB  = isSelected ? 'hon-ring hon-ring-sel-b' : 'hon-ring hon-ring-b';
  const glowPx      = isSelected ? '7px' : '4px';
  const glowAlpha   = isSelected ? 'bb' : '70';

  // 중심 빛점: 체크인 인원에 비례해 크기·glow 조정
  // 0명 → 4px, 5명 → ~8px, 10명+ → 12px (최대)
  const total       = male + female;
  const dotSize     = Math.round(Math.min(4 + total * 0.8, 12));
  const dotOffset   = -Math.round(dotSize / 2);
  const dotGlow1    = dotSize + 3;
  const dotGlow2    = dotSize * 3;

  // 구조: [라벨] → [glow 래핑 글라스] → [비콘 0-height div]
  // anchor:bottom → 0-height div 바닥 = 지도 좌표 = 펄스 링 중심
  return `<div style="
    position:relative;
    display:flex;flex-direction:column;align-items:center;
    cursor:pointer;user-select:none;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <!-- 정보 라벨 -->
    <div style="
      background:rgba(5,8,20,0.88);
      border:1px solid ${labelBorder};
      border-radius:4px;padding:2px 6px 1px;
      margin-bottom:1px;
      box-shadow:0 1px 8px rgba(0,0,0,0.5),0 0 10px ${accent}28;
      white-space:nowrap;">
      <div style="font-size:8px;font-weight:700;color:rgba(255,255,255,0.9);
        letter-spacing:0.1px;margin-bottom:1px;">${shortName}</div>
      <div style="display:flex;gap:4px;justify-content:center;align-items:center;">
        <span style="font-size:7.5px;color:#93c5fd;font-weight:600;">♂${male}</span>
        <span style="font-size:7.5px;color:#f9a8d4;font-weight:600;">♀${female}</span>
        <span style="display:inline-block;width:4px;height:4px;border-radius:50%;
          background:${occ.color};flex-shrink:0;"></span>
      </div>
    </div>
    <!-- 글라스 (accent glow) -->
    <div style="filter:drop-shadow(0 0 ${glowPx} ${accent}${glowAlpha});">
      ${glassSVG}
    </div>
    <!-- 비콘 (지도 좌표 지점 · anchor:bottom 기준) -->
    <div style="position:relative;height:0;width:0;">
      <!-- 펄스 링 2개 (엇갈리게 방사) -->
      <div class="${ringClass}" style="
        position:absolute;width:18px;height:18px;
        left:-9px;top:-9px;
        border:1.5px solid ${accent};"></div>
      <div class="${ringClassB}" style="
        position:absolute;width:18px;height:18px;
        left:-9px;top:-9px;
        border:1.5px solid ${accent};"></div>
      <!-- 중심 빛점 (체크인 인원수에 비례해 커짐) -->
      <div style="
        position:absolute;
        width:${dotSize}px;height:${dotSize}px;
        left:${dotOffset}px;top:${dotOffset}px;
        border-radius:50%;
        background:${accent};
        box-shadow:0 0 ${dotGlow1}px ${accent},0 0 ${dotGlow2}px ${accent}60;
        transition:width 0.4s,height 0.4s,box-shadow 0.4s;"></div>
    </div>
  </div>`;
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────
export default function MapClient({ bars, onBarClick, selectedBarId }: Props) {
  const containerRef    = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<mapboxgl.Map | null>(null);
  const markersRef      = useRef<mapboxgl.Marker[]>([]);
  const popupRef        = useRef<mapboxgl.Popup | null>(null);
  const mapReadyRef     = useRef(false);
  const introTimersRef  = useRef<ReturnType<typeof setTimeout>[]>([]);
  const zoomRef         = useRef(11);
  const isClusteredRef  = useRef(true);
  const [isClustered,   setIsClustered]  = useState(true);
  const [mapReady,      setMapReady]     = useState(false);
  const [introText,     setIntroText]    = useState('지구를 탐색 중...');

  // ── 팝업 CSS 한 번만 주입 ──────────────────────────────────────────
  useEffect(() => {
    const s = document.createElement('style');
    s.textContent = `
      /* 팝업 스타일 */
      .hon-popup .mapboxgl-popup-content {
        background: transparent !important;
        box-shadow: none !important;
        padding: 0 !important;
        border-radius: 12px;
      }
      .hon-popup .mapboxgl-popup-tip {
        border-top-color: rgba(79,195,247,0.25) !important;
      }
      .hon-popup .mapboxgl-popup-close-button {
        color: rgba(255,255,255,0.45) !important;
        font-size: 18px !important;
        right: 10px !important;
        top: 8px !important;
        background: none !important;
      }
      .hon-popup .mapboxgl-popup-close-button:hover {
        color: rgba(255,255,255,0.85) !important;
        background: none !important;
      }

      /* 비콘 펄스 링 */
      @keyframes hon-pulse {
        0%   { transform: scale(0.4); opacity: 0.8; }
        100% { transform: scale(3.6); opacity: 0;   }
      }
      .hon-ring {
        position: absolute;
        border-radius: 50%;
        animation: hon-pulse 2.4s cubic-bezier(0.3,0,0.7,1) infinite;
        pointer-events: none;
      }
      .hon-ring-b { animation-delay: 1.2s; }
      .hon-ring-sel { animation-duration: 1.5s; }
      .hon-ring-sel-b { animation-delay: 0.75s; animation-duration: 1.5s; }
    `;
    document.head.appendChild(s);
    return () => { document.head.removeChild(s); };
  }, []);

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
      setLandmarkStyle(map);
      setTransitStyle(map);
      setLabelStyle(map);
      map.on('style.load', () => {
        setKorean(map);
        setTileColors(map);
        setLandmarkStyle(map);
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
      // 팝업 닫기 (마커 재생성 시)
      if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
      bars.forEach(bar => {
        const el    = document.createElement('div');
        const inner = document.createElement('div');
        inner.innerHTML = buildPinHTML(bar, bar.id === selectedBarId);
        inner.style.transition = 'transform 0.12s';
        el.appendChild(inner);
        el.addEventListener('click', () => {
          const zoom = zoomRef.current;
          if (bar.id === selectedBarId && zoom >= 14) {
            // 두 번째 클릭 (이미 선택된 바 + 충분히 줌인) → 팝업 토글
            if (popupRef.current) {
              popupRef.current.remove(); popupRef.current = null;
            } else {
              const p = new mapboxgl.Popup({
                closeButton: true, closeOnClick: false,
                anchor: 'bottom', offset: 24, className: 'hon-popup',
              }).setLngLat([bar.lng, bar.lat]).setHTML(buildPopupHTML(bar)).addTo(map);
              p.on('close', () => { popupRef.current = null; });
              popupRef.current = p;
            }
          } else {
            // 첫 번째 클릭 → 줌인 후 선택
            if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
            onBarClick(bar.id);
            map.flyTo({ center: [bar.lng, bar.lat], zoom: Math.max(zoom, 15), duration: 650, pitch: 50 });
          }
        });
        el.addEventListener('mouseenter', () => { inner.style.transform = 'scale(1.1)'; });
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
    if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    bars.forEach(bar => {
      const el    = document.createElement('div');
      const inner = document.createElement('div');
      inner.innerHTML = buildPinHTML(bar, bar.id === selectedBarId);
      inner.style.transition = 'transform 0.12s';
      el.appendChild(inner);
      el.addEventListener('click', () => {
        const zoom = zoomRef.current;
        if (bar.id === selectedBarId && zoom >= 14) {
          if (popupRef.current) {
            popupRef.current.remove(); popupRef.current = null;
          } else {
            const p = new mapboxgl.Popup({
              closeButton: true, closeOnClick: false,
              anchor: 'bottom', offset: 24, className: 'hon-popup',
            }).setLngLat([bar.lng, bar.lat]).setHTML(buildPopupHTML(bar)).addTo(map);
            p.on('close', () => { popupRef.current = null; });
            popupRef.current = p;
          }
        } else {
          if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
          onBarClick(bar.id);
          map.flyTo({ center: [bar.lng, bar.lat], zoom: Math.max(zoom, 15), duration: 650, pitch: 50 });
        }
      });
      el.addEventListener('mouseenter', () => { inner.style.transform = 'scale(1.1)'; });
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
