export type UserRole = 'admin' | 'pilot' | 'driver';

export interface UserStats {
  races: number;
  wins: number;
  podiums: number;
  poles: number;
  fastestLaps: number;
  points: number;
  dnfs: number;
  safetyRating: string;
  simRating: number;
}

export type DriverCategory =
  | 'Elite Legend'
  | 'Master Pro'
  | 'Pro Oficial'
  | 'Semi-Pro'
  | 'Rookie / Amador'
  | 'Pro'
  | 'Silver'
  | 'Bronze'
  | 'Am';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  avatar: string;
  role: UserRole;
  gamingPlatform?: string;
  gamingId?: string;
  steamId?: string;
  discordTag?: string;
  country: string;
  racingNumber?: number;
  driverCategory?: DriverCategory;
  administeredLeagueIds: string[];
  stats: UserStats;
  teamName?: string;
  teamTag?: string;
}

export type Simulator = 
  | 'Assetto Corsa Competizione'
  | 'iRacing'
  | 'Automobilista 2'
  | 'F1 25'
  | 'F1 26'
  | 'F1 24'
  | 'rFactor 2'
  | 'Le Mans Ultimate';

export type ChampionshipCategory = 
  | 'GT3'
  | 'Formula 1'
  | 'Protótipos GTP'
  | 'Touring Car TCR'
  | 'Stock Car Pro'
  | 'Porsche Cup';

export type ChampionshipStatus = 
  | 'Inscrições Abertas'
  | 'Em Andamento'
  | 'Finalizado'
  | 'Em Breve';

export interface ScoringRule {
  name: string;
  positions: number[];
  poleBonus: number;
  fastestLapBonus: number;
  dropWorstRounds: number;
  sprintPositions?: number[];
  sprintPoleBonus?: number;
  sprintFastestLapBonus?: number;
}

export interface RaceResultItem {
  driverId: string;
  driverName: string;
  teamName: string;
  carModel: string;
  number: number;
  gridPosition: number;
  finishPosition: number;
  status: 'FINISHED' | 'DNF' | 'DNS' | 'DSQ';
  totalTime?: string;
  gap?: string;
  pointsAwarded: number;
  penaltiesPoints?: number;
  penaltyNotes?: string;
  hasFastestLap?: boolean;
  hasPole?: boolean;
  isReserve?: boolean;
}

export type StageWeather = 'Pista Seca' | 'Chuva Leve' | 'Chuva Forte' | 'Variável' | 'Noturna';

export interface DriverOfTheDayVote {
  winnerDriverId?: string;
  winnerDriverName?: string;
  totalVotes: number;
  votesByDriverId: Record<string, number>;
  voterUserIds: Record<string, string>;
  votingClosed?: boolean;
  closesAt?: string;
}

export interface CommunityTrophies {
  driverOfTheDay?: DriverOfTheDayVote;
  mostOvertakesDriverId?: string;
  mostOvertakesCount?: number;
  fastestLapDriverId?: string;
  cleanDriverId?: string;
}

export interface StageRound {
  id: string;
  roundNumber: number;
  trackName: string;
  trackCountry: string;
  trackFlag: string;
  circuitLength: string;
  date: string;
  time: string;
  format: string;
  weather: StageWeather;
  status: 'Agendada' | 'Em Breve' | 'Em Andamento' | 'Concluída';
  hasSprint?: boolean;
  sprintFormat?: string;
  briefingNotes?: string;
  poleDriverId?: string;
  poleTime?: string;
  fastestLapDriverId?: string;
  fastestLapTime?: string;
  results?: RaceResultItem[];
  sprintResults?: RaceResultItem[];
  sprintPoleDriverId?: string;
  sprintPoleTime?: string;
  sprintFastestLapDriverId?: string;
  sprintFastestLapTime?: string;
  communityTrophies?: CommunityTrophies;
}

export interface RegistrationPilot {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  teamName: string;
  carModel: string;
  carNumber: number;
  status: 'APROVADO' | 'PENDENTE' | 'REJEITADO' | 'RESERVA';
  isReserve?: boolean;
  registeredAt: string;
  discord: string;
  steamGuid?: string;
}

