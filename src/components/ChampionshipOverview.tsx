import React, { useState } from 'react';
import {
  Trophy,
  Shield,
  Calendar,
  Users,
  Flag,
  Award,
  Zap,
  Clock,
  ChevronRight,
  Sparkles,
  Gamepad2,
  CheckCircle2,
  AlertCircle,
  Car,
  TrendingUp,
  MapPin,
  ExternalLink,
  Lock,
  Calculator,
  Flame,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChampionships } from '../context/ChampionshipContext';
import { calculateDriverStandings, calculateConstructorStandings } from '../utils/standings';
import { calculateTitleMathematics } from '../utils/titleDecider';
import { CountryFlag } from './CountryFlag';
import { PdfRulesDownloadCard } from './PdfRulesDownloadCard';
import { TitleSimulatorModal } from './TitleSimulatorModal';
import { getTeamCode, getTeamsBySimulator } from '../data/f1Teams';
import { NavTab } from './FooterNavigation';

interface ChampionshipOverviewProps {
  onNavigateToTab: (tab: NavTab) => void;
  onOpenStageEditor?: (stage: any) => void;
  onOpenResultsModal?: (stage: any) => void;
}

export const ChampionshipOverview: React.FC<ChampionshipOverviewProps> = ({
  onNavigateToTab,
  onOpenResultsModal,
}) => {
  const { currentUser, users, openAuthModal } = useAuth();
  const { activeChampionship, isUserLeagueAdmin } = useChampionships();

  if (!currentUser) {
    return (
      <div className="p-8 sm:p-14 text-center bg-gradient-to-br from-slate-900 via-[#0d1424] to-slate-950 rounded-2xl border border-red-900/50 shadow-2xl space-y-6 max-w-2xl mx-auto my-8 animate-in fade-in">
        <div className="h-16 w-16 mx-auto rounded-2xl bg-red-950/80 border border-red-800 flex items-center justify-center text-red-500 shadow-xl shadow-red-950/40">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <div className="text-xs uppercase font-bold tracking-wider text-red-400">
            Acesso Restrito
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
            Área Exclusiva para Pilotos & Administradores
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Os campeonatos e ligas oficiais criados são visíveis apenas para pilotos cadastrados e autenticados ou administradores das respectivas ligas.
          </p>
        </div>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={openAuthModal}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-red-950 transition-all cursor-pointer"
          >
            Fazer Login ou Cadastrar-se
          </button>
        </div>
      </div>
    );
  }

  if (!activeChampionship) {
    return (
      <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
        <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
        <h3 className="text-base font-bold text-white">Nenhum campeonato selecionado</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Selecione ou crie um campeonato na barra superior para ver a visão geral completa da liga.
        </p>
      </div>
    );
  }

  const driverStandings = calculateDriverStandings(activeChampionship);
  const constructorStandings = calculateConstructorStandings(activeChampionship);

  const completedStages = activeChampionship.stages.filter(
    (s) => s.status === 'Concluída' && s.results && s.results.length > 0
  );

  const upcomingStages = activeChampionship.stages.filter(
    (s) => s.status !== 'Concluída'
  );

  const nextStage = upcomingStages[0] || null;
  const lastCompletedStage = completedStages.length > 0 ? completedStages[completedStages.length - 1] : null;

  const approvedRegistrations = activeChampionship.registrations.filter((r) => r.status === 'APROVADO');
  const pendingRegistrations = activeChampionship.registrations.filter((r) => r.status === 'PENDENTE');

  const officialTeams = getTeamsBySimulator(activeChampionship.simulator);
  const getTeamColor = (teamName: string) => {
    const found = officialTeams.find((t) => t.name === teamName || t.shortName === teamName);
    return found ? found.color : '#e10600';
  };

  const leaderDriver = driverStandings.length > 0 ? driverStandings[0] : null;
  const leaderConstructor = constructorStandings.length > 0 ? constructorStandings[0] : null;
  const leaderUser = leaderDriver ? users.find((u) => u.id === leaderDriver.driverId) : null;

  const userRegistration = currentUser
    ? activeChampionship.registrations.find((r) => r.userId === currentUser.id)
    : null;

  const isAdmin = currentUser ? isUserLeagueAdmin(activeChampionship.id, currentUser.id) : false;

  const occupancyRate = Math.round((approvedRegistrations.length / activeChampionship.maxGrid) * 100);
  const [isTitleSimulatorOpen, setIsTitleSimulatorOpen] = useState(false);
  const titleMath = calculateTitleMathematics(activeChampionship);

  return (
    <div className="space-y-6">
      {/* 1. Hero Card: Championship identity, status & quick stats */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-[#0c121e] to-slate-950 p-5 sm:p-7 shadow-2xl">
        {/* Subtle accent glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider bg-red-950/80 text-red-400 border border-red-800/80 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                <Gamepad2 className="w-3.5 h-3.5 text-red-500" />
                {activeChampionship.simulator}
              </span>

              <span className="text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-0.5 rounded-full">
                {activeChampionship.category}
              </span>

              <span className="text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700 px-2.5 py-0.5 rounded-full">
                Temporada {activeChampionship.season}
              </span>

              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  activeChampionship.status === 'Em Andamento'
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80'
                    : activeChampionship.status === 'Inscrições Abertas'
                    ? 'bg-blue-950/80 text-blue-400 border-blue-800/80'
                    : 'bg-amber-950/80 text-amber-400 border-amber-800/80'
                }`}
              >
                {activeChampionship.status}
              </span>

              {activeChampionship.defaultRaceDay && (
                <span className="text-[11px] font-semibold bg-red-950/40 text-red-300 border border-red-900/60 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-red-400" />
                  Corridas às {activeChampionship.defaultRaceDay}s {activeChampionship.recurrence ? `(${activeChampionship.recurrence})` : ''}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
              {activeChampionship.name}
            </h1>

            {activeChampionship.description && (
              <p className="text-xs sm:text-sm text-slate-300/90 max-w-3xl leading-relaxed">
                {activeChampionship.description}
              </p>
            )}
          </div>

          {/* Quick Registration Status or Action Button */}
          <div className="shrink-0 flex items-center gap-2">
            {currentUser && !isAdmin && (
              userRegistration ? (
                <div className="bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-medium">Sua Inscrição</div>
                    <div
                      className={`font-bold ${
                        userRegistration.status === 'APROVADO'
                          ? 'text-emerald-400'
                          : userRegistration.status === 'PENDENTE'
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }`}
                    >
                      {userRegistration.status === 'APROVADO' ? 'Piloto Homologado' : 'Aguardando Aprovação'} · #{userRegistration.carNumber}
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => onNavigateToTab('pilots')}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-red-950 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Car className="w-4 h-4" />
                  <span>Inscrever-se no Grid</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Highlight Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-slate-800/80">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-red-400" />
              Etapas Disputadas
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono-numbers text-white mt-1">
              {completedStages.length} <span className="text-sm font-normal text-slate-500">/ {activeChampionship.stages.length}</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {upcomingStages.length} restantes
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              Pilotos Homologados
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono-numbers text-white mt-1">
              {approvedRegistrations.length} <span className="text-sm font-normal text-slate-500">/ {activeChampionship.maxGrid}</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {occupancyRate}% grid ocupado
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              Equipes no Grid
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono-numbers text-white mt-1">
              {constructorStandings.length}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {officialTeams.length} oficiais na liga
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              Sistema de Pontos
            </span>
            <div className="text-sm font-bold text-white mt-1 truncate" title={activeChampionship.scoringRule.name}>
              {activeChampionship.scoringRule.positions[0] || 25} pts P1
            </div>
            <div className="text-[10px] text-emerald-400 mt-0.5">
              +{activeChampionship.scoringRule.poleBonus} Pole · +{activeChampionship.scoringRule.fastestLapBonus} VR
            </div>
          </div>
        </div>
      </div>

      {/* Official League Rules & PDF Download Section */}
      {(activeChampionship.rulesPdfUrl || activeChampionship.rulesDoc) && (
        <PdfRulesDownloadCard
          rulesPdfUrl={activeChampionship.rulesPdfUrl}
          rulesPdfName={activeChampionship.rulesPdfName}
          rulesPdfSize={activeChampionship.rulesPdfSize}
          rulesDoc={activeChampionship.rulesDoc}
          championshipName={activeChampionship.name}
          simulator={activeChampionship.simulator}
          variant="overview"
        />
      )}

      {/* 2. Spotlight Leaders: Current Championship Leaders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Driver Leader Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-950/30 via-slate-900/90 to-slate-950 border border-amber-800/40 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Líder do Mundial de Pilotos</span>
              </div>
              <button
                onClick={() => onNavigateToTab('standings-drivers')}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Tabela Completa</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {leaderDriver && leaderDriver.totalPoints > 0 ? (
              <div className="flex items-center gap-4 mt-2">
                <div className="relative">
                  {leaderUser?.avatar ? (
                    <img
                      src={leaderUser.avatar}
                      alt={leaderDriver.driverName}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border-2 border-amber-500 shadow-md"
                    />
                  ) : (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center text-amber-300 font-bold text-xl">
                      #{leaderDriver.number}
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                    1
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-base sm:text-lg text-white font-display truncate">
                      {leaderDriver.driverName}
                    </span>
                    {leaderUser?.country && (
                      <CountryFlag country={leaderUser.country} size="xs" />
                    )}
                  </div>

                  <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                    {leaderDriver.isReserve || leaderDriver.teamName.toLowerCase().includes('reserva') ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 font-semibold text-[10px]">
                        <span className="w-1 h-1 rounded-full bg-amber-400" /> Reserva
                      </span>
                    ) : (
                      <>
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: getTeamColor(leaderDriver.teamName) }}
                        />
                        <span className="truncate">{leaderDriver.teamName}</span>
                      </>
                    )}
                    <span className="text-red-400 font-mono font-bold">#{leaderDriver.number}</span>
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-300">
                    <span className="font-mono-numbers">
                      <strong className="text-amber-400">{leaderDriver.wins}</strong> vitórias
                    </span>
                    <span>·</span>
                    <span className="font-mono-numbers">
                      <strong className="text-slate-200">{leaderDriver.podiums}</strong> pódios
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono-numbers">
                    {leaderDriver.totalPoints}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                    Pontos Totais
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-slate-500 text-xs">
                Nenhuma corrida disputada ainda. A liderança será definida após a 1ª etapa!
              </div>
            )}
          </div>
        </div>

        {/* Constructor Leader Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-red-950/30 via-slate-900/90 to-slate-950 border border-red-800/40 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-400">
                <Shield className="w-4 h-4 text-red-400" />
                <span>Líder do Mundial de Construtores</span>
              </div>
              <button
                onClick={() => onNavigateToTab('standings-teams')}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Tabela Completa</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {leaderConstructor && leaderConstructor.totalPoints > 0 ? (
              <div className="flex items-center gap-4 mt-2">
                <div
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center font-display font-black text-xl text-white shadow-md border border-slate-700/80 relative"
                  style={{ backgroundColor: `${getTeamColor(leaderConstructor.teamName)}33` }}
                >
                  <span
                    className="absolute top-0 left-0 bottom-0 w-1.5 rounded-l-xl"
                    style={{ backgroundColor: getTeamColor(leaderConstructor.teamName) }}
                  />
                  <span>{getTeamCode(leaderConstructor.teamName, activeChampionship.simulator)}</span>
                  <span className="absolute -bottom-1 -right-1 bg-red-500 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                    1
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="font-extrabold text-base sm:text-lg text-white font-display truncate">
                    {leaderConstructor.teamName}
                  </div>

                  <div className="text-xs text-slate-400 mt-0.5 truncate">
                    {leaderConstructor.driverNames.slice(0, 2).join(' · ') || 'Escuderia Oficial'}
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-300">
                    <span className="font-mono-numbers">
                      <strong className="text-red-400">{leaderConstructor.wins}</strong> vitórias
                    </span>
                    <span>·</span>
                    <span className="font-mono-numbers">
                      <strong className="text-slate-200">{leaderConstructor.podiums}</strong> pódios
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-2xl sm:text-3xl font-extrabold text-red-400 font-mono-numbers">
                    {leaderConstructor.totalPoints}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                    Pontos Totais
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-slate-500 text-xs">
                Classificação de construtores será calculada com o resultado da 1ª etapa!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2.5 Motorsport Innovations: Calculadora de Título & Piloto do Dia */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Title Decider / Simulator Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-950/30 via-slate-900/90 to-slate-950 border border-amber-800/40 relative overflow-hidden flex flex-col justify-between shadow-xl">
          <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Calculator className="w-3 h-3 text-amber-400" />
                Simulador Matemático de Título
              </span>
              <span className="text-xs text-amber-300 font-mono font-bold">
                {titleMath.totalPointsRemaining} pts em jogo
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-black text-white font-display">
              O que preciso para ser Campeão?
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {titleMath.isChampionDecided
                ? '🏆 O título já possui um campeão matemático antecipado garantido!'
                : `Existem ${titleMath.activeContendersCount} pilotos com chances matemáticas reais de título nas ${titleMath.remainingStagesCount} etapas restantes.`}
            </p>

            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-800/80">
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <Flame className="w-3 h-3" />
                {leaderDriver ? `${leaderDriver.driverName} lidera por ${titleMath.contenders[0]?.gapToLeader === 0 ? (leaderDriver.totalPoints - (driverStandings[1]?.totalPoints || 0)) : 0} pts` : 'Temporada em aberto'}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 flex items-center justify-between border-t border-slate-800/80">
            <span className="text-[11px] text-slate-400">Projeção de vitórias & descartes</span>
            <button
              type="button"
              onClick={() => setIsTitleSimulatorOpen(true)}
              className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs px-4 py-2 rounded-xl shadow-lg shadow-amber-950 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Simular Título</span>
            </button>
          </div>
        </div>

        {/* Driver of the Day & Community Trophies Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-purple-950/30 via-slate-900/90 to-slate-950 border border-purple-800/40 relative overflow-hidden flex flex-col justify-between shadow-xl">
          <div className="absolute top-0 right-0 w-36 h-36 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Trophy className="w-3 h-3 text-purple-400" />
                Piloto do Dia & Troféus da Comunidade
              </span>
              {lastCompletedStage?.communityTrophies?.driverOfTheDay ? (
                <span className="text-xs text-purple-300 font-mono font-bold">
                  {lastCompletedStage.communityTrophies.driverOfTheDay.totalVotes} votos
                </span>
              ) : null}
            </div>

            <h3 className="text-base sm:text-lg font-black text-white font-display">
              {lastCompletedStage
                ? `Destaques da Etapa: ${lastCompletedStage.trackName}`
                : 'Votação Popular de Piloto do Dia'}
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {lastCompletedStage?.communityTrophies?.driverOfTheDay?.winnerDriverName
                ? `Líder da votação da etapa: ${lastCompletedStage.communityTrophies.driverOfTheDay.winnerDriverName}. Vote no competidor mais espetacular da corrida.`
                : 'Votação aberta após o término de cada corrida para eleger o Piloto do Dia e os reis das ultrapassagens.'}
            </p>

            {lastCompletedStage && (
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-[11px]">
                <div className="p-1.5 rounded bg-slate-950/60 border border-slate-800/80">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Piloto do Dia (DotD)</span>
                  <span className="font-bold text-amber-300 truncate block">
                    {lastCompletedStage.communityTrophies?.driverOfTheDay?.winnerDriverName || 'Votação em aberto'}
                  </span>
                </div>
                <div className="p-1.5 rounded bg-slate-950/60 border border-slate-800/80">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Maior Escalada</span>
                  <span className="font-bold text-emerald-300 truncate block">
                    {lastCompletedStage.communityTrophies?.mostOvertakesCount
                      ? `+${lastCompletedStage.communityTrophies.mostOvertakesCount} posições ganhas`
                      : 'Troféu Oficial'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 flex items-center justify-between border-t border-slate-800/80">
            <span className="text-[11px] text-slate-400">Votação aberta aos pilotos</span>
            <button
              type="button"
              onClick={() => {
                if (lastCompletedStage && onOpenResultsModal) {
                  onOpenResultsModal(lastCompletedStage);
                } else {
                  onNavigateToTab('calendar');
                }
              }}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-lg shadow-purple-950 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>{lastCompletedStage ? 'Votar / Ver Troféus' : 'Ver Calendário'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Next Stage Spotlight & Stage Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Next Stage Card (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-red-400" />
              <span>Próxima Etapa no Calendário</span>
            </h3>
            <button
              onClick={() => onNavigateToTab('calendar')}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Ver Calendário Completo</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {nextStage ? (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <span className="text-3xl sm:text-4xl shrink-0 mt-0.5">
                  {nextStage.trackFlag || '🏁'}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-red-950 text-red-400 font-mono text-[10px] font-bold border border-red-800/60">
                      RODADA {nextStage.roundNumber}
                    </span>
                    <span className="text-xs text-slate-400">
                      {nextStage.trackCountry}
                    </span>
                  </div>

                  <h4 className="text-base sm:text-lg font-bold text-white font-display mt-1">
                    {nextStage.trackName}
                  </h4>

                  <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                    <span className="flex items-center gap-1 text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {nextStage.date} às {nextStage.time}
                    </span>
                    {nextStage.circuitLength && (
                      <span>· {nextStage.circuitLength}</span>
                    )}
                    <span>· {nextStage.weather}</span>
                  </div>

                  <div className="text-[11px] text-amber-400 font-medium mt-1.5 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>{nextStage.format}</span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 self-end sm:self-center">
                <button
                  onClick={() => onNavigateToTab('calendar')}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Detalhes da Etapa</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500 text-xs bg-slate-950 rounded-xl border border-slate-800/80">
              Todas as etapas deste campeonato já foram concluídas!
            </div>
          )}

          {/* Last Completed Stage Info if any */}
          {lastCompletedStage && (
            <div className="pt-3 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-2">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Última corrida realizada: <strong>{lastCompletedStage.trackName}</strong> (Etapa {lastCompletedStage.roundNumber})</span>
              </span>
              <button
                onClick={() => onNavigateToTab('calendar')}
                className="text-red-400 hover:text-red-300 font-semibold cursor-pointer"
              >
                Ver Classificação da Prova →
              </button>
            </div>
          )}
        </div>

        {/* Grid Capacity & Quick Access (1 col) */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Ocupação do Grid</span>
              </h3>
              <span className="text-xs font-mono text-white font-bold">
                {approvedRegistrations.length}/{activeChampionship.maxGrid}
              </span>
            </div>

            <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800 my-2">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  approvedRegistrations.length >= activeChampionship.maxGrid
                    ? 'bg-red-500'
                    : 'bg-gradient-to-r from-red-600 to-emerald-500'
                }`}
                style={{ width: `${Math.min(100, occupancyRate)}%` }}
              />
            </div>

            <div className="text-[11px] text-slate-400 flex items-center justify-between mt-1">
              <span>{Math.max(0, activeChampionship.maxGrid - approvedRegistrations.length)} vagas livres</span>
              {pendingRegistrations.length > 0 && (
                <span className="text-amber-400 font-semibold">{pendingRegistrations.length} na fila</span>
              )}
            </div>

            {/* Quick Navigation Buttons */}
            <div className="space-y-2 mt-4 pt-3 border-t border-slate-800/80">
              <button
                onClick={() => onNavigateToTab('pilots')}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-xs text-slate-200 font-medium flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Car className="w-3.5 h-3.5 text-red-400" />
                  <span>Grid de Largada & Pilotos</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </button>

              <button
                onClick={() => onNavigateToTab('championships')}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-xs text-slate-200 font-medium flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Award className="w-3.5 h-3.5 text-red-400" />
                  <span>Trocar ou Ver Todos os Campeonatos</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </button>

              <button
                onClick={() => onNavigateToTab('sim-rating')}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-xs text-slate-200 font-medium flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ranking Oficial Sim Rating</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Mini Top 5 Standings Preview */}
      {driverStandings.length > 0 && (
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Top 5 Pilotos na Disputa pelo Título</span>
            </h3>
            <button
              onClick={() => onNavigateToTab('standings-drivers')}
              className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Ver Tabela Completa</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
            {driverStandings.slice(0, 5).map((driver) => {
              const u = users.find((usr) => usr.id === driver.driverId);
              return (
                <div
                  key={driver.driverId}
                  className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                    driver.rank === 1
                      ? 'bg-gradient-to-br from-amber-950/40 via-slate-950 to-slate-950 border-amber-500/50 shadow-md shadow-amber-950/30'
                      : driver.rank === 2
                      ? 'bg-gradient-to-br from-slate-900/80 via-slate-950 to-slate-950 border-slate-400/50 shadow-md shadow-slate-900/50'
                      : driver.rank === 3
                      ? 'bg-gradient-to-br from-amber-950/30 via-slate-950 to-slate-950 border-amber-700/50 shadow-md shadow-amber-950/20'
                      : 'bg-slate-950/80 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center font-mono ${
                        driver.rank === 1
                          ? 'bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-slate-950 font-black shadow-sm ring-1 ring-amber-300/40'
                          : driver.rank === 2
                          ? 'bg-gradient-to-br from-slate-100 via-slate-300 to-slate-400 text-slate-950 font-black shadow-sm ring-1 ring-white/50'
                          : driver.rank === 3
                          ? 'bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 text-amber-100 font-black shadow-sm ring-1 ring-amber-500/40'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {driver.rank}
                    </span>
                    <span className="font-mono text-red-400 font-bold text-xs">
                      #{driver.number}
                    </span>
                  </div>

                  <div className="my-2">
                    <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                      {u?.country && <CountryFlag country={u.country} size="xs" />}
                      <span className="truncate">{driver.driverName}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      {driver.isReserve || driver.teamName.toLowerCase().includes('reserva') ? (
                        <span className="text-amber-300 font-semibold">Reserva</span>
                      ) : (
                        driver.teamName
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-800/60 font-mono tabular-nums">
                    <span className="text-[10px] text-slate-400">{driver.wins} vitórias</span>
                    <span className="font-bold text-white">{driver.totalPoints} pts</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Title Simulator Modal */}
      <TitleSimulatorModal
        isOpen={isTitleSimulatorOpen}
        onClose={() => setIsTitleSimulatorOpen(false)}
      />
    </div>
  );
};
