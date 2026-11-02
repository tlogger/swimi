import fs from 'fs';
import { parseArticleText } from './deep_crawl_2stage.js';

// 1. 기존 swimming_pools.json 읽기
const currentPools = JSON.parse(fs.readFileSync('public/data/swimming_pools.json', 'utf8'));
const initialTop8 = currentPools.slice(0, 8); // 화성 6 + 전주 2

// 2. jasumap 데이터 및 카페 캐시 읽기
const html = fs.readFileSync('jasumap_raw.html', 'utf8');
const match = html.match(/var\s+data\s*=\s*(\[\s*\{[\s\S]*?\}\s*\]);/);
if (!match) {
  console.error('jasumap data not found in jasumap_raw.html');
  process.exit(1);
}
const jData = JSON.parse(match[1]);
const cache = JSON.parse(fs.readFileSync('scripts/cafe_cache.json', 'utf8'));

console.log(`Starting sync: Current ${currentPools.length} pools, Jasumap raw ${jData.length} pools...`);

function cleanPoolName(rawName) {
  if (!rawName) return '';
  let name = rawName.replace(/\uFEFF/g, '').trim();
  name = name.replace(/\([A-Za-z\s,-]+\)/g, '').trim();
  name = name.replace(/\s*\((?:25m|50m)\)/gi, '').trim();
  return name;
}

function cleanAddress(rawAddr) {
  if (!rawAddr) return '';
  return rawAddr.replace(/\uFEFF/g, '').trim();
}

function extractCity(address) {
  const parts = address.split(' ');
  if (parts.length >= 2) return parts[1];
  return parts[0] || '전국';
}

function parseSessionsFromText(timeText, defaultStart, defaultEnd) {
  if (!timeText || timeText.includes('미운영') || timeText.includes('휴관')) {
    return [];
  }
  const timeRegex = /(\d{1,2}:\d{2})\s*[~-]\s*(\d{1,2}:\d{2})/g;
  const sessions = [];
  let m;
  while ((m = timeRegex.exec(timeText)) !== null) {
    let start = m[1].padStart(5, '0');
    let end = m[2].padStart(5, '0');
    sessions.push({
      partName: '자유수영',
      start: start,
      end: end
    });
  }
  if (sessions.length > 0) return sessions;
  return [
    {
      partName: '자유수영',
      start: defaultStart,
      end: defaultEnd
    }
  ];
}

function buildSlotsFromSessions(sessions, fallbackSlots) {
  if (!sessions || sessions.length === 0) {
    return fallbackSlots;
  }
  const slots = new Array(24).fill(false);
  sessions.forEach(sess => {
    const [startH] = sess.start.split(':').map(Number);
    const [endH, endM] = sess.end.split(':').map(Number);
    for (let h = startH; h <= (endM > 0 ? endH : endH - 1) && h < 24; h++) {
      slots[h] = true;
    }
  });
  return slots;
}

