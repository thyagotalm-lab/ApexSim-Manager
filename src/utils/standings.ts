import { Championship, ConstructorStanding, DriverStanding, RaceResultItem, User } from '../types';
import { isDeletedUserAccount } from '../services/userService';

export const isReserveDriverOrTeam = (nameOrTeam?: string): boolean => {
  if (!nameOrTeam) return false;
  const s = nameOrTeam.trim().toLowerCase();
  return s === 'reserva' || s === 'piloto reserva' || s === 'pilotos reservas' || s.startsWith('reserva ');
};

// Helper to resolve the canonical, up-to-date driver name from registered users
const resolveCanonicalDriverName = (
  driverId: string | undefined,
  fallbackName: string,
  userEmail?: string,
  users?: User[]
): string => {
  if (!users || users.length === 0) return fallbackName;
  const cleanId = (driverId || '').trim();
  const cleanEmail = (userEmail || '').toLowerCase().trim();
  const cleanName = (fallbackName || '').toLowerCase().trim();

  const user = users.find((u) => {
    if (cleanId && u.id === cleanId) return true;
    if (cleanEmail && u.email?.toLowerCase().trim() === cleanEmail) return true;
    if (cleanName && u.name.toLowerCase().trim() === cleanName) return true;
    return false;
  });

  return user?.name || fallbackName;
};

