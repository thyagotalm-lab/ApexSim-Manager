import { useState, useEffect, useCallback } from 'react';

export type PushPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

interface SendNotificationOptions {
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  vibrate?: number[];
  silent?: boolean;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<PushPermissionStatus>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission as PushPermissionStatus);
    } else {
      setIsSupported(false);
      setPermission('unsupported');
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<PushPermissionStatus> => {
    if (!isSupported || typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }

    setIsLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result as PushPermissionStatus);
      if (result === 'granted') {
        localStorage.setItem('apexsim_push_enabled', 'true');
      } else {
        localStorage.setItem('apexsim_push_enabled', 'false');
      }
      return result as PushPermissionStatus;
    } catch (err) {
      console.warn('Error requesting notification permission:', err);
      return 'denied';
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const sendPushNotification = useCallback(
    async (title: string, options: SendNotificationOptions = {}) => {
      if (!isSupported || permission !== 'granted') {
        return false;
      }

      const defaultIcon = '/pwa-192x192.png';
      const defaultBadge = '/favicon.svg';

      const notificationOptions: NotificationOptions & { vibrate?: number[] } = {
        body: options.body || 'Nova atualização no ApexSim Manager.',
        icon: options.icon || defaultIcon,
        badge: options.badge || defaultBadge,
        tag: options.tag || `apexsim_${Date.now()}`,
        data: options.data || { url: window.location.href },
        vibrate: options.vibrate || [200, 100, 200],
      };

      try {
        // Prefer service worker showNotification for mobile/background compatibility
        if ('serviceWorker' in navigator) {
          try {
            const reg = await Promise.race([
              navigator.serviceWorker.ready,
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
            ]);
            if (reg && 'showNotification' in reg) {
              await reg.showNotification(title, notificationOptions);
              return true;
            }
          } catch (_) {
            // fallback below
          }
        }

        // Fallback to standard Window Notification
        new Notification(title, notificationOptions);
        return true;
      } catch (err) {
        console.warn('Failed to dispatch notification:', err);
        return false;
      }
    },
    [isSupported, permission]
  );

  const testPushNotification = useCallback(async (): Promise<boolean> => {
    let currentPerm = permission;
    if (currentPerm !== 'granted') {
      currentPerm = await requestPermission();
    }

    if (currentPerm === 'granted') {
      return sendPushNotification('⚡ ApexSim Manager - Notificações Ativas!', {
        body: 'Notificações push estão ativadas! Você receberá alertas em tempo real sobre corridas, protestos e resultados oficiais.',
        tag: 'apexsim_test_push',
        icon: '/pwa-192x192.png',
        badge: '/favicon.svg',
        vibrate: [200, 100, 200],
      });
    }

    return false;
  }, [permission, requestPermission, sendPushNotification]);

  return {
    isSupported,
    permission,
    isGranted: permission === 'granted',
    isLoading,
    requestPermission,
    sendPushNotification,
    testPushNotification,
  };
}
