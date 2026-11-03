import { SwimmingPool, PoolCurrentStatus, TimeSession, DaySchedule, ClosedRule } from '../types/pool';

const KOR_DAY_MAP: Record<string, number> = {
  '일': 0, '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6
};

export interface BreakRange {
  start: number; // 분 (00:00 기준)
  end: number;   // 분 (00:00 기준)
  startStr: string;
  endStr: string;
}

/**
 * 브레이크 타임 문자열(예: "12:00~13:00, 17:00~18:00")을 파싱
 */
export function parseBreakTimeRanges(breakTimeStr?: string): BreakRange[] {
  if (!breakTimeStr || !breakTimeStr.trim()) return [];
  const ranges: BreakRange[] = [];
  const regex = /(\d{1,2}:\d{2})\s*[~-]\s*(\d{1,2}:\d{2})/g;
  let m;
  while ((m = regex.exec(breakTimeStr)) !== null) {
    const startStr = m[1].padStart(5, '0');
    const endStr = m[2].padStart(5, '0');
    ranges.push({
      start: timeStringToMinutes(startStr),
      end: timeStringToMinutes(endStr),
      startStr,
      endStr
    });
  }
  return ranges;
}

/**
 * 특정 시간대(hour, 0~23)가 브레이크 타임 구간과 겹치는지 확인
 */
export function isHourInBreakTime(hour: number, breakRanges: BreakRange[]): boolean {
  if (!breakRanges || breakRanges.length === 0) return false;
  const hourStart = hour * 60;
  const hourEnd = (hour + 1) * 60;

  return breakRanges.some((r) => {
    return Math.max(hourStart, r.start) < Math.min(hourEnd, r.end);
  });
}

/**
 * 휴관일 텍스트(예: "1,3주차 일요일 휴관", "매주 월요일", "둘째, 넷째 일요일", "공휴일 휴관")를 ClosedRule[]로 파싱
 */
export function parseClosedDaysDescription(text?: string): ClosedRule[] {
  if (!text || !text.trim()) return [];
  const rules: ClosedRule[] = [];
  const clean = text.trim();

  // 1. 공휴일 / 명절 체크
  if (clean.includes('공휴일') || clean.includes('법정공휴일') || clean.includes('명절') || clean.includes('국경일')) {
    rules.push({ type: 'holidays' });
  }

  const parseWeeksFromSegment = (seg: string): number[] => {
    const weeks: number[] = [];
    const numMatches = seg.match(/[1-5]/g);
    if (numMatches) {
      numMatches.forEach((n) => {
        const num = parseInt(n, 10);
        if (!weeks.includes(num)) weeks.push(num);
      });
    }
    if (seg.includes('첫') || seg.includes('첫째') || seg.includes('첫번째')) if (!weeks.includes(1)) weeks.push(1);
    if (seg.includes('둘') || seg.includes('둘째') || seg.includes('두번째')) if (!weeks.includes(2)) weeks.push(2);
    if (seg.includes('셋') || seg.includes('셋째') || seg.includes('세번째')) if (!weeks.includes(3)) weeks.push(3);
    if (seg.includes('넷') || seg.includes('넷째') || seg.includes('네번째')) if (!weeks.includes(4)) weeks.push(4);
    if (seg.includes('다섯') || seg.includes('다섯째')) if (!weeks.includes(5)) weeks.push(5);
    return weeks.sort();
  };

  // N주차 요일 정규식 (예: "1,3주차 일요일", "2, 4주 토요일", "둘째 넷째 일요일")
  const nthRegex = /([0-9,\s·/첫둘셋넷다섯번째주차]+)\s*(?:주|주차|번째주|째주)?\s*([일월화수목금토](?:요일)?)/g;
  let match;
  let matchedNth = false;

  while ((match = nthRegex.exec(clean)) !== null) {
    const weekStr = match[1];
    const dayStr = match[2].charAt(0);
    const weeks = parseWeeksFromSegment(weekStr);
    const weekday = KOR_DAY_MAP[dayStr];

    if (weeks.length > 0 && weekday !== undefined) {
      rules.push({
        type: 'nth_weekday',
        weekday,
        weeks
      });
      matchedNth = true;
    }
  }

  // 매주 요일 패턴 (예: "매주 월요일", "매주 월, 수요일", "월요일 휴관")
  if (!matchedNth) {
    const hasWeekKeywords = /[1-5]주|주차|첫째|둘째|셋째|넷째/.test(clean);
    if (!hasWeekKeywords) {
      const weeklyRegex = /(?:매주|매월)?\s*([일월화수목금토](?:요일)?)/g;
      let wMatch;
      const weeklyDays: number[] = [];

      while ((wMatch = weeklyRegex.exec(clean)) !== null) {
        const dChar = wMatch[1].charAt(0);
        const dNum = KOR_DAY_MAP[dChar];
        if (dNum !== undefined && !weeklyDays.includes(dNum)) {
          weeklyDays.push(dNum);
        }
      }
      if (weeklyDays.length > 0) {
        rules.push({
          type: 'weekly',
          daysOfWeek: weeklyDays
        });
      }
    }
  }

  return rules;
}

