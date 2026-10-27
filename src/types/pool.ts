export type LaneLength = 25 | 50;

export type BreakRule = '50_10' | 'continuous';

export interface TimeSession {
  partName?: string; // 예: "1부", "새벽타임", "오후 1부"
  start: string;     // "06:00" (HH:mm)
  end: string;       // "08:50" (HH:mm)
}

export interface DaySchedule {
  isOpen: boolean;
  sessions: TimeSession[];
  // 0시부터 23시까지 각 시간대에 수영 가능한 시간(1시간)이 포함되어 있는지 여부 (24길이 boolean 배열)
  hourlySlots: boolean[];
}

export interface FeeInfo {
  adult: number;
  teen: number;
  child: number;
}

export interface PoolFee {
  standard: FeeInfo;
  outOfDistrict?: FeeInfo; // 관외 요금
  discountNote?: string;   // 감면 대상 등
}

export interface ClosedRule {
  type: 'weekly' | 'nth_weekday' | 'holidays';
  // nth_weekday 예: 매월 2, 4주 일요일
  weeks?: number[];    // [2, 4]
  weekday?: number;    // 0: 일요일, 1: 월요일, ...
  daysOfWeek?: number[]; // [0] (매주 일요일 휴무 시)
}

export interface FacilityFeatures {
  hasKidPool: boolean;        // 보조풀/유아풀
  hasWarmRoom: boolean;       // 발한실/체온조절실
  hasWalkingLane: boolean;    // 걷기 전용 레인
  kickboardAllowed: boolean;  // 공영/개인 킥판 사용 가능 여부
  flippersAllowed: boolean;   // 오리발 사용 가능 시간/레인 여부
  parking: {
    available: boolean;
    info: string;
  };
  showerLevel: '상' | '중' | '하';
  waterQualityLevel: '상' | '중' | '하';
  notes: string;
}

export interface CommunityReview {
  summary: string;
  rating: number; // 1~5
  lastUpdated: string; // YYYY-MM-DD
  cafePostUrl?: string;
  tags: string[];
}

export interface SwimmingPool {
  id: string;
  name: string;
  shortName?: string;
  address: string;
  addressDetail?: string;
  city: string;        // "화성시", "전주시" 등
  district: string;    // "남양읍", "영천동" 등
  phone: string;
  homepage?: string;
  lat: number;
  lng: number;

  // 레인 스펙
  laneLength: LaneLength; // 25 | 50
  laneCount: number;      // 레인 수
  depth: string;          // "1.2m ~ 1.4m"

  // 운영 시간 & 스케줄
  breakRule: BreakRule;   // '50_10' | 'continuous'
  // 0: 일, 1: 월, 2: 화, 3: 수, 4: 목, 5: 금, 6: 토 (7일 매트릭스)
  weeklySchedule: Record<number, DaySchedule>;
  holidaySchedule: DaySchedule; // 법정공휴일 스케줄
  closedDaysDescription: string;
  closedRules: ClosedRule[];

  // 요금
  fee: PoolFee;

  // 편의시설 & 특성
  features: FacilityFeatures;

  // 카페 후기 & 링크
  review: CommunityReview;
  links: { title: string; url: string }[];
}

// 실시간 상태 계산 결과 타입
export type PoolOperationalStatus = 'OPEN' | 'BREAK' | 'CLOSED';

export interface PoolCurrentStatus {
  status: PoolOperationalStatus;
  statusText: string;
  currentSession?: TimeSession;
  nextSession?: TimeSession;
  closingTime?: string;
}
