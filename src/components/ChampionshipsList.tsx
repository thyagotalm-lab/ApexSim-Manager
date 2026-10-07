import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Calendar,
  Users,
  Shield,
  Plus,
  ChevronRight,
  Zap,
  Trash2,
  AlertTriangle,
  AlertCircle,
  X,
  Gamepad2,
  UserCheck,
  Lock,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  Car,
  Hash,
  MessageSquare,
  Send,
  Flag,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChampionships, MAX_CHAMPIONSHIPS_PER_PILOT } from '../context/ChampionshipContext';
import { Championship, Simulator } from '../types';
import { getTeamsBySimulator, getTeamCode } from '../data/f1Teams';

interface ChampionshipsListProps {
  onOpenCreateModal: () => void;
  onSelectChampionship: (id: string) => void;
}

export const ChampionshipsList: React.FC<ChampionshipsListProps> = ({
  onOpenCreateModal,
  onSelectChampionship,
}) => {
  const { currentUser, openAuthModal } = useAuth();
  const {
    championships,
    activeChampionship,
    isUserLeagueAdmin,
    deleteChampionship,
    getLeagueAdmins,
    registerPilotRequest,
    getUserChampionshipsCount,
  } = useChampionships();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSim, setSelectedSim] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'open' | 'pilot' | 'admin'>('all');
  const [champToDelete, setChampToDelete] = useState<Championship | null>(null);

  // Quick In-List Pilot Registration Modal state
  const [registeringChamp, setRegisteringChamp] = useState<Championship | null>(null);
  const [regTeamName, setRegTeamName] = useState<string>('');
  const [regCarNumber, setRegCarNumber] = useState<number>(currentUser?.racingNumber || 7);
  const [regDiscord, setRegDiscord] = useState<string>(currentUser?.discordTag || '');
  const [regError, setRegError] = useState<string>('');
  const [regSuccess, setRegSuccess] = useState<string>('');

  const myActiveChampsCount = useMemo(() => {
    return currentUser ? getUserChampionshipsCount(currentUser.id) : 0;
  }, [currentUser, championships, getUserChampionshipsCount]);

  const isLeagueAdminOfAny = currentUser ? (
    currentUser.role === 'admin' ||
    championships.some((c) => isUserLeagueAdmin(c.id, currentUser.id))
  ) : false;

  // Filtered championships
  const filtered = useMemo(() => {
    return championships.filter((c) => {
      // 1. Search term (name, simulator, category, admins)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const admins = getLeagueAdmins(c.id);
        const adminNames = admins.map((a) => (a.name || '').toLowerCase()).join(' ');
        const match =
          c.name.toLowerCase().includes(term) ||
          c.simulator.toLowerCase().includes(term) ||
          c.category.toLowerCase().includes(term) ||
          (c.description && c.description.toLowerCase().includes(term)) ||
          adminNames.includes(term);
        if (!match) return false;
      }

      // 2. Simulator filter
      if (selectedSim !== 'all' && c.simulator !== selectedSim) return false;

      // 3. Tab filter
      if (roleFilter === 'admin') {
        if (!isUserLeagueAdmin(c.id, currentUser?.id)) return false;
      } else if (roleFilter === 'pilot') {
        const isPilot = c.registrations.some(
          (r) =>
            r.userId === currentUser?.id ||
            (r.userEmail && (r.userEmail || '').toLowerCase().trim() === (currentUser?.email || '').toLowerCase().trim())
        );
        if (!isPilot) return false;
      } else if (roleFilter === 'open') {
        const approvedPilots = c.registrations.filter((r) => r.status === 'APROVADO');
        if (approvedPilots.length >= c.maxGrid || c.status === 'Finalizado') return false;
      }

      return true;
    });
  }, [championships, selectedSim, roleFilter, searchTerm, currentUser?.id, isUserLeagueAdmin, getLeagueAdmins]);

  const simulators: Simulator[] = [
    'F1 25',
    'F1 26',
    'Assetto Corsa Competizione',
    'iRacing',
    'Automobilista 2',
    'F1 24',
    'rFactor 2',
    'Le Mans Ultimate',
  ];

  const handleConfirmDelete = () => {
    if (champToDelete) {
      deleteChampionship(champToDelete.id);
      setChampToDelete(null);
    }
  };

  // Open Quick Registration Modal for a specific championship
  const handleOpenRegistrationModal = (champ: Championship) => {
    if (!currentUser) {
      openAuthModal();
      return;
    }
    setRegisteringChamp(champ);
    const teams = getTeamsBySimulator(champ.simulator);
    setRegTeamName(teams[0]?.name || '');
    setRegCarNumber(currentUser?.racingNumber || Math.floor(Math.random() * 98) + 1);
    setRegDiscord(currentUser?.discordTag || '');
    setRegError('');
    setRegSuccess('');
  };

  const handleSubmitRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registeringChamp) return;

    setRegError('');

    // Check maximum 5 championships limit
    if (myActiveChampsCount >= MAX_CHAMPIONSHIPS_PER_PILOT) {
      setRegError(`Você já participa de ${MAX_CHAMPIONSHIPS_PER_PILOT} campeonatos simultâneos (${MAX_CHAMPIONSHIPS_PER_PILOT}/${MAX_CHAMPIONSHIPS_PER_PILOT}), que é o limite máximo permitido na plataforma.`);
      return;
    }

    // Check taken numbers
    const isTaken = registeringChamp.registrations.some(
      (r) => Number(r.carNumber) === Number(regCarNumber) && r.status !== 'REJEITADO'
    );

    if (isTaken) {
      setRegError(`O número #${regCarNumber} já está ocupado por outro piloto neste grid. Escolha outro número.`);
      return;
    }

    if (!regTeamName) {
      setRegError('Selecione uma equipe/fabricante.');
      return;
    }

    registerPilotRequest(registeringChamp.id, {
      teamName: regTeamName,
      carModel: regTeamName,
      carNumber: Number(regCarNumber),
      discord: regDiscord.trim(),
    });

    setRegSuccess('Sua solicitação de inscrição foi enviada com sucesso! Aguarde a homologação dos administradores da liga.');
    setTimeout(() => {
      setRegisteringChamp(null);
      setRegSuccess('');
    }, 1800);
  };

  return (
    <div className="space-y-5">
      {/* Social Hub Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-950/50 via-slate-900 to-slate-900 border border-slate-800 p-5 sm:p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs text-red-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-red-400" />
              <span>Rede de Campeonatos & Ligas da Comunidade</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white font-display">
              Descubra e Participe de Campeonatos
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Explore todas as ligas criadas por outros administradores e pilotos. Localize o campeonato do seu simulador favorito, solicite sua vaga no grid e acompanhe as tabelas oficiais.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            <button
              onClick={() => {
                if (!currentUser) {
                  openAuthModal();
                } else {
                  onOpenCreateModal();
                }
              }}
              className="flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow-lg shadow-red-950 transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>+ Criar Novo Campeonato</span>
            </button>
          </div>
        </div>
      </div>

      {/* Visitor Banner if not logged in */}
      {!currentUser && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-red-950/80 border border-red-800 flex items-center justify-center text-red-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white">Catálogo Aberto de Campeonatos</div>
              <div className="text-slate-400">Faça login ou crie sua conta para se inscrever nos grids ou fundar sua própria liga.</div>
            </div>
          </div>
          <button
            onClick={openAuthModal}
            className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs whitespace-nowrap cursor-pointer transition-colors shadow-sm self-stretch sm:self-auto text-center"
          >
            Entrar ou Criar Conta
          </button>
        </div>
      )}

      {/* Search Bar & Quick Filters */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Pesquisar por nome do campeonato, simulador, organizador ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-red-500 rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Discovery Category Filters */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800/80 rounded-xl overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
              roleFilter === 'all'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Todos os Campeonatos ({championships.length})
          </button>

          <button
            type="button"
            onClick={() => setRoleFilter('open')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              roleFilter === 'open'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Com Vagas Abertas (
              {
                championships.filter((c) => {
                  const approved = c.registrations.filter((r) => r.status === 'APROVADO');
                  return approved.length < c.maxGrid && c.status !== 'Finalizado';
                }).length
              }
              )
            </span>
          </button>

          {currentUser && (
            <>
              <button
                type="button"
                onClick={() => setRoleFilter('pilot')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  roleFilter === 'pilot'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  Minhas Inscrições (
                  {
                    championships.filter((c) =>
                      c.registrations.some(
                        (r) =>
                          r.userId === currentUser.id ||
                          (r.userEmail && (r.userEmail || '').toLowerCase().trim() === (currentUser.email || '').toLowerCase().trim())
                      )
                    ).length
                  }
                  )
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRoleFilter('admin')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  roleFilter === 'admin'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-red-400" />
                <span>Ligas que Administro ({championships.filter((c) => isUserLeagueAdmin(c.id, currentUser.id)).length})</span>
              </button>
            </>
          )}
        </div>

        {/* Simulators Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedSim('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
              selectedSim === 'all'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800/80'
            }`}
          >
            Todos os Simuladores
          </button>
          {simulators.map((sim) => {
            const count = championships.filter((c) => c.simulator === sim).length;
            if (count === 0) return null;
            return (
              <button
                key={sim}
                onClick={() => setSelectedSim(sim)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  selectedSim === sim
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {sim} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Championships Grid */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
          <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">
            {championships.length === 0
              ? 'Nenhum campeonato cadastrado ainda'
              : 'Nenhum campeonato encontrado com estes filtros'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {championships.length === 0
              ? 'Seja o primeiro a inaugurar o hub criando um campeonato para a comunidade sim racer!'
              : 'Tente limpar a busca ou mudar o simulador para encontrar outras ligas ativas.'}
          </p>

          <div className="pt-3">
            <button
              onClick={onOpenCreateModal}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-red-950 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Novo Campeonato</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((champ) => {
            const isActive = activeChampionship?.id === champ.id;
            const isAdminOfThis = isUserLeagueAdmin(champ.id, currentUser?.id);
            const admins = getLeagueAdmins(champ.id);
            const organizerName = admins[0]?.name || 'Organização Oficial';

            const myReg = champ.registrations.find(
              (r) =>
                r.userId === currentUser?.id ||
                (r.userEmail && (r.userEmail || '').toLowerCase().trim() === (currentUser?.email || '').toLowerCase().trim())
            );

            const approvedPilots = champ.registrations.filter((r) => r.status === 'APROVADO');
            const openSlots = Math.max(0, champ.maxGrid - approvedPilots.length);
            const isFull = openSlots === 0;
            const completedStages = champ.stages.filter((s) => s.status === 'Concluída');

            return (
              <div
                key={champ.id}
                className={`rounded-2xl border transition-all flex flex-col justify-between overflow-hidden relative group ${
                  isActive
                    ? 'bg-gradient-to-b from-red-950/30 via-slate-900 to-slate-950 border-red-600/70 shadow-xl shadow-red-950/20'
                    : 'bg-slate-900/60 hover:bg-slate-900/90 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Active Top Highlight Stripe */}
                {isActive && (
                  <div className="h-1 w-full bg-gradient-to-r from-red-600 via-red-500 to-amber-500" />
                )}

                {/* Card Header */}
                <div className="p-5 pb-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="font-bold text-red-400 uppercase tracking-wide text-[11px]">
                      {champ.category}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                        champ.status === 'Inscrições Abertas'
                          ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80'
                          : champ.status === 'Em Andamento'
                          ? 'bg-amber-950/80 text-amber-400 border-amber-800/80'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {champ.status}
                    </span>
                  </div>

                  <h3
                    onClick={() => onSelectChampionship(champ.id)}
                    className="text-lg font-bold text-white tracking-tight line-clamp-1 hover:text-red-400 cursor-pointer transition-colors"
                  >
                    {champ.name}
                  </h3>

                  {/* Simulator & Host Pill */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-xs">
                      <Gamepad2 className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-slate-400 text-[11px]">Sim:</span>
                      <strong className="text-white font-semibold text-xs">{champ.simulator}</strong>
                    </div>

                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-400" title={`Organizado por ${admins.map(a => a.name).join(', ')}`}>
                      <span className="text-[11px]">Org:</span>
                      <strong className="text-slate-200 text-xs truncate max-w-[120px]">{organizerName}</strong>
                    </div>

                    {isAdminOfThis && (
                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-950/90 text-red-400 border border-red-800/80 text-[11px] font-bold">
                        <Shield className="w-3 h-3 text-red-400" />
                        <span>Você é Admin</span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 mt-2.5 line-clamp-2 leading-relaxed">
                    {champ.description || 'Campeonato oficial organizado na plataforma ApexSim.'}
                  </p>
                </div>

                {/* Card Meta Stats Grid */}
                <div className="px-5 py-3 border-y border-slate-800/60 bg-slate-950/40 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Etapas</span>
                    <span className="font-bold text-white font-mono-numbers">
                      {completedStages.length}/{champ.stages.length}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Grid Ocupado</span>
                    <span className="font-bold text-white font-mono-numbers">
                      {approvedPilots.length}/{champ.maxGrid}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Vagas</span>
                    <span
                      className={`font-bold font-mono-numbers ${
                        isFull ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {isFull ? 'Lotado' : `${openSlots} livres`}
                    </span>
                  </div>
                </div>

                {/* User Inscription Status Banner (if registered) */}
                {myReg && (
                  <div className="px-5 py-2 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">Sua Inscrição:</span>
                    {myReg.status === 'APROVADO' ? (
                      <span className="font-semibold text-emerald-400 flex items-center gap-1 text-[11px]">
                        <CheckCircle2 className="w-3 h-3" /> #{myReg.carNumber} · {myReg.teamName} (Homologado)
                      </span>
                    ) : myReg.status === 'PENDENTE' ? (
                      <span className="font-semibold text-amber-400 flex items-center gap-1 text-[11px]">
                        <Clock className="w-3 h-3" /> Aguardando Homologação
                      </span>
                    ) : (
                      <span className="font-semibold text-red-400 text-[11px]">
                        Inscrição Recusada
                      </span>
                    )}
                  </div>
                )}

                {/* Card Footer Actions */}
                <div className="p-4 flex flex-col gap-2 bg-slate-900/50">
                  <div className="flex items-center justify-between gap-2">
                    {/* Primary Registration or Status Action */}
                    {!myReg ? (
                      <button
                        type="button"
                        onClick={() => handleOpenRegistrationModal(champ)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold text-xs shadow-md shadow-red-950 transition-all cursor-pointer"
                      >
                        <Car className="w-3.5 h-3.5" />
                        <span>Pedir Inscrição no Grid</span>
                      </button>
                    ) : (
                      <div className="flex-1 text-xs text-slate-400 flex items-center gap-1 py-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-medium text-slate-300">Piloto Inscrito</span>
                      </div>
                    )}

                    {/* Select / View Button */}
                    <button
                      onClick={() => onSelectChampionship(champ.id)}
                      className={`flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-slate-800 text-white border border-slate-700'
                          : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                      title="Selecionar e visualizar detalhes desta liga"
                    >
                      <span>{isActive ? 'Ativo' : 'Acessar'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete button (if user is admin of this specific league) */}
                    {isAdminOfThis && (
                      <button
                        onClick={() => setChampToDelete(champ)}
                        className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-950/40 border border-transparent hover:border-red-900/60 transition-colors cursor-pointer"
                        title="Excluir campeonato"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Inscription Request Modal */}
      {registeringChamp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#0c121e] border border-red-900/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
              <div>
                <div className="text-xs text-red-400 uppercase font-semibold flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-red-400" />
                  <span>Solicitação de Inscrição Oficial</span>
                </div>
                <h3 className="text-lg font-bold text-white font-display">
                  {registeringChamp.name}
                </h3>
                <div className="text-xs text-slate-400 mt-0.5">
                  Simulador: <strong className="text-white">{registeringChamp.simulator}</strong> · Categoria: {registeringChamp.category}
                </div>
              </div>

              <button
                onClick={() => setRegisteringChamp(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitRegistration} className="p-5 space-y-4 overflow-y-auto">
              {regSuccess && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-200 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{regSuccess}</span>
                </div>
              )}

              {regError && (
                <div className="p-3 bg-red-950/80 border border-red-800 text-red-200 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{regError}</span>
                </div>
              )}

              {/* Pilot Info Box */}
              {currentUser && (
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-3">
                  <img
                    src={currentUser.avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250`}
                    alt={currentUser.name}
                    className="w-10 h-10 rounded-full object-cover border border-red-500/60"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{currentUser.name}</div>
                    <div className="text-[11px] text-slate-400 truncate">{currentUser.email}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Platform ID / Steam: {currentUser.gamingId || currentUser.steamId || 'Não configurado'}
                    </div>
                  </div>
                </div>
              )}

              {/* Multi-League Participation Status */}
              {currentUser && (
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Seus Campeonatos na ApexSim:</span>
                  </div>
                  <span className={`font-bold px-2 py-0.5 rounded text-[11px] border ${
                    myActiveChampsCount >= MAX_CHAMPIONSHIPS_PER_PILOT
                      ? 'bg-red-950/80 text-red-300 border-red-800'
                      : 'bg-amber-950/80 text-amber-300 border-amber-800/80'
                  }`}>
                    {myActiveChampsCount} / {MAX_CHAMPIONSHIPS_PER_PILOT} Ligas Permitidas
                  </span>
                </div>
              )}

              {myActiveChampsCount >= MAX_CHAMPIONSHIPS_PER_PILOT && (
                <div className="p-3 bg-red-950/80 border border-red-800 text-red-200 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>
                    Você atingiu o limite de <strong>{MAX_CHAMPIONSHIPS_PER_PILOT} campeonatos simultâneos ({MAX_CHAMPIONSHIPS_PER_PILOT}/{MAX_CHAMPIONSHIPS_PER_PILOT})</strong>.
                  </span>
                </div>
              )}

              {/* Select Team / Manufacturer */}
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-red-400" />
                  <span>Equipe / Fabricante Desejado:</span>
                </label>
                <select
                  value={regTeamName}
                  onChange={(e) => setRegTeamName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                >
                  {getTeamsBySimulator(registeringChamp.simulator).map((team) => (
                    <option key={team.name} value={team.name}>
                      {team.name} ({team.shortName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Car Number Input */}
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-red-400" />
                  <span>Número de Corrida (1 a 99):</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={regCarNumber}
                  onChange={(e) => setRegCarNumber(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  O número deve ser único no grid deste campeonato.
                </p>
              </div>

              {/* Discord Tag */}
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-red-400" />
                  <span>Discord Tag (para contato dos comissários):</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: piloto#1234 ou seu_usuario"
                  value={regDiscord}
                  onChange={(e) => setRegDiscord(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRegisteringChamp(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={myActiveChampsCount >= MAX_CHAMPIONSHIPS_PER_PILOT}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:opacity-40 text-white font-semibold text-xs shadow-md shadow-red-950 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {myActiveChampsCount >= MAX_CHAMPIONSHIPS_PER_PILOT
                      ? 'Limite (5/5) Atingido'
                      : 'Enviar Solicitação de Inscrição'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Championship Confirmation Modal */}
      {champToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#0c121e] border border-red-900/80 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-white text-base">Excluir Campeonato</h3>
              </div>
              <button
                onClick={() => setChampToDelete(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Você tem certeza de que deseja excluir permanentemente o campeonato{' '}
              <strong className="text-white">"{champToDelete.name}"</strong>?
            </p>
            <p className="text-xs text-red-400/90">
              Esta ação apagará todas as etapas, resultados e inscrições associadas a ele.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setChampToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md shadow-red-950 cursor-pointer"
              >
                Sim, Excluir Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
