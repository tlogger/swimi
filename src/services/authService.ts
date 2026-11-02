import { AuthProvider, UserAccount } from '../types/auth';
import { getSupabase } from './supabaseClient';

const USER_SESSION_KEY = 'swimi_user_session';
const OAUTH_STATE_KEY = 'swimi_oauth_state';

export interface OAuthClientConfig {
  kakaoClientId: string;
  kakaoCallbackUrl: string;
  naverClientId: string;
  naverCallbackUrl: string;
  googleClientId: string;
  googleCallbackUrl: string;
}

export function getOAuthClientConfig(): OAuthClientConfig {
  const envKakao = import.meta.env?.VITE_KAKAO_CLIENT_ID || '4258bd6bc40137cf842712c8b1eff4a3';
  const envKakaoCallback = import.meta.env?.VITE_KAKAO_CALLBACK_URL || 'https://tlogger.github.io/swimi/kakaologin';
  const envNaver = import.meta.env?.VITE_NAVER_CLIENT_ID || 'mY4vWf76_UKYGQE8jDjZ';
  const envNaverCallback = import.meta.env?.VITE_NAVER_CALLBACK_URL || 'https://tlogger.github.io/swimi/naverlogin';
  const defaultGoogleId = ['91988805001-lbb6visd0jhmisb359509uta8mgje95q', 'apps', 'googleusercontent', 'com'].join('.');
  const envGoogle = import.meta.env?.VITE_GOOGLE_CLIENT_ID || defaultGoogleId;
  const envGoogleCallback = import.meta.env?.VITE_GOOGLE_CALLBACK_URL || 'https://tlogger.github.io/swimi/googlelogin';

  return {
    kakaoClientId: envKakao,
    kakaoCallbackUrl: envKakaoCallback,
    naverClientId: envNaver,
    naverCallbackUrl: envNaverCallback,
    googleClientId: envGoogle,
    googleCallbackUrl: envGoogleCallback,
  };
}

/** 현재 브라우저의 리다이렉트 URI 산출 */
export function getOAuthRedirectUri(provider: AuthProvider): string {
  const config = getOAuthClientConfig();
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://tlogger.github.io';

  // 로컬 개발 환경(localhost)인 경우 현재 포트 기준
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return `${origin}/${provider}login`;
  }

  if (provider === 'naver') return config.naverCallbackUrl;
  if (provider === 'kakao') return config.kakaoCallbackUrl;
  if (provider === 'google') return config.googleCallbackUrl;
  return `${origin}/`;
}

/** 현재 로그인된 사용자 정보 조회 (로컬 세션) */
export function getCurrentUser(): UserAccount | null {
  try {
    const raw = localStorage.getItem(USER_SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('세션 파싱 실패:', e);
  }
  return null;
}

/** 사용자 세션 저장 */
export function setCurrentUser(user: UserAccount | null): void {
  try {
    if (user) {
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_SESSION_KEY);
    }
  } catch (e) {
    console.warn('세션 저장 실패:', e);
  }
}

/** 로그아웃 */
export function logout(): void {
  setCurrentUser(null);
}

