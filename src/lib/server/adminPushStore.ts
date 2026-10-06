import 'server-only';
import fs from 'fs';
import path from 'path';
import { createAdminClient } from '@/lib/supabase/admin';
import type { PushSubscription } from 'web-push';

export interface StoredAdminSubscription {
  adminId: string;
  subscription: PushSubscription;
  updatedAt: number;
}

const CACHE_FILE_PATH = path.join(process.cwd(), '.admin_push_subscriptions.json');

// In-memory fallback
const inMemorySubs = new Map<string, StoredAdminSubscription>();

/**
 * Reads subscriptions cached locally on disk (if available)
 */
function readLocalCache(): Map<string, StoredAdminSubscription> {
  const result = new Map<string, StoredAdminSubscription>(inMemorySubs);
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const data = fs.readFileSync(CACHE_FILE_PATH, 'utf-8');
      const parsed: StoredAdminSubscription[] = JSON.parse(data);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item?.subscription?.endpoint) {
            result.set(item.subscription.endpoint, item);
            inMemorySubs.set(item.subscription.endpoint, item);
          }
        }
      }
    }
  } catch (err) {
    // Readonly or failed read, fallback to memory
  }
  return result;
}

/**
 * Writes subscriptions to local disk cache
 */
function writeLocalCache(subs: StoredAdminSubscription[]): void {
  try {
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(subs, null, 2), 'utf-8');
  } catch {
    // Readonly filesystem (e.g. Vercel serverless) - ignore silently
  }
}

/**
 * Persists an admin's push subscription in Supabase metadata, disk cache, and in-memory.
 */
export async function saveAdminSubscription(
  adminId: string,
  subscription: PushSubscription
): Promise<void> {
  if (!adminId || !subscription?.endpoint) return;

  const endpoint = subscription.endpoint;
  const item: StoredAdminSubscription = {
    adminId,
    subscription,
    updatedAt: Date.now(),
  };

  // 1. In-memory
  inMemorySubs.set(endpoint, item);

  // 2. Disk cache
  const currentMap = readLocalCache();
  currentMap.set(endpoint, item);
  writeLocalCache(Array.from(currentMap.values()));

  // 3. Supabase Auth Admin Metadata (persists across serverless instances)
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const adminClient = createAdminClient();
      const { data: userData, error: getUserError } = await adminClient.auth.admin.getUserById(adminId);
      if (!getUserError && userData?.user) {
        const existingList: StoredAdminSubscription[] =
          userData.user.app_metadata?.push_subscriptions || [];

        // Remove old entry with same endpoint if present
        const updatedList = existingList.filter(
          (s) => s?.subscription?.endpoint !== endpoint
        );
        updatedList.push(item);

        await adminClient.auth.admin.updateUserById(adminId, {
          app_metadata: {
            ...userData.user.app_metadata,
            push_subscriptions: updatedList,
          },
        });
      }
    } catch (err) {
      console.warn('[adminPushStore] Failed to persist subscription to Supabase:', err);
    }
  }
}

/**
 * Retrieves all valid admin push subscriptions from Supabase and local cache.
 */
export async function getAllAdminSubscriptions(): Promise<StoredAdminSubscription[]> {
  const map = readLocalCache();

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const adminClient = createAdminClient();
      // Get all approved admin profiles
      const { data: admins } = await adminClient
        .from('profiles')
        .select('id')
        .eq('is_admin', true)
        .eq('is_approved', true);

      if (admins && admins.length > 0) {
        await Promise.all(
          admins.map(async (admin) => {
            try {
              const { data: userData } = await adminClient.auth.admin.getUserById(admin.id);
              const subs: StoredAdminSubscription[] =
                userData?.user?.app_metadata?.push_subscriptions || [];
              if (Array.isArray(subs)) {
                for (const subItem of subs) {
                  if (subItem?.subscription?.endpoint) {
                    map.set(subItem.subscription.endpoint, {
                      adminId: admin.id,
                      subscription: subItem.subscription,
                      updatedAt: subItem.updatedAt || Date.now(),
                    });
                  }
                }
              }
            } catch {
              // Ignore individual user fetch error
            }
          })
        );
      }
    } catch (err) {
      console.warn('[adminPushStore] Error reading admin subscriptions from Supabase:', err);
    }
  }

  const allSubs = Array.from(map.values());
  writeLocalCache(allSubs);
  return allSubs;
}

/**
 * Removes an expired or rejected push subscription (404/410)
 */
export async function removeExpiredAdminSubscription(
  adminId: string,
  endpoint: string
): Promise<void> {
  inMemorySubs.delete(endpoint);
  const currentMap = readLocalCache();
  currentMap.delete(endpoint);
  writeLocalCache(Array.from(currentMap.values()));

  if (process.env.SUPABASE_SERVICE_ROLE_KEY && adminId) {
    try {
      const adminClient = createAdminClient();
      const { data: userData } = await adminClient.auth.admin.getUserById(adminId);
      if (userData?.user?.app_metadata?.push_subscriptions) {
        const existingList: StoredAdminSubscription[] =
          userData.user.app_metadata.push_subscriptions;
        const filtered = existingList.filter(
          (s) => s?.subscription?.endpoint !== endpoint
        );
        await adminClient.auth.admin.updateUserById(adminId, {
          app_metadata: {
            ...userData.user.app_metadata,
            push_subscriptions: filtered,
          },
        });
      }
    } catch (err) {
      console.warn('[adminPushStore] Error cleaning up expired subscription:', err);
    }
  }
}
