import React from 'react';
import { LayoutDashboard, Trophy, Shield, Calendar, Users, Award, UserCheck, Settings, Zap, Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChampionships } from '../context/ChampionshipContext';

export type NavTab = 
  | 'overview'
  | 'standings-drivers'
  | 'standings-teams'
  | 'calendar'
  | 'pilots'
  | 'championships'
  | 'sim-rating'
  | 'driver-profile'
  | 'admin-panel'
  | 'master-admin';

interface FooterNavigationProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export const FooterNavigation: React.FC<FooterNavigationProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const { currentUser } = useAuth();
  const { activeChampionship, isUserLeagueAdmin } = useChampionships();

  const isCurrentLeagueAdmin = activeChampionship ? isUserLeagueAdmin(activeChampionship.id, currentUser?.id) : false;
  const isMasterAdmin = currentUser?.email?.toLowerCase().trim() === 'thyago.talm@gmail.com';

  const navItems: { id: NavTab; label: string; shortLabel: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Visão Geral', shortLabel: 'Geral', icon: <LayoutDashboard className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> },
    { id: 'standings-drivers', label: 'Tabela Pilotos', shortLabel: 'Pilotos', icon: <Trophy className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> },
    { id: 'standings-teams', label: 'Tabela Equipes', shortLabel: 'Equipes', icon: <Shield className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> },
    { id: 'calendar', label: 'Calendário', shortLabel: 'Calendário', icon: <Calendar className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> },
    { id: 'pilots', label: 'Grid & Inscrições', shortLabel: 'Grid', icon: <Users className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> },
    { id: 'championships', label: 'Campeonatos', shortLabel: 'Ligas', icon: <Award className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> },
    { id: 'sim-rating', label: 'Ranking Sim Rating', shortLabel: 'Ranking', icon: <Zap className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-400" /> },
    { id: 'driver-profile', label: 'Meu Perfil', shortLabel: 'Perfil', icon: <UserCheck className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> },
    ...(isCurrentLeagueAdmin ? [{ id: 'admin-panel' as NavTab, label: 'Gestão da Liga', shortLabel: 'Gestão', icon: <Settings className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-red-400" /> }] : []),
    ...(isMasterAdmin ? [{ id: 'master-admin' as NavTab, label: 'Admin Master', shortLabel: 'Master', icon: <Crown className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-400 animate-pulse" /> }] : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#070b14]/95 backdrop-blur-lg border-t border-slate-800/90 shadow-[0_-4px_24px_rgba(0,0,0,0.6)]">
      {/* Top subtle racing indicator glow */}
      <div className="h-0.5 w-full bg-gradient-to-r from-red-600/30 via-red-500/80 to-amber-500/30" />

      <div className="mx-auto max-w-5xl px-2 sm:px-4 py-1.5 sm:py-2">
        {/* Responsive Grid with dynamic columns - NO Horizontal Scrollbar */}
        <div
          className="grid w-full items-center gap-1 text-center"
          style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex flex-col items-center justify-center py-1 sm:py-1.5 px-1 rounded-xl transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'text-white bg-red-600/15 sm:bg-red-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
                title={item.label}
              >
                {/* Active Top Highlight Dot / Line */}
                {isActive && (
                  <span className="absolute -top-1.5 sm:-top-2 h-1 w-6 sm:w-8 rounded-full bg-red-500 shadow-sm shadow-red-500" />
                )}

                {/* Icon */}
                <div
                  className={`transition-transform duration-150 ${
                    isActive ? 'scale-110 text-red-400' : 'text-slate-400'
                  }`}
                >
                  {item.icon}
                </div>

                {/* Text Label - Full on desktop, short on mobile */}
                <span
                  className={`text-[10px] sm:text-xs font-medium tracking-tight mt-0.5 truncate max-w-full ${
                    isActive ? 'text-white font-bold' : 'text-slate-400'
                  }`}
                >
                  <span className="hidden md:inline">{item.label}</span>
                  <span className="md:hidden">{item.shortLabel}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