export function calculateDriverStandings(
  championship: Championship,
  users?: User[]
): DriverStanding[] {
  const activeStages = championship.stages.filter(
    (stage) =>
      (stage.results && stage.results.length > 0) ||
      (stage.hasSprint && stage.sprintResults && stage.sprintResults.length > 0)
  );

  const driversMap = new Map<string, {
    driverId: string;
    driverName: string;
    teamName: string;
    carModel: string;
    number: number;
    roundPoints: Record<number, number>;
    roundSprintPoints: Record<number, number>;
    roundMainPoints: Record<number, number>;
    totalPoints: number;
    sprintTotalPoints: number;
    wins: number;
    podiums: number;
    poles: number;
    fastestLaps: number;
    dnfs: number;
    bestFinish: number;
    isReserve: boolean;
  }>();

  // Pre-seed from approved and reserve registrations so that enrolled drivers appear even if not yet scored
  championship.registrations
    .filter((r) => (r.status === 'APROVADO' || r.status === 'RESERVA' || r.isReserve) && !isDeletedUserAccount(r))
    .forEach((reg) => {
      const isReserve = reg.status === 'RESERVA' || Boolean(reg.isReserve) || isReserveDriverOrTeam(reg.teamName);
      const canonicalName = resolveCanonicalDriverName(reg.userId, reg.userName, reg.userEmail, users);
      driversMap.set(reg.userId, {
        driverId: reg.userId,
        driverName: canonicalName,
        teamName: isReserve ? 'Reserva' : reg.teamName,
        carModel: reg.carModel,
        number: reg.carNumber,
        roundPoints: {},
        roundSprintPoints: {},
        roundMainPoints: {},
        totalPoints: 0,
        sprintTotalPoints: 0,
        wins: 0,
        podiums: 0,
        poles: 0,
        fastestLaps: 0,
        dnfs: 0,
        bestFinish: 999,
        isReserve,
      });
    });

  // Helper to get or initialize driver in driversMap
  const getOrCreateDriver = (
    driverId: string,
    fallbackName: string,
    teamName: string,
    carModel: string,
    number: number,
    isReserve: boolean,
    userEmail?: string
  ) => {
    if (
      isDeletedUserAccount({ id: driverId, name: fallbackName, email: userEmail })
    ) {
      return null;
    }
    const canonicalName = resolveCanonicalDriverName(driverId, fallbackName, userEmail, users);
    let driver = driversMap.get(driverId);
    if (!driver) {
      driver = {
        driverId,
        driverName: canonicalName,
        teamName: isReserve ? 'Reserva' : teamName,
        carModel,
        number,
        roundPoints: {},
        roundSprintPoints: {},
        roundMainPoints: {},
        totalPoints: 0,
        sprintTotalPoints: 0,
        wins: 0,
        podiums: 0,
        poles: 0,
        fastestLaps: 0,
        dnfs: 0,
        bestFinish: 999,
        isReserve,
      };
      driversMap.set(driverId, driver);
    } else {
      driver.driverName = canonicalName;
      if (isReserve) {
        driver.isReserve = true;
        driver.teamName = 'Reserva';
      }
    }
    return driver;
  };

  // Process all active stages with results or sprint results
  activeStages.forEach((stage) => {
    // 1. Process Main Race Results
    if (stage.results && stage.results.length > 0) {
      stage.results.forEach((result: RaceResultItem) => {
        const reg = championship.registrations.find((r) => r.userId === result.driverId);
        const isReserve =
          Boolean(result.isReserve) ||
          reg?.status === 'RESERVA' ||
          Boolean(reg?.isReserve) ||
          isReserveDriverOrTeam(result.teamName) ||
          isReserveDriverOrTeam(reg?.teamName);

        const driver = getOrCreateDriver(
          result.driverId,
          reg?.userName || result.driverName,
          result.teamName,
          result.carModel,
          result.number,
          isReserve,
          reg?.userEmail
        );

        if (!driver) return;

        // Record main race stage points
        const points = result.pointsAwarded || 0;
        driver.roundMainPoints[stage.roundNumber] = (driver.roundMainPoints[stage.roundNumber] || 0) + points;
        driver.roundPoints[stage.roundNumber] = (driver.roundPoints[stage.roundNumber] || 0) + points;
        driver.totalPoints += points;

        if (result.status === 'FINISHED') {
          if (result.finishPosition === 1) driver.wins += 1;
          if (result.finishPosition <= 3) driver.podiums += 1;
          if (result.finishPosition < driver.bestFinish) driver.bestFinish = result.finishPosition;
        } else if (result.status === 'DNF' || result.status === 'DSQ') {
          driver.dnfs += 1;
        }

        if (result.hasPole) driver.poles += 1;
        if (result.hasFastestLap) driver.fastestLaps += 1;
      });
    }

    // 2. Process Sprint Race Results (Reserve drivers also score for driver championship)
    if (stage.hasSprint && stage.sprintResults && stage.sprintResults.length > 0) {
      stage.sprintResults.forEach((sprintResult: RaceResultItem) => {
        const reg = championship.registrations.find((r) => r.userId === sprintResult.driverId);
        const isReserve =
          Boolean(sprintResult.isReserve) ||
          reg?.status === 'RESERVA' ||
          Boolean(reg?.isReserve) ||
          isReserveDriverOrTeam(sprintResult.teamName) ||
          isReserveDriverOrTeam(reg?.teamName);

        const driver = getOrCreateDriver(
          sprintResult.driverId,
          reg?.userName || sprintResult.driverName,
          sprintResult.teamName,
          sprintResult.carModel,
          sprintResult.number,
          isReserve,
          reg?.userEmail
        );

        if (!driver) return;

        // Record sprint stage points
        const points = sprintResult.pointsAwarded || 0;
        driver.roundSprintPoints[stage.roundNumber] = (driver.roundSprintPoints[stage.roundNumber] || 0) + points;
        driver.roundPoints[stage.roundNumber] = (driver.roundPoints[stage.roundNumber] || 0) + points;
        driver.totalPoints += points;
        driver.sprintTotalPoints += points;
      });
    }
  });

  const standingsList = Array.from(driversMap.values());

  // Sort: totalPoints DESC, wins DESC, podiums DESC, bestFinish ASC
  standingsList.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.podiums !== a.podiums) return b.podiums - a.podiums;
    return a.bestFinish - b.bestFinish;
  });

  const leaderPoints = standingsList.length > 0 ? standingsList[0].totalPoints : 0;

  return standingsList.map((driver, index) => ({
    rank: index + 1,
    driverId: driver.driverId,
    driverName: driver.driverName,
    teamName: driver.isReserve ? 'Reserva' : driver.teamName,
    carModel: driver.carModel,
    number: driver.number,
    roundPoints: driver.roundPoints,
    roundSprintPoints: driver.roundSprintPoints,
    roundMainPoints: driver.roundMainPoints,
    totalPoints: driver.totalPoints,
    sprintTotalPoints: driver.sprintTotalPoints,
    wins: driver.wins,
    podiums: driver.podiums,
    poles: driver.poles,
    fastestLaps: driver.fastestLaps,
    dnfs: driver.dnfs,
    gap: index === 0 ? '-' : `-${leaderPoints - driver.totalPoints} pts`,
    isReserve: driver.isReserve,
  }));
}

