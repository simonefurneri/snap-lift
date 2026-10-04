'use client';

import { useEffect, useRef } from 'react';

/**
 * Custom hook to keep the screen awake during an active workout session.
 * Automatically re-acquires the lock on document visibility change.
 */
export function useWakeLock(isActive = true) {
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    if (!isActive || typeof window === 'undefined' || !('wakeLock' in navigator)) {
      return;
    }

    const requestWakeLock = async () => {
      try {
        if (!wakeLockRef.current) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          wakeLockRef.current.addEventListener('release', () => {
            wakeLockRef.current = null;
          });
        }
      } catch (err: any) {
        console.warn('Screen WakeLock request failed:', err?.message || err);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive) {
        requestWakeLock();
      }
    };

    requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [isActive]);
}
