import React from 'react';
import { X, RotateCcw, Calendar, ChevronLeft, ChevronRight, Waves } from 'lucide-react';

export type DayTypeOption = 'weekday' | 'saturday' | 'sunday' | 'holiday';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDays: DayTypeOption[];
  onToggleDay: (day: DayTypeOption) => void;
  targetDate: Date;
  onDateChange: (newDate: Date) => void;
  onResetToToday: () => void;
  selectedLanes: (25 | 50)[];
  onToggleLane: (lane: 25 | 50) => void;
  onlyOpenNow: boolean;
  onToggleOnlyOpenNow: () => void;
  onResetAllFilters: () => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  selectedDays,
  onToggleDay,
  targetDate,
  onDateChange,
  onResetToToday,
  selectedLanes,
  onToggleLane,
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

  const daysOfWeekKor = ['일', '월', '화', '수', '목', '금', '토'];
  const formattedDateStr = `${targetDate.getMonth() + 1}월 ${targetDate.getDate()}일 (${daysOfWeekKor[targetDate.getDay()]})`;

  const isToday =
    targetDate.toDateString() === new Date().toDateString();

  const dayOptions: { id: DayTypeOption; label: string }[] = [
    { id: 'weekday', label: '평일' },
    { id: 'saturday', label: '토요일' },
    { id: 'sunday', label: '일요일' },
    { id: 'holiday', label: '공휴일' },
  ];

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

        {/* 2. 요일 및 공휴일 다중 선택 버튼군 ('요일 및 공휴일 조건' 텍스트 삭제) */}
        <div className="grid grid-cols-4 gap-2">
          {dayOptions.map((item) => {
            const isSelected = selectedDays.includes(item.id);
            return (
              <button
                key={item.id}
                onClick={() => onToggleDay(item.id)}
                className={`py-2.5 px-1 text-xs font-bold rounded-xl border transition-all text-center ${
                  isSelected
                    ? 'bg-cyan-600 border-cyan-400 text-white shadow-md shadow-cyan-600/30'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-500 hover:text-slate-300'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* 3. 레인 규격 (25m / 50m 다중 선택 토글) */}
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            {[25, 50].map((lane) => {
              const isSelected = selectedLanes.includes(lane as 25 | 50);
              return (
                <button
                  key={lane}
                  onClick={() => onToggleLane(lane as 25 | 50)}
                  className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                    isSelected
                      ? 'bg-cyan-600 border-cyan-400 text-white shadow-md shadow-cyan-600/30'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Waves className="w-3.5 h-3.5" />
                  {lane}m
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. 운영 중 토글 (문구 단순화: '운영 중') */}
        <div className="flex items-center justify-between bg-slate-800/40 border border-slate-800 rounded-2xl p-3.5">
          <span className="text-sm font-bold text-slate-200">운영 중</span>
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

        {/* 하단 액션 버튼 */}
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
