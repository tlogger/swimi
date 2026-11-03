import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User, Trophy, MapPin, ExternalLink } from 'lucide-react';
import { SwimmingPool, PoolCurrentStatus } from './types/pool';
import { UserAccount, UserInteractionsMap } from './types/auth';
import {
  calculatePoolStatus,
  calculateDistanceKm,
} from './utils/scheduleCalculator';
import {
  loadAllPoolsWithDbSync,
  savePoolToDb,
  deletePoolFromDb,
  loadUserInteractions,
  toggleFavoriteInDb,
  toggleCheckInInDb,
} from './services/poolDb';
import {
  getCurrentUser,
  handleOAuthCallback,
} from './services/authService';
import { HeaderSearch } from './components/HeaderSearch';
import { FilterModal, DayTypeOption } from './components/FilterModal';
import { PoolListModal, SortMode } from './components/PoolListModal';
import { PoolDetailDrawer } from './components/PoolDetailDrawer';
import { KakaoMapWrapper } from './components/KakaoMapWrapper';
import { AuthModal } from './components/AuthModal';
import { PoolEditModal } from './components/PoolEditModal';

const DEFAULT_CENTER = { lat: 37.1995, lng: 126.8315 };
const ALL_DAYS: DayTypeOption[] = ['weekday', 'saturday', 'sunday', 'holiday'];
const ALL_LANES: (25 | 50)[] = [25, 50];

