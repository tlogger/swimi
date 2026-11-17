import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://johtqemdlprtbpohdkgu.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Aj8gNxqXefjkBg6H6zsCxw_icac_-2G';

const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TODAY_STR = '2026-11-17';
const NOW_ISO = '2026-11-17T19:48:00.000Z';

// 1. 신규 수영장 4곳 정의
const newPools = [
  {
    id: 'pool-gangneung-arena-50m',
    name: '강릉아이스아레나 수영장',
    short_name: '강릉아이스아레나',
    address: '강원특별자치도 강릉시 수리골길 102',
    address_detail: '강릉아이스아레나',
    city: '강릉시',
    district: null,
    phone: '033-651-4551',
    homepage: 'https://arena.gtdc.or.kr',
    lat: 37.7764157,
    lng: 128.8971728,
    lane_length: 50,
    lane_count: 8,
    depth: '1.5m',
    break_rule: '50_10',
    weekly_schedule: {
      0: { isOpen: true, sessions: [{ partName: '자유수영', start: '06:00', end: '18:00' }], hourlySlots: new Array(24).fill(false).map((_, i) => i >= 6 && i < 18) },
      1: { isOpen: false, sessions: [], hourlySlots: new Array(24).fill(false) },
      2: { isOpen: true, sessions: [{ partName: '자유수영', start: '06:00', end: '22:00' }], hourlySlots: new Array(24).fill(false).map((_, i) => i >= 6 && i < 22) },
      3: { isOpen: true, sessions: [{ partName: '자유수영', start: '06:00', end: '22:00' }], hourlySlots: new Array(24).fill(false).map((_, i) => i >= 6 && i < 22) },
      4: { isOpen: true, sessions: [{ partName: '자유수영', start: '06:00', end: '22:00' }], hourlySlots: new Array(24).fill(false).map((_, i) => i >= 6 && i < 22) },
      5: { isOpen: true, sessions: [{ partName: '자유수영', start: '06:00', end: '22:00' }], hourlySlots: new Array(24).fill(false).map((_, i) => i >= 6 && i < 22) },
      6: { isOpen: true, sessions: [{ partName: '자유수영', start: '06:00', end: '22:00' }], hourlySlots: new Array(24).fill(false).map((_, i) => i >= 6 && i < 22) }
    },
    holiday_schedule: { isOpen: true, sessions: [{ partName: '자유수영', start: '09:00', end: '18:00' }], hourlySlots: new Array(24).fill(false).map((_, i) => i >= 9 && i < 18) },
    closed_days_description: '매주 월요일 휴관',
    closed_rules: [{ type: 'weekly', daysOfWeek: [1] }],
    schedule_text: {
      weekday: '화~금 06:00~22:00',
      saturday: '06:00~22:00',
      sunday: '06:00~18:00',
      holiday: '09:00~18:00',
      closedDays: '매주 월요일 휴관'
    },
    fee: { standard: { adult: 4000 } },
    amenities: {
      dehydrator: false,
      dryer: false,
      soap: false,
      walkingLane: false,
      kickboard: false,
      flippers: false,
      parking: true,
      swimShop: false,
      cafe: false,
      warmRoom: false,
      over18m: false
    },
    parking_info: '지상/지하 주차장 이용 가능',
    etc_info: '유아풀 / 오버풀시스템 / 50m 8레인 정규 규격',
    updated_at: NOW_ISO,
    is_deleted: false
  },
  {
    id: 'pool-namwon-sports-25m',
    name: '남원국민체육센터',
    short_name: '남원국민체육센터',
    address: '전북특별자치도 남원시 용성로 49',
    address_detail: null,
    city: '남원시',
    district: null,
    phone: '063-636-7070',
    homepage: 'http://hopesports.or.kr',
    lat: 35.4098839,
    lng: 127.3819704,
    lane_length: 25,
    lane_count: 5,
    depth: '1.1~1.35m',
    break_rule: '50_10',
    weekly_schedule: {
      0: { isOpen: false, sessions: [], hourlySlots: new Array(24).fill(false) },
      1: { isOpen: true, sessions: [{ partName: '오전', start: '06:00', end: '12:00' }, { partName: '오후', start: '13:00', end: '20:00' }], hourlySlots: new Array(24).fill(false).map((_, i) => (i >= 6 && i < 12) || (i >= 13 && i < 20)) },
      2: { isOpen: true, sessions: [{ partName: '오전', start: '06:00', end: '12:00' }, { partName: '오후', start: '13:00', end: '20:00' }], hourlySlots: new Array(24).fill(false).map((_, i) => (i >= 6 && i < 12) || (i >= 13 && i < 20)) },
      3: { isOpen: true, sessions: [{ partName: '오전', start: '06:00', end: '12:00' }, { partName: '오후', start: '13:00', end: '20:00' }], hourlySlots: new Array(24).fill(false).map((_, i) => (i >= 6 && i < 12) || (i >= 13 && i < 20)) },
      4: { isOpen: true, sessions: [{ partName: '오전', start: '06:00', end: '12:00' }, { partName: '오후', start: '13:00', end: '20:00' }], hourlySlots: new Array(24).fill(false).map((_, i) => (i >= 6 && i < 12) || (i >= 13 && i < 20)) },
      5: { isOpen: true, sessions: [{ partName: '오전', start: '06:00', end: '12:00' }, { partName: '오후', start: '13:00', end: '20:00' }], hourlySlots: new Array(24).fill(false).map((_, i) => (i >= 6 && i < 12) || (i >= 13 && i < 20)) },
      6: { isOpen: true, sessions: [{ partName: '오전', start: '06:00', end: '12:00' }, { partName: '오후', start: '13:00', end: '17:00' }], hourlySlots: new Array(24).fill(false).map((_, i) => (i >= 6 && i < 12) || (i >= 13 && i < 17)) }
    },
    holiday_schedule: { isOpen: false, sessions: [], hourlySlots: new Array(24).fill(false) },
    closed_days_description: '매주 일요일 및 공휴일 휴관',
    closed_rules: [{ type: 'weekly', daysOfWeek: [0] }, { type: 'holidays' }],
    schedule_text: {
      weekday: '06:00~12:00 / 13:00~20:00',
      saturday: '06:00~12:00 / 13:00~17:00',
      sunday: '휴관',
      holiday: '휴관',
      closedDays: '매주 일요일 및 법정공휴일 휴관',
      breakTime: '12:00~13:00'
    },
    fee: { standard: { adult: 3000, teen: 2000, child: 1000 } },
    amenities: {
      dehydrator: false,
      dryer: false,
      soap: false,
      walkingLane: false,
      kickboard: false,
      flippers: false,
      parking: true,
      swimShop: false,
      cafe: false,
      warmRoom: false,
      over18m: false
    },
    parking_info: '체육센터 전용 주차장 무료 이용',
    etc_info: '장애청소년 스포츠선수단육성 / 노인재활서비스 / 수중운동재활',
    updated_at: NOW_ISO,
    is_deleted: false
  },
  {
    id: 'pool-hongcheon-sports-25m',
    name: '홍천국민체육센터',
    short_name: '홍천국민체육센터',
    address: '강원특별자치도 홍천군 홍천읍 태학여내길 31',
    address_detail: null,
    city: '홍천군',
    district: null,
    phone: '033-436-7330',
    homepage: 'https://sports.gangwon.kr',
    lat: 37.709103,
    lng: 127.9061764,
    lane_length: 25,
    lane_count: 6,
    depth: '1.5m',
    break_rule: '50_10',
    weekly_schedule: {
      0: { isOpen: true, sessions: [{ partName: '자유수영', start: '06:00', end: '21:00' }], hourlySlots: new Array(24).fill(false).map((_, i) => i >= 6 && i < 21) },
      1: { isOpen: false, sessions: [], hourlySlots: new Array(24).fill(false) },
      2: { isOpen: true, sessions: [{ partName: '자유수영', start: '06:00', end: '21:00' }], hourlySlots: new Array(24).fill(false).map((_, i) => i >= 6 && i < 21) },
      3: { isOpen: true, sessions: [{ partName: '자유수영', start: '06:00', end: '21:00' }], hourlySlots: new Array(24).fill(false).map((_, i) => i >= 6 && i < 21) },
      4: { isOpen: true, sessions: [{ partName: '자유수영', start: '06:00', end: '21:00' }], hourlySlots: new Array(24).fill(false).map((_, i) => i >= 6 && i < 21) },
      5: { isOpen: true, sessions: [{ partName: '자유수영', start: '06:00', end: '21:00' }], hourlySlots: new Array(24).fill(false).map((_, i) => i >= 6 && i < 21) },
      6: { isOpen: true, sessions: [{ partName: '자유수영', start: '06:00', end: '21:00' }], hourlySlots: new Array(24).fill(false).map((_, i) => i >= 6 && i < 21) }
    },
    holiday_schedule: { isOpen: true, sessions: [{ partName: '자유수영', start: '09:00', end: '18:00' }], hourlySlots: new Array(24).fill(false).map((_, i) => i >= 9 && i < 18) },
    closed_days_description: '매주 월요일 휴관',
    closed_rules: [{ type: 'weekly', daysOfWeek: [1] }],
    schedule_text: {
      weekday: '06:00~21:00 (월요일 휴관)',
      saturday: '06:00~21:00',
      sunday: '06:00~21:00',
      closedDays: '매주 월요일 휴관'
    },
    fee: { standard: { adult: 3000 } },
    amenities: {
      dehydrator: false,
      dryer: false,
      soap: false,
      walkingLane: true,
      kickboard: false,
      flippers: false,
      parking: true,
      swimShop: false,
      cafe: false,
      warmRoom: false,
      over18m: false
    },
    parking_info: '체육센터 주차장 무료',
    etc_info: '경로우대 걷기레인 有 / 보조풀 (수심 75cm) / 유아풀 (수심 40cm)',
    updated_at: NOW_ISO,
    is_deleted: false
  },
  {
    id: 'pool-masan-gym-25m',
    name: '마산실내체육관',
    short_name: '마산실내체육관',
    address: '경남 창원시 마산회원구 삼호로 63',
    address_detail: '마산종합운동장',
    city: '창원시',
    district: '마산회원구',
    phone: '055-712-0533',
    homepage: 'https://www.cwsisul.or.kr',
    lat: 35.2221549,
    lng: 128.5810692,
    lane_length: 25,
    lane_count: 5,
    depth: '1.2m',
    break_rule: '50_10',
    weekly_schedule: {
      0: { isOpen: false, sessions: [], hourlySlots: new Array(24).fill(false) },
      1: { isOpen: true, sessions: [{ partName: '자유수영', start: '06:00', end: '20:00' }], hourlySlots: new Array(24).fill(false).map((_, i) => i >= 6 && i < 20) },
      2: { isOpen: true, sessions: [{ partName: '자유수영', start: '06:00', end: '20:00' }], hourlySlots: new Array(24).fill(false).map((_, i) => i >= 6 && i < 20) },
      3: { isOpen: true, sessions: [{ partName: '자유수영', start: '06:00', end: '20:00' }], hourlySlots: new Array(24).fill(false).map((_, i) => i >= 6 && i < 20) },
      4: { isOpen: true, sessions: [{ partName: '자유수영', start: '06:00', end: '20:00' }], hourlySlots: new Array(24).fill(false).map((_, i) => i >= 6 && i < 20) },
      5: { isOpen: true, sessions: [{ partName: '자유수영', start: '06:00', end: '20:00' }], hourlySlots: new Array(24).fill(false).map((_, i) => i >= 6 && i < 20) },
      6: { isOpen: false, sessions: [], hourlySlots: new Array(24).fill(false) }
    },
    holiday_schedule: { isOpen: false, sessions: [], hourlySlots: new Array(24).fill(false) },
    closed_days_description: '토·일·공휴일 대관 위주 (주말 자유수영 미운영)',
    closed_rules: [{ type: 'weekly', daysOfWeek: [0, 6] }],
    schedule_text: {
      weekday: '06:00~20:00',
      saturday: '미운영 (대관전용)',
      sunday: '미운영 (대관전용)',
      closedDays: '주말 및 공휴일 자유수영 미운영'
    },
    fee: { standard: { adult: 3500 } },
    amenities: {
      dehydrator: false,
      dryer: false,
      soap: false,
      walkingLane: false,
      kickboard: false,
      flippers: false,
      parking: true,
      swimShop: false,
      cafe: false,
      warmRoom: false,
      over18m: false
    },
    parking_info: '마산종합운동장 주차장 이용 가능',
    etc_info: '유아풀 12mX8m (수심 0.8m) / 대관 가능',
    updated_at: NOW_ISO,
    is_deleted: false
  }
];

