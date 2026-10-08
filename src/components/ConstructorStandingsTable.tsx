import React, { useState } from 'react';
import { Shield, Trophy, Users, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChampionships } from '../context/ChampionshipContext';
import { calculateConstructorStandings } from '../utils/standings';
import { CountryFlag } from './CountryFlag';
import { getTeamsBySimulator, getTeamCode } from '../data/f1Teams';
import { ExportStandingsModal } from './ExportStandingsModal';

export const ConstructorStandingsTable: React.FC = () => {
  const { users } = useAuth();
  const { activeChampionship } = useChampionships();
  const [isExportImageModalOpen, setIsExportImageModalOpen] = useState(false);

  if (!activeChampionship) {
    return (
      <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
        <Shield className="w-12 h-12 text-slate-600 mx-auto" />
        <h3 className="text-base font-bold text-white">Nenhum campeonato ativo no momento</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Crie seu próprio campeonato manualmente para visualizar a classificação de construtores e equipes.
        </p>
      </div>
    );
  }

  const constructorStandings = calculateConstructorStandings(activeChampionship, users);
  const completedStages = activeChampionship.stages.filter(
    (s) => s.status === 'Concluída' && s.results && s.results.length > 0
  );

  const officialTeams = getTeamsBySimulator(activeChampionship.simulator);
  const getTeamColor = (teamName: string) => {
    const found = officialTeams.find((t) => t.name === teamName || t.shortName === teamName);
    return found ? found.color : '#e10600';
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3.5 sm:p-4 rounded-xl border border-slate-800 w-full overflow-hidden">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-red-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>Campeonato de Construtores & Equipes</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white font-display mt-0.5 truncate">
            {activeChampionship.name}
          </h2>
          <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
            <span className="font-medium text-slate-300">{constructorStandings.length} Equipes</span>
            <span>·</span>
            <span>{completedStages.length}/{activeChampionship.stages.length} etapas disputadas</span>
            <span>·</span>
            <span className="text-slate-300 font-medium">Pontuação conjunta de pilotos</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsExportImageModalOpen(true)}
            title="Exportar Tabela de Construtores em Imagem HD (18:9 e 9:18)"
            className="flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md shadow-red-950/40 transition-all cursor-pointer whitespace-nowrap"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Exportar Imagem</span>
          </button>
        </div>
      </div>

      {/* Constructor Podium Top 3 Cards - Desktop and Tablet */}
      <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {constructorStandings.slice(0, 3).map((team, idx) => (
          <div
            key={team.teamName}
            className={`p-4 rounded-xl border relative overflow-hidden flex flex-col justify-between ${
              idx === 0
                ? 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border-amber-500/50 shadow-lg shadow-amber-950/30'
                : idx === 1
                ? 'bg-slate-900/90 border-slate-700/80'
                : 'bg-slate-900/60 border-slate-800'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {idx === 0 ? '🏆 Líder do Campeonato' : idx === 1 ? '🥈 2º Lugar' : '🥉 3º Lugar'}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <h3 className="text-lg font-bold text-white truncate">{team.teamName}</h3>
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-[11px] font-bold text-amber-400 border border-slate-700 shrink-0">
                    {getTeamCode(team.teamName, activeChampionship.simulator)}
                  </span>
                </div>
              </div>
              <div className="text-2xl font-black font-mono-numbers text-white bg-slate-950/80 px-3 py-1 rounded-lg border border-slate-800 shrink-0 ml-2">
                {team.totalPoints} <span className="text-xs font-normal text-slate-400">pts</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2 truncate">
                <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">{team.driverNames.join(', ') || 'Sem pilotos'}</span>
              </div>
              <div className="shrink-0 font-mono-numbers">
                <span className="text-amber-400 font-semibold">{team.wins} vit</span> · <span>{team.podiums} pód</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile Constructor Table - Fits 100% on Mobile Screen, No Text Outside */}
      <div className="block md:hidden rounded-xl border border-slate-800 bg-[#0c121e] overflow-hidden w-full shadow-lg">
        <table className="w-full text-left table-fixed">
          <thead className="bg-slate-900 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th scope="col" className="py-2.5 px-2 text-center w-10">Pos</th>
              <th scope="col" className="py-2.5 px-2 text-left w-auto">Equipe & Pilotos</th>
              <th scope="col" className="py-2.5 px-1 text-center w-14">Vit/Pód</th>
              <th scope="col" className="py-2.5 px-2 text-right w-16">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono-numbers">
            {constructorStandings.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate-500 font-sans text-xs">
                  Nenhuma equipe cadastrada.
                </td>
              </tr>
            ) : (
              constructorStandings.map((team) => {
                const isP1 = team.rank === 1 && team.totalPoints > 0;
                const isP2 = team.rank === 2 && team.totalPoints > 0;
                const isP3 = team.rank === 3 && team.totalPoints > 0;
                const teamColor = getTeamColor(team.teamName);

                return (
                  <tr
                    key={team.teamName}
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
                    {/* Pos */}
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
                        {team.rank}
                      </span>
                    </td>

                    {/* Team & Drivers */}
                    <td className="py-2 px-2 font-sans align-middle overflow-hidden">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-1.5 h-6 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: teamColor }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-white text-xs truncate leading-tight flex items-center gap-1">
                            <span className="truncate">{team.teamName}</span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 font-mono text-[9px] font-bold text-amber-400 border border-slate-700 shrink-0">
                              {getTeamCode(team.teamName, activeChampionship.simulator)}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5 leading-tight">
                            {team.driverNames.length > 0 ? team.driverNames.join(' · ') : 'Pilotos oficiais'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Wins / Podiums */}
                    <td className="py-2 px-1 text-center align-middle font-mono-numbers text-[11px] text-slate-400 whitespace-nowrap">
                      <span className={team.wins > 0 ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                        {team.wins}v
                      </span>
                      <span className="text-slate-600 mx-0.5">/</span>
                      <span className={team.podiums > 0 ? 'text-slate-300 font-medium' : 'text-slate-500'}>
                        {team.podiums}p
                      </span>
                    </td>

                    {/* Total Points & Gap */}
                    <td className="py-2 px-2 text-right align-middle whitespace-nowrap">
                      <div className="font-bold text-white font-mono-numbers text-xs">
                        {team.totalPoints}{' '}
                        <span className="text-[9px] text-slate-400 font-normal">pts</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono-numbers mt-0.5">
                        {team.gap === 'Líder' ? (
                          <span className="text-amber-400 font-semibold text-[10px]">Líder</span>
                        ) : (
                          team.gap
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
              <th scope="col" className="py-3 px-3">Equipe</th>
              <th scope="col" className="py-3 px-3 text-center w-16">Sigla</th>
              <th scope="col" className="py-3 px-3">Pilotos Integrantes</th>
              {activeChampionship.stages.map((stage) => (
                <th
                  key={stage.id}
                  scope="col"
                  className="py-3 px-2 text-center font-mono-numbers font-medium whitespace-nowrap"
                >
                  <div className="text-[10px] text-slate-500">R{stage.roundNumber}</div>
                  <div className="flex justify-center mt-0.5">
                    <CountryFlag flag={stage.trackFlag} country={stage.trackCountry} size="xs" />
                  </div>
                </th>
              ))}
              <th scope="col" className="py-3 px-2.5 text-center font-medium">Vitórias</th>
              <th scope="col" className="py-3 px-2.5 text-center font-medium">Pódios</th>
              <th scope="col" className="py-3 px-4 text-right font-bold text-white">Pontos Totais</th>
              <th scope="col" className="py-3 px-3 text-right">Diferença</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono-numbers">
            {constructorStandings.length === 0 ? (
              <tr>
                <td colSpan={8 + activeChampionship.stages.length} className="py-8 text-center text-slate-500 font-sans text-xs">
                  Nenhuma equipe cadastrada ainda.
                </td>
              </tr>
            ) : (
              constructorStandings.map((team) => {
                const isP1 = team.rank === 1 && team.totalPoints > 0;
                const isP2 = team.rank === 2 && team.totalPoints > 0;
                const isP3 = team.rank === 3 && team.totalPoints > 0;

                return (
                  <tr
                    key={team.teamName}
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
                        <span className="text-slate-400 font-medium">{team.rank}</span>
                      )}
                    </td>

                  <td className="py-3 px-3 font-sans font-bold text-white">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-1.5 h-4 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: getTeamColor(team.teamName) }}
                      />
                      <span>{team.teamName}</span>
                    </div>
                  </td>

                  <td className="py-3 px-3 font-sans text-center">
                    <span className="inline-block px-2 py-0.5 rounded bg-slate-800/90 text-amber-400 font-mono text-xs font-bold border border-slate-700 shadow-sm">
                      {getTeamCode(team.teamName, activeChampionship.simulator)}
                    </span>
                  </td>

                  <td className="py-3 px-3 font-sans text-slate-400 text-xs">
                    {team.driverNames.length > 0 ? team.driverNames.join(' · ') : 'Sem pilotos atribuídos'}
                  </td>

                  {activeChampionship.stages.map((stage) => {
                    const pts = team.roundPoints[stage.roundNumber];
                    const isCompleted = stage.status === 'Concluída';

                    return (
                      <td key={stage.id} className="py-3 px-2 text-center text-xs tabular-nums">
                        {isCompleted ? (
                          pts !== undefined ? (
                            <span className="font-semibold text-white">{pts}</span>
                          ) : (
                            <span className="text-slate-600">0</span>
                          )
                        ) : (
                          <span className="text-slate-700">·</span>
                        )}
                      </td>
                    );
                  })}

                  <td className="py-3 px-2.5 text-center tabular-nums text-slate-300">
                    {team.wins > 0 ? <span className="text-amber-400 font-bold">{team.wins}</span> : '0'}
                  </td>

                  <td className="py-3 px-2.5 text-center tabular-nums text-slate-300">
                    {team.podiums}
                  </td>

                  <td className="py-3 px-4 text-right tabular-nums">
                    <span className="text-sm font-extrabold text-white bg-slate-900 px-2.5 py-1 rounded-md border border-slate-700/80">
                      {team.totalPoints}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-right tabular-nums text-slate-400 text-[11px]">
                    {team.gap}
                  </td>
                </tr>
              );
            })
          )}
          </tbody>
        </table>
      </div>

      <ExportStandingsModal
        isOpen={isExportImageModalOpen}
        onClose={() => setIsExportImageModalOpen(false)}
        type="constructors"
        championship={activeChampionship}
        constructorStandings={constructorStandings}
      />
    </div>
  );
};
