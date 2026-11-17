import React from 'react';
import { Filter, List, X, Waves, Trophy, Star, Clock } from 'lucide-react';

interface HeaderSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onToggleFilter: () => void;
  onToggleList: () => void;
  hasActiveFilters: boolean;
  isListOpen: boolean;
  // 원터치 퀵필터 상태 및 핸들러
  onlyOpenNow: boolean;
  onToggleOnlyOpenNow: () => void;
  is50mOnly: boolean;
  onToggle50mOnly: () => void;
  onlyOver18m: boolean;
  onToggleOnlyOver18m: () => void;
  onlyVisited: boolean;
  onToggleOnlyVisited: () => void;
  onlyFavorite: boolean;
  onToggleOnlyFavorite: () => void;
}

export const HeaderSearch: React.FC<HeaderSearchProps> = ({
  searchQuery,
  onSearchChange,
  onToggleFilter,
  onToggleList,
  hasActiveFilters,
  isListOpen,
  onlyOpenNow,
  onToggleOnlyOpenNow,
  is50mOnly,
  onToggle50mOnly,
  onlyOver18m,
  onToggleOnlyOver18m,
  onlyVisited,
  onToggleOnlyVisited,
  onlyFavorite,
  onToggleOnlyFavorite,
}) => {
  return (
    <header className="absolute top-3 left-3 right-3 z-30 flex flex-col gap-2 pointer-events-auto">
      {/* 1행: 검색창 & 필터/리스트 버튼 */}
      <div className="flex items-center gap-2 w-full">
        <div className="flex-1 min-w-0 flex items-center bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-xl px-2.5 sm:px-3 py-2 sm:py-2.5 transition-all focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/20">
          <img
            src={`${import.meta.env.BASE_URL}favicon.svg`}
            alt="Swimi 로고"
            className="w-5 h-5 rounded-md shrink-0 mr-2 shadow-xs ring-1 ring-cyan-400/30"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="지역 또는 수영장명 검색 (예: 화성, 동탄)"
            className="w-full min-w-0 bg-transparent text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-200 shrink-0"
              aria-label="검색어 지우기"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 필터 버튼 */}
        <button
          onClick={onToggleFilter}
          title="필터 옵션"
          className={`w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-2xl backdrop-blur-md border shadow-xl shrink-0 active:scale-95 transition-all relative ${
            hasActiveFilters
              ? 'bg-cyan-600 border-cyan-400 text-white'
              : 'bg-slate-900/90 border-slate-700/80 text-slate-300 hover:bg-slate-800'
          }`}
          aria-label="필터"
        >
          <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
          {hasActiveFilters && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-yellow-300 animate-pulse" />
          )}
        </button>

        {/* 리스트 보기 버튼 */}
        <button
          onClick={onToggleList}
          title="수영장 목록 보기"
          className={`w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-2xl backdrop-blur-md border shadow-xl shrink-0 active:scale-95 transition-all ${
            isListOpen
              ? 'bg-cyan-600 border-cyan-400 text-white'
              : 'bg-slate-900/90 border-slate-700/80 text-slate-300 hover:bg-slate-800'
          }`}
          aria-label="리스트 보기"
        >
          <List className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* 2행: 스마트 퀵필터 칩 바 (가로 스크롤) */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {/* 1. 지금 운영중 */}
        <button
          onClick={onToggleOnlyOpenNow}
          className={`px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 flex items-center gap-1 backdrop-blur-md border transition-all active:scale-95 shadow-md ${
            onlyOpenNow
              ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 ring-1 ring-emerald-400/40'
              : 'bg-slate-900/80 border-slate-700/80 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-3 h-3 text-emerald-400" />
          지금 운영중
        </button>

        {/* 2. 50m 레인 */}
        <button
          onClick={onToggle50mOnly}
          className={`px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 flex items-center gap-1 backdrop-blur-md border transition-all active:scale-95 shadow-md ${
            is50mOnly
              ? 'bg-amber-500/25 border-amber-400 text-amber-300 ring-1 ring-amber-400/40'
              : 'bg-slate-900/80 border-slate-700/80 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Waves className="w-3 h-3 text-amber-400" />
          50m 레인
        </button>

        {/* 3. 수심 >1.8m */}
        <button
          onClick={onToggleOnlyOver18m}
          className={`px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 flex items-center gap-1 backdrop-blur-md border transition-all active:scale-95 shadow-md ${
            onlyOver18m
              ? 'bg-indigo-500/25 border-indigo-400 text-indigo-300 ring-1 ring-indigo-400/40'
              : 'bg-slate-900/80 border-slate-700/80 text-slate-400 hover:text-slate-200'
          }`}
        >
          수심 &gt;1.8m
        </button>

        {/* 4. 방문한 곳 */}
        <button
          onClick={onToggleOnlyVisited}
          className={`px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 flex items-center gap-1 backdrop-blur-md border transition-all active:scale-95 shadow-md ${
            onlyVisited
              ? 'bg-amber-400/25 border-amber-300 text-amber-200 ring-1 ring-amber-400/40'
              : 'bg-slate-900/80 border-slate-700/80 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trophy className="w-3 h-3 text-amber-400" />
          방문
        </button>

        {/* 5. 즐겨찾기 */}
        <button
          onClick={onToggleOnlyFavorite}
          className={`px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 flex items-center gap-1 backdrop-blur-md border transition-all active:scale-95 shadow-md ${
            onlyFavorite
              ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 ring-1 ring-cyan-400/40'
              : 'bg-slate-900/80 border-slate-700/80 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Star className="w-3 h-3 text-cyan-400" />
          즐겨찾기
        </button>
      </div>
    </header>
  );
};
