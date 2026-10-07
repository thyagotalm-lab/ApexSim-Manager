import React from 'react';
import { ChevronDown, PlusCircle, LogIn, LogOut, Gamepad2, Shield, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChampionships } from '../context/ChampionshipContext';
import { NotificationBell } from './NotificationBell';

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

  return (
    <div className="w-full bg-[#080c14] border-b border-slate-800/80">
      <div className="mx-auto max-w-7xl px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Left: Championship Selector */}
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 hidden sm:inline">
            Campeonato:
          </span>
          <div className="relative">
            <select
              value={activeChampionship?.id || ''}
              onChange={(e) => setActiveChampionshipId(e.target.value)}
              disabled={championships.length === 0}
              className="appearance-none bg-slate-900 border border-slate-700/80 hover:border-slate-600 text-white font-semibold text-xs sm:text-sm pl-3 pr-8 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer max-w-[220px] sm:max-w-[380px] md:max-w-[460px] truncate shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
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
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {activeChampionship && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
              <Gamepad2 className="w-3.5 h-3.5 text-red-400" />
              <span className="text-slate-400">Simulador:</span>
              <strong className="font-semibold text-white">{activeChampionship.simulator}</strong>
            </div>
          )}

          {isLeagueAdminOfAny && (
            <button
              onClick={onOpenCreateModal}
              title="Criar novo campeonato"
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-950/80 border border-red-800/50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Novo</span>
            </button>
          )}
        </div>

        {/* Center/Right: User Profile & Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Internal Notification Bell */}
          <NotificationBell onNavigateToTab={onNavigateToTab} />

          {currentUser ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Quick Sim Rating badge button */}
              <button
                type="button"
                onClick={onNavigateToRanking}
                className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-red-900/60 text-xs transition-colors cursor-pointer group"
                title="Acessar Ranking Oficial Sim Rating"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] text-slate-400">Sim Rating:</span>
                <strong className="text-white font-mono-numbers">{currentUser.stats?.simRating || 3000}</strong>
              </button>

              <button
                onClick={onNavigateToProfile}
                className="flex items-center gap-2 text-left hover:opacity-90 transition-opacity cursor-pointer group"
                title="Ver perfil e estatísticas"
              >
                <div className="relative">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    referrerPolicy="no-referrer"
                    className="h-8 w-8 rounded-full border border-slate-700 object-cover group-hover:border-red-500 transition-colors"
                  />
                  {isLeagueAdminOfAny && (
                    <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-red-600 rounded-full flex items-center justify-center text-[8px] font-bold text-white border border-slate-900" title="Administrador">
                      ★
                    </span>
                  )}
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-semibold text-white leading-tight flex items-center gap-1.5">
                    {currentUser.name}
                    {isLeagueAdminOfAny ? (
                      <span className="text-[10px] bg-red-950 text-red-400 border border-red-800/60 px-1.5 py-0.2 rounded font-semibold flex items-center gap-1">
                        <Shield className="w-2.5 h-2.5" />
                        {currentUser.email.toLowerCase().trim() === 'thyago.talm@gmail.com' ? 'Super Admin' : 'Admin da Liga'}
                      </span>
                    ) : (
                      <span className="text-[10px] bg-blue-950 text-blue-400 border border-blue-800/60 px-1.5 py-0.2 rounded font-semibold">
                        Piloto
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {currentUser.email}
                  </div>
                </div>
              </button>

              <button
                onClick={logout}
                title="Desconectar"
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={openAuthModal}
              className="flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-medium px-3.5 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Entrar / Cadastrar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
