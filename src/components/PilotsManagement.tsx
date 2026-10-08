import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  CheckCircle,
  Clock,
  XCircle,
  Shield,
  AlertCircle,
  Car,
  Hash,
  MessageSquare,
  Check,
  AlertTriangle,
  Edit2,
  Swords,
  Sparkles,
  FileText,
  Search,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChampionships, MAX_CHAMPIONSHIPS_PER_PILOT } from '../context/ChampionshipContext';
import { CountryFlag } from './CountryFlag';
import { RegistrationPilot, User } from '../types';
import { getTeamsBySimulator, getTeamCode, OfficialTeam } from '../data/f1Teams';
import { getSimRatingTier } from '../utils/simRating';
import { downloadPdf } from '../utils/pdfHelper';
import { isFakeMockUser } from '../services/userService';

interface PilotsManagementProps {
  onOpenCardModal?: (driver?: User) => void;
  onOpenH2HModal?: (driverA?: User, driverB?: User) => void;
}

export const PilotsManagement: React.FC<PilotsManagementProps> = ({
  onOpenCardModal,
  onOpenH2HModal,
}) => {
  const { currentUser, users } = useAuth();
  const {
    activeChampionship,
    championships,
    isUserLeagueAdmin,
    registerPilotRequest,
    adminAddPilot,
    updateRegistrationStatus,
    updatePilotTeam,
    getUserChampionships,
    getUserChampionshipsCount,
    canUserJoinChampionship,
  } = useChampionships();

  if (!activeChampionship) {
    return (
      <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
        <Users className="w-12 h-12 text-slate-600 mx-auto" />
        <h3 className="text-base font-bold text-white">Nenhum campeonato ativo no momento</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Crie seu próprio campeonato manualmente para gerenciar as inscrições, homologações e o grid de pilotos.
        </p>
      </div>
    );
  }

  // Simulator Official Teams (F1 24, F1 25, F1 26, etc.)
  const officialTeams = useMemo(() => {
    return getTeamsBySimulator(activeChampionship.simulator);
  }, [activeChampionship.simulator]);

  // Map of taken car numbers -> pilot name
  const takenCarNumbersMap = useMemo(() => {
    const map = new Map<number, string>();
    activeChampionship.registrations.forEach((r) => {
      if (r.status !== 'REJEITADO') {
        map.set(Number(r.carNumber), r.userName);
      }
    });
    return map;
  }, [activeChampionship.registrations]);

  const getFirstAvailableNumber = () => {
    for (let i = 1; i <= 99; i++) {
      if (!takenCarNumbersMap.has(i)) return i;
    }
    return 1;
  };

  const getTeamColor = (teamName: string): string => {
    const found = officialTeams.find((t) => t.name === teamName || t.shortName === teamName);
    return found ? found.color : '#e10600';
  };

  // Admin add pilot modal state
  const [isAddPilotModalOpen, setIsAddPilotModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedTeamName, setSelectedTeamName] = useState(officialTeams[0]?.name || '');
  const [carNumberInput, setCarNumberInput] = useState<number>(1);
  const [adminNumberError, setAdminNumberError] = useState('');

  // Pilot self-registration form state
  const [isSelfRegisterModalOpen, setIsSelfRegisterModalOpen] = useState(false);
  const [pilotSelectedTeamName, setPilotSelectedTeamName] = useState(officialTeams[0]?.name || '');
  const [pilotNumber, setPilotNumber] = useState<number>(currentUser?.racingNumber || 7);
  const [pilotDiscord, setPilotDiscord] = useState(currentUser?.discordTag || '');
  const [pilotNumberError, setPilotNumberError] = useState('');

  // Pilot removal confirmation state
  const [pilotToRemove, setPilotToRemove] = useState<RegistrationPilot | null>(null);

  // Edit pilot team modal state
  const [editingPilot, setEditingPilot] = useState<RegistrationPilot | null>(null);
  const [editSelectedTeamName, setEditSelectedTeamName] = useState<string>('');
  const [editCarNumber, setEditCarNumber] = useState<number>(1);
  const [editNumberError, setEditNumberError] = useState<string>('');
  const [editIsReserve, setEditIsReserve] = useState<boolean>(false);

  // Admin add pilot modal state
  const [isReservePilot, setIsReservePilot] = useState<boolean>(false);
  const [gridFilter, setGridFilter] = useState<'ALL' | 'TITULAR' | 'RESERVA'>('ALL');

  const handleOpenEditPilotTeamModal = (pilot: RegistrationPilot) => {
    setEditingPilot(pilot);
    setEditSelectedTeamName(pilot.teamName);
    setEditCarNumber(pilot.carNumber);
    setEditIsReserve(Boolean(pilot.isReserve || pilot.status === 'RESERVA'));
    setEditNumberError('');
  };

  const handleSavePilotTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPilot || !activeChampionship) return;

    if (editCarNumber !== editingPilot.carNumber && takenCarNumbersMap.has(editCarNumber)) {
      setEditNumberError(`O número #${editCarNumber} já está em uso por ${takenCarNumbersMap.get(editCarNumber)}.`);
      return;
    }

    const selectedTeamObj = officialTeams.find((t) => t.name === editSelectedTeamName);
    const newCarModel = selectedTeamObj ? selectedTeamObj.carModel : editingPilot.carModel;

    updatePilotTeam(activeChampionship.id, editingPilot.id, {
      teamName: editIsReserve ? 'Reserva' : editSelectedTeamName,
      carModel: newCarModel,
      carNumber: editCarNumber,
      isReserve: editIsReserve,
      status: editIsReserve ? 'RESERVA' : 'APROVADO',
    });

    setEditingPilot(null);
  };

  const isAdmin = isUserLeagueAdmin(activeChampionship.id, currentUser?.id);
  const userRegistration = activeChampionship.registrations.find((r) => r.userId === currentUser?.id);
  const approvedPilots = activeChampionship.registrations.filter((r) => r.status === 'APROVADO' && !r.isReserve);
  const pendingPilots = activeChampionship.registrations.filter((r) => r.status === 'PENDENTE');
  const reservePilots = activeChampionship.registrations.filter((r) => r.status === 'RESERVA' || r.isReserve);
  const allGridPilots = activeChampionship.registrations.filter((r) => r.status === 'APROVADO' || r.status === 'RESERVA');

  const displayedGridPilots = activeChampionship.registrations.filter((r) => {
    if (r.status === 'PENDENTE' || r.status === 'REJEITADO') return false;
    if (gridFilter === 'TITULAR') return r.status === 'APROVADO' && !r.isReserve;
    if (gridFilter === 'RESERVA') return r.status === 'RESERVA' || r.isReserve;
    return r.status === 'APROVADO' || r.status === 'RESERVA';
  });

  // Search query for pilot in admin add modal
  const [pilotSearchQuery, setPilotSearchQuery] = useState('');

  // Consolidate all users: AuthContext users + any pilot who has registered in any championship
  const allKnownUsers = useMemo(() => {
    const map = new Map<string, User>();
    users.forEach((u) => {
      if (!isFakeMockUser(u)) {
        map.set(u.id, u);
        if (u.email) map.set(u.email.toLowerCase().trim(), u);
      }
    });

    championships.forEach((c) => {
      c.registrations.forEach((reg) => {
        const emailKey = (reg.userEmail || '').toLowerCase().trim();
        const existing = (reg.userId && map.get(reg.userId)) || (emailKey && map.get(emailKey));
        if (!existing) {
          const syntheticUser: User = {
            id: reg.userId || `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: reg.userName,
            email: reg.userEmail || `${reg.userName.toLowerCase().replace(/\s+/g, '')}@piloto.apex`,
            avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250`,
            role: 'pilot',
            country: 'Brasil 🇧🇷',
            racingNumber: reg.carNumber,
            discordTag: reg.discord,
            steamId: reg.steamGuid,
            gamingId: reg.steamGuid,
            administeredLeagueIds: [],
            stats: {
              races: 0,
              wins: 0,
              podiums: 0,
              poles: 0,
              fastestLaps: 0,
              points: 0,
              dnfs: 0,
              safetyRating: 'B 3.50',
              simRating: 3000,
            },
          };
          map.set(syntheticUser.id, syntheticUser);
          if (syntheticUser.email) map.set(syntheticUser.email.toLowerCase().trim(), syntheticUser);
        }
      });
    });

    const uniqueMap = new Map<string, User>();
    map.forEach((u) => {
      uniqueMap.set(u.id, u);
    });
    return Array.from(uniqueMap.values());
  }, [users, championships]);

  // Catalog with full 5-championship tracking for each pilot
  const pilotCatalog = useMemo(() => {
    return allKnownUsers.map((u) => {
      const cleanEmail = (u.email || '').toLowerCase().trim();
      const cleanId = (u.id || '').toLowerCase().trim();

      // Find all championships this pilot is registered in
      const enrolledChamps = championships.filter((c) =>
        c.registrations.some(
          (r) =>
            (r.userId && r.userId.toLowerCase().trim() === cleanId) ||
            (r.userEmail && r.userEmail.toLowerCase().trim() === cleanEmail)
        )
      );

      // Check if they are already in the active championship
      const isInActiveChamp = activeChampionship.registrations.some(
        (r) =>
          (r.userId && r.userId.toLowerCase().trim() === cleanId) ||
          (r.userEmail && r.userEmail.toLowerCase().trim() === cleanEmail)
      );

      const otherChamps = enrolledChamps.filter((c) => c.id !== activeChampionship.id);
      const isLimitReached = !isInActiveChamp && otherChamps.length >= MAX_CHAMPIONSHIPS_PER_PILOT;
      const canEnroll = !isInActiveChamp && !isLimitReached;

      return {
        user: u,
        enrolledChamps,
        otherChamps,
        isInActiveChamp,
        isLimitReached,
        canEnroll,
      };
    });
  }, [allKnownUsers, championships, activeChampionship]);

  // Pilots available to be enrolled into THIS active championship (not yet enrolled & under 5 limit)
  const availableUsersToEnroll = useMemo(() => {
    return pilotCatalog.filter((item) => item.canEnroll).map((item) => item.user);
  }, [pilotCatalog]);

  const filteredPilotCatalog = useMemo(() => {
    if (!pilotSearchQuery.trim()) return pilotCatalog;
    const q = pilotSearchQuery.toLowerCase().trim();
    return pilotCatalog.filter((item) => {
      const name = item.user.name.toLowerCase();
      const email = item.user.email.toLowerCase();
      const gamingId = (item.user.gamingId || '').toLowerCase();
      const otherNames = item.otherChamps.map((c) => c.name.toLowerCase()).join(' ');
      return name.includes(q) || email.includes(q) || gamingId.includes(q) || otherNames.includes(q);
    });
  }, [pilotCatalog, pilotSearchQuery]);

  const filteredAvailablePilots = useMemo(
    () => filteredPilotCatalog.filter((item) => item.canEnroll),
    [filteredPilotCatalog]
  );
  const alreadyInThisChampPilots = useMemo(
    () => filteredPilotCatalog.filter((item) => item.isInActiveChamp),
    [filteredPilotCatalog]
  );
  const limitReachedPilots = useMemo(
    () => filteredPilotCatalog.filter((item) => item.isLimitReached),
    [filteredPilotCatalog]
  );
  const selectedPilotItem = useMemo(
    () => pilotCatalog.find((item) => item.user.id === selectedUserId),
    [pilotCatalog, selectedUserId]
  );

  // Current logged in user enrolled championships count for self-registration limit check
  const myEnrolledChampsCount = useMemo(() => {
    if (!currentUser) return 0;
    const cleanId = (currentUser.id || '').toLowerCase().trim();
    const cleanEmail = (currentUser.email || '').toLowerCase().trim();
    return championships.filter((c) =>
      c.registrations.some(
        (r) =>
          (r.userId && r.userId.toLowerCase().trim() === cleanId) ||
          (r.userEmail && r.userEmail.toLowerCase().trim() === cleanEmail)
      )
    ).length;
  }, [championships, currentUser]);

  const openAdminAddModal = () => {
    const defaultTeam = officialTeams[0]?.name || '';
    setSelectedTeamName(defaultTeam);
    const freeNum = getFirstAvailableNumber();
    setCarNumberInput(freeNum);
    setAdminNumberError('');
    setIsReservePilot(false);
    setPilotSearchQuery('');
    if (availableUsersToEnroll.length > 0) {
      setSelectedUserId(availableUsersToEnroll[0].id);
    } else {
      setSelectedUserId('');
    }
    setIsAddPilotModalOpen(true);
  };

  const openSelfRegisterModal = () => {
    const defaultTeam = officialTeams[0]?.name || '';
    setPilotSelectedTeamName(defaultTeam);
    const userPreferred = currentUser?.racingNumber;
    if (userPreferred && userPreferred >= 1 && userPreferred <= 99 && !takenCarNumbersMap.has(userPreferred)) {
      setPilotNumber(userPreferred);
    } else {
      setPilotNumber(getFirstAvailableNumber());
    }
    setPilotNumberError('');
    setIsSelfRegisterModalOpen(true);
  };

  const handleAdminEnroll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !selectedTeamName) return;

    if (carNumberInput < 1 || carNumberInput > 99) {
      setAdminNumberError('O número deve ser estritamente de 1 a 99.');
      return;
    }

    if (takenCarNumbersMap.has(carNumberInput)) {
      setAdminNumberError(`O número #${carNumberInput} já está em uso por ${takenCarNumbersMap.get(carNumberInput)}.`);
      return;
    }

    const teamObj = officialTeams.find((t) => t.name === selectedTeamName) || officialTeams[0];

    adminAddPilot(activeChampionship.id, {
      userId: selectedUserId,
      teamName: isReservePilot ? 'Reserva' : teamObj.name,
      carModel: teamObj.carModel,
      carNumber: carNumberInput,
      isReserve: isReservePilot,
      status: isReservePilot ? 'RESERVA' : 'APROVADO',
    });

    setIsAddPilotModalOpen(false);
    setSelectedUserId('');
    setIsReservePilot(false);
  };

  const handleSelfRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (pilotNumber < 1 || pilotNumber > 99) {
      setPilotNumberError('O número deve ser estritamente de 1 a 99.');
      return;
    }

    if (takenCarNumbersMap.has(pilotNumber)) {
      setPilotNumberError(`O número #${pilotNumber} já está em uso por ${takenCarNumbersMap.get(pilotNumber)}.`);
      return;
    }

    const teamObj = officialTeams.find((t) => t.name === pilotSelectedTeamName) || officialTeams[0];

    registerPilotRequest(activeChampionship.id, {
      teamName: teamObj.name,
      carModel: teamObj.carModel,
      carNumber: pilotNumber,
      discord: pilotDiscord,
    });

    setIsSelfRegisterModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <div className="text-xs text-red-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-red-400" />
            Grid Oficial & Inscrições de Pilotos
          </div>
          <h2 className="text-xl font-bold text-white font-display mt-0.5">
            {activeChampionship.name}
          </h2>
          <div className="text-xs text-slate-400 flex items-center gap-2 mt-1">
            <span>{approvedPilots.length} Pilotos Homologados</span>
            <span>·</span>
            <span>Grid Máximo: {activeChampionship.maxGrid} Vagas</span>
            {pendingPilots.length > 0 && (
              <>
                <span>·</span>
                <span className="text-amber-400 font-semibold">{pendingPilots.length} Inscrições Pendentes</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Download Rules PDF Button if available */}
          {activeChampionship.rulesPdfUrl && (
            <button
              type="button"
              onClick={() =>
                downloadPdf(
                  activeChampionship.rulesPdfUrl!,
                  activeChampionship.rulesPdfName || `Regulamento_${activeChampionship.name}.pdf`
                )
              }
              className="bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 font-medium px-3 py-2 rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-sm hover:border-red-500/50"
              title={`Baixar ${activeChampionship.rulesPdfName || 'Regulamento Oficial da Liga'}`}
            >
              <FileText className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">Baixar Regulamento (PDF)</span>
              <span className="sm:hidden">Regulamento</span>
            </button>
          )}

          {/* Pilot self registration button */}
          {!isAdmin && currentUser && (
            <div>
              {userRegistration ? (
                <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2">
                  <span className="text-slate-400">Sua Inscrição:</span>
                  <span
                    className={`font-semibold ${
                      userRegistration.status === 'APROVADO'
                        ? 'text-emerald-400'
                        : userRegistration.status === 'PENDENTE'
                        ? 'text-amber-400'
                        : 'text-red-400'
                    }`}
                  >
                    {userRegistration.status}
                  </span>
                </div>
              ) : (
                <button
                  onClick={openSelfRegisterModal}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold px-4 py-2 rounded-lg text-xs shadow-md shadow-red-950 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>Inscrever-se neste Campeonato</span>
                </button>
              )}
            </div>
          )}

          {/* Admin add pilot directly button */}
          {isAdmin && (
            <button
              onClick={openAdminAddModal}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-medium px-4 py-2 rounded-lg text-xs shadow-md shadow-red-950 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Adicionar Piloto do Banco de Dados</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid Capacity Bar */}
      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
          <span>Ocupação do Grid de Largada</span>
          <span className="font-mono-numbers font-semibold text-white">
            {approvedPilots.length} / {activeChampionship.maxGrid} ({Math.round((approvedPilots.length / activeChampionship.maxGrid) * 100)}%)
          </span>
        </div>
        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              approvedPilots.length >= activeChampionship.maxGrid
                ? 'bg-red-500'
                : approvedPilots.length >= activeChampionship.maxGrid * 0.8
                ? 'bg-amber-500'
                : 'bg-gradient-to-r from-red-600 to-emerald-500'
            }`}
            style={{ width: `${Math.min(100, (approvedPilots.length / activeChampionship.maxGrid) * 100)}%` }}
          />
        </div>
      </div>

      {/* Pending Applications Section (Admins Only) */}
      {isAdmin && pendingPilots.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/60 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Inscrições Aguardando Homologação ({pendingPilots.length})
            </h3>
            <span className="text-[11px] text-amber-300/70">Aprovação requer direitos de administrador</span>
          </div>

          <div className="space-y-2">
            {pendingPilots.map((pilot) => (
              <div
                key={pilot.id}
                className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono-numbers font-bold text-red-400 bg-slate-950 border border-slate-800 px-2 py-1 rounded text-xs">
                    #{pilot.carNumber}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>{users.find((u) => u.id === pilot.userId || (pilot.userEmail && u.email?.toLowerCase().trim() === pilot.userEmail.toLowerCase().trim()))?.name || pilot.userName}</span>
                      {pilot.discord && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                          <MessageSquare className="w-3 h-3 text-indigo-400" />
                          {pilot.discord}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                      <span
                        className="w-1.5 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: getTeamColor(pilot.teamName) }}
                      />
                      <span>Equipe: <strong className="text-slate-300">{pilot.teamName}</strong></span>
                      <span>·</span>
                      <span>Carro: <strong className="text-slate-300">{pilot.carModel}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => updateRegistrationStatus(activeChampionship.id, pilot.id, 'APROVADO')}
                    className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Aprovar Piloto</span>
                  </button>
                  <button
                    onClick={() => updateRegistrationStatus(activeChampionship.id, pilot.id, 'RESERVA')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Reserva
                  </button>
                  <button
                    onClick={() => updateRegistrationStatus(activeChampionship.id, pilot.id, 'REJEITADO')}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Recusar Inscrição"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid Filter Bar: Todos / Titulares / Reservas */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setGridFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              gridFilter === 'ALL'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Grid Total ({allGridPilots.length})
          </button>
          <button
            type="button"
            onClick={() => setGridFilter('TITULAR')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              gridFilter === 'TITULAR'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Titulares ({approvedPilots.length})
          </button>
          <button
            type="button"
            onClick={() => setGridFilter('RESERVA')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              gridFilter === 'RESERVA'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Reservas ({reservePilots.length})
          </button>
        </div>

        <div className="text-[11px] text-slate-400 pr-2">
          {gridFilter === 'RESERVA'
            ? 'Exibindo pilotos reservas que pontuam apenas individualmente'
            : `${displayedGridPilots.length} piloto(s) no grid`}
        </div>
      </div>

      {/* Mobile Approved Grid View - 100% width, Zero Horizontal Scroll */}
      <div className="block md:hidden space-y-2.5">
        {displayedGridPilots.length === 0 ? (
          <div className="py-8 text-center text-slate-500 font-sans text-xs bg-slate-900/40 rounded-xl border border-slate-800">
            Nenhum piloto encontrado para o filtro selecionado.
          </div>
        ) : (
          displayedGridPilots.map((pilot) => {
            const pilotUser = users.find((u) => u.id === pilot.userId);
            const teamColor = getTeamColor(pilot.teamName);
            const isReserve = pilot.status === 'RESERVA' || pilot.isReserve;

            return (
              <div
                key={pilot.id}
                className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/80 space-y-2.5 relative overflow-hidden transition-all hover:border-slate-700 shadow-md group"
                style={{ borderLeftWidth: '4px', borderLeftColor: isReserve ? '#f59e0b' : teamColor }}
              >
                {/* Big Stylized Motorsport Car Number Watermark */}
                <div className="absolute top-1.5 right-3 pointer-events-none select-none opacity-40 group-hover:opacity-70 transition-opacity">
                  <span className="font-display font-black text-3xl tracking-tighter text-slate-700">
                    #{pilot.carNumber}
                  </span>
                </div>

                {/* Top Row: Car #, Driver, Flag, Category, Status & Admin Action */}
                <div className="flex items-center justify-between gap-2 relative z-10">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {/* Car Number Badge */}
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-red-400 font-bold text-xs shrink-0">
                      #{pilot.carNumber}
                    </span>

                    {/* Avatar & Flag */}
                    <div className="relative shrink-0">
                      {pilotUser?.avatar ? (
                        <img
                          src={pilotUser.avatar}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full object-cover border-2 shadow-sm"
                          style={{ borderColor: isReserve ? '#f59e0b' : teamColor }}
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full bg-slate-800 border-2 flex items-center justify-center text-xs font-bold text-slate-300"
                          style={{ borderColor: isReserve ? '#f59e0b' : teamColor }}
                        >
                          {(pilotUser?.name || pilot.userName).charAt(0)}
                        </div>
                      )}
                      {pilotUser?.country && (
                        <div className="absolute -bottom-1 -right-1">
                          <CountryFlag country={pilotUser.country} size="xs" />
                        </div>
                      )}
                    </div>

                    {/* Pilot Name & Category */}
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-white text-xs truncate">
                        {pilotUser?.name || pilot.userName}
                      </div>
                      {(() => {
                        const tier = getSimRatingTier(pilotUser?.stats?.simRating);
                        return (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold inline-flex items-center gap-1 border ${tier.badgeBg} ${tier.badgeBorder} ${tier.textColor}`}>
                              <span>{tier.badgeIcon}</span>
                              <span>{tier.name}</span>
                            </span>
                            {pilotUser?.stats?.simRating ? (
                              <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                                {pilotUser.stats.simRating} ELO
                              </span>
                            ) : null}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isReserve ? (
                      <span className="text-[10px] font-semibold text-amber-400 flex items-center gap-1 bg-amber-950/40 border border-amber-800/60 px-1.5 py-0.5 rounded">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Reserva
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1 bg-emerald-950/40 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                        <CheckCircle className="w-3 h-3" /> Aprovado
                      </span>
                    )}

                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditPilotTeamModal(pilot)}
                          className="p-1 text-slate-400 hover:text-amber-400 hover:bg-amber-950/40 rounded transition-colors cursor-pointer"
                          title="Alterar Equipe do Piloto"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setPilotToRemove(pilot)}
                          className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-950/40 rounded transition-colors cursor-pointer"
                          title="Remover piloto do grid"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Middle Row: Official Team with Color Bar & Car Model */}
                <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs">
                  {isReserve ? (
                    <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                      <span className="w-1.5 h-6 rounded-full shrink-0 shadow-sm bg-amber-500" />
                      <div className="min-w-0 flex-1 truncate">
                        <div className="font-semibold text-amber-300 truncate text-xs flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold text-[10px]">
                            Reserva
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {pilot.carModel}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                      <span
                        className="w-1.5 h-6 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: teamColor }}
                      />
                      <div className="min-w-0 flex-1 truncate">
                        <div className="font-semibold text-white truncate text-xs flex items-center gap-1.5">
                          <span className="truncate">{pilot.teamName}</span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 font-mono text-[9px] font-bold text-amber-400 border border-slate-700 shrink-0">
                            {getTeamCode(pilot.teamName, activeChampionship.simulator)}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {pilot.carModel}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Row: Gaming ID / Discord */}
                {(pilotUser?.gamingId || pilot.discord || pilotUser?.discordTag) && (
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800/50">
                    {pilotUser?.gamingId ? (
                      <div className="flex items-center gap-1 truncate mr-2">
                        <span className="text-red-400 font-semibold">{pilotUser.gamingPlatform || 'ID'}:</span>
                        <span className="text-slate-300 truncate">{pilotUser.gamingId}</span>
                      </div>
                    ) : <div />}

                    {(pilot.discord || pilotUser?.discordTag) && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 shrink-0">
                        <MessageSquare className="w-3 h-3 text-indigo-400" />
                        <span>{pilot.discord || pilotUser?.discordTag}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Official Approved Grid Table - Hidden on mobile, shown on md+ screens */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-800 bg-[#0c121e]">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/90 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th className="py-3 px-3 text-center w-14">Carro #</th>
              <th className="py-3 px-3">Piloto</th>
              <th className="py-3 px-3">Equipe Oficial</th>
              <th className="py-3 px-3">Carro / Modelo</th>
              <th className="py-3 px-3">Categoria</th>
              <th className="py-3 px-3">ID / Game Tag</th>
              <th className="py-3 px-3">Status</th>
              {isAdmin && <th className="py-3 px-3 text-right">Ações Admin</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono-numbers">
            {displayedGridPilots.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} className="py-8 text-center text-slate-500 font-sans text-xs">
                  Nenhum piloto encontrado para o filtro selecionado.
                </td>
              </tr>
            ) : (
              displayedGridPilots.map((pilot) => {
                const pilotUser = users.find((u) => u.id === pilot.userId);
                const teamColor = getTeamColor(pilot.teamName);
                const isReserve = pilot.status === 'RESERVA' || pilot.isReserve;

                return (
                  <tr
                    key={pilot.id}
                    className="hover:bg-slate-800/40 transition-colors"
                    style={{ borderLeftWidth: '3px', borderLeftColor: isReserve ? '#f59e0b' : teamColor }}
                  >
                    <td className="py-3 px-3 text-center font-bold">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-white text-xs shadow-inner">
                        <span className="text-red-400 font-bold mr-0.5">#</span>
                        <span className="font-mono tabular-nums font-bold">{pilot.carNumber}</span>
                      </span>
                    </td>

                    <td className="py-3 px-3 font-sans">
                      <div className="flex items-center gap-2">
                        {pilotUser?.avatar && (
                          <img
                            src={pilotUser.avatar}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-7 h-7 rounded-full object-cover border-2 shadow-sm"
                            style={{ borderColor: isReserve ? '#f59e0b' : teamColor }}
                          />
                        )}
                        {pilotUser?.country && (
                          <CountryFlag country={pilotUser.country} size="xs" />
                        )}
                        <div>
                          <div className="font-semibold text-white">{pilotUser?.name || pilot.userName}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-sans text-slate-200 font-medium">
                      {isReserve ? (
                        <div className="flex items-center">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-300 font-semibold text-xs tracking-wide shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            Reserva
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span
                            className="w-1.5 h-4 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: getTeamColor(pilot.teamName) }}
                          />
                          <div className="flex items-center gap-1.5">
                            <span>{pilot.teamName}</span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 font-mono text-[10px] font-bold text-amber-400 border border-slate-700">
                              {getTeamCode(pilot.teamName, activeChampionship.simulator)}
                            </span>
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3 font-sans text-slate-400">
                      {pilot.carModel}
                    </td>

                    <td className="py-3 px-3 font-sans">
                      {(() => {
                        const tier = getSimRatingTier(pilotUser?.stats?.simRating);
                        return (
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border inline-flex items-center gap-1 ${tier.badgeBg} ${tier.badgeBorder} ${tier.textColor}`}>
                              <span>{tier.badgeIcon}</span>
                              <span>{tier.name}</span>
                            </span>
                            {pilotUser?.stats?.simRating ? (
                              <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                                {pilotUser.stats.simRating} ELO
                              </span>
                            ) : null}
                          </div>
                        );
                      })()}
                    </td>

                    <td className="py-3 px-3 font-sans text-slate-300 text-xs">
                      {pilotUser?.gamingId ? (
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-[10px] text-red-400 font-bold uppercase">{pilotUser.gamingPlatform || 'ID'}:</span>
                          <span className="text-white font-medium">{pilotUser.gamingId}</span>
                        </div>
                      ) : pilot.steamGuid || pilotUser?.steamId ? (
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-[10px] text-sky-400 font-bold">STEAM:</span>
                          <span className="text-white font-medium">{pilot.steamGuid || pilotUser?.steamId}</span>
                        </div>
                      ) : pilot.discord || pilotUser?.discordTag ? (
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <span className="text-[10px] text-indigo-400 font-bold">TAG:</span>
                          <span>{pilot.discord || pilotUser?.discordTag}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600 font-mono">-</span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-sans">
                      {isReserve ? (
                        <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1 bg-amber-950/40 border border-amber-800/60 px-2 py-0.5 rounded">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Reserva
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Aprovado
                        </span>
                      )}
                    </td>

                    {isAdmin && (
                      <td className="py-3 px-3 text-right font-sans">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditPilotTeamModal(pilot)}
                            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-950/30 rounded-lg transition-colors cursor-pointer"
                            title="Alterar Equipe do Piloto"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setPilotToRemove(pilot)}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                            title="Remover piloto do grid"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Reserves Section */}
      {reservePilots.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Pilotos Reservas Homologados ({reservePilots.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {reservePilots.map((p) => (
              <div key={p.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-red-400 font-bold">#{p.carNumber}</span>
                  <span className="text-white font-medium">{users.find((u) => u.id === p.userId || (p.userEmail && u.email?.toLowerCase().trim() === p.userEmail.toLowerCase().trim()))?.name || p.userName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">{p.teamName}</span>
                  {isAdmin && (
                    <button
                      onClick={() => updateRegistrationStatus(activeChampionship.id, p.id, 'APROVADO')}
                      className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded hover:bg-emerald-900 cursor-pointer font-medium"
                    >
                      Tornar Titular
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin Add Pilot Modal */}
      {isAddPilotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-red-500" />
              Adicionar Piloto ao Grid Oficial
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Homologue um usuário cadastrado na liga <strong>{activeChampionship.name}</strong> ({activeChampionship.simulator}).
            </p>

            {/* Multi-League Information Card */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-red-950/40 via-slate-900 to-amber-950/30 border border-red-900/50 text-[11px] text-slate-300 space-y-1 mt-3">
              <div className="flex items-center gap-1.5 font-bold text-amber-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Multi-Ligas: Pilotos podem participar em até 5 campeonatos diferentes</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Pilotos cadastrados em outras ligas (ex: RDX League, F1 Brasil, etc.) aparecem normalmente nesta lista e podem ser adicionados também a este campeonato.
              </p>
            </div>

            <form onSubmit={handleAdminEnroll} className="space-y-4 mt-4">
              {/* Pilot Selector with Search & Groups */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">
                    Selecionar Piloto Cadastrado ({allKnownUsers.length} pilotos na plataforma)
                  </label>
                  <span className="text-[10px] text-emerald-400 font-semibold">
                    {availableUsersToEnroll.length} disponíveis para esta liga
                  </span>
                </div>

                {/* Quick Search filter */}
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Filtrar por nome, ID ou liga..."
                    value={pilotSearchQuery}
                    onChange={(e) => setPilotSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>

                <select
                  required
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
                >
                  <optgroup label="✅ Pilotos Disponíveis para Adicionar (0 a 4 ligas ativas)">
                    {filteredAvailablePilots.length === 0 ? (
                      <option value="" disabled>Nenhum piloto disponível encontrado</option>
                    ) : (
                      filteredAvailablePilots.map((item) => (
                        <option key={item.user.id} value={item.user.id}>
                          {item.user.name} · [{item.otherChamps.length}/5 ligas{item.otherChamps.length > 0 ? `: ${item.otherChamps.map((c) => c.name).join(', ')}` : ' - Livre'}]
                        </option>
                      ))
                    )}
                  </optgroup>

                  {alreadyInThisChampPilots.length > 0 && (
                    <optgroup label="ℹ️ Já Cadastrados no Grid desta Liga">
                      {alreadyInThisChampPilots.map((item) => (
                        <option key={item.user.id} value={item.user.id} disabled>
                          {item.user.name} · (Já no Grid deste campeonato)
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {limitReachedPilots.length > 0 && (
                    <optgroup label="🛑 Limite Máximo Atingido (5/5 Ligas)">
                      {limitReachedPilots.map((item) => (
                        <option key={item.user.id} value={item.user.id} disabled>
                          {item.user.name} · (5/5 ligas: Limite atingido)
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Selected Pilot Preview Card */}
              {selectedPilotItem && (
                <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={selectedPilotItem.user.avatar}
                        alt={selectedPilotItem.user.name}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                      />
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{selectedPilotItem.user.name}</span>
                          {selectedPilotItem.user.country && (
                            <CountryFlag country={selectedPilotItem.user.country} size="xs" />
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {selectedPilotItem.user.gamingId ? `${selectedPilotItem.user.gamingPlatform || 'ID'}: ${selectedPilotItem.user.gamingId}` : selectedPilotItem.user.email}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        {selectedPilotItem.otherChamps.length}/5 Ligas
                      </span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">
                        Vaga {selectedPilotItem.otherChamps.length + 1} de 5 nesta liga
                      </span>
                    </div>
                  </div>

                  {selectedPilotItem.otherChamps.length > 0 ? (
                    <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                      <span className="text-slate-500 font-medium">Outras ligas em que compete: </span>
                      <span className="text-slate-300 font-semibold">
                        {selectedPilotItem.otherChamps.map((c) => c.name).join(' · ')}
                      </span>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-slate-800/80 text-[11px] text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Piloto sem outras ligas ativas (0/5) — 100% disponível</span>
                    </div>
                  )}
                </div>
              )}

              {/* Tipo de Vaga no Grid: Titular vs Reserva */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">Tipo de Vaga no Grid</label>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                    isReservePilot ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40'
                  }`}>
                    {isReservePilot ? 'Vaga Reserva' : 'Vaga Titular'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsReservePilot(false)}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      !isReservePilot
                        ? 'bg-slate-900 border-red-500 ring-1 ring-red-500/50 text-white'
                        : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${!isReservePilot ? 'bg-red-500' : 'bg-slate-600'}`} />
                        Piloto Titular
                      </span>
                      {!isReservePilot && <span className="text-[10px] text-emerald-400 font-semibold">Oficial</span>}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                      Pontua na tabela de pilotos e soma pontos para sua equipe de construtores.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsReservePilot(true)}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      isReservePilot
                        ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500/50 text-white'
                        : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${isReservePilot ? 'bg-amber-400' : 'bg-slate-600'}`} />
                        Piloto Reserva
                      </span>
                      {isReservePilot && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 rounded font-semibold">
                          Ativo
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                      Pontua <strong>somente</strong> para si na tabela de pilotos (não soma para equipes).
                    </p>
                  </button>
                </div>

                {isReservePilot && (
                  <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-800/50 text-amber-300 text-[11px] flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>
                      O piloto terá a identificação <strong>Reserva</strong> no lugar da equipe na tabela de pilotos e não pontuará para nenhuma equipe de construtores.
                    </span>
                  </div>
                )}
              </div>

              {/* Official Real Teams List */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Equipe Oficial da {activeChampionship.simulator}
                  </label>
                  <span className="text-[10px] text-red-400 font-semibold">
                    {officialTeams.length} Equipes Oficiais
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-1.5 bg-slate-950/80 border border-slate-800 rounded-xl">
                  {officialTeams.map((team) => {
                    const isSelected = selectedTeamName === team.name;
                    return (
                      <button
                        key={team.name}
                        type="button"
                        onClick={() => setSelectedTeamName(team.name)}
                        className={`flex items-center gap-2.5 p-2 rounded-lg border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 border-red-500 shadow-md ring-1 ring-red-500/60'
                            : 'bg-slate-900/40 hover:bg-slate-900/80 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        {/* Official Team Color Bar */}
                        <span
                          className="w-2 h-7 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: team.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-white truncate flex items-center gap-1.5">
                            <span className="truncate">{team.name}</span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 font-mono text-[9px] font-bold text-amber-400 border border-slate-700 shrink-0">
                              {team.code}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {team.carModel}
                          </div>
                        </div>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Car Number: Strictly 1 to 99 and unique */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">
                    Número do Carro (estritamente de 1 a 99)
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {99 - takenCarNumbersMap.size} números livres
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={99}
                    required
                    value={carNumberInput}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (isNaN(val)) {
                        setCarNumberInput(1);
                        setAdminNumberError('');
                        return;
                      }
                      setCarNumberInput(val);
                      if (val < 1 || val > 99) {
                        setAdminNumberError('O número escolhido deve ser estritamente de 1 a 99.');
                      } else if (takenCarNumbersMap.has(val)) {
                        setAdminNumberError(`O número #${val} já está em uso por ${takenCarNumbersMap.get(val)} nesta liga.`);
                      } else {
                        setAdminNumberError('');
                      }
                    }}
                    className={`w-full bg-slate-900 border rounded-lg pl-7 pr-3 py-2 text-xs font-mono-numbers text-white focus:outline-none ${
                      adminNumberError || takenCarNumbersMap.has(carNumberInput) || carNumberInput < 1 || carNumberInput > 99
                        ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/50'
                        : 'border-slate-700 focus:border-red-500'
                    }`}
                  />
                  <Hash className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>

                {/* Status validation message */}
                {carNumberInput < 1 || carNumberInput > 99 ? (
                  <div className="mt-1.5 p-2 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-[11px] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                    <span>O número escolhido deve ser estritamente de <strong>1 a 99</strong>.</span>
                  </div>
                ) : takenCarNumbersMap.has(carNumberInput) ? (
                  <div className="mt-1.5 p-2 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-[11px] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                    <span>
                      O número <strong>#{carNumberInput}</strong> já pertence a <strong>{takenCarNumbersMap.get(carNumberInput)}</strong>. Números repetidos não são permitidos.
                    </span>
                  </div>
                ) : (
                  <div className="mt-1 text-[11px] text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Número #{carNumberInput} disponível no grid</span>
                  </div>
                )}

                {/* Quick selector of popular available numbers */}
                <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                  <span className="text-slate-500 shrink-0 text-[10px]">Sugestões livres:</span>
                  {[1, 2, 4, 5, 7, 8, 10, 11, 14, 16, 23, 27, 33, 44, 55, 63, 77, 81, 99]
                    .filter((n) => !takenCarNumbersMap.has(n))
                    .slice(0, 7)
                    .map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => {
                          setCarNumberInput(num);
                          setAdminNumberError('');
                        }}
                        className={`px-2 py-0.5 rounded font-mono border transition-all cursor-pointer ${
                          carNumberInput === num
                            ? 'bg-red-600 text-white border-red-500'
                            : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        #{num}
                      </button>
                    ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddPilotModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    availableUsersToEnroll.length === 0 ||
                    takenCarNumbersMap.has(carNumberInput) ||
                    carNumberInput < 1 ||
                    carNumberInput > 99
                  }
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-semibold shadow transition-all cursor-pointer"
                >
                  Confirmar & Homologar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pilot Self Registration Modal */}
      {isSelfRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
              <Car className="w-5 h-5 text-red-500" />
              Inscrição de Piloto na Liga
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Envie sua solicitação para a comissão organizadora de <strong>{activeChampionship.name}</strong> ({activeChampionship.simulator}).
            </p>

            <form onSubmit={handleSelfRegister} className="space-y-4 mt-4">
              {/* Multi-League status for self-registration */}
              {currentUser && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Seus Campeonatos Ativos:</span>
                  </div>
                  <span className={`font-bold px-2 py-0.5 rounded text-[11px] border ${
                    myEnrolledChampsCount >= MAX_CHAMPIONSHIPS_PER_PILOT
                      ? 'bg-red-950/80 text-red-300 border-red-800'
                      : 'bg-amber-950/80 text-amber-300 border-amber-800/80'
                  }`}>
                    {myEnrolledChampsCount} / {MAX_CHAMPIONSHIPS_PER_PILOT} Ligas Permitidas
                  </span>
                </div>
              )}

              {myEnrolledChampsCount >= MAX_CHAMPIONSHIPS_PER_PILOT && (
                <div className="p-3 bg-red-950/80 border border-red-800 text-red-200 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>
                    Você atingiu o limite máximo de <strong>{MAX_CHAMPIONSHIPS_PER_PILOT} campeonatos simultâneos ({MAX_CHAMPIONSHIPS_PER_PILOT}/{MAX_CHAMPIONSHIPS_PER_PILOT})</strong>. Cancele uma de suas inscrições atuais para ingressar em uma nova liga.
                  </span>
                </div>
              )}

              {/* Official Real Teams List */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Equipe Oficial Pretendida ({activeChampionship.simulator})
                  </label>
                  <span className="text-[10px] text-red-400 font-semibold">
                    {officialTeams.length} Equipes Disponíveis
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-1.5 bg-slate-950/80 border border-slate-800 rounded-xl">
                  {officialTeams.map((team) => {
                    const isSelected = pilotSelectedTeamName === team.name;
                    return (
                      <button
                        key={team.name}
                        type="button"
                        onClick={() => setPilotSelectedTeamName(team.name)}
                        className={`flex items-center gap-2.5 p-2 rounded-lg border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 border-red-500 shadow-md ring-1 ring-red-500/60'
                            : 'bg-slate-900/40 hover:bg-slate-900/80 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        {/* Official Team Color Bar */}
                        <span
                          className="w-2 h-7 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: team.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-white truncate flex items-center gap-1.5">
                            <span className="truncate">{team.name}</span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 font-mono text-[9px] font-bold text-amber-400 border border-slate-700 shrink-0">
                              {team.code}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {team.carModel}
                          </div>
                        </div>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Car Number: Strictly 1 to 99 and unique */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">
                    Número Pretendido no Carro (estritamente de 1 a 99)
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {99 - takenCarNumbersMap.size} disponíveis
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={99}
                    required
                    value={pilotNumber}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (isNaN(val)) {
                        setPilotNumber(1);
                        setPilotNumberError('');
                        return;
                      }
                      setPilotNumber(val);
                      if (val < 1 || val > 99) {
                        setPilotNumberError('O número pretendido deve ser estritamente de 1 a 99.');
                      } else if (takenCarNumbersMap.has(val)) {
                        setPilotNumberError(`O número #${val} já está em uso por ${takenCarNumbersMap.get(val)} nesta liga.`);
                      } else {
                        setPilotNumberError('');
                      }
                    }}
                    className={`w-full bg-slate-900 border rounded-lg pl-7 pr-3 py-2 text-xs font-mono-numbers text-white focus:outline-none ${
                      pilotNumberError || takenCarNumbersMap.has(pilotNumber) || pilotNumber < 1 || pilotNumber > 99
                        ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/50'
                        : 'border-slate-700 focus:border-red-500'
                    }`}
                  />
                  <Hash className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>

                {/* Status validation message */}
                {pilotNumber < 1 || pilotNumber > 99 ? (
                  <div className="mt-1.5 p-2 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-[11px] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                    <span>O número escolhido deve ser estritamente de <strong>1 a 99</strong>.</span>
                  </div>
                ) : takenCarNumbersMap.has(pilotNumber) ? (
                  <div className="mt-1.5 p-2 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-[11px] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                    <span>
                      O número <strong>#{pilotNumber}</strong> já está ocupado por <strong>{takenCarNumbersMap.get(pilotNumber)}</strong>. Números repetidos não são permitidos.
                    </span>
                  </div>
                ) : (
                  <div className="mt-1 text-[11px] text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Número #{pilotNumber} livre para inscrição</span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Discord / Contato</label>
                <input
                  type="text"
                  placeholder="SeuNick#1234"
                  value={pilotDiscord}
                  onChange={(e) => setPilotDiscord(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 text-[11px] text-slate-400">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 inline mr-1" />
                Conforme o regulamento, sua inscrição ficará como <strong>Pendente</strong> até ser avaliada e aprovada pela comissão da liga.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSelfRegisterModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    myEnrolledChampsCount >= MAX_CHAMPIONSHIPS_PER_PILOT ||
                    takenCarNumbersMap.has(pilotNumber) ||
                    pilotNumber < 1 ||
                    pilotNumber > 99
                  }
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-semibold shadow transition-all cursor-pointer"
                >
                  {myEnrolledChampsCount >= MAX_CHAMPIONSHIPS_PER_PILOT
                    ? 'Limite (5/5) Atingido'
                    : 'Enviar Inscrição'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Pilot Removal */}
      {pilotToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#0d131f] border border-red-900/60 rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-white font-display mb-1 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Remover Piloto do Grid?
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Confirme a remoção do piloto da lista oficial de homologados deste campeonato.
            </p>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 mb-4">
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span className="text-red-400 font-mono">#{pilotToRemove.carNumber}</span>
                <span>{pilotToRemove.userName}</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                <span
                  className="w-1.5 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: getTeamColor(pilotToRemove.teamName) }}
                />
                <span>{pilotToRemove.teamName} · {pilotToRemove.carModel}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPilotToRemove(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  updateRegistrationStatus(activeChampionship.id, pilotToRemove.id, 'REJEITADO');
                  setPilotToRemove(null);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold cursor-pointer"
              >
                Remover Piloto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Pilot Team Modal */}
      {editingPilot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white font-display flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-amber-400" />
                  Alterar Equipe do Piloto
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Piloto: <strong className="text-white">{editingPilot.userName}</strong> · Número atual: <strong className="text-red-400 font-mono">#{editingPilot.carNumber}</strong>
                </p>
              </div>
              <button
                onClick={() => setEditingPilot(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePilotTeam} className="space-y-4 mt-4">
              {/* Status da Vaga: Titular vs Reserva */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">Status no Grid</label>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                    editIsReserve ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40'
                  }`}>
                    {editIsReserve ? 'Piloto Reserva' : 'Piloto Titular'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditIsReserve(false)}
                    className={`p-2 rounded-lg border text-left text-xs font-semibold transition-all cursor-pointer ${
                      !editIsReserve
                        ? 'bg-slate-900 border-red-500 ring-1 ring-red-500/50 text-white'
                        : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${!editIsReserve ? 'bg-red-500' : 'bg-slate-600'}`} />
                      <span>Titular</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditIsReserve(true)}
                    className={`p-2 rounded-lg border text-left text-xs font-semibold transition-all cursor-pointer ${
                      editIsReserve
                        ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500/50 text-amber-300'
                        : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${editIsReserve ? 'bg-amber-400' : 'bg-slate-600'}`} />
                      <span>Reserva</span>
                    </div>
                  </button>
                </div>

                {editIsReserve && (
                  <p className="text-[10px] text-amber-300/80 leading-snug">
                    O piloto constará como <strong>Reserva</strong> na tabela individual e não pontuará para equipes de construtores.
                  </p>
                )}
              </div>

              {/* Current & New Team Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Selecione a Nova Escuderia / Equipe
                  </label>
                  <span className="text-[10px] text-amber-400 font-semibold">
                    {officialTeams.length} Equipes Disponíveis
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1.5 bg-slate-950/80 border border-slate-800 rounded-xl">
                  {officialTeams.map((team) => {
                    const isSelected = editSelectedTeamName === team.name;
                    return (
                      <button
                        key={team.name}
                        type="button"
                        onClick={() => setEditSelectedTeamName(team.name)}
                        className={`flex items-center gap-2.5 p-2 rounded-lg border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 border-amber-500 shadow-md ring-1 ring-amber-500/60'
                            : 'bg-slate-900/40 hover:bg-slate-900/80 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <span
                          className="w-2 h-7 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: team.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-white truncate flex items-center gap-1.5">
                            <span className="truncate">{team.name}</span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 font-mono text-[9px] font-bold text-amber-400 border border-slate-700 shrink-0">
                              {team.code}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {team.carModel}
                          </div>
                        </div>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Car Number confirmation or edit */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Número do Carro (1 a 99)
                </label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  required
                  value={editCarNumber}
                  onChange={(e) => {
                    setEditCarNumber(parseInt(e.target.value, 10) || 1);
                    setEditNumberError('');
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
                {editNumberError && (
                  <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {editNumberError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPilot(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  Salvar Nova Equipe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
