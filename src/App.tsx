import React, { useState, useEffect, useMemo } from 'react';
import { SwimmingPool, PoolCurrentStatus } from './types/pool';
import {
  calculatePoolStatus,
  calculateDistanceKm,
} from './utils/scheduleCalculator';
import { HeaderSearch } from './components/HeaderSearch';
import { FilterModal, DayTypeOption } from './components/FilterModal';
import { PoolListModal, SortMode } from './components/PoolListModal';
import { PoolDetailDrawer } from './components/PoolDetailDrawer';
import { KakaoMapWrapper } from './components/KakaoMapWrapper';

const DEFAULT_CENTER = { lat: 37.1995, lng: 126.8315 };
const ALL_DAYS: DayTypeOption[] = ['weekday', 'saturday', 'sunday', 'holiday'];
const ALL_LANES: (25 | 50)[] = [25, 50];

export const App: React.FC = () => {
  const [pools, setPools] = useState<SwimmingPool[]>([]);
  const [selectedPool, setSelectedPool] = useState<SwimmingPool | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [targetDate, setTargetDate] = useState<Date>(new Date());

  // 요구사항 3: 초기화 상태는 모두 선택된 상태
  const [selectedDays, setSelectedDays] = useState<DayTypeOption[]>(ALL_DAYS);
  const [selectedLanes, setSelectedLanes] = useState<(25 | 50)[]>(ALL_LANES);
  const [onlyOpenNow, setOnlyOpenNow] = useState<boolean>(false);

  const [sortMode, setSortMode] = useState<SortMode>('distance');
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [isListOpen, setIsListOpen] = useState<boolean>(false);

  // 사용자 위치 및 지도 중심
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(DEFAULT_CENTER);

  // 1. 수영장 데이터 로드 (전국 906개 통합 데이터)
  useEffect(() => {
    fetch('./data/swimming_pools.json')
      .then((res) => res.json())
      .then((data: SwimmingPool[]) => {
        setPools(data);
      })
      .catch((err) => {
        console.error('수영장 데이터 로드 실패:', err);
      });
  }, []);

  // 2. 현재 위치 조회
  const requestCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setUserLocation(loc);
          setMapCenter(loc);
        },
        (err) => {
          console.warn('위치 권한 획득 실패 (기본 화성시 중심으로 표시):', err);
          setMapCenter(DEFAULT_CENTER);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  useEffect(() => {
    requestCurrentLocation();
  }, []);

  // 3. 요일 토글 핸들러
  const handleToggleDay = (day: DayTypeOption) => {
    setSelectedDays((prev) => {
      if (prev.includes(day)) {
        // 이미 선택되어 있으면 제거 (단, 모두 해제 시 빈 배열)
        return prev.filter((d) => d !== day);
      } else {
        return [...prev, day];
      }
    });
  };

  // 4. 레인 토글 핸들러
  const handleToggleLane = (lane: 25 | 50) => {
    setSelectedLanes((prev) => {
      if (prev.includes(lane)) {
        return prev.filter((l) => l !== lane);
      } else {
        return [...prev, lane];
      }
    });
  };

  // 1분마다 실시간 시각 갱신
  const [currentTimeTick, setCurrentTimeTick] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeTick(Date.now());
    }, 30000); // 30초마다 상태 갱신
    return () => clearInterval(timer);
  }, []);

  const effectiveTargetDate = useMemo(() => {
    const isToday = targetDate.toDateString() === new Date().toDateString();
    if (isToday) {
      return new Date(currentTimeTick);
    }
    return targetDate;
  }, [targetDate, currentTimeTick]);

  // 5. 수영장별 실시간 운영 상태 계산
  const poolStatuses = useMemo(() => {
    const statusMap: Record<string, PoolCurrentStatus> = {};
    const isHoliday = selectedDays.length === 1 && selectedDays[0] === 'holiday';

    pools.forEach((pool) => {
      statusMap[pool.id] = calculatePoolStatus(pool, effectiveTargetDate, isHoliday);
    });

    return statusMap;
  }, [pools, effectiveTargetDate, selectedDays]);

  // 6. 거리 계산
  const poolDistances = useMemo(() => {
    const distMap: Record<string, number> = {};
    const refPoint = userLocation || mapCenter;

    pools.forEach((pool) => {
      distMap[pool.id] = calculateDistanceKm(
        refPoint.lat,
        refPoint.lng,
        pool.lat,
        pool.lng
      );
    });

    return distMap;
  }, [pools, userLocation, mapCenter]);

  // 7. 검색 및 필터링 적용된 수영장 목록
  const filteredPools = useMemo(() => {
    return pools.filter((pool) => {
      // 1) 검색어 필터 (지역, 명칭, 주소)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesName = pool.name.toLowerCase().includes(query);
        const matchesShortName = pool.shortName?.toLowerCase().includes(query);
        const matchesAddress = pool.address.toLowerCase().includes(query);
        const matchesDistrict = pool.district ? pool.district.toLowerCase().includes(query) : false;
        const matchesCity = pool.city.toLowerCase().includes(query);

        if (
          !matchesName &&
          !matchesShortName &&
          !matchesAddress &&
          !matchesDistrict &&
          !matchesCity
        ) {
          return false;
        }
      }

      // 2) 레인 규격 필터 (25m / 50m)
      if (!selectedLanes.includes(pool.laneLength)) {
        return false;
      }

      // 3) 요일 및 공휴일 필터
      // selectedDays에 포함된 요일 중 수영장이 하나라도 여는지 확인
      if (selectedDays.length < 4) {
        if (selectedDays.length === 0) return false;

        let matchesAnyDay = false;
        if (selectedDays.includes('weekday')) {
          // 월~금 중 하루라도 운영하면
          for (let d = 1; d <= 5; d++) {
            if (pool.weeklySchedule[d]?.isOpen) {
              matchesAnyDay = true;
              break;
            }
          }
        }
        if (!matchesAnyDay && selectedDays.includes('saturday')) {
          if (pool.weeklySchedule[6]?.isOpen) matchesAnyDay = true;
        }
        if (!matchesAnyDay && selectedDays.includes('sunday')) {
          if (pool.weeklySchedule[0]?.isOpen) matchesAnyDay = true;
        }
        if (!matchesAnyDay && selectedDays.includes('holiday')) {
          if (pool.holidaySchedule?.isOpen) matchesAnyDay = true;
        }

        if (!matchesAnyDay) {
          return false;
        }
      }

      // 4) 운영 중 토글 필터
      if (onlyOpenNow) {
        const st = poolStatuses[pool.id];
        if (!st || (st.status !== 'OPEN' && st.status !== 'BREAK')) {
          return false;
        }
      }

      return true;
    });
  }, [pools, searchQuery, selectedLanes, selectedDays, onlyOpenNow, poolStatuses]);

  // 8. 검색어 입력 시 첫 번째 수영장 위치로 지도 이동
  useEffect(() => {
    if (searchQuery.trim() && filteredPools.length > 0) {
      setMapCenter({
        lat: filteredPools[0].lat,
        lng: filteredPools[0].lng,
      });
    }
  }, [searchQuery]);

  // 필터 초기화 (모든 옵션이 선택된 상태로 복구)
  const handleResetAllFilters = () => {
    setSearchQuery('');
    setTargetDate(new Date());
    setSelectedDays(ALL_DAYS);
    setSelectedLanes(ALL_LANES);
    setOnlyOpenNow(false);
    setSelectedPool(null);
  };

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedDays.length !== 4 ||
    selectedLanes.length !== 2 ||
    onlyOpenNow;

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950">
      {/* 1. 상단 플로팅 검색 & 컨트롤 헤더 */}
      <HeaderSearch
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onCurrentLocation={requestCurrentLocation}
        onToggleFilter={() => setIsFilterOpen(true)}
        onToggleList={() => setIsListOpen(true)}
        hasActiveFilters={hasActiveFilters}
        isListOpen={isListOpen}
      />

      {/* 2. 카카오 지도 뷰 */}
      <KakaoMapWrapper
        pools={filteredPools}
        selectedPool={selectedPool}
        onSelectPool={(pool) => setSelectedPool(pool)}
        poolStatuses={poolStatuses}
        center={mapCenter}
        userLocation={userLocation}
      />

      {/* 3. 수영장 상세 바텀시트 */}
      <PoolDetailDrawer
        pool={selectedPool}
        status={selectedPool ? poolStatuses[selectedPool.id] : undefined}
        targetDate={targetDate}
        onClose={() => setSelectedPool(null)}
      />

      {/* 4. 필터 설정 모달 */}
      <FilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        selectedDays={selectedDays}
        onToggleDay={handleToggleDay}
        targetDate={targetDate}
        onDateChange={setTargetDate}
        onResetToToday={() => setTargetDate(new Date())}
        selectedLanes={selectedLanes}
        onToggleLane={handleToggleLane}
        onlyOpenNow={onlyOpenNow}
        onToggleOnlyOpenNow={() => setOnlyOpenNow(!onlyOpenNow)}
        onResetAllFilters={handleResetAllFilters}
      />

      {/* 5. 전체 수영장 리스트 모달 */}
      <PoolListModal
        isOpen={isListOpen}
        onClose={() => setIsListOpen(false)}
        pools={filteredPools}
        poolStatuses={poolStatuses}
        poolDistances={poolDistances}
        sortMode={sortMode}
        onSelectSortMode={setSortMode}
        onlyOpenNow={onlyOpenNow}
        onToggleOnlyOpenNow={() => setOnlyOpenNow(!onlyOpenNow)}
        onSelectPool={(pool) => {
          setSelectedPool(pool);
          setMapCenter({ lat: pool.lat, lng: pool.lng });
        }}
        selectedPoolId={selectedPool?.id}
      />
    </div>
  );
};
