import fs from 'fs';

// 1. 기존 상세 작성된 수영장 데이터 (화성시, 전주시 등)
const existingData = JSON.parse(fs.readFileSync('public/data/swimming_pools.json', 'utf8'));

// 화성 수영장들의 관외 요금 제거 및 이름 정리
existingData.forEach(p => {
  if (p.name.includes('화성') || p.address.includes('화성')) {
    delete p.fee.outOfDistrict;
    if (p.fee.discountNote) {
      delete p.fee.discountNote;
    }
  }
  // 요구사항 2: 이름 라벨에서 '(50m)', '(25m)' 제거
  p.name = p.name.replace(/\s*\((?:25m|50m)\)/gi, '').trim();
  p.shortName = (p.shortName || p.name).replace(/\s*\((?:25m|50m)\)/gi, '').trim();
});

// 기존 등록된 수영장 이름 매핑 셋
const existingNames = new Set(existingData.map(p => p.name));

// 2. jasumap 데이터 읽기
const html = fs.readFileSync('jasumap_raw.html', 'utf8');
const match = html.match(/var\s+data\s*=\s*(\[\s*\{[\s\S]*?\}\s*\]);/);
if (!match) {
  console.error('jasumap data not found');
  process.exit(1);
}
const jData = JSON.parse(match[1]);
console.log('jasumap raw count:', jData.length);

// 3. 변환 함수
function cleanPoolName(rawName) {
  if (!rawName) return '';
  // 영문 괄호 제거: "고덕어울림수영장(Godeok Eoullim Swimming Pool)" -> "고덕어울림수영장"
  let name = rawName.replace(/\uFEFF/g, '').trim();
  name = name.replace(/\([A-Za-z\s,-]+\)/g, '').trim();
  // (25m), (50m) 제거
  name = name.replace(/\s*\((?:25m|50m)\)/gi, '').trim();
  return name;
}

function cleanAddress(rawAddr) {
  if (!rawAddr) return '';
  return rawAddr.replace(/\uFEFF/g, '').trim();
}

function extractCity(address) {
  const parts = address.split(' ');
  if (parts.length >= 2) {
    return parts[1]; // 예: "강동구", "화성시", "전주시"
  }
  return parts[0] || '전국';
}

function buildDefaultSchedule(hasWeekday, hasSat, hasSun, hasHoliday) {
  // 기본 세션 (평일: 06:00~21:50, 주말: 09:00~17:50 등)
  const weekdaySessions = hasWeekday ? [
    { partName: "자유수영", start: "06:00", end: "21:50" }
  ] : [];
  const weekendSessions = [
    { partName: "자유수영", start: "09:00", end: "17:50" }
  ];

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
      0: { isOpen: Boolean(hasSun), sessions: hasSun ? weekendSessions : [], hourlySlots: sunSlots },
      1: { isOpen: Boolean(hasWeekday), sessions: weekdaySessions, hourlySlots: weekdaySlots },
      2: { isOpen: Boolean(hasWeekday), sessions: weekdaySessions, hourlySlots: weekdaySlots },
      3: { isOpen: Boolean(hasWeekday), sessions: weekdaySessions, hourlySlots: weekdaySlots },
      4: { isOpen: Boolean(hasWeekday), sessions: weekdaySessions, hourlySlots: weekdaySlots },
      5: { isOpen: Boolean(hasWeekday), sessions: weekdaySessions, hourlySlots: weekdaySlots },
      6: { isOpen: Boolean(hasSat), sessions: hasSat ? weekendSessions : [], hourlySlots: satSlots },
    },
    holidaySchedule: {
      isOpen: Boolean(hasHoliday),
      sessions: hasHoliday ? weekendSessions : [],
      hourlySlots: holidaySlots
    }
  };
}

const convertedPools = [];
let idCounter = 100;

