import React from 'react';
import { Flag, Trophy, Users, Shield, Zap, Sparkles, Gamepad2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChampionships } from '../context/ChampionshipContext';

interface HeaderBannerProps {
  onOpenCreateModal: () => void;
  onOpenAdminsModal: () => void;
}

export const HeaderBanner: React.FC<HeaderBannerProps> = ({ onOpenCreateModal, onOpenAdminsModal }) => {
  const { currentUser } = useAuth();
  const { activeChampionship, isUserLeagueAdmin, getLeagueAdmins } = useChampionships();

  const isAdmin = activeChampionship ? isUserLeagueAdmin(activeChampionship.id) : false;
  const leagueAdmins = activeChampionship ? getLeagueAdmins(activeChampionship.id) : [];
  const isLeagueAdminOfAny = currentUser ? (currentUser.role === 'admin' || (activeChampionship ? isUserLeagueAdmin(activeChampionship.id, currentUser.id) : false)) : false;

  return (
    <header className="relative w-full overflow-hidden border-b border-red-950/40 bg-[#070a10]">
      {/* Background Motorsport Gradients & Circuit Silhouette */}
      <div className="absolute inset-0 bg-gradient-to-r from-red-950/30 via-slate-950 to-red-950/30 pointer-events-none" />
      <div className="absolute inset-0 bg-carbon-pattern opacity-30 pointer-events-none" />
      
      {/* Top red racing line stripe */}
      <div className="h-1.5 w-full bg-gradient-to-r from-red-700 via-red-500 to-amber-500" />

      {/* Top meta-bar with quick user switcher */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-2 flex flex-wrap items-center justify-between text-xs text-slate-400 border-b border-white/5 gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-red-400 font-medium tracking-wide">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            TEMPORADA OFICIAL 2026
          </span>
          <span className="hidden sm:inline text-slate-600">·</span>
          <span className="hidden sm:inline text-slate-300">
            {activeChampionship ? `${activeChampionship.simulator} · ${activeChampionship.category}` : 'Sim Racing Hub'}
          </span>
        </div>

        <div className="flex items-center gap-2 ml-auto text-xs text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="text-slate-300 font-medium">Servidor Online</span>
        </div>
      </div>

      {/* Main Centered Brand Banner (Inspired by stopandgobr.com) */}
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-6 sm:py-8 flex flex-col items-center text-center">
        {/* Centered Crest Logo */}
        <div className="relative mb-3 flex items-center justify-center">
          <div className="relative flex items-center justify-center h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-br from-red-600 to-red-950 p-0.5 shadow-2xl shadow-red-900/40 ring-2 ring-red-500/30">
            <div className="h-full w-full bg-[#0a0e17] rounded-[14px] flex flex-col items-center justify-center p-2 relative overflow-hidden">
              <div className="absolute inset-0 checkered-pattern opacity-10" />
              {/* Custom SVG Racing Apex Emblem */}
              <svg className="w-10 h-10 sm:w-12 sm:h-12 text-red-500" viewBox="0 0 100 100" fill="none">
                <path d="M15 80 L50 15 L85 80" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M30 65 L50 28 L70 65" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="50" cy="50" r="8" fill="#ef4444" />
                <path d="M10 88 H90" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          {/* Subtle neon glow behind emblem */}
          <div className="absolute -inset-4 bg-red-600/20 blur-xl rounded-full -z-10" />
        </div>

        {/* Brand Title */}
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white uppercase font-display flex items-center justify-center gap-2">
            APEX<span className="text-red-500">SIM</span> <span className="text-slate-300 font-light">MANAGER</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto font-normal">
            Plataforma oficial de campeonatos virtuais de automobilismo: calendários, inscrições de pilotos, resultados de corridas e tabelas automatizadas.
          </p>
        </div>

        {/* League Header Info Pill Container */}
        {activeChampionship ? (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs">
            <div className="bg-slate-900/80 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold text-white">{activeChampionship.name}</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <Gamepad2 className="w-3.5 h-3.5 text-red-400" />
              <span>Simulador: <strong className="text-white">{activeChampionship.simulator}</strong></span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <Flag className="w-3.5 h-3.5 text-red-400" />
              <span>{activeChampionship.stages.length} Etapas</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>{activeChampionship.registrations.filter(r => r.status === 'APROVADO').length} / {activeChampionship.maxGrid} Pilotos</span>
            </div>

            {isAdmin && (
              <button
                onClick={onOpenAdminsModal}
                className="bg-red-950/80 hover:bg-red-900/90 text-red-200 border border-red-800/80 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors font-medium cursor-pointer"
                title="Adicionar outros usuários como administradores desta liga"
              >
                <Shield className="w-3.5 h-3.5 text-red-400" />
                <span>Adms da Liga ({leagueAdmins.length})</span>
              </button>
            )}

            {isLeagueAdminOfAny && (
              <button
                onClick={onOpenCreateModal}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-medium px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-md shadow-red-950 transition-all cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>+ Criar Campeonato</span>
              </button>
            )}
          </div>
        ) : (
          isLeagueAdminOfAny && (
            <div className="mt-5 flex items-center justify-center">
              <button
                onClick={onOpenCreateModal}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-medium px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-red-950 transition-all cursor-pointer text-xs"
              >
                <Zap className="w-4 h-4" />
                <span>+ Criar Campeonato Manualmente</span>
              </button>
            </div>
          )
        )}
      </div>
    </header>
  );
};
