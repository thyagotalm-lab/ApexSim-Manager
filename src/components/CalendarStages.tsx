import React, { useState } from 'react';
import { Calendar, Clock, MapPin, CloudRain, Sun, Moon, Plus, Edit2, Trash2, CheckCircle2, ChevronRight, Award, AlertTriangle, X, Zap, Scale, ShieldAlert, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChampionships } from '../context/ChampionshipContext';
import { CountryFlag } from './CountryFlag';
import { StageRound } from '../types';
import { SubmitProtestModal } from './SubmitProtestModal';
import { StewardsProtestsModal } from './StewardsProtestsModal';

interface CalendarStagesProps {
  onOpenResultsModal: (stage: StageRound) => void;
  onOpenStageEditor: (stage?: StageRound) => void;
}

export const CalendarStages: React.FC<CalendarStagesProps> = ({
  onOpenResultsModal,
  onOpenStageEditor,
}) => {
  const { currentUser } = useAuth();
  const { activeChampionship, deleteStage, isUserLeagueAdmin } = useChampionships();
  
  // State for stage deletion confirmation dialog
  const [stageToDelete, setStageToDelete] = useState<StageRound | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const [protestStage, setProtestStage] = useState<StageRound | null>(null);
  const [isStewardsModalOpen, setIsStewardsModalOpen] = useState<boolean>(false);

  if (!activeChampionship) {
    return (
      <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
        <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
        <h3 className="text-base font-bold text-white">Nenhum campeonato ativo no momento</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Crie seu próprio campeonato manualmente na aba "Campeonatos" ou pelo botão do topo para começar a cadastrar as etapas.
        </p>
      </div>
    );
  }

  const isAdmin = isUserLeagueAdmin(activeChampionship.id, currentUser?.id);

  const getWeatherIcon = (weather: StageRound['weather']) => {
    switch (weather) {
      case 'Chuva Forte':
      case 'Chuva Leve':
        return <CloudRain className="w-3.5 h-3.5 text-blue-400" />;
      case 'Noturna':
        return <Moon className="w-3.5 h-3.5 text-indigo-400" />;
      default:
        return <Sun className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  const getStatusBadge = (status: StageRound['status']) => {
    switch (status) {
      case 'Concluída':
        return (
          <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Concluída
          </span>
        );
      case 'Em Andamento':
        return (
          <span className="text-[11px] font-semibold text-red-400 bg-red-950/80 border border-red-800/80 px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Ao Vivo
          </span>
        );
      case 'Em Breve':
        return (
          <span className="text-[11px] font-semibold text-amber-300 bg-amber-950/80 border border-amber-800/80 px-2 py-0.5 rounded-full">
            Próxima Corrida
          </span>
        );
      default:
        return (
          <span className="text-[11px] text-slate-400 bg-slate-800/80 border border-slate-700 px-2 py-0.5 rounded-full">
            Agendada
          </span>
        );
    }
  };

  const handleConfirmDelete = () => {
    if (!stageToDelete) return;
    const stageName = `Etapa ${stageToDelete.roundNumber} - ${stageToDelete.trackName}`;
    deleteStage(activeChampionship.id, stageToDelete.id);
    setFeedbackMessage(`${stageName} excluída com sucesso!`);
    setStageToDelete(null);

    setTimeout(() => {
      setFeedbackMessage('');
    }, 4000);
  };

  return (
    <div className="space-y-4">
      {/* Feedback banner */}
      {feedbackMessage && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-200 rounded-xl text-xs flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="font-medium">{feedbackMessage}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage('')}
            className="text-emerald-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <div className="text-xs text-red-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-red-400" />
            Calendário Oficial da Temporada
          </div>
          <h2 className="text-xl font-bold text-white font-display mt-0.5">
            {activeChampionship.name}
          </h2>
          <div className="text-xs text-slate-400 flex items-center gap-2 mt-1">
            <span>{activeChampionship.stages.length} Etapas programadas</span>
            <span>·</span>
            <span>Horário de Brasília (BRT)</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsStewardsModalOpen(true)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium px-3.5 py-2 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap"
          >
            <Scale className="w-3.5 h-3.5 text-amber-400" />
            <span>Comissários FIA</span>
            {(activeChampionship.protests || []).length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {(activeChampionship.protests || []).length}
              </span>
            )}
          </button>

          {isAdmin && (
            <button
              onClick={() => onOpenStageEditor()}
              className="flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-medium px-3.5 py-2 rounded-lg text-xs shadow-md shadow-red-950 transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Etapa</span>
            </button>
          )}
        </div>
      </div>

      {/* Stages Cards List */}
      <div className="grid grid-cols-1 gap-3.5">
        {activeChampionship.stages.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-slate-800 text-slate-400 text-xs">
            Nenhuma etapa cadastrada neste campeonato ainda.
            {isAdmin && (
              <div className="mt-3">
                <button
                  onClick={() => onOpenStageEditor()}
                  className="px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
                >
                  + Adicionar Primeira Etapa
                </button>
              </div>
            )}
          </div>
        ) : (
          activeChampionship.stages.map((stage) => {
            const winner = stage.results?.find((r) => r.finishPosition === 1 && r.status === 'FINISHED');
            const isCompleted = stage.status === 'Concluída';

            return (
              <div
                key={stage.id}
                className={`p-4 sm:p-5 rounded-xl border transition-all ${
                  stage.status === 'Em Breve'
                    ? 'bg-gradient-to-r from-red-950/20 via-slate-900/80 to-slate-900 border-red-800/60 shadow-md shadow-red-950/20'
                    : isCompleted
                    ? 'bg-slate-900/70 border-slate-800/80'
                    : 'bg-slate-900/40 border-slate-800/60'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Round Number & Track Details */}
                  <div className="flex items-start gap-3.5">
                    <div className="flex flex-col items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-slate-950 border border-slate-800 font-mono-numbers shrink-0">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Etapa</span>
                      <span className="text-xl sm:text-2xl font-black text-red-500">{stage.roundNumber}</span>
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <CountryFlag flag={stage.trackFlag} country={stage.trackCountry} size="md" />
                        <span className="text-xs text-slate-400 font-medium">{stage.trackCountry}</span>
                        <span>·</span>
                        {getStatusBadge(stage.status)}
                        {stage.hasSprint && (
                          <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            <Zap className="w-3 h-3 text-amber-400" />
                            <span>Corrida Sprint</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                        {stage.trackName}
                      </h3>

                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-400 mt-1 font-mono tabular-nums">
                        <span className="flex items-center gap-1.5 text-slate-300 font-sans">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {new Date(stage.date + 'T12:00:00Z').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="flex items-center gap-1.5 text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          {stage.time}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="flex items-center gap-1.5 text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          {stage.circuitLength}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="flex items-center gap-1.5 text-slate-300 font-sans">
                          {getWeatherIcon(stage.weather)}
                          {stage.weather}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <div className="text-xs text-slate-400 bg-slate-950/60 px-2.5 py-1 rounded border border-slate-800/80 inline-block font-sans">
                          Formato: <strong className="text-slate-300 font-medium">{stage.format}</strong>
                        </div>
                        {stage.hasSprint && (
                          <div className="text-xs text-amber-300/90 bg-amber-950/30 px-2.5 py-1 rounded border border-amber-900/50 inline-flex items-center gap-1 font-sans">
                            <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>Sprint: <strong className="text-amber-200 font-medium">{stage.sprintFormat || 'Corrida Sprint 100km'}</strong></span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Quick results overview & Admin action buttons */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 self-end lg:self-center">
                    {isCompleted && winner && (
                      <div className="bg-slate-950/90 border border-slate-800 p-2.5 rounded-lg text-xs min-w-[200px] border-l-2 border-l-amber-400 shadow-sm">
                        <div className="flex items-center gap-1.5 text-amber-400 font-semibold mb-1">
                          <Award className="w-3.5 h-3.5" />
                          <span>Vencedor: {winner.driverName}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center justify-between">
                          <span>Equipe: <strong className="text-slate-300 font-medium">{winner.teamName}</strong></span>
                          <span className="text-red-400 font-mono font-bold">#{winner.number}</span>
                        </div>
                        {stage.fastestLapTime && (
                          <div className="text-[10px] text-purple-400 mt-1 font-mono tabular-nums font-semibold flex items-center gap-1 pt-1 border-t border-slate-800/50">
                            <Zap className="w-3 h-3 text-purple-400" />
                            <span>Volta Mais Rápida: {stage.fastestLapTime}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {/* View Details / Results Modal */}
                      {isCompleted && (
                        <>
                          {stage.communityTrophies?.driverOfTheDay?.winnerDriverName && (
                            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/40 border border-amber-800/50 text-[11px] text-amber-300">
                              <Trophy className="w-3 h-3 text-amber-400" />
                              <span>DotD: <strong>{stage.communityTrophies.driverOfTheDay.winnerDriverName}</strong></span>
                            </div>
                          )}

                          <button
                            onClick={() => onOpenResultsModal(stage)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <span>Resultados & DotD</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setProtestStage(stage)}
                            className="px-3 py-1.5 rounded-lg bg-red-950/70 hover:bg-red-900 border border-red-800/80 text-red-200 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                            title="Protocolar denúncia ou protesto sobre incidente nesta etapa"
                          >
                            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                            <span>Protestar Incidente</span>
                          </button>
                        </>
                      )}

                      {/* Admin Actions */}
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => onOpenResultsModal(stage)}
                            className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                            title="Lançar ou editar classificação da corrida"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>{isCompleted ? 'Editar Resultados' : 'Lançar Resultados'}</span>
                          </button>

                          <button
                            onClick={() => onOpenStageEditor(stage)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Editar informações da etapa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setStageToDelete(stage)}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Excluir etapa do calendário"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Confirmation Modal for Stage Deletion */}
      {stageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#0d131f] border border-red-900/60 rounded-2xl shadow-2xl p-6 overflow-hidden">
            {/* Red accent line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 to-amber-500" />

            <div className="flex items-start gap-3.5 mb-4">
              <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-800/80 text-red-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white font-display">
                  Excluir Etapa do Calendário?
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Confirme a remoção desta corrida da programação oficial do campeonato.
                </p>
              </div>
              <button
                onClick={() => setStageToDelete(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stage Summary Card */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 mb-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-red-400">Etapa {stageToDelete.roundNumber}</span>
                <span className="text-slate-400 flex items-center gap-1.5">
                  <CountryFlag flag={stageToDelete.trackFlag} country={stageToDelete.trackCountry} size="xs" />
                  <span>{stageToDelete.trackCountry}</span>
                </span>
              </div>
              <div className="text-sm font-bold text-white">
                {stageToDelete.trackName}
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span>{new Date(stageToDelete.date + 'T12:00:00Z').toLocaleDateString('pt-BR')}</span>
                <span>·</span>
                <span>{stageToDelete.time}</span>
                <span>·</span>
                <span>{stageToDelete.format}</span>
              </div>

              {stageToDelete.status === 'Concluída' && (
                <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Atenção: Esta etapa já possui resultados homologados. A exclusão recalculará a pontuação geral das tabelas.</span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400 mb-5">
              As etapas subsequentes serão renumeradas automaticamente (Etapa 2 passará a ser Etapa 1, etc.).
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setStageToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md shadow-red-950 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sim, Excluir Etapa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Protest Modal */}
      {protestStage && (
        <SubmitProtestModal
          isOpen={!!protestStage}
          onClose={() => setProtestStage(null)}
          stage={protestStage}
        />
      )}

      {/* Stewards Protests Modal */}
      {isStewardsModalOpen && (
        <StewardsProtestsModal
          isOpen={isStewardsModalOpen}
          onClose={() => setIsStewardsModalOpen(false)}
        />
      )}
    </div>
  );
};
