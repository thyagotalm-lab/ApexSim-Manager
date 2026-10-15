import { User, UserStats, Championship } from '../types';

/**
 * Computes official pilot statistics deterministically from ground-truth championship stages.
 * This guarantees that:
 * - Qualifications (Qualis) are accurately counted as stages where the pilot had a grid position / set a time.
 * - Races (Corridas) are accurately counted as races where the pilot took the start (status !== 'DNS').
 * - Repeated saves by admins do not duplicate or multiply race counts.
 */
export function computePilotStatsFromChampionships(
  user: User,
  championships: Championship[]
): UserStats {
  let qualifications = 0;
  let races = 0;
  let wins = 0;
  let podiums = 0;
  let poles = 0;
  let fastestLaps = 0;
  let points = 0;
  let dnfs = 0;
  let simRating = 3000;
  let hasParticipation = false;

  const userCleanName = (user.name || '').toLowerCase().trim();
  const userEmail = (user.email || '').toLowerCase().trim();
  const userId = user.id;

  // 1. Deduplicate championships by ID to avoid multiple loops over the same championship
  const uniqueChampionships: Championship[] = [];
  const seenChampIds = new Set<string>();

  (championships || []).forEach((champ) => {
    if (!champ || !champ.id || seenChampIds.has(champ.id) || champ.isDeleted) return;
    seenChampIds.add(champ.id);
    uniqueChampionships.push(champ);
  });

  // 2. Track processed stages and event signatures to guarantee a single race event is only counted once
  const seenStageIds = new Set<string>();
  const seenEventSignatures = new Set<string>();

  uniqueChampionships.forEach((champ) => {
    (champ.stages || []).forEach((stage) => {
      if (!stage) return;

      const stageId = stage.id || `${champ.id}_round_${stage.roundNumber}_${stage.trackName}`;
      if (seenStageIds.has(stageId)) {
        return; // Stage already processed
      }
      seenStageIds.add(stageId);

      // Event fingerprint (track + date) to prevent duplicated/cloned championship stages from multiplying race counts
      const cleanTrack = (stage.trackName || '').toLowerCase().trim();
      const cleanDate = (stage.date || '').trim();
      const eventSignature = cleanTrack && cleanDate ? `${cleanTrack}_${cleanDate}` : null;

      // 1. Check Main Race Results
      if (Array.isArray(stage.results) && stage.results.length > 0) {
        if (eventSignature && seenEventSignatures.has(eventSignature)) {
          return; // Duplicate event already counted
        }
        if (eventSignature) {
          seenEventSignatures.add(eventSignature);
        }

        const res = stage.results.find((r) => {
          if (r.driverId && (r.driverId === userId || r.driverId.toLowerCase().trim() === userEmail)) return true;
          if (r.driverName && userCleanName && r.driverName.toLowerCase().trim() === userCleanName) return true;
          return false;
        });

        if (res) {
          hasParticipation = true;

          // Qualificação: Considerada quando o piloto participou da sessão de qualificação / grid
          const didQualify = (typeof res.gridPosition === 'number' && res.gridPosition > 0) || Boolean(res.hasPole);
          if (didQualify) {
            qualifications += 1;
          }

          // Corrida propriamente dita: O piloto tomou a largada na corrida (não é ausente / DNS)
          const didRace = res.status !== 'DNS';
          if (didRace) {
            races += 1;
          }

          if (res.status === 'FINISHED') {
            if (res.finishPosition === 1) wins += 1;
            if (res.finishPosition <= 3) podiums += 1;
          }

          if (res.hasPole || stage.poleDriverId === res.driverId) {
            poles += 1;
          }

          if (res.hasFastestLap || stage.fastestLapDriverId === res.driverId) {
            fastestLaps += 1;
          }

          if (res.status === 'DNF' || res.status === 'DSQ') {
            dnfs += 1;
          }

          points += (res.pointsAwarded || 0);

          // Sim Rating Delta
          let delta = 0;
          if (res.status === 'FINISHED') {
            if (res.finishPosition === 1) delta = 45;
            else if (res.finishPosition === 2) delta = 30;
            else if (res.finishPosition === 3) delta = 20;
            else if (res.finishPosition <= 5) delta = 12;
            else if (res.finishPosition <= 10) delta = 6;
            else delta = -5;

            if (res.hasPole || stage.poleDriverId === res.driverId) delta += 8;
            if (res.hasFastestLap || stage.fastestLapDriverId === res.driverId) delta += 5;
          } else if (res.status === 'DNS') {
            delta = 0;
          } else {
            delta = -18;
          }
          simRating = Math.max(1000, simRating + delta);
        }
      }

      // 2. Check Sprint Results if available
      if (stage.hasSprint && Array.isArray(stage.sprintResults) && stage.sprintResults.length > 0) {
        const sprintRes = stage.sprintResults.find((r) => {
          if (r.driverId && (r.driverId === userId || r.driverId.toLowerCase().trim() === userEmail)) return true;
          if (r.driverName && userCleanName && r.driverName.toLowerCase().trim() === userCleanName) return true;
          return false;
        });

        if (sprintRes) {
          hasParticipation = true;
          // Add sprint points
          points += (sprintRes.pointsAwarded || 0);

          // Sprint rating delta
          let sprintDelta = 0;
          if (sprintRes.status === 'FINISHED') {
            if (sprintRes.finishPosition === 1) sprintDelta = 20;
            else if (sprintRes.finishPosition === 2) sprintDelta = 14;
            else if (sprintRes.finishPosition === 3) sprintDelta = 10;
            else if (sprintRes.finishPosition <= 5) sprintDelta = 6;
            else if (sprintRes.finishPosition <= 8) sprintDelta = 3;
            else sprintDelta = -2;
          } else if (sprintRes.status === 'DNS') {
            sprintDelta = 0;
          } else {
            sprintDelta = -8;
          }
          simRating = Math.max(1000, simRating + sprintDelta);
        }
      }
    });
  });

  return {
    qualifications,
    races,
    wins,
    podiums,
    poles,
    fastestLaps,
    points,
    dnfs,
    safetyRating: user.stats?.safetyRating || 'B 3.50',
    simRating: hasParticipation ? simRating : (typeof user.stats?.simRating === 'number' ? user.stats.simRating : 3000),
  };
}
