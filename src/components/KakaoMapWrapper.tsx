import React, { useEffect, useRef, useState } from 'react';
import { Map, CustomOverlayMap, useKakaoLoader } from 'react-kakao-maps-sdk';
import { SwimmingPool, PoolCurrentStatus } from '../types/pool';

interface KakaoMapWrapperProps {
  pools: SwimmingPool[];
  selectedPool: SwimmingPool | null;
  onSelectPool: (pool: SwimmingPool) => void;
  poolStatuses: Record<string, PoolCurrentStatus>;
  center: { lat: number; lng: number };
  level?: number;
  userLocation: { lat: number; lng: number } | null;
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
}) => {
  const [loading, error] = useKakaoLoader({
    appkey: KAKAO_KEY,
    libraries: ['services', 'clusterer'],
  });

  const mapRef = useRef<kakao.maps.Map | null>(null);
  const [mapCenter, setMapCenter] = useState(center);
  const [mapLevel, setMapLevel] = useState(level);

  // 외부 center prop 변경 시 지도 이동
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
        }}
        className="w-full h-full"
        isPanto={true}
      >
        {/* 사용자 현재 위치 마커 */}
        {userLocation && (
          <CustomOverlayMap
            position={{ lat: userLocation.lat, lng: userLocation.lng }}
            yAnchor={0.5}
            xAnchor={0.5}
          >
            <div className="relative flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-cyan-400 opacity-60" />
              <div className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500 border-2 border-white shadow-lg" />
            </div>
          </CustomOverlayMap>
        )}

        {/* 수영장 커스텀 마커 오버레이들 */}
        {pools.map((pool) => {
          const status = poolStatuses[pool.id];
          const isSelected = selectedPool?.id === pool.id;
          const is50m = pool.laneLength === 50;

          // 오늘 운영중(OPEN 또는 BREAK) 여부 판정
          const isOperational = status && (status.status === 'OPEN' || status.status === 'BREAK');

          // 색상 결정:
          // 운영중: 초록색(25m) 또는 금색/에메랄드(50m)
          // 미운영: 회색
          const markerBgColor = isOperational
            ? is50m
              ? 'bg-amber-500 text-slate-950 border-amber-300'
              : 'bg-emerald-500 text-slate-950 border-emerald-300'
            : 'bg-slate-600 text-slate-300 border-slate-500';

          return (
            <CustomOverlayMap
              key={pool.id}
              position={{ lat: pool.lat, lng: pool.lng }}
              yAnchor={1.1}
              xAnchor={0.5}
            >
              <div
                onClick={() => onSelectPool(pool)}
                className="flex flex-col items-center cursor-pointer group transition-transform active:scale-95"
              >
                {/* 마커 뱃지 (25m vs 50m 규격 표시) */}
                <div
                  className={`px-2.5 py-1 rounded-full font-black text-[11px] shadow-xl border flex items-center gap-1 transition-all ${markerBgColor} ${
                    isSelected ? 'ring-4 ring-cyan-400 scale-110 z-30' : 'hover:scale-105'
                  }`}
                >
                  {/* 물결 아이콘 표시 */}
                  <span>{is50m ? '🏊 50m' : '🏊 25m'}</span>
                </div>

                {/* 말풍선 꼬리 */}
                <div
                  className={`w-0 h-0 border-x-4 border-x-transparent border-t-6 -mt-0.5 ${
                    isOperational
                      ? is50m
                        ? 'border-t-amber-500'
                        : 'border-t-emerald-500'
                      : 'border-t-slate-600'
                  }`}
                />

                {/* 수영장 명칭 라벨 (길이 접미사 없이 표시) */}
                {(isOperational || isSelected) && (
                  <div
                    className={`mt-1 px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-md border whitespace-nowrap backdrop-blur-md transition-all ${
                      isSelected
                        ? 'bg-cyan-900/95 text-cyan-200 border-cyan-400 font-extrabold shadow-cyan-900/50'
                        : 'bg-slate-900/90 text-slate-200 border-slate-700/80'
                    }`}
                  >
                    {(pool.shortName || pool.name).replace(/\s*\((?:25m|50m)\)/gi, '').trim()}
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
