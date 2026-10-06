/**
 * Offline Sync and Local Storage Cache Helper for Workout Sessions
 * Allows immediate optimistic updates and queues failed sync requests.
 */

export interface CachedWorkoutState {
  sessionId: string;
  updatedAt: string;
  setLogs?: Record<string, { weight: number; reps: number; setNumber: number; exerciseName: string; exerciseId?: string | null; isCompleted?: boolean }>;
  exerciseSetsMap?: Record<string, Array<{
    setNumber: number;
    weight: string;
    reps: string;
    isCompleted: boolean;
    savedLogId?: string;
  }>>;
}

export const offlineSync = {
  // Save active workout session state to local storage
  saveWorkoutLocally(sessionId: string, state: CachedWorkoutState) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`snaplift_session_${sessionId}`, JSON.stringify(state));
    } catch (e) {
      console.warn('Could not cache workout in localStorage', e);
    }
  },

  // Read active workout session state from local storage
  getWorkoutLocally(sessionId: string): CachedWorkoutState | null {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(`snaplift_session_${sessionId}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  // Clear local storage for a completed or cancelled workout
  clearWorkoutLocally(sessionId: string) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(`snaplift_session_${sessionId}`);
    } catch {}
  },
};
