import React from 'react';
import {
  Navigation,
  Phone,
  Globe,
  Clock,
  Car,
  Droplets,
  ShieldAlert,
  ExternalLink,
  Sparkles,
  Check,
  ChevronDown,
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

  // 요구사항 2: 길이 표시 없는 순수 명칭
  const cleanName = pool.name.replace(/\s*\((?:25m|50m)\)/gi, '').trim();

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center pointer-events-auto">
      <div className="w-full max-w-2xl bg-slate-900/98 backdrop-blur-xl border-t sm:border-x border-slate-700/80 rounded-t-3xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom-6 duration-300">
        {/* 상단 드래그 핸들 & 닫기 바 */}
        <div className="relative pt-2.5 pb-2 px-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="absolute left-1/2 -translate-x-1/2 top-2 w-10 h-1 bg-slate-700 rounded-full" />
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                is50m
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-blue-500/20 text-blue-300 border-blue-500/50'
              }`}
            >
              {pool.laneLength}m · {pool.laneCount}레인
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
            <p className="text-xs text-slate-400 mt-0.5">
              수심: <strong className="text-slate-200">{pool.depth}</strong> ·{' '}
              {pool.breakRule === '50_10'
                ? '50분 수영 / 10분 휴식'
                : '연속 자유수영'}
            </p>
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
            <a
              href={`tel:${pool.phone}`}
              className="py-2.5 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <Phone className="w-4 h-4 text-emerald-400" />
              전화걸기
            </a>
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
                웹사이트 없음
              </div>
            )}
          </div>

          {/* 3. 요구사항 5-1: 시간 그래프에 시간만 표기 (새벽부/오후부/저녁부 박스 삭제) */}
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-400" />
                {targetDate.getMonth() + 1}월 {targetDate.getDate()}일 ({dayName}) 수영 가능 시간
              </span>
              <span className="text-[11px] text-slate-400">
                {daySchedule?.isOpen ? '운영일' : '휴관'}
              </span>
            </div>

            {/* 24시간 타임라인 바 */}
            <div className="flex flex-col gap-1 pt-1">
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono px-0.5">
                <span>06시</span>
                <span>09시</span>
                <span>12시</span>
                <span>15시</span>
                <span>18시</span>
                <span>21시</span>
              </div>
              <div className="grid grid-cols-24 gap-0.5 h-4 bg-slate-900 rounded-md p-0.5 border border-slate-800">
                {Array.from({ length: 24 }).map((_, hour) => {
                  const isAvailable = daySchedule?.hourlySlots?.[hour] ?? false;
                  return (
                    <div
                      key={hour}
                      title={`${hour}시: ${isAvailable ? '자유수영 가능' : '이용불가'}`}
                      className={`h-full rounded-xs transition-colors ${
                        isAvailable
                          ? 'bg-cyan-500 shadow-xs shadow-cyan-400/50'
                          : 'bg-slate-800'
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            {pool.closedDaysDescription && (
              <div className="text-[11px] text-slate-400 pt-1.5 flex items-start gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>휴관 안내: {pool.closedDaysDescription}</span>
              </div>
            )}
          </div>

          {/* 4. 요구사항 5-2: 입장료 단순하게 표기 */}
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-3.5 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">일일 입장료</span>
            <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
              <span>
                성인 <strong className="text-cyan-400 font-sans">{pool.fee.standard.adult.toLocaleString()}</strong>원
              </span>
              <span className="text-slate-600">·</span>
              <span>
                청소년 <strong className="text-slate-300 font-sans">{pool.fee.standard.teen.toLocaleString()}</strong>원
              </span>
              <span className="text-slate-600">·</span>
              <span>
                어린이 <strong className="text-slate-300 font-sans">{pool.fee.standard.child.toLocaleString()}</strong>원
              </span>
            </div>
          </div>

          {/* 5. 부대시설 태그 & 주차 정보 */}
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4 flex flex-col gap-2.5">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Droplets className="w-4 h-4 text-cyan-400" />
              부대시설 및 편의정보
            </span>

            <div className="flex flex-wrap gap-1.5">
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
                  pool.features.hasWalkingLane
                    ? 'bg-cyan-950/60 text-cyan-300 border-cyan-800'
                    : 'bg-slate-800/60 text-slate-500 border-slate-700'
                }`}
              >
                <Check className="w-3 h-3" />
                걷기레인
              </span>

              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
                  pool.features.kickboardAllowed
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700'
                }`}
              >
                킥판 {pool.features.kickboardAllowed ? '가능' : '불가'}
              </span>

              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
                  pool.features.flippersAllowed
                    ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                    : 'bg-slate-800/60 text-slate-500 border-slate-700'
                }`}
              >
                오리발 {pool.features.flippersAllowed ? '가능' : '불가'}
              </span>

              {pool.features.hasWarmRoom && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg border bg-purple-950/60 text-purple-300 border-purple-800">
                  발한실/체온조절실
                </span>
              )}

              {pool.features.hasKidPool && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg border bg-blue-950/60 text-blue-300 border-blue-800">
                  유아풀
                </span>
              )}
            </div>

            <div className="flex items-start gap-1.5 pt-1 text-xs text-slate-300">
              <Car className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>주차:</strong> {pool.features.parking.info}
              </span>
            </div>
          </div>

          {/* 6. 전국자유수영 카페 후기 요약 */}
          {pool.review.summary && (
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  전국자유수영 카페 평가
                </span>
                <span className="text-amber-400 font-extrabold text-xs">
                  ★ {pool.review.rating.toFixed(1)}
                </span>
              </div>
              <p className="text-xs text-slate-200 italic bg-slate-950/40 p-2.5 rounded-xl border border-slate-800">
                "{pool.review.summary}"
              </p>
              {pool.review.cafePostUrl && (
                <div className="flex justify-end pt-0.5">
                  <a
                    href={pool.review.cafePostUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    카페 후기 보기 <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
