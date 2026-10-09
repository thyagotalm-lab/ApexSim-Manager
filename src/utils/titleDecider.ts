import { Championship, DriverStanding, StageRound, User } from '../types';
import { calculateDriverStandings } from './standings';

export type TitleContentionStatus =
  | 'CHAMPION_CLINCHED'    // Campeão Antecipado Garantido
  | 'CHAMPION_FINAL'       // Campeão da Temporada
  | 'IN_CONTENTION_LEADER' // Líder que depende apenas de si
  | 'IN_CONTENTION'        // Na disputa matemática
  | 'ELIMINATED';          // Matematicamente sem chances

export interface DriverTitleMath {
  driverId: string;
  driverName: string;
  teamName: string;
  number: number;
  currentRank: number;
  currentPoints: number;
  wins: number;
  podiums: number;
  poles: number;
  maxPossiblePoints: number;
  gapToLeader: number;
  status: TitleContentionStatus;
  statusLabel: string;
  badgeColor: string;
  pointsNeededToGuarantee?: number;
  summaryText: string;
}

export interface ChampionshipTitleOverview {
  totalStages: number;
  completedStagesCount: number;
  remainingStagesCount: number;
  pointsPerWin: number;
  poleBonus: number;
  fastestLapBonus: number;
  maxPointsPerRound: number;
  totalPointsRemaining: number;
  isSeasonFinished: boolean;
  isChampionDecided: boolean;
  championDriver?: DriverTitleMath;
  contenders: DriverTitleMath[];
  eliminated: DriverTitleMath[];
  activeContendersCount: number;
}

export interface SimulatedRoundInput {
  stageId: string;
  roundNumber: number;
  trackName: string;
  trackFlag: string;
  position: number; // 1 = P1, 2 = P2 ... 0 = DNF / Out of points
  hasPole: boolean;
  hasFastestLap: boolean;
}