function buildWeeklySchedule(hasWeekday, hasSat, hasSun, hasHoliday, scheduleText) {
  const weekdaySessions = hasWeekday 
    ? parseSessionsFromText(scheduleText?.weekday, "06:00", "21:50")
    : [];
  const defaultWeekdaySlots = [
    false, false, false, false, false, false,
    hasWeekday, hasWeekday, hasWeekday, hasWeekday, hasWeekday, hasWeekday,
    hasWeekday, hasWeekday, hasWeekday, hasWeekday, hasWeekday, hasWeekday,
    hasWeekday, hasWeekday, hasWeekday, false, false, false
  ];
  const weekdaySlots = buildSlotsFromSessions(weekdaySessions, defaultWeekdaySlots);

  const satSessions = hasSat
    ? parseSessionsFromText(scheduleText?.saturday, "09:00", "17:50")
    : [];
  const defaultSatSlots = [
    false, false, false, false, false, false,
    false, false, false, hasSat, hasSat, hasSat,
    hasSat, hasSat, hasSat, hasSat, hasSat, false,
    false, false, false, false, false, false
  ];
  const satSlots = buildSlotsFromSessions(satSessions, defaultSatSlots);

  const sunSessions = hasSun
    ? parseSessionsFromText(scheduleText?.sunday, "09:00", "17:50")
    : [];
  const defaultSunSlots = [
    false, false, false, false, false, false,
    false, false, false, hasSun, hasSun, hasSun,
    hasSun, hasSun, hasSun, hasSun, hasSun, false,
    false, false, false, false, false, false
  ];
  const sunSlots = buildSlotsFromSessions(sunSessions, defaultSunSlots);

  const holidaySessions = hasHoliday
    ? parseSessionsFromText(scheduleText?.holiday, "09:00", "17:50")
    : [];
  const defaultHolidaySlots = [
    false, false, false, false, false, false,
    false, false, false, hasHoliday, hasHoliday, hasHoliday,
    hasHoliday, hasHoliday, hasHoliday, hasHoliday, hasHoliday, false,
    false, false, false, false, false, false
  ];
  const holidaySlots = buildSlotsFromSessions(holidaySessions, defaultHolidaySlots);

  return {
    weeklySchedule: {
      0: { isOpen: Boolean(hasSun), sessions: sunSessions, hourlySlots: sunSlots },
      1: { isOpen: Boolean(hasWeekday), sessions: weekdaySessions, hourlySlots: weekdaySlots },
      2: { isOpen: Boolean(hasWeekday), sessions: weekdaySessions, hourlySlots: weekdaySlots },
      3: { isOpen: Boolean(hasWeekday), sessions: weekdaySessions, hourlySlots: weekdaySlots },
      4: { isOpen: Boolean(hasWeekday), sessions: weekdaySessions, hourlySlots: weekdaySlots },
      5: { isOpen: Boolean(hasWeekday), sessions: weekdaySessions, hourlySlots: weekdaySlots },
      6: { isOpen: Boolean(hasSat), sessions: satSessions, hourlySlots: satSlots },
    },
    holidaySchedule: {
      isOpen: Boolean(hasHoliday),
      sessions: holidaySessions,
      hourlySlots: holidaySlots
    }
  };
}

// 초기 8개 수영장 세팅
const finalPools = [...initialTop8];
const changeLog = {
  feeUpdates: [],
  addressUpdates: [],
  scheduleUpdates: [],
  amenityUpdates: []
};

// 중복 방지를 위한 좌표 키 셋 (초기 8개 등록)
const registeredCoordSet = new Set();
initialTop8.forEach(p => {
  registeredCoordSet.add(`${p.lat.toFixed(4)},${p.lng.toFixed(4)}`);
});

let idCounter = 100;

