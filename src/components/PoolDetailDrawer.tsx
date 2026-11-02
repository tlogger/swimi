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
  Star,
  Trophy,
  Edit3,
  CheckCircle2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { SwimmingPool, PoolCurrentStatus } from '../types/pool';
import { UserInteractionState } from '../types/auth';
import { getKakaoNaviLinks } from '../utils/scheduleCalculator';

interface PoolDetailDrawerProps {
  pool: SwimmingPool | null;
  status?: PoolCurrentStatus;
  targetDate: Date;
  onClose: () => void;
  lastUpdate?: string;
  interaction?: UserInteractionState;
  onToggleFavorite?: (poolId: string) => void;
  onToggleCheckIn?: (poolId: string) => void;
  onOpenEdit?: (pool: SwimmingPool) => void;
  onDelete?: (poolId: string) => void;
  onRequireLogin?: () => void;
  isLoggedIn?: boolean;
}

export const PoolDetailDrawer: React.FC<PoolDetailDrawerProps> = ({
  pool,
  status,
  targetDate,
  onClose,
  lastUpdate = '2026-10-31',
  interaction,
  onToggleFavorite,
  onToggleCheckIn,
  onOpenEdit,
  onDelete,
  onRequireLogin,
  isLoggedIn = false,
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

  const isFavorite = Boolean(interaction?.isFavorite);
  const isVisited = Boolean(interaction?.isVisited);

  const handleFavoriteClick = () => {
    if (!isLoggedIn) {
      onRequireLogin?.();
      return;
    }
    onToggleFavorite?.(pool.id);
  };

  const handleCheckInClick = () => {
    if (!isLoggedIn) {
      onRequireLogin?.();
      return;
    }
    onToggleCheckIn?.(pool.id);
  };

  const handleEditClick = () => {
    onOpenEdit?.(pool);
  };

  const handleDeleteClick = () => {
    if (!onDelete) return;
    const confirmed = window.confirm(
      `"${cleanName}" 수영장을 클라우드 DB에서 정말 삭제하시겠습니까?\n\n(잘못 등록되었거나 폐업한 수영장인 경우 삭제해 주세요. 삭제 즉시 지도와 검색 목록에서 제거됩니다.)`
    );
    if (confirmed) {
      onDelete(pool.id);
    }
  };

  // 현재 시각 타임라인 위치 (%) 계산
  const now = new Date();
  const currentMinutesTotal = now.getHours() * 60 + now.getMinutes();
  const currentTimelinePercent = Math.min(
    100,
    Math.max(0, (currentMinutesTotal / (24 * 60)) * 100)
  );

  // 부대시설 항목 목록
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
      <div className="w-full max-w-2xl bg-slate-900/98 backdrop-blur-xl border-t sm:border-x border-slate-700/80 rounded-t-3xl shadow-2xl flex flex-col max-h-[84vh] overflow-hidden animate-in slide-in-from-bottom-6 duration-300">
        {/* 상단 드래그 핸들 & 닫기 바 */}
        <div className="relative pt-2.5 pb-2 px-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="absolute left-1/2 -translate-x-1/2 top-2 w-10 h-1 bg-slate-700 rounded-full" />
          <div className="flex items-center gap-2 mt-2">
            {/* 레인수 정보 표기 */}
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
                    : status.status === 'TEMP_CLOSED'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse font-extrabold'
                    : 'bg-slate-700/40 text-slate-400 border-slate-600/40'
                }`}
              >
                {status.statusText}
              </span>
            )}
            {/* 도장깨기 배지 */}
            {isVisited && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center gap-1 shadow-sm">
                <Trophy className="w-3 h-3 text-amber-400" />
                도장깨기 완료!
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
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                {cleanName}
              </h1>
              <p className="text-xs text-slate-300 mt-1">
                {pool.address}{' '}
                {pool.addressDetail && (
                  <span className="text-slate-400">({pool.addressDetail})</span>
                )}
              </p>

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

            {/* 정보 수정 및 삭제 버튼 */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleEditClick}
                title="잘못된 수영장 정보 수정하기"
                className="py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-cyan-300 text-[11px] font-semibold flex items-center gap-1 transition-all"
              >
                <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                정보 수정
              </button>

              {onDelete && (
                <button
                  onClick={handleDeleteClick}
                  title="잘못 등록되었거나 폐업한 수영장 삭제"
                  className="py-1.5 px-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 text-[11px] font-semibold flex items-center gap-1 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  삭제
                </button>
              )}
            </div>
          </div>

          {/* 임시 휴관 특별 안내 배너 */}
          {pool.temporaryClosure?.isClosed && (
            <div className="bg-rose-950/40 border border-rose-500/60 rounded-2xl p-3.5 flex items-start gap-3 shadow-lg shadow-rose-950/30 animate-in fade-in duration-200">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-rose-300">임시 휴관 안내</span>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-500 text-white">
                    휴관 중
                  </span>
                </div>
                {pool.temporaryClosure.reason && (
                  <p className="text-xs font-bold text-white leading-snug">
                    사유: {pool.temporaryClosure.reason}
                  </p>
                )}
                {(pool.temporaryClosure.startDate || pool.temporaryClosure.endDate) && (
                  <p className="text-[11px] font-mono text-rose-200/90">
                    기간: {pool.temporaryClosure.startDate || '미정'} ~ {pool.temporaryClosure.endDate || '미정'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 2. 핵심 액션 1: [도장깨기(체크인)] & [즐겨찾기] 탭/버튼 */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {/* 도장깨기 (방문한 적이 있음) */}
            <button
              onClick={handleCheckInClick}
              className={`py-3 px-3.5 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 shadow-md ${
                isVisited
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-amber-500/10'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-300'
              }`}
            >
              <Trophy className={`w-4 h-4 ${isVisited ? 'text-amber-400 fill-amber-400' : 'text-slate-400'}`} />
              <div className="flex flex-col items-start text-left">
                <span>{isVisited ? '도장깨기 완료 (방문함)' : '도장깨기 체크인'}</span>
                {isVisited && interaction?.visitedAt && (
                  <span className="text-[10px] text-amber-400/80 font-normal">
                    {interaction.visitedAt.slice(0, 10)} 방문
                  </span>
                )}
              </div>
            </button>

            {/* 즐겨찾기 (내가 가고 싶은 곳) */}
            <button
              onClick={handleFavoriteClick}
              className={`py-3 px-3.5 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 shadow-md ${
                isFavorite
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-cyan-500/10'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-300'
              }`}
            >
              <Star className={`w-4 h-4 ${isFavorite ? 'text-cyan-400 fill-cyan-400' : 'text-slate-400'}`} />
              <div className="flex flex-col items-start text-left">
                <span>{isFavorite ? '즐겨찾기 보관됨' : '가고 싶은 곳 추가'}</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  {isFavorite ? '내 리스트에 저장됨' : '즐겨찾기'}
                </span>
              </div>
            </button>
          </div>

          {/* 3. 빠른 액션 버튼: 카카오내비 / 전화걸기 / 홈페이지 */}
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

          {/* 4. 수영 가능 시간 + 현재 시각 위치 깜빡임 + 요일별 운영시간 */}
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

            {/* 24시간 타임라인 바 */}
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

                <div
                  style={{ left: `${currentTimelinePercent}%` }}
                  className="absolute top-0 bottom-0 w-1 bg-amber-400 shadow-md shadow-amber-400/80 rounded-full pointer-events-none -translate-x-1/2 z-10 animate-pulse"
                >
                  <div className="w-2.5 h-2.5 -top-1 -left-[3px] absolute bg-amber-400 rounded-full border border-slate-950 shadow animate-ping opacity-75" />
                </div>
              </div>
            </div>

            {/* 평일, 토요일, 일요일, 공휴일 운영 시간 및 휴관 안내 */}
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

          {/* 5. 일일 입장료 단순 표기 */}
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

          {/* 6. 부대시설 및 편의시설 (7종) */}
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

          {/* 7. 기타 비정형 정보 */}
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

          {/* 데이터 동기화 일자 표기 */}
          <div className="pt-2 pb-1 text-center">
            <span className="text-[10px] font-mono text-slate-500">
              {pool.updatedAt ? `수정 일시: ${pool.updatedAt.slice(0, 10)} · ` : ''}Last Update: {lastUpdate}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
