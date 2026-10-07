import { Championship, ConstructorStanding, DriverStanding, RaceResultItem } from '../types';

export const isReserveDriverOrTeam = (nameOrTeam?: string): boolean => {
  if (!nameOrTeam) return false;
  const s = nameOrTeam.trim().toLowerCase();
  return s === 'reserva' || s === 'piloto reserva' || s === 'pilotos reservas' || s.startsWith('reserva ');
};

export function calculateDriverStandings(championship: Championship): DriverStanding[] {
  const completedStages = championship.stages.filter(
    (stage) => stage.status === 'Concluída' && stage.results && stage.results.length > 0
  );

  const driversMap = new Map<string, {
    driverId: string;
    driverName: string;
    teamName: string;
    carModel: string;
    number: number;
    roundPoints: Record<number, number>;
    totalPoints: number;
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
    .filter((r) => r.status === 'APROVADO' || r.status === 'RESERVA' || r.isReserve)
    .forEach((reg) => {
      const isReserve = reg.status === 'RESERVA' || Boolean(reg.isReserve) || isReserveDriverOrTeam(reg.teamName);
      driversMap.set(reg.userId, {
        driverId: reg.userId,
        driverName: reg.userName,
        teamName: isReserve ? 'Reserva' : reg.teamName,
        carModel: reg.carModel,
        number: reg.carNumber,
        roundPoints: {},
        totalPoints: 0,
        wins: 0,
        podiums: 0,
        poles: 0,
        fastestLaps: 0,
        dnfs: 0,
        bestFinish: 999,
        isReserve,
      });
    });

  // Process all completed stages
  completedStages.forEach((stage) => {
    stage.results?.forEach((result: RaceResultItem) => {
      const reg = championship.registrations.find((r) => r.userId === result.driverId);
      const isReserve =
        Boolean(result.isReserve) ||
        reg?.status === 'RESERVA' ||
        Boolean(reg?.isReserve) ||
        isReserveDriverOrTeam(result.teamName) ||
        isReserveDriverOrTeam(reg?.teamName);

      let driver = driversMap.get(result.driverId);
      if (!driver) {
        driver = {
          driverId: result.driverId,
          driverName: result.driverName,
          teamName: isReserve ? 'Reserva' : result.teamName,
          carModel: result.carModel,
          number: result.number,
          roundPoints: {},
          totalPoints: 0,
          wins: 0,
          podiums: 0,
          poles: 0,
          fastestLaps: 0,
          dnfs: 0,
          bestFinish: 999,
          isReserve,
        };
        driversMap.set(result.driverId, driver);
      } else {
        if (isReserve) {
          driver.isReserve = true;
          driver.teamName = 'Reserva';
        }
      }

      // Record stage points
      const points = result.pointsAwarded || 0;
      driver.roundPoints[stage.roundNumber] = points;
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
    totalPoints: driver.totalPoints,
    wins: driver.wins,
    podiums: driver.podiums,
    poles: driver.poles,
    fastestLaps: driver.fastestLaps,
    dnfs: driver.dnfs,
    gap: index === 0 ? '-' : `-${leaderPoints - driver.totalPoints} pts`,
    isReserve: driver.isReserve,
  }));
}

export function calculateConstructorStandings(championship: Championship): ConstructorStanding[] {
  const completedStages = championship.stages.filter(
    (stage) => stage.status === 'Concluída' && stage.results && stage.results.length > 0
  );

  const teamMap = new Map<string, {
    teamName: string;
    carBrand: string;
    drivers: Set<string>;
    roundPoints: Record<number, number>;
    totalPoints: number;
    wins: number;
    podiums: number;
  }>();

  // Seed from non-reserve approved registrations
  championship.registrations
    .filter((r) => r.status === 'APROVADO' && !r.isReserve && !isReserveDriverOrTeam(r.teamName))
    .forEach((reg) => {
      let team = teamMap.get(reg.teamName);
      if (!team) {
        team = {
          teamName: reg.teamName,
          carBrand: reg.carModel.split(' ')[0] || 'GT',
          drivers: new Set<string>(),
          roundPoints: {},
          totalPoints: 0,
          wins: 0,
          podiums: 0,
        };
        teamMap.set(reg.teamName, team);
      }
      team.drivers.add(reg.userName);
    });

  // Aggregate points from completed stages
  // NOTE: Reserve drivers score ONLY for the Driver Standings, NEVER for Constructor Standings
  completedStages.forEach((stage) => {
    stage.results?.forEach((result: RaceResultItem) => {
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
          totalPoints: 0,
          wins: 0,
          podiums: 0,
        };
        teamMap.set(result.teamName, team);
      }

      team.drivers.add(result.driverName);
      const points = result.pointsAwarded || 0;
      team.roundPoints[stage.roundNumber] = (team.roundPoints[stage.roundNumber] || 0) + points;
      team.totalPoints += points;

      if (result.status === 'FINISHED') {
        if (result.finishPosition === 1) team.wins += 1;
        if (result.finishPosition <= 3) team.podiums += 1;
      }
    });
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
    totalPoints: team.totalPoints,
    wins: team.wins,
    podiums: team.podiums,
    gap: index === 0 ? '-' : `-${leaderPoints - team.totalPoints} pts`,
  }));
}
