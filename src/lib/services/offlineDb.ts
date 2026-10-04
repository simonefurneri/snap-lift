/**
 * IndexedDB Local Database for SnapLift
 * Stores pending offline set logs, active sessions, and exercise history caches.
 */

const DB_NAME = 'SnapLift_PWA_DB';
const DB_VERSION = 1;

export interface OfflineSetLog {
  id: string; // client-generated UUID
  user_id?: string;
  session_id: string;
  exercise_id?: string | null;
  exercise_name: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
  is_completed: boolean;
  client_timestamp: number;
  sync_status: 'pending' | 'syncing' | 'synced' | 'error';
  retry_count: number;
  last_error?: string;
}

export interface OfflineActiveSession {
  id: string;
  user_id: string;
  plan_id?: string | null;
  plan_day_id?: string | null;
  day_name: string;
  started_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface OfflineHistoryCache {
  exercise_name_key: string;
  history: any;
  cached_at: number;
}

class OfflineDbService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDb(): Promise<IDBDatabase> {
    if (typeof window === 'undefined') {
      return Promise.reject(new Error('IndexedDB is only available in browser'));
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // 1. Pending Set Logs Store
          if (!db.objectStoreNames.contains('pending_set_logs')) {
            const store = db.createObjectStore('pending_set_logs', { keyPath: 'id' });
            store.createIndex('session_id', 'session_id', { unique: false });
            store.createIndex('sync_status', 'sync_status', { unique: false });
            store.createIndex('client_timestamp', 'client_timestamp', { unique: false });
          }

          // 2. Active Sessions Store
          if (!db.objectStoreNames.contains('active_sessions')) {
            db.createObjectStore('active_sessions', { keyPath: 'id' });
          }

          // 3. History Cache Store
          if (!db.objectStoreNames.contains('cached_histories')) {
            db.createObjectStore('cached_histories', { keyPath: 'exercise_name_key' });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    }

    return this.dbPromise;
  }

  // --- Pending Set Logs ---

  async savePendingSetLog(log: OfflineSetLog): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending_set_logs', 'readwrite');
      const store = tx.objectStore('pending_set_logs');
      store.put(log);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getPendingSetLogs(): Promise<OfflineSetLog[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending_set_logs', 'readonly');
      const store = tx.objectStore('pending_set_logs');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingLogsBySession(sessionId: string): Promise<OfflineSetLog[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending_set_logs', 'readonly');
      const store = tx.objectStore('pending_set_logs');
      const index = store.index('session_id');
      const request = index.getAll(sessionId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deletePendingSetLog(id: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending_set_logs', 'readwrite');
      const store = tx.objectStore('pending_set_logs');
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- Active Session ---

  async saveActiveSession(session: OfflineActiveSession): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('active_sessions', 'readwrite');
      const store = tx.objectStore('active_sessions');
      store.put(session);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getActiveSessions(): Promise<OfflineActiveSession[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('active_sessions', 'readonly');
      const store = tx.objectStore('active_sessions');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteActiveSession(sessionId: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('active_sessions', 'readwrite');
      const store = tx.objectStore('active_sessions');
      store.delete(sessionId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- History Cache ---

  async cacheExerciseHistory(exerciseName: string, history: any): Promise<void> {
    const db = await this.getDb();
    const key = exerciseName.trim().toLowerCase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('cached_histories', 'readwrite');
      const store = tx.objectStore('cached_histories');
      store.put({
        exercise_name_key: key,
        history,
        cached_at: Date.now(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getCachedExerciseHistory(exerciseName: string): Promise<any | null> {
    const db = await this.getDb();
    const key = exerciseName.trim().toLowerCase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('cached_histories', 'readonly');
      const store = tx.objectStore('cached_histories');
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.history || null);
      request.onerror = () => reject(request.error);
    });
  }

  // --- Reset / Purge on Logout ---
  async clearAllData(): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['pending_set_logs', 'active_sessions', 'cached_histories'], 'readwrite');
      tx.objectStore('pending_set_logs').clear();
      tx.objectStore('active_sessions').clear();
      tx.objectStore('cached_histories').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const offlineDb = new OfflineDbService();

