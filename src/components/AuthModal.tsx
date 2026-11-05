import React, { useState } from 'react';
import { X, LogOut, CheckCircle2, Star, Trophy } from 'lucide-react';
import { UserAccount, AuthProvider, UserInteractionsMap } from '../types/auth';
import { buildOAuthAuthorizeUrl, logout } from '../services/authService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  onUserChange: (user: UserAccount | null) => void;
  interactions: UserInteractionsMap;
  totalPoolsCount: number;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChange,
  interactions,
  totalPoolsCount,
}) => {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  if (!isOpen) return null;

  // 통계 계산
  const visitedCount = Object.values(interactions).filter((i) => i.isVisited).length;
  const favoriteCount = Object.values(interactions).filter((i) => i.isFavorite).length;
  const conquestRate = totalPoolsCount > 0 ? ((visitedCount / totalPoolsCount) * 100).toFixed(1) : '0';

  const handleOAuthLogin = (provider: AuthProvider) => {
    setLoadingProvider(provider);
    const { url, error } = buildOAuthAuthorizeUrl(provider);
    if (error || !url) {
      alert(error || '로그인 URL 생성 실패');
      setLoadingProvider(null);
      return;
    }
    // 실제 OAuth 리다이렉트
    window.location.href = url;
  };

  const handleLogout = () => {
    logout();
    onUserChange(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <img src="./favicon.svg" alt="Swimi" className="w-5 h-5 rounded-md shadow-xs ring-1 ring-cyan-400/40" />
            <h2 className="text-base font-bold text-white">
              {currentUser ? '나의 수영 프로필' : 'Swimi 로그인'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-6 space-y-6">
          {currentUser ? (
            /* 로그인된 상태 */
            <div className="space-y-6">
              {/* 프로필 카드 */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                {currentUser.profile_image ? (
                  <img
                    src={currentUser.profile_image}
                    alt={currentUser.name || '프로필'}
                    className="w-14 h-14 rounded-full object-cover border-2 border-cyan-400 shadow-md"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white font-black text-xl shadow-md">
                    {currentUser.name ? currentUser.name[0] : '🏊'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white truncate">
                      {currentUser.name || '수영인'}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
                      {currentUser.provider.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {currentUser.email || '클라우드 동기화 활성화됨'}
                  </p>
                </div>
              </div>

              {/* 방문 & 즐겨찾기 달성 현황 카드 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/30 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Trophy className="w-5 h-5" />
                    <span className="text-xs font-bold">방문한 수영장</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl font-black text-white">{visitedCount}</span>
                    <span className="text-xs text-slate-400 ml-1">/ {totalPoolsCount}곳</span>
                    <p className="text-[11px] text-amber-300/80 font-mono mt-0.5">
                      달성률 {conquestRate}%
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/30 flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-cyan-400">
                    <Star className="w-5 h-5" />
                    <span className="text-xs font-bold">즐겨찾기</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl font-black text-white">{favoriteCount}</span>
                    <span className="text-xs text-slate-400 ml-1">곳</span>
                    <p className="text-[11px] text-cyan-300/80 font-mono mt-0.5">
                      가고 싶은 수영장
                    </p>
                  </div>
                </div>
              </div>

              {/* 로그아웃 버튼 */}
              <button
                onClick={handleLogout}
                className="w-full py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white font-medium text-xs flex items-center justify-center gap-2 transition-all"
              >
                <LogOut className="w-4 h-4" />
                로그아웃
              </button>
            </div>
          ) : (
            /* 비로그인 상태 */
            <div className="space-y-5">
              <div className="text-center space-y-1.5">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3 shadow-lg shadow-cyan-500/10">
                  <Trophy className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">수영장 방문 기록 & 즐겨찾기</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  로그인하면 내가 방문한 전국 수영장을 <strong>'방문'</strong>으로 기록하고,
                  가고 싶은 수영장을 <strong>'즐겨찾기'</strong>로 보관할 수 있습니다.
                </p>
              </div>

              {/* 소셜 로그인 버튼 모음 */}
              <div className="space-y-2.5">
                {/* 네이버 */}
                <button
                  onClick={() => handleOAuthLogin('naver')}
                  disabled={loadingProvider !== null}
                  className="w-full py-3 px-4 rounded-2xl bg-[#03C75A] hover:bg-[#02b351] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#03C75A]/20 transition-all active:scale-98 disabled:opacity-50"
                >
                  <span className="font-black text-sm">N</span>
                  네이버로 간편 로그인
                </button>

                {/* 카카오 */}
                <button
                  onClick={() => handleOAuthLogin('kakao')}
                  disabled={loadingProvider !== null}
                  className="w-full py-3 px-4 rounded-2xl bg-[#FEE500] hover:bg-[#ebd300] text-[#191919] font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#FEE500]/20 transition-all active:scale-98 disabled:opacity-50"
                >
                  <span className="font-black text-sm">💬</span>
                  카카오로 간편 로그인
                </button>

                {/* 구글 */}
                <button
                  onClick={() => handleOAuthLogin('google')}
                  disabled={loadingProvider !== null}
                  className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-white/10 transition-all active:scale-98 disabled:opacity-50"
                >
                  <span className="font-black text-sm">G</span>
                  Google 계정으로 계속
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
