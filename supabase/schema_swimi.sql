-- ==============================================================================
-- 수영장 지도 (swimi) 통합 클라우드 DB 스키마
-- 테이블: public.user_accounts (소셜 OAuth2 계정 및 로그인 세션 공유)
-- 테이블: public.swimi_pools (전면 DB화된 전국 수영장 정보 및 실시간 수정 공유)
-- 테이블: public.swimi_user_interactions (사용자별 도장깨기/체크인 및 즐겨찾기)
-- ==============================================================================

-- 1. 회원 계정 및 소셜 OAuth2 토큰 보전 테이블 (ewtguide와 호환 및 공유)
CREATE TABLE IF NOT EXISTS public.user_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(20) NOT NULL,                        -- 'google' | 'kakao' | 'naver'
    provider_user_id VARCHAR(100) NOT NULL,              -- 소셜 고유 식별자 ID
    email VARCHAR(200),                                   -- 사용자 이메일
    name VARCHAR(100),                                    -- 이름/닉네임
    profile_image TEXT,                                   -- 프로필 사진 URL
    access_token TEXT,                                    -- OAuth2 Access Token
    refresh_token TEXT,                                   -- OAuth2 Refresh Token
    token_expires_at TIMESTAMP WITH TIME ZONE,            -- 토큰 만료 일시
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),    -- 가입 신청 일시
    last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- 최종 로그인 일시
    UNIQUE(provider, provider_user_id)
);

-- 2. 전국 수영장 전면 DB화 테이블
CREATE TABLE IF NOT EXISTS public.swimi_pools (
    id VARCHAR(100) PRIMARY KEY,                         -- 수영장 고유 ID (예: 'hwaseong-sports-complex-50m')
    name VARCHAR(200) NOT NULL,                         -- 수영장 정식 명칭
    short_name VARCHAR(100),                            -- 약칭/축약 명칭
    address TEXT NOT NULL,                              -- 도로명/지번 기본 주소
    address_detail TEXT,                                -- 상세 주소 (동, 층, 호 등)
    city VARCHAR(100),                                  -- 시/도
    district VARCHAR(100),                              -- 구/군/읍/면
    phone VARCHAR(50),                                  -- 대표 전화번호
    homepage TEXT,                                      -- 공식 웹사이트 URL
    lat DOUBLE PRECISION NOT NULL,                      -- 위도
    lng DOUBLE PRECISION NOT NULL,                      -- 경도
    lane_length INTEGER NOT NULL DEFAULT 25,            -- 레인 규격 (25 또는 50)
    lane_count INTEGER,                                 -- 레인 수
    depth VARCHAR(100),                                 -- 수심 (예: '1.2m ~ 1.5m')
    break_rule VARCHAR(50),                             -- '50_10' | 'continuous'
    weekly_schedule JSONB NOT NULL DEFAULT '{}'::jsonb, -- 0~6 요일별 개장 여부 및 시간표
    holiday_schedule JSONB NOT NULL DEFAULT '{}'::jsonb,-- 공휴일 스케줄
    closed_days_description TEXT,                       -- 정기 휴관일 안내 문구
    closed_rules JSONB NOT NULL DEFAULT '[]'::jsonb,    -- 휴관 판정 규칙
    schedule_text JSONB NOT NULL DEFAULT '{}'::jsonb,   -- 평일/토/일/공휴일 운영시간 텍스트
    fee JSONB NOT NULL DEFAULT '{}'::jsonb,             -- 요금 안내 (성인, 청소년, 어린이 등)
    amenities JSONB NOT NULL DEFAULT '{}'::jsonb,       -- 편의시설 7종 (탈수기, 드라이어, 비누, 걷기레인, 킥판, 오리발, 주차장)
    parking_info TEXT,                                  -- 주차장 상세 정보
    etc_info TEXT,                                      -- 기타 특이사항 및 안내
    updated_by UUID REFERENCES public.user_accounts(id) ON DELETE SET NULL, -- 최종 수정한 사용자
    is_deleted BOOLEAN DEFAULT false,                   -- 폐업/삭제 여부
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),  -- 등록 일시
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()   -- 최종 수정 일시
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_swimi_pools_city_district 
ON public.swimi_pools (city, district, is_deleted);

CREATE INDEX IF NOT EXISTS idx_swimi_pools_coords 
ON public.swimi_pools (lat, lng);

-- 3. 사용자별 도장깨기(체크인) 및 즐겨찾기(가고 싶은 곳) 테이블
CREATE TABLE IF NOT EXISTS public.swimi_user_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_accounts(id) ON DELETE CASCADE,
    pool_id VARCHAR(100) NOT NULL REFERENCES public.swimi_pools(id) ON DELETE CASCADE,
    is_favorite BOOLEAN DEFAULT false,                  -- 즐겨찾기 여부 (내가 가고 싶은 곳)
    is_visited BOOLEAN DEFAULT false,                   -- 체크인/도장깨기 여부 (내가 방문한 적이 있음)
    visited_at TIMESTAMP WITH TIME ZONE,                -- 최초 또는 최근 방문일시
    visit_count INTEGER DEFAULT 0,                      -- 방문 횟수
    memo TEXT,                                          -- 나만의 수영장 메모 / 방문 후기
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, pool_id)
);

CREATE INDEX IF NOT EXISTS idx_swimi_user_interactions_user 
ON public.swimi_user_interactions (user_id);

CREATE INDEX IF NOT EXISTS idx_swimi_user_interactions_pool 
ON public.swimi_user_interactions (pool_id);

-- Row Level Security (RLS) 활성화
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swimi_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swimi_user_interactions ENABLE ROW LEVEL SECURITY;

-- RLS 정책: user_accounts 읽기/쓰기 허용 (OAuth 가입/로그인 동기화)
DROP POLICY IF EXISTS "Allow public all on user_accounts" ON public.user_accounts;
CREATE POLICY "Allow public all on user_accounts" 
ON public.user_accounts 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- RLS 정책: swimi_pools 읽기/쓰기 전체 허용 (위키형 수영장 정보 공유 및 전면 DB화)
DROP POLICY IF EXISTS "Allow public all access on swimi_pools" ON public.swimi_pools;
CREATE POLICY "Allow public all access on swimi_pools" 
ON public.swimi_pools 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- RLS 정책: swimi_user_interactions 읽기/쓰기 전체 허용
DROP POLICY IF EXISTS "Allow public all access on swimi_user_interactions" ON public.swimi_user_interactions;
CREATE POLICY "Allow public all access on swimi_user_interactions" 
ON public.swimi_user_interactions 
FOR ALL 
USING (true) 
WITH CHECK (true);
