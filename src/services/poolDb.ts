import { SwimmingPool } from '../types/pool';
import { UserInteractionState, UserInteractionsMap } from '../types/auth';
import { getSupabase } from './supabaseClient';

/** Supabase row -> SwimmingPool 도메인 모델 매핑 */
function mapRowToSwimmingPool(row: any): SwimmingPool {
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
    },
    parkingInfo: row.parking_info || undefined,
    etcInfo: row.etc_info || undefined,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    is_deleted: row.is_deleted,
  };
}

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
    amenities: pool.amenities || {},
    parking_info: pool.parkingInfo || null,
    etc_info: pool.etcInfo || null,
    updated_by: userId || null,
    is_deleted: pool.is_deleted ?? false,
    updated_at: new Date().toISOString(),
  };
}

/**
 * 1. 클라우드 DB(Supabase swami_pools)에서 전체 수영장 직접 로드
 * - 로컬 파일이나 로컬 캐시를 거치지 않고 오직 클라우드 중앙 DB에서 직접 조회
 */
export async function loadAllPoolsFromDb(): Promise<SwimmingPool[]> {
  const client = getSupabase();
  const { data, error } = await client
    .from('swimi_pools')
    .select('*')
    .eq('is_deleted', false)
    .order('name', { ascending: true })
    .limit(2000);

  if (error) {
    console.error('Supabase swami_pools 로드 실패:', error.message);
    throw error;
  }

  if (!data || data.length === 0) {
    console.warn('Supabase swami_pools에 수영장 데이터가 없습니다.');
    return [];
  }

  return data.map(mapRowToSwimmingPool);
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
    console.error('Supabase swami_pools 저장 실패:', error.message);
    throw error;
  }

  return data ? mapRowToSwimmingPool(data) : updatedPool;
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
      updated_by: userId || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', poolId);

  if (error) {
    console.error('Supabase swami_pools 삭제(is_deleted) 실패:', error.message);
    throw error;
  }

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
    console.error('Supabase swami_user_interactions 로드 실패:', error.message);
    return {};
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
