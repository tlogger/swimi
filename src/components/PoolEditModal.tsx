import React, { useState } from 'react';
import { X, Save, AlertCircle, Check, Trash2, CalendarOff, AlertTriangle } from 'lucide-react';
import { SwimmingPool, LaneLength, BreakRule, TemporaryClosure } from '../types/pool';

interface PoolEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  pool: SwimmingPool | null;
  onSave: (updated: SwimmingPool) => Promise<void>;
  onDelete?: (poolId: string) => Promise<void>;
}

export const PoolEditModal: React.FC<PoolEditModalProps> = ({
  isOpen,
  onClose,
  pool,
  onSave,
  onDelete,
}) => {
  if (!isOpen || !pool) return null;

  // 폼 상태
  const [name, setName] = useState<string>(pool.name || '');
  const [shortName, setShortName] = useState<string>(pool.shortName || '');
  const [address, setAddress] = useState<string>(pool.address || '');
  const [addressDetail, setAddressDetail] = useState<string>(pool.addressDetail || '');
  const [phone, setPhone] = useState<string>(pool.phone || '');
  const [homepage, setHomepage] = useState<string>(pool.homepage || '');

  // 임시 휴관 상태
  const [isTempClosed, setIsTempClosed] = useState<boolean>(
    Boolean(pool.temporaryClosure?.isClosed)
  );
  const [closureStartDate, setClosureStartDate] = useState<string>(
    pool.temporaryClosure?.startDate || ''
  );
  const [closureEndDate, setClosureEndDate] = useState<string>(
    pool.temporaryClosure?.endDate || ''
  );
  const [closureReason, setClosureReason] = useState<string>(
    pool.temporaryClosure?.reason || ''
  );

  // 레인 정보
  const [laneLength, setLaneLength] = useState<LaneLength>(pool.laneLength || 25);
  const [laneCount, setLaneCount] = useState<string>(pool.laneCount ? String(pool.laneCount) : '');
  const [depth, setDepth] = useState<string>(pool.depth || '');
  const [breakRule, setBreakRule] = useState<BreakRule | ''>(pool.breakRule || '');

  // 편의시설 7종
  const [amenities, setAmenities] = useState({
    dehydrator: Boolean(pool.amenities?.dehydrator),
    dryer: Boolean(pool.amenities?.dryer),
    soap: Boolean(pool.amenities?.soap),
    walkingLane: Boolean(pool.amenities?.walkingLane),
    kickboard: Boolean(pool.amenities?.kickboard),
    flippers: Boolean(pool.amenities?.flippers),
    parking: Boolean(pool.amenities?.parking),
  });

  // 운영시간 텍스트
  const [weekdaySchedule, setWeekdaySchedule] = useState<string>(pool.scheduleText?.weekday || '');
  const [saturdaySchedule, setSaturdaySchedule] = useState<string>(pool.scheduleText?.saturday || '');
  const [sundaySchedule, setSundaySchedule] = useState<string>(pool.scheduleText?.sunday || '');
  const [holidaySchedule, setHolidaySchedule] = useState<string>(pool.scheduleText?.holiday || '');
  const [closedDays, setClosedDays] = useState<string>(
    pool.scheduleText?.closedDays || pool.closedDaysDescription || ''
  );

  // 요금 (성인 입장료)
  const [adultFee, setAdultFee] = useState<string>(
    pool.fee?.standard?.adult !== undefined ? String(pool.fee.standard.adult) : ''
  );

  // 주차장 및 기타
  const [parkingInfo, setParkingInfo] = useState<string>(pool.parkingInfo || '');
  const [etcInfo, setEtcInfo] = useState<string>(pool.etcInfo || '');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const toggleAmenity = (key: keyof typeof amenities) => {
    setAmenities((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    const confirmed = window.confirm(
      `"${pool.name}" 수영장을 클라우드 DB에서 정말 삭제하시겠습니까?\n\n(잘못 등록되었거나 폐업한 수영장인 경우 삭제해 주세요. 삭제 즉시 지도와 검색 목록에서 제거됩니다.)`
    );
    if (!confirmed) return;

    try {
      setIsDeleting(true);
      await onDelete(pool.id);
      onClose();
    } catch (err) {
      console.error('수영장 삭제 실패:', err);
      alert('삭제 처리 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('수영장 명칭을 입력해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);

      const temporaryClosure: TemporaryClosure | undefined = isTempClosed
        ? {
            isClosed: true,
            startDate: closureStartDate || undefined,
            endDate: closureEndDate || undefined,
            reason: closureReason.trim() || undefined,
          }
        : {
            isClosed: false,
          };

      const updatedPool: SwimmingPool = {
        ...pool,
        name: name.trim(),
        shortName: shortName.trim() || undefined,
        address: address.trim(),
        addressDetail: addressDetail.trim() || undefined,
        phone: phone.trim() || undefined,
        homepage: homepage.trim() || undefined,
        laneLength: laneLength,
        laneCount: laneCount.trim() ? parseInt(laneCount.trim(), 10) : undefined,
        depth: depth.trim() || undefined,
        breakRule: breakRule ? (breakRule as BreakRule) : undefined,
        amenities: {
          ...amenities,
        },
        parkingInfo: parkingInfo.trim() || undefined,
        etcInfo: etcInfo.trim() || undefined,
        closedDaysDescription: closedDays.trim() || undefined,
        temporaryClosure,
        scheduleText: {
          weekday: weekdaySchedule.trim() || undefined,
          saturday: saturdaySchedule.trim() || undefined,
          sunday: sundaySchedule.trim() || undefined,
          holiday: holidaySchedule.trim() || undefined,
          closedDays: closedDays.trim() || undefined,
        },
        fee: {
          ...pool.fee,
          standard: {
            ...pool.fee?.standard,
            adult: adultFee.trim() ? parseInt(adultFee.trim(), 10) : (pool.fee?.standard?.adult || 0),
          },
        },
      };

      await onSave(updatedPool);
      onClose();
    } catch (err) {
      console.error('수영장 정보 수정 실패:', err);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <h2 className="text-base font-bold text-white">수영장 정보 수정 제보 (DB 반영)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 폼 스크롤 본문 */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
          <div className="p-3 bg-cyan-950/40 border border-cyan-800/40 rounded-2xl flex items-start gap-2 text-xs text-cyan-200">
            <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              잘못되거나 변경된 운영시간, 요금, 편의시설 등을 수정하면 클라우드 DB에 즉시 반영되어
              모든 사용자에게 공유됩니다.
            </span>
          </div>

          {/* 0. 임시 휴관 설정 (휴관 중 버튼 & 휴관 일시/사유 지정) */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              isTempClosed
                ? 'bg-rose-950/30 border-rose-500/50 shadow-lg shadow-rose-950/20'
                : 'bg-slate-800/40 border-slate-700/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarOff
                  className={`w-4 h-4 ${isTempClosed ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`}
                />
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    수영장 휴관 상태
                    {isTempClosed && (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
                        휴관 중
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    보수공사, 정기소독 등으로 인한 임시 휴관 여부를 설정합니다.
                  </p>
                </div>
              </div>

              {/* 휴관 중 토글 버튼 */}
              <button
                type="button"
                onClick={() => setIsTempClosed(!isTempClosed)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 ${
                  isTempClosed
                    ? 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-400'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600'
                }`}
              >
                {isTempClosed ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-white" />
                    휴관 중 해제
                  </>
                ) : (
                  <>
                    <CalendarOff className="w-3.5 h-3.5 text-slate-300" />
                    '휴관 중'으로 변경
                  </>
                )}
              </button>
            </div>

            {/* 휴관 중일 때 나타나는 일시 및 사유 입력 필드 */}
            {isTempClosed && (
              <div className="mt-3 pt-3 border-t border-rose-900/50 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-rose-300 mb-1">
                      휴관 시작일 (선택)
                    </label>
                    <input
                      type="date"
                      value={closureStartDate}
                      onChange={(e) => setClosureStartDate(e.target.value)}
                      className="w-full bg-slate-950 border border-rose-900/60 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-400 [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-rose-300 mb-1">
                      휴관 종료일 (선택)
                    </label>
                    <input
                      type="date"
                      value={closureEndDate}
                      onChange={(e) => setClosureEndDate(e.target.value)}
                      className="w-full bg-slate-950 border border-rose-900/60 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-400 [color-scheme:dark]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-rose-300 mb-1">
                    휴관 사유
                  </label>
                  <input
                    type="text"
                    value={closureReason}
                    onChange={(e) => setClosureReason(e.target.value)}
                    placeholder="예: 시설 개보수 공사, 수조 청소 및 기계실 점검"
                    className="w-full bg-slate-950 border border-rose-900/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400 placeholder:text-slate-600"
                  />
                  <p className="text-[10px] text-rose-400/80 mt-1">
                    * 날짜가 지정되지 않으면 상시 '임시 휴관'으로 지도와 상세페이지에 붉은색 배지로 강조됩니다.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 1. 기본 정보 */}
          <div className="space-y-3 bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50">
            <h3 className="text-xs font-bold text-slate-300">기본 정보</h3>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                수영장 명칭 *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">약칭</label>
                <input
                  type="text"
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  대표 전화번호
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="예: 031-123-4567"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">기본 주소</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">상세 주소</label>
              <input
                type="text"
                value={addressDetail}
                onChange={(e) => setAddressDetail(e.target.value)}
                placeholder="예: 종합운동장 지하 1층"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                홈페이지 URL
              </label>
              <input
                type="text"
                value={homepage}
                onChange={(e) => setHomepage(e.target.value)}
                placeholder="https://..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* 2. 레인 및 수심 규격 */}
          <div className="space-y-3 bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50">
            <h3 className="text-xs font-bold text-slate-300">레인 규격 및 운영 규칙</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  레인 길이
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setLaneLength(25)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      laneLength === 25
                        ? 'bg-blue-600 border-blue-400 text-white'
                        : 'bg-slate-950 border-slate-700 text-slate-400'
                    }`}
                  >
                    25m
                  </button>
                  <button
                    type="button"
                    onClick={() => setLaneLength(50)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      laneLength === 50
                        ? 'bg-amber-600 border-amber-400 text-white'
                        : 'bg-slate-950 border-slate-700 text-slate-400'
                    }`}
                  >
                    50m
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  레인 수 (개)
                </label>
                <input
                  type="number"
                  value={laneCount}
                  onChange={(e) => setLaneCount(e.target.value)}
                  placeholder="예: 8"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  수심 정보
                </label>
                <input
                  type="text"
                  value={depth}
                  onChange={(e) => setDepth(e.target.value)}
                  placeholder="예: 1.2m ~ 1.8m"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  휴식제 운영 방식
                </label>
                <select
                  value={breakRule}
                  onChange={(e) => setBreakRule(e.target.value as BreakRule)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="">정보 없음 / 기본</option>
                  <option value="50_10">50분 수영 / 10분 휴식제</option>
                  <option value="continuous">연속 운영 (휴식 없음)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. 부대시설 7종 */}
          <div className="space-y-2 bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50">
            <h3 className="text-xs font-bold text-slate-300">부대시설 및 편의시설 (7종)</h3>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { key: 'dehydrator', label: '탈수기' },
                { key: 'dryer', label: '헤어드라이어' },
                { key: 'soap', label: '비누/샤워용품' },
                { key: 'walkingLane', label: '걷기레인' },
                { key: 'kickboard', label: '킥판' },
                { key: 'flippers', label: '오리발' },
                { key: 'parking', label: '주차장' },
              ].map(({ key, label }) => {
                const checked = amenities[key as keyof typeof amenities];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleAmenity(key as keyof typeof amenities)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-medium border flex items-center justify-between transition-all ${
                      checked
                        ? 'bg-cyan-950 border-cyan-500 text-cyan-200'
                        : 'bg-slate-950 border-slate-800 text-slate-500 line-through opacity-70'
                    }`}
                  >
                    <span>{label}</span>
                    {checked && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. 운영시간 & 휴관일 안내 */}
          <div className="space-y-3 bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50">
            <h3 className="text-xs font-bold text-slate-300">운영시간 텍스트 및 휴관일</h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  평일 (월~금)
                </label>
                <input
                  type="text"
                  value={weekdaySchedule}
                  onChange={(e) => setWeekdaySchedule(e.target.value)}
                  placeholder="예: 06:00 ~ 21:00"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  토요일
                </label>
                <input
                  type="text"
                  value={saturdaySchedule}
                  onChange={(e) => setSaturdaySchedule(e.target.value)}
                  placeholder="예: 09:00 ~ 18:00"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  일요일
                </label>
                <input
                  type="text"
                  value={sundaySchedule}
                  onChange={(e) => setSundaySchedule(e.target.value)}
                  placeholder="예: 09:00 ~ 17:00"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  공휴일
                </label>
                <input
                  type="text"
                  value={holidaySchedule}
                  onChange={(e) => setHolidaySchedule(e.target.value)}
                  placeholder="예: 09:00 ~ 17:00 (휴관 등)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                정기 휴관일 안내
              </label>
              <input
                type="text"
                value={closedDays}
                onChange={(e) => setClosedDays(e.target.value)}
                placeholder="예: 매주 월요일, 설/추석 연휴"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* 5. 요금 및 주차 안내 */}
          <div className="space-y-3 bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50">
            <h3 className="text-xs font-bold text-slate-300">입장료 및 주차/기타 안내</h3>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                성인 일일 입장료 (원)
              </label>
              <input
                type="number"
                value={adultFee}
                onChange={(e) => setAdultFee(e.target.value)}
                placeholder="예: 4000"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                주차장 안내
              </label>
              <input
                type="text"
                value={parkingInfo}
                onChange={(e) => setParkingInfo(e.target.value)}
                placeholder="예: 무료 주차 3시간 가능, 주차등록 필수"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                기타 특이사항 (팁, 복장 규정 등)
              </label>
              <textarea
                value={etcInfo}
                onChange={(e) => setEtcInfo(e.target.value)}
                rows={2}
                placeholder="예: 실내 수영모 착용 필수, 5부 이상 수영복 권장"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 resize-none"
              />
            </div>
          </div>

          {/* 하단 저장 버튼 */}
          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={isSubmitting || isDeleting}
              className="w-full py-3.5 px-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-98 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? '중앙 DB에 저장 중...' : '클라우드 DB에 수정 사항 저장하기'}
            </button>

            {onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting || isDeleting}
                className="w-full py-2.5 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-98 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                {isDeleting ? '수영장 삭제 처리 중...' : '이 수영장 DB에서 영구 삭제하기 (폐업/오류)'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
