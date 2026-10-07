import crypto from 'crypto';
import { sendWebPush, PushNotificationPayload } from './webPush';
import type { PushSubscription } from 'web-push';
import {
  saveAdminSubscription,
  getAllAdminSubscriptions,
  removeExpiredAdminSubscription,
} from './adminPushStore';
import { createAdminClient } from '@/lib/supabase/admin';

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

const BUCKET_NAME = 'timer-state';
let bucketInitialized = false;

function getEndpointHash(endpoint: string): string {
  return crypto.createHash('sha256').update(endpoint).digest('hex');
}

async function getStorageClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return null;
  }
  try {
    const client = createAdminClient();
    if (!bucketInitialized) {
      const { data: buckets } = await client.storage.listBuckets();
      if (!buckets?.some((b) => b.name === BUCKET_NAME)) {
        await client.storage.createBucket(BUCKET_NAME, { public: false });
      }
      bucketInitialized = true;
    }
    return client;
  } catch (err) {
    console.warn('[pushScheduler] Error initializing Supabase storage client:', err);
    return null;
  }
}

/**
 * Marks a timer as cancelled across all serverless instances
 */
export async function markTimerCancelledShared(timerId?: string): Promise<void> {
  if (!timerId) return;
  const client = await getStorageClient();
  if (!client) return;

  const payload = JSON.stringify({
    timerId,
    status: 'cancelled',
    cancelledAt: Date.now(),
  });

  try {
    await client.storage.from(BUCKET_NAME).upload(`timer_${timerId}.json`, payload, { upsert: true });
  } catch (err) {
    console.warn('[pushScheduler] Error uploading timer cancellation:', err);
  }
}

/**
 * Checks if a specific timer has been explicitly cancelled across serverless instances
 */
export async function isScheduleValidShared(timerId: string, scheduleId?: string): Promise<boolean> {
  if (cancelledTimers.has(timerId)) {
    return false;
  }
  const client = await getStorageClient();
  if (!client) return true; // If no shared storage, fallback to in-memory check

  try {
    const { data: timerBlob, error } = await client.storage
      .from(BUCKET_NAME)
      .download(`timer_${timerId}.json`);

    if (timerBlob && !error) {
      const text = await timerBlob.text();
      const parsed = JSON.parse(text);
      if (parsed.status === 'cancelled') {
        return false; // Explicitly cancelled!
      }
      if (scheduleId && parsed.scheduleId && parsed.scheduleId !== scheduleId) {
        return false; // Superseded by a newer schedule
      }
    }

    return true;
  } catch {
    return true; // Default to allowing push if file does not exist or read fails
  }
}

/**
 * Cleanup files after dispatch
 */
async function cleanupSharedScheduleFiles(timerId: string): Promise<void> {
  const client = await getStorageClient();
  if (!client) return;
  client.storage.from(BUCKET_NAME).remove([`timer_${timerId}.json`]).catch(() => {});
}

/**
 * Register or refresh an admin's push subscription
 */
export async function registerAdminSubscription(adminId: string, subscription: PushSubscription): Promise<void> {
  await saveAdminSubscription(adminId, subscription);
}

/**
 * Dispatches a push notification to all registered admin devices
 */
export async function notifyAdminsOfRegistration(userDisplayName: string, userEmail?: string | null): Promise<number> {
  let sentCount = 0;
  const payload: PushNotificationPayload = {
    title: 'Nuova Richiesta di Registrazione 👤',
    body: `${userDisplayName}${userEmail ? ` (${userEmail})` : ''} si è registrato e richiede approvazione.`,
    url: '/admin/users',
    tag: 'admin-new-user',
  };

  const adminSubs = await getAllAdminSubscriptions();
  if (adminSubs.length === 0) {
    console.log('[notifyAdminsOfRegistration] No registered admin subscriptions found.');
    return 0;
  }

  const promises = adminSubs.map(async (item) => {
    try {
      await sendWebPush(item.subscription, payload);
      sentCount++;
    } catch (err: any) {
      console.warn(`[push] Failed to send admin push to ${item.adminId}:`, err);
      if (err.statusCode === 404 || err.statusCode === 410) {
        await removeExpiredAdminSubscription(item.adminId, item.subscription.endpoint);
      }
    }
  });

  await Promise.all(promises);
  console.log(`[notifyAdminsOfRegistration] Dispatched to ${sentCount}/${adminSubs.length} admin device(s).`);
  return sentCount;
}

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

  activeSchedules.set(scheduleId, item);
  latestScheduleByTimer.set(timerId, scheduleId);
  latestScheduleByEndpoint.set(endpoint, scheduleId);

  // 5. Direct Node.js timer guarantees bulletproof execution in local development and persistent Node servers
  item.timeoutId = setTimeout(async () => {
    try {
      await dispatchScheduledPush(scheduleId);
    } catch (err) {
      console.error('[pushScheduler] Timeout dispatch error:', err);
    }
  }, delayMs);

  // 6. Overwrite any stale cancelled state in Supabase shared storage across serverless instances
  getStorageClient().then(async (client) => {
    if (!client) return;
    const payload = JSON.stringify({
      timerId,
      scheduleId,
      status: 'active',
      scheduledTime: item.scheduledTime,
    });
    await client.storage.from(BUCKET_NAME).upload(`timer_${timerId}.json`, payload, { upsert: true });
  }).catch(() => {});

  // 7. If QStash is configured (for distributed serverless environments), schedule via QStash
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
 * Continues an existing chained schedule across serverless invocation chunks.
 */
