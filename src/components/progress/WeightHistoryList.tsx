'use client';

import React, { useState } from 'react';
import { BodyWeightLog } from '@/types/database.types';
import { Button } from '@/components/ui/Button';
import {
  Calendar,
  FileSpreadsheet,
  Edit2,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  MessageSquare,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface WeightHistoryListProps {
  logs: BodyWeightLog[]; // Expected in descending order (newest first)
  weightUnit: string;
  onEdit: (log: BodyWeightLog) => void;
  onDelete: (log: BodyWeightLog) => void;
  onExportCsv: () => void;
}

export function WeightHistoryList({
  logs,
  weightUnit,
  onEdit,
  onDelete,
  onExportCsv,
}: WeightHistoryListProps) {
  const [displayCount, setDisplayCount] = useState(10);

  if (logs.length === 0) return null;

  const visibleLogs = logs.slice(0, displayCount);
  const hasMore = logs.length > displayCount;

  // Format date readable in Italian
  const formatDateLabel = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const yesterday = yest.toISOString().split('T')[0];

    if (dateStr === today) return 'Oggi';
    if (dateStr === yesterday) return 'Ieri';

    const d = new Date(dateStr);
    return d.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  };

  return (
    <div className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-xs flex flex-col gap-4">
      {/* List Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
        <div>
          <h3 className="font-bold text-base text-slate-900 dark:text-zinc-100 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-500" />
            <span>Storico Rilevazioni</span>
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {logs.length} {logs.length === 1 ? 'pesata registrata' : 'pesate registrate'}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onExportCsv}
          className="text-xs"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
          <span>Esporta CSV</span>
        </Button>
      </div>

      {/* Rows */}
      <div className="flex flex-col divide-y divide-slate-100 dark:divide-zinc-800/80">
        <AnimatePresence initial={false}>
          {visibleLogs.map((log, index) => {
            // Compare with chronologically preceding log (which is index + 1 in descending list)
            const previousLog = logs[index + 1];
            const diff =
              previousLog !== undefined
                ? Math.round((log.weight - previousLog.weight) * 10) / 10
                : null;

            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="py-3.5 flex items-center justify-between gap-3 group"
              >
                {/* Left: Date & Notes */}
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 capitalize">
                    {formatDateLabel(log.recorded_at)}
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    {new Date(log.recorded_at).toLocaleDateString('it-IT')}
                  </span>
                  {log.notes && (
                    <div className="flex items-center gap-1 mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400 italic truncate max-w-xs">
                      <MessageSquare className="w-3 h-3 text-zinc-400 shrink-0" />
                      <span className="truncate">&ldquo;{log.notes}&rdquo;</span>
                    </div>
                  )}
                </div>

                {/* Right: Weight, delta pill & action buttons */}
                <div className="flex items-center gap-3 shrink-0">
                  {/* Delta vs previous entry */}
                  {diff !== null && (
                    <div
                      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${
                        diff > 0
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                          : diff < 0
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {diff > 0 ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : diff < 0 ? (
                        <ArrowDownRight className="w-3 h-3" />
                      ) : (
                        <Minus className="w-3 h-3" />
                      )}
                      <span>
                        {diff > 0 ? `+${diff}` : diff} {weightUnit}
                      </span>
                    </div>
                  )}

                  {/* Weight Value */}
                  <div className="flex items-baseline gap-1 text-right">
                    <span className="text-base sm:text-lg font-black text-slate-900 dark:text-zinc-100">
                      {log.weight.toFixed(1)}
                    </span>
                    <span className="text-[11px] font-bold text-zinc-400">{weightUnit}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity ml-1">
                    <button
                      type="button"
                      onClick={() => onEdit(log)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Modifica pesata"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(log)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                      title="Elimina pesata"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Show more button */}
      {hasMore && (
        <button
          type="button"
          onClick={() => setDisplayCount((prev) => prev + 15)}
          className="mt-2 w-full py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <ChevronDown className="w-4 h-4" />
          <span>Mostra altre rilevazioni ({logs.length - displayCount} rimanenti)</span>
        </button>
      )}
    </div>
  );
}
