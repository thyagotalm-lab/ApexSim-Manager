import React, { useState } from 'react';
import {
  Trophy,
  Award,
  Zap,
  TrendingUp,
  Shield,
  CheckCircle2,
  Lock,
  Unlock,
  Flame,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChampionships } from '../context/ChampionshipContext';
import { StageRound } from '../types';
import { CountryFlag } from './CountryFlag';

interface DriverOfTheDayVotingProps {
  stage: StageRound;
  onOpenDriverCard?: (driverId: string) => void;
}

export const DriverOfTheDayVoting: React.FC<DriverOfTheDayVotingProps> = ({
  stage,
  onOpenDriverCard,
}) => {
  const { currentUser } = useAuth();
  const { activeChampionship, voteDriverOfTheDay, closeDriverOfTheDayVoting, isUserLeagueAdmin } =
    useChampionships();

  const [voteSuccess, setVoteSuccess] = useState<string | null>(null);

  if (!activeChampionship) return null;

  const isAdmin = isUserLeagueAdmin(activeChampionship.id, currentUser?.id);
  const results = stage.results || [];
  const trophies = stage.communityTrophies || {};
  const dotd = trophies.driverOfTheDay || {
    totalVotes: 0,
    votesByDriverId: {},
    voterUserIds: {},
    votingClosed: false,
  };

  const currentVoterId = currentUser?.id || 'guest_voter';
  const userCurrentVote = dotd.voterUserIds[currentVoterId];

  const handleVote = (driverId: string) => {
    voteDriverOfTheDay(activeChampionship.id, stage.id, driverId, currentVoterId);
    setVoteSuccess(driverId);
    setTimeout(() => setVoteSuccess(null), 1800);
  };

  const handleToggleCloseVoting = () => {
    if (dotd.votingClosed) {
      // Reopen
      voteDriverOfTheDay(activeChampionship.id, stage.id, dotd.winnerDriverId || results[0]?.driverId || '', 'dummy');
    } else {
      closeDriverOfTheDayVoting(activeChampionship.id, stage.id);
    }
  };

  // Find Trophy Winners
  const dotdWinner = results.find((r) => r.driverId === dotd.winnerDriverId) || results[0];
  const mostOvertakesDriver = results.find((r) => r.driverId === trophies.mostOvertakesDriverId);
  const fastestLapDriver = results.find((r) => r.driverId === (stage.fastestLapDriverId || trophies.fastestLapDriverId));
  const cleanDriver = results.find((r) => r.driverId === trophies.cleanDriverId);

  // Sort drivers by vote count descending
  const sortedByVotes = [...results].sort((a, b) => {
    const votesA = dotd.votesByDriverId[a.driverId] || 0;
    const votesB = dotd.votesByDriverId[b.driverId] || 0;
    if (votesB !== votesA) return votesB - votesA;
    return a.finishPosition - b.finishPosition;
  });

  return (
    <div className="space-y-6">
      {/* Community Trophies Showcase Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Piloto do Dia */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border border-amber-800/50 relative overflow-hidden shadow-lg flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                <Trophy className="w-3 h-3 text-amber-400" />
                Piloto do Dia (DotD)
              </span>
              <span className="text-[10px] text-amber-300 font-mono font-bold">
                {dotd.totalVotes} votos
              </span>
            </div>

            <div className="mt-1">
              <div className="text-base font-black text-white truncate">
                {dotdWinner ? dotdWinner.driverName : 'Votação Aberta'}
              </div>
              <div className="text-xs text-slate-400 truncate">
                {dotdWinner ? `#${dotdWinner.number} · ${dotdWinner.teamName}` : 'Vote no melhor da etapa'}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Votação da Comunidade</span>
            <span className="text-amber-400 font-bold">
              {dotdWinner && dotd.totalVotes > 0
                ? `${Math.round(((dotd.votesByDriverId[dotdWinner.driverId] || 0) / dotd.totalVotes) * 100)}% dos votos`
                : '100%'}
            </span>
          </div>
        </div>

        {/* 2. Maior Escalada */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-800/40 relative overflow-hidden shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-400" />
                Maior Escalada
              </span>
              {trophies.mostOvertakesCount ? (
                <span className="text-[10px] font-bold text-emerald-300 font-mono">
                  +{trophies.mostOvertakesCount} posições
                </span>
              ) : null}
            </div>

            <div className="mt-1">
              <div className="text-base font-black text-white truncate">
                {mostOvertakesDriver ? mostOvertakesDriver.driverName : 'A definir'}
              </div>
              <div className="text-xs text-slate-400 truncate">
                {mostOvertakesDriver
                  ? `Largou P${mostOvertakesDriver.gridPosition} → Chegou P${mostOvertakesDriver.finishPosition}`
                  : 'Nenhum avanço'}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Rei das Ultrapassagens</span>
            <span className="text-emerald-400 font-bold">Troféu Oficial</span>
          </div>
        </div>

        {/* 3. Volta Mais Rápida */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-950 border border-purple-800/40 relative overflow-hidden shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-500/30 flex items-center gap-1">
                <Zap className="w-3 h-3 text-purple-400" />
                Volta Mais Rápida
              </span>
              {stage.fastestLapTime && (
                <span className="text-[10px] font-mono font-bold text-purple-300">
                  {stage.fastestLapTime}
                </span>
              )}
            </div>

            <div className="mt-1">
              <div className="text-base font-black text-white truncate">
                {fastestLapDriver ? fastestLapDriver.driverName : 'A definir'}
              </div>
              <div className="text-xs text-slate-400 truncate">
                {fastestLapDriver ? `#${fastestLapDriver.number} · ${fastestLapDriver.teamName}` : 'Sem volta registrada'}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Ponto Bônus da Etapa</span>
            <span className="text-purple-400 font-bold">+{activeChampionship.scoringRule.fastestLapBonus || 1} pt</span>
          </div>
        </div>

        {/* 4. Piloto Mais Limpo / Fair Play */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-950 border border-blue-800/40 relative overflow-hidden shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded-full border border-blue-500/30 flex items-center gap-1">
                <Shield className="w-3 h-3 text-blue-400" />
                Muralha Limpa (Fair Play)
              </span>
              <span className="text-[10px] text-blue-300 font-mono font-bold">
                0 advertências
              </span>
            </div>

            <div className="mt-1">
              <div className="text-base font-black text-white truncate">
                {cleanDriver ? cleanDriver.driverName : 'Sem incidentes'}
              </div>
              <div className="text-xs text-slate-400 truncate">
                {cleanDriver ? `P${cleanDriver.finishPosition} com conduta exemplar` : 'Condução esportiva'}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Segurança de Pista</span>
            <span className="text-blue-400 font-bold">FIA Virtual</span>
          </div>
        </div>
      </div>

      {/* Driver of the Day Voting Section */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Votação Oficial: Piloto do Dia ({stage.trackName})</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Escolha o competidor que realizou a corrida mais marcante, agressiva ou brilhante.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
              dotd.votingClosed
                ? 'bg-slate-800 text-slate-400 border-slate-700'
                : 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
            }`}>
              <span className={`w-2 h-2 rounded-full ${dotd.votingClosed ? 'bg-slate-500' : 'bg-emerald-400 animate-pulse'}`} />
              <span>{dotd.votingClosed ? 'Votação Encerrada' : 'Votação Aberta aos Usuários'}</span>
            </span>

            {isAdmin && (
              <button
                type="button"
                onClick={handleToggleCloseVoting}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {dotd.votingClosed ? <Unlock className="w-3 h-3 text-emerald-400" /> : <Lock className="w-3 h-3 text-amber-400" />}
                <span>{dotd.votingClosed ? 'Reabrir Votação' : 'Encerrar Votos'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Voting Drivers Grid */}
        <div className="p-4 sm:p-5 space-y-3">
          {sortedByVotes.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              Nenhum piloto com resultado registrado para votação nesta etapa.
            </div>
          ) : (
            sortedByVotes.map((driver) => {
              const driverVotes = dotd.votesByDriverId[driver.driverId] || 0;
              const votePercentage =
                dotd.totalVotes > 0 ? Math.round((driverVotes / dotd.totalVotes) * 100) : 0;
              const hasVotedForThis = userCurrentVote === driver.driverId;
              const isWinner = dotd.winnerDriverId === driver.driverId && driverVotes > 0;

              return (
                <div
                  key={driver.driverId}
                  className={`p-3 sm:p-3.5 rounded-xl border transition-all ${
                    isWinner
                      ? 'bg-amber-950/20 border-amber-500/40 ring-1 ring-amber-500/20'
                      : hasVotedForThis
                      ? 'bg-slate-900 border-red-500/50'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Driver Identity */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs font-mono shrink-0 ${
                        isWinner
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        #{driver.number}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-white truncate">
                            {driver.driverName}
                          </span>
                          {isWinner && (
                            <span className="text-[10px] font-black uppercase text-amber-300 bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <Trophy className="w-2.5 h-2.5 text-amber-400" />
                              Líder do DotD
                            </span>
                          )}
                          {hasVotedForThis && (
                            <span className="text-[10px] font-bold text-red-400 bg-red-950/60 border border-red-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <UserCheck className="w-2.5 h-2.5" />
                              Seu Voto
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{driver.teamName}</span>
                          <span>·</span>
                          <span className="text-slate-300">Chegou em P{driver.finishPosition}</span>
                          {driver.hasFastestLap && (
                            <>
                              <span>·</span>
                              <span className="text-purple-400 font-semibold">VR</span>
                            </>
                          )}
                          {driver.hasPole && (
                            <>
                              <span>·</span>
                              <span className="text-amber-400 font-semibold">Pole</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Voting Progress & Action */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-28 sm:w-36 text-right">
                        <div className="flex items-center justify-between text-xs font-bold mb-1">
                          <span className="text-slate-400 text-[10px]">
                            {driverVotes} {driverVotes === 1 ? 'voto' : 'votos'}
                          </span>
                          <span className="font-mono text-white">{votePercentage}%</span>
                        </div>
                        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              isWinner
                                ? 'bg-gradient-to-r from-amber-500 to-amber-300'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${votePercentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Vote Button */}
                      {!dotd.votingClosed && (
                        <button
                          type="button"
                          onClick={() => handleVote(driver.driverId)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            hasVotedForThis
                              ? 'bg-red-600 text-white shadow-md shadow-red-950'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                          }`}
                        >
                          {hasVotedForThis ? 'Votado ✓' : 'Votar'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
