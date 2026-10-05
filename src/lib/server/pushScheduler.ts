import { sendWebPush, PushNotificationPayload } from './webPush';
import type { PushSubscription } from 'web-push';

interface ScheduledPush {
  scheduleId: string;
  timerId: string;
  endpoint: string;
  subscription: PushSubscription;
  payload: PushNotificationPayload;
  scheduledTime: number;
  timeoutId?: NodeJS.Timeout;
  qstashMessageId?: string;
  isDispatched: boolean;
  isCancelled: boolean;
}

// Global in-memory storage across API requests in Node runtime
const globalStore = globalThis as unknown as {
  __snaplift_active_schedules?: Map<string, ScheduledPush>;
  __snaplift_timer_latest_schedule?: Map<string, string>;
  __snaplift_endpoint_latest_schedule?: Map<string, string>;
  __snaplift_cancelled_timers?: Set<string>;
};

if (!globalStore.__snaplift_active_schedules) {
  globalStore.__snaplift_active_schedules = new Map<string, ScheduledPush>();
}
if (!globalStore.__snaplift_timer_latest_schedule) {
  globalStore.__snaplift_timer_latest_schedule = new Map<string, string>();
}
if (!globalStore.__snaplift_endpoint_latest_schedule) {
  globalStore.__snaplift_endpoint_latest_schedule = new Map<string, string>();
}
if (!globalStore.__snaplift_cancelled_timers) {
  globalStore.__snaplift_cancelled_timers = new Set<string>();
}

const activeSchedules = globalStore.__snaplift_active_schedules;
const latestScheduleByTimer = globalStore.__snaplift_timer_latest_schedule;
const latestScheduleByEndpoint = globalStore.__snaplift_endpoint_latest_schedule;
const cancelledTimers = globalStore.__snaplift_cancelled_timers;

/**
 * Registers a new scheduled rest timer push.
 * Automatically invalidates and cancels any previous schedule for this timerId OR endpoint.
 */
export function scheduleTimerPush(
  timerId: string,
  delaySeconds: number,
  subscription: PushSubscription,
  payload: PushNotificationPayload
): { scheduled: boolean; scheduleId: string; delayMs: number } {
  const endpoint = subscription.endpoint;
  const delayMs = Math.max(500, Math.round(delaySeconds * 1000));

  // 1. Invalidate any existing schedule for this timerId
  const prevScheduleForTimer = latestScheduleByTimer.get(timerId);
  if (prevScheduleForTimer) {
    cancelScheduleById(prevScheduleForTimer);
  }

  // 2. Invalidate any existing schedule for this device endpoint
  // A device must only ever have ONE active rest timer push.
  const prevScheduleForEndpoint = latestScheduleByEndpoint.get(endpoint);
  if (prevScheduleForEndpoint) {
    cancelScheduleById(prevScheduleForEndpoint);
  }

  // 3. Clear cancelled status for this timerId now that a new valid schedule is created
  cancelledTimers.delete(timerId);

  // 4. Generate a unique scheduleId for this specific countdown request
  const scheduleId = `${timerId}__${Date.now()}__${Math.random().toString(36).substring(2, 7)}`;

  const item: ScheduledPush = {
    scheduleId,
    timerId,
    endpoint,
    subscription,
    payload,
    scheduledTime: Date.now() + delayMs,
    isDispatched: false,
    isCancelled: false,
  };

  // Set a fallback NodeJS.Timeout for persistent environments or delays > 60s
  item.timeoutId = setTimeout(() => {
    dispatchScheduledPush(scheduleId).catch((err) => {
      console.error('[pushScheduler] Timeout dispatch error:', err);
    });
  }, delayMs);

  activeSchedules.set(scheduleId, item);
  latestScheduleByTimer.set(timerId, scheduleId);
  latestScheduleByEndpoint.set(endpoint, scheduleId);

  // If QStash is configured (for distributed serverless environments), schedule via QStash
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
          'Upstash-Deduplication-Id': `${scheduleId}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscription, payload, timerId, scheduleId }),
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

  return { scheduled: true, scheduleId, delayMs };
}

/**
 * Dispatches the push notification atomically and idempotently.
 * Guarantees that EXACTLY ONE push is sent for this schedule, even if invoked
 * concurrently by Next.js after() and NodeJS setTimeout.
 */
export async function dispatchScheduledPush(scheduleId: string): Promise<boolean> {
  const item = activeSchedules.get(scheduleId);
  if (!item) {
    return false; // Already dispatched or cancelled
  }

  // Strictly check validity
  if (
    item.isCancelled ||
    item.isDispatched ||
    cancelledTimers.has(item.timerId) ||
    latestScheduleByTimer.get(item.timerId) !== scheduleId ||
    latestScheduleByEndpoint.get(item.endpoint) !== scheduleId
  ) {
    cleanupSchedule(scheduleId);
    return false;
  }

  // Atomically claim dispatch: synchronous state change prevents duplicate sends
  item.isDispatched = true;
  if (item.timeoutId) {
    clearTimeout(item.timeoutId);
    item.timeoutId = undefined;
  }
  cleanupSchedule(scheduleId);

  // Deliver the push
  try {
    await sendWebPush(item.subscription, item.payload);
    return true;
  } catch (err: any) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      console.warn(`[pushScheduler] Subscription expired for timer ${item.timerId}`);
    } else {
      console.error(`[pushScheduler] Error sending push for timer ${item.timerId}:`, err);
    }
    return false;
  }
}

/**
 * Internal helper to cancel an individual schedule by its scheduleId
 */
function cancelScheduleById(scheduleId: string): void {
  const item = activeSchedules.get(scheduleId);
  if (item) {
    item.isCancelled = true;
    if (item.timeoutId) {
      clearTimeout(item.timeoutId);
      item.timeoutId = undefined;
    }
    // Cancel in QStash if scheduled
    if (item.qstashMessageId && process.env.QSTASH_TOKEN) {
      fetch(`https://qstash.upstash.io/v2/messages/${item.qstashMessageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${process.env.QSTASH_TOKEN}` },
      }).catch(() => {});
    }
  }
  cleanupSchedule(scheduleId);
}

/**
 * Cleans up references for a schedule
 */
function cleanupSchedule(scheduleId: string): void {
  const item = activeSchedules.get(scheduleId);
  activeSchedules.delete(scheduleId);
  if (item) {
    if (latestScheduleByTimer.get(item.timerId) === scheduleId) {
      latestScheduleByTimer.delete(item.timerId);
    }
    if (latestScheduleByEndpoint.get(item.endpoint) === scheduleId) {
      latestScheduleByEndpoint.delete(item.endpoint);
    }
  }
}

/**
 * Cancels all active schedules for a given timerId
 */
export function cancelTimerPush(timerId: string): boolean {
  if (!timerId) return false;

  cancelledTimers.add(timerId);

  const scheduleId = latestScheduleByTimer.get(timerId);
  if (scheduleId) {
    cancelScheduleById(scheduleId);
    return true;
  }

  return false;
}

/**
 * Checks if a timerId has been explicitly cancelled
 */
export function isTimerCancelled(timerId?: string): boolean {
  if (!timerId) return false;
  return cancelledTimers.has(timerId);
}

/**
 * Checks if a specific scheduleId is still the active schedule
 */
export function isScheduleActive(scheduleId: string): boolean {
  const item = activeSchedules.get(scheduleId);
  if (!item || item.isCancelled || item.isDispatched) return false;
  return latestScheduleByTimer.get(item.timerId) === scheduleId;
}
