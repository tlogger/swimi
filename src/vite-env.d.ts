/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_KAKAO_MAP_API_KEY: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_KAKAO_CLIENT_ID: string;
  readonly VITE_KAKAO_CALLBACK_URL: string;
  readonly VITE_NAVER_CLIENT_ID: string;
  readonly VITE_NAVER_CLIENT_SECRET: string;
  readonly VITE_NAVER_CALLBACK_URL: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_GOOGLE_CLIENT_SECRET: string;
  readonly VITE_GOOGLE_CALLBACK_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
