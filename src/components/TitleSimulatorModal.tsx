import React, { useState, useMemo } from 'react';
import {
  X,
  Calculator,
  Trophy,
  Zap,
  Target,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Share2,
  Check,
  TrendingUp,
  Shield,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChampionships } from '../context/ChampionshipContext';
import { calculateTitleMathematics, simulateDriverScenario } from '../utils/titleDecider';
import { CountryFlag } from './CountryFlag';
import { getTeamCode } from '../data/f1Teams';

interface TitleSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDriverId?: string;
}

export const TitleSimulatorModal: React.FC<TitleSimulatorModalProps> = ({
  isOpen,
  onClose,
  defaultDriverId,
}) => {
  const { currentUser, users } = useAuth();
  const { activeChampionship } = useChampionships();

  const [activeTab, setActiveTab] = useState<'analyzer' | 'simulator'>('analyzer');
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [showEliminated, setShowEliminated] = useState(false);

  // Selected driver to analyze
  const titleMath = useMemo(() => {
    if (!activeChampionship) return null;
    return calculateTitleMathematics(activeChampionship, users);
  }, [activeChampionship, users]);

  // Initial target driver selection
  const [selectedDriverId, setSelectedDriverId] = useState<string>(() => {
    if (defaultDriverId) return defaultDriverId;
    if (currentUser?.id && titleMath?.contenders.some((c) => c.driverId === currentUser.id)) {
      return currentUser.id;
    }
    // Default to P2 if exists, or P1
    if (titleMath && titleMath.contenders.length > 1) {
      return titleMath.contenders[1].driverId;
    }
    return titleMath?.contenders[0]?.driverId || '';
  });

  // Selected rival to compare in simulator
  const [rivalDriverId, setRivalDriverId] = useState<string>(() => {
    if (titleMath && titleMath.contenders.length > 0) {
      return titleMath.contenders[0].driverId;
    }
    return '';
  });

  // Simulation state per remaining round
  const remainingStages = useMemo(() => {
    if (!activeChampionship) return [];
    return activeChampionship.stages.filter((s) => s.status !== 'Concluída');
  }, [activeChampionship]);

  const [targetSimStages, setTargetSimStages] = useState<
    Record<string, { finishPos: number; hasPole: boolean; hasFastestLap: boolean }>
  >(() => {
    const map: Record<string, { finishPos: number; hasPole: boolean; hasFastestLap: boolean }> = {};
    remainingStages.forEach((s) => {
      map[s.id] = { finishPos: 1, hasPole: false, hasFastestLap: false };
    });
    return map;
  });

  const [rivalSimStages, setRivalSimStages] = useState<
    Record<string, { finishPos: number; hasPole: boolean; hasFastestLap: boolean }>
  >(() => {
    const map: Record<string, { finishPos: number; hasPole: boolean; hasFastestLap: boolean }> = {};
    remainingStages.forEach((s) => {
      map[s.id] = { finishPos: 2, hasPole: false, hasFastestLap: false };
    });
    return map;
  });

  if (!isOpen || !activeChampionship || !titleMath) return null;

  const currentContender =
    titleMath.contenders.find((c) => c.driverId === selectedDriverId) ||
    titleMath.eliminated.find((c) => c.driverId === selectedDriverId) ||
    titleMath.contenders[0];

  const leaderContender = titleMath.contenders[0];

  // Simulation execution
  const simulationResult = simulateDriverScenario(
    activeChampionship,
    selectedDriverId,
    targetSimStages,
    rivalDriverId !== selectedDriverId ? rivalDriverId : undefined,
    rivalSimStages
  );

  // Quick preset apply
  const applyPreset = (preset: 'perfect' | 'podium' | 'worst' | 'dnf') => {
    const newTarget: Record<string, { finishPos: number; hasPole: boolean; hasFastestLap: boolean }> = {};
    const newRival: Record<string, { finishPos: number; hasPole: boolean; hasFastestLap: boolean }> = {};

    remainingStages.forEach((s) => {
      if (preset === 'perfect') {
        newTarget[s.id] = { finishPos: 1, hasPole: true, hasFastestLap: true };
        newRival[s.id] = { finishPos: 3, hasPole: false, hasFastestLap: false };
      } else if (preset === 'podium') {
        newTarget[s.id] = { finishPos: 2, hasPole: false, hasFastestLap: false };
        newRival[s.id] = { finishPos: 4, hasPole: false, hasFastestLap: false };
      } else if (preset === 'worst') {
        newTarget[s.id] = { finishPos: 1, hasPole: false, hasFastestLap: false };
        newRival[s.id] = { finishPos: 8, hasPole: false, hasFastestLap: false };
      } else if (preset === 'dnf') {
        newTarget[s.id] = { finishPos: 1, hasPole: true, hasFastestLap: false };
        newRival[s.id] = { finishPos: 0, hasPole: false, hasFastestLap: false };
      }
    });

    setTargetSimStages(newTarget);
    setRivalSimStages(newRival);
  };

  const handleCopySummary = () => {
    if (!currentContender) return;
    const text = `🏁 *APEX SIMULADOR DE TÍTULO - ${activeChampionship.name.toUpperCase()}*
Piloto Analisado: ${currentContender.driverName} (#${currentContender.number})
Posição Atual: ${currentContender.currentRank}º lugar (${currentContender.currentPoints} pts)
Diferença para Líder: ${currentContender.gapToLeader} pts
Etapas Restantes: ${titleMath.remainingStagesCount} (${titleMath.totalPointsRemaining} pts em jogo)
Pontuação Máxima Atingível: ${currentContender.maxPossiblePoints} pts
Status Matemático: ${currentContender.statusLabel}
Diagnóstico: ${currentContender.summaryText}
Simulado via ApexSim Manager 🏎️`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-[#0a0f18] border border-amber-900/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-900 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-950/40 font-bold">
              <Calculator className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Simulador & Decisor Matemático de Título</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white font-display">
                O que preciso para ser Campeão?
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              title="Copiar análise matemática para Discord/WhatsApp"
            >
              {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-amber-400" />}
              <span>{copiedSummary ? 'Copiado!' : 'Compartilhar'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Motorsport Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 sm:p-4 bg-slate-950/90 border-b border-slate-800/80 shrink-0 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Etapas Restantes</span>
            <div className="text-lg font-bold text-white font-mono mt-0.5">
              {titleMath.remainingStagesCount}{' '}
              <span className="text-xs text-slate-500 font-normal">/ {titleMath.totalStages}</span>
            </div>
            <div className="text-[10px] text-slate-400">
              {titleMath.completedStagesCount} concluídas
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Pontos em Disputa</span>
            <div className="text-lg font-bold text-amber-400 font-mono mt-0.5">
              +{titleMath.totalPointsRemaining} pts
            </div>
            <div className="text-[10px] text-slate-400">
              Máx. {titleMath.maxPointsPerRound} pts por rodada
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Pilotos com Chances</span>
            <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
              {titleMath.activeContendersCount}{' '}
              <span className="text-xs text-slate-500 font-normal">de {titleMath.contenders.length + titleMath.eliminated.length}</span>
            </div>
            <div className="text-[10px] text-slate-400">
              {titleMath.eliminated.length} matematicamente fora
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Status do Campeonato</span>
            <div className="text-xs font-bold text-white mt-1 truncate">
              {titleMath.isChampionDecided ? '🏆 Título Já Definido!' : '⚡ Disputa Aberta'}
            </div>
            <div className="text-[10px] text-amber-400/90 truncate">
              Líder: {leaderContender?.driverName || 'Sem líder'} ({leaderContender?.currentPoints || 0} pts)
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 px-4 pt-2 shrink-0">
          <button
            onClick={() => setActiveTab('analyzer')}
            className={`py-2 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'analyzer'
                ? 'border-amber-500 text-amber-400 bg-amber-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Diagnóstico do Piloto & Cenários</span>
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`py-2 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'simulator'
                ? 'border-amber-500 text-amber-400 bg-amber-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Simulador Etapa por Etapa</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* TAB 1: Analyzer ("O que preciso para ser campeão?") */}
          {activeTab === 'analyzer' && currentContender && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Pilot Selector Dropdown */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-amber-400 block">
                    Selecione o Piloto para Analisar:
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Veja exatamente o que cada competidor precisa somar para conquistar o título.
                  </p>
                </div>

                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-semibold cursor-pointer max-w-xs"
                >
                  <optgroup label="⚡ Pilotos na Disputa pelo Título">
                    {titleMath.contenders.map((c) => (
                      <option key={c.driverId} value={c.driverId}>
                        #{c.number} {c.driverName} ({c.currentPoints} pts · {c.currentRank}º)
                      </option>
                    ))}
                  </optgroup>
                  {titleMath.eliminated.length > 0 && (
                    <optgroup label="❌ Matematicamente Eliminados">
                      {titleMath.eliminated.map((c) => (
                        <option key={c.driverId} value={c.driverId}>
                          #{c.number} {c.driverName} ({c.currentPoints} pts)
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Spotlight Driver Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-950 border border-amber-800/40 relative overflow-hidden shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-500 flex flex-col items-center justify-center text-amber-300 font-black shadow-md">
                      <span className="text-[10px] text-amber-400 -mb-1">#{currentContender.number}</span>
                      <span className="text-lg">{currentContender.currentRank}º</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${currentContender.badgeColor}`}>
                          {currentContender.statusLabel}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          {currentContender.teamName}
                        </span>
                      </div>

                      <h3 className="text-xl sm:text-2xl font-black text-white font-display mt-0.5">
                        {currentContender.driverName}
                      </h3>
                      <div className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
                        <span><strong>{currentContender.currentPoints}</strong> pontos atuais</span>
                        <span>·</span>
                        <span><strong>{currentContender.wins}</strong> vitórias</span>
                        <span>·</span>
                        <span><strong>{currentContender.podiums}</strong> pódios</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-start sm:items-end justify-center bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Teto Máximo Atingível</span>
                    <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
                      {currentContender.maxPossiblePoints} pts
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {currentContender.gapToLeader === 0 ? 'Atual Líder' : `-${currentContender.gapToLeader} pts da liderança`}
                    </span>
                  </div>
                </div>

                {/* Natural Language Diagnosis */}
                <div className="mt-4 pt-4 border-t border-slate-800/80 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Diagnóstico da Disputa:</span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {currentContender.summaryText}
                  </p>
                </div>
              </div>

              {/* Requirement Scenarios Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Scenario 1 */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 mb-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Cenário de Vitória</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Se {currentContender.driverName} vencer as {titleMath.remainingStagesCount} etapas restantes com pole position, alcançará <strong>{currentContender.maxPossiblePoints} pontos</strong>.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800/60 text-[11px] text-emerald-400 font-semibold">
                    {currentContender.gapToLeader === 0
                      ? 'Garante o título matematicamente 100%'
                      : currentContender.maxPossiblePoints > (leaderContender?.currentPoints || 0)
                      ? 'Completamente viável para assumir a ponta'
                      : 'Eliminado matematicamente'}
                  </div>
                </div>

                {/* Scenario 2 */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5 mb-1.5">
                      <Target className="w-3.5 h-3.5 text-blue-400" />
                      <span>Desempenho dos Rivais</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {currentContender.gapToLeader === 0
                        ? `Precisa de no máximo ${currentContender.pointsNeededToGuarantee || 1} pontos adicionais para anular qualquer combinação do 2º colocado.`
                        : `O líder ${leaderContender?.driverName} pode somar no máximo ${Math.max(0, currentContender.maxPossiblePoints - (leaderContender?.currentPoints || 0) - 1)} pontos para permitir que ${currentContender.driverName} o ultrapasse.`}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800/60 text-[11px] text-slate-400">
                    Critério de desempate: Maior número de vitórias
                  </div>
                </div>

                {/* Scenario 3 */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-1.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Pontos de Segurança</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Com {titleMath.totalPointsRemaining} pontos restantes na mesa, cada corrida tem peso decisivo na pontuação acumulada.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800/60 text-[11px] text-amber-400 font-semibold">
                    Pole (+{titleMath.poleBonus}) e VR (+{titleMath.fastestLapBonus}) podem decidir o título!
                  </div>
                </div>
              </div>

              {/* All Contenders Standings Table */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
                <div className="p-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-red-500" />
                    <span>Pilotos com Chances Matemáticas ({titleMath.contenders.length})</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Ordenado por classificação atual
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-950/60 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800/80">
                        <th className="py-2.5 px-3">Pos</th>
                        <th className="py-2.5 px-3">Piloto & Equipe</th>
                        <th className="py-2.5 px-3 text-center">Pts Atuais</th>
                        <th className="py-2.5 px-3 text-center">Diferença</th>
                        <th className="py-2.5 px-3 text-center">Teto Máx.</th>
                        <th className="py-2.5 px-3 text-right">Status Matemático</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {titleMath.contenders.map((c) => {
                        const isSelected = c.driverId === selectedDriverId;
                        return (
                          <tr
                            key={c.driverId}
                            onClick={() => setSelectedDriverId(c.driverId)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-amber-950/30 hover:bg-amber-950/40 text-amber-200 font-medium'
                                : 'hover:bg-slate-800/40 text-slate-200'
                            }`}
                          >
                            <td className="py-2.5 px-3 font-mono font-bold">
                              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-md text-[11px] ${
                                c.currentRank === 1 ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
                              }`}>
                                {c.currentRank}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold flex items-center gap-1.5">
                                <span>#{c.number}</span>
                                <span>{c.driverName}</span>
                              </div>
                              <div className="text-[10px] text-slate-400">{c.teamName}</div>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-white">
                              {c.currentPoints}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                              {c.gapToLeader === 0 ? 'Líder' : `-${c.gapToLeader}`}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-400">
                              {c.maxPossiblePoints}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${c.badgeColor}`}>
                                {c.statusLabel}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Collapsible Eliminated List */}
                {titleMath.eliminated.length > 0 && (
                  <div className="border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowEliminated(!showEliminated)}
                      className="w-full py-2 px-3 text-xs text-slate-400 hover:text-white flex items-center justify-between bg-slate-950/40 cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
                        <span>Ver Pilotos Matematicamente Sem Chances ({titleMath.eliminated.length})</span>
                      </span>
                      {showEliminated ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {showEliminated && (
                      <div className="p-3 bg-slate-950/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {titleMath.eliminated.map((el) => (
                          <div
                            key={el.driverId}
                            className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 flex items-center justify-between text-slate-400"
                          >
                            <span>#{el.number} {el.driverName} ({el.currentPoints} pts)</span>
                            <span className="text-[10px] text-red-400 font-mono">Máx. {el.maxPossiblePoints} pts</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Stage-by-Stage Simulator */}
          {activeTab === 'simulator' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Presets and Controls */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Cenários Pré-Configurados Rápidos:
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Projete instantaneamente cenários perfeitos, pódios ou quebras de motor dos rivais.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => applyPreset('perfect')}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    🌟 Vitória em Todas
                  </button>
                  <button
                    onClick={() => applyPreset('podium')}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium cursor-pointer transition-colors"
                  >
                    🥈 Pódio Constante
                  </button>
                  <button
                    onClick={() => applyPreset('dnf')}
                    className="px-2.5 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800 text-xs font-medium cursor-pointer transition-colors"
                  >
                    ⚠️ Rival Abandona (DNF)
                  </button>
                  <button
                    onClick={() => applyPreset('worst')}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 cursor-pointer transition-colors"
                    title="Resetar"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Simulation Configuration Split */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Target Driver Config Column */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-400">Piloto Alvo:</span>
                      <h4 className="text-sm font-bold text-white">{currentContender?.driverName}</h4>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                      +{simulationResult.projectedStandings.find((p) => p.driverId === selectedDriverId)?.simulatedPointsAdded || 0} pts projetados
                    </span>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-slate-800">
                    {remainingStages.map((stage) => {
                      const cur = targetSimStages[stage.id] || { finishPos: 1, hasPole: false, hasFastestLap: false };
                      return (
                        <div
                          key={stage.id}
                          className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-white truncate flex items-center gap-1.5">
                              <CountryFlag flag={stage.trackFlag} country={stage.trackCountry} size="xs" />
                              <span>{stage.trackName}</span>
                            </div>
                            <div className="text-[10px] text-slate-400">Etapa {stage.roundNumber}</div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              value={cur.finishPos}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setTargetSimStages((prev) => ({
                                  ...prev,
                                  [stage.id]: { ...cur, finishPos: val },
                                }));
                              }}
                              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                            >
                              <option value={1}>P1 (25 pts)</option>
                              <option value={2}>P2 (18 pts)</option>
                              <option value={3}>P3 (15 pts)</option>
                              <option value={4}>P4 (12 pts)</option>
                              <option value={5}>P5 (10 pts)</option>
                              <option value={6}>P6 (8 pts)</option>
                              <option value={7}>P7 (6 pts)</option>
                              <option value={8}>P8 (4 pts)</option>
                              <option value={9}>P9 (2 pts)</option>
                              <option value={10}>P10 (1 pt)</option>
                              <option value={0}>Fora / DNF (0 pt)</option>
                            </select>

                            <label className="flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={cur.hasPole}
                                onChange={(e) =>
                                  setTargetSimStages((prev) => ({
                                    ...prev,
                                    [stage.id]: { ...cur, hasPole: e.target.checked },
                                  }))
                                }
                                className="rounded text-amber-500 focus:ring-0"
                              />
                              <span>Pole</span>
                            </label>

                            <label className="flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={cur.hasFastestLap}
                                onChange={(e) =>
                                  setTargetSimStages((prev) => ({
                                    ...prev,
                                    [stage.id]: { ...cur, hasFastestLap: e.target.checked },
                                  }))
                                }
                                className="rounded text-amber-500 focus:ring-0"
                              />
                              <span>VR</span>
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Rival Driver Config Column */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-red-400">Principal Rival:</span>
                      <select
                        value={rivalDriverId}
                        onChange={(e) => setRivalDriverId(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-white block mt-0.5 font-bold"
                      >
                        {titleMath.contenders.map((c) => (
                          <option key={c.driverId} value={c.driverId}>
                            #{c.number} {c.driverName} ({c.currentPoints} pts)
                          </option>
                        ))}
                      </select>
                    </div>

                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                      +{simulationResult.projectedStandings.find((p) => p.driverId === rivalDriverId)?.simulatedPointsAdded || 0} pts projetados
                    </span>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-slate-800">
                    {remainingStages.map((stage) => {
                      const cur = rivalSimStages[stage.id] || { finishPos: 2, hasPole: false, hasFastestLap: false };
                      return (
                        <div
                          key={stage.id}
                          className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-white truncate flex items-center gap-1.5">
                              <CountryFlag flag={stage.trackFlag} country={stage.trackCountry} size="xs" />
                              <span>{stage.trackName}</span>
                            </div>
                            <div className="text-[10px] text-slate-400">Etapa {stage.roundNumber}</div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              value={cur.finishPos}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setRivalSimStages((prev) => ({
                                  ...prev,
                                  [stage.id]: { ...cur, finishPos: val },
                                }));
                              }}
                              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-red-500 font-bold"
                            >
                              <option value={1}>P1 (25 pts)</option>
                              <option value={2}>P2 (18 pts)</option>
                              <option value={3}>P3 (15 pts)</option>
                              <option value={4}>P4 (12 pts)</option>
                              <option value={5}>P5 (10 pts)</option>
                              <option value={6}>P6 (8 pts)</option>
                              <option value={7}>P7 (6 pts)</option>
                              <option value={8}>P8 (4 pts)</option>
                              <option value={9}>P9 (2 pts)</option>
                              <option value={10}>P10 (1 pt)</option>
                              <option value={0}>Fora / DNF (0 pt)</option>
                            </select>

                            <label className="flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={cur.hasPole}
                                onChange={(e) =>
                                  setRivalSimStages((prev) => ({
                                    ...prev,
                                    [stage.id]: { ...cur, hasPole: e.target.checked },
                                  }))
                                }
                                className="rounded text-red-500 focus:ring-0"
                              />
                              <span>Pole</span>
                            </label>

                            <label className="flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={cur.hasFastestLap}
                                onChange={(e) =>
                                  setRivalSimStages((prev) => ({
                                    ...prev,
                                    [stage.id]: { ...cur, hasFastestLap: e.target.checked },
                                  }))
                                }
                                className="rounded text-red-500 focus:ring-0"
                              />
                              <span>VR</span>
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Projected Final Standings Output */}
              <div className="rounded-xl border border-amber-900/40 bg-gradient-to-br from-amber-950/20 via-slate-900 to-slate-950 p-4 sm:p-5 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <div>
                      <h4 className="text-sm font-bold text-white">Resultado Final Projetado da Simulação</h4>
                      <p className="text-[11px] text-slate-400">
                        Como fica a tabela após a realização de todas as etapas simuladas
                      </p>
                    </div>
                  </div>

                  {simulationResult.isTargetDriverChampion ? (
                    <div className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 animate-pulse">
                      <Trophy className="w-4 h-4" />
                      <span>{currentContender?.driverName} É CAMPEÃO! 🏆</span>
                    </div>
                  ) : (
                    <div className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs flex items-center gap-1.5">
                      <span>Termina em {simulationResult.targetDriverProjectedRank}º lugar</span>
                    </div>
                  )}
                </div>

                {/* Top 5 Projected Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-[10px] text-slate-400 uppercase font-bold border-b border-slate-800">
                        <th className="py-2 px-3">Pos Final</th>
                        <th className="py-2 px-3">Piloto</th>
                        <th className="py-2 px-3 text-center">Pts Atuais</th>
                        <th className="py-2 px-3 text-center">+ Simulados</th>
                        <th className="py-2 px-3 text-center font-bold text-white">Total Projetado</th>
                        <th className="py-2 px-3 text-right">Resultado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {simulationResult.projectedStandings.slice(0, 5).map((p) => {
                        const isTarget = p.driverId === selectedDriverId;
                        return (
                          <tr
                            key={p.driverId}
                            className={`${isTarget ? 'bg-amber-500/10 font-semibold text-amber-300' : 'text-slate-300'}`}
                          >
                            <td className="py-2 px-3 font-mono font-bold">
                              <span className={`inline-flex items-center justify-center w-5 h-5 rounded ${
                                p.isChampion ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
                              }`}>
                                {p.projectedRank}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              #{p.number} {p.driverName}
                            </td>
                            <td className="py-2 px-3 text-center font-mono text-slate-400">
                              {p.initialPoints}
                            </td>
                            <td className="py-2 px-3 text-center font-mono text-emerald-400">
                              +{p.simulatedPointsAdded}
                            </td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-white text-sm">
                              {p.projectedTotal}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {p.isChampion ? (
                                <span className="bg-amber-500/20 border border-amber-500 text-amber-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                                  Campeão 🏆
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500">{p.projectedRank}º Colocado</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Cálculos matemáticos oficiais atualizados com o regulamento da liga.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium cursor-pointer transition-colors"
          >
            Fechar Simulador
          </button>
        </div>
      </div>
    </div>
  );
};
