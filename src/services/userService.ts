import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  getDocs,
  getDoc,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirestoreQuotaExceeded, handleFirestoreError } from '../lib/firebase';
import { User } from '../types';
import { THYAGO_ADMIN_USER } from '../data/mockData';

const USERS_COLLECTION = 'users';

// Read locally persisted deleted identifiers
const getPersistedDeletedUsers = (): Set<string> => {
  const base = [
    'user_1791048231452_xa2l',
    'user_1791049287095_z3as',
    'user_1791244365686_k1vw',
    'mouraengambiental@gmail.com',
    'testes123@gmail.com',
    'tyko moura',
    'piloto de testes',
  ];
  try {
    const saved = localStorage.getItem('apexsim_deleted_users_db');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        parsed.forEach((id: string) => base.push(id.toLowerCase().trim()));
      }
    }
  } catch (_) {}
  return new Set(base.map((item) => item.toLowerCase().trim()));
};

export const DELETED_USERS_SET = getPersistedDeletedUsers();

export const addDeletedUserTombstone = (identifier: string) => {
  if (!identifier) return;
  const clean = identifier.toLowerCase().trim();
  DELETED_USERS_SET.add(clean);
  try {
    const arr = Array.from(DELETED_USERS_SET);
    localStorage.setItem('apexsim_deleted_users_db', JSON.stringify(arr));
  } catch (_) {}
};

export const isDeletedUserAccount = (u: any): boolean => {
  if (!u) return false;
  const id = (u.id || u.userId || '').toString().toLowerCase().trim();
  const email = (u.email || u.userEmail || '').toString().toLowerCase().trim();
  const name = (u.name || u.userName || u.driverName || '').toString().toLowerCase().trim();
  return Boolean(
    (id && DELETED_USERS_SET.has(id)) ||
    (email && DELETED_USERS_SET.has(email)) ||
    (name && DELETED_USERS_SET.has(name))
  );
};

export const isFakeMockUser = (u: any): boolean => {
  if (!u) return true;
  if (isDeletedUserAccount(u)) return true;
  const id = (u.id || u.userId || '').toString().toLowerCase().trim();
  if (id.startsWith('user_pilot_') || id.startsWith('user_admin_')) return true;
  const email = (u.email || u.userEmail || '').toString().toLowerCase().trim();
  if (
    email.includes('@motorsport.com') ||
    email.includes('@simracing.br') ||
    email.includes('@redline.com') ||
    email.includes('@scuderia.br') ||
    email.includes('@williams.sim')
  ) {
    return true;
  }
  return false;
};

// Known championship cars/teams that should NOT be treated as user profile esports teams
export const CHAMPIONSHIP_CAR_TEAMS = new Set([
  'haas f1 team',
  'visa cash app rb formula one team',
  'aston martin aramco f1 team',
  'stake f1 team kick sauber',
  'bwt alpine f1 team',
  'oracle red bull racing',
  'scuderia ferrari',
  'mclaren formula 1 team',
  'mercedes-amg petronas f1 team',
  'williams racing',
  'scuderia apex racing',
  'redline simsports',
  'williams sim academy',
  'apex gp',
  'penske virtual porsche',
  'ferrari esports br',
  'mclaren shadow brasil',
  'red bull virtual gp'
]);

// Ensures only real user profile teams (configured in DriverProfileView) appear on users, never championship teams
export const sanitizeUserProfileTeams = (u: User): User => {
  if (!u) return u;
  const isThyago = (u.email || '').toLowerCase().trim() === 'thyago.talm@gmail.com' || u.id === 'user_thyago_talm';
  if (isThyago) {
    return {
      ...u,
      teamName: u.teamName || 'RDX Racing',
      teamTag: u.teamTag || 'RDX',
    };
  }

  if (u.teamName && CHAMPIONSHIP_CAR_TEAMS.has(u.teamName.toLowerCase().trim())) {
    return {
      ...u,
      teamName: '',
      teamTag: '',
    };
  }

  return u;
};