export function continueChainedSchedule(
  scheduleId: string,
  timerId: string,
  remainingSeconds: number,
  subscription: PushSubscription,
  payload: PushNotificationPayload
): { valid: boolean; delayMs: number } {
  if (isTimerCancelled(timerId)) {
    return { valid: false, delayMs: 0 };
  }

  const latestSchedule = latestScheduleByTimer.get(timerId);
  if (latestSchedule && latestSchedule !== scheduleId) {
    return { valid: false, delayMs: 0 };
  }

  const endpoint = subscription.endpoint;
  const latestEndpointSchedule = latestScheduleByEndpoint.get(endpoint);
  if (latestEndpointSchedule && latestEndpointSchedule !== scheduleId) {
    return { valid: false, delayMs: 0 };
  }

  const delayMs = Math.max(500, Math.round(remainingSeconds * 1000));

  let item = activeSchedules.get(scheduleId);
  if (!item) {
    item = {
      scheduleId,
      timerId,
      endpoint,
      subscription,
      payload,
      scheduledTime: Date.now() + delayMs,
      isDispatched: false,
      isCancelled: false,
    };
    activeSchedules.set(scheduleId, item);
    latestScheduleByTimer.set(timerId, scheduleId);
    latestScheduleByEndpoint.set(endpoint, scheduleId);
  } else {
    item.scheduledTime = Date.now() + delayMs;
  }

  return { valid: true, delayMs };
}

/**
 * Dispatches the push notification atomically and idempotently.
 * Guarantees that EXACTLY ONE push is sent for this schedule, even if invoked
 * concurrently by multiple handlers.
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
    cancelledTimers.has(item.timerId)
  ) {
    cleanupSchedule(scheduleId);
    return false;
  }

  const currentForTimer = latestScheduleByTimer.get(item.timerId);
  if (currentForTimer && currentForTimer !== scheduleId) {
    cleanupSchedule(scheduleId);
    return false;
  }

  const currentForEndpoint = latestScheduleByEndpoint.get(item.endpoint);
  if (currentForEndpoint && currentForEndpoint !== scheduleId) {
    cleanupSchedule(scheduleId);
    return false;
  }

  // Atomically claim dispatch: synchronous state change prevents duplicate sends across concurrent async callers
  item.isDispatched = true;
  if (item.timeoutId) {
    clearTimeout(item.timeoutId);
    item.timeoutId = undefined;
  }

  // Strictly check validity in shared Supabase storage across all serverless containers
  const isValidShared = await isScheduleValidShared(item.timerId, scheduleId);
  if (!isValidShared) {
    cleanupSchedule(scheduleId);
    return false;
  }

  cleanupSchedule(scheduleId);

  // Deliver the push
  try {
    await sendWebPush(item.subscription, item.payload);
    cleanupSharedScheduleFiles(item.timerId).catch(() => {});
    return true;
  } catch (err: any) {
    cleanupSharedScheduleFiles(item.timerId).catch(() => {});
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
 * Cancels active schedules for a given timerId or endpoint across memory and shared storage.
 * CRITICAL RACE CONDITION FIX:
 * When timerId is provided with endpoint, only the schedule belonging to timerId is cancelled.
 * Newer timers that have superseded this endpoint are preserved!
 */
export async function cancelTimerPush(timerId?: string, endpoint?: string): Promise<boolean> {
  if (!timerId && !endpoint) return false;

  if (timerId) {
    cancelledTimers.add(timerId);
    const scheduleId = latestScheduleByTimer.get(timerId);
    if (scheduleId) {
      cancelScheduleById(scheduleId);
    }

    if (endpoint) {
      const endpointScheduleId = latestScheduleByEndpoint.get(endpoint);
      if (endpointScheduleId) {
        const item = activeSchedules.get(endpointScheduleId);
        // Only cancel if this endpoint's schedule actually belongs to timerId!
        if (item && item.timerId === timerId) {
          cancelScheduleById(endpointScheduleId);
        }
      }
    }

    await markTimerCancelledShared(timerId);
  } else if (endpoint) {
    // Only endpoint was passed (cancel any active timer for this device)
    const scheduleId = latestScheduleByEndpoint.get(endpoint);
    if (scheduleId) {
      cancelScheduleById(scheduleId);
    }
  }

  return true;
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
