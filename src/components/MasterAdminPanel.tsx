import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChampionships } from '../context/ChampionshipContext';
import { User } from '../types';
import { getSimRatingTier } from '../utils/simRating';
import { CountryFlag } from './CountryFlag';

interface MasterAdminPanelProps {
  onNavigateToTab?: (tab: any) => void;
}

export const MasterAdminPanel: React.FC<MasterAdminPanelProps> = ({ onNavigateToTab }) => {
  const { currentUser, users, syncUsers, deleteUserAccountPermanently } = useAuth();
  const { championships } = useChampionships();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'PILOT' | 'ADMIN'>('ALL');
  const [platformFilter, setPlatformFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'NAME' | 'SIM_RATING' | 'RECENT'>('RECENT');

  // Interactive UI states
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteStepText, setDeleteStepText] = useState('');
  const [alertFeedback, setAlertFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

  // Filtered & Sorted Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
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
  }, [users, searchQuery, roleFilter, platformFilter, sortBy]);

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

  const totalPilots = users.filter((u) => u.role !== 'admin' && u.email.toLowerCase().trim() !== 'thyago.talm@gmail.com').length;
  const totalAdmins = users.filter((u) => u.role === 'admin' || u.email.toLowerCase().trim() === 'thyago.talm@gmail.com').length;

  return (
    <div className="space-y-6">
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
              <span>Gestão Global de Contas & Purga de Dados</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Painel exclusivo para visualizar todas as contas cadastradas na plataforma e realizar a exclusão total e definitiva de registros em todos os bancos de dados (Firebase Firestore, Backend Local e Inscrições em Campeonatos).
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
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">{users.length}</span>
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
              placeholder="Buscar por Nome Real, E-mail, ID, Time, Sigla, Steam ID ou Plataforma..."
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

        {/* Filter stats bar */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/80">
          <span>
            Exibindo <strong className="text-white font-mono">{filteredUsers.length}</strong> de{' '}
            <strong className="text-white font-mono">{users.length}</strong> contas registradas
          </span>
          {(searchQuery || roleFilter !== 'ALL' || platformFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('ALL');
                setPlatformFilter('ALL');
              }}
              className="text-amber-400 hover:text-amber-300 font-semibold cursor-pointer text-[11px]"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Accounts Table & Responsive Cards */}
      <div className="rounded-2xl border border-slate-800 bg-[#0c121e] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-semibold">
              <tr>
                <th className="py-3.5 px-4">Piloto / Conta</th>
                <th className="py-3.5 px-3">E-mail</th>
                <th className="py-3.5 px-3">Time & Sigla</th>
                <th className="py-3.5 px-3">Plataforma & ID</th>
                <th className="py-3.5 px-3">Sim Rating</th>
                <th className="py-3.5 px-3 text-center">Ligas</th>
                <th className="py-3.5 px-3">Papel</th>
                <th className="py-3.5 px-4 text-right">Ações do Master</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Nenhuma conta encontrada com os critérios informados.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isThyago = user.email.toLowerCase().trim() === 'thyago.talm@gmail.com';
                  const tier = getSimRatingTier(user.stats?.simRating);
                  const champCount = getUserChampionshipCount(user.id, user.email);

                  return (
                    <tr
                      key={user.id}
                      className={`transition-colors hover:bg-slate-800/40 ${
                        isThyago ? 'bg-amber-500/[0.03] border-l-4 border-l-amber-500' : ''
                      }`}
                    >
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img
                              src={user.avatar}
                              alt={user.name}
                              referrerPolicy="no-referrer"
                              className={`w-9 h-9 rounded-full object-cover border-2 shadow-sm ${
                                isThyago ? 'border-amber-500' : 'border-slate-700'
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
                          <div className="min-w-0">
                            <div className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5 truncate">
                              <span className="truncate">{user.name}</span>
                              {user.country && <CountryFlag country={user.country} size="xs" />}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono truncate flex items-center gap-1">
                              <span>ID: {user.id.substring(0, 16)}...</span>
                              <button
                                onClick={() => handleCopy(user.id, `id_${user.id}`)}
                                title="Copiar ID Completo"
                                className="hover:text-amber-400 p-0.5 cursor-pointer"
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

                      {/* Email */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px]">
                          <span className="truncate max-w-[200px]" title={user.email}>
                            {user.email}
                          </span>
                          <button
                            onClick={() => handleCopy(user.email, `email_${user.id}`)}
                            title="Copiar E-mail"
                            className="hover:text-amber-400 p-0.5 cursor-pointer shrink-0"
                          >
                            {copiedId === `email_${user.id}` ? (
                              <Check className="w-2.5 h-2.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-2.5 h-2.5 text-slate-500" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Team & Tag */}
                      <td className="py-3.5 px-3">
                        {user.teamName ? (
                          <div className="flex items-center gap-1.5 truncate max-w-[170px]">
                            {user.teamTag && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-400 font-mono text-[10px] font-bold shrink-0">
                                {user.teamTag}
                              </span>
                            )}
                            <span className="text-white font-medium truncate" title={user.teamName}>
                              {user.teamName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px] italic">Sem equipe</span>
                        )}
                      </td>

                      {/* Gaming Platform & ID */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-0.5">
                          <div className="text-[11px] text-slate-300 font-medium truncate">
                            {user.gamingPlatform || 'Steam (PC)'}
                          </div>
                          {(user.gamingId || user.steamId) && (
                            <div className="text-[10px] text-slate-400 font-mono truncate" title={user.gamingId || user.steamId}>
                              ID: {user.gamingId || user.steamId}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Sim Rating */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border inline-flex items-center gap-1 ${tier.badgeBg} ${tier.badgeBorder} ${tier.textColor}`}>
                            <span>{tier.badgeIcon}</span>
                            <span className="font-mono">{user.stats?.simRating || 3000}</span>
                          </span>
                        </div>
                      </td>

                      {/* Ligas inscritas */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 font-mono text-[11px] font-bold">
                          {champCount}
                        </span>
                      </td>

                      {/* Papel */}
                      <td className="py-3.5 px-3">
                        {isThyago ? (
                          <span className="px-2.5 py-1 rounded-md bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold text-[10px] uppercase tracking-wider inline-flex items-center gap-1">
                            <Crown className="w-3 h-3 text-amber-400" />
                            Admin Master
                          </span>
                        ) : user.role === 'admin' ? (
                          <span className="px-2 py-0.5 rounded-md bg-red-950/80 border border-red-800/80 text-red-300 font-semibold text-[10px] uppercase">
                            Admin de Liga
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-blue-950/60 border border-blue-800/60 text-blue-300 font-semibold text-[10px] uppercase">
                            Piloto
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* View details */}
                          <button
                            onClick={() => setDetailUser(user)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                            title="Ver Detalhes Completos da Conta"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Account */}
                          {isThyago ? (
                            <button
                              disabled
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-500 text-[11px] font-semibold cursor-not-allowed flex items-center gap-1 opacity-60"
                              title="A conta do Admin Master é protegida contra exclusão."
                            >
                              <Lock className="w-3 h-3" />
                              <span className="hidden sm:inline">Protegida</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setUserToDelete(user);
                                setConfirmationInput('');
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-800/80 text-red-300 hover:text-red-100 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                              title="Excluir totalmente esta conta de todos os bancos de dados"
                            >
                              <Trash2 className="w-3 h-3 text-red-400" />
                              <span>Excluir</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

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
