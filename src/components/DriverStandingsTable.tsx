import React, { useState } from 'react';
import { Search, Trophy, Download, Award, Zap, AlertCircle, Image as ImageIcon, Swords, Sparkles, Calculator } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChampionships } from '../context/ChampionshipContext';
import { calculateDriverStandings } from '../utils/standings';
import { CountryFlag } from './CountryFlag';
import { getTeamCode } from '../data/f1Teams';
import { ExportStandingsModal } from './ExportStandingsModal';
import { TitleSimulatorModal } from './TitleSimulatorModal';
import { getSimRatingTier } from '../utils/simRating';
import { User } from '../types';

interface DriverStandingsTableProps {
  onOpenCardModal?: (driver?: User) => void;
  onOpenH2HModal?: (driverA?: User, driverB?: User) => void;
}

export const DriverStandingsTable: React.FC<DriverStandingsTableProps> = ({
  onOpenCardModal,
  onOpenH2HModal,
}) => {
  const { users, currentUser } = useAuth();
  const { activeChampionship } = useChampionships();
  const [searchTerm, setSearchTerm] = useState('');
  const [isExportImageModalOpen, setIsExportImageModalOpen] = useState(false);
  const [isTitleSimulatorOpen, setIsTitleSimulatorOpen] = useState(false);
  const [simulatorTargetDriverId, setSimulatorTargetDriverId] = useState<string | undefined>(undefined);

  if (!activeChampionship) {
    return (
      <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
        <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
        <h3 className="text-base font-bold text-white">Nenhum campeonato ativo no momento</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Crie seu próprio campeonato manualmente para acompanhar a classificação dos pilotos, poles, vitórias e pontuação automatizada.
        </p>
      </div>
    );
  }

  const standings = calculateDriverStandings(activeChampionship);
  const completedStages = activeChampionship.stages.filter(
    (s) => s.status === 'Concluída' && s.results && s.results.length > 0
  );

  const filteredStandings = standings.filter(
    (s) =>
      s.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.carModel.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportCSV = () => {
    const headers = ['Pos', 'Piloto', 'Numero', 'Equipe', 'Carro', ...activeChampionship.stages.map(s => `E${s.roundNumber}`), 'Vitorias', 'Podios', 'Pontos', 'Diferenca'];
    const rows = standings.map((s) => [
      s.rank,
      `"${s.driverName}"`,
      s.number,
      `"${s.isReserve || s.teamName.toLowerCase().includes('reserva') ? 'Reserva' : s.teamName}"`,
      `"${s.carModel}"`,
      ...activeChampionship.stages.map(stage => s.roundPoints[stage.roundNumber] !== undefined ? s.roundPoints[stage.roundNumber] : '-'),
      s.wins,
      s.podiums,
      s.totalPoints,
      `"${s.gap}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `classificacao_pilotos_${activeChampionship.slug}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3.5 sm:p-4 rounded-xl border border-slate-800 w-full overflow-hidden">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-red-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Classificação Geral de Pilotos</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white font-display mt-0.5 truncate">
            {activeChampionship.name}
          </h2>
          <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
            <span className="font-medium text-slate-300">{activeChampionship.simulator}</span>
            <span>·</span>
            <span>{completedStages.length}/{activeChampionship.stages.length} etapas</span>
            <span>·</span>
            <span className="text-slate-300 font-medium truncate max-w-full">Regra: {activeChampionship.scoringRule.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Live Search */}
          <div className="relative flex-1 sm:flex-initial">
            <input
              type="text"
              placeholder="Buscar piloto ou equipe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 w-full sm:w-56"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* Title Simulator Button */}
          <button
            onClick={() => {
              setSimulatorTargetDriverId(undefined);
              setIsTitleSimulatorOpen(true);
            }}
            title="Calculadora & Simulador Matemático de Título (O que preciso para ser campeão?)"
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-600/30 to-amber-700/40 hover:from-amber-600/50 hover:to-amber-700/50 border border-amber-500/70 text-amber-300 px-3 py-1.5 rounded-lg text-xs font-bold shadow-md shadow-amber-950/40 transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <Calculator className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Simulador de Título</span>
            <span className="sm:hidden">Título</span>
          </button>

          {onOpenH2HModal && (
            <button
              onClick={() => onOpenH2HModal()}
              title="Comparador Direto (Head-to-Head / Rivalidade)"
              className="flex items-center gap-1.5 bg-amber-950/70 hover:bg-amber-900 border border-amber-800/80 text-amber-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <Swords className="w-3.5 h-3.5 text-amber-400" />
              <span>Duelo H2H</span>
            </button>
          )}

          <button
            onClick={() => setIsExportImageModalOpen(true)}
            title="Exportar Tabela em Imagem HD (18:9 e 9:18)"
            className="flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md shadow-red-950/40 transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Exportar Imagem</span>
          </button>

          <button
            onClick={exportCSV}
            title="Exportar CSV da Tabela"
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {completedStages.length === 0 && (
        <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-3.5 sm:p-4 flex items-start gap-3 text-amber-200 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-amber-300">Nenhuma corrida concluída ainda</div>
            <p className="mt-0.5 text-amber-200/80 text-[11px] sm:text-xs">
              Lance os resultados na aba <strong>"Calendário"</strong> clicando em <strong>"Lançar Resultados"</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Mobile Standings Table - Fits 100% on Mobile Screen, No Text Outside */}
      <div className="block md:hidden rounded-xl border border-slate-800 bg-[#0c121e] overflow-hidden w-full shadow-lg">
        <table className="w-full text-left table-fixed">
          <thead className="bg-slate-900 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th scope="col" className="py-2.5 px-2 text-center w-10">Pos</th>
              <th scope="col" className="py-2.5 px-2 text-left w-auto">Piloto & Equipe</th>
              <th scope="col" className="py-2.5 px-1 text-center w-14">Vit/Pód</th>
              <th scope="col" className="py-2.5 px-2 text-right w-16">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono-numbers">
            {filteredStandings.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate-500 font-sans text-xs">
                  Nenhum piloto encontrado.
                </td>
              </tr>
            ) : (
              filteredStandings.map((driver) => {
                const isP1 = driver.rank === 1 && driver.totalPoints > 0;
                const isP2 = driver.rank === 2 && driver.totalPoints > 0;
                const isP3 = driver.rank === 3 && driver.totalPoints > 0;
                const userObj = users.find((u) => u.id === driver.driverId);

                return (
                  <tr
                    key={driver.driverId}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isP1
                        ? 'bg-gradient-to-r from-amber-500/12 via-amber-500/5 to-transparent border-l-2 border-amber-400'
                        : isP2
                        ? 'bg-gradient-to-r from-slate-200/10 via-slate-300/5 to-transparent border-l-2 border-slate-300'
                        : isP3
                        ? 'bg-gradient-to-r from-amber-800/15 via-amber-800/5 to-transparent border-l-2 border-amber-600'
                        : 'border-l-2 border-transparent'
                    }`}
                  >
                    {/* Rank Badge */}
                    <td className="py-2.5 px-1.5 text-center align-middle">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded font-mono font-bold text-xs ${
                          isP1
                            ? 'bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-slate-950 font-black shadow-md shadow-amber-950/50 ring-1 ring-amber-300/50'
                            : isP2
                            ? 'bg-gradient-to-br from-slate-100 via-slate-300 to-slate-400 text-slate-950 font-black shadow-md shadow-slate-900 ring-1 ring-white/50'
                            : isP3
                            ? 'bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 text-amber-100 font-black shadow-md shadow-amber-950 ring-1 ring-amber-500/40'
                            : 'text-slate-400 font-semibold'
                        }`}
                      >
                        {driver.rank}
                      </span>
                    </td>

                    {/* Driver Name & Team */}
                    <td className="py-2 px-2 font-sans align-middle overflow-hidden">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {userObj?.country && (
                          <div className="shrink-0">
                            <CountryFlag country={userObj.country} size="xs" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 font-bold text-white text-xs truncate leading-tight">
                            <span className="truncate">{driver.driverName}</span>
                            <span className="text-[10px] font-mono text-red-400 shrink-0">#{driver.number}</span>
                            {userObj?.stats && (() => {
                              const tier = getSimRatingTier(userObj.stats.simRating);
                              return (
                                <span className={`text-[8px] font-bold px-1 py-0.2 rounded border shrink-0 ${tier.badgeBg} ${tier.badgeBorder} ${tier.textColor}`}>
                                  {tier.name}
                                </span>
                              );
                            })()}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5 leading-tight flex items-center gap-1">
                            {driver.isReserve || driver.teamName.toLowerCase().includes('reserva') ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[10px] font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                Reserva
                              </span>
                            ) : (
                              <>
                                <span className="truncate">{driver.teamName}</span>
                                <span className="px-1 py-0.2 rounded bg-slate-800 font-mono text-[9px] font-bold text-amber-400 border border-slate-700 shrink-0">
                                  {getTeamCode(driver.teamName, activeChampionship.simulator)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Wins & Podiums */}
                    <td className="py-2 px-1 text-center align-middle font-mono-numbers text-[11px] text-slate-400 whitespace-nowrap">
                      <span className={driver.wins > 0 ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                        {driver.wins}v
                      </span>
                      <span className="text-slate-600 mx-0.5">/</span>
                      <span className={driver.podiums > 0 ? 'text-slate-300 font-medium' : 'text-slate-500'}>
                        {driver.podiums}p
                      </span>
                    </td>

                    {/* Total Points & Gap */}
                    <td className="py-2 px-2 text-right align-middle whitespace-nowrap">
                      <div className="font-bold text-white font-mono-numbers text-xs">
                        {driver.totalPoints}{' '}
                        <span className="text-[9px] text-slate-400 font-normal">pts</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono-numbers mt-0.5">
                        {driver.gap === 'Líder' ? (
                          <span className="text-amber-400 font-semibold">Líder</span>
                        ) : (
                          driver.gap
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

      {/* Desktop Standings Table - Hidden on mobile, shown on md+ screens */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-800 bg-[#0c121e]">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/90 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th scope="col" className="py-3 px-3 text-center w-12">Pos</th>
              <th scope="col" className="py-3 px-3">Piloto</th>
              <th scope="col" className="py-3 px-3">Equipe</th>
              {/* Dynamic Round Columns */}
              {activeChampionship.stages.map((stage) => (
                <th
                  key={stage.id}
                  scope="col"
                  className="py-3 px-2 text-center font-mono-numbers font-medium whitespace-nowrap"
                  title={`${stage.trackName} (${stage.status})`}
                >
                  <div className="text-[10px] text-slate-500">R{stage.roundNumber}</div>
                  <div className="flex justify-center mt-0.5">
                    <CountryFlag flag={stage.trackFlag} country={stage.trackCountry} size="xs" />
                  </div>
                </th>
              ))}
              <th scope="col" className="py-3 px-2.5 text-center font-medium">Vit</th>
              <th scope="col" className="py-3 px-2.5 text-center font-medium">Pód</th>
              <th scope="col" className="py-3 px-2.5 text-center font-medium">Pole</th>
              <th scope="col" className="py-3 px-2.5 text-center font-bold text-purple-400" title="Voltas Mais Rápidas (Purple Sector)">VR</th>
              <th scope="col" className="py-3 px-4 text-right font-bold text-white">Pontos</th>
              <th scope="col" className="py-3 px-3 text-right">Dif</th>
              <th scope="col" className="py-3 px-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono-numbers">
            {filteredStandings.length === 0 ? (
              <tr>
                <td colSpan={10 + activeChampionship.stages.length} className="py-8 text-center text-slate-500 font-sans text-xs">
                  Nenhum piloto encontrado para os filtros aplicados.
                </td>
              </tr>
            ) : (
              filteredStandings.map((driver) => {
                const isP1 = driver.rank === 1 && driver.totalPoints > 0;
                const isP2 = driver.rank === 2 && driver.totalPoints > 0;
                const isP3 = driver.rank === 3 && driver.totalPoints > 0;

                return (
                  <tr
                    key={driver.driverId}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isP1
                        ? 'bg-gradient-to-r from-amber-500/12 via-amber-500/5 to-transparent border-l-4 border-amber-400'
                        : isP2
                        ? 'bg-gradient-to-r from-slate-200/10 via-slate-300/5 to-transparent border-l-4 border-slate-300'
                        : isP3
                        ? 'bg-gradient-to-r from-amber-800/15 via-amber-800/5 to-transparent border-l-4 border-amber-600'
                        : 'border-l-4 border-transparent'
                    }`}
                  >
                    {/* Rank Badge */}
                    <td className="py-3 px-3 text-center">
                      {isP1 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-slate-950 font-black text-xs shadow-md shadow-amber-950/50 ring-1 ring-amber-300/50">
                          1
                        </span>
                      ) : isP2 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-slate-100 via-slate-300 to-slate-400 text-slate-950 font-black text-xs shadow-md shadow-slate-900 ring-1 ring-white/50">
                          2
                        </span>
                      ) : isP3 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 text-amber-100 font-black text-xs shadow-md shadow-amber-950 ring-1 ring-amber-500/40">
                          3
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">{driver.rank}</span>
                      )}
                    </td>

                    {/* Pilot Info */}
                    <td className="py-3 px-3 font-sans">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] font-bold text-red-400">
                          #{driver.number}
                        </span>
                        <div>
                          <div className="font-semibold text-white hover:text-red-400 transition-colors cursor-pointer flex items-center gap-1.5">
                            {driver.driverName}
                            {driver.wins > 0 && (
                              <span title={`${driver.wins} vitória(s)`}>
                                <Award className="w-3.5 h-3.5 text-amber-400 inline" />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Team */}
                    <td className="py-3 px-3 font-sans">
                      {driver.isReserve || driver.teamName.toLowerCase().includes('reserva') ? (
                        <div className="flex items-center">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-300 font-semibold text-xs tracking-wide shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                            Reserva
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-200 font-medium">{driver.teamName}</span>
                          <span className="inline-block px-1.5 py-0.2 rounded bg-slate-800 text-amber-400 font-mono text-[10px] font-bold border border-slate-700">
                            {getTeamCode(driver.teamName, activeChampionship.simulator)}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Stage points columns */}
                    {activeChampionship.stages.map((stage) => {
                      const pts = driver.roundPoints[stage.roundNumber];
                      const isCompleted = stage.status === 'Concluída';

                      return (
                        <td
                          key={stage.id}
                          className="py-3 px-2 text-center text-xs tabular-nums"
                        >
                          {isCompleted ? (
                            pts !== undefined ? (
                              <span
                                className={`font-semibold ${
                                  pts >= 25
                                    ? 'text-amber-400 font-bold'
                                    : pts >= 15
                                    ? 'text-emerald-400'
                                    : pts > 0
                                    ? 'text-slate-200'
                                    : 'text-slate-500'
                                }`}
                              >
                                {pts}
                              </span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )
                          ) : (
                            <span className="text-slate-700 font-light">·</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Wins */}
                    <td className="py-3 px-2.5 text-center tabular-nums text-slate-300">
                      {driver.wins > 0 ? (
                        <span className="text-amber-400 font-bold">{driver.wins}</span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>

                    {/* Podiums */}
                    <td className="py-3 px-2.5 text-center tabular-nums text-slate-300">
                      {driver.podiums}
                    </td>

                    {/* Poles */}
                    <td className="py-3 px-2.5 text-center tabular-nums">
                      {driver.poles > 0 ? (
                        <span className="font-bold text-amber-400 font-mono">{driver.poles}</span>
                      ) : (
                        <span className="text-slate-600 font-mono">0</span>
                      )}
                    </td>

                    {/* Fastest Laps */}
                    <td className="py-3 px-2.5 text-center tabular-nums">
                      {driver.fastestLaps > 0 ? (
                        <span className="font-bold text-purple-300 bg-purple-950/60 border border-purple-500/40 px-1.5 py-0.5 rounded text-[11px] font-mono shadow-sm">
                          {driver.fastestLaps}
                        </span>
                      ) : (
                        <span className="text-slate-600 font-mono">0</span>
                      )}
                    </td>

                    {/* Total Points */}
                    <td className="py-3 px-4 text-right tabular-nums">
                      <span className="text-sm font-extrabold text-white bg-slate-900 px-2.5 py-1 rounded-md border border-slate-700/80">
                        {driver.totalPoints}
                      </span>
                    </td>

                    {/* Gap to Leader */}
                    <td className="py-3 px-3 text-right tabular-nums text-slate-400 text-[11px]">
                      {driver.gap}
                    </td>

                    {/* Actions: Card and H2H */}
                    <td className="py-3 px-3 text-center font-sans">
                      <div className="flex items-center justify-center gap-1">
                        {onOpenH2HModal && (
                          <button
                            type="button"
                            onClick={() => {
                              const pilotUser = users.find(
                                (u) =>
                                  u.id === driver.driverId ||
                                  u.name.toLowerCase().trim() === driver.driverName.toLowerCase().trim()
                              );
                              onOpenH2HModal(currentUser || undefined, pilotUser);
                            }}
                            className="p-1 rounded bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-800/60 transition-colors cursor-pointer"
                            title={`Comparar H2H com ${driver.driverName}`}
                          >
                            <Swords className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onOpenCardModal && (
                          <button
                            type="button"
                            onClick={() => {
                              const pilotUser = users.find(
                                (u) =>
                                  u.id === driver.driverId ||
                                  u.name.toLowerCase().trim() === driver.driverName.toLowerCase().trim()
                              );
                              onOpenCardModal(pilotUser);
                            }}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                            title={`Gerar Card Oficial de ${driver.driverName}`}
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

      {/* Legend & Scoring Info Footer */}
      <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 overflow-hidden">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-slate-300">Critérios:</span>
          <span>1º Pontos</span>
          <span>·</span>
          <span>2º Vitórias</span>
          <span>·</span>
          <span>3º Pódios</span>
          <span>·</span>
          <span>4º Melhor Chegada</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeChampionship.scoringRule.poleBonus > 0 && (
            <span className="text-amber-400 font-semibold">+{activeChampionship.scoringRule.poleBonus} pt Pole</span>
          )}
          {activeChampionship.scoringRule.poleBonus > 0 && activeChampionship.scoringRule.fastestLapBonus > 0 && (
            <span>·</span>
          )}
          {activeChampionship.scoringRule.fastestLapBonus > 0 && (
            <span className="text-red-400 font-semibold">+{activeChampionship.scoringRule.fastestLapBonus} pt VR</span>
          )}
          {activeChampionship.scoringRule.poleBonus === 0 && activeChampionship.scoringRule.fastestLapBonus === 0 && (
            <span className="text-slate-500 italic">Sem bônus extra</span>
          )}
        </div>
      </div>

      <ExportStandingsModal
        isOpen={isExportImageModalOpen}
        onClose={() => setIsExportImageModalOpen(false)}
        type="drivers"
        championship={activeChampionship}
        driverStandings={standings}
      />

      <TitleSimulatorModal
        isOpen={isTitleSimulatorOpen}
        onClose={() => setIsTitleSimulatorOpen(false)}
        defaultDriverId={simulatorTargetDriverId}
      />
    </div>
  );
};