export function calculateTitleMathematics(
  championship: Championship,
  users?: User[]
): ChampionshipTitleOverview {
  const standings = calculateDriverStandings(championship, users);
  const stages = championship.stages || [];
  const completedStages = stages.filter((s) => s.status === 'Concluída');
  const remainingStages = stages.filter((s) => s.status !== 'Concluída');

  const scoringRule = championship.scoringRule || {
    positions: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
    poleBonus: 1,
    fastestLapBonus: 1,
    dropWorstRounds: 0,
  };

  const p1Points = scoringRule.positions?.[0] || 25;
  const poleBonus = scoringRule.poleBonus || 0;
  const fastestLapBonus = scoringRule.fastestLapBonus || 0;
  
  // Standard max points per normal round (P1 + Pole + VR)
  const maxPointsPerRound = p1Points + poleBonus + fastestLapBonus;

  // Sum points available across all remaining rounds (accounting for sprint rounds if any)
  let totalPointsRemaining = 0;
  const sprintMaxP1 = scoringRule.sprintPositions?.[0] ?? 8;
  remainingStages.forEach((stage) => {
    // If stage has sprint and sprint results are not yet completed, add max sprint points
    const sprintExtra = stage.hasSprint && (!stage.sprintResults || stage.sprintResults.length === 0)
      ? sprintMaxP1
      : 0;
    totalPointsRemaining += maxPointsPerRound + sprintExtra;
  });

  const isSeasonFinished = remainingStages.length === 0 && completedStages.length > 0;
  const leader = standings[0];
  const leaderPoints = leader?.totalPoints || 0;
  const secondPlace = standings[1];

  // Leader is mathematically clinched ahead of time if:
  // Leader points > second place's maximum theoretical points
  const p2MaxPossible = secondPlace ? secondPlace.totalPoints + totalPointsRemaining : 0;
  const isChampionDecided = isSeasonFinished || (leader && secondPlace && leaderPoints > p2MaxPossible);

  const contenders: DriverTitleMath[] = [];
  const eliminated: DriverTitleMath[] = [];

  standings.forEach((driver) => {
    const maxPossiblePoints = driver.totalPoints + totalPointsRemaining;
    const gapToLeader = leader ? Math.max(0, leaderPoints - driver.totalPoints) : 0;

    let status: TitleContentionStatus = 'IN_CONTENTION';
    let statusLabel = 'Na Disputa Matemática';
    let badgeColor = 'bg-blue-950/80 text-blue-300 border-blue-800';
    let summaryText = '';
    let pointsNeededToGuarantee: number | undefined = undefined;

    if (isSeasonFinished) {
      if (driver.rank === 1) {
        status = 'CHAMPION_FINAL';
        statusLabel = 'Campeão da Temporada';
        badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/60';
        summaryText = `Conquistou o campeonato oficial com ${driver.totalPoints} pontos e ${driver.wins} vitórias!`;
      } else {
        status = 'ELIMINATED';
        statusLabel = `${driver.rank}º Colocado`;
        badgeColor = 'bg-slate-800/80 text-slate-400 border-slate-700';
        summaryText = `Temporada concluída com ${driver.totalPoints} pontos.`;
      }
    } else if (isChampionDecided) {
      if (driver.rank === 1) {
        status = 'CHAMPION_CLINCHED';
        statusLabel = 'Campeão Antecipado!';
        badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-amber-500/20 shadow-md';
        summaryText = `Garantido como Campeão! Mesmo com ${remainingStages.length} etapas restantes, nenhum rival pode superá-lo.`;
      } else {
        status = 'ELIMINATED';
        statusLabel = 'Matematicamente Sem Chances';
        badgeColor = 'bg-red-950/40 text-red-400 border-red-900/60';
        summaryText = `Déficit de ${gapToLeader} pontos não pode mais ser revertido nas ${remainingStages.length} etapas restantes.`;
      }
    } else {
      // Championship still actively open
      if (maxPossiblePoints < leaderPoints) {
        status = 'ELIMINATED';
        statusLabel = 'Matematicamente Eliminado';
        badgeColor = 'bg-red-950/40 text-red-400 border-red-900/60';
        summaryText = `Máximo possível (${maxPossiblePoints} pts) é inferior aos ${leaderPoints} pts atuais do líder.`;
      } else if (driver.rank === 1) {
        // Leader
        const pointsAheadOfP2 = leaderPoints - (secondPlace?.totalPoints || 0);
        pointsNeededToGuarantee = Math.max(0, p2MaxPossible - leaderPoints + 1);

        status = 'IN_CONTENTION_LEADER';
        statusLabel = 'Líder · Depende Apenas de Si';
        badgeColor = 'bg-emerald-950/80 text-emerald-300 border-emerald-700';
        summaryText = `Lidera por ${pointsAheadOfP2} pts. Precisa somar ${pointsNeededToGuarantee} dos ${totalPointsRemaining} pts restantes para selar o título sem depender de ninguém.`;
      } else {
        // Contender in 2nd, 3rd, 4th...
        const maxLeaderPoints = leaderPoints + totalPointsRemaining;
        status = 'IN_CONTENTION';
        statusLabel = 'Chances Reais de Título';
        badgeColor = 'bg-blue-950/80 text-blue-300 border-blue-800';

        if (gapToLeader <= totalPointsRemaining) {
          summaryText = `Está a ${gapToLeader} pts da liderança com ${totalPointsRemaining} pts em jogo. Pode alcançar até ${maxPossiblePoints} pontos.`;
        } else {
          summaryText = `Necessita de tropeços do líder para reverter a desvantagem matemática.`;
        }
      }
    }

    const mathItem: DriverTitleMath = {
      driverId: driver.driverId,
      driverName: driver.driverName,
      teamName: driver.teamName,
      number: driver.number,
      currentRank: driver.rank,
      currentPoints: driver.totalPoints,
      wins: driver.wins,
      podiums: driver.podiums,
      poles: driver.poles,
      maxPossiblePoints,
      gapToLeader,
      status,
      statusLabel,
      badgeColor,
      pointsNeededToGuarantee,
      summaryText,
    };

    if (status === 'ELIMINATED') {
      eliminated.push(mathItem);
    } else {
      contenders.push(mathItem);
    }
  });

  return {
    totalStages: stages.length,
    completedStagesCount: completedStages.length,
    remainingStagesCount: remainingStages.length,
    pointsPerWin: p1Points,
    poleBonus,
    fastestLapBonus,
    maxPointsPerRound,
    totalPointsRemaining,
    isSeasonFinished,
    isChampionDecided,
    championDriver: isChampionDecided ? contenders[0] || eliminated[0] : undefined,
    contenders,
    eliminated,
    activeContendersCount: contenders.length,
  };
}

