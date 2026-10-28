import fs from 'fs';

const CACHE_FILE = 'scripts/cafe_cache.json';
let cache = {};
if (fs.existsSync(CACHE_FILE)) {
  try {
    cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    console.log(`Loaded ${Object.keys(cache).length} cached articles.`);
  } catch (e) {
    cache = {};
  }
}

async function fetchArticle(articleId) {
  if (cache[articleId]) {
    return cache[articleId];
  }

  const url = `https://apis.naver.com/cafe-web/cafe-articleapi/v2.1/cafes/30812468/articles/${articleId}`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
      }
    });
    if (res.status === 200) {
      const data = await res.json();
      const article = data.result?.article;
      if (article) {
        const item = {
          id: articleId,
          subject: article.subject || '',
          contentHtml: article.contentHtml || '',
        };
        cache[articleId] = item;
        return item;
      }
    }
  } catch (e) {
    console.error(`Error fetching article ${articleId}:`, e.message);
  }
  return null;
}

// 텍스트에서 구조화된 정보 파싱
export function parseArticleText(rawHtml) {
  if (!rawHtml) return null;
  const text = rawHtml.replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');

  const result = {};

  // 1. 전화번호
  const phoneMatch = text.match(/\[전화\]\s*([0-9]{2,4}-[0-9]{3,4}-[0-9]{4})/);
  if (phoneMatch) {
    result.phone = phoneMatch[1].trim();
  }

  // 2. 주차
  const parkingMatch = text.match(/\[주차\]\s*([^\n\r]+)/);
  if (parkingMatch) {
    const pInfo = parkingMatch[1].trim();
    result.parkingInfo = pInfo;
    result.parkingAvailable = !pInfo.includes('불가') && !pInfo.includes('없음');
  }

  // 3. 규격 (레인길이, 레인수, 수심)
  const specMatch = text.match(/\[규격\]\s*([^\n\r]+)/);
  if (specMatch) {
    const specStr = specMatch[1];
    
    // 레인길이
    const lengthMatch = specStr.match(/(25|50)\s*m/i);
    if (lengthMatch) {
      result.laneLength = parseInt(lengthMatch[1], 10);
    }
    
    // 레인수
    const countMatch = specStr.match(/(\d+)\s*레인/);
    if (countMatch) {
      result.laneCount = parseInt(countMatch[1], 10);
    }
    
    // 수심: "수심확인필요" 등 모호한 것은 제외하고 숫자가 포함된 경우만 수집
    const depthMatch = specStr.match(/수심\s*([0-9.~]+m?)/);
    if (depthMatch && !specStr.includes('수심확인필요') && !specStr.includes('수심 확인 필요')) {
      result.depth = depthMatch[1].trim();
      if (!result.depth.endsWith('m')) result.depth += 'm';
    }
  }

  // 4. 기타 비정형 정보 (유아풀, 경사진입로, 수중재활, 셔틀버스 등)
  const etcMatch = text.match(/\[기타\]\s*([^\n\r]+)/);
  if (etcMatch) {
    const etcStr = etcMatch[1].trim();
    if (etcStr && etcStr !== '-' && etcStr !== '없음') {
      result.etcInfo = etcStr;
    }
  }

  // 5. 요금
  const feeMatch = text.match(/\[일일입장[^\]]*\]\s*([^\n\r]+)/);
  if (feeMatch) {
    const feeLine = feeMatch[1];
    const adultM = feeLine.match(/성인\s*([0-9,]+)/);
    const teenM = feeLine.match(/청소년\s*([0-9,]+)/);
    const childM = feeLine.match(/어린이\s*([0-9,]+)/);
    if (adultM) {
      result.fee = {
        adult: parseInt(adultM[1].replace(/,/g, ''), 10),
        teen: teenM ? parseInt(teenM[1].replace(/,/g, ''), 10) : undefined,
        child: childM ? parseInt(childM[1].replace(/,/g, ''), 10) : undefined
      };
    }
  }

  // 6. 요일별 운영 시간표
  const schedule = {};
  const weekdayMatch = text.match(/\[(?:월~금|평일)\]\s*([^\n\r]+)/);
  if (weekdayMatch) {
    schedule.weekday = weekdayMatch[1].trim();
  }
  const satMatch = text.match(/\[토요일\]\s*([^\n\r]+)/);
  if (satMatch) {
    schedule.saturday = satMatch[1].trim();
  }
  const sunMatch = text.match(/\[일요일\]\s*([^\n\r]+)/);
  if (sunMatch) {
    schedule.sunday = sunMatch[1].trim();
  }
  const holidayMatch = text.match(/\[공휴일\]\s*([^\n\r]+)/);
  if (holidayMatch) {
    schedule.holiday = holidayMatch[1].trim();
  }
  if (Object.keys(schedule).length > 0) {
    result.scheduleText = schedule;
  }

  // 7. 부대시설 키워드 추출
  result.amenities = {
    dehydrator: text.includes('탈수기') && !text.includes('탈수기 없음') && !text.includes('탈수기없음'),
    dryer: text.includes('드라이기') || text.includes('헤어드라이어') || text.includes('드라이어'),
    soap: (text.includes('비누') || text.includes('샴푸')) && !text.includes('비누 없음') && !text.includes('비누없음'),
    walkingLane: text.includes('걷기') && !text.includes('걷기 없음'),
    kickboard: text.includes('킥판') && !text.includes('킥판 금지') && !text.includes('킥판 불가'),
    flippers: text.includes('오리발') && !text.includes('오리발 금지') && !text.includes('오리발 불가'),
    parking: result.parkingAvailable ?? false
  };

  // 8. 홈페이지 (공단, 스포츠센터 등)
  const urls = text.match(/https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}[^\s"'<>\n\r]*/g) || [];
  for (const u of urls) {
    if (!u.includes('naver.com') && !u.includes('tistory.com') && !u.includes('kakao.com') && !u.includes('daum.net')) {
      result.homepage = u;
      break;
    }
  }

  return result;
}

async function run() {
  const html = fs.readFileSync('jasumap_raw.html', 'utf8');
  const match = html.match(/var\s+data\s*=\s*(\[\s*\{[\s\S]*?\}\s*\]);/);
  const jData = JSON.parse(match[1]);
  console.log(`Checking ${jData.length} pools from jasumap...`);

  const articleIds = [];
  jData.forEach(p => {
    if (p['URL']) {
      const m = p['URL'].match(/cafe\.naver\.com\/everyswim\/(\d+)/);
      if (m) {
        articleIds.push(parseInt(m[1], 10));
      }
    }
  });

  const uniqueArticleIds = Array.from(new Set(articleIds));
  console.log(`Found ${uniqueArticleIds.length} unique cafe articles to fetch/parse.`);

  // 배치 다운로드 (동시 10개)
  const batchSize = 10;
  for (let i = 0; i < uniqueArticleIds.length; i += batchSize) {
    const batch = uniqueArticleIds.slice(i, i + batchSize);
    await Promise.all(batch.map(id => fetchArticle(id)));
    if (i % 100 === 0 || i + batchSize >= uniqueArticleIds.length) {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cache), 'utf8');
      console.log(`Progress: ${Math.min(i + batchSize, uniqueArticleIds.length)} / ${uniqueArticleIds.length}`);
    }
  }

  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache), 'utf8');
  console.log('Finished caching all articles.');
}

if (process.argv[1] && process.argv[1].endsWith('deep_crawl_2stage.js')) {
  run();
}
