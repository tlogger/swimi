import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://johtqemdlprtbpohdkgu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Aj8gNxqXefjkBg6H6zsCxw_icac_-2G';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function findSimilarAndAddressDuplicates() {
  const { data: allPools, error } = await supabase
    .from('swimi_pools')
    .select('id, name, city, district, address, lane_length, phone')
    .eq('is_deleted', false)
    .limit(2000);

  if (error) {
    console.error(error);
    return;
  }

  // 1. 주소 기반 중복 (동일 주소에 2개 이상 등록된 경우 - e.g. 25m, 50m 분리 등록 등)
  const addressMap = new Map();
  for (const pool of allPools) {
    const rawAddr = (pool.address || '').trim().replace(/\s+/g, ' ');
    // 번지나 도로명 앞부분
    if (rawAddr.length > 5) {
      if (!addressMap.has(rawAddr)) addressMap.set(rawAddr, []);
      addressMap.get(rawAddr).push(pool);
    }
  }

  const addrDupes = [];
  for (const [addr, list] of addressMap.entries()) {
    if (list.length > 1) {
      addrDupes.push({ addr, count: list.length, pools: list });
    }
  }

  console.log(`=== 동일 주소 중복 수영장 (${addrDupes.length}개 주소) ===`);
  addrDupes.forEach((d, idx) => {
    console.log(`[${idx + 1}] 주소: "${d.addr}" (총 ${d.count}개)`);
    d.pools.forEach(p => {
      console.log(`   - [${p.id}] ${p.name} (${p.lane_length}m) | 전화: ${p.phone}`);
    });
  });

  // 2. 공백 제거 정규화 이름 중복
  const normNameMap = new Map();
  for (const pool of allPools) {
    const norm = (pool.name || '').replace(/[\s\-_()\[\]]/g, '');
    if (!normNameMap.has(norm)) normNameMap.set(norm, []);
    normNameMap.get(norm).push(pool);
  }

  const normDupes = [];
  for (const [norm, list] of normNameMap.entries()) {
    if (list.length > 1) {
      normDupes.push({ norm, count: list.length, pools: list });
    }
  }

  console.log(`\n=== 띄어쓰기/특수문자 제외 정규화 동일 이름 (${normDupes.length}개) ===`);
  normDupes.forEach((d, idx) => {
    console.log(`[${idx + 1}] 정규화명: "${d.norm}" (총 ${d.count}개)`);
    d.pools.forEach(p => {
      console.log(`   - [${p.id}] "${p.name}" | ${p.address}`);
    });
  });
}

findSimilarAndAddressDuplicates();
