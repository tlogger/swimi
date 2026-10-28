import React, { useMemo } from 'react';
import {
  Navigation,
  Phone,
  Globe,
  Clock,
  Car,
  ShieldAlert,
  ChevronDown,
  Info,
} from 'lucide-react';
import { SwimmingPool, PoolCurrentStatus } from '../types/pool';
import { getKakaoNaviLinks } from '../utils/scheduleCalculator';

interface PoolDetailDrawerProps {
  pool: SwimmingPool | null;
  status?: PoolCurrentStatus;
  targetDate: Date;
  onClose: () => void;
}

export const PoolDetailDrawer: React.FC<PoolDetailDrawerProps> = ({
  pool,
  status,
  targetDate,
  onClose,
}) => {
  if (!pool) return null;

  const dayOfWeek = targetDate.getDay();
  const daySchedule = pool.weeklySchedule[dayOfWeek];
  const daysKor = ['일', '월', '화', '수', '목', '금', '토'];
  const dayName = daysKor[dayOfWeek];

  const { webNaviUrl } = getKakaoNaviLinks(pool.name, pool.lat, pool.lng);

  const handleNaviClick = () => {
    window.open(webNaviUrl, '_blank');
  };

  const is50m = pool.laneLength === 50;
  const cleanName = pool.name.replace(/\s*\((?:25m|50m)\)/gi, '').trim();

  // 요구사항 3: 현재 시각 타임라인 위치 (%) 계산
  const now = new Date();
  const currentMinutesTotal = now.getHours() * 60 + now.getMinutes();
  const currentTimelinePercent = Math.min(
    100,
    Math.max(0, (currentMinutesTotal / (24 * 60)) * 100)
  );

  // 요구사항 3: 부대시설 항목 목록 ('탈수기', '헤어드라이어', '비누', '걷기레인', '킥판', '오리발', '주차장')
  const amenityList = useMemo(() => {
    const am = pool.amenities || {
      dehydrator: false,
      dryer: false,
      soap: false,
      walkingLane: false,
      kickboard: false,
      flippers: false,
      parking: false,
    };
    return [
      { name: '탈수기', available: Boolean(am.dehydrator) },
      { name: '헤어드라이어', available: Boolean(am.dryer) },
      { name: '비누', available: Boolean(am.soap) },
      { name: '걷기레인', available: Boolean(am.walkingLane) },
      { name: '킥판', available: Boolean(am.kickboard) },
      { name: '오리발', available: Boolean(am.flippers) },
      { name: '주차장', available: Boolean(am.parking || pool.parkingInfo) },
    ];
  }, [pool]);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center pointer-events-auto">
      <div className="w-full max-w-2xl bg-slate-900/98 backdrop-blur-xl border-t sm:border-x border-slate-700/80 rounded-t-3xl shadow-2xl flex flex-col max-h-[82vh] overflow-hidden animate-in slide-in-from-bottom-6 duration-300">
        {/* 상단 드래그 핸들 & 닫기 바 */}
        <div className="relative pt-2.5 pb-2 px-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="absolute left-1/2 -translate-x-1/2 top-2 w-10 h-1 bg-slate-700 rounded-full" />
          <div className="flex items-center gap-2 mt-2">
            {/* 요구사항 5: 레인수 정보 표기 */}
            <span
              className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                is50m
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-blue-500/20 text-blue-300 border-blue-500/50'
              }`}
            >
              {pool.laneLength}m {pool.laneCount ? `· ${pool.laneCount}레인` : ''}
            </span>
            {status && (
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                  status.status === 'OPEN'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : status.status === 'BREAK'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-700/40 text-slate-400 border-slate-600/40'
                }`}
              >
                {status.statusText}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-full mt-1"
            aria-label="닫기"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>

        {/* 스크롤 가능한 본문 영역 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
          {/* 1. 수영장 명칭 및 주소 */}
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">
              {cleanName}
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              {pool.address}{' '}
              {pool.addressDetail && (
                <span className="text-slate-400">({pool.addressDetail})</span>
              )}
            </p>

            {/* 요구사항 2: 실제 자료에 있는 내용만 표기 (수심 및 50분 휴식제) */}
            {(pool.depth || pool.breakRule) && (
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                {pool.depth && (
                  <span>
                    수심: <strong className="text-slate-200">{pool.depth}</strong>
                  </span>
                )}
                {pool.depth && pool.breakRule && <span className="text-slate-600">·</span>}
                {pool.breakRule === '50_10' && (
                  <span className="text-cyan-400 font-semibold">
                    50분 수영 / 10분 휴식제
                  </span>
                )}
              </p>
            )}
          </div>

          {/* 2. 빠른 액션 버튼: 카카오내비 / 전화걸기 / 홈페이지 */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleNaviClick}
              className="py-2.5 px-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-400/20 active:scale-95 transition-all"
            >
              <Navigation className="w-4 h-4 fill-slate-950" />
              카카오내비
            </button>
            {pool.phone ? (
              <a
                href={`tel:${pool.phone}`}
                className="py-2.5 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                {pool.phone}
              </a>
            ) : (
              <div className="py-2.5 px-3 rounded-2xl bg-slate-800/40 border border-slate-800 text-slate-500 font-medium text-xs flex items-center justify-center">
                전화번호 없음
              </div>
            )}
            {pool.homepage ? (
              <a
                href={pool.homepage}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <Globe className="w-4 h-4 text-cyan-400" />
                홈페이지
              </a>
            ) : (
              <div className="py-2.5 px-3 rounded-2xl bg-slate-800/40 border border-slate-800 text-slate-500 font-medium text-xs flex items-center justify-center">
                홈페이지 없음
              </div>
            )}
          </div>

          {/* 3. 요구사항 3 & 6: 수영 가능 시간 + 현재 시각 위치 깜빡임 + 요일별 운영시간 */}
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-400" />
                {targetDate.getMonth() + 1}월 {targetDate.getDate()}일 ({dayName}) 수영 가능 시간
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                현재 {String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}
              </span>
            </div>

            {/* 24시간 타임라인 바 (현재 시각 깜빡이는 인디케이터 포함) */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono px-0.5">
                <span>00시</span>
                <span>06시</span>
                <span>09시</span>
                <span>12시</span>
                <span>15시</span>
                <span>18시</span>
                <span>21시</span>
                <span>24시</span>
              </div>
              <div className="relative h-5 bg-slate-950 rounded-md p-0.5 border border-slate-800 flex items-center">
                {/* 24시간 블록들 */}
                <div className="grid grid-cols-24 gap-0.5 w-full h-full">
                  {Array.from({ length: 24 }).map((_, hour) => {
                    const isAvailable = daySchedule?.hourlySlots?.[hour] ?? false;
                    return (
                      <div
                        key={hour}
                        title={`${hour}시: ${isAvailable ? '자유수영 가능' : '이용불가'}`}
                        className={`h-full rounded-xs transition-colors ${
                          isAvailable
                            ? 'bg-cyan-500/80 shadow-xs shadow-cyan-400/50'
                            : 'bg-slate-850 bg-slate-900/60'
                        }`}
                      />
                    );
                  })}
                </div>

                {/* 요구사항 3: 현재 시각 위치 깜빡이는 수직 인디케이터 */}
                <div
                  style={{ left: `${currentTimelinePercent}%` }}
                  className="absolute top-0 bottom-0 w-1 bg-amber-400 shadow-md shadow-amber-400/80 rounded-full pointer-events-none -translate-x-1/2 z-10 animate-pulse"
                >
                  <div className="w-2.5 h-2.5 -top-1 -left-[3px] absolute bg-amber-400 rounded-full border border-slate-950 shadow animate-ping opacity-75" />
                </div>
              </div>
            </div>

            {/* 요구사항 6: 평일, 토요일, 일요일, 공휴일 운영 시간 및 휴관 안내 정보 */}
            <div className="pt-2 border-t border-slate-700/50 flex flex-col gap-1.5 text-xs">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block font-semibold">평일 (월~금)</span>
                  <span className="text-slate-200 font-medium">
                    {pool.scheduleText?.weekday || '운영 시간 시설 문의'}
                  </span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block font-semibold">토요일</span>
                  <span className="text-slate-200 font-medium">
                    {pool.scheduleText?.saturday || '운영 시간 시설 문의'}
                  </span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block font-semibold">일요일</span>
                  <span className="text-slate-200 font-medium">
                    {pool.scheduleText?.sunday || '운영 시간 시설 문의'}
                  </span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block font-semibold">공휴일</span>
                  <span className="text-slate-200 font-medium">
                    {pool.scheduleText?.holiday || '운영 시간 시설 문의'}
                  </span>
                </div>
              </div>

              {/* 휴관 안내 정보 */}
              {(pool.scheduleText?.closedDays || pool.closedDaysDescription) && (
                <div className="text-[11px] text-slate-300 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/80 flex items-start gap-1.5 mt-0.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>휴관 안내:</strong>{' '}
                    {pool.scheduleText?.closedDays || pool.closedDaysDescription}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 4. 일일 입장료 단순 표기 (있는 항목만 표기) */}
          {pool.fee?.standard && (
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-3.5 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">일일 입장료</span>
              <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
                <span>
                  성인 <strong className="text-cyan-400 font-sans">{pool.fee.standard.adult.toLocaleString()}</strong>원
                </span>
                {pool.fee.standard.teen && (
                  <>
                    <span className="text-slate-600">·</span>
                    <span>
                      청소년 <strong className="text-slate-300 font-sans">{pool.fee.standard.teen.toLocaleString()}</strong>원
                    </span>
                  </>
                )}
                {pool.fee.standard.child && (
                  <>
                    <span className="text-slate-600">·</span>
                    <span>
                      어린이 <strong className="text-slate-300 font-sans">{pool.fee.standard.child.toLocaleString()}</strong>원
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 5. 요구사항 3: 부대시설 및 편의시설 (있는 것은 밝은 색, 없는 것은 회색 처리) */}
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4 flex flex-col gap-2.5">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              부대시설 및 편의시설
            </span>

            <div className="flex flex-wrap gap-1.5">
              {amenityList.map((item) => (
                <span
                  key={item.name}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border transition-all ${
                    item.available
                      ? 'bg-cyan-950/70 text-cyan-300 border-cyan-700/80 shadow-xs'
                      : 'bg-slate-850 bg-slate-900/60 text-slate-500 border-slate-800 line-through opacity-70'
                  }`}
                >
                  {item.name}
                </span>
              ))}
            </div>

            {/* 주차장 안내 */}
            {pool.parkingInfo && (
              <div className="flex items-start gap-1.5 pt-1 text-xs text-slate-300">
                <Car className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>주차장:</strong> {pool.parkingInfo}
                </span>
              </div>
            )}
          </div>

          {/* 6. 요구사항 7: 기타 비정형 정보 (실제 자료에 없으면 아예 보여주지 않음) */}
          {pool.etcInfo && (
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4 flex flex-col gap-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Info className="w-4 h-4 text-cyan-400" />
                기타
              </span>
              <p className="text-xs text-slate-200 bg-slate-950/50 p-3 rounded-xl border border-slate-800 leading-relaxed">
                {pool.etcInfo}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
