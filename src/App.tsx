/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ChampionshipProvider, useChampionships } from './context/ChampionshipContext';
import { NotificationProvider } from './context/NotificationContext';
import { HeaderBanner } from './components/HeaderBanner';
import { TopBar } from './components/TopBar';
import { FooterNavigation, NavTab } from './components/FooterNavigation';
import { ChampionshipOverview } from './components/ChampionshipOverview';
import { DriverStandingsTable } from './components/DriverStandingsTable';
import { ConstructorStandingsTable } from './components/ConstructorStandingsTable';
import { CalendarStages } from './components/CalendarStages';
import { PilotsManagement } from './components/PilotsManagement';
import { ChampionshipsList } from './components/ChampionshipsList';
import { SimRatingRankingView } from './components/SimRatingRankingView';
import { DriverProfileView } from './components/DriverProfileView';
import { AdminPanel } from './components/AdminPanel';
import { MasterAdminPanel } from './components/MasterAdminPanel';
import { AuthModal } from './components/AuthModal';
import { RaceResultsModal } from './components/RaceResultsModal';
import { LeagueAdminsModal } from './components/LeagueAdminsModal';
import { CreateChampionshipModal } from './components/CreateChampionshipModal';
import { StageEditorModal } from './components/StageEditorModal';
import { DriverCardModal } from './components/DriverCardModal';
import { HeadToHeadModal } from './components/HeadToHeadModal';
import { StageRound, User } from './types';

const MainAppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');

  // Modals state
  const [isAdminsModalOpen, setIsAdminsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [resultsModalConfig, setResultsModalConfig] = useState<{ stage: StageRound; raceType?: 'main' | 'sprint' } | null>(null);
  const selectedStageForResults = resultsModalConfig?.stage || null;
  const [selectedStageForEdit, setSelectedStageForEdit] = useState<StageRound | null>(null);
  const [isStageEditorOpen, setIsStageEditorOpen] = useState(false);

  // New Modals: Driver Card Generator & H2H Rivalry Comparator
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [selectedDriverForCard, setSelectedDriverForCard] = useState<User | null>(null);
  const [isH2HModalOpen, setIsH2HModalOpen] = useState(false);
  const [driverAForH2H, setDriverAForH2H] = useState<User | null>(null);
  const [driverBForH2H, setDriverBForH2H] = useState<User | null>(null);

  const { setActiveChampionshipId } = useChampionships();

  const handleOpenCardModal = (driver?: User) => {
    setSelectedDriverForCard(driver || null);
    setIsCardModalOpen(true);
  };

  const handleOpenH2HModal = (driverA?: User, driverB?: User) => {
    setDriverAForH2H(driverA || null);
    setDriverBForH2H(driverB || null);
    setIsH2HModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col relative pb-20 sm:pb-24">
      {/* Centered Top Banner inspired by liga.stopandgobr.com */}
      <HeaderBanner
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onOpenAdminsModal={() => setIsAdminsModalOpen(true)}
      />

      {/* Top Controls Bar (Championship Selector, Profile, Login, Bell) */}
      <TopBar
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onNavigateToProfile={() => setActiveTab('driver-profile')}
        onNavigateToRanking={() => setActiveTab('sim-rating')}
        onNavigateToTab={(tab) => setActiveTab(tab as NavTab)}
      />

      {/* Main Viewport Content with bottom padding so it never hides behind the footer menu */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-3 sm:px-4 py-5 sm:py-8 overflow-x-hidden">
        {activeTab === 'overview' && (
          <ChampionshipOverview
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onOpenResultsModal={(stage) => setResultsModalConfig({ stage, raceType: 'main' })}
          />
        )}
        {activeTab === 'standings-drivers' && (
          <DriverStandingsTable
            onOpenCardModal={handleOpenCardModal}
            onOpenH2HModal={handleOpenH2HModal}
          />
        )}
        {activeTab === 'standings-teams' && <ConstructorStandingsTable />}
        {activeTab === 'calendar' && (
          <CalendarStages
            onOpenResultsModal={(stage, raceType) => setResultsModalConfig({ stage, raceType: raceType || 'main' })}
            onOpenStageEditor={(stage) => {
              setSelectedStageForEdit(stage || null);
              setIsStageEditorOpen(true);
            }}
          />
        )}
        {activeTab === 'pilots' && (
          <PilotsManagement
            onOpenCardModal={handleOpenCardModal}
            onOpenH2HModal={handleOpenH2HModal}
          />
        )}
        {activeTab === 'championships' && (
          <ChampionshipsList
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            onSelectChampionship={(id) => {
              setActiveChampionshipId(id);
              setActiveTab('overview');
            }}
          />
        )}
        {activeTab === 'sim-rating' && (
          <SimRatingRankingView
            onNavigateToProfile={() => setActiveTab('driver-profile')}
            onOpenCardModal={handleOpenCardModal}
            onOpenH2HModal={handleOpenH2HModal}
          />
        )}
        {activeTab === 'driver-profile' && (
          <DriverProfileView
            onOpenCardModal={handleOpenCardModal}
            onOpenH2HModal={handleOpenH2HModal}
          />
        )}
        {activeTab === 'admin-panel' && (
          <AdminPanel
            onOpenAdminsModal={() => setIsAdminsModalOpen(true)}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            onOpenStageEditor={(stage) => {
              setSelectedStageForEdit(stage || null);
              setIsStageEditorOpen(true);
            }}
            onOpenResultsModal={(stage) => setResultsModalConfig({ stage, raceType: 'main' })}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}
        {activeTab === 'master-admin' && (
          <MasterAdminPanel onNavigateToTab={(tab) => setActiveTab(tab)} />
        )}
      </main>

      {/* Modals */}
      <AuthModal />

      {resultsModalConfig && (
        <RaceResultsModal
          stage={resultsModalConfig.stage}
          initialRaceType={resultsModalConfig.raceType || 'main'}
          onClose={() => setResultsModalConfig(null)}
        />
      )}

      {isAdminsModalOpen && (
        <LeagueAdminsModal onClose={() => setIsAdminsModalOpen(false)} />
      )}

      {isCreateModalOpen && (
        <CreateChampionshipModal onClose={() => setIsCreateModalOpen(false)} />
      )}

      {isStageEditorOpen && (
        <StageEditorModal
          stage={selectedStageForEdit}
          onClose={() => {
            setIsStageEditorOpen(false);
            setSelectedStageForEdit(null);
          }}
        />
      )}

      {/* Driver Card Generator Modal */}
      {isCardModalOpen && (
        <DriverCardModal
          initialDriver={selectedDriverForCard}
          onClose={() => {
            setIsCardModalOpen(false);
            setSelectedDriverForCard(null);
          }}
        />
      )}

      {/* Head to Head Rivalry Modal */}
      {isH2HModalOpen && (
        <HeadToHeadModal
          initialDriverA={driverAForH2H}
          initialDriverB={driverBForH2H}
          onClose={() => {
            setIsH2HModalOpen(false);
            setDriverAForH2H(null);
            setDriverBForH2H(null);
          }}
        />
      )}

      {/* Clean Motorsport Footer Content */}
      <footer className="w-full border-t border-slate-900 bg-[#06080e] py-5 px-4 text-center text-xs text-slate-500 mb-6 sm:mb-8">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300 font-display uppercase tracking-wider">ApexSim Manager</span>
            <span>·</span>
            <span>Gestão Profissional de Campeonatos de Automobilismo Virtual</span>
          </div>
          <div className="text-slate-500 text-[11px]">
            © 2026 ApexSim. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      {/* Bottom Menu Navigation Bar in the Footer - Zero Scrollbar, perfectly fitted */}
      <FooterNavigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <ChampionshipProvider>
          <MainAppContent />
        </ChampionshipProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
