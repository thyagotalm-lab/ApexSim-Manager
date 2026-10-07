import React, { useState } from 'react';
import {
  X,
  Swords,
  Trophy,
  Zap,
  Shield,
  Flag,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Award,
  Share2,
  Copy,
  Check,
} from 'lucide-react';
import { User } from '../types';
import { useAuth } from '../context/AuthContext';
import { useChampionships } from '../context/ChampionshipContext';
import { getSimRatingTier } from '../utils/simRating';

interface HeadToHeadModalProps {
  initialDriverA?: User | null;
  initialDriverB?: User | null;
  onClose: () => void;
}

export const HeadToHeadModal: React.FC<HeadToHeadModalProps> = ({
  initialDriverA,
  initialDriverB,
  onClose,
}) => {
  const { currentUser, users } = useAuth();
  const { championships, activeChampionship } = useChampionships();

  // Pilot A defaults to initialDriverA or currentUser or first user
  const [driverAId, setDriverAId] = useState<string>(
    initialDriverA?.id || currentUser?.id || users[0]?.id || ''
  );

  // Pilot B defaults to initialDriverB or second user
  const [driverBId, setDriverBId] = useState<string>(
    initialDriverB?.id ||
      users.find((u) => u.id !== (initialDriverA?.id || currentUser?.id))?.id ||
      users[1]?.id ||
      users[0]?.id ||
      ''
  );

  const [copiedSummary, setCopiedSummary] = useState(false);

  const driverA = users.find((u) => u.id === driverAId) || users[0];
  const driverB = users.find((u) => u.id === driverBId) || users[1] || users[0];

  const handleSwapDrivers = () => {
    const temp = driverAId;
    setDriverAId(driverBId);
    setDriverBId(temp);
  };

  if (!driverA || !driverB) return null;

  const statsA = driverA.stats || {
    races: 0,
    wins: 0,
    podiums: 0,
    poles: 0,
    fastestLaps: 0,
    points: 0,
    dnfs: 0,
    safetyRating: 'B 3.50',
    simRating: 3000,
  };

  const statsB = driverB.stats || {
    races: 0,
    wins: 0,
    podiums: 0,
    poles: 0,
    fastestLaps: 0,
    points: 0,
    dnfs: 0,
    safetyRating: 'B 3.50',
    simRating: 3000,
  };

  const tierA = getSimRatingTier(statsA.simRating);
  const tierB = getSimRatingTier(statsB.simRating);

  const winRateA = statsA.races > 0 ? (statsA.wins / statsA.races) * 100 : 0;
  const winRateB = statsB.races > 0 ? (statsB.wins / statsB.races) * 100 : 0;

  const podiumRateA = statsA.races > 0 ? (statsA.podiums / statsA.races) * 100 : 0;
  const podiumRateB = statsB.races > 0 ? (statsB.podiums / statsB.races) * 100 : 0;

  const ppgA = statsA.races > 0 ? (statsA.points / statsA.races).toFixed(1) : '0.0';
  const ppgB = statsB.races > 0 ? (statsB.points / statsB.races).toFixed(1) : '0.0';

  const dnfRateA = statsA.races > 0 ? (statsA.dnfs / statsA.races) * 100 : 0;
  const dnfRateB = statsB.races > 0 ? (statsB.dnfs / statsB.races) * 100 : 0;

  // Calculate common head-to-head race results
  interface CommonRaceMatchup {
    championshipName: string;
    stageRound: number;
    trackName: string;
    trackFlag: string;
    posA: number | 'DNF';
    posB: number | 'DNF';
    winner: 'A' | 'B' | 'TIE';
  }

  const commonRaces: CommonRaceMatchup[] = [];
  let h2hWinsA = 0;
  let h2hWinsB = 0;

  // Search across all championships stages
  championships.forEach((champ) => {
    champ.stages.forEach((stage) => {
      if (stage.status === 'Concluída' && stage.results && stage.results.length > 0) {
        const resA = stage.results.find(
          (r) =>
            r.driverId === driverA.id ||
            r.driverName.toLowerCase().trim() === driverA.name.toLowerCase().trim()
        );
        const resB = stage.results.find(
          (r) =>
            r.driverId === driverB.id ||
            r.driverName.toLowerCase().trim() === driverB.name.toLowerCase().trim()
        );

        if (resA && resB) {
          const isDnfA = resA.status === 'DNF' || resA.status === 'DSQ';
          const isDnfB = resB.status === 'DNF' || resB.status === 'DSQ';

          let winner: 'A' | 'B' | 'TIE' = 'TIE';

          if (isDnfA && !isDnfB) {
            winner = 'B';
            h2hWinsB++;
          } else if (!isDnfA && isDnfB) {
            winner = 'A';
            h2hWinsA++;
          } else if (!isDnfA && !isDnfB) {
            if (resA.finishPosition < resB.finishPosition) {
              winner = 'A';
              h2hWinsA++;
            } else if (resB.finishPosition < resA.finishPosition) {
              winner = 'B';
              h2hWinsB++;
            }
          }

          commonRaces.push({
            championshipName: champ.name,
            stageRound: stage.roundNumber,
            trackName: stage.trackName,
            trackFlag: stage.trackFlag || '🏁',
            posA: isDnfA ? 'DNF' : resA.finishPosition,
            posB: isDnfB ? 'DNF' : resB.finishPosition,
            winner,
          });
        }
      }
    });
  });

  // Calculate metrics comparison
  const metrics = [
    {
      label: 'Sim Rating (Elo)',
      valA: statsA.simRating,
      valB: statsB.simRating,
      textA: `${statsA.simRating}`,
      textB: `${statsB.simRating}`,
      better: statsA.simRating > statsB.simRating ? 'A' : statsB.simRating > statsA.simRating ? 'B' : 'TIE',
    },
    {
      label: 'Safety Rating',
      valA: parseFloat(statsA.safetyRating.replace(/[^0-9.]/g, '')) || 3.5,
      valB: parseFloat(statsB.safetyRating.replace(/[^0-9.]/g, '')) || 3.5,
      textA: statsA.safetyRating,
      textB: statsB.safetyRating,
      better: statsA.safetyRating > statsB.safetyRating ? 'A' : statsB.safetyRating > statsA.safetyRating ? 'B' : 'TIE',
    },
    {
      label: 'Vitórias',
      valA: statsA.wins,
      valB: statsB.wins,
      textA: `${statsA.wins} (${winRateA.toFixed(1)}%)`,
      textB: `${statsB.wins} (${winRateB.toFixed(1)}%)`,
      better: statsA.wins > statsB.wins ? 'A' : statsB.wins > statsA.wins ? 'B' : 'TIE',
    },
    {
      label: 'Pódios',
      valA: statsA.podiums,
      valB: statsB.podiums,
      textA: `${statsA.podiums} (${podiumRateA.toFixed(1)}%)`,
      textB: `${statsB.podiums} (${podiumRateB.toFixed(1)}%)`,
      better: statsA.podiums > statsB.podiums ? 'A' : statsB.podiums > statsA.podiums ? 'B' : 'TIE',
    },
    {
      label: 'Pole Positions',
      valA: statsA.poles,
      valB: statsB.poles,
      textA: `${statsA.poles}`,
      textB: `${statsB.poles}`,
      better: statsA.poles > statsB.poles ? 'A' : statsB.poles > statsA.poles ? 'B' : 'TIE',
    },
    {
      label: 'Voltas Rápidas',
      valA: statsA.fastestLaps,
      valB: statsB.fastestLaps,
      textA: `${statsA.fastestLaps}`,
      textB: `${statsB.fastestLaps}`,
      better: statsA.fastestLaps > statsB.fastestLaps ? 'A' : statsB.fastestLaps > statsA.fastestLaps ? 'B' : 'TIE',
    },
    {
      label: 'Média Pontos / Corrida',
      valA: parseFloat(ppgA),
      valB: parseFloat(ppgB),
      textA: `${ppgA} pts`,
      textB: `${ppgB} pts`,
      better: parseFloat(ppgA) > parseFloat(ppgB) ? 'A' : parseFloat(ppgB) > parseFloat(ppgA) ? 'B' : 'TIE',
    },
    {
      label: 'Confiabilidade (Menor DNF)',
      valA: 100 - dnfRateA,
      valB: 100 - dnfRateB,
      textA: `${(100 - dnfRateA).toFixed(0)}%`,
      textB: `${(100 - dnfRateB).toFixed(0)}%`,
      better: (100 - dnfRateA) > (100 - dnfRateB) ? 'A' : (100 - dnfRateB) > (100 - dnfRateA) ? 'B' : 'TIE',
    },
  ];

  const totalPointsA = metrics.filter((m) => m.better === 'A').length;
  const totalPointsB = metrics.filter((m) => m.better === 'B').length;

  const handleCopyComparison = () => {
    const summary = `⚔️ **CONFRONTO DIRETO (H2H) — APEX SIM RACING**
🏎️ **${driverA.name}** vs **${driverB.name}**

🏁 **Duelo Direto em Corrida:** ${h2hWinsA} x ${h2hWinsB} ${
      h2hWinsA > h2hWinsB ? `(Vantagem ${driverA.name})` : h2hWinsB > h2hWinsA ? `(Vantagem ${driverB.name})` : '(Empate em Pista)'
    }
⚡ **Sim Rating:** ${statsA.simRating} vs ${statsB.simRating}
🥇 **Vitórias:** ${statsA.wins} vs ${statsB.wins}
🏆 **Pódios:** ${statsA.podiums} vs ${statsB.podiums}
⏱️ **Poles:** ${statsA.poles} vs ${statsB.poles}
📊 **Média Pontos:** ${ppgA} vs ${ppgB}

🔗 Comparado no Apex Sim Manager`;

    navigator.clipboard.writeText(summary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#080d16] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-950/80 border border-amber-700/60 text-amber-400">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                <span>Comparador Direto (Head-to-Head)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950 text-red-400 border border-red-800/60">
                  Rivalidade
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Análise comparativa de estatísticas, duelos em pista e consistência
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyComparison}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              title="Copiar resumo do duelo para WhatsApp/Discord"
            >
              {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSummary ? 'Copiado!' : 'Copiar Duelo'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Top Pilot Selection & Rivalry Banner */}
          <div className="relative rounded-2xl bg-gradient-to-r from-red-950/60 via-slate-950 to-blue-950/60 border border-slate-800 p-4 sm:p-6 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-11 items-center gap-4">
              {/* Pilot A */}
              <div className="md:col-span-5 flex items-center gap-3.5 bg-slate-900/70 p-3.5 rounded-xl border border-red-900/40">
                <div className="relative shrink-0">
                  <img
                    src={driverA.avatar}
                    alt={driverA.name}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-xl object-cover border-2 border-red-500 shadow-md"
                  />
                  <span className="absolute -bottom-1 -right-1 bg-red-600 text-white font-mono text-[10px] font-black px-1.5 py-0.2 rounded shadow">
                    #{driverA.racingNumber || 1}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">Piloto A</span>
                  <select
                    value={driverAId}
                    onChange={(e) => setDriverAId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white font-bold text-xs sm:text-sm rounded-lg px-2 py-1 mt-0.5 focus:outline-none focus:border-red-500 cursor-pointer truncate"
                  >
                    {users.map((u) => (
                      <option key={`a-${u.id}`} value={u.id} disabled={u.id === driverBId}>
                        {u.name} (#{u.racingNumber || 1})
                      </option>
                    ))}
                  </select>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                    <span className="font-mono text-amber-400 font-bold">{statsA.simRating} Elo</span>
                    <span>·</span>
                    <span>{driverA.country || 'Brasil 🇧🇷'}</span>
                  </div>
                </div>
              </div>

              {/* Center VS / Score & Swap Button */}
              <div className="md:col-span-1 flex flex-col items-center justify-center gap-1.5 py-2">
                <button
                  type="button"
                  onClick={handleSwapDrivers}
                  className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-transform active:rotate-180 cursor-pointer shadow-md"
                  title="Inverter pilotos"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-black font-mono tracking-wider text-amber-400">
                  VS
                </span>
              </div>

              {/* Pilot B */}
              <div className="md:col-span-5 flex items-center gap-3.5 bg-slate-900/70 p-3.5 rounded-xl border border-blue-900/40">
                <div className="relative shrink-0">
                  <img
                    src={driverB.avatar}
                    alt={driverB.name}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-xl object-cover border-2 border-blue-500 shadow-md"
                  />
                  <span className="absolute -bottom-1 -right-1 bg-blue-600 text-white font-mono text-[10px] font-black px-1.5 py-0.2 rounded shadow">
                    #{driverB.racingNumber || 2}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Piloto B</span>
                  <select
                    value={driverBId}
                    onChange={(e) => setDriverBId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white font-bold text-xs sm:text-sm rounded-lg px-2 py-1 mt-0.5 focus:outline-none focus:border-blue-500 cursor-pointer truncate"
                  >
                    {users.map((u) => (
                      <option key={`b-${u.id}`} value={u.id} disabled={u.id === driverAId}>
                        {u.name} (#{u.racingNumber || 1})
                      </option>
                    ))}
                  </select>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                    <span className="font-mono text-amber-400 font-bold">{statsB.simRating} Elo</span>
                    <span>·</span>
                    <span>{driverB.country || 'Brasil 🇧🇷'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Race Matchup Placar */}
            <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div>
                <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                  CONFRONTO DIRETO NA PISTA (CORRIDAS DISPUTADAS JUNTOS)
                </div>
                <div className="text-xs text-slate-300 mt-0.5">
                  {commonRaces.length > 0 ? (
                    <span>
                      Disputaram <strong>{commonRaces.length}</strong> etapas juntos na temporada
                    </span>
                  ) : (
                    <span className="text-slate-500">
                      Nenhuma etapa concluída com ambos os pilotos no mesmo grid ainda
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-800">
                <span className="text-sm font-bold text-red-400">{driverA.name.split(' ')[0]}</span>
                <span className="text-xl sm:text-2xl font-black font-mono text-white">
                  {h2hWinsA}
                </span>
                <span className="text-xs font-bold text-slate-500">x</span>
                <span className="text-xl sm:text-2xl font-black font-mono text-white">
                  {h2hWinsB}
                </span>
                <span className="text-sm font-bold text-blue-400">{driverB.name.split(' ')[0]}</span>
              </div>
            </div>
          </div>

          {/* Metrics Comparison Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Comparativo de Métricas & Desempenho</span>
              </h4>
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span className="text-red-400 font-bold">{totalPointsA} métricas</span>
                <span>vs</span>
                <span className="text-blue-400 font-bold">{totalPointsB} métricas</span>
              </div>
            </div>

            <div className="space-y-2">
              {metrics.map((m, idx) => {
                const total = Math.max(m.valA + m.valB, 1);
                const pctA = Math.round((m.valA / total) * 100);
                const pctB = 100 - pctA;

                return (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span
                        className={`font-mono font-bold flex items-center gap-1.5 ${
                          m.better === 'A' ? 'text-red-400 font-black' : 'text-slate-400'
                        }`}
                      >
                        {m.better === 'A' && <Flame className="w-3.5 h-3.5 text-red-500" />}
                        {m.textA}
                      </span>

                      <span className="text-slate-300 font-semibold text-[11px] uppercase tracking-wider">
                        {m.label}
                      </span>

                      <span
                        className={`font-mono font-bold flex items-center gap-1.5 ${
                          m.better === 'B' ? 'text-blue-400 font-black' : 'text-slate-400'
                        }`}
                      >
                        {m.textB}
                        {m.better === 'B' && <Flame className="w-3.5 h-3.5 text-blue-500" />}
                      </span>
                    </div>

                    {/* Comparative Dual Progress Bar */}
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden flex">
                      <div
                        className={`h-full transition-all duration-300 ${
                          m.better === 'A' ? 'bg-red-500' : 'bg-red-950'
                        }`}
                        style={{ width: `${pctA}%` }}
                      />
                      <div
                        className={`h-full transition-all duration-300 ${
                          m.better === 'B' ? 'bg-blue-500' : 'bg-blue-950'
                        }`}
                        style={{ width: `${pctB}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stage-by-Stage Breakdown (if any common races exist) */}
          {commonRaces.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Flag className="w-4 h-4 text-emerald-400" />
                <span>Histórico Duelo a Duelo nas Etapas</span>
              </h4>

              <div className="rounded-xl border border-slate-800 overflow-hidden divide-y divide-slate-800/80 bg-slate-950/60">
                {commonRaces.map((race, i) => (
                  <div key={i} className="p-3 flex items-center justify-between text-xs gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-xl shrink-0">{race.trackFlag}</span>
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">
                          {race.trackName} (Etapa {race.stageRound})
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {race.championshipName}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded ${
                            race.winner === 'A'
                              ? 'bg-red-950 text-red-400 border border-red-800'
                              : 'bg-slate-900 text-slate-400'
                          }`}
                        >
                          P{race.posA}
                        </span>
                      </div>

                      <span className="text-xs text-slate-600 font-bold">vs</span>

                      <div>
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded ${
                            race.winner === 'B'
                              ? 'bg-blue-950 text-blue-400 border border-blue-800'
                              : 'bg-slate-900 text-slate-400'
                          }`}
                        >
                          P{race.posB}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>Apex Sim Manager · Comparador H2H de Rivalidade</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
