import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, isFirestoreQuotaExceeded, handleFirestoreError } from '../lib/firebase';
import { AppNotification } from '../types';

const NOTIFICATIONS_COLLECTION = 'notifications';
const LOCAL_STORAGE_KEY = 'apexsim_notifications';

// Initial default starter notifications for users
export const STARTER_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif_welcome',
    userId: 'all',
    title: '🏆 Bem-vindo ao Apex Sim Manager!',
    message: 'Explore os campeonatos oficiais, confira a tabela de classificação e gere seu Card Oficial de Piloto.',
    type: 'CHAMPIONSHIP_ANNOUNCEMENT',
    read: false,
    linkTab: 'driver-profile',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'notif_sim_rating',
    userId: 'all',
    title: '⚡ Ranking Sim Rating Atualizado',
    message: 'O ranking Elo e Safety Rating de todos os pilotos ativos da temporada foi recalculado.',
    type: 'CHAMPIONSHIP_ANNOUNCEMENT',
    read: false,
    linkTab: 'sim-rating',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'notif_stewards_active',
    userId: 'all',
    title: '⚖️ Direção de Prova e Comissários',
    message: 'O sistema de protestos e penalidades por incidentes de pista está ativo para julgamento oficial.',
    type: 'STEWARDS_VERDICT',
    read: false,
    linkTab: 'calendar',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  }
];

export const getLocalNotifications = (): AppNotification[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error reading notifications from localStorage:', e);
  }
  return STARTER_NOTIFICATIONS;
};

export const saveLocalNotifications = (list: AppNotification[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Error saving notifications to localStorage:', e);
  }
};

// Fetch backend notifications from /api/notifications
export const fetchBackendNotifications = async (): Promise<AppNotification[]> => {
  try {
    const res = await fetch('/api/notifications');
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.notifications)) {
        return data.notifications;
      }
    }
  } catch (err) {
    // Backend offline or unreachable
  }
  return [];
};

// Push notifications to backend
export const syncNotificationsToBackend = async (list: AppNotification[]): Promise<void> => {
  try {
    await fetch('/api/notifications/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notifications: list }),
    });
  } catch (_) {}
};

// Send a notification to Firestore and Backend
export const createNotification = async (
  data: Omit<AppNotification, 'id' | 'createdAt' | 'read'>
): Promise<AppNotification> => {
  const newNotif: AppNotification = {
    ...data,
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    read: false,
    createdAt: new Date().toISOString(),
  };

  // 1. Update localStorage
  const current = getLocalNotifications();
  const updated = [newNotif, ...current.filter((n) => n.id !== newNotif.id)].slice(0, 50);
  saveLocalNotifications(updated);

  // 2. Save to Firestore (if quota allows)
  if (!isFirestoreQuotaExceeded()) {
    try {
      await setDoc(doc(db, NOTIFICATIONS_COLLECTION, newNotif.id), {
        ...newNotif,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      if (!handleFirestoreError(err)) {
        console.warn('Could not save notification to Firestore:', err);
      }
    }
  }

  // 3. Save to backend
  syncNotificationsToBackend(updated).catch(() => {});

  return newNotif;
};

// Mark single notification as read
export const markNotificationAsReadInDB = async (notificationId: string) => {
  const current = getLocalNotifications();
  const updated = current.map((n) => (n.id === notificationId ? { ...n, read: true } : n));
  saveLocalNotifications(updated);

  if (!isFirestoreQuotaExceeded()) {
    try {
      await setDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId), { read: true }, { merge: true });
    } catch (err) {
      handleFirestoreError(err);
    }
  }

  try {
    await fetch(`/api/notifications/${notificationId}/read`, { method: 'POST' });
  } catch (_) {}
};

// Mark all as read
export const markAllNotificationsAsReadInDB = async (userId?: string) => {
  const current = getLocalNotifications();
  const updated = current.map((n) => {
    if (!userId || n.userId === userId || n.userId === 'all') {
      return { ...n, read: true };
    }
    return n;
  });
  saveLocalNotifications(updated);

  try {
    await fetch('/api/notifications/read-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
  } catch (_) {}
};

// Clear / remove all notifications
export const clearNotificationsInDB = async (userId?: string) => {
  const current = getLocalNotifications();
  const remaining = userId
    ? current.filter((n) => n.userId !== userId && n.userId !== 'all')
    : [];
  saveLocalNotifications(remaining);

  try {
    await fetch('/api/notifications/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
  } catch (_) {}
};

// Real-time subscriber to notifications
export const subscribeToNotifications = (
  userId: string | undefined,
  onNotificationsChange: (notifications: AppNotification[]) => void
) => {
  // Initial local state
  const initial = getLocalNotifications();
  onNotificationsChange(initial);

  // Sync with backend
  fetchBackendNotifications().then((backendList) => {
    if (backendList && backendList.length > 0) {
      const mergedMap = new Map<string, AppNotification>();
      initial.forEach((n) => mergedMap.set(n.id, n));
      backendList.forEach((n) => mergedMap.set(n.id, { ...(mergedMap.get(n.id) || {}), ...n }));
      const unified = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      saveLocalNotifications(unified);
      onNotificationsChange(unified);
    }
  });

  try {
    const colRef = collection(db, NOTIFICATIONS_COLLECTION);
    const q = query(colRef, orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: AppNotification[] = [];
          snapshot.forEach((d) => {
            const data = d.data() as AppNotification;
            list.push({ ...data, id: d.id });
          });
          if (list.length > 0) {
            saveLocalNotifications(list);
            onNotificationsChange(list);
          }
        }
      },
      (err) => {
        handleFirestoreError(err);
        console.warn('Firestore notifications snapshot error:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Firestore notifications subscription setup failed:', err);
    return () => {};
  }
};
