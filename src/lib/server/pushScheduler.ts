import { sendWebPush, PushNotificationPayload } from './webPush';
import type { PushSubscription } from 'web-push';

interface ScheduledItem {
  timeoutId: NodeJS.Timeout;
  scheduledTime: number;
  endpoint: string;
  qstashMessageId?: string;
}

// Global in-memory storage across API requests in Node runtime
const globalStore = globalThis as unknown as {
  __snaplift_push_timers?: Map<string, ScheduledItem>;
  __snaplift_endpoint_timers?: Map<string, string>;
  __snaplift_cancelled_timers?: Set<string>;
};

if (!globalStore.__snaplift_push_timers) {
  globalStore.__snaplift_push_timers = new Map<string, ScheduledItem>();
}
if (!globalStore.__snaplift_endpoint_timers) {
  globalStore.__snaplift_endpoint_timers = new Map<string, string>();
}
if (!globalStore.__snaplift_cancelled_timers) {
  globalStore.__snaplift_cancelled_timers = new Set<string>();
}

const activeTimers = globalStore.__snaplift_push_timers;
const endpointTimers = globalStore.__snaplift_endpoint_timers;
const cancelledTimers = globalStore.__snaplift_cancelled_timers;

export function scheduleTimerPush(
  timerId: string,
  delaySeconds: number,
  subscription: PushSubscription,
  payload: PushNotificationPayload
) {
  const endpoint = subscription.endpoint;

  // 1. Cancel previous timer for this exact timerId if exists
  cancelTimerPush(timerId);

  // 2. Ensure this newly scheduled timer is NOT marked as cancelled
  cancelledTimers.delete(timerId);

  // 3. IMPORTANT: Cancel any existing timer for this same device endpoint!
  // A device can only have ONE rest timer at any given moment.
  const existingTimerIdForEndpoint = endpointTimers.get(endpoint);
  if (existingTimerIdForEndpoint && existingTimerIdForEndpoint !== timerId) {
    cancelTimerPush(existingTimerIdForEndpoint);
  }

  const delayMs = Math.max(500, Math.round(delaySeconds * 1000));

  const timeoutId = setTimeout(async () => {
    activeTimers.delete(timerId);
    if (endpointTimers.get(endpoint) === timerId) {
      endpointTimers.delete(endpoint);
    }
    try {
      await sendWebPush(subscription, payload);
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        console.warn(`[pushScheduler] Subscription expired for timer ${timerId}`);
      } else {
        console.error(`[pushScheduler] Error sending push for timer ${timerId}:`, err);
      }
    }
  }, delayMs);

  const item: ScheduledItem = {
    timeoutId,
    scheduledTime: Date.now() + delayMs,
    endpoint,
  };
  activeTimers.set(timerId, item);
  endpointTimers.set(endpoint, timerId);

  // If QStash is configured (for serverless environments like Vercel), schedule via QStash
  if (process.env.QSTASH_TOKEN) {
    let rawAppUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || '';
    if (rawAppUrl && !rawAppUrl.startsWith('http://') && !rawAppUrl.startsWith('https://')) {
      rawAppUrl = `https://${rawAppUrl}`;
    }
    const appUrl = rawAppUrl.replace(/\/+$/, '');

    if (appUrl) {
      fetch(`https://qstash.upstash.io/v2/publish/${appUrl}/api/push/send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.QSTASH_TOKEN}`,
          'Upstash-Delay': `${Math.round(delaySeconds)}s`,
          'Upstash-Deduplication-Id': `${timerId}-${Math.round(delaySeconds)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscription, payload, timerId }),
      })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json().catch(() => ({}));
            if (data.messageId) {
              item.qstashMessageId = data.messageId;
            }
          }
        })
        .catch((err) => console.warn('[pushScheduler] QStash scheduling warning:', err));
    }
  }

  return { scheduled: true, delayMs };
}

export function cancelTimerPush(timerId: string) {
  if (!timerId) return false;

  cancelledTimers.add(timerId);

  const existing = activeTimers.get(timerId);
  if (existing) {
    clearTimeout(existing.timeoutId);
    activeTimers.delete(timerId);
    if (existing.endpoint && endpointTimers.get(existing.endpoint) === timerId) {
      endpointTimers.delete(existing.endpoint);
    }

    // Cancel in QStash if message was scheduled
    if (existing.qstashMessageId && process.env.QSTASH_TOKEN) {
      fetch(`https://qstash.upstash.io/v2/messages/${existing.qstashMessageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${process.env.QSTASH_TOKEN}` },
      }).catch(() => {});
    }

    return true;
  }

  return false;
}

export function isTimerCancelled(timerId?: string): boolean {
  if (!timerId) return false;
  return cancelledTimers.has(timerId);
}
