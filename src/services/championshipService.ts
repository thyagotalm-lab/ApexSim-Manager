import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirestoreQuotaExceeded, handleFirestoreError } from '../lib/firebase';
import { Championship } from '../types';
import { isDeletedUserAccount } from './userService';

const CHAMPS_COLLECTION = 'championships';
const DELETED_IDS_KEY = 'apexsim_deleted_champ_ids';

const MOCK_CHAMPIONSHIP_IDS = new Set([
  'champ_gt3_sprint_2026',
  'champ_f1_brasil_2026',
  'champ_porsche_cup_2026',
  'champ_f1_25_brasil',
  'champ_f1_26_apex',
]);

export const getDeletedChampionshipIds = (): Set<string> => {
  try {
    const saved = localStorage.getItem(DELETED_IDS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch (_) {}
  return new Set();
};

export const addDeletedChampionshipId = (id: string) => {
  try {
    const current = getDeletedChampionshipIds();
    current.add(id);
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(current)));
  } catch (_) {}
};

export const removeDeletedChampionshipId = (id: string) => {
  try {
    const current = getDeletedChampionshipIds();
    current.delete(id);
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(current)));
  } catch (_) {}
};

export const cleanDataForFirestore = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(cleanDataForFirestore);
  if (typeof obj === 'object') {
    const clean: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val !== undefined) {
        clean[key] = cleanDataForFirestore(val);
      }
    }
    return clean;
  }
  return obj;
};

export const sanitizeChampionshipRegistrations = (c: Championship): Championship => {
  if (!c || !Array.isArray(c.registrations)) return c;
  const filteredRegs = c.registrations.filter((r) => {
    return !isDeletedUserAccount(r) && !isDeletedUserAccount({ id: r.userId, email: r.userEmail, name: r.userName });
  });
  if (filteredRegs.length !== c.registrations.length) {
    return {
      ...c,
      registrations: filteredRegs,
    };
  }
  return c;
};

export const isRealChampionship = (c: any): boolean => {
  if (!c || !c.id || !c.name) return false;
  if (MOCK_CHAMPIONSHIP_IDS.has(c.id)) return false;
  if (c.isDeleted === true) return false;
  if (getDeletedChampionshipIds().has(c.id)) return false;
  return true;
};

// Fetch championships from backend server API
export const fetchBackendChampionships = async (): Promise<{ championships: Championship[]; deletedIds: string[] }> => {
  try {
    const res = await fetch('/api/championships');
    if (res.ok) {
      const data = await res.json();
      const serverDeletedIds: string[] = Array.isArray(data.deletedIds) ? data.deletedIds : [];
      serverDeletedIds.forEach((did) => addDeletedChampionshipId(did));

      if (data && Array.isArray(data.championships)) {
        return {
          championships: data.championships.filter(isRealChampionship).map(sanitizeChampionshipRegistrations),
          deletedIds: serverDeletedIds,
        };
      }
    }
  } catch (err) {
    console.warn('Backend /api/championships not reachable:', err);
  }
  return { championships: [], deletedIds: [] };
};

// Save championship to both Firestore and Backend
export const saveChampionshipToCloud = async (champ: Championship): Promise<void> => {
  // If user is saving/updating this championship, ensure it's not marked as deleted
  removeDeletedChampionshipId(champ.id);

  // Filter out any registrations belonging to deleted users
  const cleanChamp = sanitizeChampionshipRegistrations(champ);

  // Clean data for Firestore so no undefined values cause setDoc to fail
  const sanitized = cleanDataForFirestore(cleanChamp);

  // 1. Firestore (if quota is available)
  if (!isFirestoreQuotaExceeded()) {
    try {
      const champDocRef = doc(db, CHAMPS_COLLECTION, cleanChamp.id);
      await setDoc(
        champDocRef,
        {
          ...sanitized,
          isDeleted: false,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      if (!handleFirestoreError(err)) {
        console.warn('Error saving championship to Firestore:', err);
      }
    }
  }

  // 2. Backend
  try {
    await fetch('/api/championships', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanChamp),
    });
  } catch (err) {
    console.warn('Error saving championship to backend API:', err);
  }
};

