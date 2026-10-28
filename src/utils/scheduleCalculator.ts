import { SwimmingPool, PoolCurrentStatus, TimeSession, DaySchedule } from '../types/pool';

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
  if (isHoliday && pool.closedRules?.some(r => r.type === 'holidays')) {
    return true;
  }

  const dayOfWeek = date.getDay(); // 0(일) ~ 6(토)
  const nthWeek = getNthWeekdayOfMonth(date);

  if (pool.closedRules) {
    for (const rule of pool.closedRules) {
      if (rule.type === 'weekly' && rule.daysOfWeek?.includes(dayOfWeek)) {
        return true;
      }
      if (rule.type === 'nth_weekday') {
        if (rule.weekday === dayOfWeek && rule.weeks?.includes(nthWeek)) {
          return true;
        }
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
