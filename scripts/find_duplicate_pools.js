import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://johtqemdlprtbpohdkgu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Aj8gNxqXefjkBg6H6zsCxw_icac_-2G';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function findDuplicatePools() {
  console.log('Fetching all pools from Supabase swimi_pools...');
  
  let allPools = [];
  let from = 0;
  const limit = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('swimi_pools')
      .select('id, name, city, district, address, lane_length, phone, fee')
      .eq('is_deleted', false)
      .range(from, from + limit - 1);
      
    if (error) {
      console.error('Error fetching pools:', error);
      return;
    }
    
    allPools = allPools.concat(data);
    if (data.length < limit) break;
    from += limit;
  }
  
  console.log(`Total active pools loaded: ${allPools.length}`);
  
  // Group by name (trimmed)
  const nameMap = new Map();
  for (const pool of allPools) {
    const trimmedName = (pool.name || '').trim();
    if (!nameMap.has(trimmedName)) {
      nameMap.set(trimmedName, []);
    }
    nameMap.get(trimmedName).push(pool);
  }
  
  const duplicates = [];
  for (const [name, list] of nameMap.entries()) {
    if (list.length > 1) {
      duplicates.push({ name, count: list.length, pools: list });
    }
  }
  
  // Sort by count descending, then name
  duplicates.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  
  console.log(`\n=== Found ${duplicates.length} Pool Names with Duplicates ===\n`);
  
  duplicates.forEach((d, idx) => {
    console.log(`[${idx + 1}] "${d.name}" (총 ${d.count}개)`);
    d.pools.forEach((p, pIdx) => {
      console.log(`   - ID: ${p.id}`);
      console.log(`     지역: [${p.city || '-'}] ${p.district || '-'}`);
      console.log(`     주소: ${p.address || '-'}`);
      console.log(`     레인: ${p.lane_length ? p.lane_length + 'm' : '-'} | 전화: ${p.phone || '-'} | 성인요금: ${p.fee_adult || '-'}`);
    });
    console.log('');
  });
}

findDuplicatePools();