export function calculateConstructorStandings(
  championship: Championship,
  users?: User[]
): ConstructorStanding[] {
  const activeStages = championship.stages.filter(
    (stage) =>
      (stage.results && stage.results.length > 0) ||
      (stage.hasSprint && stage.sprintResults && stage.sprintResults.length > 0)
  );

  const teamMap = new Map<string, {
    teamName: string;
    carBrand: string;
    drivers: Set<string>;
    roundPoints: Record<number, number>;
    roundSprintPoints: Record<number, number>;
    roundMainPoints: Record<number, number>;
    totalPoints: number;
    sprintTotalPoints: number;
    wins: number;
    podiums: number;
  }>();

  // Seed from non-reserve approved registrations
  championship.registrations
    .filter((r) => r.status === 'APROVADO' && !r.isReserve && !isReserveDriverOrTeam(r.teamName) && !isDeletedUserAccount(r))
    .forEach((reg) => {
      let team = teamMap.get(reg.teamName);
      if (!team) {
        team = {
          teamName: reg.teamName,
          carBrand: reg.carModel.split(' ')[0] || 'GT',
          drivers: new Set<string>(),
          roundPoints: {},
          roundSprintPoints: {},
          roundMainPoints: {},
          totalPoints: 0,
          sprintTotalPoints: 0,
          wins: 0,
          podiums: 0,
        };
        teamMap.set(reg.teamName, team);
      }
      const canonicalName = resolveCanonicalDriverName(reg.userId, reg.userName, reg.userEmail, users);
      team.drivers.add(canonicalName);
    });

  // Aggregate points from active stages
  // NOTE: Reserve drivers score ONLY for the Driver Standings, NEVER for Constructor Standings (in both Main Race and Sprint)
  activeStages.forEach((stage) => {
    // 1. Main race points for constructors
    if (stage.results && stage.results.length > 0) {
      stage.results.forEach((result: RaceResultItem) => {
        const reg = championship.registrations.find((r) => r.userId === result.driverId);
        const isReserveDriver =
          Boolean(result.isReserve) ||
          reg?.status === 'RESERVA' ||
          Boolean(reg?.isReserve) ||
          isReserveDriverOrTeam(result.teamName) ||
          isReserveDriverOrTeam(reg?.teamName);

        // If driver is a reserve, strictly skip counting points for constructor standings
        if (isReserveDriver) {
          return;
        }

        let team = teamMap.get(result.teamName);
        if (!team) {
          team = {
            teamName: result.teamName,
            carBrand: result.carModel.split(' ')[0] || 'GT',
            drivers: new Set<string>(),
            roundPoints: {},
            roundSprintPoints: {},
            roundMainPoints: {},
            totalPoints: 0,
            sprintTotalPoints: 0,
            wins: 0,
            podiums: 0,
          };
          teamMap.set(result.teamName, team);
        }

        const canonicalName = resolveCanonicalDriverName(
          result.driverId,
          reg?.userName || result.driverName,
          reg?.userEmail,
          users
        );
        team.drivers.add(canonicalName);
        const points = result.pointsAwarded || 0;
        team.roundMainPoints[stage.roundNumber] = (team.roundMainPoints[stage.roundNumber] || 0) + points;
        team.roundPoints[stage.roundNumber] = (team.roundPoints[stage.roundNumber] || 0) + points;
        team.totalPoints += points;

        if (result.status === 'FINISHED') {
          if (result.finishPosition === 1) team.wins += 1;
          if (result.finishPosition <= 3) team.podiums += 1;
        }
      });
    }

    // 2. Sprint race points for constructors (Strictly skipping reserve drivers)
    if (stage.hasSprint && stage.sprintResults && stage.sprintResults.length > 0) {
      stage.sprintResults.forEach((sprintResult: RaceResultItem) => {
        const reg = championship.registrations.find((r) => r.userId === sprintResult.driverId);
        const isReserveDriver =
          Boolean(sprintResult.isReserve) ||
          reg?.status === 'RESERVA' ||
          Boolean(reg?.isReserve) ||
          isReserveDriverOrTeam(sprintResult.teamName) ||
          isReserveDriverOrTeam(reg?.teamName);

        // If driver is a reserve, strictly skip counting sprint points for constructor standings
        if (isReserveDriver) {
          return;
        }

        let team = teamMap.get(sprintResult.teamName);
        if (!team) {
          team = {
            teamName: sprintResult.teamName,
            carBrand: sprintResult.carModel.split(' ')[0] || 'GT',
            drivers: new Set<string>(),
            roundPoints: {},
            roundSprintPoints: {},
            roundMainPoints: {},
            totalPoints: 0,
            sprintTotalPoints: 0,
            wins: 0,
            podiums: 0,
          };
          teamMap.set(sprintResult.teamName, team);
        }

        const canonicalName = resolveCanonicalDriverName(
          sprintResult.driverId,
          reg?.userName || sprintResult.driverName,
          reg?.userEmail,
          users
        );
        team.drivers.add(canonicalName);
        const points = sprintResult.pointsAwarded || 0;
        team.roundSprintPoints[stage.roundNumber] = (team.roundSprintPoints[stage.roundNumber] || 0) + points;
        team.roundPoints[stage.roundNumber] = (team.roundPoints[stage.roundNumber] || 0) + points;
        team.totalPoints += points;
        team.sprintTotalPoints += points;
      });
    }
  });

  const standingsList = Array.from(teamMap.values()).filter((t) => !isReserveDriverOrTeam(t.teamName));

  standingsList.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.podiums - a.podiums;
  });

  const leaderPoints = standingsList.length > 0 ? standingsList[0].totalPoints : 0;

  return standingsList.map((team, index) => ({
    rank: index + 1,
    teamName: team.teamName,
    carBrand: team.carBrand,
    driverNames: Array.from(team.drivers),
    roundPoints: team.roundPoints,
    roundSprintPoints: team.roundSprintPoints,
    roundMainPoints: team.roundMainPoints,
    totalPoints: team.totalPoints,
    sprintTotalPoints: team.sprintTotalPoints,
    wins: team.wins,
    podiums: team.podiums,
    gap: index === 0 ? '-' : `-${leaderPoints - team.totalPoints} pts`,
  }));
}
