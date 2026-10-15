import React, { useState } from 'react';
import {
  X,
  Award,
  Zap,
  Check,
  ArrowUp,
  ArrowDown,
  Trophy,
  ListOrdered,
  Shuffle,
  ArrowRight,
  ArrowLeft,
  Copy,
  Flag,
  Sparkles,
  ChevronRight,
  UserX,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChampionships } from '../context/ChampionshipContext';
import { useNotifications } from '../context/NotificationContext';
import { CountryFlag } from './CountryFlag';
import { RaceResultItem, StageRound } from '../types';
import { DriverOfTheDayVoting } from './DriverOfTheDayVoting';

interface RaceResultsModalProps {
  stage: StageRound | null;
  initialRaceType?: 'main' | 'sprint';
  initialTab?: 'results' | 'dotd';
  onClose: () => void;
}

export const RaceResultsModal: React.FC<RaceResultsModalProps> = ({
  stage: propStage,
  initialRaceType = 'main',
  initialTab = 'results',
  onClose,
}) => {
  const { currentUser, users } = useAuth();
  const { activeChampionship, recordRaceResults, recordSprintResults, isUserLeagueAdmin } =
    useChampionships();
  const { sendNotification } = useNotifications();

  // Dynamically resolve current stage from activeChampionship to ensure real-time reactivity
  const stage =
    activeChampionship?.stages.find((s) => s.id === propStage?.id) || propStage;

  if (!stage || !activeChampionship) return null;

  const isAdmin = isUserLeagueAdmin(activeChampionship.id, currentUser?.id);

  // Active race mode: 'main' (Corrida Principal) or 'sprint' (Corrida Sprint)
  const [raceType, setRaceType] = useState<'main' | 'sprint'>(
    initialRaceType || (stage.hasSprint && !stage.results?.length && stage.sprintResults?.length ? 'sprint' : 'main')
  );

  // Modal active primary tab: 'results' | 'dotd'
  const [modalTab, setModalTab] = useState<'results' | 'dotd'>(initialTab);

  // Active step inside results: 'grid' (Grid de Largada) or 'finish' (Grid de Chegada)
  const [gridStep, setGridStep] = useState<'grid' | 'finish'>('grid');

  // Helper to build initial results array
  const createInitialList = (type: 'main' | 'sprint'): RaceResultItem[] => {
    const existing = type === 'sprint' ? stage.sprintResults : stage.results;
    if (existing && existing.length > 0) {
      return existing.map((r, idx) => {
        const u = users.find(
          (user) =>
            user.id === r.driverId ||
            (r.driverName && user.name.toLowerCase().trim() === r.driverName.toLowerCase().trim())
        );
        return {
          ...r,
          gridPosition: r.gridPosition || idx + 1,
          finishPosition: r.finishPosition || idx + 1,
          driverName: u?.name || r.driverName,
        };
      });
    }

    const gridDrivers = activeChampionship.registrations.filter(
      (r) => r.status === 'APROVADO' || r.status === 'RESERVA'
    );
    const isSprint = type === 'sprint';
    return gridDrivers.map((driver, index) => {
      const u = users.find(
        (user) =>
          user.id === driver.userId ||
          (driver.userEmail && user.email.toLowerCase().trim() === driver.userEmail.toLowerCase().trim())
      );
      const isReserve =
        driver.status === 'RESERVA' ||
        Boolean(driver.isReserve) ||
        driver.teamName?.toLowerCase() === 'reserva';
      return {
        driverId: driver.userId,
        driverName: u?.name || driver.userName,
        teamName: isReserve ? 'Reserva' : driver.teamName,
        carModel: driver.carModel,
        number: driver.carNumber,
        gridPosition: index + 1,
        finishPosition: index + 1,
        status: 'FINISHED' as const,
        totalTime: index === 0 ? (isSprint ? '22:00.000' : '45:00.000') : '',
        gap: index === 0 ? 'Líder' : `+${(index * (isSprint ? 2.1 : 4.2)).toFixed(3)}s`,
        pointsAwarded: 0,
        penaltiesPoints: 0,
        penaltyNotes: '',
        hasFastestLap: false,
        hasPole: false,
        isReserve,
      };
    });
  };

  const [mainResultsList, setMainResultsList] = useState<RaceResultItem[]>(() =>
    createInitialList('main')
  );
  const [sprintResultsList, setSprintResultsList] = useState<RaceResultItem[]>(() =>
    createInitialList('sprint')
  );

  const resultsList = raceType === 'sprint' ? sprintResultsList : mainResultsList;
  const setResultsList = (updated: RaceResultItem[]) => {
    if (raceType === 'sprint') {
      setSprintResultsList(updated);
    } else {
      setMainResultsList(updated);
    }
  };

  // Main Race Pole & Fastest Lap
  const [poleDriverId, setPoleDriverId] = useState<string>(
    stage.poleDriverId || mainResultsList[0]?.driverId || ''
  );
  const [poleTime, setPoleTime] = useState<string>(stage.poleTime || '1:29.840');
  const [fastestLapDriverId, setFastestLapDriverId] = useState<string>(
    stage.fastestLapDriverId || mainResultsList[0]?.driverId || ''
  );
  const [fastestLapTime, setFastestLapTime] = useState<string>(stage.fastestLapTime || '1:30.120');

  // Sprint Race Pole & Fastest Lap
  const [sprintPoleDriverId, setSprintPoleDriverId] = useState<string>(
    stage.sprintPoleDriverId || sprintResultsList[0]?.driverId || ''
  );
  const [sprintPoleTime, setSprintPoleTime] = useState<string>(stage.sprintPoleTime || '1:28.920');
  const [sprintFastestLapDriverId, setSprintFastestLapDriverId] = useState<string>(
    stage.sprintFastestLapDriverId || sprintResultsList[0]?.driverId || ''
  );
  const [sprintFastestLapTime, setSprintFastestLapTime] = useState<string>(
    stage.sprintFastestLapTime || '1:29.400'
  );

  const poleBonus = activeChampionship.scoringRule?.poleBonus || 0;
  const fastestLapBonus = activeChampionship.scoringRule?.fastestLapBonus || 0;
  const sprintPoleBonus = activeChampionship.scoringRule?.sprintPoleBonus || 0;
  const sprintFastestLapBonus = activeChampionship.scoringRule?.sprintFastestLapBonus || 0;

  const hasPoleBonus = raceType === 'main' ? poleBonus > 0 : sprintPoleBonus > 0;
  const hasFastestLapBonus = raceType === 'main' ? fastestLapBonus > 0 : sprintFastestLapBonus > 0;
  const currentPoleBonusValue = raceType === 'main' ? poleBonus : sprintPoleBonus;
  const currentFastestLapBonusValue = raceType === 'main' ? fastestLapBonus : sprintFastestLapBonus;

  const sprintRulePositions = activeChampionship.scoringRule?.sprintPositions || [8, 7, 6, 5, 4, 3, 2, 1];

  // Recalculate points whenever positions, pole, fastest lap or penalties change
  const computePoints = (
    pos: number,
    driverId: string,
    status: RaceResultItem['status'],
    penalty: number = 0,
    targetType: 'main' | 'sprint' = raceType
  ) => {
    if (status !== 'FINISHED') return 0;

    if (targetType === 'sprint') {
      const basePoints = sprintRulePositions[pos - 1] || 0;
      const sprintPolePt =
        driverId === sprintPoleDriverId && sprintPoleBonus > 0 ? sprintPoleBonus : 0;
      const sprintVrPt =
        driverId === sprintFastestLapDriverId && sprintFastestLapBonus > 0 ? sprintFastestLapBonus : 0;
      return Math.max(0, basePoints + sprintPolePt + sprintVrPt - penalty);
    }

    const rule = activeChampionship.scoringRule;
    const basePoints = rule.positions[pos - 1] || 0;
    const polePt = driverId === poleDriverId && poleBonus > 0 ? poleBonus : 0;
    const vrPt = driverId === fastestLapDriverId && fastestLapBonus > 0 ? fastestLapBonus : 0;
    return Math.max(0, basePoints + polePt + vrPt - penalty);
  };

  // Reorder Starting Grid (gridPosition)
  const moveGridPosition = (sortedIndex: number, direction: 'up' | 'down') => {
    const currentList = raceType === 'sprint' ? sprintResultsList : mainResultsList;
    const sorted = [...currentList].sort((a, b) => (a.gridPosition || 0) - (b.gridPosition || 0));
    const targetIndex = direction === 'up' ? sortedIndex - 1 : sortedIndex + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const itemA = sorted[sortedIndex];
    const itemB = sorted[targetIndex];

    const updated = currentList.map((item) => {
      if (item.driverId === itemA.driverId) {
        return { ...item, gridPosition: targetIndex + 1 };
      }
      if (item.driverId === itemB.driverId) {
        return { ...item, gridPosition: sortedIndex + 1 };
      }
      return item;
    });

    setResultsList(updated);

    // If top position changed, update pole sitter
    if (sortedIndex === 0 || targetIndex === 0) {
      const newPoleDriver = direction === 'up' ? itemA.driverId : itemB.driverId;
      if (raceType === 'main') {
        setPoleDriverId(newPoleDriver);
      } else {
        setSprintPoleDriverId(newPoleDriver);
      }
    }
  };

  // Direct set Starting Grid position
  const setDirectGridPosition = (driverId: string, newPos: number) => {
    const currentList = raceType === 'sprint' ? sprintResultsList : mainResultsList;
    const sorted = [...currentList].sort((a, b) => (a.gridPosition || 0) - (b.gridPosition || 0));
    const currentIndex = sorted.findIndex((r) => r.driverId === driverId);
    if (currentIndex === -1) return;

    const targetIndex = Math.max(0, Math.min(sorted.length - 1, newPos - 1));
    if (currentIndex === targetIndex) return;

    const [moved] = sorted.splice(currentIndex, 1);
    sorted.splice(targetIndex, 0, moved);

    const updated = currentList.map((item) => {
      const idx = sorted.findIndex((s) => s.driverId === item.driverId);
      return {
        ...item,
        gridPosition: idx + 1,
      };
    });

    setResultsList(updated);

    if (targetIndex === 0 || currentIndex === 0) {
      const newPole = sorted[0].driverId;
      if (raceType === 'main') {
        setPoleDriverId(newPole);
      } else {
        setSprintPoleDriverId(newPole);
      }
    }
  };

  // Reorder Finishing Grid (finishPosition)
  const moveFinishPosition = (sortedIndex: number, direction: 'up' | 'down') => {
    const currentList = raceType === 'sprint' ? sprintResultsList : mainResultsList;
    const sorted = [...currentList].sort((a, b) => (a.finishPosition || 0) - (b.finishPosition || 0));
    const targetIndex = direction === 'up' ? sortedIndex - 1 : sortedIndex + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const itemA = sorted[sortedIndex];
    const itemB = sorted[targetIndex];

    const updated = currentList.map((item) => {
      if (item.driverId === itemA.driverId) {
        const newPos = targetIndex + 1;
        return {
          ...item,
          finishPosition: newPos,
          pointsAwarded: computePoints(newPos, item.driverId, item.status, item.penaltiesPoints, raceType),
        };
      }
      if (item.driverId === itemB.driverId) {
        const newPos = sortedIndex + 1;
        return {
          ...item,
          finishPosition: newPos,
          pointsAwarded: computePoints(newPos, item.driverId, item.status, item.penaltiesPoints, raceType),
        };
      }
      return item;
    });

    setResultsList(updated);
  };

  // Direct set Finishing Grid position
  const setDirectFinishPosition = (driverId: string, newPos: number) => {
    const currentList = raceType === 'sprint' ? sprintResultsList : mainResultsList;
    const sorted = [...currentList].sort((a, b) => (a.finishPosition || 0) - (b.finishPosition || 0));
    const currentIndex = sorted.findIndex((r) => r.driverId === driverId);
    if (currentIndex === -1) return;

    const targetIndex = Math.max(0, Math.min(sorted.length - 1, newPos - 1));
    if (currentIndex === targetIndex) return;

    const [moved] = sorted.splice(currentIndex, 1);
    sorted.splice(targetIndex, 0, moved);

    const updated = currentList.map((item) => {
      const idx = sorted.findIndex((s) => s.driverId === item.driverId);
      const newFinish = idx + 1;
      return {
        ...item,
        finishPosition: newFinish,
        pointsAwarded: computePoints(newFinish, item.driverId, item.status, item.penaltiesPoints, raceType),
      };
    });

    setResultsList(updated);
  };

  // Invert Top N drivers on Starting Grid
  const invertTopGrid = (count: number) => {
    const currentList = raceType === 'sprint' ? sprintResultsList : mainResultsList;
    const sorted = [...currentList].sort((a, b) => (a.gridPosition || 0) - (b.gridPosition || 0));
    const topN = sorted.slice(0, count).reverse();
    const rest = sorted.slice(count);
    const newOrder = [...topN, ...rest];

    const updated = currentList.map((item) => {
      const idx = newOrder.findIndex((s) => s.driverId === item.driverId);
      return {
        ...item,
        gridPosition: idx + 1,
      };
    });

    setResultsList(updated);
    if (newOrder.length > 0) {
      const newPole = newOrder[0].driverId;
      if (raceType === 'main') {
        setPoleDriverId(newPole);
      } else {
        setSprintPoleDriverId(newPole);
      }
    }
  };

  // Copy Sprint finish order to Main race starting grid
  const copySprintFinishToMainGrid = () => {
    if (!sprintResultsList || sprintResultsList.length === 0) return;
    const sortedSprint = [...sprintResultsList].sort(
      (a, b) => (a.finishPosition || 0) - (b.finishPosition || 0)
    );

    const updated = mainResultsList.map((item) => {
      const sprintMatch = sortedSprint.findIndex((s) => s.driverId === item.driverId);
      return {
        ...item,
        gridPosition: sprintMatch !== -1 ? sprintMatch + 1 : item.gridPosition,
      };
    });

    setMainResultsList(updated);
    const sortedUpdated = [...updated].sort((a, b) => a.gridPosition - b.gridPosition);
    if (sortedUpdated.length > 0) {
      setPoleDriverId(sortedUpdated[0].driverId);
    }
  };

  // Copy starting grid order to finish grid
  const copyGridToFinish = () => {
    const currentList = raceType === 'sprint' ? sprintResultsList : mainResultsList;
    const updated = currentList.map((item) => ({
      ...item,
      finishPosition: item.gridPosition,
      pointsAwarded: computePoints(
        item.gridPosition,
        item.driverId,
        item.status,
        item.penaltiesPoints,
        raceType
      ),
    }));
    setResultsList(updated);
  };

  const updateItemStatus = (driverId: string, newStatus: RaceResultItem['status']) => {
    const currentList = raceType === 'sprint' ? sprintResultsList : mainResultsList;
    const updated = currentList.map((item) => {
      if (item.driverId === driverId) {
        return {
          ...item,
          status: newStatus,
          pointsAwarded: computePoints(
            item.finishPosition,
            item.driverId,
            newStatus,
            item.penaltiesPoints,
            raceType
          ),
        };
      }
      return item;
    });
    setResultsList(updated);
  };

  // Toggle driver missed race (Ausente / Faltou a corrida / DNS)
  const toggleDriverMissedRace = (driverId: string) => {
    const currentList = raceType === 'sprint' ? sprintResultsList : mainResultsList;
    const target = currentList.find((i) => i.driverId === driverId);
    if (!target) return;

    const isCurrentlyDNS = target.status === 'DNS';
    const newStatus: RaceResultItem['status'] = isCurrentlyDNS ? 'FINISHED' : 'DNS';

    const updated = currentList.map((item) => {
      if (item.driverId === driverId) {
        return {
          ...item,
          status: newStatus,
          gap:
            newStatus === 'DNS'
              ? 'Faltou (DNS)'
              : item.gap === 'Faltou (DNS)'
              ? ''
              : item.gap,
          pointsAwarded: computePoints(
            item.finishPosition,
            item.driverId,
            newStatus,
            item.penaltiesPoints,
            raceType
          ),
        };
      }
      return item;
    });

    setResultsList(updated);

    // If driver was set as Pole and is now marked as absent (DNS), reassign pole
    if (newStatus === 'DNS') {
      if (raceType === 'main' && poleDriverId === driverId) {
        const nextPresent = updated.find((d) => d.driverId !== driverId && d.status !== 'DNS');
        if (nextPresent) setPoleDriverId(nextPresent.driverId);
      } else if (raceType === 'sprint' && sprintPoleDriverId === driverId) {
        const nextPresent = updated.find((d) => d.driverId !== driverId && d.status !== 'DNS');
        if (nextPresent) setSprintPoleDriverId(nextPresent.driverId);
      }

      // If driver was set as Fastest Lap and is now absent (DNS), reassign fastest lap
      if (raceType === 'main' && fastestLapDriverId === driverId) {
        const nextPresent = updated.find((d) => d.driverId !== driverId && d.status !== 'DNS');
        if (nextPresent) setFastestLapDriverId(nextPresent.driverId);
      } else if (raceType === 'sprint' && sprintFastestLapDriverId === driverId) {
        const nextPresent = updated.find((d) => d.driverId !== driverId && d.status !== 'DNS');
        if (nextPresent) setSprintFastestLapDriverId(nextPresent.driverId);
      }
    }
  };

  // Toggle driver missed qualifying (Ausente / Faltou ao Quali / DNS Quali)
  const toggleDriverMissedQuali = (driverId: string) => {
    const currentList = raceType === 'sprint' ? sprintResultsList : mainResultsList;
    const target = currentList.find((i) => i.driverId === driverId);
    if (!target) return;

    const isCurrentlyMissedQuali = Boolean(target.missedQuali) || target.qualiStatus === 'DNS';
    const newMissedQuali = !isCurrentlyMissedQuali;

    const updated = currentList.map((item) => {
      if (item.driverId === driverId) {
        return {
          ...item,
          missedQuali: newMissedQuali,
          qualiStatus: newMissedQuali ? ('DNS' as const) : ('FINISHED' as const),
          gridPosition: newMissedQuali ? 0 : (item.gridPosition || 1),
        };
      }
      return item;
    });

    setResultsList(updated);

    // If driver was set as Pole and now marked as missing quali, reassign pole
    if (newMissedQuali) {
      if (raceType === 'main' && poleDriverId === driverId) {
        const nextPresent = updated.find((d) => d.driverId !== driverId && !d.missedQuali && d.qualiStatus !== 'DNS');
        if (nextPresent) setPoleDriverId(nextPresent.driverId);
      } else if (raceType === 'sprint' && sprintPoleDriverId === driverId) {
        const nextPresent = updated.find((d) => d.driverId !== driverId && !d.missedQuali && d.qualiStatus !== 'DNS');
        if (nextPresent) setSprintPoleDriverId(nextPresent.driverId);
      }
    }
  };

  // Toggle driver missed entire event (Faltou ao Quali + Corrida)
  const toggleDriverMissedBoth = (driverId: string) => {
    const currentList = raceType === 'sprint' ? sprintResultsList : mainResultsList;
    const target = currentList.find((i) => i.driverId === driverId);
    if (!target) return;

    const isCurrentlyBothAbsent =
      (Boolean(target.missedQuali) || target.qualiStatus === 'DNS') && target.status === 'DNS';
    const newAbsent = !isCurrentlyBothAbsent;

    const updated = currentList.map((item) => {
      if (item.driverId === driverId) {
        return {
          ...item,
          missedQuali: newAbsent,
          qualiStatus: newAbsent ? ('DNS' as const) : ('FINISHED' as const),
          status: newAbsent ? ('DNS' as const) : ('FINISHED' as const),
          gridPosition: newAbsent ? 0 : (item.gridPosition || 1),
          gap: newAbsent ? 'Faltou (DNS)' : item.gap === 'Faltou (DNS)' ? '' : item.gap,
          pointsAwarded: computePoints(
            item.finishPosition,
            item.driverId,
            newAbsent ? 'DNS' : 'FINISHED',
            item.penaltiesPoints,
            raceType
          ),
        };
      }
      return item;
    });

    setResultsList(updated);

    if (newAbsent) {
      if (raceType === 'main' && poleDriverId === driverId) {
        const nextPresent = updated.find((d) => d.driverId !== driverId && !d.missedQuali && d.status !== 'DNS');
        if (nextPresent) setPoleDriverId(nextPresent.driverId);
      }
      if (raceType === 'main' && fastestLapDriverId === driverId) {
        const nextPresent = updated.find((d) => d.driverId !== driverId && d.status !== 'DNS');
        if (nextPresent) setFastestLapDriverId(nextPresent.driverId);
      }
    }
  };

  const updateItemPenalties = (driverId: string, penalty: number, notes?: string) => {
    const currentList = raceType === 'sprint' ? sprintResultsList : mainResultsList;
    const updated = currentList.map((item) => {
      if (item.driverId === driverId) {
        return {
          ...item,
          penaltiesPoints: penalty,
          penaltyNotes: notes !== undefined ? notes : item.penaltyNotes,
          pointsAwarded: computePoints(
            item.finishPosition,
            item.driverId,
            item.status,
            penalty,
            raceType
          ),
        };
      }
      return item;
    });
    setResultsList(updated);
  };

  const handleSave = () => {
    if (raceType === 'sprint') {
      // Final points check for Sprint
      const finalizedSprint = sprintResultsList.map((item) => {
        const reg = activeChampionship.registrations.find((r) => r.userId === item.driverId);
        const isReserve =
          Boolean(item.isReserve) || reg?.status === 'RESERVA' || Boolean(reg?.isReserve);
        return {
          ...item,
          isReserve,
          teamName: isReserve ? 'Reserva' : item.teamName,
          hasPole: item.driverId === sprintPoleDriverId,
          hasFastestLap: item.driverId === sprintFastestLapDriverId,
          pointsAwarded: computePoints(
            item.finishPosition,
            item.driverId,
            item.status,
            item.penaltiesPoints,
            'sprint'
          ),
        };
      });

      recordSprintResults(
        activeChampionship.id,
        stage.id,
        finalizedSprint,
        sprintPoleDriverId ? { driverId: sprintPoleDriverId, time: sprintPoleTime } : undefined,
        sprintFastestLapDriverId
          ? { driverId: sprintFastestLapDriverId, time: sprintFastestLapTime }
          : undefined
      );

      // Send broadcast notification for Sprint
      sendNotification({
        userId: 'all',
        title: `⚡ Resultados Sprint Homologados: ${stage.trackName}`,
        message: `O grid de largada e de chegada da Corrida Sprint da Etapa ${stage.roundNumber} foram publicados! Os pontos já estão valendo na tabela.`,
        type: 'RACE_RESULT',
        linkTab: 'standings-drivers',
        championshipId: activeChampionship.id,
        stageId: stage.id,
      }).catch(() => {});

      onClose();
      return;
    }

    // Main race saving
    const finalized = mainResultsList.map((item) => {
      const reg = activeChampionship.registrations.find((r) => r.userId === item.driverId);
      const isReserve =
        Boolean(item.isReserve) || reg?.status === 'RESERVA' || Boolean(reg?.isReserve);
      return {
        ...item,
        isReserve,
        teamName: isReserve ? 'Reserva' : item.teamName,
        hasPole: item.driverId === poleDriverId,
        hasFastestLap: item.driverId === fastestLapDriverId,
        pointsAwarded: computePoints(
          item.finishPosition,
          item.driverId,
          item.status,
          item.penaltiesPoints,
          'main'
        ),
      };
    });

    recordRaceResults(
      activeChampionship.id,
      stage.id,
      finalized,
      poleDriverId ? { driverId: poleDriverId, time: poleTime } : undefined,
      fastestLapDriverId ? { driverId: fastestLapDriverId, time: fastestLapTime } : undefined
    );

    // Send broadcast notification
    sendNotification({
      userId: 'all',
      title: `🏁 Resultados Homologados: ${stage.trackName}`,
      message: `A classificação oficial com grid de largada e chegada da Etapa ${stage.roundNumber} foi homologada! Confira as tabelas atualizadas.`,
      type: 'RACE_RESULT',
      linkTab: 'standings-drivers',
      championshipId: activeChampionship.id,
      stageId: stage.id,
    }).catch(() => {});

    onClose();
  };

  // Sorted items according to current gridStep
  const sortedGridItems = [...resultsList].sort((a, b) => {
    const aMissed = Boolean(a.missedQuali) || a.qualiStatus === 'DNS' || (a.gridPosition || 0) <= 0;
    const bMissed = Boolean(b.missedQuali) || b.qualiStatus === 'DNS' || (b.gridPosition || 0) <= 0;
    if (aMissed && !bMissed) return 1;
    if (!aMissed && bMissed) return -1;
    return (a.gridPosition || 0) - (b.gridPosition || 0);
  });
  const sortedFinishItems = [...resultsList].sort(
    (a, b) => (a.finishPosition || 0) - (b.finishPosition || 0)
  );

  const absentCount = resultsList.filter((r) => r.status === 'DNS').length;

  const activePoleDriverId = raceType === 'main' ? poleDriverId : sprintPoleDriverId;
  const activePoleTime = raceType === 'main' ? poleTime : sprintPoleTime;
  const setActivePoleDriverId = raceType === 'main' ? setPoleDriverId : setSprintPoleDriverId;
  const setActivePoleTime = raceType === 'main' ? setPoleTime : setSprintPoleTime;

  const activeFastestLapDriverId =
    raceType === 'main' ? fastestLapDriverId : sprintFastestLapDriverId;
  const activeFastestLapTime = raceType === 'main' ? fastestLapTime : sprintFastestLapTime;
  const setActiveFastestLapDriverId =
    raceType === 'main' ? setFastestLapDriverId : setSprintFastestLapDriverId;
  const setActiveFastestLapTime =
    raceType === 'main' ? setFastestLapTime : setSprintFastestLapTime;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-[#0c121e] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div>
            <div className="text-xs text-red-400 uppercase font-semibold flex items-center gap-1.5 flex-wrap">
              <span>Etapa {stage.roundNumber}</span>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <CountryFlag flag={stage.trackFlag} country={stage.trackCountry} size="xs" />
                <span>{stage.trackCountry}</span>
              </span>
              {isAdmin && (
                <span className="bg-red-950 text-red-300 border border-red-800 text-[10px] px-1.5 py-0.5 rounded font-mono">
                  Modo Administrador
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white font-display flex items-center gap-2 flex-wrap mt-0.5">
              <span>Resultados & Grids: {stage.trackName}</span>
              {raceType === 'sprint' ? (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 inline-flex items-center gap-1 font-sans">
                  <Zap className="w-3 h-3 text-amber-400" />
                  Corrida Sprint
                </span>
              ) : (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-600/20 text-red-300 border border-red-500/50 inline-flex items-center gap-1 font-sans">
                  <Award className="w-3 h-3 text-red-400" />
                  Corrida Principal
                </span>
              )}
            </h2>
            <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-1.5">
              {raceType === 'sprint' ? (
                <>
                  <span className="text-amber-300 font-semibold flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" />
                    Pontuação Sprint:
                  </span>
                  <span className="font-mono text-slate-200 font-semibold bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                    [{sprintRulePositions.join(', ')}] pts
                  </span>
                </>
              ) : (
                <>
                  <span>
                    Sistema de pontuação:{' '}
                    <strong className="text-slate-200">{activeChampionship.scoringRule.name}</strong>
                  </span>
                  <span className="font-mono text-slate-300 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                    [{activeChampionship.scoringRule.positions.join(', ')}]
                  </span>
                </>
              )}
              {hasPoleBonus ? (
                <span className="inline-flex items-center gap-1 text-[11px] bg-amber-950/60 border border-amber-800/80 text-amber-300 px-1.5 py-0.5 rounded font-semibold">
                  <Award className="w-3 h-3 text-amber-400" />
                  +{currentPoleBonusValue} pt{currentPoleBonusValue > 1 ? 's' : ''} Pole Position
                </span>
              ) : (
                <span className="text-[10px] text-slate-500 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">
                  Pole: sem bônus extra
                </span>
              )}
              {hasFastestLapBonus ? (
                <span className="inline-flex items-center gap-1 text-[11px] bg-purple-950/60 border border-purple-800/80 text-purple-300 px-1.5 py-0.5 rounded font-semibold">
                  <Zap className="w-3 h-3 text-purple-400" />
                  +{currentFastestLapBonusValue} pt{currentFastestLapBonusValue > 1 ? 's' : ''} Volta
                  Rápida
                </span>
              ) : (
                <span className="text-[10px] text-slate-500 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">
                  Volta Rápida: sem bônus extra
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Sprint vs Main vs DotD */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-slate-900/60 px-4 pt-2 shrink-0 gap-2">
          <div className="flex items-center gap-1">
            {stage.hasSprint ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setRaceType('sprint');
                    setModalTab('results');
                  }}
                  className={`py-2 px-3.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                    modalTab === 'results' && raceType === 'sprint'
                      ? 'border-amber-500 text-amber-300 bg-amber-500/15 rounded-t-lg'
                      : 'border-transparent text-slate-400 hover:text-amber-200'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Corrida Sprint</span>
                  {stage.sprintResults && stage.sprintResults.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400" title="Resultados lançados" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRaceType('main');
                    setModalTab('results');
                  }}
                  className={`py-2 px-3.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                    modalTab === 'results' && raceType === 'main'
                      ? 'border-red-500 text-white bg-red-500/15 rounded-t-lg'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <Award className="w-3.5 h-3.5 text-red-400" />
                  <span>Corrida Principal</span>
                  {stage.results && stage.results.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400" title="Resultados lançados" />
                  )}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setModalTab('results')}
                className={`py-2 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
                  modalTab === 'results'
                    ? 'border-red-500 text-white bg-red-500/10 rounded-t-lg'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5" />
                <span>Classificação da Etapa</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setModalTab('dotd')}
            className={`py-2 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              modalTab === 'dotd'
                ? 'border-amber-500 text-amber-300 bg-amber-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Piloto do Dia & Troféus</span>
            {stage.communityTrophies?.driverOfTheDay?.totalVotes ? (
              <span className="bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {stage.communityTrophies.driverOfTheDay.totalVotes}
              </span>
            ) : null}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-3 sm:p-5 overflow-y-auto overflow-x-hidden space-y-4">
          {modalTab === 'dotd' ? (
            <DriverOfTheDayVoting stage={stage} />
          ) : (
            <>
              {/* Secondary Step Bar: 1. Grid de Largada vs 2. Grid de Chegada */}
              <div className="bg-slate-950 p-2 sm:p-2.5 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden sm:inline-block">
                    Etapas do Lançamento:
                  </span>
                  <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setGridStep('grid')}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        gridStep === 'grid'
                          ? raceType === 'sprint'
                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                            : 'bg-red-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>1. Grid de Largada</span>
                      <span className="text-[10px] opacity-75 font-mono">
                        ({sortedGridItems.length})
                      </span>
                    </button>

                    <ChevronRight className="w-3.5 h-3.5 text-slate-600" />

                    <button
                      type="button"
                      onClick={() => setGridStep('finish')}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        gridStep === 'finish'
                          ? raceType === 'sprint'
                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                            : 'bg-red-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      <span>2. Grid de Chegada</span>
                      <span className="text-[10px] opacity-75 font-mono">
                        ({sortedFinishItems.length})
                      </span>
                    </button>
                  </div>
                </div>

                {/* Quick workflow helpers for Stewards/Admins */}
                {isAdmin && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {absentCount > 0 && (
                      <span className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-rose-950/80 border border-rose-700/80 text-rose-300 flex items-center gap-1.5 shadow-sm">
                        <UserX className="w-3.5 h-3.5 text-rose-400" />
                        <span>{absentCount} {absentCount === 1 ? 'piloto faltou' : 'pilotos faltaram'}</span>
                      </span>
                    )}

                    <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/90 rounded-lg px-2 py-1 text-[11px] hover:border-slate-600 transition-colors">
                      <UserX className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            toggleDriverMissedRace(e.target.value);
                            e.target.value = '';
                          }
                        }}
                        defaultValue=""
                        className="bg-transparent text-slate-300 text-[11px] focus:outline-none cursor-pointer pr-1"
                        title="Selecione um piloto para marcar ou desmarcar falta na corrida"
                      >
                        <option value="" disabled className="bg-slate-900 text-slate-400">
                          + Marcar falta no grid...
                        </option>
                        {resultsList.map((driver) => {
                          const uName = users.find((u) => u.id === driver.driverId)?.name || driver.driverName;
                          return (
                            <option
                              key={driver.driverId}
                              value={driver.driverId}
                              className="bg-slate-900 text-white"
                            >
                              #{driver.number} {uName} {driver.status === 'DNS' ? '✓ (Faltou)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {gridStep === 'grid' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => invertTopGrid(8)}
                          className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                          title="Inverte os 8 primeiros colocados no Grid de Largada"
                        >
                          <Shuffle className="w-3 h-3 text-amber-400" />
                          <span>Inverter Top 8</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => invertTopGrid(10)}
                          className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                          title="Inverte os 10 primeiros colocados no Grid de Largada"
                        >
                          <Shuffle className="w-3 h-3 text-amber-400" />
                          <span>Inverter Top 10</span>
                        </button>
                        {raceType === 'main' && stage.hasSprint && sprintResultsList.length > 0 && (
                          <button
                            type="button"
                            onClick={copySprintFinishToMainGrid}
                            className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/60 text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                            title="Importa o resultado da Corrida Sprint como Grid de Largada da Corrida Principal"
                          >
                            <Zap className="w-3 h-3 text-amber-400" />
                            <span>Importar Chegada Sprint</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setGridStep('finish')}
                          className="px-3 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 cursor-pointer transition-colors shadow-sm ml-auto"
                        >
                          <span>Avançar para Chegada</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setGridStep('grid')}
                          className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <ArrowLeft className="w-3 h-3" />
                          <span>Voltar para Largada</span>
                        </button>
                        <button
                          type="button"
                          onClick={copyGridToFinish}
                          className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                          title="Define o Grid de Chegada igual ao Grid de Largada para facilitar pequenos ajustes"
                        >
                          <Copy className="w-3 h-3 text-blue-400" />
                          <span>Copiar Largada para Chegada</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Informative Guidance Banner based on current gridStep */}
              {gridStep === 'grid' ? (
                <div
                  className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
                    raceType === 'sprint'
                      ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                      : 'bg-red-950/20 border-red-800/40 text-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Flag
                      className={`w-4 h-4 shrink-0 ${
                        raceType === 'sprint' ? 'text-amber-400' : 'text-red-400'
                      }`}
                    />
                    <div>
                      <div className="font-bold">
                        {raceType === 'sprint'
                          ? 'Grid de Largada da Corrida Sprint'
                          : 'Grid de Largada da Corrida Principal'}
                      </div>
                      <div className="text-[11px] text-slate-300 mt-0.5">
                        Defina a ordem de qualificação ou largada dos pilotos. O piloto na{' '}
                        <strong className="text-white font-mono">P1</strong> é considerado o Pole
                        Position oficial da corrida.
                      </div>
                    </div>
                  </div>
                  {isAdmin && (
                    <span className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded font-mono shrink-0">
                      Use as setas ▲ ▼ ou o seletor para organizar o grid
                    </span>
                  )}
                </div>
              ) : (
                <div
                  className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
                    raceType === 'sprint'
                      ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                      : 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Trophy
                      className={`w-4 h-4 shrink-0 ${
                        raceType === 'sprint' ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    />
                    <div>
                      <div className="font-bold">
                        {raceType === 'sprint'
                          ? 'Grid de Chegada & Pontuação da Sprint'
                          : 'Grid de Chegada & Classificação Final'}
                      </div>
                      <div className="text-[11px] text-slate-300 mt-0.5">
                        Defina a ordem em que os pilotos cruzaram a linha de chegada, abandonos,
                        tempos e penalidades. A coluna{' '}
                        <strong className="text-white font-mono">Δ Pos</strong> calcula as
                        ultrapassagens automaticamente com base no Grid de Largada.
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded font-mono shrink-0">
                    Pontos atribuídos automaticamente
                  </span>
                </div>
              )}

              {/* Pole Position & Fastest Lap Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 sm:p-3.5 bg-slate-950 rounded-xl border border-slate-800 min-w-0 overflow-hidden">
                {/* Pole Position Control */}
                <div
                  className={`p-3 rounded-lg border transition-all min-w-0 overflow-hidden flex flex-col justify-between ${
                    hasPoleBonus
                      ? 'bg-amber-950/15 border-amber-900/50'
                      : 'bg-slate-900/40 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
                    <label className="text-xs font-semibold text-amber-400 flex items-center gap-1.5 min-w-0 truncate">
                      <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">
                        {raceType === 'sprint' ? 'Pole Position (Sprint)' : 'Pole Position'}
                      </span>
                    </label>
                    {hasPoleBonus ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0 whitespace-nowrap">
                        +{currentPoleBonusValue} pt{currentPoleBonusValue > 1 ? 's' : ''} extra
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 italic shrink-0 whitespace-nowrap">
                        Sem bônus
                      </span>
                    )}
                  </div>

                  {isAdmin ? (
                    <div className="flex flex-col sm:flex-row gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <select
                          value={activePoleDriverId}
                          onChange={(e) => setActivePoleDriverId(e.target.value)}
                          className="w-full min-w-0 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer truncate"
                        >
                          {sortedGridItems.map((r) => (
                            <option key={r.driverId} value={r.driverId}>
                              P{r.gridPosition} · #{r.number} {r.driverName} ({r.teamName})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="shrink-0">
                        <input
                          type="text"
                          placeholder="1:29.840"
                          value={activePoleTime}
                          onChange={(e) => setActivePoleTime(e.target.value)}
                          className="w-full sm:w-24 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono tabular-nums text-center focus:outline-none focus:border-amber-500"
                          title="Tempo da pole"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-white font-medium flex items-center justify-between gap-2 min-w-0">
                      <span className="truncate min-w-0">
                        {resultsList.find((r) => r.driverId === activePoleDriverId)?.driverName ||
                          'Não registrado'}
                      </span>
                      <span className="font-mono tabular-nums text-slate-400 shrink-0">
                        {activePoleTime || '-'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Fastest Lap Control */}
                <div
                  className={`p-3 rounded-lg border transition-all min-w-0 overflow-hidden flex flex-col justify-between ${
                    hasFastestLapBonus
                      ? 'bg-purple-950/25 border-purple-800/60'
                      : 'bg-slate-900/40 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
                    <label className="text-xs font-semibold text-purple-400 flex items-center gap-1.5 min-w-0 truncate">
                      <Zap className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className="truncate">
                        {raceType === 'sprint' ? 'Melhor Volta (Sprint)' : 'Melhor Volta da Prova'}
                      </span>
                    </label>
                    {hasFastestLapBonus ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 shrink-0 whitespace-nowrap">
                        +{currentFastestLapBonusValue} pt{currentFastestLapBonusValue > 1 ? 's' : ''}{' '}
                        extra
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 italic shrink-0 whitespace-nowrap">
                        Sem bônus
                      </span>
                    )}
                  </div>

                  {isAdmin ? (
                    <div className="flex flex-col sm:flex-row gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <select
                          value={activeFastestLapDriverId}
                          onChange={(e) => setActiveFastestLapDriverId(e.target.value)}
                          className="w-full min-w-0 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer truncate"
                        >
                          {sortedFinishItems.map((r) => (
                            <option key={r.driverId} value={r.driverId}>
                              #{r.number} {r.driverName} ({r.teamName})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="shrink-0">
                        <input
                          type="text"
                          placeholder="1:30.120"
                          value={activeFastestLapTime}
                          onChange={(e) => setActiveFastestLapTime(e.target.value)}
                          className="w-full sm:w-24 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono tabular-nums text-center focus:outline-none focus:border-purple-500"
                          title="Tempo da melhor volta"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-white font-medium flex items-center justify-between gap-2 min-w-0">
                      <span className="truncate min-w-0">
                        {resultsList.find((r) => r.driverId === activeFastestLapDriverId)?.driverName ||
                          'Não registrado'}
                      </span>
                      <span className="font-mono tabular-nums text-purple-300 font-bold shrink-0">
                        {activeFastestLapTime || '-'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* TABLE VIEW: Depends on whether gridStep is 'grid' or 'finish' */}
              {gridStep === 'grid' ? (
                /* ======================== 1. GRID DE LARGADA TABLE ======================== */
                <div className="rounded-xl border border-slate-800 overflow-x-auto shadow-sm">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/90 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3 text-center w-16">Grid Pos</th>
                        {isAdmin && <th className="py-2.5 px-2 text-center w-20">Ordem</th>}
                        <th className="py-2.5 px-3">Piloto & Equipe</th>
                        <th className="py-2.5 px-3">Carro / Modelo</th>
                        <th className="py-2.5 px-3 text-center">Status no Campeonato</th>
                        {isAdmin && (
                          <th className="py-2.5 px-3 text-center w-28">Seletor Direto</th>
                        )}
                        <th className="py-2.5 px-3 text-center w-56">Presenças & Faltas (Quali / Corrida)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono-numbers">
                      {sortedGridItems.map((item, sortedIdx) => {
                        const isPole = item.driverId === activePoleDriverId;
                        const isAbsent = item.status === 'DNS';
                        const isMissedQuali = Boolean(item.missedQuali) || item.qualiStatus === 'DNS' || (item.gridPosition || 0) <= 0;

                        return (
                          <tr
                            key={item.driverId}
                            className={`hover:bg-slate-800/30 transition-colors ${
                              isAbsent && isMissedQuali
                                ? 'bg-rose-950/25 border-l-2 border-rose-600 opacity-90'
                                : isMissedQuali
                                ? 'bg-purple-950/20 border-l-2 border-purple-500 opacity-90'
                                : isAbsent
                                ? 'bg-rose-950/20 border-l-2 border-rose-500 opacity-90'
                                : item.gridPosition === 1
                                ? 'bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border-l-2 border-amber-400'
                                : item.gridPosition === 2
                                ? 'bg-gradient-to-r from-slate-200/10 via-slate-300/5 to-transparent border-l-2 border-slate-300'
                                : item.gridPosition === 3
                                ? 'bg-gradient-to-r from-amber-800/15 via-amber-800/5 to-transparent border-l-2 border-amber-600'
                                : 'border-l-2 border-transparent'
                            }`}
                          >
                            {/* Grid Position */}
                            <td className="py-2.5 px-3 text-center font-bold">
                              {isMissedQuali ? (
                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950/80 border border-purple-800 text-purple-300">
                                  Sem Quali (DNS)
                                </span>
                              ) : item.gridPosition === 1 ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg font-mono font-bold bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-slate-950 shadow-md ring-1 ring-amber-300/50">
                                  P1
                                </span>
                              ) : (
                                <span className="text-slate-300 font-mono font-semibold bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                                  P{item.gridPosition}
                                </span>
                              )}
                            </td>

                            {/* Move Up/Down Buttons (Admin) */}
                            {isAdmin && (
                              <td className="py-2.5 px-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    disabled={sortedIdx === 0}
                                    onClick={() => moveGridPosition(sortedIdx, 'up')}
                                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 cursor-pointer"
                                    title="Subir posição no grid"
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={sortedIdx === sortedGridItems.length - 1}
                                    onClick={() => moveGridPosition(sortedIdx, 'down')}
                                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 cursor-pointer"
                                    title="Descer posição no grid"
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                            )}

                            {/* Driver & Team */}
                            <td className="py-2.5 px-3 font-sans">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-red-400 font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-[11px] tabular-nums">
                                  #{item.number}
                                </span>
                                <div>
                                  <div className="font-semibold text-white flex items-center gap-1.5 flex-wrap">
                                    <span>
                                      {users.find((u) => u.id === item.driverId)?.name ||
                                        item.driverName}
                                    </span>
                                    {isPole && !isAbsent && !isMissedQuali && (
                                      <span className="text-[10px] bg-amber-950/90 text-amber-300 border border-amber-500/50 px-1.5 py-0.2 rounded font-mono font-bold flex items-center gap-1 shadow-sm">
                                        <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                                        <span>POLE POSITION</span>
                                        {hasPoleBonus && (
                                          <span className="text-amber-400">
                                            (+{currentPoleBonusValue})
                                          </span>
                                        )}
                                      </span>
                                    )}
                                    {isMissedQuali && (
                                      <span className="text-[10px] bg-purple-950/90 text-purple-300 border border-purple-700 px-1.5 py-0.2 rounded font-mono font-bold flex items-center gap-1 shadow-sm">
                                        <UserX className="w-2.5 h-2.5 text-purple-400" />
                                        <span>FALTOU AO QUALI</span>
                                      </span>
                                    )}
                                    {isAbsent && (
                                      <span className="text-[10px] bg-rose-950 text-rose-300 border border-rose-600/80 px-1.5 py-0.2 rounded font-mono font-bold flex items-center gap-1 shadow-sm">
                                        <UserX className="w-2.5 h-2.5 text-rose-400" />
                                        <span>FALTOU À CORRIDA</span>
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                    {item.isReserve ||
                                    item.teamName.toLowerCase().includes('reserva') ? (
                                      <span className="text-[10px] font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/40 px-1.5 py-0.2 rounded">
                                        Piloto Reserva
                                      </span>
                                    ) : (
                                      <span>{item.teamName}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Car Model */}
                            <td className="py-2.5 px-3 text-slate-300">
                              <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-[11px]">
                                {item.carModel || 'Não especificado'}
                              </span>
                            </td>

                            {/* Driver Status */}
                            <td className="py-2.5 px-3 text-center">
                              {item.isReserve ? (
                                <span className="text-[10px] text-amber-300 bg-amber-950/40 border border-amber-800/60 px-2 py-0.5 rounded font-sans font-semibold">
                                  Reserva
                                </span>
                              ) : (
                                <span className="text-[10px] text-emerald-300 bg-emerald-950/40 border border-emerald-800/60 px-2 py-0.5 rounded font-sans font-semibold">
                                  Titular
                                </span>
                              )}
                            </td>

                            {/* Direct Selector (Admin) */}
                            {isAdmin && (
                              <td className="py-2.5 px-3 text-center">
                                <select
                                  value={item.gridPosition}
                                  onChange={(e) =>
                                    setDirectGridPosition(item.driverId, Number(e.target.value))
                                  }
                                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer font-mono"
                                >
                                  <option value={0}>0 (Sem Quali)</option>
                                  {sortedGridItems.map((_, i) => (
                                    <option key={i + 1} value={i + 1}>
                                      P{i + 1}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            )}

                            {/* Attendance / Mark Absent (Quali & Corrida) */}
                            <td className="py-2.5 px-3 text-center">
                              {isAdmin ? (
                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                  {/* Toggle Quali Absence */}
                                  <button
                                    type="button"
                                    onClick={() => toggleDriverMissedQuali(item.driverId)}
                                    className={`inline-flex items-center justify-center gap-1 px-2 py-1 rounded text-[11px] font-semibold cursor-pointer transition-all ${
                                      item.missedQuali || item.qualiStatus === 'DNS'
                                        ? 'bg-purple-600 hover:bg-purple-500 text-white border border-purple-400 shadow-sm'
                                        : 'bg-slate-900 hover:bg-purple-950/70 text-slate-300 hover:text-purple-200 border border-slate-700 hover:border-purple-600/70'
                                    }`}
                                    title={
                                      item.missedQuali
                                        ? 'Piloto faltou ao Quali. Clique para marcar como Presente no quali.'
                                        : 'Marcar que este piloto faltou à sessão de Quali'
                                    }
                                  >
                                    <UserX className="w-3 h-3" />
                                    <span>{item.missedQuali ? 'Faltou Quali' : 'Faltou Quali?'}</span>
                                  </button>

                                  {/* Toggle Race Absence */}
                                  <button
                                    type="button"
                                    onClick={() => toggleDriverMissedRace(item.driverId)}
                                    className={`inline-flex items-center justify-center gap-1 px-2 py-1 rounded text-[11px] font-semibold cursor-pointer transition-all ${
                                      isAbsent
                                        ? 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-400 shadow-sm'
                                        : 'bg-slate-900 hover:bg-rose-950/70 text-slate-300 hover:text-rose-200 border border-slate-700 hover:border-rose-600/70'
                                    }`}
                                    title={
                                      isAbsent
                                        ? 'Piloto faltou à corrida (DNS). Clique para marcar como Presente na corrida.'
                                        : 'Marcar que este piloto faltou à corrida (DNS)'
                                    }
                                  >
                                    <UserX className="w-3 h-3" />
                                    <span>{isAbsent ? 'Faltou Corrida' : 'Faltou Corrida?'}</span>
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-1 flex-wrap">
                                  {isMissedQuali && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-400 bg-purple-950/60 border border-purple-800/80 px-2 py-0.5 rounded">
                                      <UserX className="w-3 h-3 text-purple-400" />
                                      <span>Sem Quali</span>
                                    </span>
                                  )}
                                  {isAbsent ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-950/60 border border-rose-800/80 px-2 py-0.5 rounded">
                                      <UserX className="w-3 h-3 text-rose-400" />
                                      <span>Faltou Corrida</span>
                                    </span>
                                  ) : !isMissedQuali ? (
                                    <span className="text-[11px] text-emerald-400 font-medium">Presente</span>
                                  ) : null}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* ======================== 2. GRID DE CHEGADA TABLE ======================== */
                <div className="rounded-xl border border-slate-800 overflow-x-auto shadow-sm">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/90 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3 text-center w-14">Chegada</th>
                        {isAdmin && <th className="py-2.5 px-2 text-center w-16">Ordem</th>}
                        <th className="py-2.5 px-2.5 text-center w-24">Largada (Grid)</th>
                        <th className="py-2.5 px-2 text-center w-16">Δ Pos</th>
                        <th className="py-2.5 px-3">Piloto & Equipe</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Tempo / Gap</th>
                        {isAdmin && <th className="py-2.5 px-2 text-center">Penalidade</th>}
                        <th className="py-2.5 px-3 text-right">Pts Previstos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono-numbers">
                      {sortedFinishItems.map((item, sortedIdx) => {
                        const pts = computePoints(
                          item.finishPosition,
                          item.driverId,
                          item.status,
                          item.penaltiesPoints
                        );
                        const isPole = item.driverId === activePoleDriverId;
                        const isVR = item.driverId === activeFastestLapDriverId;
                        const delta = (item.gridPosition || 1) - item.finishPosition;

                        return (
                          <tr
                            key={item.driverId}
                            className={`hover:bg-slate-800/30 transition-colors ${
                              item.finishPosition === 1
                                ? 'bg-gradient-to-r from-amber-500/12 via-amber-500/5 to-transparent border-l-2 border-amber-400'
                                : item.finishPosition === 2
                                ? 'bg-gradient-to-r from-slate-200/10 via-slate-300/5 to-transparent border-l-2 border-slate-300'
                                : item.finishPosition === 3
                                ? 'bg-gradient-to-r from-amber-800/15 via-amber-800/5 to-transparent border-l-2 border-amber-600'
                                : 'border-l-2 border-transparent'
                            }`}
                          >
                            {/* Finish Position */}
                            <td className="py-2.5 px-3 text-center font-bold">
                              {item.finishPosition === 1 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded font-mono font-bold bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-slate-950 font-black shadow-md shadow-amber-950/50 ring-1 ring-amber-300/50">
                                  1
                                </span>
                              ) : item.finishPosition === 2 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded font-mono font-bold bg-gradient-to-br from-slate-100 via-slate-300 to-slate-400 text-slate-950 font-black shadow-md shadow-slate-900 ring-1 ring-white/50">
                                  2
                                </span>
                              ) : item.finishPosition === 3 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded font-mono font-bold bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 text-amber-100 font-black shadow-md shadow-amber-950 ring-1 ring-amber-500/40">
                                  3
                                </span>
                              ) : (
                                <span className="text-slate-400 font-mono font-medium">
                                  P{item.finishPosition}
                                </span>
                              )}
                            </td>

                            {/* Move Up/Down Buttons (Admin) */}
                            {isAdmin && (
                              <td className="py-2.5 px-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    disabled={sortedIdx === 0}
                                    onClick={() => moveFinishPosition(sortedIdx, 'up')}
                                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 cursor-pointer"
                                    title="Subir posição de chegada"
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={sortedIdx === sortedFinishItems.length - 1}
                                    onClick={() => moveFinishPosition(sortedIdx, 'down')}
                                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 cursor-pointer"
                                    title="Descer posição de chegada"
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                            )}

                            {/* Start Grid Column & Quick Selector */}
                            <td className="py-2.5 px-2.5 text-center">
                              {isAdmin ? (
                                <select
                                  value={item.gridPosition}
                                  onChange={(e) =>
                                    setDirectGridPosition(item.driverId, Number(e.target.value))
                                  }
                                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-1.5 py-0.5 font-mono cursor-pointer focus:outline-none focus:border-red-500"
                                  title="Ajustar posição de largada deste piloto"
                                >
                                  {sortedFinishItems.map((_, i) => (
                                    <option key={i + 1} value={i + 1}>
                                      Largou P{i + 1}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-slate-400 font-mono text-[11px] bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">
                                  P{item.gridPosition}
                                </span>
                              )}
                            </td>

                            {/* Delta / Positions Gained or Lost */}
                            <td className="py-2.5 px-2 text-center font-mono font-bold text-xs">
                              {delta > 0 ? (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60"
                                  title={`Ganhou ${delta} posição(ões)`}
                                >
                                  <span>+{delta}</span>
                                  <span className="text-[10px]">▲</span>
                                </span>
                              ) : delta < 0 ? (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-800/60"
                                  title={`Perdeu ${Math.abs(delta)} posição(ões)`}
                                >
                                  <span>{delta}</span>
                                  <span className="text-[10px]">▼</span>
                                </span>
                              ) : (
                                <span
                                  className="text-slate-500 font-mono text-[11px]"
                                  title="Manteve a posição de largada"
                                >
                                  =
                                </span>
                              )}
                            </td>

                            {/* Driver & Team */}
                            <td className="py-2.5 px-3 font-sans">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-red-400 font-bold bg-slate-900 px-1 py-0.5 rounded border border-slate-800 text-[11px] tabular-nums">
                                  #{item.number}
                                </span>
                                <div>
                                  <div className="font-semibold text-white flex items-center gap-1.5">
                                    <span>
                                      {users.find((u) => u.id === item.driverId)?.name ||
                                        item.driverName}
                                    </span>
                                    {isPole && (
                                      <span className="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-500/50 px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-1 shadow-sm">
                                        <span>POLE</span>
                                        {hasPoleBonus && (
                                          <span className="text-amber-400">
                                            (+{currentPoleBonusValue})
                                          </span>
                                        )}
                                      </span>
                                    )}
                                    {isVR && (
                                      <span className="text-[10px] bg-purple-950/80 text-purple-300 border border-purple-500/50 px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-1 shadow-sm">
                                        <Zap className="w-2.5 h-2.5 text-purple-400" />
                                        <span>VR</span>
                                        {hasFastestLapBonus && (
                                          <span className="text-purple-300">
                                            (+{currentFastestLapBonusValue})
                                          </span>
                                        )}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                    {item.isReserve ||
                                    item.teamName.toLowerCase().includes('reserva') ? (
                                      <span className="text-[10px] font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/40 px-1.5 py-0.2 rounded">
                                        Reserva
                                      </span>
                                    ) : (
                                      <span>{item.teamName}</span>
                                    )}
                                    <span>·</span>
                                    <span>{item.carModel}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Status Selector */}
                            <td className="py-2.5 px-3">
                              {isAdmin ? (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <select
                                    value={item.status}
                                    onChange={(e) =>
                                      updateItemStatus(
                                        item.driverId,
                                        e.target.value as RaceResultItem['status']
                                      )
                                    }
                                    className={`bg-slate-900 border rounded px-2 py-1 text-xs text-white focus:outline-none cursor-pointer ${
                                      item.status === 'DNS'
                                        ? 'border-rose-500/80 text-rose-300 font-bold'
                                        : 'border-slate-700 focus:border-red-500'
                                    }`}
                                  >
                                    <option value="FINISHED">Completou (FINISHED)</option>
                                    <option value="DNF">Abandono (DNF)</option>
                                    <option value="DNS">Não Largou / Faltou (DNS)</option>
                                    <option value="DSQ">Desclassificado (DSQ)</option>
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => toggleDriverMissedRace(item.driverId)}
                                    className={`px-2 py-1 rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                                      item.status === 'DNS'
                                        ? 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-400 shadow-sm'
                                        : 'bg-slate-800 hover:bg-rose-950/80 text-slate-300 hover:text-rose-200 border border-slate-700 hover:border-rose-700/80'
                                    }`}
                                    title={
                                      item.status === 'DNS'
                                        ? 'Piloto marcado como ausente na corrida. Clique para desmarcar falta.'
                                        : 'Marcar rapidamente que este piloto faltou à corrida (DNS)'
                                    }
                                  >
                                    <UserX className="w-3 h-3" />
                                    <span>{item.status === 'DNS' ? 'Faltou Corrida' : 'Faltou?'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleDriverMissedBoth(item.driverId)}
                                    className={`px-2 py-1 rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                                      item.status === 'DNS' && item.missedQuali
                                        ? 'bg-purple-700 hover:bg-purple-600 text-white border border-purple-400 shadow-sm'
                                        : 'bg-slate-800 hover:bg-purple-950/80 text-slate-300 hover:text-purple-200 border border-slate-700 hover:border-purple-700/80'
                                    }`}
                                    title="Marcar falta no evento completo (Quali + Corrida)"
                                  >
                                    <UserX className="w-3 h-3" />
                                    <span>{item.status === 'DNS' && item.missedQuali ? 'Faltou Ambos' : 'Faltou Ambos?'}</span>
                                  </button>
                                </div>
                              ) : (
                                <span
                                  className={
                                    item.status === 'FINISHED'
                                      ? 'text-emerald-400 font-medium'
                                      : item.status === 'DNS'
                                      ? 'text-rose-400 font-bold bg-rose-950/60 border border-rose-800/80 px-2 py-0.5 rounded text-[11px] inline-flex items-center gap-1'
                                      : 'text-red-400 font-semibold'
                                  }
                                >
                                  {item.status === 'DNS' && <UserX className="w-3 h-3 text-rose-400" />}
                                  {item.status === 'DNS'
                                    ? item.missedQuali
                                      ? 'Faltou Quali + Corrida'
                                      : 'Faltou à corrida'
                                    : item.status}
                                </span>
                              )}
                            </td>

                            {/* Time / Gap */}
                            <td className="py-2.5 px-3 font-mono-numbers text-slate-300">
                              {isAdmin ? (
                                <input
                                  type="text"
                                  value={item.gap || ''}
                                  placeholder={sortedIdx === 0 ? 'Líder' : '+5.200s'}
                                  onChange={(e) => {
                                    const currentList =
                                      raceType === 'sprint' ? sprintResultsList : mainResultsList;
                                    const copy = currentList.map((r) =>
                                      r.driverId === item.driverId ? { ...r, gap: e.target.value } : r
                                    );
                                    setResultsList(copy);
                                  }}
                                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white w-28 focus:outline-none focus:border-red-500 font-mono-numbers"
                                />
                              ) : (
                                item.gap || '-'
                              )}
                            </td>

                            {/* Penalties (Admin only) */}
                            {isAdmin && (
                              <td className="py-2.5 px-2 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="50"
                                  value={item.penaltiesPoints || 0}
                                  onChange={(e) =>
                                    updateItemPenalties(item.driverId, Number(e.target.value))
                                  }
                                  className="w-14 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-center text-red-400 font-mono-numbers focus:outline-none focus:border-red-500"
                                  title="Penalidade em pontos deduzidos"
                                />
                              </td>
                            )}

                            {/* Points Awarded */}
                            <td className="py-2.5 px-3 text-right">
                              <div className="inline-flex flex-col items-end">
                                <span className="font-bold text-white text-sm bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                  {pts} pts
                                </span>
                                {item.status === 'FINISHED' &&
                                  ((isPole && hasPoleBonus) || (isVR && hasFastestLapBonus)) && (
                                    <span className="text-[9px] text-emerald-400 mt-0.5 font-sans font-medium">
                                      inclui {isPole && hasPoleBonus ? `+${currentPoleBonusValue} Pole` : ''}{' '}
                                      {isVR && hasFastestLapBonus ? `+${currentFastestLapBonusValue} VR` : ''}
                                    </span>
                                  )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            {isAdmin ? (
              <span>
                Ao homologar, as tabelas de classificação, estatísticas e troféus serão calculados
                imediatamente.
              </span>
            ) : (
              <span>Classificação oficial homologada pela Direção de Prova.</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
            >
              Fechar
            </button>

            {isAdmin && modalTab === 'results' && gridStep === 'grid' && (
              <button
                type="button"
                onClick={() => setGridStep('finish')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Avançar para Chegada</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {isAdmin && (
              <button
                onClick={handleSave}
                className={`px-5 py-2 rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  raceType === 'sprint'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold shadow-amber-950/50'
                    : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-red-950'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>
                  {raceType === 'sprint'
                    ? 'Salvar & Homologar Sprint'
                    : 'Salvar & Homologar Resultados'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
