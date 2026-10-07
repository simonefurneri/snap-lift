'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PlanWithDetails } from '@/types/database.types';
import { formatDate, truncateDayName } from '@/lib/utils/cn';
import {
  Calendar,
  Dumbbell,
  MoreVertical,
  Copy,
  Edit2,
  Archive,
  ArchiveRestore,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface PlanCardProps {
  plan: PlanWithDetails;
  onEdit: (plan: PlanWithDetails) => void;
  onDuplicate: (planId: string) => void;
  onToggleArchive: (plan: PlanWithDetails) => void;
  onDelete: (plan: PlanWithDetails) => void;
}

export function PlanCard({
  plan,
  onEdit,
  onDuplicate,
  onToggleArchive,
  onDelete,
}: PlanCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const totalExercises = (plan.days || []).reduce(
    (acc, day) => acc + (day.exercises ? day.exercises.length : 0),
    0
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="group relative bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
    >
      <div>
        {/* Header: Title and Actions menu */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <Link href={`/plans/${plan.id}`} className="flex-1 focus:outline-none">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
              <span>{plan.name}</span>
              <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500 shrink-0" />
            </h3>
          </Link>

          {/* Context menu */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Menu opzioni scheda"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-11 z-50 w-48 py-1.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-xl">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEdit(plan);
                    }}
                    className="w-full min-h-[44px] px-3.5 flex items-center gap-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/60"
                  >
                    <Edit2 className="w-4 h-4 text-zinc-400" />
                    <span>Modifica dettagli</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDuplicate(plan.id);
                    }}
                    className="w-full min-h-[44px] px-3.5 flex items-center gap-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/60"
                  >
                    <Copy className="w-4 h-4 text-zinc-400" />
                    <span>Duplica scheda</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onToggleArchive(plan);
                    }}
                    className="w-full min-h-[44px] px-3.5 flex items-center gap-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/60"
                  >
                    {plan.archived ? (
                      <>
                        <ArchiveRestore className="w-4 h-4 text-emerald-500" />
                        <span>Ripristina</span>
                      </>
                    ) : (
                      <>
                        <Archive className="w-4 h-4 text-amber-500" />
                        <span>Archivia scheda</span>
                      </>
                    )}
                  </button>

                  <div className="my-1 border-t border-zinc-100 dark:border-zinc-700/60" />

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete(plan);
                    }}
                    className="w-full min-h-[44px] px-3.5 flex items-center gap-2.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                    <span>Elimina scheda</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Notes preview */}
        {plan.notes && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-4 leading-relaxed">
            {plan.notes}
          </p>
        )}

        {/* Day Pills Preview */}
        {plan.days && plan.days.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {plan.days.map((day) => (
              <span
                key={day.id}
                title={day.name}
                className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-slate-200/60 dark:border-zinc-700/40 inline-flex items-center gap-1 max-w-[140px] xs:max-w-[170px] sm:max-w-[210px]"
              >
                <span className="truncate">{day.name}</span>
                <span className="shrink-0 text-zinc-400">({day.exercises?.length || 0})</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-emerald-500" />
            <span>{plan.days?.length || 0} Giorni</span>
          </span>
          <span className="flex items-center gap-1">
            <Dumbbell className="w-3.5 h-3.5 text-teal-500" />
            <span>{totalExercises} Esercizi</span>
          </span>
        </div>

        <span>{formatDate(plan.created_at)}</span>
      </div>
    </motion.div>
  );
}
