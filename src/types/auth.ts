export type AuthProvider = 'kakao' | 'naver' | 'google' | 'guest';

export interface UserAccount {
  id: string;
  provider: AuthProvider;
  provider_user_id: string;
  email?: string | null;
  name?: string | null;
  profile_image?: string | null;
  access_token?: string | null;
  refresh_token?: string | null;
  token_expires_at?: string | null;
  created_at?: string;
  last_login_at?: string;
}

export interface UserPoolInteraction {
  id?: string;
  user_id: string;
  pool_id: string;
  is_favorite: boolean;
  is_visited: boolean;
  visited_at?: string | null;
  visit_count: number;
  memo?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface UserInteractionState {
  isFavorite: boolean;
  isVisited: boolean;
  visitedAt?: string | null;
  visitCount: number;
  memo?: string | null;
}

export type UserInteractionsMap = Record<string, UserInteractionState>;
