'use client';

import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Exercise } from '@/types/database.types';
import { formatRestTime } from '@/lib/utils/cn';
import { YouTubeIcon } from '@/components/ui/Icons';
import {
  GripVertical,
  Timer,
  FileText,
  MoreVertical,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SortableExerciseItemProps {
  exercise: Exercise;
  index: number;
  onEdit: (exercise: Exercise) => void;
  onDelete: (exercise: Exercise) => void;
  onOpenVideo: (exercise: Exercise) => void;
}

export function SortableExerciseItem({
  exercise,
  index,
  onEdit,
  onDelete,
  onOpenVideo,
}: SortableExerciseItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.id });

  const [showMenu, setShowMenu] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.75 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative bg-white dark:bg-zinc-900/95 border rounded-2xl p-3.5 sm:p-4 transition-all shadow-xs ${
        isDragging
          ? 'border-emerald-500 shadow-xl ring-2 ring-emerald-500/30'
          : 'border-slate-200/80 dark:border-zinc-800/80 hover:border-slate-300 dark:hover:border-zinc-700'
      }`}
    >
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="min-h-[44px] min-w-[36px] flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-grab active:cursor-grabbing touch-none select-none rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
          aria-label="Trascina per riordinare"
        >
          <GripVertical className="w-5 h-5" />
        </button>

        {/* Position Number Pill */}
        <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs flex items-center justify-center shrink-0">
          {index + 1}
        </div>

        {/* Exercise Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 truncate">
              {exercise.name}
            </h4>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Sets & Reps Pill */}
            <span className="inline-flex items-center px-2 py-0.5 rounded-md font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40">
              {exercise.sets} serie × {exercise.reps_min === exercise.reps_max ? exercise.reps_min : `${exercise.reps_min}-${exercise.reps_max}`} reps
            </span>

            {/* Rest Timer Pill */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium bg-slate-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              <Timer className="w-3 h-3 text-zinc-400" />
              <span>{formatRestTime(exercise.rest_seconds)}</span>
            </span>

            {/* Toggle Notes Button if notes exist */}
            {exercise.technique_notes && (
              <button
                type="button"
                onClick={() => setShowNotes(!showNotes)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
              >
                <FileText className="w-3 h-3" />
                <span>Note</span>
                {showNotes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
        </div>

        {/* Video Button (Requirement: Pulsante "Video" se valorizzato) */}
        {exercise.video_url && (
          <button
            type="button"
            onClick={() => onOpenVideo(exercise)}
            className="min-h-[44px] px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950/70 text-red-600 dark:text-red-400 border border-red-200/60 dark:border-red-900/50 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 shrink-0 cursor-pointer"
            title="Guarda esecuzione video su YouTube"
          >
            <YouTubeIcon className="w-4 h-4 text-red-500" />
            <span className="hidden xs:inline sm:inline">Video</span>
          </button>
        )}

        {/* Options Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="min-h-[44px] min-w-[36px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Opzioni esercizio"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-11 z-50 w-40 py-1.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onEdit(exercise);
                  }}
                  className="w-full min-h-[44px] px-3 flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/60"
                >
                  <Edit2 className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Modifica</span>
                </button>

                <div className="my-1 border-t border-zinc-100 dark:border-zinc-700/60" />

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onDelete(exercise);
                  }}
                  className="w-full min-h-[44px] px-3 flex items-center gap-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  <span>Elimina</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Expandable Technique Notes */}
      <AnimatePresence>
        {showNotes && exercise.technique_notes && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-2.5 border-t border-slate-100 dark:border-zinc-800/80 overflow-hidden"
          >
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              <strong className="text-zinc-700 dark:text-zinc-200 block mb-1">
                Note di esecuzione:
              </strong>
              {exercise.technique_notes}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
