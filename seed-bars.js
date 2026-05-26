const { execSync } = require('child_process');

const KAKAO_REST_KEY = '23994da64094f40d3221b9a5a571c7f0';
const SUPABASE_URL = 'https://jnfwckakzagnutokkzme.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuZndja2FremFnbnV0b2trem1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MTU0NzcsImV4cCI6MjA5NDk5MTQ3N30.ELFGUfzMlPr6MoNK5hc2BLuaUJ-ssMQMygOCxo-KE3c';

const KEYWORDS = ['혼술바', '혼술집', '1인바'];
const AREAS = [
  '홍대', '이태원', '강남', '신촌', '합정', '종로', '건대',
  '성수', '압구정', '을지로', '여의도', '마포', '용산', '서울'
];

const NAME_FILTERS = ['혼술바', '혼술집', '1인바', '혼술 바'];

function searchKakao(keyword, page) {
  const encoded = encodeURIComponent(keyword);
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encoded}&size=15&page=${page}`;
  const cmd = `curl -s -H "Authorization: KakaoAK ${KAKAO_REST_KEY}" "${url}"`;
  try {
    const result = execSync(cmd, { encoding: 'utf8', timeout: 10000 });
    return JSON.parse(result);
  } catch (e) {
    console.error(`검색 실패: ${keyword} page ${page}`, e.message);
    return null;
  }
}

function insertBar(bar) {
  const body = JSON.stringify({
    name: bar.name,
    address: bar.address,
    lat: bar.lat,
    lng: bar.lng,
    description: bar.description,
    capacity: bar.capacity,
    owner_name: bar.owner_name,
    open_hours: bar.open_hours,
    tags: bar.tags,
  });

  const cmd = `curl -s -X POST "${SUPABASE_URL}/rest/v1/bars" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d '${body.replace(/'/g, "'\\''")}'`;

  try {
    execSync(cmd, { encoding: 'utf8', timeout: 10000 });
    return true;
  } catch (e) {
    console.error('삽입 실패:', e.message);
    return false;
  }
}

function isHonseulBar(name, address) {
  const hasKeyword = NAME_FILTERS.some(k => name.includes(k));
  const isSeoul = address.startsWith('서울');
  return hasKeyword && isSeoul;
}

async function main() {
  console.log('=== 혼술바 데이터 수집 시작 ===\n');

  const seen = new Set();
  const bars = [];

  for (const keyword of KEYWORDS) {
    for (const area of AREAS) {
      const query = `${area} ${keyword}`;
      console.log(`검색: ${query}`);

      for (let page = 1; page <= 3; page++) {
        const data = searchKakao(query, page);
        if (!data || !data.documents) break;

        for (const place of data.documents) {
          const name = place.place_name || '';
          const address = place.road_address_name || place.address_name || '';
          const id = place.id;

          if (seen.has(id)) continue;
          seen.add(id);

          if (!isHonseulBar(name, address)) continue;

          bars.push({
            kakao_id: id,
            name,
            address,
            lat: parseFloat(place.y),
            lng: parseFloat(place.x),
            description: `${name} - 카카오맵 등록 혼술바`,
            capacity: 20,
            owner_name: '사장님',
            open_hours: '18:00 - 02:00',
            tags: ['혼술'],
          });

          console.log(`  ✓ ${name} | ${address}`);
        }

        if (data.meta && data.meta.is_end) break;
      }
    }
  }

  console.log(`\n총 ${bars.length}개 혼술바 발견\n`);

  if (bars.length === 0) {
    console.log('삽입할 데이터가 없습니다.');
    return;
  }

  // 기존 데이터 삭제 후 삽입
  console.log('기존 bars 데이터 삭제...');
  const deleteCmd = `curl -s -X DELETE "${SUPABASE_URL}/rest/v1/bars?id=neq.00000000-0000-0000-0000-000000000000" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Prefer: return=minimal"`;
  try {
    execSync(deleteCmd, { encoding: 'utf8', timeout: 15000 });
    console.log('삭제 완료\n');
  } catch (e) {
    console.error('삭제 실패:', e.message);
  }

  console.log('삽입 시작...');
  let successCount = 0;
  for (const bar of bars) {
    const ok = insertBar(bar);
    if (ok) {
      successCount++;
      console.log(`  [${successCount}/${bars.length}] ${bar.name}`);
    }
  }

  console.log(`\n=== 완료: ${successCount}개 삽입 ===`);
}

main().catch(console.error);