export const App: React.FC = () => {
  const [pools, setPools] = useState<SwimmingPool[]>([]);
  const [lastUpdateDate, setLastUpdateDate] = useState<string>('2026-11-02');
  const [selectedPool, setSelectedPool] = useState<SwimmingPool | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [targetDate, setTargetDate] = useState<Date>(new Date());

  // 필터 상태
  const [selectedDays, setSelectedDays] = useState<DayTypeOption[]>(ALL_DAYS);
  const [selectedLanes, setSelectedLanes] = useState<(25 | 50)[]>(ALL_LANES);
  const [onlyOpenNow, setOnlyOpenNow] = useState<boolean>(false);
  const [onlyVisited, setOnlyVisited] = useState<boolean>(false);
  const [onlyFavorite, setOnlyFavorite] = useState<boolean>(false);

  const [sortMode, setSortMode] = useState<SortMode>('distance');
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [isListOpen, setIsListOpen] = useState<boolean>(false);

  // 사용자 위치 및 지도 중심
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(DEFAULT_CENTER);

  // 1. 인증 및 사용자 상호작용 (도장깨기 & 즐겨찾기) 상태
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => getCurrentUser());
  const [interactions, setInteractions] = useState<UserInteractionsMap>({});
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [editingPool, setEditingPool] = useState<SwimmingPool | null>(null);

  // 2. OAuth 리다이렉트 콜백 처리 및 초기 유저 로드
  useEffect(() => {
    handleOAuthCallback().then((oauthUser) => {
      if (oauthUser) {
        setCurrentUser(oauthUser);
      }
    });
  }, []);

  // 3. 유저 변경 시 도장깨기 & 즐겨찾기 상호작용 로드
  useEffect(() => {
    if (currentUser?.id) {
      loadUserInteractions(currentUser.id).then((data) => {
        setInteractions(data);
      });
    } else {
      setInteractions({});
    }
  }, [currentUser]);

  // 4. 전면 DB화된 수영장 데이터 로드 (Supabase 단일 DB)
  const refreshPools = useCallback(async () => {
    try {
      const data = await loadAllPoolsWithDbSync();
      setPools(data);

      const latestUpdate = data.reduce((latest, p) => {
        if (!p.updatedAt) return latest;
        return p.updatedAt > latest ? p.updatedAt : latest;
      }, '2026-11-02');
      setLastUpdateDate(latestUpdate.slice(0, 10));
    } catch (err) {
      console.error('클라우드 DB 수영장 데이터 로드 실패:', err);
    }
  }, []);

  useEffect(() => {
    refreshPools();
  }, [refreshPools]);

  // 5. 현재 위치 조회
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

  // 6. 요일 및 레인 토글 핸들러
  const handleToggleDay = (day: DayTypeOption) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleToggleLane = (lane: 25 | 50) => {
    setSelectedLanes((prev) =>
      prev.includes(lane) ? prev.filter((l) => l !== lane) : [...prev, lane]
    );
  };

  // 7. 즐겨찾기 토글 핸들러
  const handleToggleFavorite = async (poolId: string) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    const updated = await toggleFavoriteInDb(currentUser.id, poolId, interactions);
    setInteractions(updated);
  };

  // 8. 도장깨기(체크인) 토글 핸들러
  const handleToggleCheckIn = async (poolId: string) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    const updated = await toggleCheckInInDb(currentUser.id, poolId, interactions);
    setInteractions(updated);
  };

  // 9. 수영장 정보 DB 수정 및 저장 핸들러
  const handleSavePool = async (updatedPool: SwimmingPool) => {
    const saved = await savePoolToDb(updatedPool, currentUser?.id);
    setPools((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
    if (selectedPool?.id === saved.id) {
      setSelectedPool(saved);
    }
  };

  // 9-1. 잘못된 수영장 클라우드 DB 삭제 핸들러 (is_deleted: true)
  const handleDeletePool = async (poolId: string) => {
    try {
      await deletePoolFromDb(poolId, currentUser?.id);
      setPools((prev) => prev.filter((p) => p.id !== poolId));
      if (selectedPool?.id === poolId) {
        setSelectedPool(null);
      }
      setEditingPool(null);
      alert('수영장이 클라우드 DB에서 정상적으로 삭제되었습니다.');
    } catch (err) {
      console.error('수영장 삭제 실패:', err);
      alert('수영장 삭제 중 오류가 발생했습니다.');
    }
  };

  // 1분마다 실시간 시각 갱신
  const [currentTimeTick, setCurrentTimeTick] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeTick(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const effectiveTargetDate = useMemo(() => {
    const isToday = targetDate.toDateString() === new Date().toDateString();
    if (isToday) {
      return new Date(currentTimeTick);
    }
    return targetDate;
  }, [targetDate, currentTimeTick]);

  // 수영장별 실시간 운영 상태 계산
  const poolStatuses = useMemo(() => {
    const statusMap: Record<string, PoolCurrentStatus> = {};
    const isHoliday = selectedDays.length === 1 && selectedDays[0] === 'holiday';

    pools.forEach((pool) => {
      statusMap[pool.id] = calculatePoolStatus(pool, effectiveTargetDate, isHoliday);
    });

    return statusMap;
  }, [pools, effectiveTargetDate, selectedDays]);

  // 거리 계산
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

  // 검색 및 필터링 적용된 수영장 목록
  const filteredPools = useMemo(() => {
    return pools.filter((pool) => {
      const inter = interactions[pool.id];
      if (onlyVisited && !inter?.isVisited) return false;
      if (onlyFavorite && !inter?.isFavorite) return false;

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

      if (!selectedLanes.includes(pool.laneLength)) {
        return false;
      }

      if (selectedDays.length < 4) {
        if (selectedDays.length === 0) return false;

        let matchesAnyDay = false;
        if (selectedDays.includes('weekday')) {
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

      if (onlyOpenNow) {
        const st = poolStatuses[pool.id];
        if (!st || (st.status !== 'OPEN' && st.status !== 'BREAK')) {
          return false;
        }
      }

      return true;
    });
  }, [
    pools,
    searchQuery,
    selectedLanes,
    selectedDays,
    onlyOpenNow,
    onlyVisited,
    onlyFavorite,
    poolStatuses,
    interactions,
  ]);

  // 검색어 입력 시 첫 번째 수영장 위치로 지도 이동
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
    setSelectedDays(ALL_DAYS);
    setSelectedLanes(ALL_LANES);
    setOnlyOpenNow(false);
    setOnlyVisited(false);
    setOnlyFavorite(false);
    setSelectedPool(null);
  };

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedDays.length !== 4 ||
    selectedLanes.length !== 2 ||
    onlyOpenNow ||
    onlyVisited ||
    onlyFavorite;

  const visitedCount = Object.values(interactions).filter((i) => i.isVisited).length;

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-950">
      {/* 1. 상단 플로팅 검색 & 필터/목록 헤더 */}
      <HeaderSearch
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onToggleFilter={() => setIsFilterOpen(true)}
        onToggleList={() => setIsListOpen(true)}
        hasActiveFilters={hasActiveFilters}
        isListOpen={isListOpen}
      />

      {/* 2. 지도 위 플로팅 컨트롤 (로그인/프로필 버튼 & 내 위치 버튼 항상 노출) */}
      <div className="absolute top-16 right-3 z-30 flex flex-col items-end gap-2 pointer-events-auto">
        {/* 로그인 / 프로필 카드 버튼 */}
        <button
          onClick={() => setIsAuthOpen(true)}
          title={currentUser ? `${currentUser.name} 님의 수영 프로필` : '로그인'}
          className={`flex items-center gap-2 px-3 py-2 rounded-2xl backdrop-blur-md shadow-2xl border active:scale-95 transition-all ${
            currentUser
              ? 'bg-slate-900/95 border-cyan-500/80 text-white'
              : 'bg-slate-900/95 border-cyan-400 text-cyan-300 hover:text-white shadow-cyan-500/20 ring-2 ring-cyan-500/30'
          }`}
        >
          {currentUser?.profile_image ? (
            <img
              src={currentUser.profile_image}
              alt={currentUser.name || '유저'}
              className="w-6 h-6 rounded-full object-cover border border-cyan-400 shrink-0"
            />
          ) : currentUser ? (
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white text-[11px] font-black shrink-0">
              {currentUser.name ? currentUser.name[0] : '🏊'}
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shrink-0">
              <User className="w-3.5 h-3.5 text-cyan-300" />
            </div>
          )}

          <div className="flex flex-col items-start leading-tight">
            <span className="text-xs font-bold text-slate-100 max-w-[90px] truncate">
              {currentUser ? currentUser.name : '로그인'}
            </span>
            {currentUser ? (
              <span className="text-[10px] font-mono text-amber-300 flex items-center gap-0.5">
                <Trophy className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
                방문 {visitedCount}곳
              </span>
            ) : (
              <span className="text-[10px] text-cyan-400/90 font-medium">
                방문 기록 시작
              </span>
            )}
          </div>
        </button>

        {/* 내 위치 원형 버튼 */}
        <button
          onClick={requestCurrentLocation}
          title="내 위치로 이동"
          className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-xl text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 active:scale-95 transition-all"
          aria-label="현재 위치"
        >
          <MapPin className="w-5 h-5" />
        </button>
      </div>

      {/* 3. 카카오 지도 뷰 (도장깨기 & 즐겨찾기 뱃지 포함) */}
      <KakaoMapWrapper
        pools={filteredPools}
        selectedPool={selectedPool}
        onSelectPool={(pool) => setSelectedPool(pool)}
        poolStatuses={poolStatuses}
        center={mapCenter}
        userLocation={userLocation}
        interactions={interactions}
      />

      {/* 4. 수영장 상세 바텀시트 (도장깨기, 즐겨찾기, 정보 수정 버튼) */}
      <PoolDetailDrawer
        pool={selectedPool}
        status={selectedPool ? poolStatuses[selectedPool.id] : undefined}
        targetDate={targetDate}
        onClose={() => setSelectedPool(null)}
        lastUpdate={lastUpdateDate}
        interaction={selectedPool ? interactions[selectedPool.id] : undefined}
        onToggleFavorite={handleToggleFavorite}
        onToggleCheckIn={handleToggleCheckIn}
        onOpenEdit={(pool) => setEditingPool(pool)}
        onDelete={handleDeletePool}
        onRequireLogin={() => setIsAuthOpen(true)}
        isLoggedIn={Boolean(currentUser)}
      />

      {/* 5. 필터 설정 모달 */}
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
        onlyVisited={onlyVisited}
        onToggleOnlyVisited={() => setOnlyVisited(!onlyVisited)}
        onlyFavorite={onlyFavorite}
        onToggleOnlyFavorite={() => setOnlyFavorite(!onlyFavorite)}
      />

      {/* 6. 전체 수영장 리스트 모달 (도장깨기 & 즐겨찾기 전용 탭 지원) */}
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
        interactions={interactions}
      />

      {/* 7. 소셜 로그인 & 사용자 프로필 모달 (ewtguide 스타일) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        onUserChange={setCurrentUser}
        interactions={interactions}
        totalPoolsCount={pools.length}
      />

      {/* 8. 수영장 정보 전면 DB 수정 모달 (위키형 실시간 클라우드 DB 수정) */}
      <PoolEditModal
        isOpen={editingPool !== null}
        onClose={() => setEditingPool(null)}
        pool={editingPool}
        onSave={handleSavePool}
        onDelete={handleDeletePool}
      />

      {/* 9. 화면 하단 오른쪽 데이터 동기화 일자 & 출처 항상 표시 */}
      <div className="fixed bottom-3 right-3 z-30 select-none pointer-events-auto">
        <div className="flex flex-col items-end gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-2xl text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono tracking-tight text-slate-300">
              Last Update: {lastUpdateDate}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1 font-sans">
            <span>Source:</span>
            <a
              href="https://jasumap.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 hover:underline font-semibold inline-flex items-center gap-0.5 transition-colors cursor-pointer"
              title="Jasumap(자수맵) 웹사이트로 이동 (새 창)"
            >
              Jasumap
              <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
