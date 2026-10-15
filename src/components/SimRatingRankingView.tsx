import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Zap,
  Search,
  Shield,
  Medal,
  Award,
  ChevronUp,
  ChevronDown,
  Info,
  Users,
  Flag,
  Sparkles,
  ExternalLink,
  Swords,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChampionships } from '../context/ChampionshipContext';
import { User } from '../types';
import {
  DEFAULT_SIM_RATING,
  SIM_RATING_TIERS,
  getSimRatingTier,
} from '../utils/simRating';
import { CountryFlag } from './CountryFlag';
import { sanitizeUserProfileTeams } from '../services/userService';
import { computePilotStatsFromChampionships } from '../utils/driverStats';

interface SimRatingRankingViewProps {
  onNavigateToProfile?: () => void;
  onOpenCardModal?: (driver?: User) => void;
  onOpenH2HModal?: (driverA?: User, driverB?: User) => void;
}

export const SimRatingRankingView: React.FC<SimRatingRankingViewProps> = ({
  onNavigateToProfile,
  onOpenCardModal,
  onOpenH2HModal,
}) => {
  const { users, currentUser, resetAllSimRatingStats } = useAuth();
  const { championships } = useChampionships();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'simRating' | 'wins' | 'podiums' | 'races' | 'qualifications' | 'points'>('simRating');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');

  // Reset Ranking States
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.email?.toLowerCase().trim() === 'thyago.talm@gmail.com';

  const handleConfirmReset = async () => {
    setIsResetting(true);
    try {
      const res = await resetAllSimRatingStats();
      if (res.success) {
        setFeedbackMessage('Ranking Sim Rating e estatísticas resetados com sucesso! Todos os pilotos retornaram para o padrão de 3.000 pts.');
        setIsResetModalOpen(false);
        setTimeout(() => setFeedbackMessage(null), 6000);
      } else {
        alert(res.error || 'Erro ao resetar ranking.');
      }
    } catch (err: any) {
      alert(err?.message || 'Erro ao processar reset.');
    } finally {
      setIsResetting(false);
    }
  };

  // Consolidate pilots list: All registered users with safe stats and authentic profile teams
  // Consolidate pilots list: All registered users with safe stats and authentic profile teams
  const allDrivers: User[] = useMemo(() => {
    return users.map((u) => {
      const cleanUser = sanitizeUserProfileTeams(u);
      // Compute accurate stats directly from ground-truth championship stages
      const computedStats = computePilotStatsFromChampionships(cleanUser, championships);
      return {
        ...cleanUser,
        stats: computedStats,
      };
    });
  }, [users, championships]);

  // Filtered & Sorted Drivers
  const rankedDrivers = useMemo(() => {
    return allDrivers
      .filter((driver) => {
        // Search filter
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase().trim();
          const matches =
            driver.name.toLowerCase().includes(term) ||
            driver.email.toLowerCase().includes(term) ||
            (driver.teamName && driver.teamName.toLowerCase().includes(term)) ||
            (driver.teamTag && driver.teamTag.toLowerCase().includes(term)) ||
            (driver.gamingId && driver.gamingId.toLowerCase().includes(term)) ||
            (driver.steamId && driver.steamId.toLowerCase().includes(term)) ||
            (driver.country && driver.country.toLowerCase().includes(term));
          if (!matches) return false;
        }

        // Tier filter
        if (selectedTier !== 'all') {
          const tier = getSimRatingTier(driver.stats.simRating);
          if (tier.id !== selectedTier) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA = a.stats[sortBy] || 0;
        let valB = b.stats[sortBy] || 0;

        // If secondary sorting by simRating when tied
        if (valA === valB && sortBy !== 'simRating') {
          return (b.stats.simRating || 0) - (a.stats.simRating || 0);
        }

        return sortDirection === 'desc' ? valB - valA : valA - valB;
      });
  }, [allDrivers, searchTerm, selectedTier, sortBy, sortDirection]);

  // Podium (Top 3)
  const top1 = rankedDrivers[0];
  const top2 = rankedDrivers[1];
  const top3 = rankedDrivers[2];

  const handleSort = (field: 'simRating' | 'wins' | 'podiums' | 'races' | 'qualifications' | 'points') => {
    if (sortBy === field) {
      setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Success / Feedback Toast Notification */}
      {feedbackMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-600/70 text-emerald-200 text-xs flex items-center justify-between gap-3 shadow-xl animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-semibold">{feedbackMessage}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-emerald-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Official Sim Rating Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-950 via-slate-900 to-[#0c121e] border border-red-900/60 p-5 sm:p-7 shadow-2xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-600/10 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-red-600/20 border border-red-500/30 text-red-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3 h-3 text-red-400" />
                Sistema Oficial Sim Rating
              </span>
              <span className="text-[11px] text-slate-400">
                Baseline Oficial: <strong className="text-white font-mono">3.000 pts</strong>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight flex items-center gap-2">
              Ranking Oficial de Pilotos
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              O Sim Rating é o índice de competitividade unificado do automobilismo virtual. Todas as contas iniciam com pontuação padrão de <strong>3.000 pontos</strong> e evoluem de acordo com vitórias, pódios, poles e constância nas ligas homologadas.
            </p>
          </div>

          {currentUser && (
            <div className="shrink-0 bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3 shadow-lg">
              <img
                src={currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250'}
                alt={currentUser.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-red-500 shadow"
              />
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-slate-400">Sua Pontuação</div>
                <div className="text-lg font-black text-white font-mono-numbers flex items-center gap-1.5">
                  <span>{currentUser.stats?.simRating || DEFAULT_SIM_RATING}</span>
                  <span className="text-[11px] font-bold text-red-400">pts</span>
                </div>
                <div className="text-[10px] font-semibold text-slate-300">
                  Tier: {getSimRatingTier(currentUser.stats?.simRating || DEFAULT_SIM_RATING).name}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tiers Legend Cards */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
          {SIM_RATING_TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`p-2.5 rounded-xl border ${tier.badgeBg} ${tier.badgeBorder} flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between">
                <span className="text-base">{tier.badgeIcon}</span>
                <span className={`text-[10px] font-mono font-bold ${tier.textColor}`}>
                  {tier.maxRating === Infinity ? '3.800+' : `${tier.minRating} - ${tier.maxRating}`}
                </span>
              </div>
              <div className="mt-1 font-bold text-white text-xs">{tier.name}</div>
              <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                {tier.id === 'pro' ? '★ Padrão Inicial (3000)' : tier.description}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Podium Visualization for Top 3 */}
      {rankedDrivers.length >= 2 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* 2nd Place */}
          {top2 && (
            <div className="order-2 sm:order-1 bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-700/80 rounded-2xl p-4 flex flex-col items-center text-center relative shadow-lg">
              <span className="absolute -top-3 px-3 py-0.5 rounded-full bg-slate-700 text-slate-200 text-[10px] font-extrabold uppercase tracking-wider border border-slate-600">
                2º Lugar · Prata
              </span>
              <img
                src={top2.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250'}
                alt={top2.name}
                className="w-14 h-14 rounded-full object-cover border-2 border-slate-400 mt-2 shadow-md"
              />
              <div className="mt-2 font-bold text-white text-sm truncate max-w-full">{top2.name}</div>
              {top2.teamName ? (
                <div className="text-[11px] text-slate-300 font-semibold flex items-center justify-center gap-1 mt-0.5 truncate max-w-full">
                  <Shield className="w-2.5 h-2.5 text-red-400 shrink-0" />
                  <span className="truncate">{top2.teamName}</span>
                  {top2.teamTag && (
                    <span className="px-1 py-0.2 rounded bg-slate-800 font-mono text-[9px] font-bold text-amber-400 border border-slate-700 shrink-0">
                      {top2.teamTag}
                    </span>
                  )}
                </div>
              ) : null}
              <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <CountryFlag country={top2.country} className="w-3.5 h-3.5" />
                <span>{top2.country}</span>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-xl font-black text-white font-mono-numbers">{top2.stats.simRating}</span>
                <span className="text-xs text-slate-400">pts</span>
              </div>
              <span className="mt-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
                {getSimRatingTier(top2.stats.simRating).name}
              </span>
              <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono">
                <span className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-800/80 text-purple-300 font-bold" title={`${top2.stats.qualifications || 0} qualificação(ões) disputada(s)`}>
                  {top2.stats.qualifications || 0} Q
                </span>
                <span className="px-2 py-0.5 rounded bg-blue-950/80 border border-blue-800/80 text-blue-300 font-bold" title={`${top2.stats.races || 0} corrida(s) propriamente dita(s)`}>
                  {top2.stats.races || 0} R
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800/80 text-amber-300 font-bold" title={`${top2.stats.wins || 0} vitória(s)`}>
                  {top2.stats.wins || 0} V
                </span>
              </div>
            </div>
          )}

          {/* 1st Place */}
          {top1 && (
            <div className="order-1 sm:order-2 bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-950 border-2 border-amber-500/70 rounded-2xl p-5 flex flex-col items-center text-center relative shadow-2xl shadow-amber-950/30 -mt-1 sm:-mt-3">
              <span className="absolute -top-3.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 text-xs font-black uppercase tracking-wider shadow-md">
                👑 1º Lugar · Líder Geral
              </span>
              <img
                src={top1.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250'}
                alt={top1.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-amber-400 mt-2 shadow-lg ring-4 ring-amber-500/20"
              />
              <div className="mt-2.5 font-black text-white text-base truncate max-w-full">{top1.name}</div>
              {top1.teamName ? (
                <div className="text-[11px] text-amber-200/90 font-semibold flex items-center justify-center gap-1 mt-0.5 truncate max-w-full">
                  <Shield className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                  <span className="truncate">{top1.teamName}</span>
                  {top1.teamTag && (
                    <span className="px-1 py-0.2 rounded bg-amber-950 font-mono text-[9px] font-bold text-amber-300 border border-amber-700 shrink-0">
                      {top1.teamTag}
                    </span>
                  )}
                </div>
              ) : null}
              <div className="text-xs text-slate-300 flex items-center gap-1 mt-0.5">
                <CountryFlag country={top1.country} className="w-3.5 h-3.5" />
                <span>{top1.country}</span>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-black text-amber-400 font-mono-numbers">{top1.stats.simRating}</span>
                <span className="text-xs text-amber-400/80 font-bold">pts</span>
              </div>
              <span className="mt-1 text-[11px] px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-700 font-bold">
                {getSimRatingTier(top1.stats.simRating).name}
              </span>
              <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-mono">
                <span className="px-2 py-0.5 rounded bg-purple-950/90 border border-purple-700 text-purple-200 font-bold shadow" title={`${top1.stats.qualifications || 0} qualificação(ões) disputada(s)`}>
                  {top1.stats.qualifications || 0} Q
                </span>
                <span className="px-2 py-0.5 rounded bg-blue-950/90 border border-blue-700 text-blue-200 font-bold shadow" title={`${top1.stats.races || 0} corrida(s) propriamente dita(s)`}>
                  {top1.stats.races || 0} R
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-950/90 border border-amber-700 text-amber-200 font-bold shadow" title={`${top1.stats.wins || 0} vitória(s)`}>
                  {top1.stats.wins || 0} V
                </span>
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {top3 && (
            <div className="order-3 bg-gradient-to-b from-slate-900/90 to-slate-950 border border-amber-900/60 rounded-2xl p-4 flex flex-col items-center text-center relative shadow-lg">
              <span className="absolute -top-3 px-3 py-0.5 rounded-full bg-amber-900/80 text-amber-200 text-[10px] font-extrabold uppercase tracking-wider border border-amber-800">
                3º Lugar · Bronze
              </span>
              <img
                src={top3.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250'}
                alt={top3.name}
                className="w-14 h-14 rounded-full object-cover border-2 border-amber-700 mt-2 shadow-md"
              />
              <div className="mt-2 font-bold text-white text-sm truncate max-w-full">{top3.name}</div>
              {top3.teamName ? (
                <div className="text-[11px] text-slate-300 font-semibold flex items-center justify-center gap-1 mt-0.5 truncate max-w-full">
                  <Shield className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                  <span className="truncate">{top3.teamName}</span>
                  {top3.teamTag && (
                    <span className="px-1 py-0.2 rounded bg-slate-800 font-mono text-[9px] font-bold text-amber-400 border border-slate-700 shrink-0">
                      {top3.teamTag}
                    </span>
                  )}
                </div>
              ) : null}
              <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <CountryFlag country={top3.country} className="w-3.5 h-3.5" />
                <span>{top3.country}</span>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-xl font-black text-white font-mono-numbers">{top3.stats.simRating}</span>
                <span className="text-xs text-slate-400">pts</span>
              </div>
              <span className="mt-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-950/70 text-amber-300 font-semibold border border-amber-900">
                {getSimRatingTier(top3.stats.simRating).name}
              </span>
              <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono">
                <span className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-800/80 text-purple-300 font-bold" title={`${top3.stats.qualifications || 0} qualificação(ões) disputada(s)`}>
                  {top3.stats.qualifications || 0} Q
                </span>
                <span className="px-2 py-0.5 rounded bg-blue-950/80 border border-blue-800/80 text-blue-300 font-bold" title={`${top3.stats.races || 0} corrida(s) propriamente dita(s)`}>
                  {top3.stats.races || 0} R
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800/80 text-amber-300 font-bold" title={`${top3.stats.wins || 0} vitória(s)`}>
                  {top3.stats.wins || 0} V
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Buscar piloto por nome, país, ID ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
          />
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 sm:pb-0">
          {onOpenH2HModal && (
            <button
              type="button"
              onClick={() => onOpenH2HModal()}
              className="flex items-center gap-1.5 bg-amber-950/70 hover:bg-amber-900 border border-amber-800/80 text-amber-300 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap shadow-sm"
              title="Abrir Comparador Direto (Head-to-Head)"
            >
              <Swords className="w-3.5 h-3.5 text-amber-400" />
              <span>Comparador H2H</span>
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsResetModalOpen(true)}
              className="flex items-center gap-1.5 bg-red-950/80 hover:bg-red-900 border border-red-700/80 hover:border-red-500 text-red-300 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap shadow-sm text-xs"
              title="Resetar pontuação e estatísticas do Sim Rating para 3.000 pts"
            >
              <RotateCcw className="w-3.5 h-3.5 text-red-400" />
              <span>Resetar Ranking</span>
            </button>
          )}

          <span className="text-[11px] text-slate-400 font-semibold hidden md:inline ml-2">Tier:</span>
          <button
            type="button"
            onClick={() => setSelectedTier('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
              selectedTier === 'all'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white bg-slate-900'
            }`}
          >
            Todos os Tiers ({allDrivers.length})
          </button>
          {SIM_RATING_TIERS.map((tier) => (
            <button
              key={tier.id}
              type="button"
              onClick={() => setSelectedTier(tier.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                selectedTier === tier.id
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white bg-slate-900'
              }`}
            >
              {tier.badgeIcon} {tier.name}
            </button>
          ))}
        </div>
      </div>

      {/* Criteria Info Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-3 text-xs shadow-md">
        <div className="flex items-center gap-2 text-slate-200">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-bold text-white">Critérios Oficiais do Ranking:</span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-purple-900/60">
            <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
            <span className="text-slate-400">Qualificações (Q):</span>
            <strong className="text-purple-300 font-mono">Sessões de Quali / Grid</strong>
          </span>
          <span className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-blue-900/60">
            <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
            <span className="text-slate-400">Corridas (R):</span>
            <strong className="text-blue-300 font-mono">Corridas Propriamente Ditas (Sem DNS)</strong>
          </span>
        </div>
      </div>

      {/* Table of Pilots */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              <tr>
                <th className="py-3 px-4 w-12 text-center">Pos</th>
                <th className="py-3 px-4">Piloto</th>
                <th
                  onClick={() => handleSort('simRating')}
                  className="py-3 px-4 text-center cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-center gap-1 font-bold text-red-400">
                    <span>Sim Rating Oficial</span>
                    {sortBy === 'simRating' && (
                      sortDirection === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-3 text-center">Tier</th>
                <th className="py-3 px-3 text-center">Safety Rating</th>
                <th
                  onClick={() => handleSort('qualifications')}
                  className="py-3 px-3 text-center cursor-pointer hover:text-white transition-colors"
                  title="Número de sessões de qualificação oficiais disputadas pelo piloto (tomadas de tempo e posições no grid)"
                >
                  <div className="flex flex-col items-center justify-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-purple-400 font-black">Qualificações (Q)</span>
                      {sortBy === 'qualifications' && (
                        sortDirection === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <span className="text-[9px] text-purple-300/70 font-mono tracking-tight lowercase hidden sm:inline">
                      sessões de quali
                    </span>
                  </div>
                </th>
                <th
                  onClick={() => handleSort('races')}
                  className="py-3 px-3 text-center cursor-pointer hover:text-white transition-colors"
                  title="Número de corridas oficiais propriamente ditas disputadas pelo piloto (largadas válidas, excluindo DNS)"
                >
                  <div className="flex flex-col items-center justify-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-blue-400 font-black">Corridas (R)</span>
                      {sortBy === 'races' && (
                        sortDirection === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <span className="text-[9px] text-blue-300/70 font-mono tracking-tight lowercase hidden sm:inline">
                      largadas oficiais
                    </span>
                  </div>
                </th>
                <th
                  onClick={() => handleSort('wins')}
                  className="py-3 px-3 text-center cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Vitórias</span>
                    {sortBy === 'wins' && (
                      sortDirection === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('podiums')}
                  className="py-3 px-3 text-center cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Pódios</span>
                    {sortBy === 'podiums' && (
                      sortDirection === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('points')}
                  className="py-3 px-3 text-center cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Pontos</span>
                    {sortBy === 'points' && (
                      sortDirection === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60 font-medium">
              {rankedDrivers.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    Nenhum piloto encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                rankedDrivers.map((driver, index) => {
                  const position = index + 1;
                  const isCurrent = currentUser?.id === driver.id;
                  const tier = getSimRatingTier(driver.stats.simRating);

                  return (
                    <tr
                      key={driver.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isCurrent ? 'bg-red-950/20 hover:bg-red-950/30' : ''
                      }`}
                    >
                      {/* Position */}
                      <td className="py-3 px-4 text-center">
                        {position === 1 ? (
                          <span className="w-6 h-6 mx-auto rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shadow">
                            1
                          </span>
                        ) : position === 2 ? (
                          <span className="w-6 h-6 mx-auto rounded-full bg-slate-300 text-slate-950 font-black text-xs flex items-center justify-center shadow">
                            2
                          </span>
                        ) : position === 3 ? (
                          <span className="w-6 h-6 mx-auto rounded-full bg-amber-700 text-white font-black text-xs flex items-center justify-center shadow">
                            3
                          </span>
                        ) : (
                          <span className="font-mono text-slate-400 font-bold text-xs">{position}º</span>
                        )}
                      </td>

                      {/* Driver Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={driver.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250'}
                            alt={driver.name}
                            className={`w-9 h-9 rounded-full object-cover border ${
                              isCurrent ? 'border-red-500 ring-2 ring-red-500/30' : 'border-slate-700'
                            }`}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white truncate max-w-[160px] sm:max-w-[220px]">
                                {driver.name}
                              </span>
                              {isCurrent && (
                                <span className="text-[9px] bg-red-600 text-white font-bold px-1.5 py-0.2 rounded">
                                  Você
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="flex items-center gap-1">
                                <CountryFlag country={driver.country} className="w-3.5 h-3.5" />
                                <span className="truncate max-w-[110px]">{driver.country || 'Brasil 🇧🇷'}</span>
                              </span>
                              {driver.teamName && (
                                <>
                                  <span className="text-slate-600">·</span>
                                  <span className="inline-flex items-center gap-1 text-slate-200 font-semibold truncate max-w-[140px] sm:max-w-[200px]" title={driver.teamName}>
                                    <Shield className="w-3 h-3 text-red-400 shrink-0" />
                                    <span className="truncate">{driver.teamName}</span>
                                    {driver.teamTag && (
                                      <span className="px-1 py-0.2 rounded bg-slate-800 font-mono text-[9px] font-bold text-amber-400 border border-slate-700 shrink-0">
                                        {driver.teamTag}
                                      </span>
                                    )}
                                  </span>
                                </>
                              )}
                              {driver.gamingId && (
                                <>
                                  <span className="text-slate-600">·</span>
                                  <span className="text-slate-500 font-mono text-[10px] truncate max-w-[100px]">
                                    {driver.gamingId}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Sim Rating Score */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-baseline gap-1 bg-slate-950 px-3 py-1 rounded-lg border border-red-950/80 shadow-inner">
                          <span className="text-base font-black text-white font-mono-numbers">
                            {driver.stats.simRating}
                          </span>
                          <span className="text-[10px] text-red-400 font-bold uppercase">pts</span>
                        </div>
                      </td>

                      {/* Tier Badge */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${tier.badgeBg} ${tier.badgeBorder} ${tier.textColor}`}
                        >
                          <span>{tier.badgeIcon}</span>
                          <span>{tier.name}</span>
                        </span>
                      </td>

                      {/* Safety Rating */}
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-emerald-400 font-mono font-bold text-[11px]">
                          {driver.stats.safetyRating || 'B 3.50'}
                        </span>
                      </td>

                      {/* Qualifications (Qualis / Grid) */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className="inline-flex items-center justify-center gap-1 min-w-[34px] px-2.5 py-1 rounded-md bg-purple-950/70 border border-purple-800/80 text-purple-300 font-mono font-bold text-xs shadow-sm"
                          title={`${driver.stats.qualifications || 0} qualificação(ões) oficial(is) disputada(s) (tomada de tempo / posição de grid)`}
                        >
                          <span>{driver.stats.qualifications || 0}</span>
                          <span className="text-[9px] text-purple-400 font-semibold">Q</span>
                        </span>
                      </td>

                      {/* Races (Corridas propriamente ditas) */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className="inline-flex items-center justify-center gap-1 min-w-[34px] px-2.5 py-1 rounded-md bg-blue-950/70 border border-blue-800/80 text-blue-300 font-mono font-bold text-xs shadow-sm"
                          title={`${driver.stats.races || 0} corrida(s) oficial(is) propriamente dita(s) disputada(s) (largadas válidas, sem DNS)`}
                        >
                          <span>{driver.stats.races || 0}</span>
                          <span className="text-[9px] text-blue-400 font-semibold">R</span>
                        </span>
                      </td>

                      {/* Wins */}
                      <td className="py-3 px-3 text-center font-mono-numbers text-amber-400 font-bold">
                        {driver.stats.wins || 0}
                      </td>

                      {/* Podiums */}
                      <td className="py-3 px-3 text-center font-mono-numbers text-slate-300">
                        {driver.stats.podiums || 0}
                      </td>

                      {/* Points */}
                      <td className="py-3 px-3 text-center font-mono-numbers font-bold text-white">
                        {driver.stats.points || 0}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {onOpenH2HModal && (
                            <button
                              type="button"
                              onClick={() => onOpenH2HModal(currentUser || undefined, driver)}
                              className="p-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-800/60 transition-colors cursor-pointer"
                              title={`Comparar H2H com ${driver.name}`}
                            >
                              <Swords className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onOpenCardModal && (
                            <button
                              type="button"
                              onClick={() => onOpenCardModal(driver)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                              title={`Gerar Card Oficial de ${driver.name}`}
                            >
                              <Sparkles className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Mostrando <strong>{rankedDrivers.length}</strong> de <strong>{allDrivers.length}</strong> pilotos homologados
          </span>
          <span className="text-slate-500 text-[11px] flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            Todas as novas contas criadas recebem automaticamente 3.000 pontos no Sim Rating Oficial.
          </span>
        </div>
      </div>

      {/* Reset Ranking Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-red-900/80 rounded-2xl p-6 shadow-2xl text-left space-y-4">
            <button
              onClick={() => !isResetting && setIsResetModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-red-950/80 border border-red-700/80 flex items-center justify-center shrink-0 shadow">
                <RotateCcw className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Resetar Ranking Sim Rating</h3>
                <p className="text-xs text-red-400 font-semibold">Operação de Direção da Liga / Master</p>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2.5 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed font-medium">
                  Esta ação irá redefinir todos os <strong>{allDrivers.length} pilotos cadastrados</strong> para o padrão oficial:
                </p>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1 text-[11px]">
                <li>Sim Rating redefinido para a pontuação inicial de <strong className="text-amber-400 font-mono">3.000 pontos</strong></li>
                <li>Estatísticas de desempenho zeradas: <strong className="text-white">0 corridas, 0 vitórias, 0 pódios, 0 poles e 0 pontos</strong></li>
                <li>Atualização gravada e sincronizada no Firebase Firestore e no banco local do servidor</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={handleConfirmReset}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-red-950/50 flex items-center gap-2 disabled:opacity-50"
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Resetando...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Confirmar Reset Agora</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
