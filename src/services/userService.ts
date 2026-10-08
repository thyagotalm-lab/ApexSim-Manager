import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirestoreQuotaExceeded, handleFirestoreError } from '../lib/firebase';
import { User } from '../types';
import { THYAGO_ADMIN_USER } from '../data/mockData';

const USERS_COLLECTION = 'users';

export const DELETED_USERS_SET = new Set([
  'user_1791048231452_xa2l',
  'user_1791049287095_z3as',
  'user_1791244365686_k1vw',
  'mouraengambiental@gmail.com',
  'testes123@gmail.com',
  'tyko moura',
  'piloto de testes',
]);

export const isDeletedUserAccount = (u: any): boolean => {
  if (!u) return false;
  const id = (u.id || '').toLowerCase().trim();
  const email = (u.email || '').toLowerCase().trim();
  const name = (u.name || '').toLowerCase().trim();
  return (
    DELETED_USERS_SET.has(id) ||
    DELETED_USERS_SET.has(email) ||
    DELETED_USERS_SET.has(name)
  );
};

export const isFakeMockUser = (u: any): boolean => {
  if (!u || !u.id) return true;
  if (isDeletedUserAccount(u)) return true;
  if (u.id.startsWith('user_pilot_') || u.id.startsWith('user_admin_')) return true;
  const email = (u.email || '').toLowerCase().trim();
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
export const deleteUserCompletely = async (id: string, email?: string): Promise<{ success: boolean; message: string }> => {
  const cleanId = id.trim();
  const cleanEmail = (email || '').toLowerCase().trim();

  // Protect Master Admin account
  if (cleanEmail === 'thyago.talm@gmail.com' || cleanId === 'user_thyago_talm') {
    throw new Error('A conta do Admin Master (thyago.talm@gmail.com) é protegida contra exclusão.');
  }

  DELETED_USERS_SET.add(cleanId.toLowerCase());

  // 1. Delete user document from Firestore
  if (!isFirestoreQuotaExceeded()) {
    try {
      await deleteDoc(doc(db, USERS_COLLECTION, cleanId));
      await setDoc(doc(db, 'user_metadata', 'deleted_users'), {
        [cleanId]: true,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err);
      console.warn('Error deleting user from Firestore users collection:', err);
    }
  }

  // 2. Clean user from all championships in Firestore (registrations and admin lists)
  if (!isFirestoreQuotaExceeded()) {
    try {
      const champsCol = collection(db, 'championships');
      const champSnap = await getDocs(champsCol);
      for (const champDoc of champSnap.docs) {
        const champData = champDoc.data();
        let modified = false;

        let registrations = champData.registrations || [];
        const hasReg = registrations.some(
          (r: any) =>
            r.userId === cleanId ||
            (cleanEmail && r.userEmail && r.userEmail.toLowerCase().trim() === cleanEmail)
        );
        if (hasReg) {
          registrations = registrations.filter(
            (r: any) =>
              r.userId !== cleanId &&
              (!cleanEmail || !r.userEmail || r.userEmail.toLowerCase().trim() !== cleanEmail)
          );
          modified = true;
        }

        let adminIds = champData.adminIds || [];
        if (adminIds.includes(cleanId)) {
          adminIds = adminIds.filter((aid: string) => aid !== cleanId);
          modified = true;
        }

        if (modified) {
          await updateDoc(doc(db, 'championships', champDoc.id), {
            registrations,
            adminIds,
            updatedAt: serverTimestamp(),
          });
        }
      }
    } catch (err) {
      handleFirestoreError(err);
      console.warn('Error cleaning user from Firestore championships:', err);
    }
  }

  // 3. Delete from Backend Server API
  try {
    await fetch(`/api/users/${cleanId}`, { method: 'DELETE' });
  } catch (err) {
    console.warn('Error deleting user from backend server:', err);
  }

  // 4. Clean local storage cache
  try {
    const cachedUsers = localStorage.getItem('apexsim_users_db');
    if (cachedUsers) {
      const parsed: User[] = JSON.parse(cachedUsers);
      const filtered = parsed.filter(
        (u) => u.id !== cleanId && (!cleanEmail || u.email.toLowerCase().trim() !== cleanEmail)
      );
      localStorage.setItem('apexsim_users_db', JSON.stringify(filtered));
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

  // 2. Get Firestore users (only if quota is not exceeded to prevent backoff hanging)
  if (!isFirestoreQuotaExceeded()) {
    try {
      const colRef = collection(db, USERS_COLLECTION);
      const snap = await getDocs(colRef);
      snap.forEach((docSnap) => {
        const u = docSnap.data() as User;
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
