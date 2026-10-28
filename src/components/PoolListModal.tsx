import React from 'react';
import { X, ArrowDownAZ, Navigation, Clock, CheckCircle2, Waves } from 'lucide-react';
import { SwimmingPool, PoolCurrentStatus } from '../types/pool';

export type SortMode = 'name' | 'distance';

interface PoolListModalProps {
  isOpen: boolean;
  onClose: () => void;
  pools: SwimmingPool[];
  poolStatuses: Record<string, PoolCurrentStatus>;
  poolDistances: Record<string, number>;
  sortMode: SortMode;
  onSelectSortMode: (mode: SortMode) => void;
  onlyOpenNow: boolean;
  onToggleOnlyOpenNow: () => void;
  onSelectPool: (pool: SwimmingPool) => void;
  selectedPoolId?: string;
}

export const PoolListModal: React.FC<PoolListModalProps> = ({
  isOpen,
  onClose,
  pools,
  poolStatuses,
  poolDistances,
  sortMode,
  onSelectSortMode,
  onlyOpenNow,
  onToggleOnlyOpenNow,
  onSelectPool,
  selectedPoolId,
}) => {
  if (!isOpen) return null;

  // 1. 운영중 필터링
  let displayedPools = pools.filter((pool) => {
    if (!onlyOpenNow) return true;
    const st = poolStatuses[pool.id];
    return st && (st.status === 'OPEN' || st.status === 'BREAK');
  });

  // 2. 정렬 (가나다순 vs 가까운순)
  displayedPools.sort((a, b) => {
    if (sortMode === 'name') {
      return a.name.localeCompare(b.name, 'ko');
    } else {
      const distA = poolDistances[a.id] ?? 999999;
      const distB = poolDistances[b.id] ?? 999999;
      return distA - distB;
    }
  });

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full sm:max-w-xl bg-slate-900 border border-slate-700/80 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col h-[85vh] sm:h-[80vh] overflow-hidden">
        {/* 헤더 및 컨트롤 바 */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">수영장 리스트</h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/80">
                {displayedPools.length}곳
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-full"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 정렬 버튼 & 운영중 토글 */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => onSelectSortMode('name')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  sortMode === 'name'
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowDownAZ className="w-3.5 h-3.5" />
                가나다순
              </button>
              <button
                onClick={() => onSelectSortMode('distance')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  sortMode === 'distance'
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Navigation className="w-3.5 h-3.5" />
                가까운순
              </button>
            </div>

            {/* 운영중 토글 버튼 */}
            <button
              onClick={onToggleOnlyOpenNow}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                onlyOpenNow
                  ? 'bg-emerald-600/90 border-emerald-400 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>운영 중</span>
              {onlyOpenNow && <CheckCircle2 className="w-3 h-3 text-emerald-200" />}
            </button>
          </div>
        </div>

        {/* 간결한 리스트뷰 (전화번호, 요금, 주소 삭제) */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 no-scrollbar">
          {displayedPools.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 py-16 gap-2">
              <Waves className="w-10 h-10 text-slate-600 animate-bounce" />
              <p className="text-sm">조건에 맞는 수영장이 없습니다.</p>
              <button
                onClick={onToggleOnlyOpenNow}
                className="text-xs text-cyan-400 hover:underline mt-1"
              >
                운영중 필터 끄기
              </button>
            </div>
          ) : (
            displayedPools.map((pool) => {
              const status = poolStatuses[pool.id];
              const dist = poolDistances[pool.id];
              const isSelected = selectedPoolId === pool.id;
              const is50m = pool.laneLength === 50;

              return (
                <div
                  key={pool.id}
                  onClick={() => {
                    onSelectPool(pool);
                    onClose();
                  }}
                  className={`px-4 py-3 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-950/50 text-cyan-200'
                      : 'hover:bg-slate-800/70 text-slate-200'
                  }`}
                >
                  {/* 왼쪽: 수영장 이름 & 레인/상태 배지 */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* 레인 배지 (레인수 포함) */}
                    <span
                      className={`text-[11px] font-black px-2 py-0.5 rounded-full shrink-0 border ${
                        is50m
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                      }`}
                    >
                      {pool.laneLength}m{pool.laneCount ? ` · ${pool.laneCount}L` : ''}
                    </span>

                    {/* 수영장 이름 (길이 표시 없는 순수 명칭) */}
                    <span className="text-sm font-bold truncate text-white">
                      {pool.name}
                    </span>

                    {/* 운영 상태 배지 */}
                    {status && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                          status.status === 'OPEN'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : status.status === 'BREAK'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-slate-800 text-slate-500 border-slate-700'
                        }`}
                      >
                        {status.status === 'OPEN'
                          ? '운영중'
                          : status.status === 'BREAK'
                          ? '휴식시간'
                          : '마감'}
                      </span>
                    )}
                  </div>

                  {/* 오른쪽: 거리 표시 */}
                  {dist !== undefined && dist < 99999 && (
                    <span className="text-xs font-mono font-bold text-cyan-400 shrink-0">
                      {dist} km
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
