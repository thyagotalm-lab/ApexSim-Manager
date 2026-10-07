import React, { useState, useMemo, useEffect } from 'react';
import { X, Shield, UserPlus, UserCheck, Trash2, Search, Users, CheckCircle2, UserCheck2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChampionships } from '../context/ChampionshipContext';
import { User } from '../types';
import { isFakeMockUser } from '../services/userService';

interface LeagueAdminsModalProps {
  onClose: () => void;
}

export const LeagueAdminsModal: React.FC<LeagueAdminsModalProps> = ({ onClose }) => {
  const { users, registerUser, syncUsers } = useAuth();
  const { championships, activeChampionship, addLeagueAdmin, removeLeagueAdmin, getLeagueAdmins, isUserLeagueAdmin } = useChampionships();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'admins' | 'non_admins'>('all');
  const [isSyncing, setIsSyncing] = useState(false);

  // Manual User Registration Form state
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualDiscord, setManualDiscord] = useState('');

  // Automatically sync Firestore and Backend users when modal opens
  useEffect(() => {
    syncUsers().catch(() => {});
  }, []);

  if (!activeChampionship) return null;

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await syncUsers();
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  const handleManualAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualEmail.trim()) return;
    const cleanEmail = manualEmail.trim();
    const newUser = registerUser({
      name: manualName.trim(),
      email: cleanEmail,
      role: 'admin',
      discordTag: manualDiscord.trim(),
    });
    addLeagueAdmin(activeChampionship.id, newUser.id, cleanEmail);
    setManualName('');
    setManualEmail('');
    setManualDiscord('');
    setIsManualAddOpen(false);
  };

  // Consolidate all users: AuthContext users + any user who registered in any championship
  const allUsersMap = useMemo(() => {
    const map = new Map<string, User>();
    users.forEach((u) => {
      if (!isFakeMockUser(u)) {
        map.set(u.email.toLowerCase().trim(), u);
      }
    });

    championships.forEach((c) => {
      c.registrations.forEach((reg) => {
        const emailKey = (reg.userEmail || '').toLowerCase().trim();
        if (emailKey && !map.has(emailKey)) {
          map.set(emailKey, {
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
    return map;
  }, [users, championships]);

  const allRegisteredUsers = useMemo(() => Array.from(allUsersMap.values()), [allUsersMap]);

  const currentAdminUsers = getLeagueAdmins(activeChampionship.id);
  const currentAdminIds = useMemo(() => new Set(currentAdminUsers.map((u) => u.id)), [currentAdminUsers]);

  // Filtered by search and tab
  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return allRegisteredUsers.filter((u) => {
      const isAlreadyAdmin = currentAdminIds.has(u.id);

      if (filterTab === 'admins' && !isAlreadyAdmin) return false;
      if (filterTab === 'non_admins' && isAlreadyAdmin) return false;

      if (!term) return true;

      return (
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        (u.discordTag && u.discordTag.toLowerCase().includes(term)) ||
        (u.gamingId && u.gamingId.toLowerCase().includes(term)) ||
        (u.steamId && u.steamId.toLowerCase().includes(term)) ||
        (u.racingNumber && u.racingNumber.toString().includes(term))
      );
    });
  }, [allRegisteredUsers, currentAdminIds, filterTab, searchTerm]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0c121e] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between shrink-0">
          <div>
            <div className="text-xs text-red-400 uppercase font-semibold flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-red-400" />
              <span>Controle de Permissões da Liga</span>
            </div>
            <h2 className="text-lg font-bold text-white font-display">
              Administradores: {activeChampionship.name}
            </h2>
            <div className="text-xs text-slate-400 mt-0.5">
              Gerencie quem possui permissão para homologar pilotos, editar calendários e lançar resultados.
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Top Info Banner */}
          <div className="p-3 bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-900 border border-red-900/50 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-slate-300">
                Total de Usuários Cadastrados no App:{' '}
                <strong className="text-white font-mono">{allRegisteredUsers.length}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-300">
                Admins Ativos nesta Liga:{' '}
                <strong className="text-emerald-400 font-mono">{currentAdminUsers.length}</strong>
              </span>
            </div>
          </div>

          {/* Search & Tabs Controls */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Buscar em todos os usuários cadastrados (nome, e-mail, discord, ID)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 hover:border-slate-600 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>

              <button
                type="button"
                disabled={isSyncing}
                onClick={handleManualSync}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                title="Sincronizar usuários registrados no Backend e Firebase"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsManualAddOpen(!isManualAddOpen)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5 text-red-400" />
                <span>{isManualAddOpen ? 'Fechar Cadastro' : '+ Cadastrar Usuário'}</span>
              </button>
            </div>

            {/* Collapsible Manual Registration Form */}
            {isManualAddOpen && (
              <form onSubmit={handleManualAddUser} className="p-3.5 bg-slate-950/90 border border-red-900/60 rounded-xl space-y-3 animate-in fade-in duration-150">
                <div className="text-xs font-bold text-red-300 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-red-400" />
                  <span>Cadastrar Novo Usuário e Tornar Admin da Liga</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Nome completo do piloto / admin"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                  <input
                    type="email"
                    required
                    placeholder="E-mail (ex: piloto@email.com)"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                  <input
                    type="text"
                    placeholder="Discord ou Gaming ID (opcional)"
                    value={manualDiscord}
                    onChange={(e) => setManualDiscord(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsManualAddOpen(false)}
                    className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-semibold shadow-sm cursor-pointer"
                  >
                    Cadastrar e Conceder Admin
                  </button>
                </div>
              </form>
            )}

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  filterTab === 'all'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Todos os Usuários ({allRegisteredUsers.length})
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('admins')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  filterTab === 'admins'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Administradores Desta Liga ({currentAdminUsers.length})
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('non_admins')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  filterTab === 'non_admins'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Demais Usuários / Pilotos ({allRegisteredUsers.length - currentAdminUsers.length})
              </button>
            </div>
          </div>

          {/* List of All Registered Users */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>Usuário & Identificação</span>
              <span>Permissão & Ação</span>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center bg-slate-950 border border-slate-800/80 rounded-xl">
                  <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <div className="text-xs font-semibold text-slate-300">
                    Nenhum usuário encontrado
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Tente buscar por outro termo ou selecione a aba &quot;Todos os Usuários&quot;.
                  </div>
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const isThyago = user.email.toLowerCase() === 'thyago.talm@gmail.com';
                  const isCurrentAdmin = currentAdminIds.has(user.id);

                  return (
                    <div
                      key={user.id}
                      className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                        isCurrentAdmin
                          ? 'bg-red-950/20 border-red-800/60 shadow-sm'
                          : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800'
                      }`}
                    >
                      {/* Left: User Identity */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={user.avatar}
                            alt=""
                            referrerPolicy="no-referrer"
                            className={`w-10 h-10 rounded-full object-cover border ${
                              isCurrentAdmin ? 'border-red-500' : 'border-slate-700'
                            }`}
                          />
                          {user.racingNumber && (
                            <span className="absolute -bottom-1 -right-1 bg-slate-950 text-white font-mono font-bold text-[9px] px-1 rounded border border-slate-700">
                              #{user.racingNumber}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-white truncate max-w-[180px] sm:max-w-[220px]">
                              {user.name}
                            </span>

                            {isThyago ? (
                              <span className="text-[10px] bg-red-950 text-red-300 border border-red-800 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                                <span>★</span> Admin Geral
                              </span>
                            ) : isCurrentAdmin ? (
                              <span className="text-[10px] bg-emerald-950/90 text-emerald-300 border border-emerald-800 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" /> Admin Desta Liga
                              </span>
                            ) : (
                              <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded font-medium">
                                Piloto
                              </span>
                            )}

                            {/* Badge indicating if user already administers other leagues */}
                            {(() => {
                              const otherAdminLeagues = championships.filter(
                                (c) => c.id !== activeChampionship.id && isUserLeagueAdmin(c.id, user.id)
                              );
                              if (otherAdminLeagues.length > 0) {
                                return (
                                  <span
                                    className="text-[10px] bg-purple-950/80 text-purple-300 border border-purple-800/80 px-1.5 py-0.5 rounded font-medium"
                                    title={`Administra também: ${otherAdminLeagues.map((c) => c.name).join(', ')}`}
                                  >
                                    Admin em +{otherAdminLeagues.length} {otherAdminLeagues.length === 1 ? 'outra liga' : 'outras ligas'}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>

                          <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                            <span className="truncate">{user.email}</span>
                            {user.discordTag && (
                              <>
                                <span className="text-slate-600">·</span>
                                <span className="text-slate-400">{user.discordTag}</span>
                              </>
                            )}
                            {user.country && (
                              <>
                                <span className="text-slate-600">·</span>
                                <span>{user.country}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                        {isThyago ? (
                          <span className="text-[11px] text-slate-500 font-medium italic px-2">
                            Acesso Master Vitalício
                          </span>
                        ) : isCurrentAdmin ? (
                          <div className="flex items-center gap-1.5">
                            <span className="hidden sm:inline text-xs text-emerald-400 font-semibold px-2">
                              ✓ Administrador Ativo
                            </span>

                            <button
                              type="button"
                              onClick={() => removeLeagueAdmin(activeChampionship.id, user.id, user.email)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-semibold transition-colors cursor-pointer"
                              title="Remover permissões de administrador desta liga"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              <span>Remover Admin</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addLeagueAdmin(activeChampionship.id, user.id, user.email)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                            title="Conceder acesso administrativo a este campeonato"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Tornar Admin da Liga</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400">
            Mostrando <strong>{filteredUsers.length}</strong> de <strong>{allRegisteredUsers.length}</strong> usuários cadastrados
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
