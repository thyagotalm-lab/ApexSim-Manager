import React, { useState, useMemo, useEffect } from 'react';
import {
  Crown,
  Shield,
  Users,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Eye,
  X,
  Lock,
  Database,
  Gamepad2,
  Zap,
  Flame,
  Award,
  ArrowUpDown,
  Car,
  ExternalLink,
  Pencil,
  Table,
  LayoutGrid,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChampionships } from '../context/ChampionshipContext';
import { User } from '../types';
import { getSimRatingTier } from '../utils/simRating';
import { CountryFlag } from './CountryFlag';
import { isFakeMockUser } from '../services/userService';

interface MasterAdminPanelProps {
  onNavigateToTab?: (tab: any) => void;
}

export const MasterAdminPanel: React.FC<MasterAdminPanelProps> = ({ onNavigateToTab }) => {
  const { currentUser, users, syncUsers, deleteUserAccountPermanently, adminUpdatePilotProfile } = useAuth();
  const { championships, propagatePilotProfileUpdate, reloadChampionships } = useChampionships();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'PILOT' | 'ADMIN'>('ALL');
  const [platformFilter, setPlatformFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'NAME' | 'SIM_RATING' | 'RECENT'>('RECENT');
  const [viewMode, setViewMode] = useState<'TABLE' | 'CARDS'>('TABLE');

  // Backend Direct State to guarantee 100% of created accounts appear immediately
  const [backendUsers, setBackendUsers] = useState<User[]>([]);

  // Interactive UI states
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteStepText, setDeleteStepText] = useState('');
  const [alertFeedback, setAlertFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Pilot Profile Editing States
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editId, setEditId] = useState('');
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamTag, setEditTeamTag] = useState('');
  const [editGamingPlatform, setEditGamingPlatform] = useState('Steam (PC)');
  const [editGamingId, setEditGamingId] = useState('');
  const [editCountry, setEditCountry] = useState('Brasil 🇧🇷');
  const [editDiscordTag, setEditDiscordTag] = useState('');
  const [editRacingNumber, setEditRacingNumber] = useState<number>(1);
  const [editSimRating, setEditSimRating] = useState<number>(3000);
  const [editRole, setEditRole] = useState<'pilot' | 'admin'>('pilot');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Direct backend fetch helper
  const refreshBackendUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.users)) {
          setBackendUsers(data.users);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch /api/users directly:', e);
    }
  };

  // Automatically sync on initial load to ensure all accounts created appear immediately
  useEffect(() => {
    refreshBackendUsers();
    syncUsers();
  }, []);

  // Consolidate all users from Backend API + AuthContext + any pilots registered in championships
  const allConsolidatedUsers = useMemo(() => {
    const map = new Map<string, User>();

    // 1. Add all users from Backend API (/api/users)
    backendUsers.forEach((u) => {
      if (!isFakeMockUser(u)) {
        if (u.id) map.set(u.id, u);
        if (u.email) map.set(u.email.toLowerCase().trim(), u);
      }
    });

    // 2. Add all users from AuthContext
    users.forEach((u) => {
      if (!isFakeMockUser(u)) {
        const existing = (u.id && map.get(u.id)) || (u.email && map.get(u.email.toLowerCase().trim()));
        if (!existing) {
          if (u.id) map.set(u.id, u);
          if (u.email) map.set(u.email.toLowerCase().trim(), u);
        } else {
          // Merge to keep most up-to-date data
          const merged = { ...existing, ...u };
          if (u.id) map.set(u.id, merged);
          if (u.email) map.set(u.email.toLowerCase().trim(), merged);
        }
      }
    });

    // 3. Add any registered pilots from championships to guarantee zero missing accounts
    championships.forEach((c) => {
      (c.registrations || []).forEach((reg) => {
        const emailKey = (reg.userEmail || '').toLowerCase().trim();
        const existing = (reg.userId && map.get(reg.userId)) || (emailKey && map.get(emailKey));
        if (!existing) {
          const regAny = reg as any;
          const synthetic: User = {
            id: reg.userId || `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: reg.userName || (reg.userEmail ? reg.userEmail.split('@')[0] : 'Piloto'),
            email: reg.userEmail || `${(reg.userName || 'piloto').toLowerCase().replace(/\s+/g, '')}@piloto.apex`,
            avatar: regAny.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250',
            role: 'pilot',
            country: regAny.country || 'Brasil 🇧🇷',
            racingNumber: reg.carNumber || 1,
            discordTag: reg.discord || '',
            steamId: reg.steamGuid || '',
            gamingId: reg.steamGuid || '',
            gamingPlatform: regAny.platform || 'Steam (PC)',
            teamName: '',
            teamTag: '',
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
          map.set(synthetic.id, synthetic);
          if (synthetic.email) map.set(synthetic.email.toLowerCase().trim(), synthetic);
        }
      });
    });

    const uniqueMap = new Map<string, User>();
    map.forEach((u) => {
      uniqueMap.set(u.id, u);
    });

    return Array.from(uniqueMap.values());
  }, [backendUsers, users, championships]);

  // Security Check: strictly restrict to thyago.talm@gmail.com
  const isMasterAdmin = currentUser?.email?.toLowerCase().trim() === 'thyago.talm@gmail.com';

  if (!isMasterAdmin) {
    return (
      <div className="p-8 sm:p-12 max-w-2xl mx-auto my-12 bg-red-950/20 border border-red-900/60 rounded-3xl text-center space-y-4 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-red-900/40 border border-red-700/60 flex items-center justify-center mx-auto text-red-500">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
          Acesso Restrito ao Admin Master
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          Este painel é de visualização e controle exclusivo da conta de Administrador Master vinculada ao e-mail:
          <br />
          <strong className="text-red-400 font-mono text-sm mt-1 inline-block">thyago.talm@gmail.com</strong>
        </p>
        <p className="text-xs text-slate-500">
          Se você é o proprietário, certifique-se de estar conectado com sua credencial oficial do Google ou e-mail correspondente.
        </p>
        {onNavigateToTab && (
          <button
            onClick={() => onNavigateToTab('overview')}
            className="mt-4 px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Voltar para Visão Geral
          </button>
        )}
      </div>
    );
  }

  // Handle Manual Sync
  const handleSync = async () => {
    try {
      setIsSyncing(true);
      await refreshBackendUsers();
      await syncUsers();
      setAlertFeedback({
        type: 'success',
        message: 'Bancos de dados (Firestore e Backend) sincronizados com sucesso!',
      });
      setTimeout(() => setAlertFeedback(null), 4000);
    } catch (err: any) {
      setAlertFeedback({
        type: 'error',
        message: `Erro ao sincronizar: ${err.message || 'Falha na conexão'}`,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // User Participation in championships
  const getUserChampionshipCount = (userId: string, email: string) => {
    const cleanEmail = email.toLowerCase().trim();
    return championships.filter((c) =>
      c.registrations.some(
        (r) => r.userId === userId || (r.userEmail && r.userEmail.toLowerCase().trim() === cleanEmail)
      )
    ).length;
  };

  // Open Edit Modal
  const handleOpenEdit = (user: User) => {
    setUserToEdit(user);
    setEditName(user.name || '');
    setEditId(user.id || '');
    setEditTeamName(user.teamName || '');
    setEditTeamTag(user.teamTag || '');
    setEditGamingPlatform(user.gamingPlatform || 'Steam (PC)');
    setEditGamingId(user.gamingId || user.steamId || '');
    setEditCountry(user.country || 'Brasil 🇧🇷');
    setEditDiscordTag(user.discordTag || '');
    setEditRacingNumber(user.racingNumber || 1);
    setEditSimRating(user.stats?.simRating || 3000);
    setEditRole(user.role === 'admin' ? 'admin' : 'pilot');
    setEditError(null);
  };

  // Submit Pilot Edit Form
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;
    if (!editName.trim()) {
      setEditError('Nome e sobrenome são obrigatórios.');
      return;
    }
    if (!editId.trim()) {
      setEditError('O ID do usuário não pode ficar vazio.');
      return;
    }

    try {
      setIsSavingEdit(true);
      setEditError(null);

      const isThyago = userToEdit.email.toLowerCase().trim() === 'thyago.talm@gmail.com';

      const updatedData: Partial<User> = {
        name: editName.trim(),
        id: isThyago ? 'user_thyago_talm' : editId.trim(),
        teamName: editTeamName.trim(),
        teamTag: editTeamTag.trim().toUpperCase(),
        gamingPlatform: editGamingPlatform,
        gamingId: editGamingId.trim(),
        steamId: editGamingId.trim(),
        country: editCountry.trim(),
        discordTag: editDiscordTag.trim(),
        racingNumber: Number(editRacingNumber) || 1,
        role: isThyago ? 'admin' : editRole,
        stats: {
          ...(userToEdit.stats || {
            races: 0,
            wins: 0,
            podiums: 0,
            poles: 0,
            fastestLaps: 0,
            points: 0,
            dnfs: 0,
            safetyRating: 'B 3.50',
            simRating: 3000,
          }),
          simRating: Number(editSimRating) || 3000,
        },
      };

      const res = await adminUpdatePilotProfile(userToEdit.id, updatedData);
      if (!res.success) {
        throw new Error(res.error || 'Falha ao atualizar dados do piloto.');
      }

      // Propagate updated name and ID across all championships, stages, results, awards & protests
      await propagatePilotProfileUpdate(
        userToEdit.id,
        updatedData.id || userToEdit.id,
        editName.trim(),
        userToEdit.email
      );

      await refreshBackendUsers();
      await reloadChampionships();

      setAlertFeedback({
        type: 'success',
        message: `Perfil do piloto "${editName.trim()}" atualizado com sucesso em todos os bancos de dados!`,
      });
      setUserToEdit(null);
      setTimeout(() => setAlertFeedback(null), 5000);
    } catch (err: any) {
      setEditError(err.message || 'Erro ao salvar alterações do piloto.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Filtered & Sorted Users
  const filteredUsers = useMemo(() => {
    return allConsolidatedUsers.filter((u) => {
      // Search term match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (u.name || '').toLowerCase().includes(q);
        const emailMatch = (u.email || '').toLowerCase().includes(q);
        const idMatch = (u.id || '').toLowerCase().includes(q);
        const teamMatch = (u.teamName || '').toLowerCase().includes(q) || (u.teamTag || '').toLowerCase().includes(q);
        const gamingMatch = (u.gamingId || '').toLowerCase().includes(q) || (u.steamId || '').toLowerCase().includes(q);
        const platformMatch = (u.gamingPlatform || '').toLowerCase().includes(q);
        if (!nameMatch && !emailMatch && !idMatch && !teamMatch && !gamingMatch && !platformMatch) {
          return false;
        }
      }

      // Role filter
      if (roleFilter === 'PILOT') {
        if (u.role === 'admin' || u.email.toLowerCase().trim() === 'thyago.talm@gmail.com') return false;
      } else if (roleFilter === 'ADMIN') {
        if (u.role !== 'admin' && u.email.toLowerCase().trim() !== 'thyago.talm@gmail.com') return false;
      }

      // Platform filter
      if (platformFilter !== 'ALL') {
        const p = (u.gamingPlatform || '').toLowerCase();
        if (platformFilter === 'PC' && !p.includes('pc') && !p.includes('steam')) return false;
        if (platformFilter === 'PS5' && !p.includes('playstation') && !p.includes('ps5') && !p.includes('ps4')) return false;
        if (platformFilter === 'XBOX' && !p.includes('xbox')) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'NAME') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'SIM_RATING') {
        return (b.stats?.simRating || 0) - (a.stats?.simRating || 0);
      }
      // RECENT: Thyago always first, then by ID or timestamp
      if (a.email.toLowerCase().trim() === 'thyago.talm@gmail.com') return -1;
      if (b.email.toLowerCase().trim() === 'thyago.talm@gmail.com') return 1;
      return b.id.localeCompare(a.id);
    });
  }, [allConsolidatedUsers, searchQuery, roleFilter, platformFilter, sortBy]);

  // Execute Complete Purge
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    if (confirmationInput.trim().toUpperCase() !== 'EXCLUIR') return;

    try {
      setIsDeleting(true);
      setDeleteStepText('1. Conectando ao Firebase Firestore e excluindo documento do usuário...');
      await new Promise((r) => setTimeout(r, 400));

      setDeleteStepText('2. Verificando e removendo inscrições em todas as ligas e campeonatos...');
      await new Promise((r) => setTimeout(r, 400));

      setDeleteStepText('3. Purgando do banco de dados local do backend server e liberando credencial...');
      const result = await deleteUserAccountPermanently(userToDelete.id);

      setDeleteStepText('4. Concluído!');
      await new Promise((r) => setTimeout(r, 300));

      setAlertFeedback({
        type: 'success',
        message: `Sucesso: A conta "${userToDelete.name}" (${userToDelete.email}) foi totalmente expurgada de todos os bancos de dados! O e-mail está livre para recadastro limpo.`,
      });

      setUserToDelete(null);
      setConfirmationInput('');
      setTimeout(() => setAlertFeedback(null), 6000);
    } catch (err: any) {
      console.error('Delete error:', err);
      setAlertFeedback({
        type: 'error',
        message: err.message || 'Falha ao excluir conta.',
      });
    } finally {
      setIsDeleting(false);
      setDeleteStepText('');
    }
  };

  const totalPilots = allConsolidatedUsers.filter((u) => u.role !== 'admin' && u.email.toLowerCase().trim() !== 'thyago.talm@gmail.com').length;
  const totalAdmins = allConsolidatedUsers.filter((u) => u.role === 'admin' || u.email.toLowerCase().trim() === 'thyago.talm@gmail.com').length;

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-6">
      {/* Feedback Toast */}
      {alertFeedback && (
        <div
          className={`p-4 rounded-2xl border text-sm flex items-center justify-between gap-3 shadow-lg animate-in fade-in slide-in-from-top duration-200 ${
            alertFeedback.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200'
              : 'bg-red-950/80 border-red-500/60 text-red-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {alertFeedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <span className="font-medium">{alertFeedback.message}</span>
          </div>
          <button
            onClick={() => setAlertFeedback(null)}
            className="p-1 hover:bg-black/30 rounded-lg text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Master Admin Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/40 bg-gradient-to-r from-amber-950/70 via-slate-900 to-[#0c121e] p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <Crown className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Torre de Comando do Admin Master</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-[11px] font-mono lowercase">thyago.talm@gmail.com</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight flex items-center gap-3">
              <span>Gestão Global de Contas & Pilotos</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Painel exclusivo para visualizar, editar perfis de pilotos (Nome, ID, Equipe, Stats) e realizar a exclusão definitiva de registros em todos os bancos de dados (Firebase Firestore, Backend Local e Inscrições em Campeonatos).
            </p>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-md disabled:opacity-50"
              title="Sincronizar Firestore e Backend em tempo real"
            >
              <RefreshCw className={`w-4 h-4 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Bancos'}</span>
            </button>

            {onNavigateToTab && (
              <button
                onClick={() => onNavigateToTab('admin-panel')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/60 text-xs font-semibold transition-all cursor-pointer shadow-md"
              >
                <Shield className="w-4 h-4" />
                <span>Gestão da Liga</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Database KPI & Telemetry Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Contas */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total de Contas</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">{allConsolidatedUsers.length}</span>
            <span className="text-[11px] text-slate-400">cadastradas</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            100% contas reais
          </div>
        </div>

        {/* Total Pilotos */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pilotos Registrados</span>
            <Car className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-blue-400 font-mono">{totalPilots}</span>
            <span className="text-[11px] text-slate-400">pilotos ativos</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">
            Prontos para homologação
          </div>
        </div>

        {/* Total Administradores */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Administradores</span>
            <Shield className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-red-400 font-mono">{totalAdmins}</span>
            <span className="text-[11px] text-slate-400">com permissão</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">
            Incluindo Admin Master Root
          </div>
        </div>

        {/* Status dos Bancos */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Bancos de Dados</span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-300">Firestore:</span>
              <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Conectado
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-300">Backend API:</span>
              <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Ativo (/api/users)
              </span>
            </div>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">
            Two-way sync bidirecional
          </div>
        </div>
      </div>

      {/* Search, Filter & Sort Toolbar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0c121e] border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por Nome, E-mail, ID, Time, Sigla, Steam ID ou Plataforma..."
              className="w-full bg-slate-950 border border-slate-700/80 focus:border-amber-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option value="ALL">Todos os Papéis</option>
              <option value="PILOT">Apenas Pilotos</option>
              <option value="ADMIN">Apenas Administradores</option>
            </select>

            {/* Platform Filter */}
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option value="ALL">Todas as Plataformas</option>
              <option value="PC">Steam / PC</option>
              <option value="PS5">PlayStation (PS5/PS4)</option>
              <option value="XBOX">Xbox Series / One</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              <option value="RECENT">Mais Recentes / Master Root</option>
              <option value="NAME">Nome (A - Z)</option>
              <option value="SIM_RATING">Maior Sim Rating</option>
            </select>
          </div>
        </div>

        {/* Filter stats bar & View Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <span>
              Exibindo <strong className="text-white font-mono">{filteredUsers.length}</strong> de{' '}
              <strong className="text-white font-mono">{allConsolidatedUsers.length}</strong> contas registradas
            </span>
            {(searchQuery || roleFilter !== 'ALL' || platformFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setRoleFilter('ALL');
                  setPlatformFilter('ALL');
                }}
                className="text-amber-400 hover:text-amber-300 font-semibold cursor-pointer text-[11px] ml-1"
              >
                Limpar Filtros
              </button>
            )}
          </div>

          {/* View Mode Toggle (Tabela Compacta vs Cartões Fluidos) */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <span className="text-[11px] text-slate-400 hidden sm:inline">Visualização:</span>
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('TABLE')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'TABLE'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
                title="Tabela de pilotos 100% ajustada à tela sem barra de rolagem lateral"
              >
                <Table className="w-3.5 h-3.5" />
                <span>Tabela</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('CARDS')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'CARDS'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
                title="Lista em cartões responsivos sem barra de rolagem lateral"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cartões</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Accounts Container (Zero Lateral Scrollbar on Page) */}
      <div className="w-full max-w-full overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-500 rounded-2xl border border-slate-800 bg-[#0c121e]">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
            Nenhuma conta encontrada com os critérios informados.
          </div>
        ) : viewMode === 'TABLE' ? (
          /* =========================================================================
             OFFICIAL MASTER ADMIN TABLE (100% BOUNDED, ZERO HORIZONTAL SCROLLBAR)
             ========================================================================= */
          <div className="w-full max-w-full overflow-hidden rounded-2xl border border-slate-800 bg-[#0c121e] shadow-xl">
            {/* Desktop / Tablet Table View (table-fixed strictly prevents lateral scrolling) */}
            <div className="hidden md:block w-full max-w-full overflow-hidden">
              <table className="w-full text-left text-xs text-slate-300 table-fixed">
                <thead className="bg-slate-900/90 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-semibold select-none">
                  <tr>
                    <th className="py-3 px-3.5 w-[28%]">Piloto & ID</th>
                    <th className="py-3 px-3 w-[26%]">E-mail & Papel</th>
                    <th className="py-3 px-3 w-[16%]">Equipe & Carro</th>
                    <th className="py-3 px-3 w-[11%]">Sim Rating</th>
                    <th className="py-3 px-2.5 w-[8%] text-center">Ligas</th>
                    <th className="py-3 px-3.5 w-[11%] text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono-numbers">
                  {filteredUsers.map((user) => {
                    const isThyago = user.email.toLowerCase().trim() === 'thyago.talm@gmail.com';
                    const tier = getSimRatingTier(user.stats?.simRating);
                    const champCount = getUserChampionshipCount(user.id, user.email);

                    return (
                      <tr
                        key={user.id}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          isThyago ? 'bg-amber-950/20' : ''
                        }`}
                      >
                        {/* Piloto & ID */}
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative shrink-0">
                              <img
                                src={user.avatar}
                                alt={user.name}
                                referrerPolicy="no-referrer"
                                className={`w-9 h-9 rounded-full object-cover border ${
                                  isThyago ? 'border-amber-500 shadow-sm' : 'border-slate-700'
                                }`}
                              />
                              {isThyago && (
                                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full flex items-center justify-center text-[8px] text-slate-950 font-bold shadow">
                                  👑
                                </span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white text-xs truncate max-w-full" title={user.name}>
                                  {user.name}
                                </span>
                                {user.country && <CountryFlag country={user.country} size="xs" />}
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono mt-0.5">
                                <span className="truncate max-w-[130px] select-all" title={user.id}>
                                  {user.id}
                                </span>
                                <button
                                  onClick={() => handleCopy(user.id, `id_${user.id}`)}
                                  title="Copiar ID"
                                  className="hover:text-amber-400 p-0.5 cursor-pointer text-slate-500 hover:text-white shrink-0"
                                >
                                  {copiedId === `id_${user.id}` ? (
                                    <Check className="w-2.5 h-2.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-2.5 h-2.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* E-mail & Papel */}
                        <td className="py-3 px-3">
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-1 font-mono text-[11px] text-slate-300">
                              <span className="truncate max-w-full" title={user.email}>
                                {user.email}
                              </span>
                              <button
                                onClick={() => handleCopy(user.email, `email_${user.id}`)}
                                title="Copiar E-mail"
                                className="hover:text-amber-400 p-0.5 cursor-pointer text-slate-500 shrink-0"
                              >
                                {copiedId === `email_${user.id}` ? (
                                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-2.5 h-2.5" />
                                )}
                              </button>
                            </div>
                            <div>
                              {isThyago ? (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[9px] uppercase tracking-wider border border-amber-500/40">
                                  Master Root
                                </span>
                              ) : user.role === 'admin' ? (
                                <span className="px-1.5 py-0.5 rounded bg-red-950/80 text-red-300 font-semibold text-[9px] uppercase border border-red-800/60">
                                  Admin Liga
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-blue-950/60 text-blue-300 font-semibold text-[9px] uppercase border border-blue-800/60">
                                  Piloto
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Equipe & Carro */}
                        <td className="py-3 px-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1 text-xs">
                              {user.teamTag && (
                                <span className="px-1 py-0.2 rounded bg-slate-800 text-amber-400 font-mono font-bold text-[9px] shrink-0">
                                  {user.teamTag}
                                </span>
                              )}
                              <span className="truncate font-medium text-slate-200" title={user.teamName || 'Sem equipe'}>
                                {user.teamName || <span className="text-slate-500 italic text-[11px]">Sem equipe</span>}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {user.racingNumber ? `Carro #${user.racingNumber}` : '—'}
                            </div>
                          </div>
                        </td>

                        {/* Sim Rating */}
                        <td className="py-3 px-3">
                          <div className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border inline-flex items-center gap-1 ${tier.badgeBg} ${tier.badgeBorder} ${tier.textColor}`}>
                            <span>{tier.badgeIcon}</span>
                            <span className="font-mono">{user.stats?.simRating || 3000}</span>
                          </div>
                        </td>

                        {/* Ligas */}
                        <td className="py-3 px-2.5 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-amber-400 font-mono text-[11px] font-bold">
                            <Car className="w-2.5 h-2.5" />
                            <span>{champCount}</span>
                          </span>
                        </td>

                        {/* Ações */}
                        <td className="py-3 px-3.5 text-right">
                          <div className="flex items-center justify-end gap-1 shrink-0">
                            <button
                              onClick={() => handleOpenEdit(user)}
                              className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/50 text-amber-300 hover:text-amber-200 transition-all cursor-pointer shadow-sm"
                              title="Editar Perfil do Piloto (Nome, ID, Equipe, Stats)"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDetailUser(user)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                              title="Ver Detalhes da Conta"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {isThyago ? (
                              <span
                                className="p-1.5 rounded-lg bg-slate-800/40 text-slate-600 cursor-not-allowed"
                                title="Root Protegido contra exclusão"
                              >
                                <Lock className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  setUserToDelete(user);
                                  setConfirmationInput('');
                                }}
                                className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-800/70 text-red-400 hover:text-red-200 transition-all cursor-pointer shadow-sm"
                                title="Excluir Conta Permanentemente"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards Stack inside Table Mode (No lateral scroll on phones) */}
            <div className="md:hidden divide-y divide-slate-800/80">
              {filteredUsers.map((user) => {
                const isThyago = user.email.toLowerCase().trim() === 'thyago.talm@gmail.com';
                const tier = getSimRatingTier(user.stats?.simRating);
                const champCount = getUserChampionshipCount(user.id, user.email);

                return (
                  <div key={user.id} className="p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={user.avatar}
                          alt={user.name}
                          referrerPolicy="no-referrer"
                          className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-xs truncate max-w-[170px]" title={user.name}>
                              {user.name}
                            </span>
                            {user.country && <CountryFlag country={user.country} size="xs" />}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate max-w-[160px]">
                            {user.email}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenEdit(user)}
                          className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/50 text-amber-300"
                          title="Editar Perfil"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDetailUser(user)}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
                          title="Detalhes"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {!isThyago && (
                          <button
                            onClick={() => {
                              setUserToDelete(user);
                              setConfirmationInput('');
                            }}
                            className="p-1.5 rounded-lg bg-red-950/60 border border-red-800/70 text-red-400"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">
                        ID: {user.id.slice(0, 14)}...
                      </span>
                      <span className={`px-2 py-0.5 rounded font-bold border ${tier.badgeBg} ${tier.badgeBorder} ${tier.textColor}`}>
                        {tier.badgeIcon} {user.stats?.simRating || 3000}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-400 font-mono">
                        {champCount} ligas
                      </span>
                      {user.teamName && (
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-200">
                          {user.teamTag ? `[${user.teamTag}] ` : ''}{user.teamName}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* =========================================================================
             CARDS VIEW (2-TIER CLEAN WRAPPING, ZERO HORIZONTAL SCROLLBAR)
             ========================================================================= */
          <div className="w-full space-y-3">
            {filteredUsers.map((user) => {
              const isThyago = user.email.toLowerCase().trim() === 'thyago.talm@gmail.com';
              const tier = getSimRatingTier(user.stats?.simRating);
              const champCount = getUserChampionshipCount(user.id, user.email);

              return (
                <div
                  key={user.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isThyago
                      ? 'bg-amber-950/20 border-amber-500/50 shadow-lg shadow-amber-950/20'
                      : 'bg-[#0c121e]/90 hover:bg-[#111827] border-slate-800/80 shadow-md hover:border-slate-700'
                  }`}
                >
                  {/* Top Tier: Pilot Identity + Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={user.avatar}
                          alt={user.name}
                          referrerPolicy="no-referrer"
                          className={`w-11 h-11 rounded-full object-cover border-2 ${
                            isThyago ? 'border-amber-500 shadow-md shadow-amber-500/20' : 'border-slate-700'
                          }`}
                        />
                        {isThyago && (
                          <span
                            className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-[9px] text-slate-950 font-bold shadow"
                            title="Admin Master Root"
                          >
                            👑
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-sm sm:text-base truncate max-w-[240px] sm:max-w-[340px]" title={user.name}>
                            {user.name}
                          </span>
                          {user.country && <CountryFlag country={user.country} size="xs" />}
                          {isThyago ? (
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px] uppercase tracking-wider border border-amber-500/40">
                              Master Root
                            </span>
                          ) : user.role === 'admin' ? (
                            <span className="px-2 py-0.5 rounded bg-red-950/80 text-red-300 font-semibold text-[10px] uppercase border border-red-800/60">
                              Admin da Liga
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 font-semibold text-[10px] uppercase border border-blue-800/60">
                              Piloto
                            </span>
                          )}
                          {user.racingNumber && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-white font-mono text-[10px] font-bold">
                              #{user.racingNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        onClick={() => handleOpenEdit(user)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/50 text-amber-300 hover:text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                        title="Editar Perfil do Piloto (Nome, ID, Equipe, Stats)"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>

                      <button
                        onClick={() => setDetailUser(user)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Ver Detalhes Completos da Conta"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        <span>Detalhes</span>
                      </button>

                      {isThyago ? (
                        <span
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800/40 border border-slate-800 text-slate-600 text-xs font-semibold flex items-center gap-1 cursor-not-allowed"
                          title="Conta Master Root protegida contra exclusão"
                        >
                          <Lock className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setUserToDelete(user);
                            setConfirmationInput('');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-800/70 text-red-300 hover:text-red-100 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                          title="Excluir Conta Permanentemente"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          <span>Excluir</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Bottom Tier: Fluid Wrapping Chips (Guaranteed zero overflow) */}
                  <div className="pt-3 flex flex-wrap items-center gap-2 text-xs">
                    {/* ID Chip */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px] max-w-full">
                      <span className="text-slate-500">ID:</span>
                      <span className="truncate max-w-[140px] sm:max-w-[200px] select-all" title={user.id}>
                        {user.id}
                      </span>
                      <button
                        onClick={() => handleCopy(user.id, `id_${user.id}`)}
                        title="Copiar ID"
                        className="hover:text-amber-400 p-0.5 cursor-pointer text-slate-500 hover:text-white shrink-0"
                      >
                        {copiedId === `id_${user.id}` ? (
                          <Check className="w-2.5 h-2.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-2.5 h-2.5" />
                        )}
                      </button>
                    </div>

                    {/* Email Chip */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px] max-w-full">
                      <span className="truncate max-w-[170px] sm:max-w-[240px]" title={user.email}>
                        {user.email}
                      </span>
                      <button
                        onClick={() => handleCopy(user.email, `email_${user.id}`)}
                        title="Copiar E-mail"
                        className="hover:text-amber-400 p-0.5 cursor-pointer text-slate-500 shrink-0"
                      >
                        {copiedId === `email_${user.id}` ? (
                          <Check className="w-2.5 h-2.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-2.5 h-2.5" />
                        )}
                      </button>
                    </div>

                    {/* Team Chip */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs">
                      {user.teamName ? (
                        <>
                          {user.teamTag && (
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-amber-400 font-mono font-bold text-[10px]">
                              {user.teamTag}
                            </span>
                          )}
                          <span className="font-medium truncate max-w-[140px]" title={user.teamName}>
                            {user.teamName}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">Sem equipe</span>
                      )}
                    </div>

                    {/* Sim Rating Chip */}
                    <div className={`px-2.5 py-1 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 ${tier.badgeBg} ${tier.badgeBorder} ${tier.textColor}`}>
                      <span>{tier.badgeIcon}</span>
                      <span className="font-mono">{user.stats?.simRating || 3000}</span>
                    </div>

                    {/* Platform Chip */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-[11px]">
                      <Gamepad2 className="w-3 h-3 text-slate-500" />
                      <span>{user.gamingPlatform || 'Steam'}</span>
                      {(user.gamingId || user.steamId) && (
                        <span className="font-mono text-slate-400 truncate max-w-[100px]" title={user.gamingId || user.steamId}>
                          · {user.gamingId || user.steamId}
                        </span>
                      )}
                    </div>

                    {/* Championships Count Chip */}
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-amber-400 font-mono text-[11px] font-bold">
                      <Car className="w-3 h-3 text-amber-400" />
                      <span>{champCount} liga(s)</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Pilot Profile Modal (Master Admin Only) */}
      {userToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-[#0d131f] border border-amber-500/50 rounded-3xl shadow-2xl p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={userToEdit.avatar}
                  alt={userToEdit.name}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-full object-cover border-2 border-amber-500/70"
                />
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px] uppercase tracking-wider border border-amber-500/40 mb-1">
                    <Pencil className="w-3 h-3 text-amber-400" />
                    <span>Edição de Perfil de Piloto</span>
                  </div>
                  <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
                    <span>{userToEdit.name}</span>
                    {userToEdit.country && <CountryFlag country={userToEdit.country} size="xs" />}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUserToEdit(null);
                  setEditError(null);
                }}
                disabled={isSavingEdit}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Message */}
            {editError && (
              <div className="p-3 rounded-xl bg-red-950/70 border border-red-800 text-red-200 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            {/* Edit Form */}
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Nome e Sobrenome */}
                <div className="space-y-1">
                  <label className="block text-slate-300 font-semibold text-[11px]">
                    Nome e Sobrenome <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Ex: Ayrton Senna"
                    disabled={isSavingEdit}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                  />
                </div>

                {/* ID do Piloto */}
                <div className="space-y-1">
                  <label className="block text-slate-300 font-semibold text-[11px] flex items-center justify-between">
                    <span>ID do Usuário <span className="text-amber-400">*</span></span>
                    {userToEdit.email.toLowerCase().trim() === 'thyago.talm@gmail.com' && (
                      <span className="text-[10px] text-amber-400/80 font-normal">Protegido (Master)</span>
                    )}
                  </label>
                  <input
                    type="text"
                    required
                    value={editId}
                    onChange={(e) => setEditId(e.target.value)}
                    disabled={isSavingEdit || userToEdit.email.toLowerCase().trim() === 'thyago.talm@gmail.com'}
                    placeholder="Ex: user_1791..."
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                  />
                  <span className="text-[10px] text-slate-500 block leading-tight">
                    Alterar este ID atualiza automaticamente todas as inscrições deste piloto.
                  </span>
                </div>

                {/* E-mail (Bloqueado) */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-slate-400 font-semibold text-[11px] flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-amber-400" />
                    <span>E-mail de Cadastro (Bloqueado para Edição)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      disabled
                      value={userToEdit.email}
                      className="w-full bg-slate-900/60 border border-slate-800 text-slate-400 font-mono text-xs rounded-xl px-3.5 py-2.5 cursor-not-allowed select-all"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    O e-mail e senha de acesso são protegidos para preservar as credenciais originais de login do piloto.
                  </span>
                </div>

                {/* Equipe do Piloto */}
                <div className="space-y-1">
                  <label className="block text-slate-300 font-semibold text-[11px]">
                    Equipe do Piloto (Perfil Pessoal)
                  </label>
                  <input
                    type="text"
                    value={editTeamName}
                    onChange={(e) => setEditTeamName(e.target.value)}
                    placeholder="Ex: RDX Racing, Apex SimTeam"
                    disabled={isSavingEdit}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                  />
                </div>

                {/* Sigla da Equipe */}
                <div className="space-y-1">
                  <label className="block text-slate-300 font-semibold text-[11px]">
                    Sigla da Equipe (TAG)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={editTeamTag}
                    onChange={(e) => setEditTeamTag(e.target.value.toUpperCase())}
                    placeholder="Ex: RDX, APX, F1"
                    disabled={isSavingEdit}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white uppercase font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                  />
                </div>

                {/* Plataforma de Jogo */}
                <div className="space-y-1">
                  <label className="block text-slate-300 font-semibold text-[11px]">
                    Plataforma Principal
                  </label>
                  <select
                    value={editGamingPlatform}
                    onChange={(e) => setEditGamingPlatform(e.target.value)}
                    disabled={isSavingEdit}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors cursor-pointer"
                  >
                    <option value="Steam (PC)">Steam (PC)</option>
                    <option value="PlayStation (PS5/PS4)">PlayStation (PS5/PS4)</option>
                    <option value="Xbox Series / One">Xbox Series / One</option>
                  </select>
                </div>

                {/* Gaming ID / Steam ID */}
                <div className="space-y-1">
                  <label className="block text-slate-300 font-semibold text-[11px]">
                    ID da Plataforma / Steam GUID
                  </label>
                  <input
                    type="text"
                    value={editGamingId}
                    onChange={(e) => setEditGamingId(e.target.value)}
                    placeholder="Ex: 76561198000123456 ou PSN ID"
                    disabled={isSavingEdit}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                  />
                </div>

                {/* País */}
                <div className="space-y-1">
                  <label className="block text-slate-300 font-semibold text-[11px]">
                    País / Nacionalidade
                  </label>
                  <select
                    value={editCountry}
                    onChange={(e) => setEditCountry(e.target.value)}
                    disabled={isSavingEdit}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors cursor-pointer"
                  >
                    <option value="Brasil 🇧🇷">Brasil 🇧🇷</option>
                    <option value="Portugal 🇵🇹">Portugal 🇵🇹</option>
                    <option value="Argentina 🇦🇷">Argentina 🇦🇷</option>
                    <option value="Espanha 🇪🇸">Espanha 🇪🇸</option>
                    <option value="Estados Unidos 🇺🇸">Estados Unidos 🇺🇸</option>
                    <option value="Reino Unido 🇬🇧">Reino Unido 🇬🇧</option>
                    <option value="Itália 🇮🇹">Itália 🇮🇹</option>
                    <option value="Alemanha 🇩🇪">Alemanha 🇩🇪</option>
                    <option value="França 🇫🇷">França 🇫🇷</option>
                    <option value="Internacional 🌐">Internacional 🌐</option>
                  </select>
                </div>

                {/* Discord Tag */}
                <div className="space-y-1">
                  <label className="block text-slate-300 font-semibold text-[11px]">
                    Discord Tag
                  </label>
                  <input
                    type="text"
                    value={editDiscordTag}
                    onChange={(e) => setEditDiscordTag(e.target.value)}
                    placeholder="Ex: piloto#1234 ou piloto.sim"
                    disabled={isSavingEdit}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                  />
                </div>

                {/* Número do Carro */}
                <div className="space-y-1">
                  <label className="block text-slate-300 font-semibold text-[11px]">
                    Número de Corrida (#)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={editRacingNumber}
                    onChange={(e) => setEditRacingNumber(parseInt(e.target.value) || 1)}
                    disabled={isSavingEdit}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                  />
                </div>

                {/* Sim Rating */}
                <div className="space-y-1">
                  <label className="block text-slate-300 font-semibold text-[11px]">
                    Sim Rating (Pontuação Geral)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10000}
                    value={editSimRating}
                    onChange={(e) => setEditSimRating(parseInt(e.target.value) || 3000)}
                    disabled={isSavingEdit}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                  />
                </div>

                {/* Papel do Usuário */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-slate-300 font-semibold text-[11px]">
                    Papel na Plataforma
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    disabled={isSavingEdit || userToEdit.email.toLowerCase().trim() === 'thyago.talm@gmail.com'}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="pilot">Piloto (Acesso comum, inscrições e perfil)</option>
                    <option value="admin">Administrador de Liga (Gerencia campeonatos atribuídos)</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setUserToEdit(null);
                    setEditError(null);
                  }}
                  disabled={isSavingEdit}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all cursor-pointer shadow-lg shadow-amber-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingEdit ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando Alterações...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Salvar Alterações</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Inspector Modal */}
      {detailUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-[#0d131f] border border-amber-500/40 rounded-3xl shadow-2xl p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={detailUser.avatar}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-full object-cover border-2 border-amber-500/60"
                />
                <div>
                  <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
                    <span>{detailUser.name}</span>
                    {detailUser.country && <CountryFlag country={detailUser.country} size="sm" />}
                  </h3>
                  <div className="text-xs text-slate-400 font-mono">{detailUser.email}</div>
                </div>
              </div>
              <button
                onClick={() => setDetailUser(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">ID do Usuário</span>
                <div className="font-mono text-slate-300 break-all select-all">{detailUser.id}</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Papel / Função</span>
                <div className="font-semibold text-white capitalize">{detailUser.role}</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Equipe do Piloto</span>
                <div className="font-semibold text-white">
                  {detailUser.teamName ? `${detailUser.teamName} [${detailUser.teamTag || '---'}]` : 'Nenhuma'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Plataforma & ID</span>
                <div className="text-slate-300">
                  {detailUser.gamingPlatform || 'Steam (PC)'} — {detailUser.gamingId || detailUser.steamId || 'Sem ID'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Discord Tag</span>
                <div className="text-slate-300 font-mono">{detailUser.discordTag || 'Não informado'}</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Número de Corrida</span>
                <div className="font-mono text-amber-400 font-bold">#{detailUser.racingNumber || '---'}</div>
              </div>
            </div>

            {/* Performance Stats */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                Estatísticas de Corrida
              </span>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 bg-slate-950 rounded-lg">
                  <div className="text-slate-500 text-[10px]">Corridas</div>
                  <div className="font-bold text-white font-mono">{detailUser.stats?.races || 0}</div>
                </div>
                <div className="p-2 bg-slate-950 rounded-lg">
                  <div className="text-slate-500 text-[10px]">Vitórias</div>
                  <div className="font-bold text-amber-400 font-mono">{detailUser.stats?.wins || 0}</div>
                </div>
                <div className="p-2 bg-slate-950 rounded-lg">
                  <div className="text-slate-500 text-[10px]">Pódios</div>
                  <div className="font-bold text-slate-300 font-mono">{detailUser.stats?.podiums || 0}</div>
                </div>
                <div className="p-2 bg-slate-950 rounded-lg">
                  <div className="text-slate-500 text-[10px]">Sim Rating</div>
                  <div className="font-bold text-amber-400 font-mono">{detailUser.stats?.simRating || 3000}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setDetailUser(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Critical Two-Step Purge Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#0e111a] border-2 border-red-600 rounded-3xl shadow-2xl p-6 sm:p-7 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-950 border border-red-700/80 flex items-center justify-center text-red-500 shrink-0">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-display leading-tight">
                  Exclusão Total e Irreversível de Conta
                </h3>
                <p className="text-xs text-red-400 font-medium">
                  Ação exclusiva do Administrador Master (thyago.talm@gmail.com)
                </p>
              </div>
            </div>

            {/* Target Account Summary */}
            <div className="p-4 rounded-2xl bg-red-950/20 border border-red-900/60 space-y-2">
              <div className="flex items-center gap-3">
                <img
                  src={userToDelete.avatar}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover border border-red-500/80"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white text-sm truncate">{userToDelete.name}</div>
                  <div className="text-xs text-slate-300 font-mono truncate">{userToDelete.email}</div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">ID: {userToDelete.id}</div>
                </div>
              </div>
            </div>

            {/* Detailed checklist of what will be purged */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs text-slate-300">
              <div className="font-bold text-amber-400 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                <span>O que será expurgado nesta operação:</span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-slate-400">
                <li className="flex items-start gap-1.5">
                  <span className="text-red-400 font-bold">✕</span>
                  <span>Documento do usuário na coleção <strong>users</strong> do Firebase Firestore</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-red-400 font-bold">✕</span>
                  <span>Registro no banco de dados local do backend (<strong>data/users.json</strong>)</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-red-400 font-bold">✕</span>
                  <span>Desvinculação e remoção de <strong>todas as inscrições</strong> em campeonatos (vagas e carros liberados)</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-red-400 font-bold">✕</span>
                  <span>Purga do identificador no cache de clientes e sessões ativas</span>
                </li>
                <li className="flex items-start gap-1.5 text-emerald-400">
                  <span className="font-bold">✓</span>
                  <span>O e-mail <strong>{userToDelete.email}</strong> ficará 100% liberado caso o usuário deseje criar uma nova conta do zero</span>
                </li>
              </ul>
            </div>

            {/* Safety typing validation */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Para confirmar a exclusão definitiva, digite a palavra{' '}
                <strong className="text-red-400 font-mono tracking-widest uppercase">EXCLUIR</strong> abaixo:
              </label>
              <input
                type="text"
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder="Digite EXCLUIR"
                disabled={isDeleting}
                className="w-full bg-slate-950 border border-red-900 focus:border-red-500 rounded-xl px-4 py-2 text-sm text-white font-mono uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            {/* In-progress status text */}
            {isDeleting && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-300 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin shrink-0 text-amber-400" />
                <span>{deleteStepText}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setUserToDelete(null);
                  setConfirmationInput('');
                }}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting || confirmationInput.trim().toUpperCase() !== 'EXCLUIR'}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-red-950 flex items-center gap-2 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Expurgando dos Bancos...' : 'Sim, Excluir Totalmente'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