// Permanently delete user from Firestore and Backend across all databases
export const deleteUserCompletely = async (id: string, email?: string, name?: string): Promise<{ success: boolean; message: string }> => {
  const cleanId = id.trim();
  const cleanEmail = (email || '').toLowerCase().trim();
  const cleanName = (name || '').toLowerCase().trim();

  // Protect Master Admin account
  if (cleanEmail === 'thyago.talm@gmail.com' || cleanId === 'user_thyago_talm') {
    throw new Error('A conta do Admin Master (thyago.talm@gmail.com) é protegida contra exclusão.');
  }

  // Register tombstones in memory & localStorage immediately
  addDeletedUserTombstone(cleanId);
  if (cleanEmail) addDeletedUserTombstone(cleanEmail);
  if (cleanName) addDeletedUserTombstone(cleanName);

  // 1. Delete user document from Firestore and register in user_metadata/deleted_users
  if (!isFirestoreQuotaExceeded()) {
    try {
      // 1a. Register in tombstone metadata doc
      const identifiersToSave = [cleanId.toLowerCase()];
      const tombstonePayload: Record<string, any> = {
        [cleanId]: true,
        updatedAt: serverTimestamp(),
      };
      if (cleanEmail) {
        identifiersToSave.push(cleanEmail);
        tombstonePayload[cleanEmail.replace(/[\.\@]/g, '_')] = true;
      }
      if (cleanName) {
        identifiersToSave.push(cleanName);
        tombstonePayload[cleanName.replace(/[\.\@\s]/g, '_')] = true;
      }
      tombstonePayload.identifiers = arrayUnion(...identifiersToSave);
      await setDoc(doc(db, 'user_metadata', 'deleted_users'), tombstonePayload, { merge: true });

      // 1b. Delete primary user document
      await deleteDoc(doc(db, USERS_COLLECTION, cleanId));

      // 1c. Scan and delete any other documents matching this user ID, email or name
      const userColSnap = await getDocs(collection(db, USERS_COLLECTION));
      for (const d of userColSnap.docs) {
        const dData = d.data();
        const dId = (d.id || '').toLowerCase().trim();
        const uId = (dData.id || '').toLowerCase().trim();
        const uEmail = (dData.email || '').toLowerCase().trim();
        const uName = (dData.name || '').toLowerCase().trim();
        if (
          dId === cleanId.toLowerCase() ||
          uId === cleanId.toLowerCase() ||
          (cleanEmail && uEmail === cleanEmail) ||
          (cleanName && uName === cleanName)
        ) {
          await deleteDoc(doc(db, USERS_COLLECTION, d.id));
        }
      }
    } catch (err) {
      handleFirestoreError(err);
      console.warn('Error deleting user from Firestore users collection:', err);
    }
  }

  // 2. Clean user from all championships in Firestore (registrations, admin lists, stage results)
  if (!isFirestoreQuotaExceeded()) {
    try {
      const champsCol = collection(db, 'championships');
      const champSnap = await getDocs(champsCol);
      for (const champDoc of champSnap.docs) {
        const champData = champDoc.data();
        let modified = false;

        let registrations = champData.registrations || [];
        const origRegLen = registrations.length;
        registrations = registrations.filter((r: any) => {
          const rId = (r.userId || '').toLowerCase().trim();
          const rEmail = (r.userEmail || '').toLowerCase().trim();
          const rName = (r.userName || '').toLowerCase().trim();
          const matches =
            rId === cleanId.toLowerCase() ||
            (cleanEmail && rEmail === cleanEmail) ||
            (cleanName && rName === cleanName);
          return !matches;
        });
        if (registrations.length !== origRegLen) {
          modified = true;
        }

        let adminIds = champData.adminIds || [];
        if (adminIds.some((aid: string) => aid.toLowerCase().trim() === cleanId.toLowerCase())) {
          adminIds = adminIds.filter((aid: string) => aid.toLowerCase().trim() !== cleanId.toLowerCase());
          modified = true;
        }

        // Clean from stage results
        let stages = champData.stages || [];
        if (Array.isArray(stages)) {
          stages = stages.map((st: any) => {
            let stageChanged = false;
            if (Array.isArray(st.results)) {
              const origLen = st.results.length;
              const filteredResults = st.results.filter((res: any) => {
                const resId = (res.driverId || '').toLowerCase().trim();
                const resEmail = (res.driverEmail || '').toLowerCase().trim();
                const resName = (res.driverName || '').toLowerCase().trim();
                return !(
                  resId === cleanId.toLowerCase() ||
                  (cleanEmail && resEmail === cleanEmail) ||
                  (cleanName && resName === cleanName)
                );
              });
              if (filteredResults.length !== origLen) {
                st.results = filteredResults;
                stageChanged = true;
              }
            }
            if (Array.isArray(st.sprintResults)) {
              const origLen = st.sprintResults.length;
              const filteredSprint = st.sprintResults.filter((res: any) => {
                const resId = (res.driverId || '').toLowerCase().trim();
                const resEmail = (res.driverEmail || '').toLowerCase().trim();
                const resName = (res.driverName || '').toLowerCase().trim();
                return !(
                  resId === cleanId.toLowerCase() ||
                  (cleanEmail && resEmail === cleanEmail) ||
                  (cleanName && resName === cleanName)
                );
              });
              if (filteredSprint.length !== origLen) {
                st.sprintResults = filteredSprint;
                stageChanged = true;
              }
            }
            if (st.poleDriverId && st.poleDriverId.toLowerCase().trim() === cleanId.toLowerCase()) {
              delete st.poleDriverId;
              stageChanged = true;
            }
            if (st.fastestLapDriverId && st.fastestLapDriverId.toLowerCase().trim() === cleanId.toLowerCase()) {
              delete st.fastestLapDriverId;
              stageChanged = true;
            }
            if (stageChanged) {
              modified = true;
            }
            return st;
          });
        }

        if (modified) {
          await updateDoc(doc(db, 'championships', champDoc.id), {
            registrations,
            adminIds,
            stages,
            updatedAt: serverTimestamp(),
          });
        }
      }
    } catch (err) {
      handleFirestoreError(err);
      console.warn('Error cleaning user from Firestore championships:', err);
    }
  }

  // 3. Delete from Backend Server API (passing email and name in body and query for complete purge)
  try {
    await fetch(`/api/users/${encodeURIComponent(cleanId)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, name: cleanName }),
    });
  } catch (err) {
    console.warn('Error deleting user from backend server:', err);
  }

  // 4. Clean local storage cache for users and championships
  try {
    const cachedUsers = localStorage.getItem('apexsim_users_db');
    if (cachedUsers) {
      const parsed: User[] = JSON.parse(cachedUsers);
      const filtered = parsed.filter(
        (u) =>
          u.id.toLowerCase().trim() !== cleanId.toLowerCase() &&
          (!cleanEmail || (u.email || '').toLowerCase().trim() !== cleanEmail) &&
          (!cleanName || (u.name || '').toLowerCase().trim() !== cleanName)
      );
      localStorage.setItem('apexsim_users_db', JSON.stringify(filtered));
    }

    const cachedChamps = localStorage.getItem('apexsim_championships_db');
    if (cachedChamps) {
      const parsedChamps = JSON.parse(cachedChamps);
      if (Array.isArray(parsedChamps)) {
        const cleanedChamps = parsedChamps.map((c: any) => {
          if (Array.isArray(c.registrations)) {
            c.registrations = c.registrations.filter((r: any) => {
              const rId = (r.userId || '').toLowerCase().trim();
              const rEmail = (r.userEmail || '').toLowerCase().trim();
              const rName = (r.userName || '').toLowerCase().trim();
              return !(
                rId === cleanId.toLowerCase() ||
                (cleanEmail && rEmail === cleanEmail) ||
                (cleanName && rName === cleanName)
              );
            });
          }
          return c;
        });
        localStorage.setItem('apexsim_championships_db', JSON.stringify(cleanedChamps));
      }
    }

    const currentLoggedInId = localStorage.getItem('apexsim_current_user_id');
    if (currentLoggedInId === cleanId) {
      localStorage.removeItem('apexsim_current_user_id');
    }
  } catch (err) {
    console.warn('Error cleaning local storage cache for user:', err);
  }

  return {
    success: true,
    message: `Conta ${cleanEmail || cleanId} totalmente expurgada de todos os bancos de dados do sistema!`,
  };
};

// Fetch users from local backend server API (/api/users)
export const fetchBackendUsers = async (): Promise<User[]> => {
  try {
    const res = await fetch('/api/users');
    if (res.ok) {
      const data = await res.json();
      // Incorporate any tombstones from backend into our local deleted set
      if (data && Array.isArray(data.deletedIds)) {
        data.deletedIds.forEach((did: string) => addDeletedUserTombstone(did));
      }
      if (data && Array.isArray(data.users)) {
        return data.users.filter((u: User) => !isFakeMockUser(u)).map(sanitizeUserProfileTeams);
      }
    }
  } catch (err) {
    console.warn('Backend /api/users not reachable:', err);
  }
  return [];
};

// Push users to backend server API (/api/users/sync)
export const syncUsersToBackend = async (users: User[]): Promise<void> => {
  try {
    const validUsers = users.filter((u) => !isFakeMockUser(u));
    await fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users: validUsers }),
    });
  } catch (err) {
    console.warn('Failed to sync users to backend /api/users/sync:', err);
  }
};

// Save or update user in Firestore
export const saveUserToFirestore = async (user: User): Promise<void> => {
  if (isFakeMockUser(user)) return;
  if (isFirestoreQuotaExceeded()) {
    return;
  }
  try {
    const userDocRef = doc(db, USERS_COLLECTION, user.id);
    await setDoc(
      userDocRef,
      {
        ...user,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    if (handleFirestoreError(error)) {
      return;
    }
    console.error('Error saving user to Firestore:', error);
  }
};

// Two-way synchronization: merges Backend users + Firestore users
export const syncBackendWithFirestore = async (): Promise<User[]> => {
  const mergedMap = new Map<string, User>();

  // 1. Get backend users
  const backendUsers = await fetchBackendUsers();
  backendUsers.forEach((u) => {
    if (!isFakeMockUser(u)) {
      mergedMap.set(u.email.toLowerCase().trim(), u);
    }
  });

  // 2. Sync tombstones from Firestore metadata if available
  if (!isFirestoreQuotaExceeded()) {
    try {
      const delDoc = await getDoc(doc(db, 'user_metadata', 'deleted_users'));
      if (delDoc.exists()) {
        const data = delDoc.data();
        if (Array.isArray(data.identifiers)) {
          data.identifiers.forEach((item: string) => addDeletedUserTombstone(item));
        }
        Object.keys(data).forEach((key) => {
          if (key !== 'updatedAt' && data[key] === true) {
            addDeletedUserTombstone(key);
          }
        });
      }
    } catch (_) {}
  }

  // 2b. Get Firestore users (only if quota is not exceeded to prevent backoff hanging)
  if (!isFirestoreQuotaExceeded()) {
    try {
      const colRef = collection(db, USERS_COLLECTION);
      const snap = await getDocs(colRef);
      snap.forEach((docSnap) => {
        const u = docSnap.data() as User;
        const dId = (docSnap.id || '').toLowerCase().trim();
        if (
          DELETED_USERS_SET.has(dId) ||
          isDeletedUserAccount(u) ||
          isDeletedUserAccount({ id: docSnap.id, email: u?.email, name: u?.name })
        ) {
          // It's a deleted user! Actively purge it from Firestore
          deleteDoc(doc(db, USERS_COLLECTION, docSnap.id)).catch(() => {});
          return;
        }

        if (u && u.email && !isFakeMockUser(u)) {
          const emailKey = u.email.toLowerCase().trim();
          const existing = mergedMap.get(emailKey);
          mergedMap.set(emailKey, {
            ...existing,
            ...u,
            id: docSnap.id || u.id,
          });
        }
      });
    } catch (err) {
      handleFirestoreError(err);
      console.warn('Error reading Firestore docs during sync:', err);
    }
  }

  // 3. Scan championships to ensure all registered pilots have accounts
  try {
    const champRes = await fetch('/api/championships');
    if (champRes.ok) {
      const champData = await champRes.json();
      if (champData && Array.isArray(champData.championships)) {
        champData.championships.forEach((c: any) => {
          (c.registrations || []).forEach((r: any) => {
            const emailKey = (r.userEmail || '').toLowerCase().trim();
            const idKey = (r.userId || '').toLowerCase().trim();
            const nameKey = (r.userName || '').toLowerCase().trim();
            if (
              (idKey && DELETED_USERS_SET.has(idKey)) ||
              (emailKey && DELETED_USERS_SET.has(emailKey)) ||
              (nameKey && DELETED_USERS_SET.has(nameKey)) ||
              isDeletedUserAccount(r) ||
              isDeletedUserAccount({ id: r.userId, email: r.userEmail, name: r.userName })
            ) {
              return;
            }
            if (emailKey && !mergedMap.has(emailKey)) {
              mergedMap.set(emailKey, {
                id: r.userId || `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                name: r.userName || emailKey.split('@')[0],
                email: r.userEmail,
                avatar: r.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
                role: 'pilot',
                gamingPlatform: r.platform || 'Steam (PC)',
                gamingId: r.steamGuid || r.gamingId || '',
                steamId: r.steamGuid || r.steamId || '',
                discordTag: r.discord || '',
                country: r.country || 'Brasil 🇧🇷',
                racingNumber: r.carNumber || 9,
                driverCategory: 'Pro',
                // User profile teamName and teamTag must come exclusively from profile editing, not championship teams
                teamName: '',
                teamTag: '',
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
              });
            }
          });
        });
      }
    }
  } catch (err) {
    console.warn('Error checking championships for pilots during sync:', err);
  }

  // 4. Ensure Thyago is present
  const hasThyago = mergedMap.has('thyago.talm@gmail.com');
  if (!hasThyago) {
    mergedMap.set('thyago.talm@gmail.com', THYAGO_ADMIN_USER);
  }

  const allMergedUsers = Array.from(mergedMap.values()).map(sanitizeUserProfileTeams);

  // 5. Sync merged back to backend without burning Firestore quota
  syncUsersToBackend(allMergedUsers).catch(() => {});

  return allMergedUsers;
};

