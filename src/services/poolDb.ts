import { SwimmingPool } from '../types/pool';
import { UserInteractionState, UserInteractionsMap } from '../types/auth';
import { getSupabase } from './supabaseClient';
import { isDepthOver18m } from '../utils/scheduleCalculator';

/** Supabase row -> SwimmingPool 도메인 모델 매핑 */
function mapRowToSwimmingPool(row: any): SwimmingPool {
  const isOver18 = Boolean(
    row.over18m ||
    row.amenities?.over18m ||
    (row.depth && isDepthOver18m(row.depth))
  );

  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name || undefined,
    address: row.address,
    addressDetail: row.address_detail || undefined,
    city: row.city,
    district: row.district || undefined,
    phone: row.phone || undefined,
    homepage: row.homepage || undefined,
    lat: Number(row.lat),
    lng: Number(row.lng),
    laneLength: row.lane_length as 25 | 50,
    laneCount: row.lane_count ? Number(row.lane_count) : undefined,
    depth: row.depth || undefined,
    over18m: isOver18,
    breakRule: row.break_rule || undefined,
    breakTime: row.break_time || row.schedule_text?.breakTime || undefined,
    weeklySchedule: row.weekly_schedule || {},
    holidaySchedule: row.holiday_schedule || { isOpen: false, sessions: [], hourlySlots: [] },
    closedDaysDescription: row.closed_days_description || undefined,
    closedRules: row.closed_rules || [],
    temporaryClosure: row.schedule_text?.temporaryClosure || undefined,
    scheduleText: row.schedule_text || {},
    fee: row.fee || { standard: { adult: 0 } },
    amenities: {
      dehydrator: Boolean(row.amenities?.dehydrator),
      dryer: Boolean(row.amenities?.dryer),
      soap: Boolean(row.amenities?.soap),
      walkingLane: Boolean(row.amenities?.walkingLane),
      kickboard: Boolean(row.amenities?.kickboard),
      flippers: Boolean(row.amenities?.flippers),
      parking: Boolean(row.amenities?.parking),
      swimShop: Boolean(row.amenities?.swimShop),
      cafe: Boolean(row.amenities?.cafe),
      warmRoom: Boolean(row.amenities?.warmRoom),
      over18m: isOver18,
    },
    parkingInfo: row.parking_info || undefined,
    etcInfo: row.etc_info || undefined,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    is_deleted: row.is_deleted,
  };
}

const isValidUuid = (id?: string): boolean =>
  Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

/** SwimmingPool 도메인 모델 -> Supabase upsert 레코드 매핑 */
function mapPoolToDbRow(pool: SwimmingPool, userId?: string): Record<string, any> {
  return {
    id: pool.id,
    name: pool.name,
    short_name: pool.shortName || null,
    address: pool.address,
    address_detail: pool.addressDetail || null,
    city: pool.city,
    district: pool.district || null,
    phone: pool.phone || null,
    homepage: pool.homepage || null,
    lat: pool.lat,
    lng: pool.lng,
    lane_length: pool.laneLength,
    lane_count: pool.laneCount || null,
    depth: pool.depth || null,
    break_rule: pool.breakRule || null,
    weekly_schedule: pool.weeklySchedule || {},
    holiday_schedule: pool.holidaySchedule || {},
    closed_days_description: pool.closedDaysDescription || null,
    closed_rules: pool.closedRules || [],
    schedule_text: {
      ...(pool.scheduleText || {}),
      temporaryClosure: pool.temporaryClosure || null,
      breakTime: pool.breakTime || pool.scheduleText?.breakTime || null,
    },
    fee: pool.fee || {},
    amenities: {
      ...(pool.amenities || {}),
      over18m: Boolean(
        pool.over18m !== undefined
          ? pool.over18m
          : (pool.amenities?.over18m !== undefined
              ? pool.amenities.over18m
              : (pool.depth && isDepthOver18m(pool.depth)))
      ),
    },
    parking_info: pool.parkingInfo || null,
    etc_info: pool.etcInfo || null,
    updated_by: isValidUuid(userId) ? userId : null,
    is_deleted: pool.is_deleted ?? false,
    updated_at: new Date().toISOString(),
  };
}

const SWIMI_POOLS_CACHE_KEY = 'swimi_pools_cache_v1';
const SWIMI_POOLS_CACHE_TS_KEY = 'swimi_pools_cache_ts_v1';
const SWIMI_POOLS_CURSOR_KEY = 'swimi_pools_cursor_v1';
const SWIMI_CACHE_TTL_MS = 30 * 60 * 1000; // 30분 로컬 캐시

function readCachedPools(): { pools: SwimmingPool[]; cachedAt: number; cursor: string | null } | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(SWIMI_POOLS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SwimmingPool[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const cachedAt = Number(window.localStorage.getItem(SWIMI_POOLS_CACHE_TS_KEY) || '0');
    const cursor = window.localStorage.getItem(SWIMI_POOLS_CURSOR_KEY);
    return { pools: parsed, cachedAt, cursor };
  } catch {
    return null;
  }
}

