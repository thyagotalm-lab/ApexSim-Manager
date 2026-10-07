import React, { useState, useEffect } from 'react';
import { X, Award, Zap, AlertTriangle, Check, ArrowUp, ArrowDown, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChampionships } from '../context/ChampionshipContext';
import { useNotifications } from '../context/NotificationContext';
import { CountryFlag } from './CountryFlag';
import { RaceResultItem, StageRound } from '../types';
import { DriverOfTheDayVoting } from './DriverOfTheDayVoting';
import { Trophy, ListOrdered } from 'lucide-react';

interface RaceResultsModalProps {
  stage: StageRound | null;
  onClose: () => void;
}

export const RaceResultsModal: React.FC<RaceResultsModalProps> = ({ stage, onClose }) => {
  const { currentUser } = useAuth();
  const { activeChampionship, recordRaceResults, isUserLeagueAdmin } = useChampionships();
  const { sendNotification } = useNotifications();

  if (!stage || !activeChampionship) return null;

  const isAdmin = isUserLeagueAdmin(activeChampionship.id, currentUser?.id);

  // Initialize results list from stage results or from approved/reserve registrations
  const [resultsList, setResultsList] = useState<RaceResultItem[]>(() => {
    if (stage.results && stage.results.length > 0) {
      return [...stage.results];
    }

    const gridDrivers = activeChampionship.registrations.filter((r) => r.status === 'APROVADO' || r.status === 'RESERVA');
    return gridDrivers.map((driver, index) => {
      const isReserve = driver.status === 'RESERVA' || Boolean(driver.isReserve) || driver.teamName?.toLowerCase() === 'reserva';
      return {
        driverId: driver.userId,
        driverName: driver.userName,
        teamName: isReserve ? 'Reserva' : driver.teamName,
        carModel: driver.carModel,
        number: driver.carNumber,
        gridPosition: index + 1,
        finishPosition: index + 1,
        status: 'FINISHED',
        totalTime: index === 0 ? '45:00.000' : '',
        gap: index === 0 ? 'Líder' : `+${(index * 4.2).toFixed(3)}s`,
        pointsAwarded: 0,
        penaltiesPoints: 0,
        penaltyNotes: '',
        hasFastestLap: false,
        hasPole: false,
        isReserve,
      };
    });
  });

  const [poleDriverId, setPoleDriverId] = useState<string>(stage.poleDriverId || resultsList[0]?.driverId || '');
  const [poleTime, setPoleTime] = useState<string>(stage.poleTime || '1:29.840');
  const [fastestLapDriverId, setFastestLapDriverId] = useState<string>(stage.fastestLapDriverId || resultsList[0]?.driverId || '');
  const [fastestLapTime, setFastestLapTime] = useState<string>(stage.fastestLapTime || '1:30.120');

  const poleBonus = activeChampionship.scoringRule?.poleBonus || 0;
  const fastestLapBonus = activeChampionship.scoringRule?.fastestLapBonus || 0;
  const hasPoleBonus = poleBonus > 0;
  const hasFastestLapBonus = fastestLapBonus > 0;

  const [modalTab, setModalTab] = useState<'results' | 'dotd'>('results');

  // Recalculate points whenever positions, pole, fastest lap or penalties change
  const computePoints = (
    pos: number,
    driverId: string,
    status: RaceResultItem['status'],
    penalty: number = 0
  ) => {
    if (status !== 'FINISHED') return 0;
    const rule = activeChampionship.scoringRule;
    const basePoints = rule.positions[pos - 1] || 0;
    const polePt = driverId === poleDriverId && hasPoleBonus ? poleBonus : 0;
    const vrPt = driverId === fastestLapDriverId && hasFastestLapBonus ? fastestLapBonus : 0;
    return Math.max(0, basePoints + polePt + vrPt - penalty);
  };

  const movePosition = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= resultsList.length) return;

    const updated = [...resultsList];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Reassign finish positions
    const remapped = updated.map((item, idx) => ({
      ...item,
      finishPosition: idx + 1,
      gap: idx === 0 ? 'Líder' : item.gap || `+${(idx * 3.5).toFixed(3)}s`,
      pointsAwarded: computePoints(idx + 1, item.driverId, item.status, item.penaltiesPoints),
    }));

    setResultsList(remapped);
  };

  const updateItemStatus = (index: number, newStatus: RaceResultItem['status']) => {
    const updated = [...resultsList];
    updated[index].status = newStatus;
    updated[index].pointsAwarded = computePoints(
      updated[index].finishPosition,
      updated[index].driverId,
      newStatus,
      updated[index].penaltiesPoints
    );
    setResultsList(updated);
  };

  const updateItemPenalties = (index: number, penalty: number, notes?: string) => {
    const updated = [...resultsList];
    updated[index].penaltiesPoints = penalty;
    if (notes !== undefined) updated[index].penaltyNotes = notes;
    updated[index].pointsAwarded = computePoints(
      updated[index].finishPosition,
      updated[index].driverId,
      updated[index].status,
      penalty
    );
    setResultsList(updated);
  };

  const handleSave = () => {
    // Final points check
    const finalized = resultsList.map((item) => {
      const reg = activeChampionship.registrations.find((r) => r.userId === item.driverId);
      const isReserve = Boolean(item.isReserve) || reg?.status === 'RESERVA' || Boolean(reg?.isReserve);
      return {
        ...item,
        isReserve,
        teamName: isReserve ? 'Reserva' : item.teamName,
        hasPole: item.driverId === poleDriverId,
        hasFastestLap: item.driverId === fastestLapDriverId,
        pointsAwarded: computePoints(
          item.finishPosition,
          item.driverId,
          item.status,
          item.penaltiesPoints
        ),
      };
    });

    recordRaceResults(
      activeChampionship.id,
      stage.id,
      finalized,
      { driverId: poleDriverId, time: poleTime },
      { driverId: fastestLapDriverId, time: fastestLapTime }
    );

    // Send broadcast notification
    sendNotification({
      userId: 'all',
      title: `🏁 Resultados Homologados: ${stage.trackName}`,
      message: `A classificação oficial da Etapa ${stage.roundNumber} foi publicada! Confira a tabela atualizada de pilotos e construtores.`,
      type: 'RACE_RESULT',
      linkTab: 'standings-drivers',
      championshipId: activeChampionship.id,
      stageId: stage.id,
    }).catch(() => {});

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#0c121e] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <div>
            <div className="text-xs text-red-400 uppercase font-semibold flex items-center gap-1.5">
              <span>Etapa {stage.roundNumber}</span>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <CountryFlag flag={stage.trackFlag} country={stage.trackCountry} size="xs" />
                <span>{stage.trackCountry}</span>
              </span>
              {isAdmin && <span className="bg-red-950 text-red-300 border border-red-800 text-[10px] px-1.5 py-0.5 rounded">Modo Administrador</span>}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white font-display">
              Resultados Oficiais: {stage.trackName}
            </h2>
            <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-1.5">
              <span>Sistema de pontuação: <strong className="text-slate-200">{activeChampionship.scoringRule.name}</strong></span>
              {hasPoleBonus ? (
                <span className="inline-flex items-center gap-1 text-[11px] bg-amber-950/60 border border-amber-800/80 text-amber-300 px-1.5 py-0.5 rounded font-semibold">
                  <Award className="w-3 h-3 text-amber-400" />
                  +{poleBonus} pt{poleBonus > 1 ? 's' : ''} Pole Position
                </span>
              ) : (
                <span className="text-[10px] text-slate-500 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">
                  Pole: sem ponto extra
                </span>
              )}
              {hasFastestLapBonus ? (
                <span className="inline-flex items-center gap-1 text-[11px] bg-purple-950/60 border border-purple-800/80 text-purple-300 px-1.5 py-0.5 rounded font-semibold">
                  <Zap className="w-3 h-3 text-purple-400" />
                  +{fastestLapBonus} pt{fastestLapBonus > 1 ? 's' : ''} Volta Mais Rápida
                </span>
              ) : (
                <span className="text-[10px] text-slate-500 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">
                  Volta Rápida: sem ponto extra
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-900/40 px-4 pt-2 shrink-0">
          <button
            type="button"
            onClick={() => setModalTab('results')}
            className={`py-2 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              modalTab === 'results'
                ? 'border-red-500 text-white bg-red-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>Classificação Oficial</span>
          </button>

          <button
            type="button"
            onClick={() => setModalTab('dotd')}
            className={`py-2 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              modalTab === 'dotd'
                ? 'border-amber-500 text-amber-300 bg-amber-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Piloto do Dia & Troféus da Comunidade</span>
            {stage.communityTrophies?.driverOfTheDay?.totalVotes ? (
              <span className="bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {stage.communityTrophies.driverOfTheDay.totalVotes}
              </span>
            ) : null}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto overflow-x-hidden space-y-5">
          {modalTab === 'dotd' ? (
            <DriverOfTheDayVoting stage={stage} />
          ) : (
            <>
              {/* Pole & Fastest Lap Controls (Editable for admin) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 sm:p-3.5 bg-slate-950 rounded-xl border border-slate-800 min-w-0 overflow-hidden">
                {/* Pole Position */}
                <div
                  className={`p-3 rounded-lg border transition-all min-w-0 overflow-hidden flex flex-col justify-between ${
                    hasPoleBonus ? 'bg-amber-950/15 border-amber-900/50' : 'bg-slate-900/40 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
                    <label className="text-xs font-semibold text-amber-400 flex items-center gap-1.5 min-w-0 truncate">
                      <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">Pole Position</span>
                    </label>
                    {hasPoleBonus ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0 whitespace-nowrap">
                        +{poleBonus} pt{poleBonus > 1 ? 's' : ''} extra
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 italic shrink-0 whitespace-nowrap">
                        Sem bônus
                      </span>
                    )}
                  </div>

                  {isAdmin ? (
                    <div className="flex flex-col sm:flex-row gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <select
                          value={poleDriverId}
                          onChange={(e) => setPoleDriverId(e.target.value)}
                          className="w-full min-w-0 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer truncate"
                        >
                          {resultsList.map((r) => (
                            <option key={r.driverId} value={r.driverId}>
                              #{r.number} {r.driverName} ({r.teamName})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="shrink-0">
                        <input
                          type="text"
                          placeholder="1:29.840"
                          value={poleTime}
                          onChange={(e) => setPoleTime(e.target.value)}
                          className="w-full sm:w-24 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono tabular-nums text-center focus:outline-none focus:border-amber-500"
                          title="Tempo da pole"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-white font-medium flex items-center justify-between gap-2 min-w-0">
                      <span className="truncate min-w-0">
                        {resultsList.find((r) => r.driverId === stage.poleDriverId)?.driverName || 'Não registrado'}
                      </span>
                      <span className="font-mono tabular-nums text-slate-400 shrink-0">
                        {stage.poleTime || '-'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Fastest Lap */}
                <div
                  className={`p-3 rounded-lg border transition-all min-w-0 overflow-hidden flex flex-col justify-between ${
                    hasFastestLapBonus ? 'bg-purple-950/25 border-purple-800/60' : 'bg-slate-900/40 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
                    <label className="text-xs font-semibold text-purple-400 flex items-center gap-1.5 min-w-0 truncate">
                      <Zap className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className="truncate">Melhor Volta da Corrida</span>
                    </label>
                    {hasFastestLapBonus ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 shrink-0 whitespace-nowrap">
                        +{fastestLapBonus} pt{fastestLapBonus > 1 ? 's' : ''} extra
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 italic shrink-0 whitespace-nowrap">
                        Sem bônus
                      </span>
                    )}
                  </div>

                  {isAdmin ? (
                    <div className="flex flex-col sm:flex-row gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <select
                          value={fastestLapDriverId}
                          onChange={(e) => setFastestLapDriverId(e.target.value)}
                          className="w-full min-w-0 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer truncate"
                        >
                          {resultsList.map((r) => (
                            <option key={r.driverId} value={r.driverId}>
                              #{r.number} {r.driverName} ({r.teamName})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="shrink-0">
                        <input
                          type="text"
                          placeholder="1:30.120"
                          value={fastestLapTime}
                          onChange={(e) => setFastestLapTime(e.target.value)}
                          className="w-full sm:w-24 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono tabular-nums text-center focus:outline-none focus:border-purple-500"
                          title="Tempo da melhor volta"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-white font-medium flex items-center justify-between gap-2 min-w-0">
                      <span className="truncate min-w-0">
                        {resultsList.find((r) => r.driverId === stage.fastestLapDriverId)?.driverName || 'Não registrado'}
                      </span>
                      <span className="font-mono tabular-nums text-purple-300 font-bold shrink-0">
                        {stage.fastestLapTime || '-'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Results Table */}
              <div className="rounded-xl border border-slate-800 overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 text-center w-12">Pos</th>
                  {isAdmin && <th className="py-2.5 px-2 text-center w-16">Ordem</th>}
                  <th className="py-2.5 px-3">Piloto & Equipe</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Tempo / Gap</th>
                  {isAdmin && <th className="py-2.5 px-2 text-center">Penalidade</th>}
                  <th className="py-2.5 px-3 text-right">Pts Previstos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono-numbers">
                {resultsList.map((item, idx) => {
                  const pts = computePoints(item.finishPosition, item.driverId, item.status, item.penaltiesPoints);
                  const isPole = item.driverId === poleDriverId;
                  const isVR = item.driverId === fastestLapDriverId;

                  return (
                    <tr
                      key={item.driverId}
                      className={`hover:bg-slate-800/30 transition-colors ${
                        item.finishPosition === 1
                          ? 'bg-gradient-to-r from-amber-500/12 via-amber-500/5 to-transparent border-l-2 border-amber-400'
                          : item.finishPosition === 2
                          ? 'bg-gradient-to-r from-slate-200/10 via-slate-300/5 to-transparent border-l-2 border-slate-300'
                          : item.finishPosition === 3
                          ? 'bg-gradient-to-r from-amber-800/15 via-amber-800/5 to-transparent border-l-2 border-amber-600'
                          : 'border-l-2 border-transparent'
                      }`}
                    >
                      {/* Finish Position */}
                      <td className="py-2.5 px-3 text-center font-bold">
                        {item.finishPosition === 1 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded font-mono font-bold bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-slate-950 font-black shadow-md shadow-amber-950/50 ring-1 ring-amber-300/50">
                            1
                          </span>
                        ) : item.finishPosition === 2 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded font-mono font-bold bg-gradient-to-br from-slate-100 via-slate-300 to-slate-400 text-slate-950 font-black shadow-md shadow-slate-900 ring-1 ring-white/50">
                            2
                          </span>
                        ) : item.finishPosition === 3 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded font-mono font-bold bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 text-amber-100 font-black shadow-md shadow-amber-950 ring-1 ring-amber-500/40">
                            3
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono font-medium">P{item.finishPosition}</span>
                        )}
                      </td>

                      {/* Move Position Buttons (Admin only) */}
                      {isAdmin && (
                        <td className="py-2.5 px-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              disabled={idx === 0}
                              onClick={() => movePosition(idx, 'up')}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 cursor-pointer"
                              title="Subir posição"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              disabled={idx === resultsList.length - 1}
                              onClick={() => movePosition(idx, 'down')}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 cursor-pointer"
                              title="Descer posição"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      )}

                      {/* Driver & Team */}
                      <td className="py-2.5 px-3 font-sans">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-red-400 font-bold bg-slate-900 px-1 py-0.5 rounded border border-slate-800 text-[11px] tabular-nums">
                            #{item.number}
                          </span>
                          <div>
                            <div className="font-semibold text-white flex items-center gap-1.5">
                              {item.driverName}
                              {isPole && (
                                <span className="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-500/50 px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-1 shadow-sm">
                                  <span>POLE</span>
                                  {hasPoleBonus && <span className="text-amber-400">(+{poleBonus})</span>}
                                </span>
                              )}
                              {isVR && (
                                <span className="text-[10px] bg-purple-950/80 text-purple-300 border border-purple-500/50 px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-1 shadow-sm">
                                  <Zap className="w-2.5 h-2.5 text-purple-400" />
                                  <span>VR</span>
                                  {hasFastestLapBonus && <span className="text-purple-300">(+{fastestLapBonus})</span>}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              {item.isReserve || item.teamName.toLowerCase().includes('reserva') ? (
                                <span className="text-[10px] font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/40 px-1.5 py-0.2 rounded">
                                  Reserva
                                </span>
                              ) : (
                                <span>{item.teamName}</span>
                              )}
                              <span>·</span>
                              <span>{item.carModel}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status Selector */}
                      <td className="py-2.5 px-3">
                        {isAdmin ? (
                          <select
                            value={item.status}
                            onChange={(e) => updateItemStatus(idx, e.target.value as RaceResultItem['status'])}
                            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
                          >
                            <option value="FINISHED">Completou (FINISHED)</option>
                            <option value="DNF">Abandono (DNF)</option>
                            <option value="DNS">Não Largou (DNS)</option>
                            <option value="DSQ">Desclassificado (DSQ)</option>
                          </select>
                        ) : (
                          <span className={item.status === 'FINISHED' ? 'text-emerald-400' : 'text-red-400 font-semibold'}>
                            {item.status}
                          </span>
                        )}
                      </td>

                      {/* Time / Gap */}
                      <td className="py-2.5 px-3 font-mono-numbers text-slate-300">
                        {isAdmin ? (
                          <input
                            type="text"
                            value={item.gap || ''}
                            placeholder={idx === 0 ? 'Líder' : '+5.200s'}
                            onChange={(e) => {
                              const copy = [...resultsList];
                              copy[idx].gap = e.target.value;
                              setResultsList(copy);
                            }}
                            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white w-28 focus:outline-none focus:border-red-500 font-mono-numbers"
                          />
                        ) : (
                          item.gap || '-'
                        )}
                      </td>

                      {/* Penalties (Admin only) */}
                      {isAdmin && (
                        <td className="py-2.5 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            max="50"
                            value={item.penaltiesPoints || 0}
                            onChange={(e) => updateItemPenalties(idx, Number(e.target.value))}
                            className="w-14 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-center text-red-400 font-mono-numbers focus:outline-none focus:border-red-500"
                            title="Penalidade em pontos"
                          />
                        </td>
                      )}

                      {/* Points Awarded */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex flex-col items-end">
                          <span className="font-bold text-white text-sm bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            {pts} pts
                          </span>
                          {item.status === 'FINISHED' && ((isPole && hasPoleBonus) || (isVR && hasFastestLapBonus)) && (
                            <span className="text-[9px] text-emerald-400 mt-0.5 font-sans font-medium">
                              inclui {isPole && hasPoleBonus ? `+${poleBonus} Pole` : ''} {isVR && hasFastestLapBonus ? `+${fastestLapBonus} VR` : ''}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {isAdmin
              ? 'Ao salvar, as tabelas de pilotos e construtores serão recalculadas imediatamente.'
              : 'Resultados homologados pela Direção de Prova.'}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
            >
              Fechar
            </button>

            {isAdmin && (
              <button
                onClick={handleSave}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-semibold shadow-md shadow-red-950 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Salvar & Homologar Resultados</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
