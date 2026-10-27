import React from 'react';
import { Search, MapPin, Filter, List, X } from 'lucide-react';

interface HeaderSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCurrentLocation: () => void;
  onToggleFilter: () => void;
  onToggleList: () => void;
  hasActiveFilters: boolean;
  isListOpen: boolean;
}

export const HeaderSearch: React.FC<HeaderSearchProps> = ({
  searchQuery,
  onSearchChange,
  onCurrentLocation,
  onToggleFilter,
  onToggleList,
  hasActiveFilters,
  isListOpen,
}) => {
  return (
    <header className="absolute top-3 left-3 right-3 z-30 flex items-center gap-2 pointer-events-auto">
      {/* 검색 입력창 카드 */}
      <div className="flex-1 flex items-center bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-xl px-3 py-2.5 transition-all focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/20">
        <Search className="w-5 h-5 text-cyan-400 shrink-0 mr-2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="지역 또는 수영장명 검색 (예: 화성, 전주, 동탄)"
          className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-400 focus:outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-200"
            aria-label="검색어 지우기"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 내 위치 버튼 */}
      <button
        onClick={onCurrentLocation}
        title="내 위치로 이동"
        className="w-11 h-11 flex items-center justify-center rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-xl text-cyan-400 hover:bg-slate-800 active:scale-95 transition-all shrink-0"
        aria-label="현재 위치"
      >
        <MapPin className="w-5 h-5" />
      </button>

      {/* 필터 버튼 */}
      <button
        onClick={onToggleFilter}
        title="필터 옵션"
        className={`w-11 h-11 flex items-center justify-center rounded-2xl backdrop-blur-md border shadow-xl shrink-0 active:scale-95 transition-all relative ${
          hasActiveFilters
            ? 'bg-cyan-600 border-cyan-400 text-white'
            : 'bg-slate-900/90 border-slate-700/80 text-slate-300 hover:bg-slate-800'
        }`}
        aria-label="필터"
      >
        <Filter className="w-5 h-5" />
        {hasActiveFilters && (
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-yellow-300 animate-pulse" />
        )}
      </button>

      {/* 리스트 보기 버튼 */}
      <button
        onClick={onToggleList}
        title="수영장 목록 보기"
        className={`w-11 h-11 flex items-center justify-center rounded-2xl backdrop-blur-md border shadow-xl shrink-0 active:scale-95 transition-all ${
          isListOpen
            ? 'bg-cyan-600 border-cyan-400 text-white'
            : 'bg-slate-900/90 border-slate-700/80 text-slate-300 hover:bg-slate-800'
        }`}
        aria-label="리스트 보기"
      >
        <List className="w-5 h-5" />
      </button>
    </header>
  );
};