/**
 * 운영시간 텍스트에서 TimeSession[] 및 24시간 boolean[] hourlySlots 생성
 */
export function rebuildDaySchedule(timeText?: string): DaySchedule {
  if (!timeText || !timeText.trim()) {
    return { isOpen: false, sessions: [], hourlySlots: new Array(24).fill(false) };
  }

  const clean = timeText.trim();
  if (clean.includes('미운영') || clean.includes('휴관') || clean.includes('없음')) {
    return { isOpen: false, sessions: [], hourlySlots: new Array(24).fill(false) };
  }

  const timeRegex = /(\d{1,2}:\d{2})\s*[~-]\s*(\d{1,2}:\d{2})/g;
  const sessions: TimeSession[] = [];
  let m;
  while ((m = timeRegex.exec(clean)) !== null) {
    const start = m[1].padStart(5, '0');
    const end = m[2].padStart(5, '0');
    sessions.push({
      partName: '자유수영',
      start,
      end
    });
  }

  const hourlySlots = new Array(24).fill(false);

  if (sessions.length > 0) {
    sessions.forEach((sess) => {
      const [startH] = sess.start.split(':').map(Number);
      const [endH, endM] = sess.end.split(':').map(Number);
      for (let h = startH; h <= (endM > 0 ? endH : endH - 1) && h < 24; h++) {
        hourlySlots[h] = true;
      }
    });

    return {
      isOpen: true,
      sessions,
      hourlySlots
    };
  }

  return {
    isOpen: true,
    sessions: [{ partName: '자유수영', start: '06:00', end: '21:50' }],
    hourlySlots: new Array(24).fill(false).map((_, i) => i >= 6 && i <= 21)
  };
}

/**
 * 특정 날짜가 해당 월의 몇 번째 주차(N번째 요일)인지 계산
 */
export function getNthWeekdayOfMonth(date: Date): number {
  const dayOfMonth = date.getDate();
  return Math.ceil(dayOfMonth / 7);
}

/**
 * 특정 날짜가 수영장 휴관 규칙에 해당하는지 확인
 */
