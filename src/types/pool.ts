export type LaneLength = 25 | 50;

export type BreakRule = '50_10' | 'continuous';

export interface TimeSession {
  partName?: string;
  start: string;     // "06:00" (HH:mm)
  end: string;       // "08:50" (HH:mm)
}

export interface DaySchedule {
  isOpen: boolean;
  sessions: TimeSession[];
  hourlySlots: boolean[]; // 24시간
}

export interface FeeInfo {
  adult: number;
  teen?: number;
  child?: number;
}

export interface PoolFee {
  standard: FeeInfo;
  outOfDistrict?: FeeInfo;
  discountNote?: string;
}

export interface ClosedRule {
  type: 'weekly' | 'nth_weekday' | 'holidays';
  weeks?: number[];
  weekday?: number;
  daysOfWeek?: number[];
}

export interface ScheduleTextInfo {
  weekday?: string;
  saturday?: string;
  sunday?: string;
  holiday?: string;
  closedDays?: string;
}

export interface PoolAmenities {
  dehydrator: boolean; // 탈수기
  dryer: boolean;      // 헤어드라이어
  soap: boolean;       // 비누/샤워용품
  walkingLane: boolean;// 걷기레인
  kickboard: boolean;  // 킥판
  flippers: boolean;   // 오리발
  parking: boolean;    // 주차장
}

export interface FacilityFeatures {
  hasKidPool?: boolean;
  hasWarmRoom?: boolean;
  hasWalkingLane?: boolean;
  kickboardAllowed?: boolean;
  flippersAllowed?: boolean;
  parking?: {
    available: boolean;
    info: string;
  };
  notes?: string;
}

export interface SwimmingPool {
  id: string;
  name: string;
  shortName?: string;
  address: string;
  addressDetail?: string;
  city: string;
  district?: string;
  phone?: string;
  homepage?: string;
  lat: number;
  lng: number;

  // 레인 스펙 (레인수는 확인된 경우 표시)
  laneLength: LaneLength;
  laneCount?: number;
  depth?: string; // 실제 자료에 있을 때만 존재

  // 운영 방식 (실제 자료에 있을 때만 존재)
  breakRule?: BreakRule;

  // 24시간 매트릭스
  weeklySchedule: Record<number, DaySchedule>;
  holidaySchedule: DaySchedule;
  closedDaysDescription?: string;
  closedRules: ClosedRule[];

  // 평일/토/일/공휴일 운영시간 텍스트
  scheduleText?: ScheduleTextInfo;

  // 요금
  fee: PoolFee;

  // 편의시설 (탈수기, 드라이어, 비누, 걷기레인, 킥판, 오리발, 주차장)
  amenities: PoolAmenities;

  // 주차 상세 정보
  parkingInfo?: string;

  // 기타 비정형 정보 (실제 자료에 있을 때만 존재)
  etcInfo?: string;

  // 관련 링크
  links?: { title: string; url: string }[];
}

export type PoolOperationalStatus = 'OPEN' | 'BREAK' | 'CLOSED';

export interface PoolCurrentStatus {
  status: PoolOperationalStatus;
  statusText: string;
  currentSession?: TimeSession;
  nextSession?: TimeSession;
  closingTime?: string;
}