// Delete championship completely and permanently from both Firestore and Backend
export const deleteChampionshipFromCloud = async (id: string): Promise<void> => {
  // 1. Record ID as permanently deleted in local cache
  addDeletedChampionshipId(id);

  // 2. Clean from localStorage championships db
  try {
    const saved = localStorage.getItem('apexsim_championships_db');
    if (saved) {
      const parsed: Championship[] = JSON.parse(saved);
      const remaining = parsed.filter((c) => c.id !== id);
      localStorage.setItem('apexsim_championships_db', JSON.stringify(remaining));
    }
  } catch (_) {}

  // 3. Mark tombstone and delete in Firestore if quota allows
  if (!isFirestoreQuotaExceeded()) {
    try {
      await setDoc(
        doc(db, 'championship_metadata', 'tombstones'),
        {
          [id]: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err);
      console.warn('Error writing tombstone to Firestore:', err);
    }

    try {
      const champDocRef = doc(db, CHAMPS_COLLECTION, id);
      await setDoc(champDocRef, { isDeleted: true }, { merge: true });
      await deleteDoc(champDocRef);
    } catch (err) {
      handleFirestoreError(err);
      console.warn('Error deleting championship doc from Firestore:', err);
    }
  }

  // 4. Backend DELETE endpoint
  try {
    await fetch(`/api/championships/${id}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('Error deleting championship from backend API:', err);
  }
};

// Initial sync between Backend and Firestore
export const syncBackendWithFirestoreChampionships = async (): Promise<Championship[]> => {
  // 1. Sync tombstones from Firestore metadata
  try {
    const tombstoneDoc = await getDoc(doc(db, 'championship_metadata', 'tombstones'));
    if (tombstoneDoc.exists()) {
      const data = tombstoneDoc.data();
      Object.keys(data).forEach((key) => {
        if (key !== 'updatedAt' && data[key] === true) {
          addDeletedChampionshipId(key);
        }
      });
    }
  } catch (_) {}

  const mergedMap = new Map<string, Championship>();

  // 2. Backend
  const { championships: backendChamps } = await fetchBackendChampionships();
  backendChamps.forEach((c) => {
    if (isRealChampionship(c)) {
      mergedMap.set(c.id, c);
    }
  });

  // 3. Firestore
  try {
    const snap = await getDocs(collection(db, CHAMPS_COLLECTION));
    snap.forEach((docSnap) => {
      const c = docSnap.data() as any;
      if (c && c.isDeleted !== true && isRealChampionship(c)) {
        const cleanChamp = sanitizeChampionshipRegistrations({
          ...c,
          id: docSnap.id,
        });
        const existing = mergedMap.get(docSnap.id);
        mergedMap.set(docSnap.id, {
          ...existing,
          ...cleanChamp,
          id: docSnap.id,
        });
      }
    });
  } catch (err) {
    console.warn('Error getting Firestore championships:', err);
  }

  const allMerged = Array.from(mergedMap.values()).filter(isRealChampionship).map(sanitizeChampionshipRegistrations);

  // 4. Ensure backend has active ones
  for (const c of allMerged) {
    fetch('/api/championships', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(c),
    }).catch(() => {});
  }

  return allMerged;
};

// Shared memory cache to ensure championships from both sources are always unified
const championshipMemoryMap = new Map<string, Championship>();

// Real-time listener for championships across all accounts, devices, and sessions
export const subscribeToChampionships = (onChampionshipsChange: (champs: Championship[]) => void) => {
  try {
    const notifySubscribers = () => {
      const deletedSet = getDeletedChampionshipIds();
      const unified = Array.from(championshipMemoryMap.values())
        .map(sanitizeChampionshipRegistrations)
        .filter((c) => isRealChampionship(c) && !deletedSet.has(c.id));
      // Sort newest first
      unified.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      onChampionshipsChange(unified);
    };

    // 1. Initial load from backend & Firestore
    syncBackendWithFirestoreChampionships().then((initial) => {
      if (initial.length > 0) {
        initial.forEach((c) => championshipMemoryMap.set(c.id, sanitizeChampionshipRegistrations(c)));
        notifySubscribers();
      }
    });

    // 2. Real-time Firestore snapshot listener
    const colRef = collection(db, CHAMPS_COLLECTION);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const deletedSet = getDeletedChampionshipIds();

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;
          if (data && data.isDeleted === true) {
            addDeletedChampionshipId(docSnap.id);
            championshipMemoryMap.delete(docSnap.id);
          } else if (
            data &&
            data.isDeleted !== true &&
            !deletedSet.has(docSnap.id) &&
            isRealChampionship(data)
          ) {
            championshipMemoryMap.set(docSnap.id, sanitizeChampionshipRegistrations({
              ...data,
              id: docSnap.id,
            }));
          }
        });

        notifySubscribers();
      },
      (error) => {
        handleFirestoreError(error);
        console.warn('Firestore onSnapshot championships error:', error);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Failed to set up championships listener:', error);
    return () => {};
  }
};