function writeCachedPools(pools: SwimmingPool[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    let maxUpdatedAt = '';
    for (const p of pools) {
      if (p.updatedAt && p.updatedAt > maxUpdatedAt) {
        maxUpdatedAt = p.updatedAt;
      }
    }
    window.localStorage.setItem(SWIMI_POOLS_CACHE_KEY, JSON.stringify(pools));
    window.localStorage.setItem(SWIMI_POOLS_CACHE_TS_KEY, String(Date.now()));
    if (maxUpdatedAt) {
      window.localStorage.setItem(SWIMI_POOLS_CURSOR_KEY, maxUpdatedAt);
    }
  } catch {
    // localStorage 용량 초과 시 무시
  }
}

function upsertCachedPool(pool: SwimmingPool): void {
  const cached = readCachedPools();
  if (!cached) return;
  const idx = cached.pools.findIndex((p) => p.id === pool.id);
  const next = idx >= 0
    ? cached.pools.map((p, i) => (i === idx ? pool : p))
    : [...cached.pools, pool].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  writeCachedPools(next);
}

function removeCachedPool(poolId: string): void {
  const cached = readCachedPools();
  if (!cached) return;
  writeCachedPools(cached.pools.filter((p) => p.id !== poolId));
}

/**
 * 1. 수영장 데이터 로드 (L1 localStorage 캐시 -> Vercel Edge CDN /api/pools -> Supabase 폴백)
 * - 재방문(30분 이내) 시 네트워크 요청 0회
 * - 30분 경과 시 updated_at 델타 동기화 또는 Vercel Edge CDN(s-maxage=3600) 경유로 Supabase Egress 최소화
 */
export async function loadAllPoolsFromDb(forceRefresh = false): Promise<SwimmingPool[]> {
  const cached = readCachedPools();
  const now = Date.now();

  if (!forceRefresh && cached && now - cached.cachedAt < SWIMI_CACHE_TTL_MS) {
    return cached.pools;
  }

  // 델타 동기화 시도 (로컬 캐시 + 커서가 있는 경우)
  if (!forceRefresh && cached && cached.cursor) {
    try {
      const deltaRes = await fetch(`/api/pools?since=${encodeURIComponent(cached.cursor)}`);
      if (deltaRes.ok) {
        const deltaRows = (await deltaRes.json()) as Record<string, any>[];
        if (Array.isArray(deltaRows)) {
          if (deltaRows.length === 0) {
            window.localStorage.setItem(SWIMI_POOLS_CACHE_TS_KEY, String(now));
            return cached.pools;
          }
          const byId = new Map<string, SwimmingPool>(cached.pools.map((p) => [p.id, p]));
          let maxUpdated = cached.cursor;
          for (const row of deltaRows) {
            if (row.updated_at && row.updated_at > maxUpdated) {
              maxUpdated = row.updated_at;
            }
            if (row.is_deleted) {
              byId.delete(row.id);
            } else {
              byId.set(row.id, mapRowToSwimmingPool(row));
            }
          }
          const merged = Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
          writeCachedPools(merged);
          if (maxUpdated) {
            window.localStorage.setItem(SWIMI_POOLS_CURSOR_KEY, maxUpdated);
          }
          return merged;
        }
      }
    } catch {
      // Edge 델타 실패 시 전체 캐시 API로 폴백
    }
  }

  // Vercel Edge CDN 프록시(/api/pools) 우선 조회
  try {
    const apiUrl = forceRefresh ? '/api/pools?bust=1' : '/api/pools';
    const res = await fetch(apiUrl);
    if (res.ok) {
      const rows = (await res.json()) as Record<string, any>[];
      if (Array.isArray(rows) && rows.length > 0) {
        const mapped = rows.map(mapRowToSwimmingPool);
        writeCachedPools(mapped);
        return mapped;
      }
    }
  } catch {
    // 로컬 vite dev 등 /api/pools 미지원 환경에서는 Supabase 직접 조회로 폴백
  }

  const client = getSupabase();
  const { data, error } = await client
    .from('swimi_pools')
    .select('*')
    .eq('is_deleted', false)
    .order('name', { ascending: true })
    .limit(2000);

  if (error) {
    console.error('Supabase swimi_pools 로드 실패:', error.message);
    if (cached) return cached.pools;
    throw error;
  }

  if (!data || data.length === 0) {
    console.warn('Supabase swimi_pools에 수영장 데이터가 없습니다.');
    return [];
  }

  const mapped = data.map(mapRowToSwimmingPool);
  writeCachedPools(mapped);
  return mapped;
}

// 하위 호환 별칭
export const loadAllPoolsWithDbSync = loadAllPoolsFromDb;

/**
 * 2. 수영장 정보 수정 내용 중앙 클라우드 DB(Supabase)에 직접 저장
 */