async function applyUpdates() {
  console.log('[*] 1. 신규 수영장 4곳 Supabase swimi_pools에 추가 (Upsert)...');
  for (const pool of newPools) {
    const { error } = await client.from('swimi_pools').upsert(pool, { onConflict: 'id' });
    if (error) {
      console.error(`[-] ${pool.name} 추가 실패:`, error.message);
    } else {
      console.log(`[+] ${pool.name} (${pool.lane_length}m) DB 추가 완료!`);
    }
  }

  console.log('[*] 2. 레인 규격 50m 보정 2곳 (스포츠아일랜드, 시흥어울림국민체육센터)...');
  const fixTargets = [
    { id: 'pool-145', name: '스포츠아일랜드', lane_length: 50 },
    { id: 'pool-300', name: '시흥어울림국민체육센터', lane_length: 50 },
  ];

  for (const target of fixTargets) {
    const { error } = await client
      .from('swimi_pools')
      .update({ lane_length: target.lane_length, updated_at: NOW_ISO })
      .eq('id', target.id);
    if (error) {
      console.error(`[-] ${target.name} 레인 수정 실패:`, error.message);
    } else {
      console.log(`[+] ${target.name} -> 50m 레인 규격 수정 완료!`);
    }
  }

  console.log('[*] 3. 로컬 public/data/swimming_pools.json 동기화 갱신...');
  const jsonPath = path.resolve(__dirname, '../public/data/swimming_pools.json');
  if (fs.existsSync(jsonPath)) {
    const currentPools = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    // 50m 보정
    currentPools.forEach(p => {
      if (p.id === 'pool-145' || p.id === 'pool-300') {
        p.laneLength = 50;
        p.updatedAt = NOW_ISO;
      }
    });

    // 신규 수영장 추가 (중복 방지)
    const existingIds = new Set(currentPools.map(p => p.id));
    newPools.forEach(np => {
      if (!existingIds.has(np.id)) {
        currentPools.push({
          id: np.id,
          name: np.name,
          shortName: np.short_name,
          address: np.address,
          addressDetail: np.address_detail,
          city: np.city,
          district: np.district,
          phone: np.phone,
          homepage: np.homepage,
          lat: np.lat,
          lng: np.lng,
          laneLength: np.lane_length,
          laneCount: np.lane_count,
          depth: np.depth,
          breakRule: np.break_rule,
          weeklySchedule: np.weekly_schedule,
          holidaySchedule: np.holiday_schedule,
          closedDaysDescription: np.closed_days_description,
          closedRules: np.closed_rules,
          scheduleText: np.schedule_text,
          fee: np.fee,
          amenities: np.amenities,
          parkingInfo: np.parking_info,
          etcInfo: np.etc_info,
          updatedAt: NOW_ISO
        });
      }
    });

    fs.writeFileSync(jsonPath, JSON.stringify(currentPools, null, 2), 'utf8');
    console.log(`[+] swimming_pools.json 동기화 완료: 총 ${currentPools.length}개 풀 저장`);
  }

  console.log('[*] 4. public/data/metadata.json lastUpdate 오늘 날짜(2026-11-17)로 갱신...');
  const metaPath = path.resolve(__dirname, '../public/data/metadata.json');
  const metadata = {
    lastUpdate: TODAY_STR,
    version: '1.2.0',
    note: '강릉아이스아레나 50m 등 신규 4개 수영장 추가 및 스포츠아일랜드·시흥어울림 50m 레인 규격 보정 반영'
  };
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf8');
  console.log(`[+] metadata.json lastUpdate: ${TODAY_STR} 갱신 완료!`);

  console.log('\n[SUCCESS] 전체 DB 업데이트 및 정적 파일 동기화 완료!');
}

applyUpdates();