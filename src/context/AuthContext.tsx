import React, { createContext, useContext, useEffect, useState } from 'react';
import { INITIAL_USERS, THYAGO_ADMIN_USER } from '../data/mockData';
import { User, UserRole } from '../types';
import {
  subscribeToUsers,
  saveUserToFirestore,
  isFakeMockUser,
  isDeletedUserAccount,
  syncBackendWithFirestore,
  deleteUserCompletely,
  sanitizeUserProfileTeams,
  adminUpdatePilotProfileService,
  fetchBackendUsers,
  resetAllUsersSimRatingService,
} from '../services/userService';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  loginWithEmail: (email: string, password?: string) => boolean;
  loginWithGoogle: (customEmail?: string) => void;
  registerUser: (data: {
    name: string;
    email: string;
    password?: string;
    role: UserRole;
    country?: string;
    gamingPlatform?: string;
    gamingId?: string;
    racingNumber?: number;
    steamId?: string;
    discordTag?: string;
    avatar?: string;
    teamName?: string;
    teamTag?: string;
  }) => User;
  switchUser: (userId: string) => void;
  logout: () => void;
  updateUser: (updated: User) => Promise<{ success: boolean; error?: string }>;
  resetPilotStats: (userId: string) => void;
  resetAllSimRatingStats: () => Promise<{ success: boolean; error?: string }>;
  syncUsers: () => Promise<void>;
  deleteUserAccountPermanently: (userId: string) => Promise<{ success: boolean; message: string }>;
  adminUpdatePilotProfile: (oldId: string, updatedData: Partial<User>) => Promise<{ success: boolean; user?: User; error?: string }>;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('apexsim_users_db');
      if (saved) {
        let parsed: User[] = JSON.parse(saved);
        // Actively filter out all fictitious test accounts
        parsed = parsed.filter((u) => !isFakeMockUser(u));

        // Check for Thyago Talm account
        const thyagoIndex = parsed.findIndex((u) => u.email.toLowerCase().trim() === 'thyago.talm@gmail.com');
        if (thyagoIndex >= 0) {
          const currentStats = parsed[thyagoIndex].stats || {
            races: 0,
            wins: 0,
            podiums: 0,
            poles: 0,
            fastestLaps: 0,
            points: 0,
            dnfs: 0,
            safetyRating: 'B 3.50',
            simRating: 3000,
          };
          const isOldMock = currentStats.races === 52 || currentStats.points === 980;
          parsed[thyagoIndex] = {
            ...parsed[thyagoIndex],
            role: 'admin',
            stats: {
              ...(isOldMock
                ? {
                    races: 0,
                    wins: 0,
                    podiums: 0,
                    poles: 0,
                    fastestLaps: 0,
                    points: 0,
                    dnfs: 0,
                    safetyRating: 'B 3.50',
                  }
                : currentStats),
              simRating: 3000,
            },
            administeredLeagueIds: (parsed[thyagoIndex].administeredLeagueIds || []).filter(
              (id) => !id.startsWith('champ_gt3_') && !id.startsWith('champ_f1_brasil_') && !id.startsWith('champ_porsche_')
            ),
          };
          return parsed.map(sanitizeUserProfileTeams);
        } else {
          return [THYAGO_ADMIN_USER, ...parsed].map(sanitizeUserProfileTeams);
        }
      }
    } catch (e) {
      console.error(e);
    }
    return [THYAGO_ADMIN_USER];
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const savedId = localStorage.getItem('apexsim_current_user_id');
      if (savedId) {
        if (isDeletedUserAccount({ id: savedId })) {
          localStorage.removeItem('apexsim_current_user_id');
          return null;
        }
        const found = users.find((u) => u.id === savedId && !isFakeMockUser(u) && !isDeletedUserAccount(u));
        if (found) return sanitizeUserProfileTeams(found);
      }
    } catch (e) {
      console.error(e);
    }
    // Visitors start logged out by default
    return null;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Real-time synchronization via Firestore and immediate Backend population
  useEffect(() => {
    // 1. Immediately fetch from backend API /api/users to guarantee all created accounts appear without waiting
    fetchBackendUsers().then((backendUsers) => {
      if (backendUsers && backendUsers.length > 0) {
        setUsers((prev) => {
          const map = new Map<string, User>();
          backendUsers.forEach((u) => map.set(u.email.toLowerCase().trim(), u));
          prev.forEach((u) => {
            const key = u.email.toLowerCase().trim();
            if (!map.has(key) && !isFakeMockUser(u)) {
              map.set(key, u);
            }
          });
          const freshUsers = Array.from(map.values()).map(sanitizeUserProfileTeams);
          setCurrentUser((current) => {
            if (!current) return null;
            const updated = freshUsers.find(
              (u) =>
                u.id === current.id ||
                (u.email && current.email && u.email.toLowerCase().trim() === current.email.toLowerCase().trim())
            );
            return updated ? updated : current;
          });
          return freshUsers;
        });
      }
    });

    const unsubscribe = subscribeToUsers((firestoreUsers) => {
      if (firestoreUsers && firestoreUsers.length > 0) {
        // Enforce clean zeroed stats and 3000 Sim Rating for Thyago
        const sanitized = firestoreUsers.map((u) => {
          if (u.email.toLowerCase().trim() === 'thyago.talm@gmail.com') {
            const needsUpdate =
              u.stats.races === 52 ||
              u.stats.points === 980 ||
              u.stats.simRating !== 3000;

            if (needsUpdate) {
              const cleaned: User = {
                ...u,
                administeredLeagueIds: (u.administeredLeagueIds || []).filter(
                  (id) => !id.startsWith('champ_gt3_') && !id.startsWith('champ_f1_brasil_') && !id.startsWith('champ_porsche_')
                ),
                stats: {
                  races: u.stats.races === 52 ? 0 : u.stats.races,
                  wins: u.stats.races === 52 ? 0 : u.stats.wins,
                  podiums: u.stats.races === 52 ? 0 : u.stats.podiums,
                  poles: u.stats.races === 52 ? 0 : u.stats.poles,
                  fastestLaps: u.stats.races === 52 ? 0 : u.stats.fastestLaps,
                  points: u.stats.points === 980 ? 0 : u.stats.points,
                  dnfs: u.stats.dnfs,
                  safetyRating: u.stats.safetyRating || 'B 3.50',
                  simRating: 3000,
                },
              };
              return cleaned;
            }
          }
          return u;
        });

        const cleanUsers = sanitized.map(sanitizeUserProfileTeams);
        setUsers(cleanUsers);
        setCurrentUser((current) => {
          if (!current) return null;
          const updated = cleanUsers.find(
            (u) =>
              u.id === current.id ||
              (u.email && current.email && u.email.toLowerCase().trim() === current.email.toLowerCase().trim())
          );
          return updated ? updated : current;
        });
        try {
          localStorage.setItem('apexsim_users_db', JSON.stringify(cleanUsers));
        } catch (_) {}
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Guarantee current logged-in Thyago has reset stats and 3000 Sim Rating in local state
  useEffect(() => {
    if (currentUser && currentUser.email.toLowerCase().trim() === 'thyago.talm@gmail.com') {
      const needsUpdate =
        currentUser.stats.races === 52 ||
        currentUser.stats.points === 980 ||
        currentUser.stats.simRating !== 3000;

      if (needsUpdate) {
        const resetUser: User = {
          ...currentUser,
          administeredLeagueIds: (currentUser.administeredLeagueIds || []).filter(
            (id) => !id.startsWith('champ_gt3_') && !id.startsWith('champ_f1_brasil_') && !id.startsWith('champ_porsche_')
          ),
          stats: {
            races: currentUser.stats.races === 52 ? 0 : currentUser.stats.races,
            wins: currentUser.stats.races === 52 ? 0 : currentUser.stats.wins,
            podiums: currentUser.stats.races === 52 ? 0 : currentUser.stats.podiums,
            poles: currentUser.stats.races === 52 ? 0 : currentUser.stats.poles,
            fastestLaps: currentUser.stats.races === 52 ? 0 : currentUser.stats.fastestLaps,
            points: currentUser.stats.points === 980 ? 0 : currentUser.stats.points,
            dnfs: currentUser.stats.dnfs,
            safetyRating: currentUser.stats.safetyRating || 'B 3.50',
            simRating: 3000,
          },
        };
        setCurrentUser(resetUser);
        setUsers((prev) => prev.map((u) => (u.id === resetUser.id ? resetUser : u)));
      }
    }
  }, [currentUser?.email, currentUser?.stats?.races, currentUser?.stats?.points, currentUser?.stats?.simRating]);

  useEffect(() => {
    try {
      const cleaned = users.filter((u) => !isFakeMockUser(u));
      localStorage.setItem('apexsim_users_db', JSON.stringify(cleaned));
    } catch (e) {
      console.error(e);
    }
  }, [users]);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('apexsim_current_user_id', currentUser.id);
      } else {
        localStorage.removeItem('apexsim_current_user_id');
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentUser]);

  const loginWithEmail = (email: string, password?: string): boolean => {
    const cleanEmail = email.toLowerCase().trim();
    const existing = users.find((u) => u.email.toLowerCase().trim() === cleanEmail);
    if (existing) {
      if (existing.password && password && existing.password !== password) {
        return false;
      }
      setCurrentUser(existing);
      setIsAuthModalOpen(false);
      return true;
    }
    return false;
  };

  const loginWithGoogle = (customEmail?: string) => {
    if (!customEmail) return;
    const cleanEmail = customEmail.toLowerCase().trim();
    const existing = users.find((u) => u.email.toLowerCase().trim() === cleanEmail);
    if (existing) {
      setCurrentUser(existing);
      setIsAuthModalOpen(false);
    }
  };

  const registerUser = (data: {
    name: string;
    email: string;
    password?: string;
    role: UserRole;
    country?: string;
    gamingPlatform?: string;
    gamingId?: string;
    racingNumber?: number;
    steamId?: string;
    discordTag?: string;
    avatar?: string;
    teamName?: string;
    teamTag?: string;
  }): User => {
    const isThyago = data.email.toLowerCase().trim() === 'thyago.talm@gmail.com';
    const existing = users.find((u) => u.email.toLowerCase().trim() === data.email.toLowerCase().trim());
    const effectiveRole: UserRole =
      isThyago ||
      data.role === 'admin' ||
      existing?.role === 'admin' ||
      (existing?.administeredLeagueIds && existing.administeredLeagueIds.length > 0)
        ? 'admin'
        : 'pilot';
    if (existing) {
      const updated: User = {
        ...existing,
        name: data.name,
        password: data.password || existing.password,
        role: effectiveRole,
        avatar: data.avatar || existing.avatar,
        gamingPlatform: data.gamingPlatform || existing.gamingPlatform,
        gamingId: data.gamingId || existing.gamingId,
        steamId: data.gamingId || existing.steamId,
        teamName: data.teamName !== undefined ? data.teamName.trim() : existing.teamName,
        teamTag: data.teamTag !== undefined ? data.teamTag.trim().toUpperCase() : existing.teamTag,
      };
      updateUser(updated);
      setCurrentUser(updated);
      setIsAuthModalOpen(false);
      return updated;
    }

    const defaultAvatar = isThyago
      ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250'
      : `https://images.unsplash.com/photo-${1530000000000 + Math.floor(Math.random() * 999999)}?auto=format&fit=crop&q=80&w=250`;

    const newUser: User = {
      id: isThyago ? 'user_thyago_talm' : `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: data.name,
      email: data.email,
      password: data.password || '123456',
      avatar: data.avatar || defaultAvatar,
      role: effectiveRole,
      country: data.country || 'Brasil 🇧🇷',
      gamingPlatform: data.gamingPlatform || 'Steam (PC)',
      gamingId: data.gamingId || '',
      steamId: data.gamingId || data.steamId || '',
      discordTag: data.discordTag || '',
      teamName: (data.teamName || '').trim(),
      teamTag: (data.teamTag || '').trim().toUpperCase(),
      racingNumber: data.racingNumber || (isThyago ? 1 : Math.floor(Math.random() * 98) + 1),
      driverCategory: 'Pro',
      administeredLeagueIds: isThyago ? ['champ_gt3_sprint_2026', 'champ_f1_brasil_2026', 'champ_porsche_cup_2026'] : [],
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

    setUsers((prev) => [newUser, ...prev.filter((u) => u.id !== newUser.id && !isFakeMockUser(u))]);
    setCurrentUser(newUser);
    setIsAuthModalOpen(false);

    // Save to Firestore real-time database
    saveUserToFirestore(newUser).catch((err) => console.warn('Firestore save error:', err));

    // Save to backend server database
    fetch('/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    }).catch((err) => console.warn('Backend API save error:', err));

    return newUser;
  };

  const switchUser = (userId: string) => {
    const found = users.find((u) => u.id === userId);
    if (found) {
      setCurrentUser(found);
    }
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const updateUser = async (updated: User): Promise<{ success: boolean; error?: string }> => {
    const sanitized = sanitizeUserProfileTeams(updated);

    // 1. Update users list in React state immediately (matching by ID OR email)
    setUsers((prev) =>
      prev.map((u) => {
        const matches =
          u.id === sanitized.id ||
          (u.email && sanitized.email && u.email.toLowerCase().trim() === sanitized.email.toLowerCase().trim());
        return matches ? sanitized : u;
      })
    );

    // 2. Update currentUser in React state immediately (matching by ID OR email)
    setCurrentUser((prev) => {
      if (!prev) return null;
      const matches =
        prev.id === sanitized.id ||
        (prev.email && sanitized.email && prev.email.toLowerCase().trim() === sanitized.email.toLowerCase().trim());
      return matches ? sanitized : prev;
    });

    // 3. Persist to localStorage cache with safe error handling
    try {
      const saved = localStorage.getItem('apexsim_users_db');
      if (saved) {
        const list = JSON.parse(saved);
        if (Array.isArray(list)) {
          const updatedList = list.map((u: User) => {
            const matches =
              u.id === sanitized.id ||
              (u.email && sanitized.email && u.email.toLowerCase().trim() === sanitized.email.toLowerCase().trim());
            return matches ? sanitized : u;
          });
          if (!updatedList.some((u: User) => u.id === sanitized.id)) {
            updatedList.push(sanitized);
          }
          localStorage.setItem('apexsim_users_db', JSON.stringify(updatedList));
        }
      }
    } catch (lsErr) {
      console.warn('localStorage quota warning on user update:', lsErr);
    }

    // 4. Update in backend server database
    try {
      await fetch(`/api/users/${encodeURIComponent(sanitized.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitized),
      });
    } catch (err) {
      console.warn('Backend API update error:', err);
    }

    // 5. Update in Firestore real-time database
    try {
      await saveUserToFirestore(sanitized);
    } catch (err) {
      console.warn('Firestore update error:', err);
    }

    return { success: true };
  };

  const resetPilotStats = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    const cleanUser: User = {
      ...target,
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
    updateUser(cleanUser);
  };

  const resetAllSimRatingStats = async (): Promise<{ success: boolean; error?: string }> => {
    const res = await resetAllUsersSimRatingService();
    if (res.success) {
      const zeroStats = {
        races: 0,
        wins: 0,
        podiums: 0,
        poles: 0,
        fastestLaps: 0,
        points: 0,
        dnfs: 0,
        safetyRating: 'B 3.50',
        simRating: 3000,
      };
      setUsers((prev) =>
        prev.map((u) => ({
          ...u,
          stats: { ...zeroStats },
        }))
      );
      if (currentUser) {
        setCurrentUser((prev) => (prev ? { ...prev, stats: { ...zeroStats } } : null));
      }
    }
    return res;
  };

  const syncUsers = async () => {
    try {
      const merged = await syncBackendWithFirestore();
      if (merged && merged.length > 0) {
        setUsers(merged.map(sanitizeUserProfileTeams));
      }
    } catch (err) {
      console.warn('Sync error:', err);
    }
  };

  const deleteUserAccountPermanently = async (userId: string): Promise<{ success: boolean; message: string }> => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) {
      throw new Error('Usuário não encontrado.');
    }
    if (targetUser.email.toLowerCase().trim() === 'thyago.talm@gmail.com' || userId === 'user_thyago_talm') {
      throw new Error('A conta do Administrador Master (thyago.talm@gmail.com) é protegida e não pode ser excluída.');
    }

    const res = await deleteUserCompletely(userId, targetUser.email, targetUser.name);

    // Immediately remove from current state
    setUsers((prev) => prev.filter((u) => u.id !== userId));

    // If currently logged in as this user, log out
    if (currentUser?.id === userId) {
      setCurrentUser(null);
    }

    return res;
  };

  const adminUpdatePilotProfile = async (
    oldId: string,
    updatedData: Partial<User>
  ): Promise<{ success: boolean; user?: User; error?: string }> => {
    const res = await adminUpdatePilotProfileService(oldId, updatedData);
    if (res.success && res.user) {
      const sanitized = sanitizeUserProfileTeams(res.user);
      setUsers((prev) => {
        const withoutOld = prev.filter((u) => u.id !== oldId && u.id !== sanitized.id);
        return [sanitized, ...withoutOld];
      });
      if (currentUser?.id === oldId) {
        setCurrentUser(sanitized);
      }
      try {
        const cached = localStorage.getItem('apexsim_users_db');
        if (cached) {
          const parsed: User[] = JSON.parse(cached);
          const filtered = parsed.filter((u) => u.id !== oldId && u.id !== sanitized.id);
          localStorage.setItem('apexsim_users_db', JSON.stringify([sanitized, ...filtered]));
        }
      } catch (_) {}
    }
    return res;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        loginWithEmail,
        loginWithGoogle,
        registerUser,
        switchUser,
        logout,
        updateUser,
        resetPilotStats,
        resetAllSimRatingStats,
        syncUsers,
        deleteUserAccountPermanently,
        adminUpdatePilotProfile,
        isAuthModalOpen,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
