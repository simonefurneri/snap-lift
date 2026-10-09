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
 * Syncs the current device push subscription to the server for admin registration alerts
 */
export async function syncAdminPushSubscription(): Promise<boolean> {
  try {
    if (!isPushSupported() || typeof window === 'undefined' || Notification.permission !== 'granted') {
      return false;
    }
    const sub = await getPushSubscription();
    if (!sub) return false;

    const res = await fetch('/api/admin/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[push] Error syncing admin push subscription:', err);
    return false;
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
    let endpoint: string | undefined;
    try {
      const subscription = await getPushSubscription();
      endpoint = subscription?.endpoint;
    } catch {
      // ignore
    }

    const res = await fetch('/api/push/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timerId, endpoint }),
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

/**
 * Sends a test weight reminder push notification
 */
export async function sendTestWeightReminderPush(): Promise<boolean> {
  try {
    const sub = await getPushSubscription();
    if (!sub) return false;

    const res = await fetch('/api/push/weight-reminder/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    });

    return res.ok;
  } catch (err) {
    console.warn('[push] Error sending test weight reminder push:', err);
    return false;
  }
}

/**
 * Calculates the delay in seconds and target date until the next scheduled reminder
 */
export function calculateNextReminderDelay(
  timeStr: string,
  dayOfWeek: number = -1
): { delaySeconds: number; targetDate: Date } {
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;

  const now = new Date();
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);

  if (dayOfWeek === -1) {
    // Every day: if time has already passed today, target is tomorrow
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }
  } else {
    // Specific day of week (0=Sun, 1=Mon, ..., 6=Sat)
    const currentDay = now.getDay();
    let daysUntil = (dayOfWeek - currentDay + 7) % 7;
    if (daysUntil === 0 && target.getTime() <= now.getTime()) {
      daysUntil = 7;
    }
    target.setDate(target.getDate() + daysUntil);
  }

  const diffMs = target.getTime() - now.getTime();
  const delaySeconds = Math.max(1, Math.round(diffMs / 1000));
  return { delaySeconds, targetDate: target };
}

/**
 * Formats a friendly Italian string describing when the next reminder will fire
 */
export function formatNextReminderDescription(targetDate: Date): string {
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();
  if (diffMs <= 0) return 'Adesso';

  const diffMinutes = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  let relativeStr = '';
  if (diffMinutes < 1) {
    relativeStr = 'tra meno di un minuto';
  } else if (diffMinutes === 1) {
    relativeStr = 'tra 1 minuto';
  } else if (diffMinutes < 60) {
    relativeStr = `tra ${diffMinutes} minuti`;
  } else if (diffHours === 1) {
    relativeStr = 'tra 1 ora';
  } else if (diffHours < 24) {
    relativeStr = `tra ~${diffHours} ore`;
  } else {
    relativeStr = `tra ${diffDays} giorn${diffDays === 1 ? 'o' : 'i'}`;
  }

  const isToday =
    targetDate.getDate() === now.getDate() &&
    targetDate.getMonth() === now.getMonth() &&
    targetDate.getFullYear() === now.getFullYear();

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    targetDate.getDate() === tomorrow.getDate() &&
    targetDate.getMonth() === tomorrow.getMonth() &&
    targetDate.getFullYear() === tomorrow.getFullYear();

  const timeStr = targetDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

  if (isToday) {
    return `Oggi alle ${timeStr} (${relativeStr})`;
  }
  if (isTomorrow) {
    return `Domani alle ${timeStr} (${relativeStr})`;
  }

  const dayName = targetDate.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
  return `${dayName} alle ${timeStr} (${relativeStr})`;
}

/**
 * Schedules a weight reminder push notification via server Web Push.
 * Delivers exactly one notification through the Service Worker whether the app is open or closed.
 */
export async function scheduleWeightReminderPush({
  userId,
  time,
  day,
}: {
  userId: string;
  time: string;
  day: number;
}): Promise<boolean> {
  try {
    const { delaySeconds } = calculateNextReminderDelay(time, day);

    const subscription = await getPushSubscription();
    if (!subscription) {
      console.warn('[push] No push subscription available for weight reminder');
      return false;
    }

    const timerId = `weight-reminder-${userId}`;

    const res = await fetch('/api/push/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        delaySeconds,
        timerId,
        title: 'Promemoria Peso Corporeo ⚖️',
        body: 'Buongiorno! Ricordati di registrare il tuo peso odierno su SnapLift per mantenere aggiornato il tuo trend.',
        url: '/progress?tab=weight',
        tag: 'weight-reminder',
      }),
    });

    return res.ok;
  } catch (err) {
    console.error('[push] Error scheduling weight reminder push:', err);
    return false;
  }
}

/**
 * Cancels a scheduled weight reminder push notification on the server
 */
export async function cancelWeightReminderPush(userId: string): Promise<boolean> {
  return cancelServerPushTimer(`weight-reminder-${userId}`);
}

/**
 * Closes active weight reminder notifications in the device tray
 */
export async function closeWeightReminderNotifications(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    if ('getNotifications' in registration) {
      const notifications = await registration.getNotifications({ tag: 'weight-reminder' });
      for (const n of notifications) {
        n.close();
      }
    }
  } catch (err) {
    console.warn('[push] Error closing weight reminder notifications:', err);
  }
}