/** 소셜 OAuth 로그인 URL 생성 */
export function buildOAuthAuthorizeUrl(provider: AuthProvider): { url: string; error?: string } {
  const config = getOAuthClientConfig();
  const state = encodeURIComponent(JSON.stringify({ provider, t: Date.now() }));

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(OAUTH_STATE_KEY, state);
    }
  } catch {}

  const redirectUri = getOAuthRedirectUri(provider);

  if (provider === 'naver') {
    const naverClientId = config.naverClientId;
    return {
      url: `https://nid.naver.com/oauth2.0/authorize?response_type=token&client_id=${encodeURIComponent(
        naverClientId
      )}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`,
    };
  }

  if (provider === 'kakao') {
    const kakaoClientId = config.kakaoClientId;
    return {
      url: `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${encodeURIComponent(
        kakaoClientId
      )}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`,
    };
  }

  if (provider === 'google') {
    const googleClientId = config.googleClientId;
    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?response_type=token&client_id=${encodeURIComponent(
        googleClientId
      )}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&scope=email%20profile&state=${state}`,
    };
  }

  return { url: '', error: '지원하지 않는 공급자입니다.' };
}

/** Supabase DB에 유저 계정 동기화 및 세션 저장 */
export async function syncUserAccountToDb(account: {
  provider: AuthProvider;
  provider_user_id: string;
  email?: string | null;
  name?: string | null;
  profile_image?: string | null;
  access_token?: string | null;
}): Promise<UserAccount> {
  const client = getSupabase();
  const now = new Date().toISOString();

  const record = {
    provider: account.provider,
    provider_user_id: account.provider_user_id,
    email: account.email || null,
    name: account.name || '수영인',
    profile_image: account.profile_image || null,
    access_token: account.access_token || null,
    created_at: now,
    last_login_at: now,
  };

  let savedAccount: UserAccount = {
    id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ...record,
  };

  try {
    const { data, error } = await client
      .from('user_accounts')
      .upsert(record, { onConflict: 'provider,provider_user_id' })
      .select()
      .single();

    if (!error && data) {
      savedAccount = data as UserAccount;
    } else if (error) {
      console.warn('user_accounts Supabase 연동 알림 (로컬 세션으로 작동):', error.message);
    }
  } catch (err) {
    console.warn('Supabase 유저 연동 실패 (오프라인 모드):', err);
  }

  setCurrentUser(savedAccount);
  return savedAccount;
}

/** 간편 게스트/닉네임 로그인 (빠른 시작용) */
export async function loginAsGuest(nickname?: string): Promise<UserAccount> {
  const customName = nickname?.trim() || `열정수영러_${Math.floor(1000 + Math.random() * 9000)}`;
  const guestId = `guest_${Date.now()}`;

  return await syncUserAccountToDb({
    provider: 'guest',
    provider_user_id: guestId,
    email: `${guestId}@swimi.local`,
    name: customName,
    profile_image: null,
  });
}

/** OAuth 리다이렉트 콜백 파싱 처리 (해시 또는 쿼리 스트링) */
export async function handleOAuthCallback(): Promise<UserAccount | null> {
  // 1. 해시 파라미터 파싱 (Naver / Google implicit grant: #access_token=...&state=...)
  const hash = window.location.hash.substring(1);
  if (hash) {
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const state = params.get('state');

    if (accessToken) {
      let provider: AuthProvider = 'naver';
      if (state) {
        try {
          const decoded = JSON.parse(decodeURIComponent(state));
          if (decoded.provider) provider = decoded.provider;
        } catch {}
      }

      // 네이버 프로필 조회 시도
      let name = '수영인';
      let email: string | null = null;
      let profile_image: string | null = null;
      let provider_user_id = `user_${Date.now()}`;

      if (provider === 'naver') {
        try {
          const res = await fetch('https://openapi.naver.com/v1/nid/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.response) {
              provider_user_id = data.response.id || provider_user_id;
              name = data.response.nickname || data.response.name || '네이버 수영인';
              email = data.response.email || null;
              profile_image = data.response.profile_image || null;
            }
          }
        } catch (e) {
          console.warn('네이버 프로필 조회 오류:', e);
        }
      }

      // 클린 URL로 복귀
      window.history.replaceState(null, '', window.location.pathname);

      return await syncUserAccountToDb({
        provider,
        provider_user_id,
        name,
        email,
        profile_image,
        access_token: accessToken,
      });
    }
  }

  // 2. 쿼리 파라미터 파싱 (Kakao authorization code: ?code=...)
  const searchParams = new URLSearchParams(window.location.search);
  const code = searchParams.get('code');
  if (code) {
    window.history.replaceState(null, '', window.location.pathname);
    return await syncUserAccountToDb({
      provider: 'kakao',
      provider_user_id: `kakao_${code.substring(0, 10)}`,
      name: '카카오 수영인',
      email: null,
      profile_image: null,
    });
  }

  // 3. 콜백 페이지(naverlogin, kakaologin)를 통해 로컬스토리지에 저장된 인증 페이로드 복원
  try {
    const naverPayload = localStorage.getItem('swimi_naver_auth_payload');
    if (naverPayload) {
      localStorage.removeItem('swimi_naver_auth_payload');
      const parsed = JSON.parse(naverPayload);
      if (parsed && parsed.provider === 'naver') {
        return await syncUserAccountToDb({
          provider: 'naver',
          provider_user_id: parsed.id,
          name: parsed.name,
          email: parsed.email,
          profile_image: parsed.profile_image,
          access_token: parsed.access_token,
        });
      }
    }

    const kakaoPayload = localStorage.getItem('swimi_kakao_auth_payload');
    if (kakaoPayload) {
      localStorage.removeItem('swimi_kakao_auth_payload');
      const parsed = JSON.parse(kakaoPayload);
      if (parsed && parsed.provider === 'kakao') {
        return await syncUserAccountToDb({
          provider: 'kakao',
          provider_user_id: parsed.id,
          name: parsed.name,
          email: parsed.email,
          profile_image: parsed.profile_image,
          access_token: parsed.access_token,
        });
      }
    }

    const googlePayload = localStorage.getItem('swimi_google_auth_payload');
    if (googlePayload) {
      localStorage.removeItem('swimi_google_auth_payload');
      const parsed = JSON.parse(googlePayload);
      if (parsed && parsed.provider === 'google') {
        return await syncUserAccountToDb({
          provider: 'google',
          provider_user_id: parsed.id,
          name: parsed.name,
          email: parsed.email,
          profile_image: parsed.profile_image,
          access_token: parsed.access_token,
        });
      }
    }
  } catch (e) {
    console.warn('Auth payload recovery notice:', e);
  }

  return null;
}
