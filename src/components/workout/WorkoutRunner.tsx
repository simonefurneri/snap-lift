'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { workoutService, PreviousExerciseHistory } from '@/lib/services/workoutService';
import { offlineSync } from '@/lib/services/offlineSync';
import { offlineDb } from '@/lib/services/offlineDb';
import { syncEngine } from '@/lib/services/syncEngine';
import { useWakeLock } from '@/lib/hooks/useWakeLock';
import { SyncIndicator } from '@/components/pwa/SyncIndicator';
import { calculateProgression, ProgressionResult } from '@/lib/progression';
import { VideoModal } from '@/components/ui/VideoModal';
import { RestTimer } from '@/components/workout/RestTimer';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  WorkoutSession,
  SetLog,
  PlanDayWithExercises,
  Plan,
  Exercise,
} from '@/types/database.types';
import {
  Dumbbell,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Flame,
  Plus,
  Trash2,
  Sparkles,
  Info,
  Trophy,
} from 'lucide-react';
import { YouTubeIcon } from '@/components/ui/Icons';
import { motion, AnimatePresence } from 'framer-motion';

interface WorkoutRunnerProps {
  initialSession: WorkoutSession;
  initialDay: PlanDayWithExercises;
  initialPlan: Plan | null;
  initialSetLogs: SetLog[];
}

interface SetRowState {
  setNumber: number;
  weight: string;
  reps: string;
  isCompleted: boolean;
  savedLogId?: string;
}

