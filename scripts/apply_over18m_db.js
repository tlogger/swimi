import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const poolsPath = path.join(__dirname, '../public/data/swimming_pools.json');
const pools = JSON.parse(fs.readFileSync(poolsPath, 'utf8'));

// Article 2914 specific pools with known depths
const article2914Pools = {
  // 서울
  'pool-204': { depth: '1.2m~1.8m', note: 'KBS스포츠월드 (수심 1.8m)' },
  'pool-135': { depth: '1.5m~1.8m', note: '서울YMCA관광호텔 (수심 1.8m)' },
  'pool-103': { depth: '1.2m~2.0m', note: '올림픽수영장 (경영풀 1.2~2.0m, 다이빙풀 5.0m)' },
  // 경기
  'pool-351': { depth: '1.4m~2.0m', note: '탄천종합운동장 (수심 1.4~2.0m)' },
  'pool-321': { depth: '1.3m~1.8m', note: '안양종합운동장실내수영장 (수심 1.3~1.8m)' },
  'hwaseong-uni-center-50m': { depth: '1.3m~1.8m', note: '유앤아이센터 수영장 (수심 1.3~1.8m)' },
  'pool-384': { depth: '1.3m~1.8m', note: '유앤아이센터 (수심 1.3~1.8m)' },
  'pool-391': { depth: '1.4m~1.8m', note: '이천스포츠센터 (수심 1.4~1.8m)' },
  'pool-330': { depth: '1.2m~1.8m', note: '대부동복지체육센터 (수심 1.2~1.8m)' },
  'pool-334': { depth: '1.4m~1.8m', note: '안산올림픽기념관 (수심 1.4~1.8m)' },
  'pool-425': { depth: '1.3m~1.8m', note: '에덴수영장 (수심 1.3~1.8m)' },
  // 인천
  'pool-255': { depth: '1.35m~2.0m', note: '드림파크스포츠센터 (수심 1.35~2.0m)' },
  'pool-263': { depth: '1.35m~2.0m', note: '인천도원수영장 (수심 1.35~2.0m)' },
  'pool-266': { depth: '1.35m~2.0m', note: '문학박태환수영장 (경영풀 1.35~2.0m, 다이빙풀 5.0m)' },
  // 충청
  'pool-514': { depth: '1.4m~1.8m', note: '단양군청소년수련관 (수심 1.4~1.8m)' },
  'pool-492': { depth: '1.35m~1.8m', note: '아산배미수영장 (수심 1.35~1.8m)' },
  'pool-488': { depth: '1.3m~1.8m', note: '천안시설관리공단(한들문화센터) (수심 1.3~1.8m)' },
  'pool-447': { depth: '1.3m~1.8m', note: '추목수영장 (수심 1.3~1.8m)' },
  'pool-453': { depth: '1.4m~1.8m', note: '한밭수영장 (경영풀 1.4~1.8m, 다이빙풀 5.0m)' },
  'pool-502': { depth: '1.4m~1.8m', note: '청주실내수영장 (수심 1.4~1.8m)' },
  // 전라
  'pool-544': { depth: '2.0m', note: '남부대학교시립국제수영장 (국제공인 2.0m)' },
  'pool-907': { depth: '1.35m~1.8m', note: '광양수영장 (수심 1.35~1.8m)' },
  // 경상
  'pool-614': { depth: '1.35m~1.8m', note: '김천시시설관리공단 (수심 1.35~1.8m)' },
  'pool-699': { depth: '1.4m~1.8m', note: '창원실내수영장 (수심 1.4~1.8m)' },
  'pool-761': { depth: '1.35m~2.0m', note: '부산사직종합운동장실내수영장 (수심 1.35~2.0m)' },
};

// Check max depth from depth string
function parseMaxDepth(depthStr) {
  if (!depthStr) return null;
  // Fix known typos
  const cleanStr = depthStr.replace('1.1~125m', '1.1~1.25m');
  const matches = cleanStr.match(/\d+(\.\d+)?/g);
  if (!matches) return null;
  const numbers = matches.map(Number).filter(n => n >= 0.5 && n <= 10.0);
  if (numbers.length === 0) return null;
  return Math.max(...numbers);
}

let articleCount = 0;
let parsedDepthCount = 0;
const over18List = [];

pools.forEach(pool => {
  let isOver18 = false;

  // 1. Check article pools
  if (article2914Pools[pool.id]) {
    isOver18 = true;
    articleCount++;
    const meta = article2914Pools[pool.id];
    // If pool depth is less than 1.8 or missing, update it from article info
    const curMax = parseMaxDepth(pool.depth);
    if (!curMax || curMax < 1.8) {
      pool.depth = meta.depth;
    }
  }

  // 2. Check depth parsing
  const maxD = parseMaxDepth(pool.depth);
  if (maxD && maxD >= 1.8) {
    if (!isOver18) {
      parsedDepthCount++;
      isOver18 = true;
    }
  }

  if (isOver18) {
    pool.over18m = true;
    if (!pool.amenities) {
      pool.amenities = {
        dehydrator: false,
        dryer: false,
        soap: false,
        walkingLane: false,
        kickboard: false,
        flippers: false,
        parking: false,
      };
    }
    pool.amenities.over18m = true;
    over18List.push({ id: pool.id, name: pool.name, depth: pool.depth });
  } else {
    pool.over18m = false;
    if (pool.amenities) {
      pool.amenities.over18m = false;
    }
  }
});

console.log(`총 ${over18List.length}개 수영장에 over18m: true 적용 완료! (카페 게시글 매칭: ${articleCount}개, 기존 DB 수심 파싱: ${parsedDepthCount}개)`);
console.log('수영장 목록:');
over18List.forEach((p, idx) => console.log(`${idx + 1}. [${p.id}] ${p.name} - 수심: ${p.depth}`));

fs.writeFileSync(poolsPath, JSON.stringify(pools, null, 2), 'utf8');
console.log(`Saved to ${poolsPath}`);
