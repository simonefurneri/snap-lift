import { offlineDb, OfflineSetLog } from '@/lib/services/offlineDb';
import { createClient } from '@/lib/supabase/client';

export type SyncState = 'synced' | 'syncing' | 'pending' | 'error';

export interface SyncEngineStatus {
  state: SyncState;
  pendingCount: number;
  lastSyncedAt: Date | null;
  lastError: string | null;
}

type SyncListener = (status: SyncEngineStatus) => void;

class SyncEngine {
  private listeners: Set<SyncListener> = new Set();
  private status: SyncEngineStatus = {
    state: 'synced',
    pendingCount: 0,
    lastSyncedAt: null,
    lastError: null,
  };
  private isProcessing = false;
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Auto-sync on network reconnect
      window.addEventListener('online', () => {
        console.log('[SyncEngine] Network connection restored. Flushing queue...');
        this.processQueue();
      });

      // Initial check
      this.updatePendingCount();
    }
  }

  // Subscribe to sync status changes
  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l({ ...this.status }));
  }

  // Update pending items count
  async updatePendingCount(): Promise<number> {
    try {
      const pending = await offlineDb.getPendingSetLogs();
      this.status.pendingCount = pending.length;
      if (pending.length === 0 && this.status.state !== 'syncing') {
        this.status.state = 'synced';
        this.status.lastError = null;
      } else if (pending.length > 0 && this.status.state === 'synced') {
        this.status.state = 'pending';
      }
      this.notify();
      return pending.length;
    } catch {
      return 0;
    }
  }

  // Enqueue a set log to be synced (and attempt immediate sync if online)
  async enqueueSetLog(log: Omit<OfflineSetLog, 'client_timestamp' | 'sync_status' | 'retry_count'>): Promise<void> {
    const fullLog: OfflineSetLog = {
      ...log,
      client_timestamp: Date.now(),
      sync_status: 'pending',
      retry_count: 0,
    };

    await offlineDb.savePendingSetLog(fullLog);
    await this.updatePendingCount();

    // Trigger sync process in background
    this.processQueue();
  }

  // Process and flush all pending set logs with idempotent upsert
  async processQueue(): Promise<void> {
    if (this.isProcessing || typeof window === 'undefined') return;

    if (!navigator.onLine) {
      this.status.state = 'error';
      this.status.lastError = 'Dispositivo offline';
      this.notify();
      return;
    }

    const pendingLogs = await offlineDb.getPendingSetLogs();
    if (pendingLogs.length === 0) {
      this.status.state = 'synced';
      this.status.pendingCount = 0;
      this.status.lastError = null;
      this.notify();
      return;
    }

    this.isProcessing = true;
    this.status.state = 'syncing';
    this.notify();

    const supabase = createClient();

    // 1. Ensure active authenticated session (local session check via getSession without network dependency)
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    const user = session?.user;

    if (authError || !user) {
      console.warn('[SyncEngine] Cannot sync: User is not authenticated');
      this.status.state = 'error';
      this.status.lastError = 'Sessione utente non attiva';
      this.isProcessing = false;
      this.notify();
      return;
    }

    for (const log of pendingLogs) {
      try {
        // Prevent syncing logs created by a different user
        if (log.user_id && log.user_id !== user.id) {
          console.warn(`[SyncEngine] Dropping log ${log.id} from different user (${log.user_id} vs current ${user.id})`);
          await offlineDb.deletePendingSetLog(log.id);
          continue;
        }

        // Idempotent upsert by id with strict authenticated user_id (enforced by RLS)
        const { error } = await supabase.from('set_logs').upsert(
          {
            id: log.id,
            user_id: user.id, // Strictly bound to authenticated user
            session_id: log.session_id,
            exercise_id: log.exercise_id || null,
            exercise_name: log.exercise_name,
            set_number: log.set_number,
            weight: log.weight ?? 0,
            reps: log.reps ?? 0,
          } as any,
          { onConflict: 'id' }
        );

        if (error) {
          throw error;
        }

        // Successfully synced, remove from queue
        await offlineDb.deletePendingSetLog(log.id);
      } catch (err: any) {
        console.warn(`[SyncEngine] Failed syncing set log ${log.id}:`, err);
        log.retry_count += 1;
        log.sync_status = 'error';
        log.last_error = err.message || 'Errore di rete';
        await offlineDb.savePendingSetLog(log);

        this.status.state = 'error';
        this.status.lastError = err.message || 'Errore di sincronizzazione';
        this.scheduleRetry(log.retry_count);
        break;
      }
    }

    this.isProcessing = false;
    const remaining = await this.updatePendingCount();
    if (remaining === 0) {
      this.status.state = 'synced';
      this.status.lastSyncedAt = new Date();
      this.status.lastError = null;
      this.notify();
    }
  }

  // Exponential backoff retry
  private scheduleRetry(retryCount: number) {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
    const delay = Math.min(1000 * Math.pow(2, retryCount), 30000); // 1s, 2s, 4s, 8s, max 30s
    this.retryTimeout = setTimeout(() => {
      this.processQueue();
    }, delay);
  }
}

export const syncEngine = new SyncEngine();