export function isPoolClosedOnDate(pool: SwimmingPool, date: Date, isHoliday = false): boolean {
  // 규칙 목록 취합: pool.closedRules + 텍스트 파싱 규칙
  let allRules: ClosedRule[] = pool.closedRules ? [...pool.closedRules] : [];
  const textDesc = pool.scheduleText?.closedDays || pool.closedDaysDescription;
  if (textDesc) {
    const parsedRules = parseClosedDaysDescription(textDesc);
    allRules = [...allRules, ...parsedRules];
  }

  if (isHoliday && allRules.some((r) => r.type === 'holidays')) {
    return true;
  }

  const dayOfWeek = date.getDay(); // 0(일) ~ 6(토)
  const nthWeek = getNthWeekdayOfMonth(date);

  for (const rule of allRules) {
    if (rule.type === 'weekly' && rule.daysOfWeek?.includes(dayOfWeek)) {
      return true;
    }
    if (rule.type === 'nth_weekday') {
      if (rule.weekday === dayOfWeek && rule.weeks?.includes(nthWeek)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * "HH:mm" 문자열을 자정 이후 분(minutes) 단위 숫자로 변환
 */
export function timeStringToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

/**
 * 현재 시각 또는 지정된 시각 기준으로 수영장의 운영 상태(OPEN, BREAK, CLOSED) 계산
 */
export function calculatePoolStatus(
  pool: SwimmingPool,
  targetDate: Date = new Date(),
  isHoliday = false
): PoolCurrentStatus {
  // 0. 임시 휴관 체크 (시설 보수, 소독, 공사 등)
  if (pool.temporaryClosure?.isClosed) {
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    const targetDateStr = `${year}-${month}-${day}`;

    const start = pool.temporaryClosure.startDate;
    const end = pool.temporaryClosure.endDate;

    const isAfterStart = !start || targetDateStr >= start;
    const isBeforeEnd = !end || targetDateStr <= end;

    if (isAfterStart && isBeforeEnd) {
      let rangeText = '';
      if (start && end) {
        rangeText = `${start} ~ ${end}`;
      } else if (start) {
        rangeText = `${start}부터`;
      } else if (end) {
        rangeText = `~ ${end}까지`;
      }

      const reason = pool.temporaryClosure.reason || '시설 점검/공사';
      const statusText = `임시 휴관 (${reason})`;

      return {
        status: 'TEMP_CLOSED',
        statusText,
        isTemporaryClosed: true,
        temporaryClosureReason: reason,
        temporaryClosureRange: rangeText,
      };
    }
  }

  // 1. 휴관일 체크
  if (isPoolClosedOnDate(pool, targetDate, isHoliday)) {
    return {
      status: 'CLOSED',
      statusText: '정기 휴관일'
    };
  }

  // 2. 해당 요일 또는 공휴일 스케줄 조회
  const dayOfWeek = targetDate.getDay();
  const daySchedule: DaySchedule = isHoliday
    ? pool.holidaySchedule
    : pool.weeklySchedule?.[dayOfWeek];

  if (!daySchedule || !daySchedule.isOpen) {
    return {
      status: 'CLOSED',
      statusText: '오늘 운영 없음'
    };
  }

  const currentHour = targetDate.getHours();
  const currentMinuteOfHour = targetDate.getMinutes();
  const currentMinutes = currentHour * 60 + currentMinuteOfHour;

  // 2.5 브레이크 타임 (정비/점심시간) 우선 판정
  const breakTimeStr = pool.breakTime || pool.scheduleText?.breakTime;
  const breakRanges = parseBreakTimeRanges(breakTimeStr);
  const activeBreak = breakRanges.find((r) => currentMinutes >= r.start && currentMinutes < r.end);

  if (activeBreak) {
    return {
      status: 'BREAK',
      statusText: `브레이크 타임 (~${activeBreak.endStr}, 시설정비)`
    };
  }

  // 3. 세션 목록이 있는 경우 세션 매칭
  if (daySchedule.sessions && daySchedule.sessions.length > 0) {
    // 세션을 시작 시간 오름차순으로 정렬
    const sortedSessions = [...daySchedule.sessions].sort(
      (a, b) => timeStringToMinutes(a.start) - timeStringToMinutes(b.start)
    );

    // 1단계: 현재 시각이 포함된 세션이 있는지 확인
    for (const session of sortedSessions) {
      const startMin = timeStringToMinutes(session.start);
      const endMin = timeStringToMinutes(session.end);

      if (currentMinutes >= startMin && currentMinutes < endMin) {
        // 50분 휴식 룰 적용 체크 (실제 breakRule이 50_10인 경우에만)
        if (pool.breakRule === '50_10' && currentMinuteOfHour >= 50) {
          return {
            status: 'BREAK',
            statusText: `휴식시간 (50분~정각, 다음 타임 대기)`,
            currentSession: session,
            closingTime: session.end
          };
        }

        return {
          status: 'OPEN',
          statusText: `운영중 (~${session.end})`,
          currentSession: session,
          closingTime: session.end
        };
      }
    }

    // 2단계: 현재 진행 중인 세션이 없다면 가장 빠른 다음 세션 찾기
    for (const session of sortedSessions) {
      const startMin = timeStringToMinutes(session.start);
      if (currentMinutes < startMin) {
        return {
          status: 'CLOSED',
          statusText: `운영 대기 (${session.start} 시작)`,
          nextSession: session
        };
      }
    }

    // 모든 세션이 종료된 경우
    return {
      status: 'CLOSED',
      statusText: '오늘 운영 종료'
    };
  }

  // 4. 폴백: sessions가 비어있고 hourlySlots만 있는 경우
  if (daySchedule.hourlySlots && daySchedule.hourlySlots[currentHour]) {
    // 50분 휴식 룰
    if (pool.breakRule === '50_10' && currentMinuteOfHour >= 50) {
      return {
        status: 'BREAK',
        statusText: `휴식시간 (50분~정각, 다음 타임 대기)`
      };
    }

    // 오늘 마감 시간 찾기 (마지막 true 슬롯)
    let lastHour = currentHour;
    for (let h = currentHour; h < 24; h++) {
      if (daySchedule.hourlySlots[h]) lastHour = h;
      else break;
    }

    return {
      status: 'OPEN',
      statusText: `운영중 (~${String(lastHour + 1).padStart(2, '0')}:00)`
    };
  }

  // 다음 운영 시간대 탐색
  if (daySchedule.hourlySlots) {
    for (let h = currentHour + 1; h < 24; h++) {
      if (daySchedule.hourlySlots[h]) {
        return {
          status: 'CLOSED',
          statusText: `운영 대기 (${String(h).padStart(2, '0')}:00 시작)`
        };
      }
    }
  }

  return {
    status: 'CLOSED',
    statusText: '오늘 운영 없음'
  };
}

/**
 * 두 좌표(위도, 경도) 간의 거리(km) 계산 (Haversine formula)
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // 지구 반지름 (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * 카카오내비 및 카카오 길찾기 링크 생성
 */
export function getKakaoNaviLinks(name: string, lat: number, lng: number) {
  const encodedName = encodeURIComponent(name);
  return {
    webNaviUrl: `https://map.kakao.com/link/to/${encodedName},${lat},${lng}`,
    appNaviScheme: `kakaonavi://navigate?name=${encodedName}&coord_type=wgs84&x=${lng}&y=${lat}`,
    roadviewUrl: `https://map.kakao.com/link/roadview/${lat},${lng}`
  };
}