export function WorkoutRunner({
  initialSession,
  initialDay,
  initialPlan,
  initialSetLogs,
}: WorkoutRunnerProps) {
  const router = useRouter();
  const { user, profile } = useAuth();

  const [session, setSession] = useState<WorkoutSession>(initialSession);
  const [exercises, setExercises] = useState<Exercise[]>(initialDay.exercises || []);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);

  // Active workout state: Map of exerciseId/exerciseName -> SetRowState[]
  const [exerciseSetsMap, setExerciseSetsMap] = useState<Record<string, SetRowState[]>>({});

  // History cache for each exercise: exerciseName -> PreviousExerciseHistory
  const [historyMap, setHistoryMap] = useState<Record<string, PreviousExerciseHistory | null>>({});
  const [historyLoading, setHistoryLoading] = useState(false);

  // Video modal state
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);

  // Rest Timer state
  const [isRestTimerOpen, setIsRestTimerOpen] = useState(false);
  const [restTimerSeconds, setRestTimerSeconds] = useState(90);
  const [restTimerExerciseName, setRestTimerExerciseName] = useState('');

  // Finish Workout Modal state
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  // Workout duration stopwatch
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const stopwatchRef = useRef<NodeJS.Timeout | null>(null);
  const exercisesCarouselRef = useRef<HTMLDivElement>(null);

  const weightUnit = profile?.weight_unit || 'kg';
  const progressionPct = profile?.progression_pct || 2.5;
  const loadStep = profile?.load_step || 1.25;

  // Keep screen awake during workout session
  useWakeLock(true);

  // Auto-scroll carousel to active exercise when currentExerciseIndex changes
  useEffect(() => {
    if (exercisesCarouselRef.current) {
      const activePill = exercisesCarouselRef.current.querySelector(
        `[data-exercise-idx="${currentExerciseIndex}"]`
      );
      if (activePill) {
        activePill.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [currentExerciseIndex]);

  // Mouse wheel horizontal scroll listener for desktop on exercises carousel
  useEffect(() => {
    const el = exercisesCarouselRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0 && el.scrollWidth > el.clientWidth) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Save active session in IndexedDB for interrupted workout recovery
  useEffect(() => {
    if (session?.id) {
      offlineDb.saveActiveSession({
        id: session.id,
        user_id: session.user_id,
        plan_id: initialPlan?.id || null,
        plan_day_id: session.plan_day_id,
        day_name: initialDay.name,
        started_at: session.started_at,
        updated_at: new Date().toISOString(),
        is_active: true,
      });
    }
  }, [session, initialDay.name]);

  // 1. Initialize stopwatch
  useEffect(() => {
    const started = new Date(session.started_at).getTime();
    const updateElapsed = () => {
      const now = Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((now - started) / 1000)));
    };
    updateElapsed();
    stopwatchRef.current = setInterval(updateElapsed, 1000);
    return () => {
      if (stopwatchRef.current) clearInterval(stopwatchRef.current);
    };
  }, [session.started_at]);

  // 2. Initialize sets state from existing logs & exercise definitions
  useEffect(() => {
    const setsMap: Record<string, SetRowState[]> = {};

    exercises.forEach((ex) => {
      const exKey = ex.name.trim();
      const existingLogs = initialSetLogs.filter(
        (log) => log.exercise_name.trim().toLowerCase() === exKey.toLowerCase()
      );

      const rows: SetRowState[] = [];
      const totalSets = Math.max(ex.sets || 3, existingLogs.length);

      for (let i = 1; i <= totalSets; i++) {
        const matchingLog = existingLogs.find((l) => l.set_number === i);
        if (matchingLog) {
          rows.push({
            setNumber: i,
            weight: matchingLog.weight?.toString() || '',
            reps: matchingLog.reps?.toString() || '',
            isCompleted: true,
            savedLogId: matchingLog.id,
          });
        } else {
          rows.push({
            setNumber: i,
            weight: '',
            reps: '',
            isCompleted: false,
          });
        }
      }
      setsMap[exKey] = rows;
    });

    setExerciseSetsMap(setsMap);
  }, [exercises, initialSetLogs]);

  // 3. Fetch previous session history for all exercises in this day
  useEffect(() => {
    if (!user || exercises.length === 0) return;

    const fetchAllHistories = async () => {
      setHistoryLoading(true);
      const newHistoryMap: Record<string, PreviousExerciseHistory | null> = {};

      for (const ex of exercises) {
        try {
          const hist = await workoutService.getPreviousHistoryForExercise(
            user.id,
            ex.name,
            session.id,
            ex.reps_max
          );
          newHistoryMap[ex.name.trim()] = hist;
        } catch (e) {
          console.warn('Error fetching history for', ex.name, e);
        }
      }

      setHistoryMap(newHistoryMap);
      setHistoryLoading(false);
    };

    fetchAllHistories();
  }, [user, exercises, session.id]);

  const currentExercise = exercises[currentExerciseIndex] || null;
  const currentKey = currentExercise?.name?.trim() || '';
  const currentSets = exerciseSetsMap[currentKey] || [];
  const currentHistory = historyMap[currentKey] || null;

  // 4. Calculate progression for active exercise using pure function
  const progressionResult: ProgressionResult = useMemo(() => {
    if (!currentExercise) {
      return {
        suggestedWeight: null,
        status: 'none',
        message: '',
        allSetsHitMax: false,
        previousWeight: null,
      };
    }

    return calculateProgression({
      previousSets: currentHistory?.sets || null,
      repsMin: currentExercise.reps_min,
      repsMax: currentExercise.reps_max,
      progressionPct,
      loadStep,
    });
  }, [currentExercise, currentHistory, progressionPct, loadStep]);

  // Format stopwatch time (HH:MM:SS)
  const formatStopwatch = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${mins < 10 ? '0' : ''}${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  // Update a set row's value
  const handleUpdateSet = (index: number, field: 'weight' | 'reps', value: string) => {
    if (!currentKey) return;
    setExerciseSetsMap((prev) => {
      const list = [...(prev[currentKey] || [])];
      if (list[index]) {
        list[index] = { ...list[index], [field]: value };
      }
      return { ...prev, [currentKey]: list };
    });
  };

  // Quick fill suggested load
  const handleApplySuggestedWeight = (index?: number) => {
    if (!progressionResult.suggestedWeight || !currentKey) return;
    const val = progressionResult.suggestedWeight.toString();

    setExerciseSetsMap((prev) => {
      const list = [...(prev[currentKey] || [])];
      if (typeof index === 'number') {
        if (list[index]) list[index] = { ...list[index], weight: val };
      } else {
        // Fill all empty weight rows
        list.forEach((row, i) => {
          if (!row.weight) list[i] = { ...row, weight: val };
        });
      }
      return { ...prev, [currentKey]: list };
    });
  };

  // Complete / Uncomplete a set row
  const handleToggleSetComplete = async (index: number) => {
    if (!user || !currentExercise || !currentKey) return;
    const setRow = currentSets[index];
    if (!setRow) return;

    const nextCompleted = !setRow.isCompleted;

    // Use entered weight or suggested weight as fallback if empty
    const weightNum = parseFloat(setRow.weight) || progressionResult.suggestedWeight || 0;
    const repsNum = parseInt(setRow.reps, 10) || currentExercise.reps_max || 0;
    const logId = setRow.savedLogId || crypto.randomUUID();

    // Optimistically update UI
    setExerciseSetsMap((prev) => {
      const list = [...(prev[currentKey] || [])];
      if (list[index]) {
        list[index] = {
          ...list[index],
          isCompleted: nextCompleted,
          savedLogId: logId,
          weight: setRow.weight || (nextCompleted ? weightNum.toString() : ''),
          reps: setRow.reps || (nextCompleted ? repsNum.toString() : ''),
        };
      }
      return { ...prev, [currentKey]: list };
    });

    // Save to local cache & active session state
    offlineSync.saveWorkoutLocally(session.id, {
      sessionId: session.id,
      updatedAt: new Date().toISOString(),
      setLogs: {},
    });

    if (nextCompleted) {
      // Trigger Rest Timer
      if (currentExercise.rest_seconds > 0) {
        setRestTimerSeconds(currentExercise.rest_seconds);
        setRestTimerExerciseName(currentExercise.name);
        setIsRestTimerOpen(true);
      }

      // Enqueue to persistent IndexedDB sync queue (idempotent upsert with client UUID)
      await syncEngine.enqueueSetLog({
        id: logId,
        user_id: session.user_id,
        session_id: session.id,
        exercise_id: currentExercise.id || null,
        exercise_name: currentExercise.name,
        set_number: setRow.setNumber,
        weight: weightNum,
        reps: repsNum,
        is_completed: true,
      });
    } else {
      // Enqueue uncompleted update
      await syncEngine.enqueueSetLog({
        id: logId,
        user_id: session.user_id,
        session_id: session.id,
        exercise_id: currentExercise.id || null,
        exercise_name: currentExercise.name,
        set_number: setRow.setNumber,
        weight: weightNum,
        reps: repsNum,
        is_completed: false,
      });
    }
  };

  // Add a new set row
  const handleAddSet = () => {
    if (!currentKey) return;
    setExerciseSetsMap((prev) => {
      const list = [...(prev[currentKey] || [])];
      const newSetNumber = list.length + 1;
      const lastWeight = list[list.length - 1]?.weight || '';
      list.push({
        setNumber: newSetNumber,
        weight: lastWeight,
        reps: '',
        isCompleted: false,
      });
      return { ...prev, [currentKey]: list };
    });
  };

  // Remove the last set row
  const handleRemoveSet = async () => {
    if (!currentKey || currentSets.length <= 1) return;
    const lastRow = currentSets[currentSets.length - 1];

    if (lastRow.isCompleted && lastRow.savedLogId) {
      try {
        await workoutService.deleteSetLog(
          session.id,
          { id: currentExercise?.id, name: currentExercise?.name || currentKey },
          lastRow.setNumber
        );
      } catch (e) {
        console.warn(e);
      }
    }

    setExerciseSetsMap((prev) => {
      const list = [...(prev[currentKey] || [])];
      list.pop();
      return { ...prev, [currentKey]: list };
    });
  };

  // Summary calculation for Finish Modal
  const workoutStats = useMemo(() => {
    let completedSetsCount = 0;
    let totalVolume = 0;

    Object.values(exerciseSetsMap).forEach((sets) => {
      sets.forEach((s) => {
        if (s.isCompleted) {
          completedSetsCount += 1;
          const w = parseFloat(s.weight) || 0;
          const r = parseInt(s.reps, 10) || 0;
          totalVolume += w * r;
        }
      });
    });

    return {
      completedSetsCount,
      totalVolume: Math.round(totalVolume),
      durationFormatted: formatStopwatch(elapsedSeconds),
    };
  }, [exerciseSetsMap, elapsedSeconds]);

  // Finish Workout
  const handleConfirmFinishWorkout = async () => {
    setIsFinishing(true);
    try {
      await workoutService.finishSession(session.id);
      await offlineDb.deleteActiveSession(session.id);
      offlineSync.clearWorkoutLocally(session.id);
      setIsFinishModalOpen(false);
      router.push('/plans');
    } catch (e) {
      console.error('Error finishing session', e);
      setIsFinishing(false);
    }
  };

  // Cancel / Discard Workout
  const handleConfirmCancelWorkout = async () => {
    try {
      await workoutService.cancelSession(session.id);
      await offlineDb.deleteActiveSession(session.id);
      offlineSync.clearWorkoutLocally(session.id);
      router.push('/plans');
    } catch (e) {
      console.error('Error canceling session', e);
    }
  };

  // Check if an exercise has all its sets completed
  const isExerciseFullyCompleted = (exName: string) => {
    const sets = exerciseSetsMap[exName.trim()] || [];
    return sets.length > 0 && sets.every((s) => s.isCompleted);
  };

  return (
    <div className="h-screen h-dvh bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 flex flex-col justify-between overflow-hidden max-w-full">
      {/* 1. FIXED TOP APP BAR & EXERCISE CAROUSEL */}
      <div className="sticky top-0 z-40 w-full shrink-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 shadow-xs">
        <header className="px-4 sm:px-6 md:px-8 pt-[calc(0.875rem+env(safe-area-inset-top,0px))] pb-3 sm:py-3.5 flex items-center justify-between gap-3 max-w-full border-b border-slate-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setIsCancelConfirmOpen(true)}
              className="p-1.5 sm:p-2 rounded-xl text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
              title="Esci o annulla allenamento"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <span className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 truncate">
                Allenamento in corso
              </span>
              <h1 className="text-xs sm:text-base font-extrabold truncate text-zinc-900 dark:text-zinc-100">
                {initialDay.name} {initialPlan ? `— ${initialPlan.name}` : ''}
              </h1>
            </div>
          </div>

          {/* Sync status, Stopwatch & Finish Button */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <SyncIndicator showLabel={false} />

            <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 font-mono text-xs font-bold border border-slate-200/60 dark:border-zinc-700/60 shrink-0">
              <Clock className="w-3.5 h-3.5 text-emerald-500 animate-pulse shrink-0" />
              <span>{formatStopwatch(elapsedSeconds)}</span>
            </div>

            <button
              type="button"
              onClick={() => setIsFinishModalOpen(true)}
              className="px-2.5 py-1.5 sm:px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-black text-xs transition-all shadow-md shadow-emerald-500/20 cursor-pointer shrink-0"
            >
              Termina
            </button>
          </div>
        </header>

        {/* 2. EXERCISE CAROUSEL / STEPPER TABS */}
        <div
          ref={exercisesCarouselRef}
          className="px-4 sm:px-6 md:px-8 py-2 overflow-x-auto flex items-center gap-2 no-scrollbar scroll-smooth bg-white/40 dark:bg-zinc-900/30"
        >
          {exercises.map((ex, idx) => {
            const isCurrent = idx === currentExerciseIndex;
            const isDone = isExerciseFullyCompleted(ex.name);

            return (
              <button
                key={ex.id}
                type="button"
                data-exercise-idx={idx}
                onClick={() => setCurrentExerciseIndex(idx)}
                className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20 scale-[1.02]'
                    : isDone
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <span className="text-[10px] opacity-70">#{idx + 1}</span>
                )}
                <span className="truncate max-w-[120px] sm:max-w-[160px]">{ex.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. MAIN WORKOUT RUNNER BODY (Scrollable central area) */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-3xl w-full mx-auto flex flex-col gap-5 min-h-0">
        {currentExercise ? (
          <div className="flex flex-col gap-4">
            {/* Exercise Header Card */}
            <div className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                      Esercizio {currentExerciseIndex + 1} di {exercises.length}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">
                    {currentExercise.name}
                  </h2>
                </div>

                {currentExercise.video_url && (
                  <button
                    type="button"
                    onClick={() => setVideoModalUrl(currentExercise.video_url)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 font-bold text-xs border border-red-200 dark:border-red-900/40 transition-colors cursor-pointer"
                  >
                    <YouTubeIcon className="w-4 h-4 fill-current" />
                    <span>Video</span>
                  </button>
                )}
              </div>

              {/* Target chips: Range Reps & Rest Target */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    Target: {currentExercise.reps_min} - {currentExercise.reps_max} reps
                  </span>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  <Clock className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Recupero: {currentExercise.rest_seconds}s</span>
                </div>
              </div>

              {/* Technique notes if provided */}
              {currentExercise.technique_notes && (
                <div className="mt-3.5 p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/60 dark:border-zinc-800 flex items-start gap-2.5 text-xs text-zinc-600 dark:text-zinc-300">
                  <Info className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{currentExercise.technique_notes}</p>
                </div>
              )}
            </div>

            {/* "Ultima volta" Historical Performance Card */}
            <div className="bg-slate-100/70 dark:bg-zinc-800/40 border border-slate-200/70 dark:border-zinc-800 rounded-3xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                    Ultima Volta
                  </span>
                </div>

                {currentHistory?.allSetsHitMax && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-black text-[11px] border border-emerald-500/30">
                    <Trophy className="w-3 h-3" />
                    Tutte a {currentExercise.reps_max} reps!
                  </span>
                )}
              </div>

              {currentHistory && currentHistory.sets.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {currentHistory.sets.map((s) => (
                      <div
                        key={s.set_number}
                        className="px-2.5 py-1 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700/60 text-xs font-bold text-zinc-800 dark:text-zinc-200 shadow-xs"
                      >
                        <span className="text-zinc-400 mr-1">S{s.set_number}:</span>
                        <span>
                          {s.weight} {weightUnit} × {s.reps} reps
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Progression Coach / Suggested load advice */}
                  {progressionResult.suggestedWeight !== null && (
                    <div className="mt-2 pt-2.5 border-t border-slate-200/60 dark:border-zinc-700/50 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs">
                        <Sparkles className="w-4 h-4 text-emerald-500" />
                        <span className="text-zinc-600 dark:text-zinc-300">
                          Suggerimento carico:{' '}
                          <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                            {progressionResult.suggestedWeight} {weightUnit}
                          </strong>
                        </span>
                        {progressionResult.percentageIncreaseBadge && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-zinc-950 font-black text-[10px]">
                            {progressionResult.percentageIncreaseBadge}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleApplySuggestedWeight()}
                        className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        Applica a tutte
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-zinc-400 italic">
                  Nessun allenamento precedente registrato per questo esercizio.
                </p>
              )}
            </div>

            {/* 4. SETS INPUT TABLE / ROWS */}
            <div className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col gap-3">
              <div className="grid grid-cols-12 gap-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-2 pb-1 border-b border-slate-100 dark:border-zinc-800">
                <span className="col-span-2 sm:col-span-2 text-center">Serie</span>
                <span className="col-span-3 sm:col-span-3 text-center hidden sm:block">
                  Precedente
                </span>
                <span className="col-span-5 sm:col-span-3 text-center">
                  Carico ({weightUnit})
                </span>
                <span className="col-span-3 sm:col-span-2 text-center">Reps</span>
                <span className="col-span-2 sm:col-span-2 text-center">Fatto</span>
              </div>

              {currentSets.map((setRow, index) => {
                const prevSet = currentHistory?.sets?.find((s) => s.set_number === setRow.setNumber);
                const suggestedPlaceholder =
                  progressionResult.suggestedWeight !== null
                    ? progressionResult.suggestedWeight.toString()
                    : prevSet
                    ? prevSet.weight.toString()
                    : '';

                return (
                  <motion.div
                    key={setRow.setNumber}
                    layout
                    className={`grid grid-cols-12 gap-2 items-center p-2 rounded-2xl transition-colors ${
                      setRow.isCompleted
                        ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30'
                        : 'hover:bg-slate-50 dark:hover:bg-zinc-800/40 border border-transparent'
                    }`}
                  >
                    {/* Set Number */}
                    <div className="col-span-2 sm:col-span-2 flex items-center justify-center">
                      <span className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-zinc-800 font-bold text-xs flex items-center justify-center text-zinc-700 dark:text-zinc-300">
                        {setRow.setNumber}
                      </span>
                    </div>

                    {/* Previous Reference (Desktop) */}
                    <div className="col-span-3 sm:col-span-3 text-center hidden sm:block">
                      {prevSet ? (
                        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                          {prevSet.weight} × {prevSet.reps}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </div>

                    {/* Weight Input */}
                    <div className="col-span-5 sm:col-span-3 relative">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.25"
                        min="0"
                        placeholder={suggestedPlaceholder || '0'}
                        value={setRow.weight}
                        onChange={(e) => handleUpdateSet(index, 'weight', e.target.value)}
                        className={`w-full min-h-[44px] text-center font-bold text-sm sm:text-base rounded-xl border transition-all focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                          setRow.isCompleted
                            ? 'bg-white dark:bg-zinc-900 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-50 dark:bg-zinc-800/70 border-slate-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100'
                        }`}
                      />
                      {!setRow.weight && suggestedPlaceholder && (
                        <button
                          type="button"
                          onClick={() => handleApplySuggestedWeight(index)}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/30 cursor-pointer"
                          title="Tocca per inserire il carico suggerito"
                        >
                          Usa
                        </button>
                      )}
                    </div>

                    {/* Reps Input */}
                    <div className="col-span-3 sm:col-span-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        step="1"
                        min="0"
                        placeholder={currentExercise.reps_max.toString()}
                        value={setRow.reps}
                        onChange={(e) => handleUpdateSet(index, 'reps', e.target.value)}
                        className={`w-full min-h-[44px] text-center font-bold text-sm sm:text-base rounded-xl border transition-all focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                          setRow.isCompleted
                            ? 'bg-white dark:bg-zinc-900 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-50 dark:bg-zinc-800/70 border-slate-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100'
                        }`}
                      />
                    </div>

                    {/* Done / Checkbox Button */}
                    <div className="col-span-2 sm:col-span-2 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => handleToggleSetComplete(index)}
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                          setRow.isCompleted
                            ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/30 scale-105 font-black'
                            : 'bg-slate-100 dark:bg-zinc-800 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                        }`}
                        title={setRow.isCompleted ? 'Contrassegna come incompleta' : 'Completa serie'}
                      >
                        <CheckCircle2 className="w-5 h-5 fill-current" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}

              {/* Set Management Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800 mt-1">
                <button
                  type="button"
                  onClick={handleAddSet}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Aggiungi Serie</span>
                </button>

                {currentSets.length > 1 && (
                  <button
                    type="button"
                    onClick={handleRemoveSet}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Rimuovi</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-zinc-400">Nessun esercizio presente in questo giorno.</div>
        )}
      </main>

      {/* 5. BOTTOM NAVIGATION BAR (Previous / Next Exercise Stepper) */}
      <footer className="sticky bottom-0 z-40 shrink-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-zinc-800 px-4 sm:px-6 md:px-8 pt-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))] sm:py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setCurrentExerciseIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentExerciseIndex === 0}
            className="flex items-center gap-1.5 min-h-[44px] px-3 sm:px-4 py-2 rounded-2xl bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs sm:text-sm disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shrink-0"
            aria-label="Esercizio precedente"
          >
            <ChevronLeft className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Precedente</span>
          </button>

          <span className="text-xs sm:text-sm font-extrabold text-zinc-500 dark:text-zinc-400 shrink-0 whitespace-nowrap px-2.5 py-1 bg-slate-100/80 dark:bg-zinc-800/80 rounded-xl">
            {currentExerciseIndex + 1} / {exercises.length}
          </span>

          {currentExerciseIndex < exercises.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentExerciseIndex((prev) => Math.min(exercises.length - 1, prev + 1))}
              className="flex items-center gap-1.5 min-h-[44px] px-3.5 sm:px-5 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs sm:text-sm shadow-md shadow-emerald-500/20 transition-all cursor-pointer shrink-0 whitespace-nowrap"
            >
              <span>Successivo</span>
              <ChevronRight className="w-4 h-4 shrink-0" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsFinishModalOpen(true)}
              className="flex items-center gap-1.5 min-h-[44px] px-3.5 sm:px-5 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/30 transition-all cursor-pointer animate-pulse shrink-0 whitespace-nowrap"
            >
              <Trophy className="w-4 h-4 shrink-0" />
              <span>Completa<span className="hidden sm:inline"> Allenamento</span></span>
            </button>
          )}
        </div>
      </footer>

      {/* 6. REST TIMER OVERLAY */}
      <RestTimer
        isOpen={isRestTimerOpen}
        initialSeconds={restTimerSeconds}
        exerciseName={restTimerExerciseName}
        onClose={() => setIsRestTimerOpen(false)}
      />

      {/* 7. YOUTUBE VIDEO MODAL */}
      <VideoModal
        isOpen={!!videoModalUrl}
        videoUrl={videoModalUrl}
        exerciseName={currentExercise?.name || ''}
        onClose={() => setVideoModalUrl(null)}
      />

      {/* 8. FINISH WORKOUT SUMMARY MODAL */}
      {isFinishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl flex flex-col gap-5 text-center"
          >
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <Trophy className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">
                Grande Lavoro!
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Hai completato la sessione di {initialDay.name}. Ecco il riepilogo dei tuoi numeri:
              </p>
            </div>

            {/* Stats Summary Grid */}
            <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700/50">
              <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase font-bold text-zinc-400">Durata</span>
                <span className="text-sm sm:text-base font-black text-zinc-900 dark:text-zinc-100">
                  {workoutStats.durationFormatted}
                </span>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase font-bold text-zinc-400">Serie Chiuse</span>
                <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400">
                  {workoutStats.completedSetsCount}
                </span>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase font-bold text-zinc-400">Volume</span>
                <span className="text-sm sm:text-base font-black text-zinc-900 dark:text-zinc-100">
                  {workoutStats.totalVolume} {weightUnit}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmFinishWorkout}
                disabled={isFinishing}
                className="w-full min-h-[48px] rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-sm shadow-md shadow-emerald-500/25 transition-all cursor-pointer"
              >
                {isFinishing ? 'Salvataggio...' : 'Salva e Termina Allenamento'}
              </button>

              <button
                type="button"
                onClick={() => setIsFinishModalOpen(false)}
                className="w-full min-h-[44px] rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
              >
                Continua ad allenarti
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 9. CANCEL / DISCARD CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={isCancelConfirmOpen}
        title="Annullare l'allenamento?"
        message="Sei sicuro di voler uscire? La sessione attiva verrà interrotta."
        confirmLabel="Annulla Sessione"
        cancelLabel="Rimani qui"
        isDanger={true}
        onConfirm={handleConfirmCancelWorkout}
        onClose={() => setIsCancelConfirmOpen(false)}
      />
    </div>
  );
}
