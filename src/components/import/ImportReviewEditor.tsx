'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ImportedPlan, ImportedDay, ImportedExercise } from '@/app/api/import-plan/route';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Sparkles,
  AlertTriangle,
  GripHorizontal,
  GripVertical,
  Plus,
  Trash2,
  Edit2,
  Check,
  Flame,
  Clock,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export interface ExerciseIssue {
  dayIndex: number;
  dayName: string;
  exerciseIndex: number;
  exerciseName: string;
  isUncertain: boolean;
  missingFields: string[];
}

interface ImportReviewEditorProps {
  initialPlan: ImportedPlan;
  onSave: (plan: ImportedPlan) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

// 1. Sortable Day Tab Pill
function SortableDayPill({
  day,
  index,
  isSelected,
  onSelect,
  onDelete,
  issuesCount = 0,
}: {
  day: ImportedDay;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  issuesCount?: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `day-${index}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-day-index={index}
      className={`group flex items-center rounded-2xl transition-all select-none shrink-0 ${
        isSelected
          ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-zinc-950 font-bold shadow-md shadow-emerald-500/20 ring-2 ring-emerald-500/40'
          : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="min-h-[44px] pl-2.5 pr-1 flex items-center justify-center opacity-40 group-hover:opacity-100 cursor-grab active:cursor-grabbing touch-none"
        title="Trascina giorno per riordinare"
      >
        <GripHorizontal className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={onSelect}
        title={day.name}
        className="min-h-[44px] px-2 py-2 text-xs sm:text-sm font-semibold flex items-center gap-1.5 cursor-pointer max-w-[130px] xs:max-w-[160px] sm:max-w-[200px]"
      >
        <span className="truncate">{day.name}</span>
        <span
          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
            isSelected
              ? 'bg-white/20 text-white dark:text-zinc-950 dark:bg-black/20'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
          }`}
        >
          {day.exercises?.length || 0}
        </span>

        {issuesCount > 0 && (
          <span
            className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black shrink-0 ${
              isSelected
                ? 'bg-amber-400 text-zinc-950 ring-1 ring-white/40'
                : 'bg-amber-500 text-zinc-950 shadow-xs'
            }`}
            title={`${issuesCount} ${issuesCount === 1 ? 'campo da verificare o incompleto' : 'campi da verificare o incompleti'}`}
          >
            {issuesCount}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="pr-2 pl-1 py-2 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
        title="Elimina giorno"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// 2. Sortable Exercise Card
function SortableExerciseRow({
  exercise,
  index,
  onUpdate,
  onDelete,
  isHighlighted = false,
}: {
  exercise: ImportedExercise;
  index: number;
  onUpdate: (updated: Partial<ImportedExercise>) => void;
  onDelete: () => void;
  isHighlighted?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `ex-${index}`,
  });

  const [showNotes, setShowNotes] = useState(Boolean(exercise.technique_notes));

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.7 : 1,
  };

