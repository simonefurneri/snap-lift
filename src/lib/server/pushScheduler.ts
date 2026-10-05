import { sendWebPush, PushNotificationPayload } from './webPush';
import type { PushSubscription } from 'web-push';

interface ScheduledItem {
  timeoutId: NodeJS.Timeout;
  scheduledTime: number;
}

// Global in-memory storage across API requests in Node runtime
const globalStore = globalThis as unknown as {
  __snaplift_push_timers?: Map<string, ScheduledItem>;
};

if (!globalStore.__snaplift_push_timers) {
  globalStore.__snaplift_push_timers = new Map<string, ScheduledItem>();
}

const activeTimers = globalStore.__snaplift_push_timers;

export function scheduleTimerPush(
  timerId: string,
  delaySeconds: number,
  subscription: PushSubscription,
  payload: PushNotificationPayload
) {
  // Cancel previous timer for this timerId if exists
  cancelTimerPush(timerId);

  const delayMs = Math.max(500, Math.round(delaySeconds * 1000));

  const timeoutId = setTimeout(async () => {
    activeTimers.delete(timerId);
    try {
      await sendWebPush(subscription, payload);
    } catch (err: any) {
      // 410 Gone or 404 Not Found means the subscription expired or was unsubscribed
      if (err.statusCode === 410 || err.statusCode === 404) {
        console.warn(`[pushScheduler] Subscription expired for timer ${timerId}`);
      } else {
        console.error(`[pushScheduler] Error sending push for timer ${timerId}:`, err);
      }
    }
  }, delayMs);

  activeTimers.set(timerId, {
    timeoutId,
    scheduledTime: Date.now() + delayMs,
  });

  // If QStash is configured (for serverless environments like Vercel), schedule via QStash
  if (process.env.QSTASH_TOKEN) {
    const rawAppUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
    const appUrl = rawAppUrl ? rawAppUrl.replace(/\/+$/, '') : '';

    if (appUrl) {
      fetch(`https://qstash.upstash.io/v2/publish/${appUrl}/api/push/send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.QSTASH_TOKEN}`,
          'Upstash-Delay': `${Math.round(delaySeconds)}s`,
          'Upstash-Deduplication-Id': `${timerId}-${Math.round(delaySeconds)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscription, payload }),
      }).catch((err) => console.warn('[pushScheduler] QStash scheduling warning:', err));
    }
  }

  return { scheduled: true, delayMs };
}

export function cancelTimerPush(timerId: string) {
  const existing = activeTimers.get(timerId);
  if (existing) {
    clearTimeout(existing.timeoutId);
    activeTimers.delete(timerId);
    return true;
  }
  return false;
}
