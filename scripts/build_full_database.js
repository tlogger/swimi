import fs from 'fs';
import { parseArticleText } from './deep_crawl_2stage.js';

// 1. 기존 데이터 읽기
const existingPools = JSON.parse(fs.readFileSync('public/data/swimming_pools.json', 'utf8')).slice(0, 8); // 화성/전주 초기 8개

// 2. jasumap 데이터 및 카페 캐시 읽기
const html = fs.readFileSync('jasumap_raw.html', 'utf8');
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

function buildWeeklySchedule(hasWeekday, hasSat, hasSun, hasHoliday, scheduleText) {
  const weekdaySlots = [
    false, false, false, false, false, false,
    hasWeekday, hasWeekday, hasWeekday, hasWeekday, hasWeekday, hasWeekday,
    hasWeekday, hasWeekday, hasWeekday, hasWeekday, hasWeekday, hasWeekday,
    hasWeekday, hasWeekday, hasWeekday, false, false, false
  ];

  const satSlots = [
    false, false, false, false, false, false,
    false, false, false, hasSat, hasSat, hasSat,
    hasSat, hasSat, hasSat, hasSat, hasSat, false,
    false, false, false, false, false, false
  ];

  const sunSlots = [
    false, false, false, false, false, false,
    false, false, false, hasSun, hasSun, hasSun,
    hasSun, hasSun, hasSun, hasSun, hasSun, false,
    false, false, false, false, false, false
  ];

  const holidaySlots = [
    false, false, false, false, false, false,
    false, false, false, hasHoliday, hasHoliday, hasHoliday,
    hasHoliday, hasHoliday, hasHoliday, hasHoliday, hasHoliday, false,
    false, false, false, false, false, false
  ];

  return {
    weeklySchedule: {
      0: { isOpen: Boolean(hasSun), sessions: [], hourlySlots: sunSlots },
      1: { isOpen: Boolean(hasWeekday), sessions: [], hourlySlots: weekdaySlots },
      2: { isOpen: Boolean(hasWeekday), sessions: [], hourlySlots: weekdaySlots },
      3: { isOpen: Boolean(hasWeekday), sessions: [], hourlySlots: weekdaySlots },
      4: { isOpen: Boolean(hasWeekday), sessions: [], hourlySlots: weekdaySlots },
      5: { isOpen: Boolean(hasWeekday), sessions: [], hourlySlots: weekdaySlots },
      6: { isOpen: Boolean(hasSat), sessions: [], hourlySlots: satSlots },
    },
    holidaySchedule: {
      isOpen: Boolean(hasHoliday),
      sessions: [],
      hourlySlots: holidaySlots
    }
  };
}

const finalPools = [];

// 1. 화성/전주 검증된 수영장 추가 (없는 내용은 제외)
for (const p of existingPools) {
  delete p.fee.outOfDistrict;
  delete p.fee.discountNote;
  p.name = cleanPoolName(p.name);
  p.shortName = cleanPoolName(p.shortName || p.name);

  // amenities 초기화
  p.amenities = {
    dehydrator: true,
    dryer: true,
    soap: false,
    walkingLane: p.features.hasWalkingLane ?? true,
    kickboard: p.features.kickboardAllowed ?? false,
    flippers: p.features.flippersAllowed ?? false,
    parking: p.features.parking?.available ?? true
  };
  p.parkingInfo = p.features.parking?.info;

  // 요일별 스케줄 텍스트
  p.scheduleText = {
    weekday: "06:00 ~ 21:50",
    saturday: "09:00 ~ 17:50",
    sunday: "09:00 ~ 17:50",
    holiday: "09:00 ~ 16:50",
    closedDays: p.closedDaysDescription
  };

  delete p.review; // 카페 평가 섹션 생략

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

  // 2단계 크롤링 데이터 매칭
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

  // 레인 길이
  let laneLength = 25;
  if (parsedArticle?.laneLength) {
    laneLength = parsedArticle.laneLength;
  } else if ((raw['비고1'] && raw['비고1'].includes('50m')) || name.includes('50m')) {
    laneLength = 50;
  }

  // 레인수 (실제 자료에 있는 경우만)
  const laneCount = parsedArticle?.laneCount;

  // 수심 (실제 자료에 명시된 경우만)
  const depth = parsedArticle?.depth;

  // 50분 휴식제 (실제 자료에 명시된 경우만)
  let breakRule = undefined;
  if (parsedArticle && (cache[raw['URL']?.match(/everyswim\/(\d+)/)?.[1]]?.contentHtml || '').includes('50분')) {
    breakRule = '50_10';
  }

  // 요금 (2단계 크롤링 우선, 없으면 1회요금 사용)
  const basePrice = parsedArticle?.fee?.adult || parseInt(raw['1회요금'], 10) || 4000;
  const feeInfo = {
    adult: basePrice,
    teen: parsedArticle?.fee?.teen || (raw['1회요금'] ? Math.round(basePrice * 0.8 / 100) * 100 : undefined),
    child: parsedArticle?.fee?.child || (raw['1회요금'] ? Math.round(basePrice * 0.6 / 100) * 100 : undefined)
  };

  // 주차 정보
  const parkingInfo = parsedArticle?.parkingInfo || (raw['비고1']?.includes('주차') ? raw['비고1'] : undefined);
  const parkingAvailable = parsedArticle?.parkingAvailable ?? (Boolean(parkingInfo) && !parkingInfo?.includes('불가'));

  // 부대시설 및 편의시설 (탈수기, 드라이어, 비누, 걷기레인, 킥판, 오리발, 주차장)
  const amenities = {
    dehydrator: parsedArticle?.amenities?.dehydrator ?? false,
    dryer: parsedArticle?.amenities?.dryer ?? false,
    soap: parsedArticle?.amenities?.soap ?? false,
    walkingLane: parsedArticle?.amenities?.walkingLane ?? true,
    kickboard: parsedArticle?.amenities?.kickboard ?? Boolean(raw['킥판']),
    flippers: parsedArticle?.amenities?.flippers ?? Boolean(raw['오리발']),
    parking: parkingAvailable
  };

  // 기타 비정형 정보 (유아풀, 경사진입로, 수중재활 등 - 실제 자료에 없으면 안 보여줌)
  const etcInfo = parsedArticle?.etcInfo;

  // 요일별 스케줄 텍스트
  const scheduleText = {
    weekday: parsedArticle?.scheduleText?.weekday || (hasWeekday ? "운영 (세부시간 시설문의)" : "미운영"),
    saturday: parsedArticle?.scheduleText?.saturday || (hasSat ? "운영 (세부시간 시설문의)" : "미운영"),
    sunday: parsedArticle?.scheduleText?.sunday || (hasSun ? "운영 (세부시간 시설문의)" : "휴관"),
    holiday: parsedArticle?.scheduleText?.holiday || (hasHoliday ? "운영 (세부시간 시설문의)" : "휴관"),
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