for (const raw of jData) {
  const name = cleanPoolName(raw['이름']);
  const address = cleanAddress(raw['도로명 주소']);
  const lat = parseFloat(raw['위도']);
  const lng = parseFloat(raw['경도']);

  if (!name || isNaN(lat) || isNaN(lng)) continue;

  const coordKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  // 완전히 동일한 좌표에 중복 등록된 항목 스킵 (예: 함안체육관, 광교복합체육센터 jasumap 내부 중복)
  if (registeredCoordSet.has(coordKey)) {
    continue;
  }
  registeredCoordSet.add(coordKey);

  // 기존 DB에서 해당 수영장이 있었는지 검색
  const existing = currentPools.find(p => {
    const latDiff = Math.abs(p.lat - lat);
    const lngDiff = Math.abs(p.lng - lng);
    const sameName = (p.name === name || p.shortName === name);
    return (sameName && latDiff < 0.005 && lngDiff < 0.005) || (latDiff < 0.0005 && lngDiff < 0.0005);
  });

  // 카페 아티클 파싱 데이터
  let parsedArticle = null;
  if (raw['URL']) {
    const m = raw['URL'].match(/cafe\.naver\.com\/everyswim\/(\d+)/);
    if (m) {
      const artId = m[1];
      if (cache[artId] && cache[artId].contentHtml) {
        parsedArticle = parseArticleText(cache[artId].contentHtml);
      }
    }
  }

  const hasWeekday = raw['평일'] === 1;
  const hasSat = raw['토요일'] === 1;
  const hasSun = raw['일요일'] === 1;
  const hasHoliday = raw['공휴일'] === 1;

  let laneLength = existing?.laneLength || 25;
  if (parsedArticle?.laneLength) {
    laneLength = parsedArticle.laneLength;
  } else if ((raw['비고1'] && raw['비고1'].includes('50m')) || name.includes('50m')) {
    laneLength = 50;
  }

  const laneCount = parsedArticle?.laneCount || existing?.laneCount;
  const depth = parsedArticle?.depth || existing?.depth;

  let breakRule = existing?.breakRule;
  if (!breakRule && parsedArticle && (cache[raw['URL']?.match(/everyswim\/(\d+)/)?.[1]]?.contentHtml || '').includes('50분')) {
    breakRule = '50_10';
  }

  // 요금 판정: jasumap의 '1회요금'이 명시되어 있고 기존 요금과 다를 때 갱신
  const rawPrice = parseInt(raw['1회요금'], 10);
  let basePrice = rawPrice || parsedArticle?.fee?.adult || existing?.fee?.standard?.adult || 4000;

  // 이상치 보정 (2원, 33원 등)
  if (basePrice < 1000 && rawPrice >= 1000) {
    basePrice = rawPrice;
  }

  if (existing && existing.fee?.standard?.adult && existing.fee.standard.adult !== basePrice) {
    changeLog.feeUpdates.push({
      name: name,
      before: existing.fee.standard.adult,
      after: basePrice
    });
  }

  const feeInfo = {
    adult: basePrice,
    teen: parsedArticle?.fee?.teen || (basePrice ? Math.round(basePrice * 0.8 / 100) * 100 : undefined),
    child: parsedArticle?.fee?.child || (basePrice ? Math.round(basePrice * 0.6 / 100) * 100 : undefined)
  };

  // 주소 갱신 감지
  if (existing && address && existing.address !== address && !existing.name.includes('화성')) {
    changeLog.addressUpdates.push({
      name: name,
      before: existing.address,
      after: address
    });
  }

  // 일정 감지
  const scheduleText = {
    weekday: parsedArticle?.scheduleText?.weekday || (hasWeekday ? "06:00 ~ 21:50" : "미운영"),
    saturday: parsedArticle?.scheduleText?.saturday || (hasSat ? "09:00 ~ 17:50" : "미운영"),
    sunday: parsedArticle?.scheduleText?.sunday || (hasSun ? "09:00 ~ 17:50" : "휴관"),
    holiday: parsedArticle?.scheduleText?.holiday || (hasHoliday ? "09:00 ~ 17:50" : "휴관"),
    closedDays: raw['비고1'] || existing?.scheduleText?.closedDays || "정기 휴관일 시설 문의"
  };

  const schedule = buildWeeklySchedule(hasWeekday, hasSat, hasSun, hasHoliday, scheduleText);

  // 일정 변경 기록
  if (existing) {
    const curSun = existing.weeklySchedule?.[0]?.isOpen;
    const curSat = existing.weeklySchedule?.[6]?.isOpen;
    const curHoliday = existing.holidaySchedule?.isOpen;
    const diffs = [];
    if (hasSun !== curSun) diffs.push(`일요일: ${curSun ? '운영' : '휴관'} -> ${hasSun ? '운영' : '휴관'}`);
    if (hasSat !== curSat) diffs.push(`토요일: ${curSat ? '운영' : '휴관'} -> ${hasSat ? '운영' : '휴관'}`);
    if (hasHoliday !== curHoliday) diffs.push(`공휴일: ${curHoliday ? '운영' : '휴관'} -> ${hasHoliday ? '운영' : '휴관'}`);
    if (diffs.length > 0) {
      changeLog.scheduleUpdates.push({ name: name, diffs: diffs.join(', ') });
    }
  }

  const parkingInfo = parsedArticle?.parkingInfo || existing?.parkingInfo || (raw['비고1']?.includes('주차') ? raw['비고1'] : undefined);
  const parkingAvailable = parsedArticle?.parkingAvailable ?? existing?.amenities?.parking ?? (Boolean(parkingInfo) && !parkingInfo?.includes('불가'));

  const kickboard = Boolean(raw['킥판']);
  const flippers = Boolean(raw['오리발']);

  if (existing && (existing.amenities?.kickboard !== kickboard || existing.amenities?.flippers !== flippers)) {
    changeLog.amenityUpdates.push({
      name: name,
      kickboard: `${existing.amenities?.kickboard} -> ${kickboard}`,
      flippers: `${existing.amenities?.flippers} -> ${flippers}`
    });
  }

  const amenities = {
    dehydrator: parsedArticle?.amenities?.dehydrator ?? existing?.amenities?.dehydrator ?? false,
    dryer: parsedArticle?.amenities?.dryer ?? existing?.amenities?.dryer ?? false,
    soap: parsedArticle?.amenities?.soap ?? existing?.amenities?.soap ?? false,
    walkingLane: parsedArticle?.amenities?.walkingLane ?? existing?.amenities?.walkingLane ?? true,
    kickboard: kickboard,
    flippers: flippers,
    parking: parkingAvailable
  };

  const etcInfo = parsedArticle?.etcInfo || existing?.etcInfo;

  const pool = {
    id: existing?.id || `pool-${idCounter++}`,
    name: name,
    shortName: name,
    address: (existing && existing.name.includes('화성')) ? existing.address : address,
    addressDetail: existing?.addressDetail || '',
    city: extractCity(address),
    district: existing?.district || '',
    phone: parsedArticle?.phone || existing?.phone || '안내데스크 문의',
    homepage: parsedArticle?.homepage || raw['URL2'] || existing?.homepage || undefined,
    lat: lat,
    lng: lng,
    laneLength: laneLength,
    laneCount: laneCount,
    depth: depth,
    breakRule: breakRule,
    weeklySchedule: schedule.weeklySchedule,
    holidaySchedule: schedule.holidaySchedule,
    closedDaysDescription: raw['비고1'] || existing?.closedDaysDescription || '정기 휴관일 시설 문의',
    closedRules: existing?.closedRules || [],
    scheduleText: scheduleText,
    fee: {
      standard: feeInfo
    },
    amenities: amenities,
    parkingInfo: parkingInfo,
    etcInfo: etcInfo,
    links: [
      ...(parsedArticle?.homepage ? [{ title: '시설 홈페이지', url: parsedArticle.homepage }] : []),
      ...(raw['URL2'] ? [{ title: '관련 블로그 리뷰', url: raw['URL2'] }] : []),
      ...(raw['URL'] ? [{ title: '전국자유수영 카페 정보', url: raw['URL'] }] : [])
    ]
  };

  finalPools.push(pool);
}

console.log(`Sync completed: Total ${finalPools.length} pools generated.`);
console.log(`- Fee updates: ${changeLog.feeUpdates.length}`);
console.log(`- Address updates: ${changeLog.addressUpdates.length}`);
console.log(`- Schedule updates: ${changeLog.scheduleUpdates.length}`);
console.log(`- Amenity updates: ${changeLog.amenityUpdates.length}`);

// 파일 저장
fs.writeFileSync('public/data/swimming_pools.json', JSON.stringify(finalPools, null, 2), 'utf8');
console.log('Saved to public/data/swimming_pools.json');

// 메타데이터 저장 (Last Update 날짜 포함)
const todayStr = new Date().toISOString().slice(0, 10);
const metadata = {
  lastUpdate: todayStr,
  poolCount: finalPools.length
};
fs.writeFileSync('public/data/metadata.json', JSON.stringify(metadata, null, 2), 'utf8');
console.log(`Saved metadata to public/data/metadata.json (Last Update: ${todayStr})`);

// 변경 내역 로그 저장
fs.writeFileSync('scripts/last_sync_report.json', JSON.stringify(changeLog, null, 2), 'utf8');
console.log('Saved report to scripts/last_sync_report.json');
