import React, { useState, useEffect, useMemo } from 'react';
import { SwimmingPool, PoolCurrentStatus } from './types/pool';
import {
  calculatePoolStatus,
  calculateDistanceKm,
} from './utils/scheduleCalculator';
import { HeaderSearch } from './components/HeaderSearch';
import { FilterModal, DayTypeFilter } from './components/FilterModal';
import { PoolListModal, SortMode } from './components/PoolListModal';
import { PoolDetailDrawer } from './components/PoolDetailDrawer';
import { KakaoMapWrapper } from './components/KakaoMapWrapper';

// 시범 지역 화성시 중심 좌표 (화성시청 부근)
const DEFAULT_CENTER = { lat: 37.1995, lng: 126.8315 };

export const App: React.FC = () => {
  const [pools, setPools] = useState<SwimmingPool[]>([]);
  const [selectedPool, setSelectedPool] = useState<SwimmingPool | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [targetDate, setTargetDate] = useState<Date>(new Date());
  const [dayType, setDayType] = useState<DayTypeFilter>('all');
  const [laneFilter, setLaneFilter] = useState<'all' | 25 | 50>('all');
  const [onlyOpenNow, setOnlyOpenNow] = useState<boolean>(false);
  const [sortMode, setSortMode] = useState<SortMode>('distance');
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [isListOpen, setIsListOpen] = useState<boolean>(false);

  // 사용자 위치 및 지도 중심
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(DEFAULT_CENTER);

  // 1. 초기 수영장 데이터셋 로드
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

  // 2. 브라우저 현재 위치 획득
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

  // 3. 수영장별 실시간 운영 상태 맵 계산
  const poolStatuses = useMemo(() => {
    const statusMap: Record<string, PoolCurrentStatus> = {};
    const isHoliday = dayType === 'holiday';

    pools.forEach((pool) => {
      statusMap[pool.id] = calculatePoolStatus(pool, targetDate, isHoliday);
    });

    return statusMap;
  }, [pools, targetDate, dayType]);

  // 4. 수영장별 거리 계산 맵 (km)
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

  // 5. 검색 및 필터링 적용된 수영장 목록
  const filteredPools = useMemo(() => {
    return pools.filter((pool) => {
      // 검색어 필터 (지역, 명칭, 주소)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesName = pool.name.toLowerCase().includes(query);
        const matchesShortName = pool.shortName?.toLowerCase().includes(query);
        const matchesAddress = pool.address.toLowerCase().includes(query);
        const matchesDistrict = pool.district.toLowerCase().includes(query);
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

      // 레인 규격 필터
      if (laneFilter !== 'all' && pool.laneLength !== laneFilter) {
        return false;
      }

      // 요일 필터 (평일 / 토요일 / 일요일 / 공휴일)
      if (dayType !== 'all') {
        const dayOfWeek = targetDate.getDay();
        if (dayType === 'weekday' && (dayOfWeek === 0 || dayOfWeek === 6)) {
          return false;
        }
        if (dayType === 'saturday' && dayOfWeek !== 6) {
          return false;
        }
        if (dayType === 'sunday' && dayOfWeek !== 0) {
          return false;
        }
      }

      // 현재 운영중만 보기 필터
      if (onlyOpenNow) {
        const st = poolStatuses[pool.id];
        if (!st || (st.status !== 'OPEN' && st.status !== 'BREAK')) {
          return false;
        }
      }

      return true;
    });
  }, [pools, searchQuery, laneFilter, dayType, targetDate, onlyOpenNow, poolStatuses]);

  // 6. 검색어 입력 시 첫 번째 일치하는 수영장으로 지도 중심 이동
  useEffect(() => {
    if (searchQuery.trim() && filteredPools.length > 0) {
      setMapCenter({
        lat: filteredPools[0].lat,
        lng: filteredPools[0].lng,
      });
    }
  }, [searchQuery]);

  // 필터 초기화
  const handleResetAllFilters = () => {
    setSearchQuery('');
    setTargetDate(new Date());
    setDayType('all');
    setLaneFilter('all');
    setOnlyOpenNow(false);
    setSelectedPool(null);
  };

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    dayType !== 'all' ||
    laneFilter !== 'all' ||
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
        dayType={dayType}
        onSelectDayType={setDayType}
        targetDate={targetDate}
        onDateChange={setTargetDate}
        onResetToToday={() => setTargetDate(new Date())}
        laneFilter={laneFilter}
        onSelectLaneFilter={setLaneFilter}
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
