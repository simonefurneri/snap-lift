'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Plus, Minus, X, Bell, ChevronDown, ChevronUp } from 'lucide-react';
import { triggerVibration, playTimerCompleteBeep } from '@/lib/utils/audio';
import {
  scheduleServerPushTimer,
  cancelServerPushTimer,
  closeRestTimerNotifications,
  requestNotificationPermission,
  getNotificationPermission,
} from '@/lib/utils/pushNotifications';

interface RestTimerProps {
  initialSeconds: number;
  isOpen: boolean;
  onClose: () => void;
  exerciseName?: string;
  isMinimized?: boolean;
  onMinimizeChange?: (minimized: boolean) => void;
  onHeightChange?: (height: number) => void;
}

export function RestTimer({
  initialSeconds,
  isOpen,
  onClose,
  exerciseName,
  isMinimized: isMinimizedProp,
  onMinimizeChange,
  onHeightChange,
}: RestTimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [totalSeconds, setTotalSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined') {
      return getNotificationPermission();
    }
    return 'default';
  });
  const [isNotificationDismissed, setIsNotificationDismissed] = useState(false);
  const [internalMinimized, setInternalMinimized] = useState(isMinimizedProp ?? false);

  const containerRef = useRef<HTMLDivElement>(null);

  const isMinimized = isMinimizedProp !== undefined ? isMinimizedProp : internalMinimized;

  const handleToggleMinimize = (val: boolean) => {
    setInternalMinimized(val);
    onMinimizeChange?.(val);
  };

  // Measure exact rendered height and report to parent for dynamic pixel-perfect clearance
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const reportHeight = () => {
      const h = el.offsetHeight;
      if (h > 0) onHeightChange?.(h);
    };

    reportHeight();

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
        if (h > 0) onHeightChange?.(h);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [onHeightChange, isMinimized]);

  // Precision timestamp-based timer reference
  const targetEndTimeRef = useRef<number>(Date.now() + initialSeconds * 1000);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timerIdRef = useRef<string>('');
  const rescheduleDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const isFinishedRef = useRef<boolean>(false);

  // Check notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPermission(getNotificationPermission());
    }
  }, []);

  // Initialize or reset timer & schedule background push
  useEffect(() => {
    if (isOpen) {
      setTimeLeft(initialSeconds);
      setTotalSeconds(initialSeconds);
      targetEndTimeRef.current = Date.now() + initialSeconds * 1000;
      setIsRunning(true);
      setIsFinished(false);
      isFinishedRef.current = false;

      // Dismiss any lingering old notifications
      closeRestTimerNotifications();

      // Generate a unique timerId for this countdown
      const id = `timer-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      timerIdRef.current = id;

      // Schedule real server-side push notification
      scheduleServerPushTimer({
        timerId: id,
        delaySeconds: initialSeconds,
        exerciseName,
      });
    } else {
      if (rescheduleDebounceRef.current) {
        clearTimeout(rescheduleDebounceRef.current);
        rescheduleDebounceRef.current = null;
      }
      if (timerIdRef.current && !isFinishedRef.current) {
        cancelServerPushTimer(timerIdRef.current);
      }
      closeRestTimerNotifications();
    }

    return () => {
      if (rescheduleDebounceRef.current) {
        clearTimeout(rescheduleDebounceRef.current);
        rescheduleDebounceRef.current = null;
      }
      if (timerIdRef.current && !isFinishedRef.current) {
        cancelServerPushTimer(timerIdRef.current);
      }
    };
  }, [isOpen, initialSeconds, exerciseName]);

  // Handle Close / Cancel
  const handleClose = () => {
    if (rescheduleDebounceRef.current) {
      clearTimeout(rescheduleDebounceRef.current);
      rescheduleDebounceRef.current = null;
    }
    if (timerIdRef.current && !isFinishedRef.current) {
      cancelServerPushTimer(timerIdRef.current);
    }
    closeRestTimerNotifications();
    onClose();
  };

  // Timestamp precision tick handler
  useEffect(() => {
    if (!isOpen) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const updateTimer = () => {
      if (!isRunning) return;

      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((targetEndTimeRef.current - now) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        setIsRunning(false);
        setIsFinished(true);
        isFinishedRef.current = true;
        if (internalMinimized) {
          setInternalMinimized(false);
          onMinimizeChange?.(false);
        }
        if (timerRef.current) clearInterval(timerRef.current);
        if (rescheduleDebounceRef.current) {
          clearTimeout(rescheduleDebounceRef.current);
          rescheduleDebounceRef.current = null;
        }

        // In-app sensory feedback: haptics + audio chime
        // The system notification banner is dispatched by the server via Web Push
        // at this exact second to prevent duplicate notification banners.
        triggerVibration([300, 150, 300, 150, 500]);
        playTimerCompleteBeep();
      }
    };

    if (isRunning && !isFinished) {
      updateTimer();
      timerRef.current = setInterval(updateTimer, 500); // 500ms intervals for responsive UI
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    // Re-check accurately when waking up / tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isRunning) {
        updateTimer();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isOpen, isRunning, isFinished, exerciseName]);

  const togglePlayPause = () => {
    if (rescheduleDebounceRef.current) {
      clearTimeout(rescheduleDebounceRef.current);
      rescheduleDebounceRef.current = null;
    }

    if (isRunning) {
      setIsRunning(false);
      // Cancel server push while paused
      if (timerIdRef.current) {
        cancelServerPushTimer(timerIdRef.current);
      }
    } else {
      // Resume by shifting target timestamp
      targetEndTimeRef.current = Date.now() + timeLeft * 1000;
      setIsRunning(true);
      setIsFinished(false);
      isFinishedRef.current = false;

      // Reschedule server push with a fresh timerId to guarantee it's not marked cancelled
      if (timeLeft > 0) {
        const prevId = timerIdRef.current;
        const freshId = `timer-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        timerIdRef.current = freshId;
        if (prevId) {
          cancelServerPushTimer(prevId);
        }
        scheduleServerPushTimer({
          timerId: freshId,
          delaySeconds: timeLeft,
          exerciseName,
        });
      }
    }
  };

  const addTime = (seconds: number) => {
    const next = Math.max(0, timeLeft + seconds);
    targetEndTimeRef.current = Date.now() + next * 1000;
    setTimeLeft(next);
    if (next > totalSeconds) {
      setTotalSeconds(next);
    }
    if (isFinished) {
      setIsFinished(false);
      isFinishedRef.current = false;
      setIsRunning(true);
      closeRestTimerNotifications();
    }

    // Debounce the server push rescheduling (400ms) so rapid taps on +/- do NOT fire
    // competing out-of-order network requests that overwrite the desired delay!
    if (rescheduleDebounceRef.current) {
      clearTimeout(rescheduleDebounceRef.current);
    }

    rescheduleDebounceRef.current = setTimeout(() => {
      rescheduleDebounceRef.current = null;
      const remainingSecs = Math.ceil((targetEndTimeRef.current - Date.now()) / 1000);
      if (remainingSecs > 0) {
        const prevId = timerIdRef.current;
        const freshId = `timer-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        timerIdRef.current = freshId;
        if (prevId) {
          cancelServerPushTimer(prevId);
        }
        scheduleServerPushTimer({
          timerId: freshId,
          delaySeconds: remainingSecs,
          exerciseName,
        });
      } else if (timerIdRef.current && remainingSecs <= 0) {
        cancelServerPushTimer(timerIdRef.current);
      }
    }, 400);
  };

  const setFixedTime = (seconds: number) => {
    if (rescheduleDebounceRef.current) {
      clearTimeout(rescheduleDebounceRef.current);
      rescheduleDebounceRef.current = null;
    }

    const prevId = timerIdRef.current;
    const freshId = `timer-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    timerIdRef.current = freshId;

    if (prevId) {
      cancelServerPushTimer(prevId);
    }

    targetEndTimeRef.current = Date.now() + seconds * 1000;
    setTimeLeft(seconds);
    setTotalSeconds(seconds);
    setIsRunning(true);
    setIsFinished(false);
    isFinishedRef.current = false;
    closeRestTimerNotifications();

    // Reschedule push for fixed time with fresh timerId
    if (seconds > 0) {
      scheduleServerPushTimer({
        timerId: freshId,
        delaySeconds: seconds,
        exerciseName,
      });
    }
  };

  const handleEnableNotifications = async () => {
    const perm = await requestNotificationPermission();
    setPermission(perm);
    if (perm === 'granted' && timerIdRef.current && timeLeft > 0) {
      scheduleServerPushTimer({
        timerId: timerIdRef.current,
        delaySeconds: timeLeft,
        exerciseName,
      });
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPct = totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 100;

  return (
    <motion.div
      ref={containerRef}
      layout
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      style={{
        WebkitBackfaceVisibility: 'hidden',
        backfaceVisibility: 'hidden',
        transform: 'translate3d(0, 0, 0)',
        willChange: 'transform, height',
      }}
      className="w-full relative rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-emerald-500/30 dark:border-emerald-500/20 overflow-hidden"
    >
      {/* Top Progress bar */}
      <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 overflow-hidden">
        <motion.div
          className="h-full bg-emerald-500 transition-all duration-300 ease-linear"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <AnimatePresence mode="popLayout" initial={false}>
        {isMinimized ? (
          /* MINIMIZED BAR: Sleek, unobtrusive bottom bar */
          <motion.div
            key="minimized"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => handleToggleMinimize(false)}
            className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2.5 cursor-pointer select-none"
          >
          {/* Left: Indicator + exercise name + time */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                isFinished
                  ? 'bg-red-500 animate-ping'
                  : isRunning
                  ? 'bg-emerald-500 animate-pulse'
                  : 'bg-amber-500'
              }`}
            />
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span
                className={`text-lg font-black tracking-tight tabular-nums ${
                  isFinished
                    ? 'text-red-500'
                    : 'text-slate-900 dark:text-zinc-100'
                }`}
              >
                {formatTime(timeLeft)}
              </span>
              {exerciseName && (
                <span className="text-xs text-zinc-400 truncate max-w-[110px] hidden xs:inline">
                  {exerciseName}
                </span>
              )}
            </div>
          </div>

          {/* Right: Quick controls */}
          <div
            className="flex items-center gap-1.5 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={togglePlayPause}
              className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors cursor-pointer"
              title={isRunning ? 'Pausa' : 'Avvia'}
            >
              {isRunning ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => addTime(30)}
              className="px-2 py-1 rounded-xl bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              title="+30 secondi"
            >
              +30s
            </button>

            <button
              type="button"
              onClick={() => handleToggleMinimize(false)}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Espandi timer"
              aria-label="Espandi timer"
            >
              <ChevronUp className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Chiudi timer"
              aria-label="Chiudi timer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      ) : (
        /* EXPANDED CARD: Full timer controls and presets */
        <motion.div
          key="expanded"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="w-full p-3.5 sm:p-5 flex flex-col gap-2.5 sm:gap-3"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  isFinished
                    ? 'bg-red-500 animate-ping'
                    : isRunning
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-amber-500'
                }`}
              />
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
                {isFinished ? 'Recupero Terminato!' : 'Timer Recupero'}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {exerciseName && (
                <span className="text-xs text-zinc-400 truncate max-w-[120px] text-right font-medium mr-1 hidden xs:inline">
                  {exerciseName}
                </span>
              )}

              <button
                type="button"
                onClick={() => handleToggleMinimize(true)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Riduci ad icona"
                aria-label="Riduci timer ad icona"
              >
                <ChevronDown className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                aria-label="Chiudi timer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Permission Prompt Banner if not granted and not dismissed */}
          {permission !== 'granted' && !isNotificationDismissed && (
            <div className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold">
              <button
                type="button"
                onClick={handleEnableNotifications}
                className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer hover:opacity-85"
              >
                <Bell className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="truncate text-[11px]">Notifiche per schermo bloccato</span>
                <span className="text-[10px] font-extrabold underline shrink-0">Consenti</span>
              </button>
              <button
                type="button"
                onClick={() => setIsNotificationDismissed(true)}
                className="p-1 text-amber-600/70 hover:text-amber-700 dark:hover:text-amber-200 transition-colors cursor-pointer shrink-0"
                title="Chiudi avviso"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Time Display & Quick Controls */}
          <div className="flex items-center justify-between my-0.5 sm:my-1">
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-4xl sm:text-5xl font-black tracking-tight tabular-nums ${
                  isFinished
                    ? 'text-emerald-600 dark:text-emerald-400 animate-bounce'
                    : 'text-slate-900 dark:text-zinc-100'
                }`}
              >
                {formatTime(timeLeft)}
              </span>
              <span className="text-xs font-bold text-zinc-400">min</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => addTime(-15)}
                disabled={timeLeft <= 15}
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs flex items-center justify-center hover:bg-slate-200 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                title="-15 secondi"
              >
                <Minus className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={togglePlayPause}
                className="w-12 h-12 rounded-2xl bg-emerald-500 text-zinc-950 font-bold flex items-center justify-center shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 active:scale-95 transition-all cursor-pointer"
                title={isRunning ? 'Pausa' : 'Avvia'}
              >
                {isRunning ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => addTime(30)}
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs flex items-center justify-center hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all cursor-pointer"
                title="+30 secondi"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick preset action buttons */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-zinc-800/80">
            <div className="flex items-center gap-1.5">
              {[30, 60, 90, 120].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setFixedTime(sec)}
                  className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  {sec}s
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline px-1 py-0.5 cursor-pointer"
            >
              Salta
            </button>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </motion.div>
  );
}
