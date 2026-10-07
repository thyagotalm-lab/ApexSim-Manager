import React, { useState } from 'react';
import { Shield, Users, Award, Calendar, Plus, UserPlus, FileText, CheckCircle2, AlertTriangle, Trash2, X, Sliders, Settings, Scale, Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChampionships } from '../context/ChampionshipContext';
import { StageRound } from '../types';
import { EditChampionshipModal } from './EditChampionshipModal';
import { StewardsProtestsModal } from './StewardsProtestsModal';

interface AdminPanelProps {
  onOpenAdminsModal: () => void;
  onOpenCreateModal: () => void;
  onOpenStageEditor: (stage?: StageRound) => void;
  onOpenResultsModal: (stage: StageRound) => void;
  onNavigateToTab: (tab: any) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  onOpenAdminsModal,
  onOpenCreateModal,
  onOpenStageEditor,
  onOpenResultsModal,
  onNavigateToTab,
}) => {
  const { currentUser, users } = useAuth();
  const { activeChampionship, deleteChampionship, isUserLeagueAdmin } = useChampionships();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStewardsModalOpen, setIsStewardsModalOpen] = useState(false);

  if (!activeChampionship) {
    return <div className="p-8 text-center text-slate-400">Nenhum campeonato selecionado.</div>;
  }

  const isAdmin = isUserLeagueAdmin(activeChampionship.id, currentUser?.id);

  if (!isAdmin) {
    return (
      <div className="p-8 bg-red-950/20 border border-red-900/40 rounded-2xl text-center">
        <Shield className="w-10 h-10 text-red-500 mx-auto mb-2" />
        <h3 className="text-lg font-bold text-white">Acesso Restrito a Administradores da Liga</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Você está cadastrado como Piloto ou não possui permissões administrativas para esta liga específica. Solicite permissão a um dos administradores.
        </p>
      </div>
    );
  }

  const pendingPilots = activeChampionship.registrations.filter((r) => r.status === 'PENDENTE');
  const approvedPilots = activeChampionship.registrations.filter((r) => r.status === 'APROVADO');
  const adminUsers = users.filter((u) => activeChampionship.adminIds.includes(u.id));
  const pendingProtests = (activeChampionship.protests || []).filter((p) => p.status === 'PENDENTE');

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-900 p-5 rounded-2xl border border-red-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-red-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-red-400" />
            Torre de Controle do Administrador de Liga
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-display mt-0.5">
            Gestão: {activeChampionship.name}
          </h2>
          <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2">
            <span>{adminUsers.length} Administradores com permissão</span>
            <span>·</span>
            <span>{approvedPilots.length} Pilotos confirmados</span>
            <span>·</span>
            <span>{activeChampionship.stages.length} Etapas no calendário</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsStewardsModalOpen(true)}
            className="flex items-center gap-1.5 bg-amber-950/90 hover:bg-amber-900 text-amber-300 border border-amber-800/80 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Comissários FIA</span>
            {pendingProtests.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">
                {pendingProtests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-md shadow-red-950 transition-all cursor-pointer whitespace-nowrap"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Editar Configurações</span>
          </button>

          <button
            onClick={onOpenAdminsModal}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Admins</span>
          </button>
        </div>
      </div>

      {/* Master Admin Notice Banner (thyago.talm@gmail.com only) */}
      {currentUser?.email?.toLowerCase().trim() === 'thyago.talm@gmail.com' && (
        <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/40 p-4 rounded-xl border border-amber-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-amber-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <span>Torre de Comando Master Ativa</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300">thyago.talm@gmail.com</span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Você possui privilégios de Admin Master: visualize todas as contas criadas e gerencie a purga total de bancos de dados.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateToTab('master-admin')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 shrink-0"
          >
            <Crown className="w-4 h-4 text-slate-950" />
            <span>Abrir Painel Master de Contas</span>
          </button>
        </div>
      )}

      {/* Admin Quick Action Hub Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Card 1: Configurações do Campeonato */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Parâmetros</span>
              <Sliders className="w-4 h-4 text-red-400" />
            </div>
            <h3 className="text-base font-bold text-white">Configurações da Liga</h3>
            <p className="text-xs text-slate-400 mt-1">
              Edite nome, simulador, status das inscrições, pontuação FIA e limite de vagas.
            </p>
          </div>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="mt-4 w-full py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Editar Parâmetros</span>
          </button>
        </div>

        {/* Card 2: Comissários & Protestos (Stewards) */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Tribunal FIA</span>
              <Scale className="w-4 h-4 text-amber-400" />
            </div>
            <h3 className="text-base font-bold text-white">Comissários & Protestos</h3>
            <p className="text-xs text-slate-400 mt-1">
              Julgue incidentes com prints e vídeos. Aplique penalidades de tempo, pontos e deduza Sim Rating.
            </p>
            {pendingProtests.length > 0 ? (
              <div className="mt-2 text-xs font-semibold text-amber-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                {pendingProtests.length} denúncia(s) pendente(s)
              </div>
            ) : (
              <div className="mt-2 text-xs text-slate-500">
                {(activeChampionship.protests || []).length} protesto(s) registrado(s)
              </div>
            )}
          </div>
          <button
            onClick={() => setIsStewardsModalOpen(true)}
            className="mt-4 w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Julgar Protestos</span>
          </button>
        </div>

        {/* Card 2: Pilotos & Inscrições */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Homologação</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="text-base font-bold text-white">Inscrições & Grid</h3>
            <p className="text-xs text-slate-400 mt-1">
              Apenas administradores podem homologar pilotos participantes no grid oficial.
            </p>
            {pendingPilots.length > 0 && (
              <div className="mt-2 text-xs font-semibold text-amber-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                {pendingPilots.length} piloto(s) aguardando aprovação
              </div>
            )}
          </div>
          <button
            onClick={() => onNavigateToTab('pilots')}
            className="mt-4 w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
          >
            Gerenciar Grid de Pilotos
          </button>
        </div>

        {/* Card 3: Lançar Resultados */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Direção de Prova</span>
              <Award className="w-4 h-4 text-amber-400" />
            </div>
            <h3 className="text-base font-bold text-white">Resultados das Corridas</h3>
            <p className="text-xs text-slate-400 mt-1">
              Lance a ordem de chegada, pole position, voltas mais rápidas e punições com cálculo automático.
            </p>
          </div>
          <button
            onClick={() => onNavigateToTab('calendar')}
            className="mt-4 w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
          >
            Lançar Resultados
          </button>
        </div>

        {/* Card 4: Calendário */}
        <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Temporada</span>
              <Calendar className="w-4 h-4 text-blue-400" />
            </div>
            <h3 className="text-base font-bold text-white">Etapas & Pistas</h3>
            <p className="text-xs text-slate-400 mt-1">
              Configure circuitos, datas, horários de largada, clima simulado e formatos de corrida.
            </p>
          </div>
          <button
            onClick={() => onOpenStageEditor()}
            className="mt-4 w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
          >
            Adicionar Nova Etapa
          </button>
        </div>
      </div>

      {/* League Admins Overview List */}
      <div className="bg-slate-900/50 p-5 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Shield className="w-4 h-4 text-red-500" />
            Administradores Autorizados Desta Liga
          </h3>
          <button
            onClick={onOpenAdminsModal}
            className="text-xs text-red-400 hover:text-red-300 font-medium cursor-pointer"
          >
            + Conceder Acesso a Outro Usuário
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {adminUsers.map((admin) => (
            <div key={admin.id} className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 flex items-center gap-3">
              <img src={admin.avatar} alt="" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover border border-red-500/60" />
              <div className="truncate">
                <div className="text-xs font-bold text-white truncate">{admin.name}</div>
                <div className="text-[10px] text-slate-400 truncate">{admin.email}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="p-4 rounded-xl border border-red-950 bg-red-950/10 flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-red-400">Excluir Campeonato</h4>
          <p className="text-[11px] text-slate-400">Esta ação remove todas as etapas e inscrições desta liga.</p>
        </div>
        <button
          onClick={() => setIsDeleteModalOpen(true)}
          className="px-3 py-1.5 rounded-lg bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 text-xs font-medium cursor-pointer transition-colors"
        >
          Excluir Liga
        </button>
      </div>

      {/* Confirmation Modal for Championship Deletion */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#0d131f] border border-red-900/60 rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-white font-display mb-1 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Excluir Campeonato Inteiro?
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Tem certeza que deseja remover <strong>"{activeChampionship.name}"</strong>? Todas as etapas, classificações e inscrições desta liga serão permanentemente apagadas.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const idToDelete = activeChampionship.id;
                  setIsDeleteModalOpen(false);
                  deleteChampionship(idToDelete);
                  onNavigateToTab('championships');
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold cursor-pointer"
              >
                Sim, Excluir Liga
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Championship Settings Modal */}
      {isEditModalOpen && (
        <EditChampionshipModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          championship={activeChampionship}
        />
      )}

      {/* Stewards Protests & Judicial Tribunal Modal */}
      {isStewardsModalOpen && (
        <StewardsProtestsModal
          isOpen={isStewardsModalOpen}
          onClose={() => setIsStewardsModalOpen(false)}
        />
      )}
    </div>
  );
};
