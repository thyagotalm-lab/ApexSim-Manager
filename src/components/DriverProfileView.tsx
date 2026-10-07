import React, { useState } from 'react';
import { UserCheck, Trophy, Award, Zap, Shield, Flag, CheckCircle2, TrendingUp, Edit3, Save, Camera, Gamepad2, AlertCircle, Sparkles, Swords } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChampionships, MAX_CHAMPIONSHIPS_PER_PILOT } from '../context/ChampionshipContext';
import { calculateDriverStandings } from '../utils/standings';
import { AvatarUploader } from './AvatarUploader';
import { CountryFlag } from './CountryFlag';
import { getSimRatingTier } from '../utils/simRating';
import { User } from '../types';

interface DriverProfileViewProps {
  onOpenCardModal?: (driver?: User) => void;
  onOpenH2HModal?: (driverA?: User, driverB?: User) => void;
}

export const DriverProfileView: React.FC<DriverProfileViewProps> = ({
  onOpenCardModal,
  onOpenH2HModal,
}) => {
  const { currentUser, updateUser, resetPilotStats } = useAuth();
  const { championships, setActiveChampionshipId, isUserLeagueAdmin, getDriverCommunityTrophies } = useChampionships();

  const [isEditing, setIsEditing] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [name, setName] = useState(currentUser?.name || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '');
  const [gamingPlatform, setGamingPlatform] = useState(currentUser?.gamingPlatform || 'Steam (PC)');
  const [gamingId, setGamingId] = useState(currentUser?.gamingId || currentUser?.steamId || '');
  const [country, setCountry] = useState(currentUser?.country || 'Brasil 🇧🇷');
  const [discordTag, setDiscordTag] = useState(currentUser?.discordTag || '');
  const [teamName, setTeamName] = useState(currentUser?.teamName || '');
  const [teamTag, setTeamTag] = useState(currentUser?.teamTag || '');

  React.useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setAvatar(currentUser.avatar);
      setGamingPlatform(currentUser.gamingPlatform || 'Steam (PC)');
      setGamingId(currentUser.gamingId || currentUser.steamId || '');
      setCountry(currentUser.country || 'Brasil 🇧🇷');
      setDiscordTag(currentUser.discordTag || '');
      setTeamName(currentUser.teamName || '');
      setTeamTag(currentUser.teamTag || '');
    }
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="p-12 text-center text-slate-400">
        Você precisa estar conectado para visualizar seu perfil e estatísticas de piloto.
      </div>
    );
  }

  const stats = currentUser.stats;
  const winRate = stats.races > 0 ? ((stats.wins / stats.races) * 100).toFixed(1) : '0.0';
  const podiumRate = stats.races > 0 ? ((stats.podiums / stats.races) * 100).toFixed(1) : '0.0';

  // Find championships where this user is enrolled as pilot (approved or pending)
  const enrolledChampionships = championships.filter((c) =>
    c.registrations.some(
      (r) =>
        r.userId === currentUser.id ||
        (r.userEmail && r.userEmail.toLowerCase().trim() === currentUser.email.toLowerCase().trim())
    )
  );

  // Find championships where this user is an administrator
  const administeredChampionships = championships.filter((c) =>
    isUserLeagueAdmin(c.id, currentUser.id)
  );

  const simRatingTier = getSimRatingTier(stats.simRating);
  const communityTrophies = getDriverCommunityTrophies(currentUser.id);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({
      ...currentUser,
      name,
      avatar: avatar || currentUser.avatar,
      gamingPlatform,
      gamingId: gamingId.trim(),
      steamId: gamingId.trim(),
      country,
      discordTag,
      teamName: teamName.trim() || undefined,
      teamTag: teamTag.trim().toUpperCase() || undefined,
      driverCategory: simRatingTier.name as any,
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Driver License Card (FIA / ApexSim Style) */}
      <div className="relative overflow-hidden rounded-2xl border border-red-900/40 bg-gradient-to-br from-slate-900 via-[#0d131f] to-slate-950 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-carbon-pattern opacity-15 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Driver Identity */}
          <div className="flex items-center gap-5">
            <div className="relative group">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                referrerPolicy="no-referrer"
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-red-500/80 shadow-xl"
              />
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-2xl flex flex-col items-center justify-center text-white text-[10px] font-medium transition-opacity cursor-pointer"
                title="Alterar foto de perfil"
              >
                <Camera className="w-5 h-5 mb-0.5" />
                <span>Trocar</span>
              </button>
              {currentUser.gamingId ? (
                <span className="absolute -bottom-2 -right-2 bg-slate-950 text-red-400 font-mono text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-700 shadow-md flex items-center gap-1">
                  <Gamepad2 className="w-3 h-3 text-red-500" />
                  <span className="max-w-[70px] truncate">{currentUser.gamingId}</span>
                </span>
              ) : null}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-wider text-red-400">
                  Superlicença Virtual ApexSim
                </span>
                <span>·</span>
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <CountryFlag country={currentUser.country} size="xs" />
                  <span>{currentUser.country}</span>
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
                {currentUser.name}
              </h1>

              {currentUser.teamName ? (
                <div className="flex items-center gap-2 pt-0.5 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5 font-semibold text-white">
                    <Shield className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span>Time: {currentUser.teamName}</span>
                  </div>
                  {currentUser.teamTag && (
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-[10px] font-bold text-amber-400 border border-slate-700 shadow-sm">
                      {currentUser.teamTag}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 pt-0.5 text-xs text-slate-500">
                  <Shield className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span className="italic">Sem time cadastrado (Piloto Independente)</span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-semibold bg-red-950 text-red-300 border border-red-800/80 px-2 py-0.5 rounded-full">
                  {currentUser.role === 'admin' ? 'Administrador de Liga' : 'Piloto Participante'}
                </span>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 shadow-sm ${simRatingTier.badgeBg} ${simRatingTier.badgeBorder} ${simRatingTier.textColor}`}
                  title={`Categoria Oficial sincronizada com o Ranking Sim Rating (${stats.simRating} pts)`}
                >
                  <span>{simRatingTier.badgeIcon}</span>
                  <span>Categoria {simRatingTier.name}</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  SR: <strong className="text-emerald-400">{stats.safetyRating}</strong>
                </span>
                {currentUser.gamingId && (
                  <span className="text-[11px] font-semibold bg-slate-900 text-slate-200 border border-slate-700 px-2 py-0.5 rounded-full flex items-center gap-1.5 font-mono">
                    <Gamepad2 className="w-3 h-3 text-red-400" />
                    <span className="text-slate-400">{currentUser.gamingPlatform || 'ID'}:</span>
                    <strong className="text-white">{currentUser.gamingId}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons: Card Generator, H2H, Edit Profile */}
          <div className="flex items-center gap-2 flex-wrap self-start md:self-center">
            {onOpenCardModal && (
              <button
                type="button"
                onClick={() => onOpenCardModal(currentUser)}
                className="flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
                title="Gerar e baixar Card Oficial do Piloto"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Gerar Card Oficial</span>
              </button>
            )}

            {onOpenH2HModal && (
              <button
                type="button"
                onClick={() => onOpenH2HModal(currentUser)}
                className="flex items-center gap-1.5 bg-amber-950/50 hover:bg-amber-900/60 text-amber-300 border border-amber-800/60 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                title="Comparar rivalidade direta com outro piloto"
              >
                <Swords className="w-3.5 h-3.5 text-amber-400" />
                <span>Duelo H2H</span>
              </button>
            )}

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Cancelar' : 'Editar Dados'}</span>
            </button>
          </div>
        </div>

        {/* Edit Form Drawer */}
        {isEditing && (
          <form onSubmit={handleSaveProfile} className="relative z-10 mt-6 pt-6 border-t border-slate-800/80 space-y-4">
            {/* Avatar Uploader Section */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <AvatarUploader
                currentAvatar={avatar}
                onAvatarChange={setAvatar}
                label="Foto de Perfil / Avatar do Piloto"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Nome de Piloto</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Plataforma de Jogo</label>
                <select
                  value={gamingPlatform}
                  onChange={(e) => setGamingPlatform(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
                >
                  <option value="Steam (PC)">🖥️ Steam (PC)</option>
                  <option value="PlayStation Network (PSN)">🎮 PlayStation (PSN)</option>
                  <option value="Xbox Live / Gamertag">🎮 Xbox (Gamertag)</option>
                  <option value="EA App / Origin">🏎️ EA App / EA ID</option>
                  <option value="Epic Games">⚡ Epic Games</option>
                  <option value="Outra Plataforma">🕹️ Outra Plataforma</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">ID na Plataforma</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Ex: Ayrton_BR"
                    value={gamingId}
                    onChange={(e) => setGamingId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-7 pr-2 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                  <Gamepad2 className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">País / Nacionalidade</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            {/* Warning notice: Exact match required */}
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/80 text-amber-200 text-[11px] leading-relaxed flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-300 block mb-0.5">Aviso importante sobre o seu ID:</strong>
                <span>
                  O ID deve ser <strong>exatamente como consta na plataforma a qual você usa para jogar</strong> (respeitando maiúsculas, minúsculas, números e caracteres especiais) para permitir convites nos lobbies e conferência nas corridas.
                </span>
              </div>
            </div>

            {/* Pilot Custom Team Section */}
            <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-red-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Equipe / Time de Esports do Piloto
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  (Aparece no perfil, no ranking Sim Rating e nos seus Cards)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-400 block mb-1">
                    Nome do Time
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Scuderia Apex Racing / Redline SimSports"
                    maxLength={40}
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">
                    Sigla do Time (Tag)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: APX / RED"
                    maxLength={5}
                    value={teamTag}
                    onChange={(e) => setTeamTag(e.target.value.toUpperCase())}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono font-bold tracking-wider placeholder-slate-500 focus:outline-none focus:border-amber-500 uppercase"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">Discord Tag</label>
              <input
                type="text"
                placeholder="Ex: Ayrton#1234"
                value={discordTag}
                onChange={(e) => setDiscordTag(e.target.value)}
                className="w-full sm:max-w-xs bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/60">
              <button
                type="button"
                onClick={() => {
                  setAvatar(currentUser.avatar);
                  setName(currentUser.name);
                  setIsEditing(false);
                }}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs px-4 py-2 rounded-lg cursor-pointer shadow-md shadow-red-950"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Informações</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Real-time Performance Statistics Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-red-500" />
            Estatísticas de Carreira em Tempo Real
          </h2>
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="text-[11px] text-slate-400 hover:text-red-400 hover:bg-red-950/30 px-2.5 py-1 rounded-lg border border-slate-800 transition-colors cursor-pointer"
          >
            Resetar Estatísticas
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <span className="text-xs text-slate-400">Total de Corridas</span>
            <div className="text-2xl sm:text-3xl font-bold font-mono-numbers text-white mt-1">
              {stats.races}
            </div>
            <span className="text-[11px] text-slate-500 font-sans mt-0.5 block">Participações oficiais</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <span className="text-xs text-amber-400 flex items-center gap-1">
              <Award className="w-3.5 h-3.5" />
              Vitórias (P1)
            </span>
            <div className="text-2xl sm:text-3xl font-bold font-mono-numbers text-amber-400 mt-1">
              {stats.wins}
            </div>
            <span className="text-[11px] text-slate-400 font-mono-numbers mt-0.5 block">
              {winRate}% taxa de vitória
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <span className="text-xs text-slate-300 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-slate-400" />
              Pódios (P1 a P3)
            </span>
            <div className="text-2xl sm:text-3xl font-bold font-mono-numbers text-white mt-1">
              {stats.podiums}
            </div>
            <span className="text-[11px] text-slate-400 font-mono-numbers mt-0.5 block">
              {podiumRate}% presença no pódio
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <span className="text-xs text-red-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" />
              Pontos Carreira
            </span>
            <div className="text-2xl sm:text-3xl font-bold font-mono-numbers text-white mt-1">
              {stats.points}
            </div>
            <span className="text-[11px] text-slate-400 font-mono-numbers mt-0.5 block">
              Média {(stats.races > 0 ? stats.points / stats.races : 0).toFixed(1)} pts/corrida
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <span className="text-xs text-slate-400">Pole Positions</span>
            <div className="text-xl sm:text-2xl font-bold font-mono-numbers text-white mt-1">
              {stats.poles}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <span className="text-xs text-slate-400">Voltas Rápidas</span>
            <div className="text-xl sm:text-2xl font-bold font-mono-numbers text-white mt-1">
              {stats.fastestLaps}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <span className="text-xs text-slate-400">Sim Rating Oficial</span>
            <div className="text-xl sm:text-2xl font-bold font-mono-numbers text-red-400 mt-1 flex items-center justify-between">
              <span>{stats.simRating}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getSimRatingTier(stats.simRating).badgeBg} ${getSimRatingTier(stats.simRating).badgeBorder} ${getSimRatingTier(stats.simRating).textColor}`}>
                {getSimRatingTier(stats.simRating).badgeIcon} {getSimRatingTier(stats.simRating).name}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <span className="text-xs text-slate-400">Abandonos (DNF)</span>
            <div className="text-xl sm:text-2xl font-bold font-mono-numbers text-slate-300 mt-1">
              {stats.dnfs}
            </div>
          </div>
        </div>
      </div>

      {/* Community Trophies Showcase */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Troféus da Comunidade & Destaques de Pista</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            {communityTrophies.totalCommunityTrophies} honrarias conquistadas
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-950/30 to-slate-900 border border-amber-800/40 shadow-sm">
            <span className="text-xs text-amber-400 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" />
              Piloto do Dia (DotD)
            </span>
            <div className="text-2xl sm:text-3xl font-bold font-mono-numbers text-white mt-1">
              {communityTrophies.dotdCount}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Votação da Comunidade</span>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/30 to-slate-900 border border-emerald-800/40 shadow-sm">
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Maior Escalada
            </span>
            <div className="text-2xl sm:text-3xl font-bold font-mono-numbers text-white mt-1">
              {communityTrophies.overtakesCount}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Rei das Ultrapassagens</span>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-950/30 to-slate-900 border border-blue-800/40 shadow-sm">
            <span className="text-xs text-blue-400 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" />
              Muralha Limpa
            </span>
            <div className="text-2xl sm:text-3xl font-bold font-mono-numbers text-white mt-1">
              {communityTrophies.cleanCount}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Fair Play na Pista</span>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-purple-950/30 to-slate-900 border border-purple-800/40 shadow-sm">
            <span className="text-xs text-purple-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" />
              Voltas Mais Rápidas
            </span>
            <div className="text-2xl sm:text-3xl font-bold font-mono-numbers text-white mt-1">
              {communityTrophies.fastestLapCount}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Ponto Extra Oficial</span>
          </div>
        </div>
      </div>

      {/* Championships Driver Administers */}
      {administeredChampionships.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-red-400 flex items-center gap-2">
            <Shield className="w-4 h-4 text-red-400" />
            Ligas que você Administra ({administeredChampionships.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {administeredChampionships.map((champ) => {
              const approvedCount = champ.registrations.filter((r) => r.status === 'APROVADO').length;
              const pendingCount = champ.registrations.filter((r) => r.status === 'PENDENTE').length;

              return (
                <div
                  key={champ.id}
                  className="p-5 rounded-xl bg-gradient-to-br from-slate-900/90 to-red-950/20 border border-red-900/40 flex flex-col justify-between hover:border-red-600/60 transition-colors shadow-lg"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span className="font-semibold text-slate-300">{champ.simulator}</span>
                      <span className="bg-red-950/80 text-red-400 border border-red-800/60 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                        Administrador
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white font-display">{champ.name}</h3>
                    <div className="text-xs text-slate-400 mt-1">
                      {approvedCount} pilotos confirmados {pendingCount > 0 ? `· (${pendingCount} pendentes)` : ''} · {champ.stages.length} etapas
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Categoria: <strong className="text-slate-200">{champ.category}</strong></span>

                    <button
                      onClick={() => setActiveChampionshipId(champ.id)}
                      className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
                    >
                      Acessar Liga
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Championships Driver Is Competing In */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Campeonatos em que você está Inscrito ({enrolledChampionships.length} / {MAX_CHAMPIONSHIPS_PER_PILOT} Máximo)</span>
          </h2>
          <span className="text-[11px] text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg w-fit">
            {MAX_CHAMPIONSHIPS_PER_PILOT - enrolledChampionships.length > 0
              ? `${MAX_CHAMPIONSHIPS_PER_PILOT - enrolledChampionships.length} vaga(s) restante(s) para novas ligas`
              : 'Limite de 5 campeonatos atingido'}
          </span>
        </div>

        {enrolledChampionships.length === 0 ? (
          <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-400">
            Você ainda não solicitou inscrição em nenhum campeonato. Acesse a aba <strong>"Pilotos & Inscrições"</strong> ou <strong>"Ligas"</strong> para solicitar sua inscrição!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {enrolledChampionships.map((champ) => {
              const reg = champ.registrations.find(
                (r) =>
                  r.userId === currentUser.id ||
                  (r.userEmail && r.userEmail.toLowerCase().trim() === currentUser.email.toLowerCase().trim())
              );
              const standings = calculateDriverStandings(champ);
              const myPos = standings.find(
                (s) =>
                  s.driverId === currentUser.id ||
                  s.driverName.toLowerCase().trim() === currentUser.name.toLowerCase().trim()
              );

              const isApproved = reg?.status === 'APROVADO';

              return (
                <div
                  key={champ.id}
                  className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>{champ.simulator}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${
                          isApproved
                            ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60'
                            : 'bg-amber-950/80 text-amber-400 border-amber-800/60'
                        }`}
                      >
                        {isApproved ? 'Homologado (Aprovado)' : 'Aguardando Homologação'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white">{champ.name}</h3>
                    {reg && (
                      <div className="text-xs text-slate-400 mt-1">
                        Equipe: <strong className="text-slate-200">{reg.teamName}</strong> · Carro #{reg.carNumber} ({reg.carModel})
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-400">Classificação</div>
                      <div className="text-base font-bold font-mono-numbers text-amber-400">
                        {myPos ? `P${myPos.rank} · ${myPos.totalPoints} pts` : isApproved ? 'Sem pontuação' : 'Inscrição Pendente'}
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveChampionshipId(champ.id)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                    >
                      Acessar Liga
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reset Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-[#0d131f] border border-red-900/60 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Resetar Estatísticas do Piloto?
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Deseja zerar todas as estatísticas de corridas, vitórias, pódios, poles e pontos para 0? Esta ação refletirá a realidade inicial de quem ainda não disputou campeonatos.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  resetPilotStats(currentUser.id);
                  setIsResetConfirmOpen(false);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold cursor-pointer shadow-md shadow-red-950"
              >
                Sim, Resetar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
