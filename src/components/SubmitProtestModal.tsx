import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  Send,
  Video,
  Image as ImageIcon,
  Flag,
  Car,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChampionships } from '../context/ChampionshipContext';
import { useNotifications } from '../context/NotificationContext';
import { StageRound } from '../types';

interface SubmitProtestModalProps {
  isOpen: boolean;
  onClose: () => void;
  stage: StageRound;
}

export const SubmitProtestModal: React.FC<SubmitProtestModalProps> = ({
  isOpen,
  onClose,
  stage,
}) => {
  const { currentUser } = useAuth();
  const { activeChampionship, submitProtest } = useChampionships();
  const { sendNotification } = useNotifications();

  const [defendantId, setDefendantId] = useState('');
  const [lapNumber, setLapNumber] = useState('');
  const [turnOrSector, setTurnOrSector] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !activeChampionship) return null;

  // Filter possible defendants: other drivers who participated in the stage
  const stageResults = stage.results || [];
  const otherDrivers = stageResults.filter((r) => r.driverId !== currentUser?.id);

  // If no results entered yet, fallback to other approved registrations
  const availableDefendants = otherDrivers.length > 0
    ? otherDrivers.map((r) => ({
        id: r.driverId,
        name: r.driverName,
        number: r.number,
        teamName: r.teamName,
      }))
    : activeChampionship.registrations
        .filter((r) => r.userId !== currentUser?.id && r.status === 'APROVADO')
        .map((r) => ({
          id: r.userId,
          name: r.userName,
          number: r.carNumber,
          teamName: r.teamName,
        }));

  const selectedDefendant = availableDefendants.find((d) => d.id === defendantId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!defendantId) {
      setErrorMsg('Por favor, selecione o piloto envolvido no incidente.');
      return;
    }

    if (!description.trim()) {
      setErrorMsg('Por favor, descreva detalhadamente o incidente ocorrido.');
      return;
    }

    if (!videoUrl.trim() && !screenshotUrl.trim()) {
      setErrorMsg('É obrigatório anexar ao menos uma prova (link de vídeo ou imagem/print) para análise dos comissários.');
      return;
    }

    submitProtest({
      stageId: stage.id,
      stageRoundNumber: stage.roundNumber,
      stageTrackName: stage.trackName,
      defendantId,
      defendantName: selectedDefendant?.name || 'Piloto',
      defendantCarNumber: selectedDefendant?.number,
      defendantTeam: selectedDefendant?.teamName,
      lapNumber: lapNumber.trim(),
      turnOrSector: turnOrSector.trim(),
      description: description.trim(),
      videoUrl: videoUrl.trim(),
      screenshotUrl: screenshotUrl.trim(),
    });

    sendNotification({
      userId: 'all',
      title: `⚖️ Novo Protesto: ${stage.trackName}`,
      message: `${currentUser?.name || 'Um piloto'} abriu um protesto contra ${selectedDefendant?.name || 'outro piloto'} (volta ${lapNumber.trim() || 'da prova'}).`,
      type: 'STEWARDS_PROTEST',
      linkTab: 'calendar',
      stageId: stage.id,
      championshipId: activeChampionship?.id,
    }).catch(() => {});

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0d131f] border border-red-900/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">
                Abrir Protesto aos Comissários
              </h3>
              <p className="text-xs text-slate-400">
                Etapa {stage.roundNumber} · {stage.trackName}
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

        {/* Notice Banner */}
        <div className="px-5 py-2.5 bg-red-950/30 border-b border-red-900/40 text-[11px] text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
          <span>
            Denúncias com provas falsas ou de má-fé podem acarretar em punição ao denunciante no <strong>Sim Rating</strong>.
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-xs text-red-200">
              {errorMsg}
            </div>
          )}

          {/* Defendant Selector */}
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Piloto Denunciado / Envolvido *
            </label>
            <select
              required
              value={defendantId}
              onChange={(e) => setDefendantId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
            >
              <option value="">Selecione o piloto contra quem abrir o protesto...</option>
              {availableDefendants.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  #{driver.number} - {driver.name} ({driver.teamName})
                </option>
              ))}
            </select>
          </div>

          {/* Lap & Sector */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Volta do Incidente
              </label>
              <input
                type="text"
                placeholder="Ex: Volta 14"
                value={lapNumber}
                onChange={(e) => setLapNumber(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Curva / Setor da Pista
              </label>
              <input
                type="text"
                placeholder="Ex: Curva 4 (Entrada)"
                value={turnOrSector}
                onChange={(e) => setTurnOrSector(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Descrição Detalhada do Ocorrido *
            </label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o que aconteceu: toque traseiro, espalhada provocada, fechada indevida em reta, corte deliberado de curva..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Evidence Links */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <span className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
              Provas do Incidente (Mídia)
            </span>

            <div>
              <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5 mb-1">
                <Video className="w-3.5 h-3.5 text-red-400" />
                <span>Link de Vídeo do Incidente (Recomendado)</span>
              </label>
              <input
                type="url"
                placeholder="https://youtube.com/watch?v=... ou Twitch, Streamable, Medal, Drive"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5 mb-1">
                <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                <span>Link de Imagem / Print / Telemetria</span>
              </label>
              <input
                type="url"
                placeholder="https://imgur.com/... ou Google Drive"
                value={screenshotUrl}
                onChange={(e) => setScreenshotUrl(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-mono text-[11px]"
              />
            </div>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800 mt-6">
            <span className="text-xs text-slate-400">
              {submitted && (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Protesto protocolado com sucesso!
                </span>
              )}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitted}
                className="flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold text-xs px-5 py-2 rounded-xl shadow-lg shadow-red-950 cursor-pointer transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Protocolar Denúncia</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
