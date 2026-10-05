/**
 * Web Push and Local Notification client manager
 * Handles iOS 16.4+ / Android PWA push subscriptions and rest timer scheduling.
 */

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('[push] Error requesting notification permission:', err);
    return 'denied';
  }
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.warn('[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not defined');
        return null;
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
      });
    }

    return subscription;
  } catch (err) {
    console.warn('[push] Error getting push subscription:', err);
    return null;
  }
}

/**
 * Schedules a rest timer notification on the server.
 * This guarantees the notification will fire even when the phone is locked or another app is open.
 */
export async function scheduleServerPushTimer({
  timerId,
  delaySeconds,
  exerciseName,
}: {
  timerId: string;
  delaySeconds: number;
  exerciseName?: string;
}): Promise<boolean> {
  try {
    const subscription = await getPushSubscription();
    if (!subscription) {
      return false;
    }

    const res = await fetch('/api/push/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        delaySeconds,
        timerId,
        exerciseName,
      }),
    });

    return res.ok;
  } catch (err) {
    console.error('[push] Error scheduling server push timer:', err);
    return false;
  }
}

/**
 * Cancels a scheduled rest timer notification on the server.
 */
export async function cancelServerPushTimer(timerId: string): Promise<boolean> {
  if (!timerId) return false;
  try {
    const res = await fetch('/api/push/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timerId }),
    });
    return res.ok;
  } catch (err) {
    console.error('[push] Error cancelling server push timer:', err);
    return false;
  }
}

/**
 * Closes and clears any active rest-timer notifications from the device notification center.
 */
export async function closeRestTimerNotifications(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    if ('getNotifications' in registration) {
      const notifications = await registration.getNotifications({ tag: 'rest-timer' });
      for (const n of notifications) {
        n.close();
      }
    }
  } catch (err) {
    console.warn('[push] Error closing rest timer notifications:', err);
  }
}

/**
 * Triggers a native system notification via the Service Worker registration.
 * Works seamlessly on iOS PWA without throwing constructor errors.
 */
export async function showLocalNotification(title: string, options?: NotificationOptions): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        vibrate: [300, 100, 300, 100, 400],
        tag: 'rest-timer',
        renotify: true,
        ...options,
      } as unknown as NotificationOptions);
      return true;
    }
  } catch (err) {
    console.warn('[push] Error showing local notification:', err);
  }
  return false;
}
