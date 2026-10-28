import fs from 'fs';
import { parseArticleText } from './deep_crawl_2stage.js';

// 1. 기존 데이터 읽기
const existingPools = JSON.parse(fs.readFileSync('public/data/swimming_pools.json', 'utf8')).slice(0, 8); // 화성/전주 초기 8개

// 2. jasumap 데이터 및 카페 캐시 읽기
let html = '';
if (fs.existsSync('jasumap_raw.html')) {
  html = fs.readFileSync('jasumap_raw.html', 'utf8');
} else {
  console.log('Fetching https://jasumap.com ...');
  const res = await fetch('https://jasumap.com', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  html = await res.text();
}
const match = html.match(/var\s+data\s*=\s*(\[\s*\{[\s\S]*?\}\s*\]);/);
const jData = JSON.parse(match[1]);
const cache = JSON.parse(fs.readFileSync('scripts/cafe_cache.json', 'utf8'));

console.log(`Processing ${jData.length} raw pools with ${Object.keys(cache).length} cached articles...`);

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

/**
 * 텍스트 또는 기본 시간대에서 세션 리스트 생성
 */
function parseSessionsFromText(timeText, defaultStart, defaultEnd) {
  if (!timeText || timeText.includes('미운영') || timeText.includes('휴관')) {
    return [];
  }

  // "08:00~08:50", "13:00~14:50", "06:00 ~ 21:50" 등 시간 패턴 탐색
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

  if (sessions.length > 0) {
    return sessions;
  }

  // 패턴 매칭 실패 시 기본 시간대 적용
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
  // 평일 세션 (기본 06:00 ~ 21:50)
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

  // 토요일 세션 (기본 09:00 ~ 17:50)
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

  // 일요일 세션 (기본 09:00 ~ 17:50)
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

  // 공휴일 세션 (기본 09:00 ~ 17:50)
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

const finalPools = [];

// 1. 화성/전주 검증된 수영장
for (const p of existingPools) {
  delete p.fee.outOfDistrict;
  delete p.fee.discountNote;
  p.name = cleanPoolName(p.name);
  p.shortName = cleanPoolName(p.shortName || p.name);

  p.amenities = {
    dehydrator: true,
    dryer: true,
    soap: false,
    walkingLane: p.features?.hasWalkingLane ?? true,
    kickboard: p.features?.kickboardAllowed ?? false,
    flippers: p.features?.flippersAllowed ?? false,
    parking: p.features?.parking?.available ?? true
  };
  p.parkingInfo = p.features?.parking?.info;

  p.scheduleText = {
    weekday: "06:00 ~ 21:50",
    saturday: "09:00 ~ 17:50",
    sunday: "09:00 ~ 17:50",
    holiday: "09:00 ~ 16:50",
    closedDays: p.closedDaysDescription
  };

  delete p.review;
  finalPools.push(p);
}

const existingNames = new Set(finalPools.map(p => p.name));
let idCounter = 100;

for (const raw of jData) {
  const name = cleanPoolName(raw['이름']);
  const address = cleanAddress(raw['도로명 주소']);
  const lat = parseFloat(raw['위도']);
  const lng = parseFloat(raw['경도']);

  if (!name || isNaN(lat) || isNaN(lng)) continue;
  if (existingNames.has(name)) continue;

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

  let laneLength = 25;
  if (parsedArticle?.laneLength) {
    laneLength = parsedArticle.laneLength;
  } else if ((raw['비고1'] && raw['비고1'].includes('50m')) || name.includes('50m')) {
    laneLength = 50;
  }

  const laneCount = parsedArticle?.laneCount;
  const depth = parsedArticle?.depth;

  let breakRule = undefined;
  if (parsedArticle && (cache[raw['URL']?.match(/everyswim\/(\d+)/)?.[1]]?.contentHtml || '').includes('50분')) {
    breakRule = '50_10';
  }

  const basePrice = parsedArticle?.fee?.adult || parseInt(raw['1회요금'], 10) || 4000;
  const feeInfo = {
    adult: basePrice,
    teen: parsedArticle?.fee?.teen || (raw['1회요금'] ? Math.round(basePrice * 0.8 / 100) * 100 : undefined),
    child: parsedArticle?.fee?.child || (raw['1회요금'] ? Math.round(basePrice * 0.6 / 100) * 100 : undefined)
  };

  const parkingInfo = parsedArticle?.parkingInfo || (raw['비고1']?.includes('주차') ? raw['비고1'] : undefined);
  const parkingAvailable = parsedArticle?.parkingAvailable ?? (Boolean(parkingInfo) && !parkingInfo?.includes('불가'));

  const amenities = {
    dehydrator: parsedArticle?.amenities?.dehydrator ?? false,
    dryer: parsedArticle?.amenities?.dryer ?? false,
    soap: parsedArticle?.amenities?.soap ?? false,
    walkingLane: parsedArticle?.amenities?.walkingLane ?? true,
    kickboard: parsedArticle?.amenities?.kickboard ?? Boolean(raw['킥판']),
    flippers: parsedArticle?.amenities?.flippers ?? Boolean(raw['오리발']),
    parking: parkingAvailable
  };

  const etcInfo = parsedArticle?.etcInfo;

  const scheduleText = {
    weekday: parsedArticle?.scheduleText?.weekday || (hasWeekday ? "06:00 ~ 21:50" : "미운영"),
    saturday: parsedArticle?.scheduleText?.saturday || (hasSat ? "09:00 ~ 17:50" : "미운영"),
    sunday: parsedArticle?.scheduleText?.sunday || (hasSun ? "09:00 ~ 17:50" : "휴관"),
    holiday: parsedArticle?.scheduleText?.holiday || (hasHoliday ? "09:00 ~ 17:50" : "휴관"),
    closedDays: raw['비고1'] || "정기 휴관일 시설 문의"
  };

  const schedule = buildWeeklySchedule(hasWeekday, hasSat, hasSun, hasHoliday, scheduleText);

  const pool = {
    id: `pool-${idCounter++}`,
    name: name,
    shortName: name,
    address: address,
    addressDetail: '',
    city: extractCity(address),
    district: '',
    phone: parsedArticle?.phone,
    homepage: parsedArticle?.homepage || raw['URL2'] || undefined,
    lat: lat,
    lng: lng,
    laneLength: laneLength,
    laneCount: laneCount,
    depth: depth,
    breakRule: breakRule,
    weeklySchedule: schedule.weeklySchedule,
    holidaySchedule: schedule.holidaySchedule,
    closedDaysDescription: raw['비고1'] || '정기 휴관일 시설 문의',
    closedRules: [],
    scheduleText: scheduleText,
    fee: {
      standard: feeInfo
    },
    amenities: amenities,
    parkingInfo: parkingInfo,
    etcInfo: etcInfo,
    links: [
      ...(parsedArticle?.homepage ? [{ title: '시설 홈페이지', url: parsedArticle.homepage }] : []),
      ...(raw['URL2'] ? [{ title: '관련 블로그 리뷰', url: raw['URL2'] }] : [])
    ]
  };

  finalPools.push(pool);
}

console.log(`Final total pools assembled: ${finalPools.length}`);
fs.writeFileSync('public/data/swimming_pools.json', JSON.stringify(finalPools, null, 2), 'utf8');
console.log('Saved to public/data/swimming_pools.json');
