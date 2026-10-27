import React from 'react';
import { X, RotateCcw, Calendar, ChevronLeft, ChevronRight, Waves } from 'lucide-react';

export type DayTypeFilter = 'all' | 'weekday' | 'saturday' | 'sunday' | 'holiday';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayType: DayTypeFilter;
  onSelectDayType: (type: DayTypeFilter) => void;
  targetDate: Date;
  onDateChange: (newDate: Date) => void;
  onResetToToday: () => void;
  laneFilter: 'all' | 25 | 50;
  onSelectLaneFilter: (lane: 'all' | 25 | 50) => void;
  onlyOpenNow: boolean;
  onToggleOnlyOpenNow: () => void;
  onResetAllFilters: () => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  dayType,
  onSelectDayType,
  targetDate,
  onDateChange,
  onResetToToday,
  laneFilter,
  onSelectLaneFilter,
  onlyOpenNow,
  onToggleOnlyOpenNow,
  onResetAllFilters,
}) => {
  if (!isOpen) return null;

  // 날짜 +/- 증감 함수
  const handleShiftDate = (days: number) => {
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + days);
    onDateChange(nextDate);
  };

  // 날짜 포맷팅 (YYYY년 MM월 DD일 요일)
  const daysOfWeekKor = ['일', '월', '화', '수', '목', '금', '토'];
  const formattedDateStr = `${targetDate.getMonth() + 1}월 ${targetDate.getDate()}일 (${daysOfWeekKor[targetDate.getDay()]})`;

  const isToday =
    targetDate.toDateString() === new Date().toDateString();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-slate-900 border border-slate-700/80 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 flex flex-col gap-5 max-h-[85vh] overflow-y-auto no-scrollbar">
        {/* 헤더 */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">수영장 조건 검색 필터</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-full"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. 날짜 선택기 (+/- 증감 및 오늘 버튼) */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>방문 기준 날짜</span>
            {isToday && (
              <span className="text-cyan-400 font-bold bg-cyan-950/70 border border-cyan-800/80 px-2 py-0.5 rounded-full">
                오늘 기준
              </span>
            )}
          </div>
          <div className="flex items-center justify-between bg-slate-800/80 border border-slate-700 rounded-2xl p-1.5">
            <button
              onClick={() => handleShiftDate(-1)}
              className="p-2 hover:bg-slate-700 rounded-xl text-slate-300 active:scale-95 transition-all"
              title="하루 전"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-bold text-slate-100 text-sm">
              {formattedDateStr}
            </span>
            <button
              onClick={() => handleShiftDate(1)}
              className="p-2 hover:bg-slate-700 rounded-xl text-slate-300 active:scale-95 transition-all"
              title="하루 뒤"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          {!isToday && (
            <button
              onClick={onResetToToday}
              className="text-xs text-center text-cyan-400 hover:underline py-1"
            >
              오늘 날짜로 되돌리기
            </button>
          )}
        </div>

        {/* 2. 요일 유형 체크/선택 */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-400">
            요일 및 공휴일 조건
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'weekday', label: '평일' },
              { id: 'saturday', label: '토요일' },
              { id: 'sunday', label: '일요일' },
              { id: 'holiday', label: '공휴일' },
            ].map((item) => {
              const active = dayType === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() =>
                    onSelectDayType(active ? 'all' : (item.id as DayTypeFilter))
                  }
                  className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all text-center ${
                    active
                      ? 'bg-cyan-600 border-cyan-400 text-white shadow-md shadow-cyan-600/30'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. 레인 길이 구분 (25m vs 50m) */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Waves className="w-4 h-4 text-cyan-400" />
            레인 규격 (25m / 50m)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'all', label: '전체 레인' },
              { value: 25, label: '25m 레인' },
              { value: 50, label: '50m 국제규격' },
            ].map((opt) => {
              const active = laneFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => onSelectLaneFilter(opt.value as any)}
                  className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all text-center ${
                    active
                      ? 'bg-cyan-600 border-cyan-400 text-white shadow-md shadow-cyan-600/30'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. 지금 운영중인 수영장만 보기 토글 */}
        <div className="flex items-center justify-between bg-slate-800/40 border border-slate-800 rounded-2xl p-3">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-200">
              현재 운영중인 곳만 표시
            </span>
            <span className="text-[11px] text-slate-400">
              오늘 현재 시각 기준 즉시 수영 가능한 수영장만
            </span>
          </div>
          <button
            onClick={onToggleOnlyOpenNow}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
              onlyOpenNow ? 'bg-emerald-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                onlyOpenNow ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* 하단 액션 버튼 (필터 초기화 및 적용) */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onResetAllFilters}
            className="flex-1 py-3 px-4 rounded-2xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-98 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            필터 초기화
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs flex items-center justify-center active:scale-98 transition-all shadow-lg shadow-cyan-500/20"
          >
            적용 완료
          </button>
        </div>
      </div>
    </div>
  );
};
