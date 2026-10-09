'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Scale, Calendar, FileText, Plus, Minus } from 'lucide-react';

interface WeightLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialWeight?: number | null;
  initialDate?: string;
  initialNotes?: string | null;
  weightUnit: string;
  onSave: (data: { weight: number; date: string; notes?: string }) => Promise<void>;
  isEditing?: boolean;
}

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

function getYesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function WeightLogForm({
  onClose,
  initialWeight,
  initialDate,
  initialNotes,
  weightUnit,
  onSave,
  isEditing,
}: Omit<WeightLogModalProps, 'isOpen'>) {
  const [weightStr, setWeightStr] = useState<string>(() =>
    initialWeight !== undefined && initialWeight !== null && initialWeight > 0
      ? initialWeight.toString()
      : ''
  );
  const [dateStr, setDateStr] = useState<string>(() => initialDate || getTodayStr());
  const [notes, setNotes] = useState<string>(() => initialNotes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdjustWeight = (delta: number) => {
    const current = parseFloat(weightStr.replace(',', '.')) || 70.0;
    const next = Math.max(10, Math.round((current + delta) * 10) / 10);
    setWeightStr(next.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = parseFloat(weightStr.replace(',', '.'));
    if (isNaN(parsed) || parsed <= 0 || parsed > 500) {
      setError('Inserisci un valore di peso valido (es. 74.5)');
      return;
    }

    if (!dateStr) {
      setError('Seleziona una data valida');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        weight: parsed,
        date: dateStr,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      console.error('Error saving weight:', err);
      setError(err instanceof Error ? err.message : 'Errore durante il salvataggio');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-2">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Big Weight Input with Quick Stepper */}
      <div className="flex flex-col items-center justify-center p-5 bg-slate-50 dark:bg-zinc-800/50 rounded-3xl border border-slate-200/80 dark:border-zinc-800">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 mb-2">
          Peso ({weightUnit})
        </span>

        <div className="flex items-center gap-3 w-full justify-center">
          {/* Quick -0.5 button */}
          <button
            type="button"
            onClick={() => handleAdjustWeight(-0.5)}
            className="w-10 h-10 rounded-2xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 font-bold active:scale-90 transition-transform shadow-xs"
            title="Diminuisci 0.5"
          >
            <Minus className="w-4 h-4" />
          </button>

          {/* Input */}
          <div className="relative flex items-baseline justify-center">
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              placeholder="00.0"
              value={weightStr}
              onChange={(e) => setWeightStr(e.target.value)}
              autoFocus
              className="w-36 text-center text-4xl sm:text-5xl font-black text-slate-900 dark:text-zinc-100 bg-transparent border-b-2 border-emerald-500 focus:outline-hidden py-1"
            />
            <span className="text-sm font-bold text-zinc-400 ml-1.5">{weightUnit}</span>
          </div>

          {/* Quick +0.5 button */}
          <button
            type="button"
            onClick={() => handleAdjustWeight(0.5)}
            className="w-10 h-10 rounded-2xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 font-bold active:scale-90 transition-transform shadow-xs"
            title="Aumenta 0.5"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Micro steppers: -0.1 / +0.1 */}
        <div className="flex items-center gap-2 mt-4">
          <button
            type="button"
            onClick={() => handleAdjustWeight(-0.1)}
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-300 active:scale-95 transition-transform"
          >
            -0.1
          </button>
          <button
            type="button"
            onClick={() => handleAdjustWeight(0.1)}
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-300 active:scale-95 transition-transform"
          >
            +0.1
          </button>
        </div>
      </div>

      {/* Date Picker with Quick Presets */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
          <span>Data della pesata</span>
        </label>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="button"
            onClick={() => setDateStr(getTodayStr())}
            className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
              dateStr === getTodayStr()
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                : 'bg-slate-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            Oggi
          </button>
          <button
            type="button"
            onClick={() => setDateStr(getYesterdayStr())}
            className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
              dateStr === getYesterdayStr()
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                : 'bg-slate-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            Ieri
          </button>
        </div>
      </div>

      {/* Notes (Optional) */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-zinc-400" />
          <span>Note (facoltative)</span>
        </label>
        <input
          type="text"
          placeholder="Es. A digiuno, post-cheat meal, ecc."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" size="md" onClick={onClose} disabled={isSubmitting}>
          Annulla
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isSubmitting}
          className="gap-2"
        >
          <Scale className="w-4 h-4" />
          <span>{isEditing ? 'Salva Modifiche' : 'Registra Peso'}</span>
        </Button>
      </div>
    </form>
  );
}

export function WeightLogModal(props: WeightLogModalProps) {
  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={props.isEditing ? 'Modifica Peso Corporeo' : 'Registra Peso Corporeo'}
      description="Tieni traccia delle variazioni di peso per monitorare i progressi a lungo termine."
      maxWidth="sm"
    >
      {props.isOpen && (
        <WeightLogForm
          key={`${props.initialWeight}-${props.initialDate}`}
          {...props}
        />
      )}
    </Modal>
  );
}
