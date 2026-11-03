import React, { useEffect, useRef, useState } from 'react';
import { Map, CustomOverlayMap, useKakaoLoader } from 'react-kakao-maps-sdk';
import { SwimmingPool, PoolCurrentStatus } from '../types/pool';
import { UserInteractionsMap } from '../types/auth';

interface KakaoMapWrapperProps {
  pools: SwimmingPool[];
  selectedPool: SwimmingPool | null;
  onSelectPool: (pool: SwimmingPool) => void;
  poolStatuses: Record<string, PoolCurrentStatus>;
  center: { lat: number; lng: number };
  level?: number;
  userLocation: { lat: number; lng: number } | null;
  interactions?: UserInteractionsMap;
}

const KAKAO_KEY = import.meta.env.VITE_KAKAO_MAP_API_KEY || '61ebf0b7a0daf24cba357d92677c8d8a';

export const KakaoMapWrapper: React.FC<KakaoMapWrapperProps> = ({
  pools,
  selectedPool,
  onSelectPool,
  poolStatuses,
  center,
  level = 7,
  userLocation,
  interactions = {},
}) => {
  const [loading, error] = useKakaoLoader({
    appkey: KAKAO_KEY,
    libraries: ['services', 'clusterer'],
  });

  const mapRef = useRef<kakao.maps.Map | null>(null);
  const [mapCenter, setMapCenter] = useState(center);
  const [mapLevel, setMapLevel] = useState(level);
  const [currentZoomLevel, setCurrentZoomLevel] = useState<number>(level);

  // 외부 center prop 변경 시 지도 부드럽게 이동
  useEffect(() => {
    setMapCenter(center);
    if (mapRef.current && (window as any).kakao?.maps?.LatLng) {
      const moveLatLng = new (window as any).kakao.maps.LatLng(center.lat, center.lng);
      mapRef.current.panTo(moveLatLng);
    }
  }, [center]);

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-300 p-6 text-center">
        <p className="text-red-400 font-bold mb-2">카카오맵 로드 중 오류가 발생했습니다.</p>
        <p className="text-xs text-slate-400">카카오 개발자 콘솔의 사이트 도메인 등록 상태를 확인해 주세요.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-300">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-400">자유수영장 지도 불러오는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <Map
        center={mapCenter}
        level={mapLevel}
        onCreate={(map) => {
          mapRef.current = map;
          setCurrentZoomLevel(map.getLevel());
        }}
        onZoomChanged={(map) => {
          setCurrentZoomLevel(map.getLevel());
        }}
        className="w-full h-full"
        isPanto={true}
      >
        {/* 사용자 현재 위치 마커 (모던 펄스 링 & 아쿠아 블루 글래스) */}
        {userLocation && (
          <CustomOverlayMap
            position={{ lat: userLocation.lat, lng: userLocation.lng }}
            yAnchor={0.5}
            xAnchor={0.5}
          >
            <div className="relative flex items-center justify-center pointer-events-none">
              <span className="animate-ping absolute inline-flex h-7 w-7 rounded-full bg-cyan-400 opacity-40" />
              <div className="relative inline-flex rounded-full h-4 w-4 bg-gradient-to-tr from-cyan-400 to-blue-500 ring-2 ring-cyan-300/60 border border-white shadow-lg shadow-cyan-500/50" />
            </div>
          </CustomOverlayMap>
        )}

        {/* 수영장 원형 숫자 마커 오버레이 */}
        {pools.map((pool) => {
          const status = poolStatuses[pool.id];
          const isSelected = selectedPool?.id === pool.id;
          const is50m = pool.laneLength === 50;

          // 도장깨기 & 즐겨찾기 상태
          const interaction = interactions[pool.id];
          const isVisited = Boolean(interaction?.isVisited);
          const isFavorite = Boolean(interaction?.isFavorite);

          // 오늘 운영중(OPEN 또는 BREAK) 여부 판정
          const isOpen = status?.status === 'OPEN';
          const isBreak = status?.status === 'BREAK';
          const isTempClosed = status?.status === 'TEMP_CLOSED' || Boolean(pool.temporaryClosure?.isClosed);
          const isOperational = isOpen || isBreak;

          // 모던 색상 시스템 (촌스러운 단색 녹색/흰 테두리 전면 탈피)
          let markerBgColor = 'bg-slate-800/95 text-slate-400 border border-slate-600/60 shadow-sm';
          let tailColor = 'border-t-slate-800';

          if (isTempClosed) {
            // 임시 휴관: 모던 네온 로즈/크림슨
            markerBgColor = 'bg-gradient-to-b from-rose-500 to-red-600 text-white border border-rose-200/70 shadow-lg shadow-rose-950/50';
            tailColor = 'border-t-red-600';
          } else if (isOpen) {
            if (is50m) {
              // 50m 정규 레인: 프리미엄 앰버 골드/탠저린 오렌지
              markerBgColor = 'bg-gradient-to-b from-amber-400 to-orange-500 text-slate-950 font-black border border-amber-200/80 shadow-lg shadow-amber-950/50';
              tailColor = 'border-t-orange-500';
            } else {
              // 25m 레인: 청량하고 세련된 모던 오션 틸 / 시안
              markerBgColor = 'bg-gradient-to-b from-cyan-500 to-teal-600 text-white font-black border border-cyan-200/70 shadow-lg shadow-cyan-950/50';
              tailColor = 'border-t-teal-600';
            }
          } else if (isBreak) {
            // 휴식 시간: 모던 인디고 / 바이올렛
            markerBgColor = 'bg-gradient-to-b from-indigo-500 to-purple-600 text-white border border-indigo-200/60 shadow-lg shadow-purple-950/50';
            tailColor = 'border-t-purple-600';
          }

          // 줌 레벨 스케일 연동 (4km까지는 수영장 명칭 표시, level 9 = 4km)
          // 선택된 수영장은 줌 레벨과 상관없이 항상 표시
          const shouldShowName = isSelected || currentZoomLevel <= 9;

          return (
            <CustomOverlayMap
              key={pool.id}
              position={{ lat: pool.lat, lng: pool.lng }}
              yAnchor={1.15}
              xAnchor={0.5}
            >
              <div
                onClick={() => onSelectPool(pool)}
                className="flex flex-col items-center cursor-pointer group transition-transform active:scale-90"
              >
                {/* 메인 마커 원형 */}
                <div className="relative">
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-black text-xs sm:text-[13px] tracking-tighter transition-all ${markerBgColor} ${
                      isSelected ? 'ring-4 ring-cyan-400 scale-125 z-40' : 'hover:scale-110'
                    }`}
                  >
                    {pool.laneLength}
                  </div>

                  {/* 방문 완료 뱃지 (트로피) */}
                  {isVisited && (
                    <div
                      title="방문 완료"
                      className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[9px] shadow-md border border-slate-950 z-10 animate-bounce"
                    >
                      🏆
                    </div>
                  )}

                  {/* 즐겨찾기 뱃지 (별표) */}
                  {isFavorite && !isVisited && (
                    <div
                      title="즐겨찾기 보관됨"
                      className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center text-[9px] font-bold shadow-md border border-slate-950 z-10"
                    >
                      ★
                    </div>
                  )}
                </div>

                {/* 마커 꼬리 팁 */}
                <div className={`w-0 h-0 border-x-4 border-x-transparent border-t-5 -mt-0.5 ${tailColor}`} />

                {/* 수영장 명칭 라벨 (그림자 없음, 1pt 상향 text-[13px], 배경 opacity 50% 투명) */}
                {shouldShowName && (
                  <div
                    className={`mt-1 px-2.5 py-0.5 rounded-lg text-[13px] font-bold tracking-tight whitespace-nowrap transition-all flex items-center gap-1.5 backdrop-blur-[2px] ${
                      isSelected
                        ? 'bg-cyan-500/80 text-slate-950 font-black border border-cyan-300 ring-2 ring-cyan-400/40'
                        : isTempClosed
                        ? 'bg-slate-950/50 text-rose-300 border border-rose-500/60 font-black'
                        : isVisited
                        ? 'bg-slate-950/50 text-amber-300 border border-amber-500/60'
                        : isOperational
                        ? 'bg-slate-950/50 text-white border border-slate-700/50'
                        : 'bg-slate-950/50 text-slate-300 border border-slate-800/50'
                    }`}
                  >
                    {isVisited && <span className="text-[11px]">🏊</span>}
                    {isFavorite && !isVisited && <span className="text-[11px] text-cyan-400">★</span>}
                    {isTempClosed && <span className="text-[11px] text-rose-400">⚠️</span>}
                    {(pool.shortName || pool.name).replace(/\s*\((?:25m|50m)\)/gi, '').trim()}
                    {isTempClosed && <span className="text-[11.5px] text-rose-400 font-black">(휴관)</span>}
                  </div>
                )}
              </div>
            </CustomOverlayMap>
          );
        })}
      </Map>
    </div>
  );
};
