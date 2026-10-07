export const DEFAULT_SIM_RATING = 3000;

export interface SimRatingTier {
  id: string;
  name: string;
  minRating: number;
  maxRating: number;
  badgeBg: string;
  badgeBorder: string;
  textColor: string;
  badgeIcon: string;
  description: string;
}

export const SIM_RATING_TIERS: SimRatingTier[] = [
  {
    id: 'legend',
    name: 'Elite Legend',
    minRating: 3800,
    maxRating: Infinity,
    badgeBg: 'bg-amber-950/80',
    badgeBorder: 'border-amber-500/80',
    textColor: 'text-amber-300',
    badgeIcon: '👑',
    description: 'Pilotos extraordinários no ápice do automobilismo virtual.',
  },
  {
    id: 'master',
    name: 'Master Pro',
    minRating: 3400,
    maxRating: 3799,
    badgeBg: 'bg-purple-950/80',
    badgeBorder: 'border-purple-500/80',
    textColor: 'text-purple-300',
    badgeIcon: '💎',
    description: 'Pilotos de alto rendimento com vitórias e constância no grid.',
  },
  {
    id: 'pro',
    name: 'Pro Oficial',
    minRating: 3000,
    maxRating: 3399,
    badgeBg: 'bg-red-950/80',
    badgeBorder: 'border-red-600/80',
    textColor: 'text-red-300',
    badgeIcon: '⚡',
    description: 'Nível oficial padrão de entrada (3000 pts). Competitivo e homologado.',
  },
  {
    id: 'semipro',
    name: 'Semi-Pro',
    minRating: 2700,
    maxRating: 2999,
    badgeBg: 'bg-blue-950/80',
    badgeBorder: 'border-blue-500/80',
    textColor: 'text-blue-300',
    badgeIcon: '🛡️',
    description: 'Pilotos em desenvolvimento técnico buscando o pelotão da frente.',
  },
  {
    id: 'rookie',
    name: 'Rookie / Amador',
    minRating: 0,
    maxRating: 2699,
    badgeBg: 'bg-slate-900',
    badgeBorder: 'border-slate-700',
    textColor: 'text-slate-300',
    badgeIcon: '🔰',
    description: 'Fase de aprendizado e recuperação de pontuação nas corridas.',
  },
];

export function getSimRatingTier(rating: number = DEFAULT_SIM_RATING): SimRatingTier {
  const safeRating = typeof rating === 'number' && !isNaN(rating) ? rating : DEFAULT_SIM_RATING;
  for (const tier of SIM_RATING_TIERS) {
    if (safeRating >= tier.minRating && safeRating <= tier.maxRating) {
      return tier;
    }
  }
  return SIM_RATING_TIERS[2]; // Default Pro Oficial
}

/**
 * Calculates rating delta based on race result
 */
export function calculateSimRatingDelta(
  position: number,
  totalGrid: number = 20,
  isFinished: boolean = true,
  hasPole: boolean = false,
  hasFastestLap: boolean = false
): number {
  if (!isFinished) {
    return -18;
  }

  // Base delta based on finishing bracket
  let delta = 0;
  if (position === 1) delta = 45;
  else if (position === 2) delta = 32;
  else if (position === 3) delta = 22;
  else if (position <= 5) delta = 14;
  else if (position <= 10) delta = 6;
  else if (position <= Math.ceil(totalGrid * 0.7)) delta = 0;
  else delta = -10;

  if (hasPole) delta += 8;
  if (hasFastestLap) delta += 5;

  return delta;
}
