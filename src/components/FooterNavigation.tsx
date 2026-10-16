import React, { useState } from 'react';
import {
  LayoutDashboard,
  Trophy,
  Shield,
  Calendar,
  Users,
  Award,
  UserCheck,
  Settings,
  Zap,
  Crown,
  LayoutGrid,
  X,
  Sparkles,
} from 'lucide-react';
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
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const isCurrentLeagueAdmin = activeChampionship ? isUserLeagueAdmin(activeChampionship.id, currentUser?.id) : false;
  const isMasterAdmin = currentUser?.email?.toLowerCase().trim() === 'thyago.talm@gmail.com';

  const navItems: {
    id: NavTab;
    label: string;
    shortLabel: string;
    description: string;
    icon: React.ReactNode;
  }[] = [
    { id: 'overview', label: 'Visão Geral', shortLabel: 'Geral', description: 'Painel da temporada e status', icon: <LayoutDashboard className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> },
    { id: 'standings-drivers', label: 'Tabela Pilotos', shortLabel: 'Pilotos', description: 'Classificação oficial de pilotos', icon: <Trophy className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> },
    { id: 'standings-teams', label: 'Tabela Equipes', shortLabel: 'Equipes', description: 'Pontuação de construtores', icon: <Shield className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> },
    { id: 'calendar', label: 'Calendário', shortLabel: 'Etapas', description: 'Datas, pistas e horários', icon: <Calendar className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> },
    { id: 'pilots', label: 'Grid & Inscrições', shortLabel: 'Grid', description: 'Pilotos homologados e reservas', icon: <Users className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> },
    { id: 'championships', label: 'Campeonatos', shortLabel: 'Ligas', description: 'Torneios e ligas ativas', icon: <Award className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> },
    { id: 'sim-rating', label: 'Ranking Sim Rating', shortLabel: 'Ranking', description: 'Pontuação global dos pilotos', icon: <Zap className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-400" /> },
    { id: 'driver-profile', label: 'Meu Perfil', shortLabel: 'Perfil', description: 'Estatísticas e número do piloto', icon: <UserCheck className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> },
    ...(isCurrentLeagueAdmin ? [{ id: 'admin-panel' as NavTab, label: 'Gestão da Liga', shortLabel: 'Gestão', description: 'Painel do administrador da liga', icon: <Settings className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-red-400" /> }] : []),
    ...(isMasterAdmin ? [{ id: 'master-admin' as NavTab, label: 'Admin Master', shortLabel: 'Master', description: 'Controle geral da plataforma', icon: <Crown className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-400 animate-pulse" /> }] : []),
  ];

  // Mobile navigation partitioning: 4 primary core tabs + 1 "Mais" menu
  const mobilePrimaryIds: NavTab[] = ['overview', 'standings-drivers', 'calendar', 'pilots'];
  const mobilePrimaryItems = navItems.filter((item) => mobilePrimaryIds.includes(item.id));
  const mobileSecondaryItems = navItems.filter((item) => !mobilePrimaryIds.includes(item.id));

  // Check if activeTab is currently one of the secondary items in the "Mais" drawer
  const isMoreTabActive = mobileSecondaryItems.some((item) => item.id === activeTab);
  const activeMoreItem = mobileSecondaryItems.find((item) => item.id === activeTab);

  return (
    <>
      {/* Mobile Drawer / Bottom Sheet for Secondary Navigation */}
      {isMoreMenuOpen && (
        <div className="md:hidden">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsMoreMenuOpen(false)}
          />

          {/* Drawer Body */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#090d16] border-t border-red-950/80 rounded-t-3xl p-4 pb-8 max-h-[85vh] overflow-y-auto shadow-[0_-12px_40px_rgba(0,0,0,0.9)] animate-in slide-in-from-bottom duration-250">
            {/* Drag Handle */}
            <div className="w-12 h-1.5 bg-slate-700/70 rounded-full mx-auto mb-3" />

            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-red-950/80 border border-red-800/60 text-red-400">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    Mais Menus da Liga
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Selecione uma área para navegar
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMoreMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                aria-label="Fechar menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Secondary Menu Cards Grid */}
            <div className="grid grid-cols-2 gap-2">
              {mobileSecondaryItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMoreMenuOpen(false);
                    }}
                    className={`flex flex-col text-left p-3 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                      isActive
                        ? 'bg-red-950/60 border-red-600/90 text-white shadow-lg shadow-red-950/50 ring-1 ring-red-500/40'
                        : 'bg-slate-900/80 hover:bg-slate-800/90 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <div
                        className={`p-2 rounded-xl ${
                          isActive
                            ? 'bg-red-600 text-white shadow-md shadow-red-950'
                            : 'bg-slate-800/90 text-slate-300 border border-slate-700/50'
                        }`}
                      >
                        {item.icon}
                      </div>
                      {isActive && (
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-red-600 text-white px-1.5 py-0.5 rounded-full shadow-sm">
                          Ativo
                        </span>
                      )}
                    </div>

                    <div className="text-xs font-bold text-white leading-tight">
                      {item.label}
                    </div>
                    {item.description && (
                      <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 leading-snug">
                        {item.description}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Fixed Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#070b14]/95 backdrop-blur-lg border-t border-slate-800/90 shadow-[0_-4px_24px_rgba(0,0,0,0.6)]">
        {/* Top subtle racing indicator glow */}
        <div className="h-0.5 w-full bg-gradient-to-r from-red-600/30 via-red-500/80 to-amber-500/30" />

        <div className="mx-auto max-w-5xl px-2 sm:px-4 py-1.5 sm:py-2">
          {/* MOBILE VIEW (5 Columns: 4 Core Tabs + 1 "Mais" Button) */}
          <div className="grid grid-cols-5 w-full items-center gap-1 text-center md:hidden">
            {mobilePrimaryItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMoreMenuOpen(false);
                  }}
                  className={`relative flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'text-white bg-red-600/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                  title={item.label}
                >
                  {/* Active Top Highlight Dot */}
                  {isActive && (
                    <span className="absolute -top-1.5 h-1 w-6 rounded-full bg-red-500 shadow-sm shadow-red-500" />
                  )}

                  {/* Icon */}
                  <div
                    className={`transition-transform duration-150 ${
                      isActive ? 'scale-110 text-red-400' : 'text-slate-400'
                    }`}
                  >
                    {item.icon}
                  </div>

                  {/* Text Label - Large and fully readable */}
                  <span
                    className={`text-[11px] font-semibold tracking-tight mt-0.5 whitespace-nowrap ${
                      isActive ? 'text-white font-bold' : 'text-slate-400'
                    }`}
                  >
                    {item.shortLabel}
                  </span>
                </button>
              );
            })}

            {/* 5th Column: "Mais" Button */}
            <button
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className={`relative flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 cursor-pointer ${
                isMoreTabActive
                  ? 'text-white bg-red-600/20'
                  : isMoreMenuOpen
                  ? 'text-red-300 bg-red-950/40 border border-red-800/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
              title={isMoreTabActive ? activeMoreItem?.label : 'Mais Opções'}
            >
              {/* Active Indicator Dot */}
              {isMoreTabActive && (
                <span className="absolute -top-1.5 h-1 w-6 rounded-full bg-red-500 shadow-sm shadow-red-500" />
              )}

              {/* Icon */}
              <div
                className={`transition-transform duration-150 ${
                  isMoreTabActive || isMoreMenuOpen ? 'scale-110 text-red-400' : 'text-slate-400'
                }`}
              >
                {isMoreTabActive && activeMoreItem ? (
                  activeMoreItem.icon
                ) : (
                  <LayoutGrid className="w-4 h-4" />
                )}
              </div>

              {/* Text Label */}
              <span
                className={`text-[11px] font-semibold tracking-tight mt-0.5 whitespace-nowrap ${
                  isMoreTabActive ? 'text-white font-bold' : 'text-slate-400'
                }`}
              >
                {isMoreTabActive && activeMoreItem ? activeMoreItem.shortLabel : 'Mais'}
              </span>
            </button>
          </div>

          {/* DESKTOP / TABLET VIEW (All Items in full grid) */}
          <div
            className="hidden md:grid w-full items-center gap-1 text-center"
            style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'text-white bg-red-600/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                  title={item.label}
                >
                  {/* Active Top Highlight Bar */}
                  {isActive && (
                    <span className="absolute -top-2 h-1 w-8 rounded-full bg-red-500 shadow-sm shadow-red-500" />
                  )}

                  {/* Icon */}
                  <div
                    className={`transition-transform duration-150 ${
                      isActive ? 'scale-110 text-red-400' : 'text-slate-400'
                    }`}
                  >
                    {item.icon}
                  </div>

                  {/* Text Label */}
                  <span
                    className={`text-xs font-medium tracking-tight mt-0.5 truncate max-w-full ${
                      isActive ? 'text-white font-bold' : 'text-slate-400'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
};
