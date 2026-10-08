import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Championship, PenaltyType, RaceProtest, RaceResultItem, RegistrationPilot, StageRound, User } from '../types';
import { useAuth } from './AuthContext';
import {
  subscribeToChampionships,
  saveChampionshipToCloud,
  deleteChampionshipFromCloud,
  isRealChampionship,
  syncBackendWithFirestoreChampionships,
} from '../services/championshipService';

export const MAX_CHAMPIONSHIPS_PER_PILOT = 5;

interface ChampionshipContextType {
  championships: Championship[];
  activeChampionship: Championship | null;
  setActiveChampionshipId: (id: string) => void;
  createChampionship: (data: Omit<Championship, 'id' | 'createdAt' | 'registrations' | 'stages'> & { initialStages?: Partial<StageRound>[] }) => Championship;
  updateChampionship: (
    championshipId: string,
    data: Partial<Omit<Championship, 'id' | 'createdAt' | 'registrations' | 'stages'>>
  ) => void;
  addLeagueAdmin: (championshipId: string, userId: string, userEmail?: string) => void;
  removeLeagueAdmin: (championshipId: string, userId: string, userEmail?: string) => void;
  getLeagueAdmins: (championshipId: string) => User[];
  isUserLeagueAdmin: (championshipId: string, userId?: string) => boolean;
  addStage: (championshipId: string, stage: Omit<StageRound, 'id' | 'roundNumber'>) => void;
  updateStage: (championshipId: string, stageId: string, stage: Partial<StageRound>) => void;
  deleteStage: (championshipId: string, stageId: string) => void;
  registerPilotRequest: (championshipId: string, data: { teamName: string; carModel: string; carNumber: number; discord: string }) => void;
  adminAddPilot: (championshipId: string, pilotData: { userId: string; teamName: string; carModel: string; carNumber: number; isReserve?: boolean; status?: RegistrationPilot['status'] }) => void;
  updateRegistrationStatus: (championshipId: string, regId: string, status: RegistrationPilot['status']) => void;
  updatePilotTeam: (
    championshipId: string,
    regId: string,
    teamData: { teamName: string; carModel?: string; carNumber?: number; isReserve?: boolean; status?: RegistrationPilot['status'] }
  ) => void;
  getUserChampionshipsCount: (userIdOrEmail: string) => number;
  getUserChampionships: (userIdOrEmail: string) => Championship[];
  canUserJoinChampionship: (userIdOrEmail: string, championshipId: string) => { allowed: boolean; reason?: string; currentCount: number };
  recordRaceResults: (
    championshipId: string,
    stageId: string,
    results: RaceResultItem[],
    poleData?: { driverId: string; time: string },
    fastestLapData?: { driverId: string; time: string }
  ) => void;
  deleteChampionship: (championshipId: string) => void;
  submitProtest: (protestData: {
    stageId: string;
    stageRoundNumber: number;
    stageTrackName: string;
    defendantId: string;
    defendantName: string;
    defendantCarNumber?: number;
    defendantTeam?: string;
    lapNumber?: string;
    turnOrSector?: string;
    description: string;
    videoUrl?: string;
    screenshotUrl?: string;
  }) => void;
  judgeProtest: (
    protestId: string,
    judgmentData: {
      verdict: string;
      penaltyType: PenaltyType;
      penaltyPoints?: number;
      penaltySeconds?: number;
      penaltySimRatingDeduction?: number;
      penaltySafetyRatingDeduction?: number;
    }
  ) => void;
  deleteProtest: (protestId: string) => void;
  voteDriverOfTheDay: (championshipId: string, stageId: string, driverId: string, voterId: string) => void;
  closeDriverOfTheDayVoting: (championshipId: string, stageId: string) => void;
  getDriverCommunityTrophies: (driverId: string) => {
    dotdCount: number;
    overtakesCount: number;
    cleanCount: number;
    fastestLapCount: number;
    totalCommunityTrophies: number;
  };
  propagatePilotProfileUpdate: (oldId: string, newId: string, newName: string, userEmail?: string) => Promise<void>;
  reloadChampionships: () => Promise<void>;
}

const MOCK_CHAMPIONSHIP_IDS = new Set([
  'champ_gt3_sprint_2026',
  'champ_f1_brasil_2026',
  'champ_porsche_cup_2026',
  'champ_f1_25_brasil',
  'champ_f1_26_apex',
]);

const ChampionshipContext = createContext<ChampionshipContextType | undefined>(undefined);

