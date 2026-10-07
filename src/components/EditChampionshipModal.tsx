import React, { useState } from 'react';
import {
  X,
  Settings,
  Shield,
  Save,
  Gamepad2,
  Trophy,
  Check,
  AlertCircle,
  Zap,
  Award,
  Users,
  FileText,
  Sliders,
} from 'lucide-react';
import { useChampionships } from '../context/ChampionshipContext';
import { Championship, ChampionshipCategory, ChampionshipStatus, ScoringRule, Simulator, DayOfWeek, StageRecurrence } from '../types';
import { PdfRulesUploader } from './PdfRulesUploader';

interface EditChampionshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  championship: Championship;
}

export const EditChampionshipModal: React.FC<EditChampionshipModalProps> = ({
  isOpen,
  onClose,
  championship,
}) => {
  const { updateChampionship } = useChampionships();

  // Basic settings
  const [name, setName] = useState(championship.name);
  const [simulator, setSimulator] = useState<Simulator>(championship.simulator);
  const [category, setCategory] = useState<ChampionshipCategory>(championship.category);
  const [season, setSeason] = useState(championship.season);
  const [status, setStatus] = useState<ChampionshipStatus>(championship.status);
  const [maxGrid, setMaxGrid] = useState<number>(championship.maxGrid);
  const [description, setDescription] = useState(championship.description || '');
  const [rulesDoc, setRulesDoc] = useState(championship.rulesDoc || '');
  const [rulesPdfUrl, setRulesPdfUrl] = useState<string | undefined>(championship.rulesPdfUrl);
  const [rulesPdfName, setRulesPdfName] = useState<string | undefined>(championship.rulesPdfName);
  const [rulesPdfSize, setRulesPdfSize] = useState<string | undefined>(championship.rulesPdfSize);
  const [defaultRaceDay, setDefaultRaceDay] = useState<DayOfWeek>(
    championship.defaultRaceDay || 'Quinta-feira'
  );
  const [recurrence, setRecurrence] = useState<StageRecurrence>(
    championship.recurrence || 'Semanal'
  );

  // Scoring rules
  const [scoringPreset, setScoringPreset] = useState<'f1' | 'f1_classic' | 'motogp' | 'top20' | 'custom'>('custom');
  const [scoringPoints, setScoringPoints] = useState<number[]>(
    championship.scoringRule?.positions || [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]
  );
  const [hasPoleBonus, setHasPoleBonus] = useState<boolean>(
    (championship.scoringRule?.poleBonus || 0) > 0
  );
  const [poleBonusPoints, setPoleBonusPoints] = useState<number>(
    championship.scoringRule?.poleBonus || 1
  );
  const [hasFastestLapBonus, setHasFastestLapBonus] = useState<boolean>(
    (championship.scoringRule?.fastestLapBonus || 0) > 0
  );
  const [fastestLapBonusPoints, setFastestLapBonusPoints] = useState<number>(
    championship.scoringRule?.fastestLapBonus || 1
  );
  const [dropWorstRounds, setDropWorstRounds] = useState<number>(
    championship.scoringRule?.dropWorstRounds || 0
  );

  const [activeTab, setActiveTab] = useState<'general' | 'scoring' | 'rules'>('general');
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  // Handle Preset Changes
  const applyPreset = (preset: 'f1' | 'f1_classic' | 'motogp' | 'top20') => {
    setScoringPreset(preset);
    if (preset === 'f1') {
      setScoringPoints([25, 18, 15, 12, 10, 8, 6, 4, 2, 1]);
    } else if (preset === 'f1_classic') {
      setScoringPoints([10, 6, 4, 3, 2, 1]);
    } else if (preset === 'motogp') {
      setScoringPoints([25, 20, 16, 13, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
    } else if (preset === 'top20') {
      setScoringPoints([20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
    }
  };

  const handlePositionPointChange = (index: number, val: number) => {
    setScoringPreset('custom');
    const updated = [...scoringPoints];
    updated[index] = Math.max(0, val);
    setScoringPoints(updated);
  };

  const addScoringPosition = () => {
    setScoringPreset('custom');
    setScoringPoints([...scoringPoints, 1]);
  };

  const removeScoringPosition = () => {
    if (scoringPoints.length <= 1) return;
    setScoringPreset('custom');
    setScoringPoints(scoringPoints.slice(0, -1));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const scoringRule: ScoringRule = {
      name:
        scoringPreset === 'f1'
          ? 'Padrão Oficial FIA (25-18-15...)'
          : scoringPreset === 'f1_classic'
          ? 'F1 Clássico (10-6-4-3-2-1)'
          : scoringPreset === 'motogp'
          ? 'MotoGP / Top 15 (25-20-16...)'
          : scoringPreset === 'top20'
          ? 'Top 20 com Pontuação'
          : `Sistema Personalizado (${scoringPoints.length} posições)`,
      positions: scoringPoints,
      poleBonus: hasPoleBonus ? poleBonusPoints : 0,
      fastestLapBonus: hasFastestLapBonus ? fastestLapBonusPoints : 0,
      dropWorstRounds,
    };

    updateChampionship(championship.id, {
      name: name.trim(),
      simulator,
      category,
      season: season.trim(),
      status,
      maxGrid: Number(maxGrid),
      description: description.trim(),
      rulesDoc: rulesDoc.trim(),
      rulesPdfUrl,
      rulesPdfName,
      rulesPdfSize,
      scoringRule,
      defaultRaceDay,
      recurrence,
    });

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0d131f] border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                Editar Configurações da Liga
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-sm sm:max-w-md">
                {championship.name}
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

        {/* Tab switcher */}
        <div className="px-5 pt-2 bg-slate-950 border-b border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'general'
                ? 'border-red-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Geral & Status
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('scoring')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'scoring'
                ? 'border-red-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Pontuação & Bônus
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'rules'
                ? 'border-red-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Regulamento & Descrição
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: General & Status */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Nome Oficial do Campeonato / Liga *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Status Selector */}
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Status Atual da Competição
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ChampionshipStatus)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
                  >
                    <option value="Inscrições Abertas">Inscrições Abertas (Pilotos podem solicitar)</option>
                    <option value="Em Andamento">Em Andamento (Temporada ativa)</option>
                    <option value="Em Breve">Em Breve (Divulgação / Pré-temporada)</option>
                    <option value="Finalizado">Finalizado (Temporada encerrada)</option>
                  </select>
                </div>

                {/* Season */}
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Temporada / Edição
                  </label>
                  <input
                    type="text"
                    required
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    placeholder="Ex: 2026.1 ou Season 2"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Simulator */}
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Simulador Oficial
                  </label>
                  <select
                    value={simulator}
                    onChange={(e) => setSimulator(e.target.value as Simulator)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
                  >
                    <option value="F1 25">F1 25 (EA Sports)</option>
                    <option value="F1 26">F1 26 (EA Sports)</option>
                    <option value="F1 24">F1 24 (EA Sports)</option>
                    <option value="Assetto Corsa Competizione">Assetto Corsa Competizione (ACC)</option>
                    <option value="Automobilista 2">Automobilista 2 (Reiza)</option>
                    <option value="iRacing">iRacing</option>
                    <option value="rFactor 2">rFactor 2</option>
                    <option value="Le Mans Ultimate">Le Mans Ultimate</option>
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Categoria dos Carros
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ChampionshipCategory)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
                  >
                    <option value="Formula 1">Formula 1</option>
                    <option value="GT3">Gran Turismo GT3</option>
                    <option value="Porsche Cup">Porsche Cup</option>
                    <option value="Protótipos GTP">Protótipos GTP / LMDh</option>
                    <option value="Touring Car TCR">Touring Car TCR</option>
                    <option value="Stock Car Pro">Stock Car Pro Series</option>
                  </select>
                </div>
              </div>

              {/* Max Grid Capacity */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">
                    Limite Máximo de Vagas no Grid de Largada
                  </label>
                  <span className="text-xs font-mono text-red-400 font-bold">{maxGrid} Pilotos</span>
                </div>
                <input
                  type="number"
                  min={10}
                  max={40}
                  required
                  value={maxGrid}
                  onChange={(e) => setMaxGrid(parseInt(e.target.value, 10) || 20)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Pilotos excedentes homologados após o limite serão automaticamente registrados como reservas.
                </span>
              </div>

              {/* Default Race Day & Recurrence */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Dia Padrão da Semana das Corridas
                  </label>
                  <select
                    value={defaultRaceDay}
                    onChange={(e) => setDefaultRaceDay(e.target.value as DayOfWeek)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
                  >
                    <option value="Domingo">📅 Domingo</option>
                    <option value="Segunda-feira">📅 Segunda-feira</option>
                    <option value="Terça-feira">📅 Terça-feira</option>
                    <option value="Quarta-feira">📅 Quarta-feira</option>
                    <option value="Quinta-feira">📅 Quinta-feira</option>
                    <option value="Sexta-feira">📅 Sexta-feira</option>
                    <option value="Sábado">📅 Sábado</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Frequência Padrão entre Etapas
                  </label>
                  <select
                    value={recurrence}
                    onChange={(e) => setRecurrence(e.target.value as StageRecurrence)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
                  >
                    <option value="Semanal">Semanal (Toda semana / 7 dias)</option>
                    <option value="Quinzenal">Quinzenal (A cada 14 dias)</option>
                    <option value="Mensal">Mensal (A cada 28 dias)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Scoring & Bonuses */}
          {activeTab === 'scoring' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">
                  Tabela Pré-definida de Pontos
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset('f1')}
                    className={`p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-left ${
                      scoringPreset === 'f1'
                        ? 'bg-red-950 border-red-500 text-white'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold">Padrão F1 / FIA</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">Top 10 (25-18-15...)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('f1_classic')}
                    className={`p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-left ${
                      scoringPreset === 'f1_classic'
                        ? 'bg-red-950 border-red-500 text-white'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold">F1 Clássico</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">Top 6 (10-6-4-3-2-1)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('motogp')}
                    className={`p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-left ${
                      scoringPreset === 'motogp'
                        ? 'bg-red-950 border-red-500 text-white'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold">MotoGP</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">Top 15 (25-20-16...)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('top20')}
                    className={`p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-left ${
                      scoringPreset === 'top20'
                        ? 'bg-red-950 border-red-500 text-white'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold">Top 20 Todos</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">Pontua até o 20º</div>
                  </button>
                </div>
              </div>

              {/* Individual Points Editor */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Pontos por Posição de Chegada ({scoringPoints.length} Posições)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={removeScoringPosition}
                      disabled={scoringPoints.length <= 1}
                      className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                    >
                      - Remover
                    </button>
                    <button
                      type="button"
                      onClick={addScoringPosition}
                      className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 hover:bg-slate-700 cursor-pointer"
                    >
                      + Adicionar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  {scoringPoints.map((pts, idx) => (
                    <div key={idx} className="text-center">
                      <span className="text-[9px] text-slate-500 block mb-0.5 font-bold">
                        P{idx + 1}
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={pts}
                        onChange={(e) => handlePositionPointChange(idx, parseInt(e.target.value, 10) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 text-center py-1 rounded text-xs font-mono text-white focus:outline-none focus:border-red-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Extra Bonuses */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Pontos Bônus em Etapa
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Pole position bonus */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="editPoleBonus"
                        checked={hasPoleBonus}
                        onChange={(e) => setHasPoleBonus(e.target.checked)}
                        className="rounded border-slate-700 text-red-600 focus:ring-0 cursor-pointer"
                      />
                      <label htmlFor="editPoleBonus" className="text-xs text-slate-300 cursor-pointer">
                        Bônus de Pole Position
                      </label>
                    </div>
                    {hasPoleBonus && (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={poleBonusPoints}
                          onChange={(e) => setPoleBonusPoints(parseInt(e.target.value, 10) || 1)}
                          className="w-12 bg-slate-950 border border-slate-700 text-center py-0.5 rounded text-xs font-mono text-amber-400"
                        />
                        <span className="text-[10px] text-slate-400">pt</span>
                      </div>
                    )}
                  </div>

                  {/* Fastest lap bonus */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="editVrBonus"
                        checked={hasFastestLapBonus}
                        onChange={(e) => setHasFastestLapBonus(e.target.checked)}
                        className="rounded border-slate-700 text-red-600 focus:ring-0 cursor-pointer"
                      />
                      <label htmlFor="editVrBonus" className="text-xs text-slate-300 cursor-pointer">
                        Bônus de Volta Mais Rápida
                      </label>
                    </div>
                    {hasFastestLapBonus && (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={fastestLapBonusPoints}
                          onChange={(e) => setFastestLapBonusPoints(parseInt(e.target.value, 10) || 1)}
                          className="w-12 bg-slate-950 border border-slate-700 text-center py-0.5 rounded text-xs font-mono text-red-400"
                        />
                        <span className="text-[10px] text-slate-400">pt</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Drop worst rounds */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <span className="text-xs text-slate-400">Descarte dos piores resultados:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={5}
                      value={dropWorstRounds}
                      onChange={(e) => setDropWorstRounds(parseInt(e.target.value, 10) || 0)}
                      className="w-14 bg-slate-900 border border-slate-700 text-center py-1 rounded text-xs font-mono text-white"
                    />
                    <span className="text-xs text-slate-400">etapa(s)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Rules & Description */}
          {activeTab === 'rules' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Descrição da Liga & Informações aos Pilotos
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Informações gerais, dias de corrida, servidor, briefing e canais de comunicação..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Upload & Download PDF Regulation */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <PdfRulesUploader
                  rulesPdfUrl={rulesPdfUrl}
                  rulesPdfName={rulesPdfName}
                  rulesPdfSize={rulesPdfSize}
                  onChange={({ rulesPdfUrl, rulesPdfName, rulesPdfSize }) => {
                    setRulesPdfUrl(rulesPdfUrl);
                    setRulesPdfName(rulesPdfName);
                    setRulesPdfSize(rulesPdfSize);
                  }}
                  label="Documento Oficial do Regulamento (Arquivo PDF)"
                  subtitle="Faça upload do PDF oficial da liga. Os pilotos poderão fazer o download diretamente pela página do campeonato."
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Regulamento Desportivo & Técnico em Texto (Opcional / Resumo)
                </label>
                <textarea
                  rows={4}
                  value={rulesDoc}
                  onChange={(e) => setRulesDoc(e.target.value)}
                  placeholder="Cole aqui o texto do regulamento oficial ou o link do PDF/Google Docs da liga..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500 font-mono text-[11px]"
                />
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800 mt-6">
            <span className="text-xs text-slate-500">
              {saveSuccess && (
                <span className="text-emerald-400 font-semibold flex items-center gap-1 animate-in fade-in">
                  <Check className="w-4 h-4" /> Alterações salvas com sucesso!
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
                className="flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold text-xs px-5 py-2 rounded-xl shadow-lg shadow-red-950 cursor-pointer transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Configurações</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
