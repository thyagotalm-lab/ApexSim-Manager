import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppNotification } from '../types';
import { useAuth } from './AuthContext';
import {
  subscribeToNotifications,
  createNotification,
  markNotificationAsReadInDB,
  markAllNotificationsAsReadInDB,
  clearNotificationsInDB,
  getLocalNotifications,
} from '../services/notificationService';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  sendNotification: (
    data: Omit<AppNotification, 'id' | 'createdAt' | 'read'>
  ) => Promise<AppNotification>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>(() => getLocalNotifications());

  useEffect(() => {
    const unsubscribe = subscribeToNotifications(currentUser?.id, (updatedList) => {
      // Filter for this user or broadcast to 'all'
      const relevant = updatedList.filter(
        (n) => !n.userId || n.userId === 'all' || (currentUser && n.userId === currentUser.id)
      );
      setNotifications(relevant);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser?.id]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    await markNotificationAsReadInDB(id);
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await markAllNotificationsAsReadInDB(currentUser?.id);
  };

  const clearAll = async () => {
    setNotifications([]);
    await clearNotificationsInDB(currentUser?.id);
  };

  const sendNotification = async (
    data: Omit<AppNotification, 'id' | 'createdAt' | 'read'>
  ): Promise<AppNotification> => {
    const created = await createNotification(data);
    setNotifications((prev) => [created, ...prev.filter((n) => n.id !== created.id)]);
    return created;
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearAll,
        sendNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
