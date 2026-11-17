import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://johtqemdlprtbpohdkgu.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Aj8gNxqXefjkBg6H6zsCxw_icac_-2G';

const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function cleanPoolName(rawName) {
  if (!rawName) return '';
  let name = rawName.replace(/\uFEFF/g, '').trim();
  name = name.replace(/\([A-Za-z\s,-]+\)/g, '').trim();
  name = name.replace(/\s*\((?:25m|50m)\)/gi, '').trim();
  return name.trim();
}

function cleanAddress(rawAddr) {
  if (!rawAddr) return '';
  return rawAddr.replace(/\uFEFF/g, '').trim();
}

function parseFee(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
}

async function runDryRunCheck() {
  console.log('[*] 1. Supabase swimi_pools 라이브 DB 데이터 읽기 (Read-Only)...');
  const { data: dbPools, error } = await client
    .from('swimi_pools')
    .select('*')
    .eq('is_deleted', false)
    .order('name', { ascending: true })
    .limit(2000);

  if (error) {
    console.error('[-] Supabase 조회 실패:', error.message);
    process.exit(1);
  }

  console.log(`[+] 라이브 DB 수영장 수: ${dbPools.length}개`);

  console.log('[*] 2. 최신 크롤링 파일(jasumap_raw.html) 파싱...');
  const html = fs.readFileSync('jasumap_raw.html', 'utf8');
  const match = html.match(/var\s+data\s*=\s*(\[\s*\{[\s\S]*?\}\s*\]);/);
  if (!match) {
    console.error('[-] jasumap data not found in jasumap_raw.html');
    process.exit(1);
  }
  const jData = JSON.parse(match[1]);
  console.log(`[+] 크롤러 수집 최신 수영장 수: ${jData.length}개`);

  // DB 수영장 맵 구축 (이름 및 정규화 이름)
  const dbByName = new Map();
  dbPools.forEach(p => {
    const norm = cleanPoolName(p.name);
    dbByName.set(norm, p);
    dbByName.set(p.name, p);
    if (p.short_name) {
      dbByName.set(p.short_name, p);
    }
  });

  const diffReport = {
    checkedAt: new Date().toISOString(),
    liveDbPoolsCount: dbPools.length,
    crawledPoolsCount: jData.length,
    newPoolsInCrawler: [],
    missingPoolsInCrawler: [],
    feeDifferences: [],
    scheduleDifferences: [],
    laneLengthDifferences: [],
    phoneDifferences: []
  };

  const matchedDbIds = new Set();

  for (const item of jData) {
    const rawName = item['이름'] || '';
    const cleanName = cleanPoolName(rawName);
    const dbPool = dbByName.get(cleanName) || dbByName.get(rawName);

    if (!dbPool) {
      diffReport.newPoolsInCrawler.push({
        rawName,
        cleanName,
        address: cleanAddress(item['주소']),
        fee: parseFee(item['입장료']),
        laneLength: item['비고1'] === '50m' ? 50 : 25,
        url: item['URL'] || item['URL2'] || ''
      });
      continue;
    }

    matchedDbIds.add(dbPool.id);

    // 1. 요금 비교
    const crawlerFee = parseFee(item['입장료']);
    const dbFee = dbPool.fee?.standard?.adult ?? 0;
    if (crawlerFee > 0 && dbFee > 0 && crawlerFee !== dbFee) {
      diffReport.feeDifferences.push({
        poolId: dbPool.id,
        name: dbPool.name,
        currentDbFee: dbFee,
        crawlerFee: crawlerFee,
        diff: crawlerFee - dbFee
      });
    }

    // 2. 레인 규격 (50m vs 25m) 비교
    const crawlerLaneLength = item['비고1'] === '50m' ? 50 : 25;
    if (crawlerLaneLength !== dbPool.lane_length) {
      diffReport.laneLengthDifferences.push({
        poolId: dbPool.id,
        name: dbPool.name,
        currentDbLane: dbPool.lane_length,
        crawlerLane: crawlerLaneLength
      });
    }

    // 3. 전화번호 비교
    const crawlerPhone = String(item['전화번호'] || '').trim();
    if (crawlerPhone && crawlerPhone !== '-' && crawlerPhone !== dbPool.phone) {
      diffReport.phoneDifferences.push({
        poolId: dbPool.id,
        name: dbPool.name,
        currentDbPhone: dbPool.phone,
        crawlerPhone: crawlerPhone
      });
    }

    // 4. 운영시간/휴관일 텍스트 비교
    const crawlerWeekdayTime = String(item['평일'] || '').trim();
    const dbWeekdayTime = String(dbPool.schedule_text?.weekday || '').trim();
    if (crawlerWeekdayTime && dbWeekdayTime && crawlerWeekdayTime !== dbWeekdayTime) {
      diffReport.scheduleDifferences.push({
        poolId: dbPool.id,
        name: dbPool.name,
        field: '평일',
        currentDb: dbWeekdayTime,
        crawler: crawlerWeekdayTime
      });
    }
  }

  // 라이브 DB에는 있으나 크롤러 목록에서 매칭되지 않은 수영장
  dbPools.forEach(p => {
    if (!matchedDbIds.has(p.id)) {
      diffReport.missingPoolsInCrawler.push({
        id: p.id,
        name: p.name,
        city: p.city,
        address: p.address
      });
    }
  });

  fs.writeFileSync('scripts/dry_run_diff_report.json', JSON.stringify(diffReport, null, 2), 'utf8');

  console.log('\n=== [Dry-Run 크롤러 업데이트 검사 요약] ===');
  console.log(`- 라이브 DB 수영장: ${diffReport.liveDbPoolsCount}개`);
  console.log(`- 크롤러 수집 수영장: ${diffReport.crawledPoolsCount}개`);
  console.log(`- 크롤러 신규 발견 수영장: ${diffReport.newPoolsInCrawler.length}건`);
  console.log(`- 라이브 DB 전용 (크롤러 미등재/화성·전주 등): ${diffReport.missingPoolsInCrawler.length}건`);
  console.log(`- 입장료(요금) 차이: ${diffReport.feeDifferences.length}건`);
  console.log(`- 레인 규격(25m/50m) 차이: ${diffReport.laneLengthDifferences.length}건`);
  console.log(`- 전화번호 차이: ${diffReport.phoneDifferences.length}건`);
  console.log(`- 평일 시간 텍스트 차이: ${diffReport.scheduleDifferences.length}건`);
  console.log('[*] 상세 리포트가 scripts/dry_run_diff_report.json 에 저장되었습니다. (DB 쓰기 0건, 안전 유지)');
}

runDryRunCheck();