export const ChampionshipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, users, updateUser } = useAuth();

  const [championships, setChampionships] = useState<Championship[]>(() => {
    try {
      const saved = localStorage.getItem('apexsim_championships_db');
      if (saved) {
        let parsed: Championship[] = JSON.parse(saved);
        parsed = parsed.filter(isRealChampionship);
        return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [activeChampionshipId, setActiveChampionshipId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('apexsim_active_champ_id');
      if (saved && !MOCK_CHAMPIONSHIP_IDS.has(saved)) {
        return saved;
      }
    } catch (e) {
      console.error(e);
    }
    return '';
  });

  // Subscribe to real-time Cloud & Backend Championships
  useEffect(() => {
    const unsubscribe = subscribeToChampionships((cloudChamps) => {
      if (Array.isArray(cloudChamps)) {
        const filtered = cloudChamps.filter(isRealChampionship);
        setChampionships(filtered);
        try {
          localStorage.setItem('apexsim_championships_db', JSON.stringify(filtered));
        } catch (_) {}
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    try {
      const manualOnly = championships.filter(isRealChampionship);
      localStorage.setItem('apexsim_championships_db', JSON.stringify(manualOnly));
      if (activeChampionshipId) {
        localStorage.setItem('apexsim_active_champ_id', activeChampionshipId);
      }
    } catch (e) {
      console.error(e);
    }
  }, [championships, activeChampionshipId]);

  // All championships created by any user are publicly visible to all existing, new, and prospective users
  const visibleChampionships = useMemo(() => {
    return championships;
  }, [championships]);

  const activeChampionship = useMemo(() => {
    if (championships.length === 0) return null;
    return (
      championships.find((c) => c.id === activeChampionshipId) ||
      championships[0] ||
      null
    );
  }, [championships, activeChampionshipId]);

  const getLeagueAdmins = (championshipId: string): User[] => {
    const champ = championships.find((c) => c.id === championshipId);
    if (!champ) return [];

    const adminMap = new Map<string, User>();

    // 1. Users whose ID is in champ.adminIds
    users.forEach((u) => {
      if (champ.adminIds && champ.adminIds.includes(u.id)) {
        adminMap.set(u.id, u);
      }
    });

    // 2. Users who have this championship in their administeredLeagueIds
    users.forEach((u) => {
      if (u.administeredLeagueIds && u.administeredLeagueIds.includes(championshipId)) {
        adminMap.set(u.id, u);
      }
    });

    // 3. Users whose email is in champ.adminEmails
    if (champ.adminEmails && champ.adminEmails.length > 0) {
      const emailSet = new Set(champ.adminEmails.filter(Boolean).map((e) => (e || '').toLowerCase().trim()));
      users.forEach((u) => {
        if (u.email && emailSet.has((u.email || '').toLowerCase().trim())) {
          adminMap.set(u.id, u);
        }
      });
    }

    // 4. Super administrator Thyago Talm (if present in users or currently logged in)
    const thyago =
      users.find((u) => (u.email || '').toLowerCase().trim() === 'thyago.talm@gmail.com') ||
      ((currentUser?.email || '').toLowerCase().trim() === 'thyago.talm@gmail.com' ? currentUser : null);
    if (thyago) {
      adminMap.set(thyago.id, thyago);
    }

    // 5. Fallback: If map is empty and currentUser is logged in with admin role
    if (adminMap.size === 0 && currentUser && currentUser.role === 'admin') {
      adminMap.set(currentUser.id, currentUser);
    }

    return Array.from(adminMap.values());
  };

  const isUserLeagueAdmin = (championshipId: string, userId?: string): boolean => {
    const targetIdOrEmail = userId || currentUser?.id || '';
    if (!targetIdOrEmail) return false;

    const isDirectEmail = targetIdOrEmail.includes('@');
    const targetUser = isDirectEmail
      ? users.find((u) => (u.email || '').toLowerCase().trim() === targetIdOrEmail.toLowerCase().trim())
      : users.find((u) => u.id === targetIdOrEmail) || (currentUser?.id === targetIdOrEmail ? currentUser : null);

    const targetEmail = (
      (isDirectEmail ? targetIdOrEmail : '') ||
      targetUser?.email ||
      (currentUser?.id === targetIdOrEmail ? currentUser?.email : '') ||
      ''
    ).toLowerCase().trim();

    // Check if targetUser or currentUser is Thyago Talm (Master Admin)
    if (targetEmail === 'thyago.talm@gmail.com') {
      return true;
    }
    if ((currentUser?.email || '').toLowerCase().trim() === 'thyago.talm@gmail.com') {
      return true;
    }

    const champ = championships.find((c) => c.id === championshipId);
    if (!champ) return false;

    // Direct ID match in champ.adminIds
    if (champ.adminIds && (champ.adminIds.includes(targetIdOrEmail) || (targetUser && champ.adminIds.includes(targetUser.id)))) {
      return true;
    }

    // Direct match in user's administeredLeagueIds
    if (targetUser?.administeredLeagueIds && targetUser.administeredLeagueIds.includes(championshipId)) {
      return true;
    }
    if (currentUser?.id === targetIdOrEmail && currentUser.administeredLeagueIds?.includes(championshipId)) {
      return true;
    }

    // Match by email in champ.adminEmails
    if (targetEmail && champ.adminEmails && champ.adminEmails.some((e) => (e || '').toLowerCase().trim() === targetEmail)) {
      return true;
    }

    // Match if currentUser's email is in champ.adminEmails
    if (currentUser?.email && champ.adminEmails && champ.adminEmails.some((e) => (e || '').toLowerCase().trim() === (currentUser.email || '').toLowerCase().trim())) {
      return true;
    }

    // Match if any ID in champ.adminIds belongs to an account with the same email
    if (targetEmail && champ.adminIds && champ.adminIds.length > 0) {
      const hasMatchingAccount = users.some(
        (u) => champ.adminIds.includes(u.id) && (u.email || '').toLowerCase().trim() === targetEmail
      );
      if (hasMatchingAccount) return true;
    }

    return false;
  };

  const mutateChampionship = (
    championshipId: string,
    transform: (current: Championship) => Championship
  ) => {
    setChampionships((prev) => {
      const idx = prev.findIndex((c) => c.id === championshipId);
      if (idx < 0) return prev;
      const updated = transform(prev[idx]);
      saveChampionshipToCloud(updated).catch((err) => console.warn('Cloud champ save error:', err));
      const copy = [...prev];
      copy[idx] = updated;
      return copy;
    });
  };

  const createChampionship = (data: Omit<Championship, 'id' | 'createdAt' | 'registrations' | 'stages'> & { initialStages?: Partial<StageRound>[] }): Championship => {
    const creatorId = currentUser?.id || 'user_thyago_talm';
    const newId = `champ_${Date.now()}`;
    
    const stages: StageRound[] = (data.initialStages || []).map((s, index) => ({
      id: `stage_${Date.now()}_${index + 1}`,
      roundNumber: index + 1,
      trackName: s.trackName || 'Autódromo de Interlagos',
      trackCountry: s.trackCountry || 'Brasil',
      trackFlag: s.trackFlag || '🇧🇷',
      circuitLength: s.circuitLength || '4.309 km',
      date: s.date || new Date(Date.now() + (index + 1) * 14 * 86400000).toISOString().split('T')[0],
      time: s.time || '21:00 BRT',
      format: s.format || 'Quali 15min + Corrida 45min',
      weather: s.weather || 'Pista Seca',
      status: index === 0 ? 'Em Breve' : 'Agendada',
    }));

    // Aggregate all admin IDs
    const allAdminIds = Array.from(new Set([creatorId, 'user_thyago_talm', ...(data.adminIds || [])]));

    // Aggregate all admin Emails
    const adminEmailsSet = new Set<string>();
    adminEmailsSet.add('thyago.talm@gmail.com');
    if (currentUser?.email) adminEmailsSet.add(currentUser.email.toLowerCase().trim());

    allAdminIds.forEach((id) => {
      const u = users.find((usr) => usr.id === id);
      if (u?.email) adminEmailsSet.add(u.email.toLowerCase().trim());
    });
    (data.adminEmails || []).forEach((e) => adminEmailsSet.add(e.toLowerCase().trim()));

    const newChamp: Championship = {
      ...data,
      id: newId,
      createdAt: new Date().toISOString(),
      adminIds: allAdminIds,
      adminEmails: Array.from(adminEmailsSet),
      registrations: [],
      stages: stages.length > 0 ? stages : [
        {
          id: `stage_${Date.now()}_1`,
          roundNumber: 1,
          trackName: 'Autódromo de Interlagos',
          trackCountry: 'Brasil',
          trackFlag: '🇧🇷',
          circuitLength: '4.309 km',
          date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          time: '21:00 BRT',
          format: 'Quali 15min + Corrida 45min',
          weather: 'Pista Seca',
          status: 'Em Breve',
        }
      ],
    };

    setChampionships((prev) => [newChamp, ...prev]);
    setActiveChampionshipId(newChamp.id);

    // Persist to Cloud & Backend!
    saveChampionshipToCloud(newChamp).catch((err) => console.warn('Cloud create error:', err));

    // Update role: 'admin' and administeredLeagueIds for ALL assigned admin users
    allAdminIds.forEach((adminId) => {
      const targetUser = users.find((u) => u.id === adminId) || (currentUser?.id === adminId ? currentUser : null);
      if (targetUser) {
        updateUser({
          ...targetUser,
          role: 'admin',
          administeredLeagueIds: Array.from(new Set([...(targetUser.administeredLeagueIds || []), newId])),
        });
      }
    });

    // Also ensure all users matching assigned adminEmails are marked as admin with newId added
    adminEmailsSet.forEach((email) => {
      const cleanEmail = (email || '').toLowerCase().trim();
      const targetUser = users.find((u) => (u.email || '').toLowerCase().trim() === cleanEmail);
      if (targetUser) {
        updateUser({
          ...targetUser,
          role: 'admin',
          administeredLeagueIds: Array.from(new Set([...(targetUser.administeredLeagueIds || []), newId])),
        });
      }
    });

    return newChamp;
  };

  const updateChampionship = (
    championshipId: string,
    data: Partial<Omit<Championship, 'id' | 'createdAt' | 'registrations' | 'stages'>>
  ) => {
    mutateChampionship(championshipId, (c) => ({
      ...c,
      ...data,
    }));
  };

  const addLeagueAdmin = (championshipId: string, userId: string, userEmail?: string) => {
    let targetUser = users.find((u) => u.id === userId);
    let targetEmail = (userEmail || targetUser?.email || '').toLowerCase().trim();

    if (!targetUser && targetEmail) {
      targetUser = users.find((u) => u.email.toLowerCase().trim() === targetEmail);
    }

    // Check if user is in registrations if not yet in users state
    if (!targetUser && targetEmail) {
      for (const c of championships) {
        const reg = c.registrations.find(
          (r) => (r.userEmail || '').toLowerCase().trim() === targetEmail || r.userId === userId
        );
        if (reg) {
          targetUser = {
            id: reg.userId || userId,
            name: reg.userName || targetEmail.split('@')[0],
            email: targetEmail,
            role: 'admin',
            avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250`,
            country: 'Brasil 🇧🇷',
            racingNumber: reg.carNumber || 1,
            discordTag: reg.discord || '',
            steamId: reg.steamGuid || '',
            administeredLeagueIds: [championshipId],
            stats: { races: 0, wins: 0, podiums: 0, poles: 0, fastestLaps: 0, points: 0, dnfs: 0, safetyRating: 'B 3.50', simRating: 3000 },
          };
          break;
        }
      }
    }

    const adminIdsToAdd = [userId];
    if (targetUser && targetUser.id) adminIdsToAdd.push(targetUser.id);

    mutateChampionship(championshipId, (c) => ({
      ...c,
      adminIds: Array.from(new Set([...c.adminIds, ...adminIdsToAdd])),
      adminEmails: Array.from(new Set([...(c.adminEmails || []), ...(targetEmail ? [targetEmail] : [])])),
    }));

    if (targetUser) {
      const mergedLeagues = new Set(targetUser.administeredLeagueIds || []);
      championships.forEach((c) => {
        if (
          c.adminIds?.includes(targetUser.id) ||
          c.adminIds?.includes(userId) ||
          (targetEmail && c.adminEmails?.some((e) => (e || '').toLowerCase().trim() === targetEmail))
        ) {
          mergedLeagues.add(c.id);
        }
      });
      mergedLeagues.add(championshipId);

      updateUser({
        ...targetUser,
        role: 'admin',
        administeredLeagueIds: Array.from(mergedLeagues),
      });
    } else if (targetEmail) {
      const brandNewUser: User = {
        id: userId,
        name: targetEmail.split('@')[0],
        email: targetEmail,
        role: 'admin',
        avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250`,
        country: 'Brasil 🇧🇷',
        racingNumber: Math.floor(Math.random() * 98) + 1,
        discordTag: '',
        steamId: '',
        administeredLeagueIds: [championshipId],
        stats: { races: 0, wins: 0, podiums: 0, poles: 0, fastestLaps: 0, points: 0, dnfs: 0, safetyRating: 'B 3.50', simRating: 3000 },
      };
      updateUser(brandNewUser);
    }
  };

  const removeLeagueAdmin = (championshipId: string, userId: string, userEmail?: string) => {
    const targetUser = users.find((u) => u.id === userId);
    const targetEmail = (userEmail || targetUser?.email || '').toLowerCase().trim();

    mutateChampionship(championshipId, (c) => ({
      ...c,
      adminIds: c.adminIds.filter((id) => id !== userId && (!targetUser || id !== targetUser.id)),
      adminEmails: (c.adminEmails || []).filter((e) => e.toLowerCase().trim() !== targetEmail),
    }));

    if (targetUser) {
      updateUser({
        ...targetUser,
        administeredLeagueIds: (targetUser.administeredLeagueIds || []).filter((id) => id !== championshipId),
      });
    }
  };

  const addStage = (championshipId: string, stage: Omit<StageRound, 'id' | 'roundNumber'>) => {
    mutateChampionship(championshipId, (c) => {
      const roundNumber = c.stages.length + 1;
      const newStage: StageRound = {
        ...stage,
        id: `stage_${Date.now()}`,
        roundNumber,
      };
      return {
        ...c,
        stages: [...c.stages, newStage],
      };
    });
  };

  const updateStage = (championshipId: string, stageId: string, stageData: Partial<StageRound>) => {
    mutateChampionship(championshipId, (c) => ({
      ...c,
      stages: c.stages.map((st) => (st.id === stageId ? { ...st, ...stageData } : st)),
    }));
  };

  const deleteStage = (championshipId: string, stageId: string) => {
    mutateChampionship(championshipId, (c) => {
      const filtered = c.stages.filter((st) => st.id !== stageId);
      const reindexed = filtered.map((st, i) => ({ ...st, roundNumber: i + 1 }));
      return {
        ...c,
        stages: reindexed,
      };
    });
  };

  const getUserChampionships = (userIdOrEmail: string): Championship[] => {
    if (!userIdOrEmail) return [];
    const clean = userIdOrEmail.toLowerCase().trim();
    return championships.filter((c) =>
      c.registrations.some(
        (r) =>
          (r.userId && r.userId.toLowerCase().trim() === clean) ||
          (r.userEmail && r.userEmail.toLowerCase().trim() === clean)
      )
    );
  };

  const getUserChampionshipsCount = (userIdOrEmail: string): number => {
    return getUserChampionships(userIdOrEmail).length;
  };

  const canUserJoinChampionship = (
    userIdOrEmail: string,
    championshipId: string
  ): { allowed: boolean; reason?: string; currentCount: number } => {
    if (!userIdOrEmail) return { allowed: false, reason: 'Identificador inválido', currentCount: 0 };
    const clean = userIdOrEmail.toLowerCase().trim();
    const enrolledChamps = getUserChampionships(clean);
    const isAlreadyInChamp = enrolledChamps.some((c) => c.id === championshipId);

    if (isAlreadyInChamp) {
      return {
        allowed: false,
        reason: 'Piloto já cadastrado neste campeonato',
        currentCount: enrolledChamps.length,
      };
    }

    if (enrolledChamps.length >= MAX_CHAMPIONSHIPS_PER_PILOT) {
      return {
        allowed: false,
        reason: `Piloto já atingiu o limite máximo de ${MAX_CHAMPIONSHIPS_PER_PILOT} campeonatos simultâneos`,
        currentCount: enrolledChamps.length,
      };
    }

    return {
      allowed: true,
      currentCount: enrolledChamps.length,
    };
  };

  const registerPilotRequest = (championshipId: string, data: { teamName: string; carModel: string; carNumber: number; discord: string }) => {
    if (!currentUser) return;
    const champ = championships.find((c) => c.id === championshipId);
    if (!champ) return;

    const check = canUserJoinChampionship(currentUser.id || currentUser.email, championshipId);
    if (!check.allowed) {
      console.warn('Inscrição bloqueada:', check.reason);
      return;
    }

    const newReg: RegistrationPilot = {
      id: `reg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      teamName: data.teamName,
      carModel: data.carModel,
      carNumber: data.carNumber,
      status: 'PENDENTE',
      registeredAt: new Date().toISOString(),
      discord: data.discord || currentUser.discordTag || '',
      steamGuid: currentUser.steamId || currentUser.gamingId || '',
    };

    mutateChampionship(championshipId, (c) => ({
      ...c,
      registrations: [...c.registrations, newReg],
    }));
  };

  const adminAddPilot = (
    championshipId: string,
    pilotData: {
      userId: string;
      teamName: string;
      carModel: string;
      carNumber: number;
      isReserve?: boolean;
      status?: RegistrationPilot['status'];
    }
  ) => {
    let user = users.find(
      (u) =>
        u.id === pilotData.userId ||
        (u.email && u.email.toLowerCase().trim() === pilotData.userId.toLowerCase().trim())
    );

    if (!user) {
      for (const c of championships) {
        const found = c.registrations.find(
          (r) =>
            r.userId === pilotData.userId ||
            (r.userEmail && r.userEmail.toLowerCase().trim() === pilotData.userId.toLowerCase().trim())
        );
        if (found) {
          user = {
            id: found.userId || pilotData.userId,
            name: found.userName,
            email: found.userEmail || `${found.userName.toLowerCase().replace(/\s+/g, '')}@piloto.apex`,
            avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250`,
            role: 'pilot',
            country: 'Brasil 🇧🇷',
            racingNumber: found.carNumber,
            discordTag: found.discord,
            steamId: found.steamGuid,
            administeredLeagueIds: [],
            stats: {
              races: 0,
              wins: 0,
              podiums: 0,
              poles: 0,
              fastestLaps: 0,
              points: 0,
              dnfs: 0,
              safetyRating: 'B 3.50',
              simRating: 3000,
            },
          };
          break;
        }
      }
    }

    if (!user) return;

    // Validate max 5 championships (excluding target championship if they are already in it and being updated)
    const otherChamps = getUserChampionships(user.id || user.email).filter((c) => c.id !== championshipId);
    if (otherChamps.length >= MAX_CHAMPIONSHIPS_PER_PILOT) {
      console.warn(`Piloto ${user.name} atingiu o limite de ${MAX_CHAMPIONSHIPS_PER_PILOT} campeonatos.`);
      return;
    }

    const isReserve = Boolean(pilotData.isReserve);
    const assignedStatus: RegistrationPilot['status'] = isReserve
      ? 'RESERVA'
      : pilotData.status || 'APROVADO';

    const newReg: RegistrationPilot = {
      id: `reg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      teamName: isReserve ? 'Reserva' : pilotData.teamName,
      carModel: pilotData.carModel,
      carNumber: pilotData.carNumber,
      status: assignedStatus,
      isReserve,
      registeredAt: new Date().toISOString(),
      discord: user.discordTag || '',
      steamGuid: user.steamId || user.gamingId || '',
    };

    mutateChampionship(championshipId, (c) => {
      const existingIndex = c.registrations.findIndex(
        (r) =>
          r.userId === user.id ||
          (r.userEmail && r.userEmail.toLowerCase().trim() === user.email.toLowerCase().trim())
      );
      const copy = [...c.registrations];
      if (existingIndex >= 0) {
        copy[existingIndex] = newReg;
      } else {
        copy.push(newReg);
      }
      return {
        ...c,
        registrations: copy,
      };
    });
  };

  const updateRegistrationStatus = (championshipId: string, regId: string, status: RegistrationPilot['status']) => {
    const isReserve = status === 'RESERVA';
    mutateChampionship(championshipId, (c) => ({
      ...c,
      registrations: c.registrations.map((r) =>
        r.id === regId
          ? {
              ...r,
              status,
              isReserve,
              teamName: isReserve ? 'Reserva' : r.teamName,
            }
          : r
      ),
    }));
  };

  const updatePilotTeam = (
    championshipId: string,
    regId: string,
    teamData: {
      teamName: string;
      carModel?: string;
      carNumber?: number;
      isReserve?: boolean;
      status?: RegistrationPilot['status'];
    }
  ) => {
    mutateChampionship(championshipId, (c) => {
      const targetReg = c.registrations.find((r) => r.id === regId);
      if (!targetReg) return c;

      const isReserve =
        teamData.isReserve !== undefined
          ? teamData.isReserve
          : targetReg.isReserve || targetReg.status === 'RESERVA';

      const finalStatus: RegistrationPilot['status'] =
        teamData.status !== undefined
          ? teamData.status
          : isReserve
          ? 'RESERVA'
          : targetReg.status === 'RESERVA'
          ? 'APROVADO'
          : targetReg.status;

      const finalTeamName = isReserve ? 'Reserva' : teamData.teamName;

      const updatedRegistrations = c.registrations.map((r) =>
        r.id === regId
          ? {
              ...r,
              teamName: finalTeamName,
              carModel: teamData.carModel !== undefined ? teamData.carModel : r.carModel,
              carNumber: teamData.carNumber !== undefined ? teamData.carNumber : r.carNumber,
              isReserve,
              status: finalStatus,
            }
          : r
      );

      const updatedStages = c.stages.map((stage) => {
        if (!stage.results || stage.results.length === 0) return stage;
        const updatedResults = stage.results.map((res) => {
          if (res.driverId === targetReg.userId || res.driverName === targetReg.userName) {
            return {
              ...res,
              teamName: finalTeamName,
              carModel: teamData.carModel !== undefined ? teamData.carModel : res.carModel,
              number: teamData.carNumber !== undefined ? teamData.carNumber : res.number,
              isReserve,
            };
          }
          return res;
        });
        return {
          ...stage,
          results: updatedResults,
        };
      });

      return {
        ...c,
        registrations: updatedRegistrations,
        stages: updatedStages,
      };
    });
  };

  const recordRaceResults = (
    championshipId: string,
    stageId: string,
    results: RaceResultItem[],
    poleData?: { driverId: string; time: string },
    fastestLapData?: { driverId: string; time: string }
  ) => {
    // Automatically calculate overtakes and clean race
    let bestOvertakes = 0;
    let mostOvertakesDriverId: string | undefined = undefined;
    results.forEach((r) => {
      if (r.status === 'FINISHED') {
        const gained = r.gridPosition - r.finishPosition;
        if (gained > bestOvertakes) {
          bestOvertakes = gained;
          mostOvertakesDriverId = r.driverId;
        }
      }
    });

    const cleanDriver = results.find(
      (r) => r.status === 'FINISHED' && (!r.penaltiesPoints || r.penaltiesPoints === 0)
    );

    mutateChampionship(championshipId, (c) => ({
      ...c,
      status: 'Em Andamento',
      stages: c.stages.map((st) => {
        if (st.id === stageId) {
          const prevTrophies = st.communityTrophies || {};
          return {
            ...st,
            status: 'Concluída',
            results,
            poleDriverId: poleData?.driverId,
            poleTime: poleData?.time,
            fastestLapDriverId: fastestLapData?.driverId,
            fastestLapTime: fastestLapData?.time,
            communityTrophies: {
              ...prevTrophies,
              driverOfTheDay: prevTrophies.driverOfTheDay || {
                totalVotes: 0,
                votesByDriverId: {},
                voterUserIds: {},
                votingClosed: false,
              },
              mostOvertakesDriverId: mostOvertakesDriverId || prevTrophies.mostOvertakesDriverId,
              mostOvertakesCount: bestOvertakes || prevTrophies.mostOvertakesCount,
              fastestLapDriverId: fastestLapData?.driverId || prevTrophies.fastestLapDriverId,
              cleanDriverId: cleanDriver?.driverId || prevTrophies.cleanDriverId,
            },
          };
        }
        return st;
      }),
    }));

    // Update stats for drivers
    results.forEach((res) => {
      const driverUser = users.find((u) => u.id === res.driverId);
      if (driverUser) {
        const isWinner = res.finishPosition === 1 && res.status === 'FINISHED';
        const isPodium = res.finishPosition <= 3 && res.status === 'FINISHED';
        const isDNF = res.status === 'DNF' || res.status === 'DSQ';

        // Dynamic Official Sim Rating calculation based on race result
        const curRating = driverUser.stats.simRating || 3000;
        let ratingDelta = 0;
        if (res.status === 'FINISHED') {
          if (res.finishPosition === 1) ratingDelta = 45;
          else if (res.finishPosition === 2) ratingDelta = 30;
          else if (res.finishPosition === 3) ratingDelta = 20;
          else if (res.finishPosition <= 5) ratingDelta = 12;
          else if (res.finishPosition <= 10) ratingDelta = 6;
          else ratingDelta = -5;

          if (res.hasPole) ratingDelta += 8;
          if (res.hasFastestLap) ratingDelta += 5;
        } else {
          ratingDelta = -18;
        }
        const newSimRating = Math.max(1000, curRating + ratingDelta);

        updateUser({
          ...driverUser,
          stats: {
            ...driverUser.stats,
            races: driverUser.stats.races + 1,
            wins: driverUser.stats.wins + (isWinner ? 1 : 0),
            podiums: driverUser.stats.podiums + (isPodium ? 1 : 0),
            poles: driverUser.stats.poles + (res.hasPole ? 1 : 0),
            fastestLaps: driverUser.stats.fastestLaps + (res.hasFastestLap ? 1 : 0),
            points: driverUser.stats.points + res.pointsAwarded,
            dnfs: driverUser.stats.dnfs + (isDNF ? 1 : 0),
            simRating: newSimRating,
          },
        });
      }
    });
  };

  const deleteChampionship = (championshipId: string) => {
    setChampionships((prev) => {
      const remaining = prev.filter((c) => c.id !== championshipId);
      setActiveChampionshipId(remaining.length > 0 ? remaining[0].id : '');
      try {
        localStorage.setItem('apexsim_championships_db', JSON.stringify(remaining));
      } catch (_) {}
      return remaining;
    });

    if (currentUser?.administeredLeagueIds && currentUser.administeredLeagueIds.includes(championshipId)) {
      updateUser({
        ...currentUser,
        administeredLeagueIds: currentUser.administeredLeagueIds.filter((id) => id !== championshipId),
      });
    }

    deleteChampionshipFromCloud(championshipId).catch((err) => console.warn('Cloud delete error:', err));
  };

  const submitProtest = (protestData: {
    stageId: string;
    stageRoundNumber: number;
    stageTrackName: string;
    defendantId: string;
    defendantName: string;
    defendantCarNumber?: number;
    defendantTeam?: string;
    lapNumber?: string;
    turnOrSector?: string;
    description: string;
    videoUrl?: string;
    screenshotUrl?: string;
  }) => {
    if (!activeChampionship || !currentUser) return;

    const plaintiffReg = activeChampionship.registrations.find((r) => r.userId === currentUser.id);

    const newProtest: RaceProtest = {
      id: `protest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      championshipId: activeChampionship.id,
      stageId: protestData.stageId,
      stageRoundNumber: protestData.stageRoundNumber,
      stageTrackName: protestData.stageTrackName,
      plaintiffId: currentUser.id,
      plaintiffName: currentUser.name,
      plaintiffCarNumber: plaintiffReg?.carNumber || currentUser.racingNumber,
      plaintiffTeam: plaintiffReg?.teamName,
      defendantId: protestData.defendantId,
      defendantName: protestData.defendantName,
      defendantCarNumber: protestData.defendantCarNumber,
      defendantTeam: protestData.defendantTeam,
      lapNumber: protestData.lapNumber,
      turnOrSector: protestData.turnOrSector,
      description: protestData.description,
      videoUrl: protestData.videoUrl,
      screenshotUrl: protestData.screenshotUrl,
      status: 'PENDENTE',
      createdAt: new Date().toISOString(),
    };

    mutateChampionship(activeChampionship.id, (c) => ({
      ...c,
      protests: [newProtest, ...(c.protests || [])],
    }));
  };

  const judgeProtest = (
    protestId: string,
    judgmentData: {
      verdict: string;
      penaltyType: PenaltyType;
      penaltyPoints?: number;
      penaltySeconds?: number;
      penaltySimRatingDeduction?: number;
      penaltySafetyRatingDeduction?: number;
    }
  ) => {
    if (!activeChampionship || !currentUser) return;

    const targetProtest = (activeChampionship.protests || []).find((p) => p.id === protestId);
    if (!targetProtest) return;

    const isPenalized = judgmentData.penaltyType !== 'NO_PENALTY';
    const newStatus = isPenalized ? 'DEFERIDO' : 'INDEFERIDO';
    const penaltyPoints = judgmentData.penaltyPoints || 0;
    const penaltySeconds = judgmentData.penaltySeconds || 0;
    const simRatingDeduction = judgmentData.penaltySimRatingDeduction || 0;
    const safetyRatingDeduction = judgmentData.penaltySafetyRatingDeduction || 0;

    mutateChampionship(activeChampionship.id, (c) => {
      const updatedProtests = (c.protests || []).map((p) => {
        if (p.id === protestId) {
          return {
            ...p,
            status: newStatus as any,
            judgment: {
              stewardId: currentUser.id,
              stewardName: currentUser.name,
              decidedAt: new Date().toISOString(),
              verdict: judgmentData.verdict,
              penaltyType: judgmentData.penaltyType,
              penaltyPoints,
              penaltySeconds,
              penaltySimRatingDeduction: simRatingDeduction,
              penaltySafetyRatingDeduction: safetyRatingDeduction,
            },
          };
        }
        return p;
      });

      let updatedStages = c.stages;
      if (isPenalized) {
        updatedStages = c.stages.map((st) => {
          if (st.id === targetProtest.stageId && st.results && st.results.length > 0) {
            const updatedResults = st.results.map((res) => {
              if (res.driverId === targetProtest.defendantId) {
                const newPoints =
                  judgmentData.penaltyType === 'DSQ'
                    ? 0
                    : Math.max(0, res.pointsAwarded - penaltyPoints);
                const newPenaltiesPoints = (res.penaltiesPoints || 0) + penaltyPoints;
                const penNote = `Punição Comissários: ${judgmentData.penaltyType} (${
                  penaltyPoints > 0 ? `-${penaltyPoints} pts` : ''
                }${penaltySeconds > 0 ? ` +${penaltySeconds}s` : ''}) - ${judgmentData.verdict}`;
                return {
                  ...res,
                  status: judgmentData.penaltyType === 'DSQ' ? 'DSQ' : res.status,
                  pointsAwarded: newPoints,
                  penaltiesPoints: newPenaltiesPoints,
                  penaltyNotes: res.penaltyNotes ? `${res.penaltyNotes} | ${penNote}` : penNote,
                  gap:
                    penaltySeconds > 0
                      ? `${res.gap || ''} (+${penaltySeconds}s pen.)`
                      : res.gap,
                };
              }
              return res;
            });
            return {
              ...st,
              results: updatedResults,
            };
          }
          return st;
        });
      }

      return {
        ...c,
        protests: updatedProtests,
        stages: updatedStages,
      };
    });

    if (isPenalized) {
      const defendantUser = users.find((u) => u.id === targetProtest.defendantId);
      if (defendantUser) {
        const curSimRating = defendantUser.stats.simRating || 3000;
        const newSimRating = Math.max(1000, curSimRating - simRatingDeduction);

        let newSafetyRating = defendantUser.stats.safetyRating;
        if (safetyRatingDeduction > 0) {
          const parts = (defendantUser.stats.safetyRating || 'B 3.80').split(' ');
          const letter = parts[0] || 'B';
          const num = parseFloat(parts[1] || '3.50');
          const calcNum = Math.max(1.0, num - safetyRatingDeduction).toFixed(2);
          newSafetyRating = `${letter} ${calcNum}`;
        }

        const newPoints = Math.max(0, defendantUser.stats.points - penaltyPoints);

        updateUser({
          ...defendantUser,
          stats: {
            ...defendantUser.stats,
            simRating: newSimRating,
            safetyRating: newSafetyRating,
            points: newPoints,
          },
        });
      }
    }
  };

  const deleteProtest = (protestId: string) => {
    if (!activeChampionship) return;
    mutateChampionship(activeChampionship.id, (c) => ({
      ...c,
      protests: (c.protests || []).filter((p) => p.id !== protestId),
    }));
  };

  const voteDriverOfTheDay = (
    championshipId: string,
    stageId: string,
    driverId: string,
    voterId: string
  ) => {
    mutateChampionship(championshipId, (champ) => ({
      ...champ,
      stages: champ.stages.map((st) => {
        if (st.id !== stageId) return st;
        const currentTrophies = st.communityTrophies || {};
        const currentDotd = currentTrophies.driverOfTheDay || {
          totalVotes: 0,
          votesByDriverId: {},
          voterUserIds: {},
          votingClosed: false,
        };

        if (currentDotd.votingClosed) return st;

        const previousVote = currentDotd.voterUserIds[voterId];
        const newVotesByDriver = { ...currentDotd.votesByDriverId };
        let newTotal = currentDotd.totalVotes;

        if (previousVote === driverId) {
          return st;
        }

        if (previousVote && newVotesByDriver[previousVote]) {
          newVotesByDriver[previousVote] = Math.max(0, newVotesByDriver[previousVote] - 1);
        } else {
          newTotal += 1;
        }

        newVotesByDriver[driverId] = (newVotesByDriver[driverId] || 0) + 1;

        let highest = 0;
        let winDriverId = currentDotd.winnerDriverId || driverId;
        Object.entries(newVotesByDriver).forEach(([dId, count]) => {
          if (count > highest) {
            highest = count;
            winDriverId = dId;
          }
        });

        const winnerDriverObj = st.results?.find((r) => r.driverId === winDriverId);

        return {
          ...st,
          communityTrophies: {
            ...currentTrophies,
            driverOfTheDay: {
              ...currentDotd,
              totalVotes: newTotal,
              votesByDriverId: newVotesByDriver,
              voterUserIds: {
                ...currentDotd.voterUserIds,
                [voterId]: driverId,
              },
              winnerDriverId: winDriverId,
              winnerDriverName: winnerDriverObj?.driverName || currentDotd.winnerDriverName,
            },
          },
        };
      }),
    }));
  };

  const closeDriverOfTheDayVoting = (championshipId: string, stageId: string) => {
    mutateChampionship(championshipId, (champ) => ({
      ...champ,
      stages: champ.stages.map((st) => {
        if (st.id !== stageId) return st;
        return {
          ...st,
          communityTrophies: {
            ...(st.communityTrophies || {}),
            driverOfTheDay: {
              ...(st.communityTrophies?.driverOfTheDay || {
                totalVotes: 0,
                votesByDriverId: {},
                voterUserIds: {},
              }),
              votingClosed: true,
            },
          },
        };
      }),
    }));
  };

  const getDriverCommunityTrophies = (driverId: string) => {
    let dotdCount = 0;
    let overtakesCount = 0;
    let cleanCount = 0;
    let fastestLapCount = 0;

    championships.forEach((c) => {
      c.stages.forEach((st) => {
        if (st.communityTrophies) {
          if (st.communityTrophies.driverOfTheDay?.winnerDriverId === driverId) {
            dotdCount += 1;
          }
          if (st.communityTrophies.mostOvertakesDriverId === driverId) {
            overtakesCount += 1;
          }
          if (st.communityTrophies.cleanDriverId === driverId) {
            cleanCount += 1;
          }
          if (st.communityTrophies.fastestLapDriverId === driverId) {
            fastestLapCount += 1;
          }
        }
      });
    });

    return {
      dotdCount,
      overtakesCount,
      cleanCount,
      fastestLapCount,
      totalCommunityTrophies: dotdCount + overtakesCount + cleanCount + fastestLapCount,
    };
  };

  const propagatePilotProfileUpdate = async (
    oldId: string,
    newId: string,
    newName: string,
    userEmail?: string
  ) => {
    const cleanOldId = oldId.trim();
    const cleanNewId = (newId || oldId).trim();
    const cleanNewName = newName.trim();
    const cleanEmail = (userEmail || '').toLowerCase().trim();

    setChampionships((prev) => {
      const updated = prev.map((champ) => {
        let changed = false;

        // 1. Registrations
        const updatedRegistrations = (champ.registrations || []).map((reg) => {
          const regEmail = (reg.userEmail || '').toLowerCase().trim();
          const matches =
            reg.userId === cleanOldId ||
            reg.userId === cleanNewId ||
            (cleanEmail && regEmail === cleanEmail);

          if (matches) {
            changed = true;
            return {
              ...reg,
              userId: cleanNewId,
              userName: cleanNewName || reg.userName,
            };
          }
          return reg;
        });

        // 2. AdminIds
        const updatedAdminIds = (champ.adminIds || []).map((adminId) => {
          if (adminId === cleanOldId) {
            changed = true;
            return cleanNewId;
          }
          return adminId;
        });

        // 3. Stages, results, awards, protests
        const updatedStages = (champ.stages || []).map((stage) => {
          let stageChanged = false;

          const updatedResults = (stage.results || []).map((res) => {
            if (res.driverId === cleanOldId || res.driverId === cleanNewId) {
              stageChanged = true;
              return {
                ...res,
                driverId: cleanNewId,
                driverName: cleanNewName || res.driverName,
              };
            }
            return res;
          });

          let updatedPole = stage.poleDriverId;
          if (stage.poleDriverId === cleanOldId) {
            stageChanged = true;
            updatedPole = cleanNewId;
          }

          let updatedFL = stage.fastestLapDriverId;
          if (stage.fastestLapDriverId === cleanOldId) {
            stageChanged = true;
            updatedFL = cleanNewId;
          }

          let updatedTrophies = stage.communityTrophies;
          if (stage.communityTrophies?.driverOfTheDay) {
            const dotd = stage.communityTrophies.driverOfTheDay;
            if (dotd.winnerDriverId === cleanOldId || dotd.winnerDriverId === cleanNewId) {
              stageChanged = true;
              updatedTrophies = {
                ...stage.communityTrophies,
                driverOfTheDay: {
                  ...dotd,
                  winnerDriverId: cleanNewId,
                  winnerDriverName: cleanNewName || dotd.winnerDriverName,
                },
              };
            }
          }

          if (stageChanged) {
            changed = true;
            return {
              ...stage,
              results: updatedResults,
              poleDriverId: updatedPole,
              fastestLapDriverId: updatedFL,
              communityTrophies: updatedTrophies,
            };
          }
          return stage;
        });

        if (changed) {
          const updatedChamp = {
            ...champ,
            registrations: updatedRegistrations,
            adminIds: updatedAdminIds,
            stages: updatedStages,
          };
          saveChampionshipToCloud(updatedChamp).catch(() => {});
          return updatedChamp;
        }
        return champ;
      });

      try {
        localStorage.setItem('apexsim_championships_db', JSON.stringify(updated));
      } catch (_) {}

      return updated;
    });
  };

  const reloadChampionships = async () => {
    try {
      const res = await syncBackendWithFirestoreChampionships();
      if (Array.isArray(res)) {
        const filtered = res.filter(isRealChampionship);
        setChampionships(filtered);
        try {
          localStorage.setItem('apexsim_championships_db', JSON.stringify(filtered));
        } catch (_) {}
      }
    } catch (e) {
      console.warn('Reload championships error:', e);
    }
  };

  return (
    <ChampionshipContext.Provider
      value={{
        championships: visibleChampionships,
        activeChampionship,
        setActiveChampionshipId,
        createChampionship,
        updateChampionship,
        addLeagueAdmin,
        removeLeagueAdmin,
        getLeagueAdmins,
        isUserLeagueAdmin,
        addStage,
        updateStage,
        deleteStage,
        registerPilotRequest,
        adminAddPilot,
        updateRegistrationStatus,
        updatePilotTeam,
        getUserChampionshipsCount,
        getUserChampionships,
        canUserJoinChampionship,
        recordRaceResults,
        deleteChampionship,
        submitProtest,
        judgeProtest,
        deleteProtest,
        voteDriverOfTheDay,
        closeDriverOfTheDayVoting,
        getDriverCommunityTrophies,
        propagatePilotProfileUpdate,
        reloadChampionships,
      }}
    >
      {children}
    </ChampionshipContext.Provider>
  );
};

export const useChampionships = () => {
  const context = useContext(ChampionshipContext);
  if (!context) throw new Error('useChampionships must be used within a ChampionshipProvider');
  return context;
};