export function simulateDriverScenario(
  championship: Championship,
  targetDriverId: string,
  targetDriverSimulatedStages: Record<string, { finishPos: number; hasPole: boolean; hasFastestLap: boolean }>,
  rivalDriverId?: string,
  rivalDriverSimulatedStages?: Record<string, { finishPos: number; hasPole: boolean; hasFastestLap: boolean }>
): {
  projectedStandings: Array<{
    driverId: string;
    driverName: string;
    teamName: string;
    number: number;
    initialPoints: number;
    simulatedPointsAdded: number;
    projectedTotal: number;
    projectedRank: number;
    isChampion: boolean;
  }>;
  targetDriverProjectedRank: number;
  isTargetDriverChampion: boolean;
} {
  const standings = calculateDriverStandings(championship);
  const remainingStages = championship.stages.filter((s) => s.status !== 'Concluída');
  const scoring = championship.scoringRule?.positions || [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
  const poleBonus = championship.scoringRule?.poleBonus || 0;
  const flBonus = championship.scoringRule?.fastestLapBonus || 0;

  const pointsMap = new Map<string, { initial: number; added: number; name: string; team: string; number: number }>();

  standings.forEach((d) => {
    pointsMap.set(d.driverId, {
      initial: d.totalPoints,
      added: 0,
      name: d.driverName,
      team: d.teamName,
      number: d.number,
    });
  });

  const sprintScoring = championship.scoringRule?.sprintPositions || [8, 7, 6, 5, 4, 3, 2, 1];

  // Calculate points added for target driver
  let targetAdded = 0;
  remainingStages.forEach((stage) => {
    const sim = targetDriverSimulatedStages[stage.id];
    if (sim && sim.finishPos > 0 && sim.finishPos <= scoring.length) {
      const posPts = scoring[sim.finishPos - 1] || 0;
      const polePts = sim.hasPole ? poleBonus : 0;
      const flPts = sim.hasFastestLap ? flBonus : 0;
      const sprintPts = stage.hasSprint && (!stage.sprintResults || stage.sprintResults.length === 0) && sim.finishPos <= sprintScoring.length
        ? (sprintScoring[sim.finishPos - 1] || 0)
        : 0;
      targetAdded += posPts + polePts + flPts + sprintPts;
    }
  });

  const targetEntry = pointsMap.get(targetDriverId);
  if (targetEntry) {
    targetEntry.added = targetAdded;
  }

  // Calculate points added for rival driver if provided
  if (rivalDriverId && rivalDriverSimulatedStages) {
    let rivalAdded = 0;
    remainingStages.forEach((stage) => {
      const sim = rivalDriverSimulatedStages[stage.id];
      if (sim && sim.finishPos > 0 && sim.finishPos <= scoring.length) {
        const posPts = scoring[sim.finishPos - 1] || 0;
        const polePts = sim.hasPole ? poleBonus : 0;
        const flPts = sim.hasFastestLap ? flBonus : 0;
        const sprintPts = stage.hasSprint && (!stage.sprintResults || stage.sprintResults.length === 0) && sim.finishPos <= sprintScoring.length
          ? (sprintScoring[sim.finishPos - 1] || 0)
          : 0;
        rivalAdded += posPts + polePts + flPts + sprintPts;
      }
    });

    const rivalEntry = pointsMap.get(rivalDriverId);
    if (rivalEntry) {
      rivalEntry.added = rivalAdded;
    }
  }

  const projectedStandings = Array.from(pointsMap.entries()).map(([driverId, data]) => ({
    driverId,
    driverName: data.name,
    teamName: data.team,
    number: data.number,
    initialPoints: data.initial,
    simulatedPointsAdded: data.added,
    projectedTotal: data.initial + data.added,
    projectedRank: 1,
    isChampion: false,
  }));

  projectedStandings.sort((a, b) => b.projectedTotal - a.projectedTotal);

  projectedStandings.forEach((item, index) => {
    item.projectedRank = index + 1;
    item.isChampion = index === 0;
  });

  const targetProjected = projectedStandings.find((s) => s.driverId === targetDriverId);
  const targetDriverProjectedRank = targetProjected ? targetProjected.projectedRank : 99;
  const isTargetDriverChampion = targetDriverProjectedRank === 1;

  return {
    projectedStandings,
    targetDriverProjectedRank,
    isTargetDriverChampion,
  };
}
