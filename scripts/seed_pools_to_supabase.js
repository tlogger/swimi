/**
 * swimming_pools.json의 전체 수영장 데이터를 Supabase swami_pools 테이블로 일괄 업로드(시딩)하는 스크립트
 * 사용법: node scripts/seed_pools_to_supabase.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://johtqemdlprtbpohdkgu.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Aj8gNxqXefjkBg6H6zsCxw_icac_-2G';

const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runSeed() {
  const jsonPath = path.resolve(__dirname, '../public/data/swimming_pools.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('파일을 찾을 수 없습니다:', jsonPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(jsonPath, 'utf8');
  const pools = JSON.parse(raw);
  
  // 중복 ID 방지를 위해 Map으로 고유화
  const uniquePoolMap = new Map();
  pools.forEach((p) => {
    if (p.id) {
      uniquePoolMap.set(p.id, p);
    }
  });

  const uniquePools = Array.from(uniquePoolMap.values());
  console.log(`총 ${pools.length}개 중 중복 제외 ${uniquePools.length}개의 고유 수영장 데이터를 Supabase로 마이그레이션합니다...`);

  const BATCH_SIZE = 50;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < uniquePools.length; i += BATCH_SIZE) {
    const chunk = uniquePools.slice(i, i + BATCH_SIZE).map((p) => ({
      id: p.id,
      name: p.name,
      short_name: p.shortName || null,
      address: p.address,
      address_detail: p.addressDetail || null,
      city: p.city,
      district: p.district || null,
      phone: p.phone || null,
      homepage: p.homepage || null,
      lat: p.lat,
      lng: p.lng,
      lane_length: p.laneLength || 25,
      lane_count: p.laneCount || null,
      depth: p.depth || null,
      break_rule: p.breakRule || null,
      weekly_schedule: p.weeklySchedule || {},
      holiday_schedule: p.holidaySchedule || {},
      closed_days_description: p.closedDaysDescription || null,
      closed_rules: p.closedRules || [],
      schedule_text: p.scheduleText || {},
      fee: p.fee || {},
      amenities: {
        ...(p.amenities || {}),
        over18m: Boolean(p.over18m || p.amenities?.over18m),
      },
      parking_info: p.parkingInfo || null,
      etc_info: p.etcInfo || null,
      is_deleted: false,
      updated_at: new Date().toISOString()
    }));

    const { error } = await client.from('swimi_pools').upsert(chunk, { onConflict: 'id' });
    if (error) {
      console.error(`배치 (${i + 1} ~ ${Math.min(i + BATCH_SIZE, uniquePools.length)}) 업로드 실패:`, error.message);
      errorCount += chunk.length;
    } else {
      successCount += chunk.length;
      console.log(`[${successCount}/${uniquePools.length}] 업로드 성공...`);
    }
  }

  console.log('--------------------------------------------------');
  console.log(`마이그레이션 완료! 성공: ${successCount}개, 실패: ${errorCount}개`);
}

runSeed().catch((err) => {
  console.error('시딩 실패:', err);
});
