import React, { useState } from 'react';
import { X, Shield, User as UserIcon, Mail, Lock, Flag, Gamepad2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { AvatarUploader, MOTORSPORT_PRESET_AVATARS } from './AvatarUploader';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, loginWithEmail, registerUser } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<UserRole>('pilot');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(MOTORSPORT_PRESET_AVATARS[0].url);
  const [gamingPlatform, setGamingPlatform] = useState('Steam (PC)');
  const [gamingId, setGamingId] = useState('');
  const [country, setCountry] = useState('Brasil 🇧🇷');
  const [discordTag, setDiscordTag] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isAuthModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (mode === 'login') {
      if (!email.trim()) {
        setErrorMsg('Informe seu e-mail cadastrado.');
        return;
      }
      if (!password) {
        setErrorMsg('Informe sua senha.');
        return;
      }
      const success = loginWithEmail(email.trim(), password);
      if (!success) {
        setErrorMsg('E-mail ou senha incorretos. Verifique suas credenciais.');
      }
    } else {
      if (!name.trim() || !email.trim()) {
        setErrorMsg('Preencha os campos obrigatórios.');
        return;
      }
      if (!password || password.length < 4) {
        setErrorMsg('Crie uma senha de acesso com no mínimo 4 caracteres.');
        return;
      }
      if (role === 'pilot' && !gamingId.trim()) {
        setErrorMsg('Por favor, informe seu ID da plataforma exatamente como consta no seu jogo/console.');
        return;
      }
      registerUser({
        name: name.trim(),
        email: email.trim(),
        password,
        role: 'pilot',
        country,
        gamingPlatform,
        gamingId: gamingId.trim(),
        steamId: gamingId.trim(),
        discordTag,
        avatar,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="relative p-5 pb-4 border-b border-slate-800 bg-slate-900/80 shrink-0">
          <button
            onClick={closeAuthModal}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-xs uppercase tracking-wider font-semibold text-red-400">ApexSim Manager</span>
          </div>
          <h2 className="text-xl font-bold text-white font-display">
            {mode === 'login' ? 'Acessar sua Conta' : 'Criar Nova Conta de Piloto'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'login'
              ? 'Entre com suas credenciais registradas para acessar seu painel e competições.'
              : 'Cadastre seu perfil de piloto para se inscrever e disputar os campeonatos.'}
          </p>
        </div>

        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 text-xs bg-red-950/80 border border-red-800 text-red-200 rounded-lg">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Mode: Login vs Register Tabs */}
            <div className="grid grid-cols-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg('');
                }}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  mode === 'login' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMsg('');
                }}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  mode === 'register' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Criar Conta
              </button>
            </div>

            {mode === 'register' && (
              <>
                {/* Fixed Pilot Role Indicator */}
                <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-950/60 border border-red-800/80 text-red-400 shrink-0">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Perfil: Piloto Competidor</span>
                      <span className="text-[9px] bg-red-950 text-red-400 border border-red-800/60 px-1 rounded">Grid Oficial</span>
                    </div>
                    <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                      Inscreva-se em campeonatos, gerencie telemetria e protocole protestos pós-corrida.
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Nome e Sobrenome reais</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Ayrton Silva"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>

                {/* Avatar / Profile Photo Selector */}
                <AvatarUploader
                  currentAvatar={avatar}
                  onAvatarChange={setAvatar}
                  label="Foto de Perfil do Piloto"
                />
              </>
            )}

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">E-mail</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="seu.email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
                <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Senha</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
                <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {mode === 'register' && role === 'pilot' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      Plataforma de Jogo
                    </label>
                    <select
                      value={gamingPlatform}
                      onChange={(e) => setGamingPlatform(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500 cursor-pointer"
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
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      ID na Plataforma de Jogo
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="Ex: Ayrton_BR / Senna94"
                        value={gamingId}
                        onChange={(e) => setGamingId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-2 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                      />
                      <Gamepad2 className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                </div>

                {/* Exact match warning */}
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/80 text-amber-200 text-[11px] leading-relaxed flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-amber-300 block mb-0.5">Aviso importante sobre o seu ID:</strong>
                    <span>
                      O ID deve ser <strong>exatamente como consta na plataforma a qual você usa para jogar</strong> (respeitando maiúsculas, minúsculas, números e caracteres especiais) para permitir convites nos lobbies e conferência nas corridas.
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">País / Nacionalidade</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-2 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                    />
                    <Flag className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-red-950 cursor-pointer"
            >
              {mode === 'login' ? 'Entrar no ApexSim' : 'Concluir Cadastro'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
