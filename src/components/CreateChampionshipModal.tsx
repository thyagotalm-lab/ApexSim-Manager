import React, { useState, useMemo } from 'react';
import { X, Trophy, Flag, Plus, Trash2, Calendar, Shield, Clock, Sparkles, Check, ChevronDown, Award, Zap, RefreshCw, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChampionships } from '../context/ChampionshipContext';
import { OFFICIAL_F1_CIRCUITS, F1Circuit } from '../data/f1Circuits';
import { CountryFlag } from './CountryFlag';
import { ChampionshipCategory, Simulator, ScoringRule, DayOfWeek, StageRecurrence, User } from '../types';
import { PdfRulesUploader } from './PdfRulesUploader';

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export const DAY_OF_WEEK_MAP: Record<DayOfWeek, number> = {
  'Domingo': 0,
  'Segunda-feira': 1,
  'Terça-feira': 2,
  'Quarta-feira': 3,
  'Quinta-feira': 4,
  'Sexta-feira': 5,
  'Sábado': 6,
};

export const DAY_OF_WEEK_SHORT: Record<number, string> = {
  0: 'Dom',
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
};

export const getNextDateForDayOfWeek = (dayName: DayOfWeek, fromDate: Date = new Date()): string => {
  const targetDay = DAY_OF_WEEK_MAP[dayName];
  const date = new Date(fromDate);
  const currentDay = date.getDay();
  let daysUntilTarget = (targetDay - currentDay + 7) % 7;
  if (daysUntilTarget === 0) {
    daysUntilTarget = 7;
  }
  date.setDate(date.getDate() + daysUntilTarget);
  return date.toISOString().split('T')[0];
};

export const getDayOfWeekInfo = (dateStr: string): { shortName: string; fullName: string; dayIndex: number } => {
  if (!dateStr) return { shortName: '', fullName: '', dayIndex: -1 };
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return { shortName: '', fullName: '', dayIndex: -1 };
  const idx = d.getDay();
  return {
    shortName: DAY_OF_WEEK_SHORT[idx] || '',
    fullName: DAYS_OF_WEEK[idx] || '',
    dayIndex: idx,
  };
};

interface CreateChampionshipModalProps {
  onClose: () => void;
}