  const isMissingName = !exercise.name?.trim();
  const isMissingSets = exercise.sets === null || exercise.sets === undefined;
  const isMissingRepsMin = exercise.reps_min === null || exercise.reps_min === undefined;
  const isMissingRepsMax = exercise.reps_max === null || exercise.reps_max === undefined;
  const isMissingRest = exercise.rest_seconds === null || exercise.rest_seconds === undefined;
  const isMissingFields =
    isMissingName ||
    isMissingSets ||
    isMissingRepsMin ||
    isMissingRepsMax ||
    isMissingRest;

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-exercise-id={`ex-${index}`}
      className={`p-3 sm:p-4 rounded-2xl sm:rounded-3xl border transition-all duration-300 w-full max-w-full overflow-hidden ${
        isHighlighted
          ? 'ring-2 ring-amber-500 dark:ring-amber-400 shadow-xl shadow-amber-500/25 bg-amber-50/80 dark:bg-amber-950/40 border-amber-400 scale-[1.008]'
          : exercise.uncertain
          ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60'
          : isMissingFields
          ? 'bg-orange-50/40 dark:bg-orange-950/15 border-orange-200 dark:border-orange-900/40'
          : 'bg-white dark:bg-zinc-900/90 border-slate-200/80 dark:border-zinc-800'
      }`}
    >
      <div className="flex items-start gap-2 sm:gap-3 min-w-0 w-full">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-grab active:cursor-grabbing touch-none shrink-0"
          title="Trascina per riordinare esercizio"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <div className="flex-1 min-w-0 flex flex-col gap-2.5 sm:gap-3">
          {/* Top Row: Name and Badges */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 min-w-0">
            <div className="min-w-0 flex-1">
              <input
                type="text"
                value={exercise.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder="Nome esercizio (obbligatorio)..."
                className={`w-full min-w-0 font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 bg-transparent border-b hover:border-slate-300 dark:hover:border-zinc-600 focus:outline-hidden px-1 py-0.5 rounded-sm transition-colors ${
                  isMissingName
                    ? 'border-red-400 dark:border-red-500 placeholder-red-400/80 focus:border-red-500'
                    : 'border-transparent hover:border-slate-200 dark:hover:border-zinc-700 focus:border-emerald-500'
                }`}
              />
            </div>

            {/* Badges & Actions */}
            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
              {exercise.uncertain && (
                <button
                  type="button"
                  onClick={() => onUpdate({ uncertain: false })}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-xs cursor-pointer transition-colors"
                  title="Clicca per confermare l'esercizio e rimuovere il contrassegno 'Da verificare'"
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>Da verificare</span>
                  <Check className="w-2.5 h-2.5 ml-0.5 opacity-70" />
                </button>
              )}

              {isMissingFields && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                  <HelpCircle className="w-3 h-3" />
                  <span>Incompleto</span>
                </span>
              )}

              <button
                type="button"
                onClick={onDelete}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                title="Elimina esercizio"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Parameters Grid: Sets, Reps Min, Reps Max, Rest */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 w-full">
            <div className="min-w-0">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1 truncate flex items-center justify-between">
                <span>Serie</span>
                {isMissingSets && (
                  <span className="text-[9px] text-orange-500 dark:text-orange-400 font-semibold lowercase">mancante</span>
                )}
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="es. 3"
                value={exercise.sets !== null && exercise.sets !== undefined ? exercise.sets : ''}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  onUpdate({ sets: val ? parseInt(val, 10) : null });
                }}
                className={`w-full min-w-0 min-h-[38px] px-2.5 py-1.5 text-xs font-bold rounded-xl border text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-colors ${
                  isMissingSets
                    ? 'bg-orange-50/60 dark:bg-orange-950/20 border-orange-300 dark:border-orange-800/80 placeholder-orange-300 dark:placeholder-orange-700/60'
                    : 'bg-slate-50 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700'
                }`}
              />
            </div>

            <div className="min-w-0">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1 truncate flex items-center justify-between">
                <span>Reps Min</span>
                {isMissingRepsMin && (
                  <span className="text-[9px] text-orange-500 dark:text-orange-400 font-semibold lowercase">mancante</span>
                )}
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="es. 8"
                value={
                  exercise.reps_min !== null && exercise.reps_min !== undefined
                    ? exercise.reps_min
                    : ''
                }
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  onUpdate({ reps_min: val ? parseInt(val, 10) : null });
                }}
                className={`w-full min-w-0 min-h-[38px] px-2.5 py-1.5 text-xs font-bold rounded-xl border text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-colors ${
                  isMissingRepsMin
                    ? 'bg-orange-50/60 dark:bg-orange-950/20 border-orange-300 dark:border-orange-800/80 placeholder-orange-300 dark:placeholder-orange-700/60'
                    : 'bg-slate-50 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700'
                }`}
              />
            </div>

            <div className="min-w-0">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1 truncate flex items-center justify-between">
                <span>Reps Max</span>
                {isMissingRepsMax && (
                  <span className="text-[9px] text-orange-500 dark:text-orange-400 font-semibold lowercase">mancante</span>
                )}
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="es. 12"
                value={
                  exercise.reps_max !== null && exercise.reps_max !== undefined
                    ? exercise.reps_max
                    : ''
                }
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  onUpdate({ reps_max: val ? parseInt(val, 10) : null });
                }}
                className={`w-full min-w-0 min-h-[38px] px-2.5 py-1.5 text-xs font-bold rounded-xl border text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-colors ${
                  isMissingRepsMax
                    ? 'bg-orange-50/60 dark:bg-orange-950/20 border-orange-300 dark:border-orange-800/80 placeholder-orange-300 dark:placeholder-orange-700/60'
                    : 'bg-slate-50 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700'
                }`}
              />
            </div>

            <div className="min-w-0">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1 truncate flex items-center justify-between">
                <span>Recupero (s)</span>
                {isMissingRest && (
                  <span className="text-[9px] text-orange-500 dark:text-orange-400 font-semibold lowercase">mancante</span>
                )}
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="es. 90"
                value={
                  exercise.rest_seconds !== null && exercise.rest_seconds !== undefined
                    ? exercise.rest_seconds
                    : ''
                }
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  onUpdate({ rest_seconds: val ? parseInt(val, 10) : null });
                }}
                className={`w-full min-w-0 min-h-[38px] px-2.5 py-1.5 text-xs font-bold rounded-xl border text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-colors ${
                  isMissingRest
                    ? 'bg-orange-50/60 dark:bg-orange-950/20 border-orange-300 dark:border-orange-800/80 placeholder-orange-300 dark:placeholder-orange-700/60'
                    : 'bg-slate-50 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700'
                }`}
              />
            </div>
          </div>

          {/* Technique notes toggle / input */}
          <div className="min-w-0 w-full">
            {!showNotes && !exercise.technique_notes ? (
              <button
                type="button"
                onClick={() => setShowNotes(true)}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Aggiungi note tecniche / esecuzione</span>
              </button>
            ) : (
              <div className="min-w-0 w-full">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1 truncate">
                  Note Tecniche (Superset, tempo, RPE...)
                </label>
                <input
                  type="text"
                  placeholder="Es: RPE 8, tempo 3-1-1, stripping all'ultima serie..."
                  value={exercise.technique_notes || ''}
                  onChange={(e) => onUpdate({ technique_notes: e.target.value || null })}
                  className="w-full min-w-0 min-h-[38px] px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ImportReviewEditor({
  initialPlan,
  onSave,
  onCancel,
  isSaving,
}: ImportReviewEditorProps) {
  const [plan, setPlan] = useState<ImportedPlan>(initialPlan);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [emptyDayName, setEmptyDayName] = useState<string | null>(null);
  const [planNameError, setPlanNameError] = useState<string | null>(null);
  const [highlightedExerciseIndex, setHighlightedExerciseIndex] = useState<number | null>(null);

  const planNameInputRef = useRef<HTMLInputElement | null>(null);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const daysScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const daysScrollCleanupRef = useRef<(() => void) | null>(null);

  const daysScrollCallbackRef = useCallback((node: HTMLDivElement | null) => {
    if (daysScrollCleanupRef.current) {
      daysScrollCleanupRef.current();
      daysScrollCleanupRef.current = null;
    }

    daysScrollContainerRef.current = node;

    if (node) {
      const onWheel = (e: WheelEvent) => {
        if (e.deltaY !== 0 && node.scrollWidth > node.clientWidth) {
          e.preventDefault();
          node.scrollLeft += e.deltaY;
        }
      };

      node.addEventListener('wheel', onWheel, { passive: false });
      daysScrollCleanupRef.current = () => {
        node.removeEventListener('wheel', onWheel);
      };
    }
  }, []);

  // Auto-scroll to selected day when selectedDayIndex changes
  useEffect(() => {
    if (daysScrollContainerRef.current) {
      const selectedEl = daysScrollContainerRef.current.querySelector(
        `[data-day-index="${selectedDayIndex}"]`
      );
      if (selectedEl) {
        selectedEl.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [selectedDayIndex]);

  // Compute all issues across the entire plan
  const issues = useMemo<ExerciseIssue[]>(() => {
    const list: ExerciseIssue[] = [];
    plan.days.forEach((day, dIdx) => {
      day.exercises?.forEach((ex, eIdx) => {
        const missing: string[] = [];
        if (!ex.name?.trim()) missing.push('Nome esercizio');
        if (ex.sets === null || ex.sets === undefined) missing.push('Serie');
        if (ex.reps_min === null || ex.reps_min === undefined) missing.push('Reps min');
        if (ex.reps_max === null || ex.reps_max === undefined) missing.push('Reps max');
        if (ex.rest_seconds === null || ex.rest_seconds === undefined) missing.push('Recupero');

        if (missing.length > 0 || ex.uncertain) {
          list.push({
            dayIndex: dIdx,
            dayName: day.name || `Giorno ${dIdx + 1}`,
            exerciseIndex: eIdx,
            exerciseName: ex.name?.trim() || `Esercizio ${eIdx + 1}`,
            isUncertain: Boolean(ex.uncertain),
            missingFields: missing,
          });
        }
      });
    });
    return list;
  }, [plan.days]);

  // Map of issues count per day index
  const issuesByDay = useMemo(() => {
    const map = new Map<number, number>();
    issues.forEach((issue) => {
      map.set(issue.dayIndex, (map.get(issue.dayIndex) || 0) + 1);
    });
    return map;
  }, [issues]);

  // DND sensors for day reordering
  const daySensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // DND sensors for exercise reordering
  const exerciseSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Reorder days handler
  const handleDragEndDays = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = parseInt((active.id as string).replace('day-', ''), 10);
      const newIndex = parseInt((over.id as string).replace('day-', ''), 10);
      const reordered = arrayMove(plan.days, oldIndex, newIndex);
      setPlan({ ...plan, days: reordered });
      setSelectedDayIndex(newIndex);
    }
  };

  // Reorder exercises handler
  const handleDragEndExercises = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && currentDay) {
      const oldIndex = parseInt((active.id as string).replace('ex-', ''), 10);
      const newIndex = parseInt((over.id as string).replace('ex-', ''), 10);
      const reordered = arrayMove(currentDay.exercises, oldIndex, newIndex);
      const updatedDays = plan.days.map((d, i) =>
        i === selectedDayIndex ? { ...d, exercises: reordered } : d
      );
      setPlan({ ...plan, days: updatedDays });
    }
  };

  // Add new day
  const handleAddDay = () => {
    const newDayName = `Giorno ${plan.days.length + 1}`;
    const newDay: ImportedDay = {
      name: newDayName,
      exercises: [
        {
          name: 'Nuovo Esercizio',
          sets: 3,
          reps_min: 8,
          reps_max: 12,
          rest_seconds: 90,
          technique_notes: null,
          uncertain: false,
        },
      ],
    };
    setPlan({ ...plan, days: [...plan.days, newDay] });
    setSelectedDayIndex(plan.days.length);
  };

  // Delete day
  const handleDeleteDay = (index: number) => {
    if (plan.days.length <= 1) return;
    const updated = plan.days.filter((_, i) => i !== index);
    setPlan({ ...plan, days: updated });
    setSelectedDayIndex(Math.max(0, index - 1));
  };

  // Update exercise
  const handleUpdateExercise = (exerciseIndex: number, updates: Partial<ImportedExercise>) => {
    if (!currentDay) return;
    const updatedExercises = currentDay.exercises.map((ex, i) =>
      i === exerciseIndex ? { ...ex, ...updates } : ex
    );
    const updatedDays = plan.days.map((d, i) =>
      i === selectedDayIndex ? { ...d, exercises: updatedExercises } : d
    );
    setPlan({ ...plan, days: updatedDays });
  };

  // Add new exercise to current day
  const handleAddExercise = () => {
    if (!currentDay) return;
    const newEx: ImportedExercise = {
      name: 'Nuovo Esercizio',
      sets: 3,
      reps_min: 8,
      reps_max: 12,
      rest_seconds: 90,
      technique_notes: null,
      uncertain: false,
    };
    const updatedDays = plan.days.map((d, i) =>
      i === selectedDayIndex ? { ...d, exercises: [...d.exercises, newEx] } : d
    );
    setPlan({ ...plan, days: updatedDays });
  };

  // Delete exercise
  const handleDeleteExercise = (exerciseIndex: number) => {
    if (!currentDay) return;
    const updatedExercises = currentDay.exercises.filter((_, i) => i !== exerciseIndex);
    const updatedDays = plan.days.map((d, i) =>
      i === selectedDayIndex ? { ...d, exercises: updatedExercises } : d
    );
    setPlan({ ...plan, days: updatedDays });
  };

  // Jump to specific exercise from the validation dialog
  const handleJumpToExercise = (dayIndex: number, exerciseIndex: number) => {
    setIsValidationModalOpen(false);
    setSelectedDayIndex(dayIndex);
    setHighlightedExerciseIndex(exerciseIndex);

    setTimeout(() => {
      const el = document.querySelector(`[data-exercise-id="ex-${exerciseIndex}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 120);

    setTimeout(() => {
      setHighlightedExerciseIndex((prev) => (prev === exerciseIndex ? null : prev));
    }, 2600);
  };

  // Validation before saving
  const handleAttemptSave = () => {
    // 1. Check Plan Name
    if (!plan.plan_name?.trim()) {
      setPlanNameError('Inserisci un nome per la scheda prima di salvarla.');
      if (contentScrollRef.current) {
        contentScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      setTimeout(() => {
        planNameInputRef.current?.focus();
      }, 150);
      return;
    }
    setPlanNameError(null);

    // 2. Check Empty Days
    const emptyDayIdx = plan.days.findIndex((d) => !d.exercises || d.exercises.length === 0);
    if (emptyDayIdx !== -1) {
      const dayName = plan.days[emptyDayIdx].name || `Giorno ${emptyDayIdx + 1}`;
      setSelectedDayIndex(emptyDayIdx);
      setEmptyDayName(dayName);
      return;
    }

    // 3. Check Incomplete / Uncertain Issues
    if (issues.length > 0) {
      setIsValidationModalOpen(true);
      return;
    }

    // 4. Save directly if clean
    onSave(plan);
  };

  const currentDay = plan.days[selectedDayIndex] || null;

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full w-full max-w-full overflow-hidden">
      {/* Scrollable Content */}
      <div
        ref={contentScrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 flex flex-col gap-5"
      >
        {/* 1. Header with Plan Name Input */}
        <div className="flex flex-col gap-3 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700/60">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Scheda Estratta da AI
              </span>
            </div>

            {issues.length > 0 ? (
              <button
                type="button"
                onClick={() => setIsValidationModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shrink-0 hover:bg-amber-500/25 transition-colors cursor-pointer"
                title="Clicca per aprire il riepilogo delle verifiche"
              >
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                <span>
                  {issues.length}{' '}
                  {issues.length === 1 ? 'campo da verificare o incompleto' : 'campi da verificare o incompleti'}
                </span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                <Check className="w-3 h-3 text-emerald-500" />
                <span>Tutti i campi completati</span>
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                Nome del Piano *
              </label>
              {planNameError && (
                <span className="text-xs text-red-500 dark:text-red-400 font-semibold">
                  {planNameError}
                </span>
              )}
            </div>
            <input
              ref={planNameInputRef}
              type="text"
              value={plan.plan_name}
              onChange={(e) => {
                setPlan({ ...plan, plan_name: e.target.value });
                if (e.target.value.trim()) setPlanNameError(null);
              }}
              placeholder="Nome del piano (es: Ipertrofia 4 Giorni)..."
              className={`w-full min-w-0 font-black text-base sm:text-xl text-zinc-900 dark:text-zinc-100 px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border focus:outline-hidden focus:ring-2 transition-colors ${
                planNameError
                  ? 'border-red-500 focus:ring-red-500 bg-red-50/20 dark:bg-red-950/20'
                  : 'border-slate-200 dark:border-zinc-700 focus:ring-emerald-500'
              }`}
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1">
              Note o Obiettivi (opzionale)
            </label>
            <textarea
              value={plan.notes || ''}
              onChange={(e) => setPlan({ ...plan, notes: e.target.value })}
              placeholder="Note generali, obiettivi o indicazioni sulla scheda..."
              rows={2}
              className="w-full min-w-0 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>
        </div>

        {/* 2. Days Tabs Manager with DND */}
        <div className="flex flex-col gap-2.5 w-full">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Giorni ({plan.days.length})
            </span>

            <button
              type="button"
              onClick={handleAddDay}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-1 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Aggiungi Giorno</span>
            </button>
          </div>

          <div
            ref={daysScrollCallbackRef}
            className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar touch-pan-x w-full scroll-smooth"
          >
            <DndContext
              sensors={daySensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEndDays}
            >
              <SortableContext
                items={plan.days.map((_, i) => `day-${i}`)}
                strategy={horizontalListSortingStrategy}
              >
                {plan.days.map((day, idx) => (
                  <SortableDayPill
                    key={`day-${idx}`}
                    day={day}
                    index={idx}
                    isSelected={idx === selectedDayIndex}
                    issuesCount={issuesByDay.get(idx) || 0}
                    onSelect={() => setSelectedDayIndex(idx)}
                    onDelete={() => handleDeleteDay(idx)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </div>

        {/* 3. Exercises in Selected Day */}
        {currentDay && (
          <div className="flex flex-col gap-3.5 w-full">
            {/* Day Name Editor + Add Exercise */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-xs font-bold text-zinc-400 shrink-0">Nome Giorno:</span>
                <input
                  type="text"
                  value={currentDay.name}
                  onChange={(e) => {
                    const updatedDays = plan.days.map((d, i) =>
                      i === selectedDayIndex ? { ...d, name: e.target.value } : d
                    );
                    setPlan({ ...plan, days: updatedDays });
                  }}
                  className="min-w-0 flex-1 font-bold text-sm text-zinc-900 dark:text-zinc-100 bg-transparent border-b border-zinc-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-500 focus:border-emerald-500 focus:outline-hidden px-1.5 py-0.5 rounded-sm"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleAddExercise}
                className="w-full sm:w-auto shrink-0 justify-center"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                <span>Aggiungi Esercizio</span>
              </Button>
            </div>

            {/* Sortable Exercises List */}
            <DndContext
              sensors={exerciseSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEndExercises}
            >
              <SortableContext
                items={currentDay.exercises.map((_, i) => `ex-${i}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-3 w-full">
                  {currentDay.exercises.map((exercise, exIdx) => (
                    <SortableExerciseRow
                      key={`ex-${exIdx}`}
                      exercise={exercise}
                      index={exIdx}
                      isHighlighted={highlightedExerciseIndex === exIdx}
                      onUpdate={(updated) => handleUpdateExercise(exIdx, updated)}
                      onDelete={() => handleDeleteExercise(exIdx)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </div>

      {/* 4. Docked Bottom Actions: Save Plan & Cancel */}
      <div className="px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:px-5 sm:py-4 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-3 shrink-0">
        <div className="min-w-0 flex-1">
          {issues.length > 0 ? (
            <button
              type="button"
              onClick={() => setIsValidationModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-bold hover:bg-amber-500/25 transition-colors cursor-pointer max-w-full"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="truncate">
                {issues.length} {issues.length === 1 ? 'campo da verificare' : 'campi da verificare'}
              </span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="hidden sm:inline">Scheda pronta per il salvataggio</span>
              <span className="sm:hidden">Tutto pronto</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => setIsCancelConfirmOpen(true)}
          >
            Annulla
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleAttemptSave}
            isLoading={isSaving}
            className="shadow-md shadow-emerald-500/20"
          >
            <Check className="w-4 h-4 mr-1.5 shrink-0" />
            <span>Salva e Crea Piano</span>
          </Button>
        </div>
      </div>

      {/* Validation Review Dialog on Save */}
      <Modal
        isOpen={isValidationModalOpen}
        onClose={() => setIsValidationModalOpen(false)}
        title="Campi Incompleti o da Verificare"
        description="Rivedi gli elementi evidenziati prima di confermare il salvataggio definitivo della scheda."
        maxWidth="md"
        zIndex="z-[70]"
        footer={
          <div className="flex flex-col sm:flex-row gap-2.5 w-full">
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="flex-1 order-2 sm:order-1"
              onClick={() => {
                if (issues.length > 0) {
                  handleJumpToExercise(issues[0].dayIndex, issues[0].exerciseIndex);
                } else {
                  setIsValidationModalOpen(false);
                }
              }}
            >
              Rivedi Scheda
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              className="flex-1 order-1 sm:order-2"
              onClick={() => {
                setIsValidationModalOpen(false);
                onSave(plan);
              }}
              isLoading={isSaving}
            >
              Salva Comunque
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3.5 py-1">
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-amber-900 dark:text-amber-200">
                {issues.length} {issues.length === 1 ? 'esercizio richiede attenzione' : 'esercizi richiedono attenzione'}
              </p>
              <p className="text-amber-800/80 dark:text-amber-300/80 mt-0.5 leading-relaxed">
                Tocca un esercizio per andare subito a modificarlo, oppure premi <strong>&quot;Salva Comunque&quot;</strong>: in tal caso per i parametri mancanti verranno applicati i valori predefiniti di base (3 serie, 8-12 reps, 90s).
              </p>
            </div>
          </div>

          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mt-0.5">
            Elementi da revisionare ({issues.length})
          </div>

          <div className="flex flex-col gap-2 max-h-60 sm:max-h-72 overflow-y-auto pr-1">
            {issues.map((issue, idx) => (
              <button
                key={`${issue.dayIndex}-${issue.exerciseIndex}-${idx}`}
                type="button"
                onClick={() => handleJumpToExercise(issue.dayIndex, issue.exerciseIndex)}
                className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 hover:bg-emerald-500/10 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-700/80 hover:border-emerald-500/40 transition-all flex items-center justify-between gap-2.5 group cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                      {issue.dayName}:
                    </span>
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      {issue.exerciseName}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap mt-1">
                    {issue.isUncertain && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-amber-500 text-zinc-950">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        <span>Da verificare AI</span>
                      </span>
                    )}
                    {issue.missingFields.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                        <HelpCircle className="w-2.5 h-2.5" />
                        <span>Mancano: {issue.missingFields.join(', ')}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                  <span>Modifica</span>
                  <Edit2 className="w-3.5 h-3.5" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* Empty Day Warning Dialog */}
      <ConfirmDialog
        isOpen={Boolean(emptyDayName)}
        title="Giorno senza esercizi"
        message={`Il giorno "${emptyDayName}" non contiene esercizi. Aggiungi almeno un esercizio o elimina il giorno prima di procedere con il salvataggio.`}
        confirmLabel="Aggiungi Esercizio"
        cancelLabel="Chiudi"
        isDanger={false}
        onConfirm={() => {
          handleAddExercise();
          setEmptyDayName(null);
        }}
        onClose={() => setEmptyDayName(null)}
      />

      {/* Confirm Discard Dialog */}
      <ConfirmDialog
        isOpen={isCancelConfirmOpen}
        title="Annullare l'importazione?"
        message="I dati estratti non sono ancora stati salvati nel database. Se esci adesso, andranno persi."
        confirmLabel="Esci e Annulla"
        cancelLabel="Continua Revisione"
        isDanger={true}
        onConfirm={() => {
          setIsCancelConfirmOpen(false);
          onCancel();
        }}
        onClose={() => setIsCancelConfirmOpen(false)}
      />
    </div>
  );
}
