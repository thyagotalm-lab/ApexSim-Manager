import React from 'react';
import { ChevronDown, PlusCircle, LogIn, LogOut, Gamepad2, Shield, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChampionships } from '../context/ChampionshipContext';
import { NotificationBell } from './NotificationBell';
import { PWAInstallButton } from './PWAInstallButton';
import { computePilotStatsFromChampionships } from '../utils/driverStats';

interface TopBarProps {
  onOpenCreateModal: () => void;
  onNavigateToProfile: () => void;
  onNavigateToRanking?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenCreateModal,
  onNavigateToProfile,
  onNavigateToRanking,
  onNavigateToTab,
}) => {
  const { currentUser, logout, openAuthModal } = useAuth();
  const { activeChampionship, championships, setActiveChampionshipId, isUserLeagueAdmin } = useChampionships();

  const isCurrentLeagueAdmin = activeChampionship ? isUserLeagueAdmin(activeChampionship.id) : false;
  const isLeagueAdminOfAny = currentUser ? (
    currentUser.role === 'admin' ||
    championships.some((c) => isUserLeagueAdmin(c.id, currentUser.id))
  ) : false;

  // Synchronized dynamic Sim Rating calculation matching the official table exactly
  const userSimRating = React.useMemo(() => {
    if (!currentUser) return 3000;
    const computed = computePilotStatsFromChampionships(currentUser, championships);
    return computed.simRating ?? currentUser.stats?.simRating ?? 3000;
  }, [currentUser, championships]);

  return (
    <div className="sticky top-0 z-40 w-full bg-[#080c14]/95 backdrop-blur-md border-b border-slate-800/90 shadow-md shadow-black/40">
      <div className="mx-auto max-w-7xl px-2.5 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-1.5 sm:gap-3">
        {/* Left: Championship Selector */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1 mr-1 sm:mr-0">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 hidden md:inline shrink-0">
            Campeonato:
          </span>
          <div className="relative min-w-0 flex-1 max-w-[135px] xs:max-w-[175px] sm:max-w-[320px] md:max-w-[440px]">
            <select
              value={activeChampionship?.id || ''}
              onChange={(e) => setActiveChampionshipId(e.target.value)}
              disabled={championships.length === 0}
              className="appearance-none bg-slate-900 border border-slate-700/80 hover:border-slate-600 text-white font-semibold text-xs sm:text-sm pl-2.5 sm:pl-3 pr-7 sm:pr-8 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer w-full truncate shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {championships.length === 0 ? (
                <option value="">
                  {!currentUser ? '🔒 Faça login para acessar os campeonatos' : 'Nenhum campeonato criado'}
                </option>
              ) : (
                championships.map((champ) => (
                  <option key={champ.id} value={champ.id}>
                    {champ.name} — [Simulador: {champ.simulator}] · {champ.category}
                  </option>
                ))
              )}
            </select>
            <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {activeChampionship && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 shrink-0">
              <Gamepad2 className="w-3.5 h-3.5 text-red-400" />
              <span className="text-slate-400">Simulador:</span>
              <strong className="font-semibold text-white">{activeChampionship.simulator}</strong>
            </div>
          )}

          {isLeagueAdminOfAny && (
            <button
              onClick={onOpenCreateModal}
              title="Criar novo campeonato"
              className="flex items-center justify-center gap-1 text-xs text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-950/80 border border-red-800/50 p-1.5 sm:px-2.5 sm:py-1.5 h-8 sm:h-auto rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Novo</span>
            </button>
          )}
        </div>

        {/* Center/Right: User Profile & Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* In-App PWA Install Button */}
          <PWAInstallButton variant="header" />

          {/* Internal Notification Bell */}
          <NotificationBell onNavigateToTab={onNavigateToTab} />

          {currentUser ? (
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {/* Quick Sim Rating badge button */}
              <button
                type="button"
                onClick={onNavigateToRanking}
                className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-red-900/60 text-xs transition-colors cursor-pointer group shrink-0"
                title="Acessar Ranking Oficial Sim Rating"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] text-slate-400">Sim Rating:</span>
                <strong className="text-white font-mono-numbers">{userSimRating}</strong>
              </button>

              <button
                onClick={onNavigateToProfile}
                className="flex items-center gap-1.5 sm:gap-2 text-left hover:opacity-90 transition-opacity cursor-pointer group shrink-0"
                title="Ver perfil e estatísticas"
              >
                <div className="relative shrink-0">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    referrerPolicy="no-referrer"
                    className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border border-slate-700 object-cover group-hover:border-red-500 transition-colors"
                  />
                  {isLeagueAdminOfAny && (
                    <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-red-600 rounded-full flex items-center justify-center text-[8px] font-bold text-white border border-slate-900" title="Administrador">
                      ★
                    </span>
                  )}
                </div>
                <div className="hidden md:block">
                  <div className="text-xs font-semibold text-white leading-tight flex items-center gap-1.5">
                    <span className="max-w-[130px] truncate">{currentUser.name}</span>
                    {isLeagueAdminOfAny ? (
                      <span className="text-[10px] bg-red-950 text-red-400 border border-red-800/60 px-1.5 py-0.2 rounded font-semibold flex items-center gap-1 shrink-0">
                        <Shield className="w-2.5 h-2.5" />
                        {currentUser.email.toLowerCase().trim() === 'thyago.talm@gmail.com' ? 'Super Admin' : 'Admin'}
                      </span>
                    ) : (
                      <span className="text-[10px] bg-blue-950 text-blue-400 border border-blue-800/60 px-1.5 py-0.2 rounded font-semibold shrink-0">
                        Piloto
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 max-w-[160px] truncate">
                    {currentUser.email}
                  </div>
                </div>
              </button>

              <button
                onClick={logout}
                title="Desconectar"
                className="p-1.5 h-8 w-8 sm:h-auto sm:w-auto flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={openAuthModal}
              className="flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-semibold px-2.5 sm:px-3.5 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <LogIn className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline sm:inline">Entrar / Cadastrar</span>
              <span className="xs:hidden">Entrar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
