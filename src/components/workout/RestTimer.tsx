'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Plus, Minus, X, Bell } from 'lucide-react';
import { playTimerCompleteBeep, triggerVibration } from '@/lib/utils/audio';

interface RestTimerProps {
  initialSeconds: number;
  isOpen: boolean;
  onClose: () => void;
  exerciseName?: string;
}

export function RestTimer({ initialSeconds, isOpen, onClose, exerciseName }: RestTimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [totalSeconds, setTotalSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(true);
  const [isFinished, setIsFinished] = useState(false);

  // Precision timestamp-based timer reference
  const targetEndTimeRef = useRef<number>(Date.now() + initialSeconds * 1000);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Request notification permission once on user interaction
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Initialize or reset timer
  useEffect(() => {
    if (isOpen) {
      setTimeLeft(initialSeconds);
      setTotalSeconds(initialSeconds);
      targetEndTimeRef.current = Date.now() + initialSeconds * 1000;
      setIsRunning(true);
      setIsFinished(false);
    }
  }, [isOpen, initialSeconds]);

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
        if (timerRef.current) clearInterval(timerRef.current);

        // Sound & Vibration Feedback
        playTimerCompleteBeep();
        triggerVibration([300, 150, 300, 150, 500]);

        // Background Notification if document is hidden
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' && document.hidden) {
          try {
            new Notification('Recupero Terminato! ⏰', {
              body: exerciseName ? `È ora della prossima serie per ${exerciseName}.` : 'È ora della prossima serie.',
              icon: '/icons/icon-192x192.png',
              badge: '/icons/icon-192x192.png',
            });
          } catch {}
        }
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
    if (isRunning) {
      setIsRunning(false);
    } else {
      // Resume by shifting target timestamp
      targetEndTimeRef.current = Date.now() + timeLeft * 1000;
      setIsRunning(true);
      setIsFinished(false);
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
      setIsRunning(true);
    }
  };

  const setFixedTime = (seconds: number) => {
    targetEndTimeRef.current = Date.now() + seconds * 1000;
    setTimeLeft(seconds);
    setTotalSeconds(seconds);
    setIsRunning(true);
    setIsFinished(false);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPct = totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 100;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 80, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-96 z-50 shadow-2xl rounded-3xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-emerald-500/30 dark:border-emerald-500/20 overflow-hidden"
      >
        {/* Top Progress bar */}
        <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 overflow-hidden">
          <motion.div
            className="h-full bg-emerald-500 transition-all duration-300 ease-linear"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="p-4 sm:p-5 flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  isFinished
                    ? 'bg-red-500 animate-ping'
                    : isRunning
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-amber-500'
                }`}
              />
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {isFinished ? 'Recupero Terminato!' : 'Timer Recupero'}
              </span>
            </div>

            {exerciseName && (
              <span className="text-xs text-zinc-400 truncate max-w-[140px] text-right font-medium">
                {exerciseName}
              </span>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ml-1 cursor-pointer"
              aria-label="Chiudi timer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Time Display & Quick Controls */}
          <div className="flex items-center justify-between my-1">
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
              onClick={onClose}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline px-1 py-0.5 cursor-pointer"
            >
              Salta
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