export const CreateChampionshipModal: React.FC<CreateChampionshipModalProps> = ({ onClose }) => {
  const { currentUser, users } = useAuth();
  const { championships, createChampionship } = useChampionships();

  const [name, setName] = useState('');
  const [simulator, setSimulator] = useState<Simulator>('F1 25');
  const [category, setCategory] = useState<ChampionshipCategory>('Formula 1');
  const [season, setSeason] = useState('2026.1');
  const [maxGrid, setMaxGrid] = useState<number>(20);
  const [raceTime, setRaceTime] = useState<string>('21:00 BRT');
  const [description, setDescription] = useState('');
  const [rulesPdfUrl, setRulesPdfUrl] = useState<string | undefined>(undefined);
  const [rulesPdfName, setRulesPdfName] = useState<string | undefined>(undefined);
  const [rulesPdfSize, setRulesPdfSize] = useState<string | undefined>(undefined);

  // League admin selection state
  const [selectedAdminIds, setSelectedAdminIds] = useState<string[]>([]);
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [isAdminSectionOpen, setIsAdminSectionOpen] = useState(false);

  // Consolidate all users: AuthContext users + any user who registered in any championship
  const allRegisteredUsers = useMemo(() => {
    const map = new Map<string, User>();
    users.forEach((u) => map.set(u.id, u));
    championships.forEach((c) => {
      c.registrations.forEach((reg) => {
        if (!map.has(reg.userId)) {
          map.set(reg.userId, {
            id: reg.userId,
            name: reg.userName,
            email: reg.userEmail,
            avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250`,
            role: 'pilot',
            country: 'Brasil 🇧🇷',
            racingNumber: reg.carNumber,
            discordTag: reg.discord,
            steamId: reg.steamGuid,
            administeredLeagueIds: [],
            stats: {
              races: 10,
              wins: 1,
              podiums: 3,
              poles: 1,
              fastestLaps: 1,
              points: 85,
              dnfs: 1,
              safetyRating: 'B 3.50',
              simRating: 3000,
            },
          });
        }
      });
    });
    return Array.from(map.values());
  }, [users, championships]);

  // Default race day of the week and recurrence state
  const [defaultRaceDay, setDefaultRaceDay] = useState<DayOfWeek>('Quinta-feira');
  const [stageRecurrence, setStageRecurrence] = useState<StageRecurrence>('Semanal');
  const [firstStageDate, setFirstStageDate] = useState<string>(() => {
    return getNextDateForDayOfWeek('Quinta-feira');
  });

  // Scoring rules state
  const [scoringPreset, setScoringPreset] = useState<'f1' | 'f1_classic' | 'motogp' | 'top20' | 'custom'>('f1');
  const [scoringPositionsCount, setScoringPositionsCount] = useState<number>(10);
  const [scoringPoints, setScoringPoints] = useState<number[]>([25, 18, 15, 12, 10, 8, 6, 4, 2, 1]);
  const [sprintScoringPoints, setSprintScoringPoints] = useState<number[]>([8, 7, 6, 5, 4, 3, 2, 1]);
  
  // Extra points options
  const [hasPoleBonus, setHasPoleBonus] = useState<boolean>(true);
  const [poleBonusPoints, setPoleBonusPoints] = useState<number>(1);
  const [hasFastestLapBonus, setHasFastestLapBonus] = useState<boolean>(true);
  const [fastestLapBonusPoints, setFastestLapBonusPoints] = useState<number>(1);

  // Selected F1 circuit from dropdown
  const [selectedF1CircuitId, setSelectedF1CircuitId] = useState<string>(OFFICIAL_F1_CIRCUITS[0].id);

  const isF1Simulator = simulator === 'F1 24' || simulator === 'F1 25' || simulator === 'F1 26';

  // Initial stage template
  const [initialStages, setInitialStages] = useState<Array<{
    trackName: string;
    trackCountry: string;
    trackFlag: string;
    circuitLength?: string;
    date: string;
    time: string;
    format: string;
    hasSprint?: boolean;
    sprintFormat?: string;
  }>>(() => {
    const baseDate = new Date(getNextDateForDayOfWeek('Quinta-feira') + 'T12:00:00');
    return [
      {
        trackName: 'Bahrain International Circuit (Sakhir)',
        trackCountry: 'Bahrein',
        trackFlag: '🇧🇭',
        circuitLength: '5.412 km',
        date: new Date(baseDate.getTime() + 0 * 7 * 86400000).toISOString().split('T')[0],
        time: '21:00 BRT',
        format: 'Quali 18min + Corrida 50%',
      },
      {
        trackName: 'Circuit de Monaco (Monte Carlo)',
        trackCountry: 'Mônaco',
        trackFlag: '🇲🇨',
        circuitLength: '3.337 km',
        date: new Date(baseDate.getTime() + 1 * 7 * 86400000).toISOString().split('T')[0],
        time: '21:00 BRT',
        format: 'Quali 18min + Corrida 50%',
      },
      {
        trackName: 'Autódromo de Interlagos (São Paulo)',
        trackCountry: 'Brasil',
        trackFlag: '🇧🇷',
        circuitLength: '4.309 km',
        date: new Date(baseDate.getTime() + 2 * 7 * 86400000).toISOString().split('T')[0],
        time: '21:00 BRT',
        format: 'Sprint Shootout + Sprint + Corrida 50%',
      },
    ];
  });

  // Handle simulator change: auto-select Formula 1 category if F1 game is chosen
  const handleSimulatorChange = (sim: Simulator) => {
    setSimulator(sim);
    if (sim === 'F1 24' || sim === 'F1 25' || sim === 'F1 26') {
      setCategory('Formula 1');
      setMaxGrid(20);
    }
  };

  // Get numeric days for current recurrence
  const getIntervalDays = (rec: StageRecurrence = stageRecurrence): number => {
    return rec === 'Semanal' ? 7 : rec === 'Quinzenal' ? 14 : 28;
  };

  // Re-calculate stages dates according to chosen day of the week and frequency
  const handleApplyRaceDayToStages = (
    day: DayOfWeek = defaultRaceDay,
    recurrence: StageRecurrence = stageRecurrence,
    customStartDate?: string
  ) => {
    const intervalDays = getIntervalDays(recurrence);
    const startStr = customStartDate || firstStageDate;
    let baseDate: Date;

    if (startStr) {
      baseDate = new Date(startStr + 'T12:00:00');
      // If start date doesn't match the selected day of week, snap to that weekday
      const targetDayIdx = DAY_OF_WEEK_MAP[day];
      if (baseDate.getDay() !== targetDayIdx) {
        const nextMatch = getNextDateForDayOfWeek(day, new Date(baseDate.getTime() - 86400000));
        baseDate = new Date(nextMatch + 'T12:00:00');
        setFirstStageDate(nextMatch);
      }
    } else {
      const nextMatch = getNextDateForDayOfWeek(day);
      baseDate = new Date(nextMatch + 'T12:00:00');
      setFirstStageDate(nextMatch);
    }

    setInitialStages((prev) =>
      prev.map((stage, index) => {
        const stageDate = new Date(baseDate.getTime() + index * intervalDays * 86400000);
        return {
          ...stage,
          date: stageDate.toISOString().split('T')[0],
          time: raceTime || stage.time,
        };
      })
    );
  };

  const handleDefaultRaceDayChange = (newDay: DayOfWeek) => {
    setDefaultRaceDay(newDay);
    const newStartDate = getNextDateForDayOfWeek(newDay);
    setFirstStageDate(newStartDate);
    handleApplyRaceDayToStages(newDay, stageRecurrence, newStartDate);
  };

  const handleRecurrenceChange = (newRecurrence: StageRecurrence) => {
    setStageRecurrence(newRecurrence);
    handleApplyRaceDayToStages(defaultRaceDay, newRecurrence, firstStageDate);
  };

  const handleFirstStageDateChange = (newDateStr: string) => {
    setFirstStageDate(newDateStr);
    const dayInfo = getDayOfWeekInfo(newDateStr);
    if (dayInfo.fullName) {
      setDefaultRaceDay(dayInfo.fullName as DayOfWeek);
      handleApplyRaceDayToStages(dayInfo.fullName as DayOfWeek, stageRecurrence, newDateStr);
    } else {
      handleApplyRaceDayToStages(defaultRaceDay, stageRecurrence, newDateStr);
    }
  };

  // Add individual F1 circuit
  const handleAddF1Circuit = () => {
    const circuit = OFFICIAL_F1_CIRCUITS.find((c) => c.id === selectedF1CircuitId);
    if (!circuit) return;

    const intervalDays = getIntervalDays();
    const baseDate = new Date(firstStageDate + 'T12:00:00');
    const nextDate = new Date(baseDate.getTime() + initialStages.length * intervalDays * 86400000)
      .toISOString()
      .split('T')[0];

    setInitialStages((prev) => [
      ...prev,
      {
        trackName: `${circuit.trackName} (${circuit.city})`,
        trackCountry: circuit.country,
        trackFlag: circuit.flag,
        circuitLength: circuit.length,
        date: nextDate,
        time: raceTime,
        format: circuit.defaultFormat,
      },
    ]);
  };

  // Load all 24 official F1 circuits in calendar order aligned with chosen day of week
  const handleLoadFullF1Calendar = () => {
    const intervalDays = getIntervalDays();
    const baseDate = new Date(firstStageDate + 'T12:00:00');

    const fullCalendar = OFFICIAL_F1_CIRCUITS.slice(0, 24).map((c, i) => {
      const stageDate = new Date(baseDate.getTime() + i * intervalDays * 86400000)
        .toISOString()
        .split('T')[0];
      return {
        trackName: `${c.trackName} (${c.city})`,
        trackCountry: c.country,
        trackFlag: c.flag,
        circuitLength: c.length,
        date: stageDate,
        time: raceTime,
        format: c.defaultFormat,
      };
    });
    setInitialStages(fullCalendar);
  };

  // Load top 6 classic F1 circuits aligned with chosen day of week
  const handleLoadClassicF1Calendar = () => {
    const classicIds = [
      'f1_sakhir',
      'f1_monaco',
      'f1_silverstone',
      'f1_spa',
      'f1_monza',
      'f1_interlagos',
    ];
    const intervalDays = getIntervalDays();
    const baseDate = new Date(firstStageDate + 'T12:00:00');

    const classicStages = OFFICIAL_F1_CIRCUITS.filter((c) => classicIds.includes(c.id)).map(
      (c, i) => {
        const stageDate = new Date(baseDate.getTime() + i * intervalDays * 86400000)
          .toISOString()
          .split('T')[0];
        return {
          trackName: `${c.trackName} (${c.city})`,
          trackCountry: c.country,
          trackFlag: c.flag,
          circuitLength: c.length,
          date: stageDate,
          time: raceTime,
          format: c.defaultFormat,
        };
      }
    );
    setInitialStages(classicStages);
  };

  // Apply default race time to all stages
  const handleApplyTimeToAllStages = (newTime: string) => {
    setRaceTime(newTime);
    setInitialStages((prev) => prev.map((st) => ({ ...st, time: newTime })));
  };

  const addStageRow = () => {
    const intervalDays = getIntervalDays();
    const baseDate = new Date(firstStageDate + 'T12:00:00');
    const stageDate = new Date(baseDate.getTime() + initialStages.length * intervalDays * 86400000)
      .toISOString()
      .split('T')[0];

    setInitialStages((prev) => [
      ...prev,
      {
        trackName: 'Novo Circuito',
        trackCountry: 'Brasil',
        trackFlag: '🇧🇷',
        circuitLength: '4.300 km',
        date: stageDate,
        time: raceTime,
        format: 'Quali 15min + Corrida 45min',
      },
    ]);
  };

  const removeStageRow = (index: number) => {
    setInitialStages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApplyPreset = (preset: 'f1' | 'f1_classic' | 'motogp' | 'top20') => {
    setScoringPreset(preset);
    if (preset === 'f1') {
      setScoringPositionsCount(10);
      setScoringPoints([25, 18, 15, 12, 10, 8, 6, 4, 2, 1]);
      setSprintScoringPoints([8, 7, 6, 5, 4, 3, 2, 1]);
    } else if (preset === 'f1_classic') {
      setScoringPositionsCount(8);
      setScoringPoints([10, 8, 6, 5, 4, 3, 2, 1]);
      setSprintScoringPoints([5, 4, 3, 2, 1]);
    } else if (preset === 'motogp') {
      setScoringPositionsCount(15);
      setScoringPoints([25, 20, 16, 13, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
      setSprintScoringPoints([12, 9, 7, 6, 5, 4, 3, 2, 1]);
    } else if (preset === 'top20') {
      setScoringPositionsCount(20);
      setScoringPoints([30, 25, 22, 19, 17, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
      setSprintScoringPoints([10, 8, 6, 5, 4, 3, 2, 1]);
    }
  };

  const handlePositionsCountChange = (newCount: number) => {
    const validCount = Math.max(1, Math.min(30, newCount));
    setScoringPositionsCount(validCount);
    setScoringPreset('custom');
    setScoringPoints((prev) => {
      if (validCount === prev.length) return prev;
      if (validCount < prev.length) {
        return prev.slice(0, validCount);
      }
      const expanded = [...prev];
      while (expanded.length < validCount) {
        const lastVal = expanded[expanded.length - 1] ?? 1;
        expanded.push(Math.max(1, lastVal - 1));
      }
      return expanded;
    });
  };

  const handlePointChange = (index: number, value: number) => {
    setScoringPreset('custom');
    setScoringPoints((prev) => {
      const copy = [...prev];
      copy[index] = Math.max(0, value);
      return copy;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const scoringRule: ScoringRule = {
      name: `Sistema Oficial (${scoringPoints.length} Posições)`,
      positions: scoringPoints,
      sprintPositions: sprintScoringPoints,
      poleBonus: hasPoleBonus ? Number(poleBonusPoints) || 0 : 0,
      fastestLapBonus: hasFastestLapBonus ? Number(fastestLapBonusPoints) || 0 : 0,
      dropWorstRounds: 0,
    };

    const creatorId = currentUser?.id || 'user_thyago_talm';
    const finalAdminIds = Array.from(
      new Set([creatorId, 'user_thyago_talm', ...selectedAdminIds])
    );
    const finalAdminEmails = Array.from(
      new Set([
        'thyago.talm@gmail.com',
        ...(currentUser?.email ? [currentUser.email.toLowerCase().trim()] : []),
        ...selectedAdminIds
          .map((id) => allRegisteredUsers.find((u) => u.id === id)?.email?.toLowerCase().trim())
          .filter(Boolean) as string[],
      ])
    );

    createChampionship({
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      description: description || 'Campeonato oficial organizado na plataforma ApexSim Manager.',
      rulesDoc: description || undefined,
      rulesPdfUrl,
      rulesPdfName,
      rulesPdfSize,
      simulator,
      category,
      season,
      status: 'Inscrições Abertas',
      maxGrid: Number(maxGrid) || 20,
      trackBgColor: isF1Simulator ? 'from-red-950/70 to-slate-900' : 'from-slate-950 to-slate-900',
      adminIds: finalAdminIds,
      adminEmails: finalAdminEmails,
      scoringRule,
      defaultRaceDay,
      recurrence: stageRecurrence,
      initialStages: initialStages.map((s) => ({
        trackName: s.trackName,
        trackCountry: s.trackCountry,
        trackFlag: s.trackFlag,
        circuitLength: s.circuitLength || '4.500 km',
        date: s.date,
        time: s.time || raceTime,
        format: s.format,
        weather: 'Pista Seca',
        hasSprint: s.hasSprint || false,
        sprintFormat: s.hasSprint ? (s.sprintFormat || 'Corrida Sprint 100km') : undefined,
      })),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#0c121e] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between shrink-0">
          <div>
            <div className="text-xs text-red-400 uppercase font-semibold flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-red-400" />
              <span>Criação de Liga & Campeonato</span>
            </div>
            <h2 className="text-lg font-bold text-white font-display">
              Configurar Novo Campeonato
            </h2>
            <div className="text-xs text-slate-400 mt-0.5">
              Defina o simulador, horário oficial das etapas e os circuitos da temporada.
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Nome do Campeonato
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Campeonato Brasileiro F1 25 Pro Series"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Simulator, Category, Season and Max Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Simulador</label>
              <select
                value={simulator}
                onChange={(e) => handleSimulatorChange(e.target.value as Simulator)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
              >
                <option value="F1 25">🏎️ F1 25 (EA Sports)</option>
                <option value="F1 26">⚡ F1 26 (EA Sports)</option>
                <option value="F1 24">🏁 F1 24 (EA Sports)</option>
                <option value="Assetto Corsa Competizione">Assetto Corsa Competizione</option>
                <option value="iRacing">iRacing</option>
                <option value="Automobilista 2">Automobilista 2</option>
                <option value="rFactor 2">rFactor 2</option>
                <option value="Le Mans Ultimate">Le Mans Ultimate</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ChampionshipCategory)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
              >
                <option value="Formula 1">Formula 1</option>
                <option value="GT3">GT3</option>
                <option value="Protótipos GTP">Protótipos GTP / LMDh</option>
                <option value="Porsche Cup">Porsche Cup</option>
                <option value="Touring Car TCR">Touring Car TCR</option>
                <option value="Stock Car Pro">Stock Car Pro</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Temporada</label>
              <input
                type="text"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                placeholder="Ex: 2026.1"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Grid Máximo</label>
              <input
                type="number"
                min="10"
                max="60"
                value={maxGrid}
                onChange={(e) => setMaxGrid(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-mono-numbers"
              />
            </div>
          </div>

          {/* Horário da Corrida (Race Time Selection) */}
          <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-red-400" />
                <span>Horário Oficial da Corrida / Largada</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Padrão aplicado às etapas do campeonato
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={raceTime}
                onChange={(e) => handleApplyTimeToAllStages(e.target.value)}
                placeholder="Ex: 21:00 BRT"
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500 font-mono-numbers w-36"
              />

              {/* Quick Race Time Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-500 mr-1">Atalhos rápidos:</span>
                {['20:00 BRT', '20:30 BRT', '21:00 BRT', '21:30 BRT', '22:00 BRT'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleApplyTimeToAllStages(t)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono-numbers transition-colors cursor-pointer ${
                      raceTime === t
                        ? 'bg-red-600 text-white font-semibold'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sistema de Escolha de Pontuação */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div>
                <div className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-red-400" />
                  <span>Regulamento & Sistema de Pontuação</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Defina quantas posições pontuam no grid e personalize os pontos por colocação e bônus.
                </p>
              </div>

              {/* Presets rápidos */}
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] text-slate-500 uppercase mr-1">Modelos:</span>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('f1')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    scoringPreset === 'f1'
                      ? 'bg-red-600 text-white font-semibold shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  FIA F1 (Top 10)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('f1_classic')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    scoringPreset === 'f1_classic'
                      ? 'bg-red-600 text-white font-semibold shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Top 8
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('motogp')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    scoringPreset === 'motogp'
                      ? 'bg-red-600 text-white font-semibold shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Top 15
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('top20')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    scoringPreset === 'top20'
                      ? 'bg-red-600 text-white font-semibold shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Top 20
                </button>
              </div>
            </div>

            {/* Quantas Posições Pontuam */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
              <div>
                <label className="text-xs font-semibold text-slate-200 block">
                  Quantas posições pontuam no resultado final?
                </label>
                <span className="text-[11px] text-slate-400">
                  Pilotos da 1ª até a {scoringPositionsCount}ª colocação receberão pontos válidos na tabela.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 flex-wrap">
                  {[5, 8, 10, 12, 15, 20].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handlePositionsCountChange(num)}
                      className={`px-2 py-1 rounded text-xs font-mono-numbers transition-colors cursor-pointer ${
                        scoringPositionsCount === num
                          ? 'bg-red-600 text-white font-bold'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={scoringPositionsCount}
                    onChange={(e) => handlePositionsCountChange(parseInt(e.target.value, 10) || 1)}
                    className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white text-center font-mono-numbers font-bold focus:outline-none focus:border-red-500"
                  />
                  <span className="text-[10px] text-slate-500 block text-center mt-0.5">posições</span>
                </div>
              </div>
            </div>

            {/* Tabela Interativa de Pontuação por Posição (P1, P2, P3...) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300">
                  Pontuação Atribuída por Posição de Chegada
                </span>
                <span className="text-[11px] text-slate-500">
                  Clique no valor para editar individualmente
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-2 max-h-52 overflow-y-auto p-1">
                {scoringPoints.map((pts, idx) => {
                  const pos = idx + 1;
                  const isPodium = pos <= 3;
                  return (
                    <div
                      key={pos}
                      className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all ${
                        pos === 1
                          ? 'bg-amber-950/30 border-amber-600/50'
                          : pos === 2
                          ? 'bg-slate-800/80 border-slate-500/50'
                          : pos === 3
                          ? 'bg-amber-950/20 border-amber-800/40'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        {pos === 1 && <span className="text-amber-400 text-xs">🥇</span>}
                        {pos === 2 && <span className="text-slate-300 text-xs">🥈</span>}
                        {pos === 3 && <span className="text-amber-600 text-xs">🥉</span>}
                        <span className={`text-[11px] font-bold ${
                          pos === 1 ? 'text-amber-300' : isPodium ? 'text-white' : 'text-slate-400'
                        }`}>
                          P{pos}
                        </span>
                      </div>

                      <div className="relative w-full">
                        <input
                          type="number"
                          min={0}
                          max={500}
                          value={pts}
                          onChange={(e) => handlePointChange(idx, parseInt(e.target.value, 10) || 0)}
                          className="w-full bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-red-500 rounded px-1.5 py-1 text-xs text-white text-center font-mono-numbers font-bold focus:outline-none"
                        />
                      </div>
                      <span className="text-[9px] text-slate-500 mt-0.5">pts</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bonificações Extras: Pole Position e Volta Mais Rápida */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              {/* Extra Pole Position */}
              <div className={`p-3 rounded-xl border transition-all ${
                hasPoleBonus ? 'bg-red-950/20 border-red-800/60' : 'bg-slate-950/40 border-slate-800/80 opacity-70'
              }`}>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hasPoleBonus}
                      onChange={(e) => setHasPoleBonus(e.target.checked)}
                      className="w-4 h-4 rounded text-red-600 bg-slate-900 border-slate-700 focus:ring-red-500 cursor-pointer accent-red-600"
                    />
                    <div>
                      <span className="text-xs font-semibold text-white block">
                        Pontuação Extra para Pole Position
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Bônus para o piloto mais rápido na classificação
                      </span>
                    </div>
                  </label>

                  {hasPoleBonus && (
                    <div className="flex items-center gap-1.5 ml-2">
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={poleBonusPoints}
                        onChange={(e) => setPoleBonusPoints(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-14 bg-slate-900 border border-red-800/80 rounded-lg px-2 py-1 text-xs text-white text-center font-mono-numbers font-bold focus:outline-none"
                      />
                      <span className="text-xs text-red-400 font-semibold">pt{poleBonusPoints > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Extra Volta Mais Rápida */}
              <div className={`p-3 rounded-xl border transition-all ${
                hasFastestLapBonus ? 'bg-red-950/20 border-red-800/60' : 'bg-slate-950/40 border-slate-800/80 opacity-70'
              }`}>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hasFastestLapBonus}
                      onChange={(e) => setHasFastestLapBonus(e.target.checked)}
                      className="w-4 h-4 rounded text-red-600 bg-slate-900 border-slate-700 focus:ring-red-500 cursor-pointer accent-red-600"
                    />
                    <div>
                      <span className="text-xs font-semibold text-white block">
                        Pontuação Extra para Volta Mais Rápida
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Bônus para o piloto que cravar a melhor volta
                      </span>
                    </div>
                  </label>

                  {hasFastestLapBonus && (
                    <div className="flex items-center gap-1.5 ml-2">
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={fastestLapBonusPoints}
                        onChange={(e) => setFastestLapBonusPoints(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-14 bg-slate-900 border border-red-800/80 rounded-lg px-2 py-1 text-xs text-white text-center font-mono-numbers font-bold focus:outline-none"
                      />
                      <span className="text-xs text-red-400 font-semibold">pt{fastestLapBonusPoints > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Pontuação Oficial para Corridas Sprint */}
            <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/60 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-amber-300 block">
                      Pontuação para Corridas Sprint (Quando ativadas nas etapas)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Pilotos e equipes pontuam seguindo esta escala nas etapas com corrida Sprint.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400">Modelos:</span>
                  <button
                    type="button"
                    onClick={() => setSprintScoringPoints([8, 7, 6, 5, 4, 3, 2, 1])}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-600/50 cursor-pointer"
                  >
                    FIA F1 Top 8
                  </button>
                  <button
                    type="button"
                    onClick={() => setSprintScoringPoints([5, 4, 3, 2, 1])}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                  >
                    Top 5
                  </button>
                  <button
                    type="button"
                    onClick={() => setSprintScoringPoints([12, 9, 7, 6, 5, 4, 3, 2, 1])}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                  >
                    MotoGP Top 9
                  </button>
                </div>
              </div>

              {/* Sprint Points row */}
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 pt-1">
                {sprintScoringPoints.map((pts, idx) => (
                  <div key={idx} className="bg-slate-950/80 border border-amber-900/50 rounded-lg p-1.5 text-center">
                    <span className="text-[9px] text-amber-400 font-mono font-bold block">P{idx + 1}</span>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={pts}
                      onChange={(e) => {
                        const copy = [...sprintScoringPoints];
                        copy[idx] = Math.max(0, parseInt(e.target.value, 10) || 0);
                        setSprintScoringPoints(copy);
                      }}
                      className="w-full bg-slate-900 text-white font-mono font-bold text-xs text-center rounded border border-slate-800 py-0.5 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Formula 1 Official Circuits Section (Active when F1 24, F1 25, or F1 26 is chosen) */}
          {isF1Simulator && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-900 border border-red-800/60 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-bold text-red-300 uppercase tracking-wider">
                    Circuitos Oficiais do {simulator} (Calendário Formula 1)
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {OFFICIAL_F1_CIRCUITS.length} pistas oficiais catalogadas
                </span>
              </div>

              {/* Circuit dropdown selector */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <select
                    value={selectedF1CircuitId}
                    onChange={(e) => setSelectedF1CircuitId(e.target.value)}
                    className="w-full bg-slate-950 border border-red-900/60 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
                  >
                    {OFFICIAL_F1_CIRCUITS.map((circuit) => (
                      <option key={circuit.id} value={circuit.id}>
                        {circuit.flag} {circuit.gpName} — {circuit.trackName} ({circuit.length})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleAddF1Circuit}
                  className="flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Circuito Selecionado</span>
                </button>
              </div>

              {/* Fast Preset Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-red-950/60">
                <span className="text-[11px] text-slate-400">Modelos prontos de temporada:</span>
                <button
                  type="button"
                  onClick={handleLoadFullF1Calendar}
                  className="px-3 py-1 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-800 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-red-400" />
                  <span>Carregar Todos os 24 GPs da F1</span>
                </button>

                <button
                  type="button"
                  onClick={handleLoadClassicF1Calendar}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>Top 6 Circuitos Clássicos da F1</span>
                </button>
              </div>
            </div>
          )}

          {/* Description & Rules */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Regulamento & Descrição Breve
              </label>
              <textarea
                rows={2}
                placeholder="Descreva formato das corridas, punições, paradas obrigatórias, telemetria permitida..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
              />
            </div>

            {/* PDF Rules Uploader */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <PdfRulesUploader
                rulesPdfUrl={rulesPdfUrl}
                rulesPdfName={rulesPdfName}
                rulesPdfSize={rulesPdfSize}
                onChange={({ rulesPdfUrl, rulesPdfName, rulesPdfSize }) => {
                  setRulesPdfUrl(rulesPdfUrl);
                  setRulesPdfName(rulesPdfName);
                  setRulesPdfSize(rulesPdfSize);
                }}
                label="Regulamento Oficial da Liga (Arquivo PDF)"
                subtitle="Anexe o regulamento completo da liga em formato PDF para que os pilotos possam fazer download."
              />
            </div>
          </div>

          {/* Administradores do Campeonato (Usuários Cadastrados no App) */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-red-400" />
                  <span>Administradores da Liga ({1 + selectedAdminIds.filter((id) => id !== 'user_thyago_talm').length})</span>
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Selecione outros usuários cadastrados no app para conceder acesso de gestão nesta liga.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAdminSectionOpen(!isAdminSectionOpen)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
              >
                <span>{isAdminSectionOpen ? 'Ocultar Lista' : 'Selecionar Usuários'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isAdminSectionOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {isAdminSectionOpen && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar usuários cadastrados para adicionar como admin..."
                    value={adminSearchTerm}
                    onChange={(e) => setAdminSearchTerm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {allRegisteredUsers
                    .filter((u) => {
                      const term = adminSearchTerm.toLowerCase().trim();
                      if (!term) return true;
                      return (
                        u.name.toLowerCase().includes(term) ||
                        u.email.toLowerCase().includes(term) ||
                        (u.discordTag && u.discordTag.toLowerCase().includes(term))
                      );
                    })
                    .map((user) => {
                      const isThyago = user.email.toLowerCase() === 'thyago.talm@gmail.com';
                      const isSelected = isThyago || selectedAdminIds.includes(user.id);

                      return (
                        <div
                          key={user.id}
                          onClick={() => {
                            if (isThyago) return;
                            setSelectedAdminIds((prev) =>
                              prev.includes(user.id) ? prev.filter((id) => id !== user.id) : [...prev, user.id]
                            );
                          }}
                          className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 text-xs transition-all cursor-pointer select-none ${
                            isSelected
                              ? 'bg-red-950/40 border-red-800/80 text-white'
                              : 'bg-slate-950/60 hover:bg-slate-950 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={isThyago}
                              onChange={() => {}}
                              className="w-4 h-4 rounded text-red-600 bg-slate-900 border-slate-700 focus:ring-red-500 accent-red-600 cursor-pointer"
                            />
                            <img
                              src={user.avatar}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="w-7 h-7 rounded-full object-cover border border-slate-700 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="font-semibold text-white truncate flex items-center gap-1.5">
                                <span>{user.name}</span>
                                {isThyago && (
                                  <span className="text-[9px] bg-red-950 text-red-400 border border-red-800 px-1 rounded font-bold">
                                    ★ Admin Geral
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${
                              isSelected
                                ? 'bg-red-900/60 text-red-200 border-red-700'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {isSelected ? 'Admin Selecionado' : 'Piloto'}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Agendamento Padrão de Corridas (Dia da Semana & Calendário) */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-slate-900 to-red-950/30 border border-slate-700/80 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div>
                <label className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-red-400" />
                  <span>Programação Padrão do Calendário</span>
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Defina o dia padrão da semana para as corridas e a frequência. Todas as datas são geradas automaticamente, mas você ainda pode ajustá-las manualmente na lista abaixo.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleApplyRaceDayToStages(defaultRaceDay, stageRecurrence, firstStageDate)}
                className="px-3 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto shrink-0 shadow-sm"
                title="Reaplicar o dia da semana padrão e intervalo a todas as etapas"
              >
                <Sparkles className="w-3.5 h-3.5 text-red-400" />
                <span>Reaplicar Dia Padrão</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Dia da Semana Padrão */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Dia Padrão da Semana
                </label>
                <select
                  value={defaultRaceDay}
                  onChange={(e) => handleDefaultRaceDayChange(e.target.value as DayOfWeek)}
                  className="w-full bg-slate-950 border border-slate-700 hover:border-slate-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer font-medium"
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d} value={d}>
                      📅 {d}
                    </option>
                  ))}
                </select>

                {/* Quick weekday shortcut buttons */}
                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                  {DAYS_OF_WEEK.map((d) => {
                    const isSelected = defaultRaceDay === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleDefaultRaceDayChange(d)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-red-600 text-white shadow-sm ring-1 ring-red-400'
                            : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                        title={`Definir corridas às ${d}s`}
                      >
                        {DAY_OF_WEEK_SHORT[DAY_OF_WEEK_MAP[d]]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Data da 1ª Etapa */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Data de Início (1ª Etapa)
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={firstStageDate}
                    onChange={(e) => handleFirstStageDateChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 hover:border-slate-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer font-medium"
                  />
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">
                  Cai em: <strong className="text-red-400">{getDayOfWeekInfo(firstStageDate).fullName || defaultRaceDay}</strong>
                </span>
              </div>

              {/* Frequência das Corridas */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Frequência das Corridas
                </label>
                <select
                  value={stageRecurrence}
                  onChange={(e) => handleRecurrenceChange(e.target.value as StageRecurrence)}
                  className="w-full bg-slate-950 border border-slate-700 hover:border-slate-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer font-medium"
                >
                  <option value="Semanal">Semanal (Toda semana / 7 dias)</option>
                  <option value="Quinzenal">Quinzenal (A cada 14 dias)</option>
                  <option value="Mensal">Mensal (A cada 28 dias)</option>
                </select>
                <span className="text-[10px] text-slate-400 block mt-1">
                  Intervalo automático entre as rodadas
                </span>
              </div>
            </div>
          </div>

          {/* Stages List */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-red-400" />
                <span>Calendário de Corridas ({initialStages.length} Etapas)</span>
              </label>

              <button
                type="button"
                onClick={addStageRow}
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-medium cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Linha de Corrida</span>
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {initialStages.map((st, i) => (
                <div
                  key={i}
                  className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex flex-wrap items-center gap-2 text-xs"
                >
                  <span className="w-6 h-6 rounded bg-slate-950 text-red-400 font-bold flex items-center justify-center font-mono shrink-0">
                    {i + 1}
                  </span>

                  {/* Real visual flag */}
                  <CountryFlag flag={st.trackFlag} country={st.trackCountry} size="sm" />

                  {/* If F1 simulator: dropdown to easily switch to any official F1 track */}
                  {isF1Simulator ? (
                    <select
                      value={
                        OFFICIAL_F1_CIRCUITS.find(
                          (c) =>
                            st.trackName.includes(c.trackName) ||
                            st.trackName.includes(c.city)
                        )?.id || ''
                      }
                      onChange={(e) => {
                        const found = OFFICIAL_F1_CIRCUITS.find((c) => c.id === e.target.value);
                        if (found) {
                          const copy = [...initialStages];
                          copy[i].trackName = `${found.trackName} (${found.city})`;
                          copy[i].trackCountry = found.country;
                          copy[i].trackFlag = found.flag;
                          copy[i].circuitLength = found.length;
                          copy[i].format = found.defaultFormat;
                          setInitialStages(copy);
                        }
                      }}
                      className="flex-1 min-w-[200px] bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-white"
                    >
                      <option value="">{st.trackName}</option>
                      {OFFICIAL_F1_CIRCUITS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.flag} {c.gpName} - {c.trackName} ({c.length})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Nome do Circuito"
                      value={st.trackName}
                      onChange={(e) => {
                        const copy = [...initialStages];
                        copy[i].trackName = e.target.value;
                        setInitialStages(copy);
                      }}
                      className="flex-1 min-w-[160px] bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-white"
                    />
                  )}

                  {/* Date Input with Day of Week indicator */}
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex items-center">
                      <Calendar className="w-3 h-3 text-slate-500 absolute left-2 pointer-events-none" />
                      <input
                        type="date"
                        value={st.date}
                        onChange={(e) => {
                          const copy = [...initialStages];
                          copy[i].date = e.target.value;
                          setInitialStages(copy);
                        }}
                        className="bg-slate-950 border border-slate-700 hover:border-slate-600 rounded pl-7 pr-2 py-1 text-xs text-white w-36 focus:outline-none focus:border-red-500 cursor-pointer font-medium"
                        title="Selecione ou altere a data manualmente"
                      />
                    </div>

                    {/* Day of Week Badge */}
                    {(() => {
                      const dayInfo = getDayOfWeekInfo(st.date);
                      const isDefaultDay = dayInfo.fullName === defaultRaceDay;
                      return (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors shrink-0 ${
                            isDefaultDay
                              ? 'bg-red-950/70 text-red-300 border-red-800/80'
                              : 'bg-amber-950/70 text-amber-300 border-amber-800/80'
                          }`}
                          title={
                            isDefaultDay
                              ? `Dia padrão da liga: ${dayInfo.fullName}`
                              : `Data personalizada manualmente: ${dayInfo.fullName || 'Não definido'}`
                          }
                        >
                          {dayInfo.shortName || '—'}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Race Time Input */}
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Horário (ex: 21:00 BRT)"
                      value={st.time}
                      onChange={(e) => {
                        const copy = [...initialStages];
                        copy[i].time = e.target.value;
                        setInitialStages(copy);
                      }}
                      className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white w-24 font-mono-numbers"
                    />
                  </div>

                  {/* Sprint Race Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      const copy = [...initialStages];
                      copy[i].hasSprint = !copy[i].hasSprint;
                      if (copy[i].hasSprint && !copy[i].sprintFormat) {
                        copy[i].sprintFormat = 'Sprint Shootout + Corrida Sprint 100km';
                      }
                      setInitialStages(copy);
                    }}
                    className={`px-2 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                      st.hasSprint
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                    title={st.hasSprint ? 'Corrida Sprint Ativada para esta etapa' : 'Clique para ativar Corrida Sprint nesta etapa'}
                  >
                    <Zap className={`w-3 h-3 ${st.hasSprint ? 'text-amber-400' : 'text-slate-500'}`} />
                    <span>{st.hasSprint ? '⚡ Sprint' : '+ Sprint'}</span>
                  </button>

                  {initialStages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStageRow(i)}
                      className="p-1 text-slate-500 hover:text-red-400 transition-colors cursor-pointer ml-auto"
                      title="Remover etapa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
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
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-semibold shadow-md shadow-red-950 transition-all cursor-pointer"
            >
              Criar Campeonato
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