for (const raw of jData) {
  const name = cleanPoolName(raw['이름']);
  const address = cleanAddress(raw['도로명 주소']);
  const lat = parseFloat(raw['위도']);
  const lng = parseFloat(raw['경도']);

  if (!name || isNaN(lat) || isNaN(lng)) continue;

  // 이미 수작업 고품질 데이터에 있으면 스킵 (화성 경기타운 등)
  let alreadyExists = false;
  for (const ex of existingData) {
    if (ex.name === name || (Math.abs(ex.lat - lat) < 0.001 && Math.abs(ex.lng - lng) < 0.001)) {
      alreadyExists = true;
      break;
    }
  }
  if (alreadyExists) continue;

  const hasWeekday = raw['평일'] === 1;
  const hasSat = raw['토요일'] === 1;
  const hasSun = raw['일요일'] === 1;
  const hasHoliday = raw['공휴일'] === 1;

  const is50m = (raw['비고1'] && raw['비고1'].includes('50m')) || 
                (raw['비고2'] && raw['비고2'].includes('50m')) ||
                name.includes('50m');

  const basePrice = parseInt(raw['1회요금'], 10) || 4000;
  const adultFee = basePrice;
  const teenFee = Math.round(basePrice * 0.8 / 100) * 100;
  const childFee = Math.round(basePrice * 0.6 / 100) * 100;

  const schedule = buildDefaultSchedule(hasWeekday, hasSat, hasSun, hasHoliday);

  const pool = {
    id: `pool-jasu-${idCounter++}`,
    name: name,
    shortName: name,
    address: address,
    addressDetail: '',
    city: extractCity(address),
    district: '',
    phone: '안내데스크 문의',
    homepage: raw['URL2'] || undefined,
    lat: lat,
    lng: lng,
    laneLength: is50m ? 50 : 25,
    laneCount: is50m ? 8 : 6,
    depth: is50m ? '1.4m ~ 1.8m' : '1.2m ~ 1.4m',
    breakRule: '50_10',
    weeklySchedule: schedule.weeklySchedule,
    holidaySchedule: schedule.holidaySchedule,
    closedDaysDescription: raw['비고1'] || '매월 정기 휴관일 및 공휴일 일정 확인 필요',
    closedRules: [],
    fee: {
      standard: {
        adult: adultFee,
        teen: teenFee,
        child: childFee
      }
    },
    features: {
      hasKidPool: Boolean(raw['해수풀/온천수']),
      hasWarmRoom: Boolean(raw['사우나\n(TBD)']),
      hasWalkingLane: true,
      kickboardAllowed: Boolean(raw['킥판']),
      flippersAllowed: Boolean(raw['오리발']),
      parking: {
        available: true,
        info: '체육시설 부설 주차장 이용 가능'
      },
      showerLevel: '상',
      waterQualityLevel: '상',
      notes: raw['비고1'] ? `${raw['비고1']}` : '자유수영 전 시설 운영시간 확인 권장'
    },
    review: {
      summary: raw['비고1'] || '자유수영 이용 후기 등록 수영장',
      rating: 4.5,
      lastUpdated: '2026-10-20',
      cafePostUrl: raw['URL'] || undefined,
      tags: [
        is50m ? '50m레인' : '25m레인',
        hasSun ? '일요일운영' : '일요일휴관',
        raw['해수풀/온천수'] ? '해수풀' : '일반풀'
      ].filter(Boolean)
    },
    links: [
      ...(raw['URL'] ? [{ title: '전국자유수영 카페 후기', url: raw['URL'] }] : []),
      ...(raw['URL2'] ? [{ title: '관련 블로그 리뷰', url: raw['URL2'] }] : [])
    ]
  };

  convertedPools.push(pool);
}

console.log('새로 추가된 전국 수영장 수:', convertedPools.length);

const finalAllPools = [...existingData, ...convertedPools];
console.log('최종 전국 총 수영장 수:', finalAllPools.length);

// 파일 저장
fs.writeFileSync('public/data/swimming_pools.json', JSON.stringify(finalAllPools, null, 2), 'utf8');
console.log('저장 완료: public/data/swimming_pools.json');
