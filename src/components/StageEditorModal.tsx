import React, { useState } from 'react';
import { X, Calendar, MapPin, Clock, CloudRain, Zap } from 'lucide-react';
import { useChampionships } from '../context/ChampionshipContext';
import { OFFICIAL_F1_CIRCUITS } from '../data/f1Circuits';
import { CountryFlag } from './CountryFlag';
import { StageRound, StageWeather } from '../types';

interface StageEditorModalProps {
  stage?: StageRound | null;
  onClose: () => void;
}

export const StageEditorModal: React.FC<StageEditorModalProps> = ({ stage, onClose }) => {
  const { activeChampionship, addStage, updateStage } = useChampionships();

  const isEditing = !!stage;

  const [trackName, setTrackName] = useState(stage?.trackName || 'Autódromo de Interlagos');
  const [trackCountry, setTrackCountry] = useState(stage?.trackCountry || 'Brasil');
  const [trackFlag, setTrackFlag] = useState(stage?.trackFlag || '🇧🇷');
  const [circuitLength, setCircuitLength] = useState(stage?.circuitLength || '4.309 km');
  const [date, setDate] = useState(stage?.date || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(stage?.time || '21:00 BRT');
  const [format, setFormat] = useState(stage?.format || 'Quali 18min + Corrida 50%');
  const [hasSprint, setHasSprint] = useState<boolean>(stage?.hasSprint ?? false);
  const [sprintFormat, setSprintFormat] = useState<string>(stage?.sprintFormat || 'Sprint Shootout + Corrida Sprint 100km (15 voltas)');
  const [weather, setWeather] = useState<StageWeather>(stage?.weather || 'Pista Seca');
  const [status, setStatus] = useState<StageRound['status']>(stage?.status || 'Agendada');

  if (!activeChampionship) return null;

  const isF1Simulator =
    activeChampionship.simulator === 'F1 24' ||
    activeChampionship.simulator === 'F1 25' ||
    activeChampionship.simulator === 'F1 26';

  const handleSelectF1Circuit = (circuitId: string) => {
    const circuit = OFFICIAL_F1_CIRCUITS.find((c) => c.id === circuitId);
    if (!circuit) return;
    setTrackName(`${circuit.trackName} (${circuit.city})`);
    setTrackCountry(circuit.country);
    setTrackFlag(circuit.flag);
    setCircuitLength(circuit.length);
    setFormat(circuit.defaultFormat);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && stage) {
      updateStage(activeChampionship.id, stage.id, {
        trackName,
        trackCountry,
        trackFlag,
        circuitLength,
        date,
        time,
        format,
        hasSprint,
        sprintFormat: hasSprint ? sprintFormat : undefined,
        weather,
        status,
      });
    } else {
      addStage(activeChampionship.id, {
        trackName,
        trackCountry,
        trackFlag,
        circuitLength,
        date,
        time,
        format,
        hasSprint,
        sprintFormat: hasSprint ? sprintFormat : undefined,
        weather,
        status,
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0c121e] border border-slate-700/80 rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
            <Calendar className="w-5 h-5 text-red-500" />
            {isEditing ? `Editar Etapa: ${stage?.trackName}` : 'Adicionar Nova Etapa ao Calendário'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 mt-4">
          {/* F1 Official Circuits Quick Picker */}
          {isF1Simulator && (
            <div className="p-3 bg-red-950/40 border border-red-900/60 rounded-xl space-y-1.5">
              <label className="text-xs font-semibold text-red-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span>Escolher Circuito Oficial da F1:</span>
              </label>
              <select
                onChange={(e) => handleSelectF1Circuit(e.target.value)}
                defaultValue=""
                className="w-full bg-slate-950 border border-red-900/80 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
              >
                <option value="" disabled>
                  Selecione um GP para preencher os dados automaticamente...
                </option>
                {OFFICIAL_F1_CIRCUITS.map((circuit) => (
                  <option key={circuit.id} value={circuit.id}>
                    {circuit.flag} {circuit.gpName} — {circuit.trackName} ({circuit.length})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Nome do Circuito / Pista</label>
            <input
              type="text"
              required
              value={trackName}
              onChange={(e) => setTrackName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">País</label>
              <input
                type="text"
                value={trackCountry}
                onChange={(e) => setTrackCountry(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Bandeira</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={trackFlag}
                  onChange={(e) => setTrackFlag(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-xs text-white text-center focus:outline-none focus:border-red-500"
                />
                <div className="p-1 rounded bg-slate-950 border border-slate-700 shrink-0 flex items-center justify-center">
                  <CountryFlag flag={trackFlag} country={trackCountry} size="sm" />
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Extensão (km)</label>
              <input
                type="text"
                value={circuitLength}
                onChange={(e) => setCircuitLength(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Data da Corrida</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Horário (BRT)</label>
              <input
                type="text"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Clima Simulado</label>
              <select
                value={weather}
                onChange={(e) => setWeather(e.target.value as StageWeather)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
              >
                <option value="Pista Seca">Pista Seca</option>
                <option value="Chuva Leve">Chuva Leve</option>
                <option value="Chuva Forte">Chuva Forte</option>
                <option value="Variável">Variável</option>
                <option value="Noturna">Noturna</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Status da Etapa</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StageRound['status'])}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
              >
                <option value="Agendada">Agendada</option>
                <option value="Em Breve">Em Breve</option>
                <option value="Em Andamento">Em Andamento</option>
                <option value="Concluída">Concluída</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Formato da Corrida Principal</label>
            <input
              type="text"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              placeholder="Ex: Quali 15min + Corrida 45min (Pit Obrigatório)"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Opção de Corrida Sprint */}
          <div className={`p-3.5 rounded-xl border transition-all ${
            hasSprint ? 'bg-amber-950/20 border-amber-800/60' : 'bg-slate-900/60 border-slate-800'
          }`}>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasSprint}
                  onChange={(e) => setHasSprint(e.target.checked)}
                  className="w-4 h-4 rounded text-red-600 bg-slate-950 border-slate-700 focus:ring-red-500 cursor-pointer accent-red-600"
                />
                <div>
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Haverá Corrida Sprint nesta Etapa?</span>
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    {hasSprint
                      ? 'Sim, fim de semana contará com Corrida Sprint + Corrida Principal'
                      : 'Não, etapa tradicional com apenas Corrida Principal'}
                  </span>
                </div>
              </label>

              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ml-2 ${
                hasSprint
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                {hasSprint ? '⚡ Sprint Ativada' : 'Sem Sprint'}
              </span>
            </div>

            {hasSprint && (
              <div className="mt-2.5 pt-2.5 border-t border-amber-950/60 space-y-1">
                <label className="text-[11px] font-semibold text-amber-300 block">
                  Regulamento / Formato da Sprint
                </label>
                <input
                  type="text"
                  value={sprintFormat}
                  onChange={(e) => setSprintFormat(e.target.value)}
                  placeholder="Ex: Sprint Shootout + Corrida Sprint 15 voltas (100km)"
                  className="w-full bg-slate-950 border border-amber-900/70 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow transition-all cursor-pointer"
            >
              {isEditing ? 'Salvar Alterações' : 'Adicionar Etapa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