export type ProtestStatus = 'PENDENTE' | 'EM_ANALISE' | 'DEFERIDO' | 'INDEFERIDO';

export type PenaltyType = 
  | 'NO_PENALTY'
  | 'WARNING'
  | 'TIME_PENALTY'
  | 'POINTS_PENALTY'
  | 'DSQ'
  | 'GRID_PENALTY';

export interface RaceProtest {
  id: string;
  championshipId: string;
  stageId: string;
  stageRoundNumber: number;
  stageTrackName: string;
  plaintiffId: string;
  plaintiffName: string;
  plaintiffCarNumber?: number;
  plaintiffTeam?: string;
  defendantId: string;
  defendantName: string;
  defendantCarNumber?: number;
  defendantTeam?: string;
  lapNumber?: string;
  turnOrSector?: string;
  description: string;
  videoUrl?: string;
  screenshotUrl?: string;
  status: ProtestStatus;
  createdAt: string;
  judgment?: {
    stewardId: string;
    stewardName: string;
    decidedAt: string;
    verdict: string;
    penaltyType: PenaltyType;
    penaltyPoints?: number;
    penaltySeconds?: number;
    penaltySimRatingDeduction?: number;
    penaltySafetyRatingDeduction?: number;
  };
}

export type DayOfWeek =
  | 'Domingo'
  | 'Segunda-feira'
  | 'Terça-feira'
  | 'Quarta-feira'
  | 'Quinta-feira'
  | 'Sexta-feira'
  | 'Sábado';

export type StageRecurrence = 'Semanal' | 'Quinzenal' | 'Mensal';

export interface Championship {
  id: string;
  name: string;
  slug: string;
  description: string;
  simulator: Simulator;
  category: ChampionshipCategory;
  season: string;
  status: ChampionshipStatus;
  maxGrid: number;
  trackBgColor: string;
  adminIds: string[];
  adminEmails?: string[];
  scoringRule: ScoringRule;
  rulesDoc?: string;
  rulesPdfUrl?: string;
  rulesPdfName?: string;
  rulesPdfSize?: string;
  stages: StageRound[];
  registrations: RegistrationPilot[];
  protests?: RaceProtest[];
  defaultRaceDay?: DayOfWeek;
  recurrence?: StageRecurrence;
  createdAt: string;
}

export interface DriverStanding {
  rank: number;
  driverId: string;
  driverName: string;
  teamName: string;
  carModel: string;
  number: number;
  roundPoints: Record<number, number>; // roundNumber -> total points (main + sprint)
  roundSprintPoints?: Record<number, number>; // roundNumber -> sprint points specifically
  roundMainPoints?: Record<number, number>; // roundNumber -> main race points specifically
  totalPoints: number;
  sprintTotalPoints?: number;
  wins: number;
  podiums: number;
  poles: number;
  fastestLaps: number;
  dnfs: number;
  gap: string;
  isReserve?: boolean;
}

export interface ConstructorStanding {
  rank: number;
  teamName: string;
  carBrand: string;
  driverNames: string[];
  roundPoints: Record<number, number>; // roundNumber -> total team points (main + sprint)
  roundSprintPoints?: Record<number, number>; // roundNumber -> team sprint points specifically
  roundMainPoints?: Record<number, number>; // roundNumber -> team main race points specifically
  totalPoints: number;
  sprintTotalPoints?: number;
  wins: number;
  podiums: number;
  gap: string;
}

export type NotificationType =
  | 'RACE_RESULT'
  | 'REGISTRATION_STATUS'
  | 'STEWARDS_PROTEST'
  | 'STEWARDS_VERDICT'
  | 'STAGE_REMINDER'
  | 'CHAMPIONSHIP_ANNOUNCEMENT';

export interface AppNotification {
  id: string;
  userId?: string; // specific user ID or 'all'
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  linkTab?: string;
  championshipId?: string;
  championshipName?: string;
  stageId?: string;
  stageName?: string;
  protestId?: string;
  createdAt: string;
}