// Master Admin: Update pilot profile data (Name, ID, Team, Stats, etc.) excluding email & password
export const adminUpdatePilotProfileService = async (
  oldId: string,
  updatedData: Partial<User>
): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    // 1. Send update to backend server
    const res = await fetch(`/api/users/${encodeURIComponent(oldId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Falha ao atualizar dados do piloto no servidor.');
    }

    const savedUser: User = data.user;

    // 2. Sync to Firestore if quota allows
    if (!isFirestoreQuotaExceeded()) {
      try {
        const newId = savedUser.id;
        if (newId !== oldId) {
          // If ID changed, create document with new ID and delete old document
          await setDoc(doc(db, USERS_COLLECTION, newId), {
            ...savedUser,
            updatedAt: serverTimestamp(),
          });
          await deleteDoc(doc(db, USERS_COLLECTION, oldId));
        } else {
          await setDoc(
            doc(db, USERS_COLLECTION, oldId),
            {
              ...savedUser,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }
      } catch (fErr) {
        handleFirestoreError(fErr);
        console.warn('Firestore update warning (backend saved successfully):', fErr);
      }
    }

    return { success: true, user: savedUser };
  } catch (err: any) {
    console.error('adminUpdatePilotProfileService error:', err);
    return { success: false, error: err.message || 'Erro ao atualizar piloto.' };
  }
};

// Real-time listener for all registered users across all devices, merging Firestore + Backend
export const subscribeToUsers = (onUsersChange: (users: User[]) => void) => {
  let pollingInterval: any = null;

  const triggerUnifiedSync = async () => {
    try {
      const merged = await syncBackendWithFirestore();
      if (merged && merged.length > 0) {
        onUsersChange(merged.map(sanitizeUserProfileTeams));
      }
    } catch (e) {
      console.warn('Unified sync fallback error:', e);
    }
  };

  try {
    // Initial sync between Backend and Firestore immediately
    triggerUnifiedSync();

    // Set up continuous fallback poll every 8 seconds so no user is ever missing
    pollingInterval = setInterval(triggerUnifiedSync, 8000);

    const colRef = collection(db, USERS_COLLECTION);
    const unsubscribe = onSnapshot(
      colRef,
      async (snapshot) => {
        const firestoreMap = new Map<string, User>();
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as User;
          const dId = (docSnap.id || '').toLowerCase().trim();
          if (
            DELETED_USERS_SET.has(dId) ||
            isDeletedUserAccount(data) ||
            isDeletedUserAccount({ id: docSnap.id, email: data?.email, name: data?.name })
          ) {
            deleteDoc(doc(db, USERS_COLLECTION, docSnap.id)).catch(() => {});
            return;
          }
          if (data && data.email && !isFakeMockUser(data)) {
            const emailKey = data.email.toLowerCase().trim();
            let userData: User = {
              ...data,
              id: docSnap.id,
            };
            if (emailKey === 'thyago.talm@gmail.com' && (userData.stats?.races === 52 || userData.stats?.points === 980)) {
              userData = {
                ...userData,
                administeredLeagueIds: (userData.administeredLeagueIds || []).filter(
                  (id) => !id.startsWith('champ_gt3_') && !id.startsWith('champ_f1_brasil_') && !id.startsWith('champ_porsche_')
                ),
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
            }
            firestoreMap.set(emailKey, userData);
          }
        });

        // Also merge with backend users to guarantee no user is missing
        const backendUsers = await fetchBackendUsers();
        backendUsers.forEach((bu) => {
          const emailKey = (bu.email || '').toLowerCase().trim();
          if (emailKey && !firestoreMap.has(emailKey) && !isFakeMockUser(bu)) {
            firestoreMap.set(emailKey, bu);
          }
        });

        // Always guarantee Thyago is present as super admin
        if (!firestoreMap.has('thyago.talm@gmail.com')) {
          firestoreMap.set('thyago.talm@gmail.com', THYAGO_ADMIN_USER);
        }

        const unifiedList = Array.from(firestoreMap.values()).map(sanitizeUserProfileTeams);
        onUsersChange(unifiedList);
      },
      (error) => {
        handleFirestoreError(error);
        console.warn('Firestore onSnapshot listener error; continuing with backend polling:', error);
      }
    );

    return () => {
      unsubscribe();
      if (pollingInterval) clearInterval(pollingInterval);
    };
  } catch (error) {
    console.error('Failed to set up Firestore snapshot listener, falling back to polling:', error);
    pollingInterval = setInterval(triggerUnifiedSync, 8000);
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }
};
