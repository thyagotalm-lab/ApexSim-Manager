import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  AlertTriangle,
  Scale,
  Video,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Clock,
  Car,
  Award,
  Zap,
  Trash2,
  Filter,
  TrendingDown,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChampionships } from '../context/ChampionshipContext';
import { useNotifications } from '../context/NotificationContext';
import { PenaltyType, RaceProtest } from '../types';

interface StewardsProtestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProtestId?: string;
}

export const StewardsProtestsModal: React.FC<StewardsProtestsModalProps> = ({
  isOpen,
  onClose,
  selectedProtestId,
}) => {
  const { currentUser } = useAuth();
  const { activeChampionship, isUserLeagueAdmin, judgeProtest, deleteProtest } = useChampionships();
  const { sendNotification } = useNotifications();

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDENTE' | 'DEFERIDO' | 'INDEFERIDO'>('ALL');
  const [selectedId, setSelectedId] = useState<string>(selectedProtestId || '');

  // Judgment form state
  const [verdict, setVerdict] = useState('');
  const [penaltyType, setPenaltyType] = useState<PenaltyType>('POINTS_PENALTY');
  const [penaltyPoints, setPenaltyPoints] = useState<number>(3);
  const [penaltySeconds, setPenaltySeconds] = useState<number>(10);
  const [simRatingDeduction, setSimRatingDeduction] = useState<number>(60);
  const [safetyRatingDeduction, setSafetyRatingDeduction] = useState<number>(0.30);
  const [isJudging, setIsJudging] = useState(false);
  const [judgmentSuccess, setJudgmentSuccess] = useState(false);

  if (!isOpen || !activeChampionship) return null;

  const isAdmin = currentUser ? isUserLeagueAdmin(activeChampionship.id, currentUser.id) : false;
  const protests = activeChampionship.protests || [];

  const filteredProtests = protests.filter((p) => {
    if (activeFilter === 'ALL') return true;
    return p.status === activeFilter;
  });

  const selectedProtest = protests.find((p) => p.id === (selectedId || (filteredProtests[0]?.id || '')));

  // Auto-set recommended ratings based on penalty type
  const handlePenaltyTypeChange = (type: PenaltyType) => {
    setPenaltyType(type);
    if (type === 'NO_PENALTY') {
      setPenaltyPoints(0);
      setPenaltySeconds(0);
      setSimRatingDeduction(0);
      setSafetyRatingDeduction(0);
    } else if (type === 'WARNING') {
      setPenaltyPoints(0);
      setPenaltySeconds(0);
      setSimRatingDeduction(20);
      setSafetyRatingDeduction(0.10);
    } else if (type === 'TIME_PENALTY') {
      setPenaltyPoints(0);
      setPenaltySeconds(10);
      setSimRatingDeduction(40);
      setSafetyRatingDeduction(0.25);
    } else if (type === 'POINTS_PENALTY') {
      setPenaltyPoints(3);
      setPenaltySeconds(0);
      setSimRatingDeduction(75);
      setSafetyRatingDeduction(0.40);
    } else if (type === 'DSQ') {
      setPenaltyPoints(10);
      setPenaltySeconds(0);
      setSimRatingDeduction(150);
      setSafetyRatingDeduction(0.80);
    }
  };

  const handleApplyJudgment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProtest || !isAdmin) return;

    if (!verdict.trim()) {
      alert('Por favor, informe a justificativa e parecer oficial dos comissários.');
      return;
    }

    judgeProtest(selectedProtest.id, {
      verdict: verdict.trim(),
      penaltyType,
      penaltyPoints: penaltyType === 'POINTS_PENALTY' || penaltyType === 'DSQ' ? Number(penaltyPoints) : 0,
      penaltySeconds: penaltyType === 'TIME_PENALTY' ? Number(penaltySeconds) : 0,
      penaltySimRatingDeduction: Number(simRatingDeduction),
      penaltySafetyRatingDeduction: Number(safetyRatingDeduction),
    });

    sendNotification({
      userId: 'all',
      title: `⚖️ Veredito: ${selectedProtest.plaintiffName} vs ${selectedProtest.defendantName}`,
      message: `A Direção de Prova julgou o protesto da Etapa ${selectedProtest.stageRoundNumber}: ${verdict.trim().substring(0, 120)}...`,
      type: 'STEWARDS_VERDICT',
      linkTab: 'calendar',
      stageId: selectedProtest.stageId,
      championshipId: activeChampionship?.id,
    }).catch(() => {});

    setJudgmentSuccess(true);
    setTimeout(() => {
      setJudgmentSuccess(false);
      setIsJudging(false);
    }, 1200);
  };

  const pendingCount = protests.filter((p) => p.status === 'PENDENTE').length;
  const punishedCount = protests.filter((p) => p.status === 'DEFERIDO').length;
  const rejectedCount = protests.filter((p) => p.status === 'INDEFERIDO').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-[#0b101b] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white font-display">
                  Sala dos Comissários Desportivos (FIA Stewards)
                </h3>
                {pendingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                    {pendingCount} pendente(s)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {activeChampionship.name} · Julgamento de incidentes e punições desportivas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Protests layout: Sidebar list + Detail view */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Column: Protests list */}
          <div className="w-full md:w-84 lg:w-92 border-r border-slate-800/80 bg-slate-950 flex flex-col shrink-0">
            {/* Filter Tabs Header - Refactored to fit 100% width with no scrollbar */}
            <div className="p-2 sm:p-2.5 border-b border-slate-800/80 bg-slate-950">
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900/90 rounded-xl border border-slate-800/80">
                {[
                  {
                    id: 'ALL' as const,
                    label: 'Todos',
                    count: protests.length,
                    activeClass: 'bg-slate-800 text-white font-bold shadow-sm',
                    badgeClass: 'bg-slate-700 text-slate-200',
                  },
                  {
                    id: 'PENDENTE' as const,
                    label: 'Pendentes',
                    count: pendingCount,
                    activeClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shadow-sm',
                    badgeClass: pendingCount > 0 ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400',
                  },
                  {
                    id: 'DEFERIDO' as const,
                    label: 'Punidos',
                    count: punishedCount,
                    activeClass: 'bg-red-500/20 text-red-300 border border-red-500/40 font-bold shadow-sm',
                    badgeClass: punishedCount > 0 ? 'bg-red-500/30 text-red-200 font-bold' : 'bg-slate-800 text-slate-400',
                  },
                  {
                    id: 'INDEFERIDO' as const,
                    label: 'Indeferidos',
                    count: rejectedCount,
                    activeClass: 'bg-slate-800 text-slate-200 font-bold shadow-sm',
                    badgeClass: 'bg-slate-800 text-slate-400',
                  },
                ].map((tab) => {
                  const isSelected = activeFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveFilter(tab.id)}
                      className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer select-none ${
                        isSelected
                          ? tab.activeClass
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                      }`}
                      title={`${tab.label} (${tab.count})`}
                    >
                      <span className="text-[10px] sm:text-[11px] font-medium tracking-tight truncate max-w-full">
                        {tab.label}
                      </span>
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full leading-tight shrink-0 ${
                          isSelected ? tab.badgeClass : 'bg-slate-800/80 text-slate-400'
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {filteredProtests.length === 0 ? (
                <div className="py-12 px-4 text-center text-slate-500 text-xs">
                  Nenhum protesto registrado nesta categoria.
                </div>
              ) : (
                filteredProtests.map((protest) => {
                  const isSelected = selectedProtest?.id === protest.id;
                  return (
                    <button
                      key={protest.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(protest.id);
                        setIsJudging(false);
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 border-red-500/80 shadow-md'
                          : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900/70 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                          Etapa {protest.stageRoundNumber}
                        </span>

                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            protest.status === 'PENDENTE'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                              : protest.status === 'DEFERIDO'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {protest.status === 'PENDENTE'
                            ? 'Pendente'
                            : protest.status === 'DEFERIDO'
                            ? 'Penalizado'
                            : 'Indeferido'}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-white truncate">
                        {protest.plaintiffName} <span className="text-slate-500 font-normal">vs</span> {protest.defendantName}
                      </div>

                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {protest.lapNumber || 'Volta n/a'} · {protest.turnOrSector || protest.stageTrackName}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Case Details & Judgment Box */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900/40">
            {selectedProtest ? (
              <div className="space-y-5 max-w-3xl">
                {/* Case Header Card */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-bold text-red-400">
                        INCIDENTE · ETAPA {selectedProtest.stageRoundNumber}
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="text-xs text-slate-300 font-medium">
                        {selectedProtest.stageTrackName}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400">
                      Protocolado em {new Date(selectedProtest.createdAt).toLocaleDateString('pt-BR')} às {new Date(selectedProtest.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                        selectedProtest.status === 'PENDENTE'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : selectedProtest.status === 'DEFERIDO'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {selectedProtest.status === 'PENDENTE'
                        ? 'Aguardando Julgamento'
                        : selectedProtest.status === 'DEFERIDO'
                        ? 'Penalidade Aplicada'
                        : 'Incidente de Corrida'}
                    </span>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Deseja excluir permanentemente este protesto?')) {
                            deleteProtest(selectedProtest.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-900 transition-colors cursor-pointer"
                        title="Excluir protesto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Plaintiff vs. Defendant Box */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Plaintiff (Denunciante) */}
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Piloto Denunciante
                    </span>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{selectedProtest.plaintiffName}</span>
                      {selectedProtest.plaintiffCarNumber && (
                        <span className="text-red-400 font-mono text-xs">#{selectedProtest.plaintiffCarNumber}</span>
                      )}
                    </div>
                    {selectedProtest.plaintiffTeam && (
                      <div className="text-xs text-slate-400 mt-0.5">
                        {selectedProtest.plaintiffTeam}
                      </div>
                    )}
                  </div>

                  {/* Defendant (Denunciado) */}
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-red-950/80">
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block mb-1">
                      Piloto Denunciado
                    </span>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{selectedProtest.defendantName}</span>
                      {selectedProtest.defendantCarNumber && (
                        <span className="text-amber-400 font-mono text-xs">#{selectedProtest.defendantCarNumber}</span>
                      )}
                    </div>
                    {selectedProtest.defendantTeam && (
                      <div className="text-xs text-slate-400 mt-0.5">
                        {selectedProtest.defendantTeam}
                      </div>
                    )}
                  </div>
                </div>

                {/* Incident Description */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Relato do Ocorrido
                    </span>
                    <span className="text-xs text-amber-400 font-mono">
                      {selectedProtest.lapNumber || 'Volta não especificada'} {selectedProtest.turnOrSector ? `· ${selectedProtest.turnOrSector}` : ''}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {selectedProtest.description}
                  </p>
                </div>

                {/* Attached Evidence Links */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Provas Anexadas pelo Piloto
                  </span>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {selectedProtest.videoUrl ? (
                      <a
                        href={selectedProtest.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-2 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-800/80 text-xs font-semibold text-red-200 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Video className="w-4 h-4 text-red-400" />
                        <span>Assistir Vídeo do Incidente</span>
                        <ExternalLink className="w-3.5 h-3.5 text-red-400 ml-1" />
                      </a>
                    ) : (
                      <span className="text-xs text-slate-500 italic">Nenhum link de vídeo anexado.</span>
                    )}

                    {selectedProtest.screenshotUrl && (
                      <a
                        href={selectedProtest.screenshotUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-2 rounded-xl bg-blue-950/60 hover:bg-blue-900 border border-blue-800/80 text-xs font-semibold text-blue-200 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <ImageIcon className="w-4 h-4 text-blue-400" />
                        <span>Ver Imagem / Print / Telemetria</span>
                        <ExternalLink className="w-3.5 h-3.5 text-blue-400 ml-1" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Existing Judgment Record if Already Decided */}
                {selectedProtest.judgment && (
                  <div
                    className={`p-4 rounded-xl border space-y-2 ${
                      selectedProtest.judgment.penaltyType !== 'NO_PENALTY'
                        ? 'bg-red-950/30 border-red-800/80'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-white">
                        <FileCheck className="w-4 h-4 text-emerald-400" />
                        <span>Decisão Homologada pelos Comissários</span>
                      </span>

                      <span className="text-[11px] text-slate-400 font-mono">
                        Julgado por <strong>{selectedProtest.judgment.stewardName}</strong> em {new Date(selectedProtest.judgment.decidedAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <div className="text-xs text-slate-200 bg-slate-900/80 p-3 rounded-lg border border-slate-800/80">
                      <strong className="text-amber-400 block mb-1">Parecer dos Comissários:</strong>
                      {selectedProtest.judgment.verdict}
                    </div>

                    {selectedProtest.judgment.penaltyType !== 'NO_PENALTY' && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px]">
                        <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                          <span className="text-slate-400 block">Sanção Desportiva</span>
                          <strong className="text-white font-mono">{selectedProtest.judgment.penaltyType}</strong>
                        </div>

                        {selectedProtest.judgment.penaltyPoints ? (
                          <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                            <span className="text-slate-400 block">Dedução Tabela</span>
                            <strong className="text-red-400 font-mono">-{selectedProtest.judgment.penaltyPoints} Pts</strong>
                          </div>
                        ) : null}

                        {selectedProtest.judgment.penaltySeconds ? (
                          <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                            <span className="text-slate-400 block">Tempo Acrescido</span>
                            <strong className="text-amber-400 font-mono">+{selectedProtest.judgment.penaltySeconds}s</strong>
                          </div>
                        ) : null}

                        {selectedProtest.judgment.penaltySimRatingDeduction ? (
                          <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                            <span className="text-slate-400 block">Impacto Sim Rating</span>
                            <strong className="text-red-400 font-mono">-{selectedProtest.judgment.penaltySimRatingDeduction} ELO</strong>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}

                {/* Steward Judgment Action Form (Available for Admins) */}
                {isAdmin && (
                  <div className="pt-2">
                    {!isJudging && selectedProtest.status === 'PENDENTE' ? (
                      <button
                        type="button"
                        onClick={() => setIsJudging(true)}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs shadow-lg shadow-red-950 flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        <Scale className="w-4 h-4" />
                        <span>Abrir Formulário de Julgamento dos Comissários</span>
                      </button>
                    ) : isJudging ? (
                      <form onSubmit={handleApplyJudgment} className="p-5 rounded-2xl bg-[#090e18] border border-red-700/60 shadow-xl space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-2">
                            <Scale className="w-4 h-4" />
                            <span>Veredicto dos Comissários de Prova</span>
                          </h4>
                          <button
                            type="button"
                            onClick={() => setIsJudging(false)}
                            className="text-xs text-slate-400 hover:text-white"
                          >
                            Cancelar Julgamento
                          </button>
                        </div>

                        {/* Decision / Penalty Type */}
                        <div>
                          <label className="text-xs font-medium text-slate-300 block mb-1.5">
                            Decisão Oficial da Direção de Prova *
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => handlePenaltyTypeChange('NO_PENALTY')}
                              className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                                penaltyType === 'NO_PENALTY'
                                  ? 'bg-slate-800 border-white text-white font-bold'
                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              <div className="text-xs">Indeferido (Sem Punição)</div>
                              <span className="text-[10px] text-slate-500">Incidente normal de corrida</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handlePenaltyTypeChange('TIME_PENALTY')}
                              className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                                penaltyType === 'TIME_PENALTY'
                                  ? 'bg-amber-950/80 border-amber-500 text-white font-bold'
                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              <div className="text-xs">Acréscimo de Tempo (+5s, +10s, +20s)</div>
                              <span className="text-[10px] text-amber-400/80">Penalidade leve/média em pista</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handlePenaltyTypeChange('POINTS_PENALTY')}
                              className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                                penaltyType === 'POINTS_PENALTY'
                                  ? 'bg-red-950/80 border-red-500 text-white font-bold'
                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              <div className="text-xs">Perda de Pontos na Tabela (-3, -5, -10 pts)</div>
                              <span className="text-[10px] text-red-400/80">Conduta antidesportiva grave</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handlePenaltyTypeChange('DSQ')}
                              className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                                penaltyType === 'DSQ'
                                  ? 'bg-red-950 border-red-500 text-white font-bold'
                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              <div className="text-xs">Desclassificação (DSQ)</div>
                              <span className="text-[10px] text-red-400/80">Infração gravíssima / Intencional</span>
                            </button>
                          </div>
                        </div>

                        {/* Fine Tuning Penalty values if applicable */}
                        {penaltyType !== 'NO_PENALTY' && (
                          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-3">
                            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                              Parâmetros da Penalidade & Impacto no Sim Rating
                            </span>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                              {penaltyType === 'POINTS_PENALTY' && (
                                <div>
                                  <label className="text-[10px] text-slate-400 block mb-1">
                                    Pontos Deduzidos
                                  </label>
                                  <input
                                    type="number"
                                    min={1}
                                    max={25}
                                    value={penaltyPoints}
                                    onChange={(e) => setPenaltyPoints(parseInt(e.target.value, 10) || 1)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-red-400 font-mono text-center font-bold"
                                  />
                                </div>
                              )}

                              {penaltyType === 'TIME_PENALTY' && (
                                <div>
                                  <label className="text-[10px] text-slate-400 block mb-1">
                                    Segundos Acrescidos
                                  </label>
                                  <input
                                    type="number"
                                    min={1}
                                    max={60}
                                    value={penaltySeconds}
                                    onChange={(e) => setPenaltySeconds(parseInt(e.target.value, 10) || 5)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-amber-400 font-mono text-center font-bold"
                                  />
                                </div>
                              )}

                              <div>
                                <label className="text-[10px] text-slate-400 flex items-center gap-1 mb-1">
                                  <TrendingDown className="w-3 h-3 text-red-400" />
                                  <span>Perda Sim Rating</span>
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  max={300}
                                  value={simRatingDeduction}
                                  onChange={(e) => setSimRatingDeduction(parseInt(e.target.value, 10) || 0)}
                                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-red-400 font-mono text-center font-bold"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] text-slate-400 flex items-center gap-1 mb-1">
                                  <TrendingDown className="w-3 h-3 text-amber-400" />
                                  <span>Perda Safety Rating</span>
                                </label>
                                <input
                                  type="number"
                                  step="0.05"
                                  min={0}
                                  max={2.0}
                                  value={safetyRatingDeduction}
                                  onChange={(e) => setSafetyRatingDeduction(parseFloat(e.target.value) || 0)}
                                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-amber-400 font-mono text-center font-bold"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Steward Justification / Verdict Text */}
                        <div>
                          <label className="text-xs font-medium text-slate-300 block mb-1">
                            Parecer Oficial e Justificativa dos Comissários *
                          </label>
                          <textarea
                            rows={3}
                            required
                            value={verdict}
                            onChange={(e) => setVerdict(e.target.value)}
                            placeholder="Descreva a conclusão da análise das imagens, artigo do regulamento infringido e justificativa da penalidade..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500 font-medium"
                          />
                        </div>

                        {/* Submit Action */}
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-xs text-emerald-400">
                            {judgmentSuccess && 'Penalidade homologada e aplicada com sucesso!'}
                          </span>

                          <button
                            type="submit"
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs shadow-lg shadow-red-950 cursor-pointer transition-all"
                          >
                            Homologar Decisão & Aplicar Punição
                          </button>
                        </div>
                      </form>
                    ) : null}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 text-xs">
                <Scale className="w-12 h-12 text-slate-700 mb-3" />
                <p>Selecione um protesto na lista à esquerda para analisar as provas e emitir o parecer dos comissários.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