export async function savePoolToDb(
  pool: SwimmingPool,
  userId?: string
): Promise<SwimmingPool> {
  const updatedPool: SwimmingPool = {
    ...pool,
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  };

  const client = getSupabase();
  const row = mapPoolToDbRow(updatedPool, userId);
  const { data, error } = await client
    .from('swimi_pools')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('Supabase swimi_pools 저장 실패:', error.message);
    throw error;
  }

  const saved = data ? mapRowToSwimmingPool(data) : updatedPool;
  upsertCachedPool(saved);
  return saved;
}

/**
 * 2-1. 수영장 클라우드 DB 삭제 처리 (소프트 딜리트 is_deleted: true)
 */
export async function deletePoolFromDb(poolId: string, userId?: string): Promise<boolean> {
  const client = getSupabase();
  const { error } = await client
    .from('swimi_pools')
    .update({
      is_deleted: true,
      updated_by: isValidUuid(userId) ? userId : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', poolId);

  if (error) {
    console.error('Supabase swimi_pools 삭제(is_deleted) 실패:', error.message);
    throw error;
  }

  removeCachedPool(poolId);
  return true;
}

/**
 * 3. 사용자별 전체 도장깨기(체크인) & 즐겨찾기 상태 클라우드 DB에서 직접 로드
 */
export async function loadUserInteractions(userId: string): Promise<UserInteractionsMap> {
  const client = getSupabase();
  const { data, error } = await client
    .from('swimi_user_interactions')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Supabase swimi_user_interactions 로드 실패:', error.message);
    throw error;
  }

  const interactionsMap: UserInteractionsMap = {};
  if (data) {
    data.forEach((row) => {
      interactionsMap[row.pool_id] = {
        isFavorite: Boolean(row.is_favorite),
        isVisited: Boolean(row.is_visited),
        visitedAt: row.visited_at,
        visitCount: row.visit_count || (row.is_visited ? 1 : 0),
        memo: row.memo || null,
      };
    });
  }

  return interactionsMap;
}

/**
 * 4. 즐겨찾기 (내가 가고 싶은 곳) 토글 (클라우드 DB에 직접 저장)
 */
export async function toggleFavoriteInDb(
  userId: string,
  poolId: string,
  currentInteractions: UserInteractionsMap
): Promise<UserInteractionsMap> {
  const current = currentInteractions[poolId] || {
    isFavorite: false,
    isVisited: false,
    visitCount: 0,
    visitedAt: null,
    memo: null,
  };

  const nextFavorite = !current.isFavorite;
  const updatedState: UserInteractionState = {
    ...current,
    isFavorite: nextFavorite,
  };

  const newMap: UserInteractionsMap = {
    ...currentInteractions,
    [poolId]: updatedState,
  };

  const client = getSupabase();
  const now = new Date().toISOString();
  const { error } = await client.from('swimi_user_interactions').upsert(
    {
      user_id: userId,
      pool_id: poolId,
      is_favorite: nextFavorite,
      is_visited: updatedState.isVisited,
      visited_at: updatedState.visitedAt,
      visit_count: updatedState.visitCount,
      memo: updatedState.memo,
      updated_at: now,
    },
    { onConflict: 'user_id,pool_id' }
  );

  if (error) {
    console.error('Supabase 즐겨찾기 저장 실패:', error.message);
    throw error;
  }

  return newMap;
}

/**
 * 5. 체크인 / 도장깨기 (내가 방문한 적이 있음) 토글 (클라우드 DB에 직접 저장)
 */
export async function toggleCheckInInDb(
  userId: string,
  poolId: string,
  currentInteractions: UserInteractionsMap,
  customMemo?: string
): Promise<UserInteractionsMap> {
  const current = currentInteractions[poolId] || {
    isFavorite: false,
    isVisited: false,
    visitCount: 0,
    visitedAt: null,
    memo: null,
  };

  const now = new Date().toISOString();
  const nextVisited = !current.isVisited;
  const nextCount = nextVisited ? (current.visitCount || 0) + 1 : current.visitCount;
  const nextVisitedAt = nextVisited ? (current.visitedAt || now) : current.visitedAt;

  const updatedState: UserInteractionState = {
    ...current,
    isVisited: nextVisited,
    visitCount: nextCount,
    visitedAt: nextVisitedAt,
    memo: customMemo !== undefined ? customMemo : current.memo,
  };

  const newMap: UserInteractionsMap = {
    ...currentInteractions,
    [poolId]: updatedState,
  };

  const client = getSupabase();
  const { error } = await client.from('swimi_user_interactions').upsert(
    {
      user_id: userId,
      pool_id: poolId,
      is_favorite: updatedState.isFavorite,
      is_visited: nextVisited,
      visited_at: nextVisitedAt,
      visit_count: nextCount,
      memo: updatedState.memo,
      updated_at: now,
    },
    { onConflict: 'user_id,pool_id' }
  );

  if (error) {
    console.error('Supabase 체크인(도장깨기) 저장 실패:', error.message);
    throw error;
  }

  return newMap;
}
