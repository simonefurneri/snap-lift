'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  weightService,
  calculateWeightStats,
  calculateChartPoints,
  filterLogsByRange,
  TimeRangeFilter,
} from '@/lib/services/weightService';
import { dataExportService } from '@/lib/services/dataExportService';
import { BodyWeightLog } from '@/types/database.types';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { WeightProgressCharts } from './WeightProgressCharts';
import { WeightHistoryList } from './WeightHistoryList';
import { WeightLogModal } from './WeightLogModal';
import { WeightReminderModal } from './WeightReminderModal';
import {
  Scale,
  PlusCircle,
  TrendingDown,
  TrendingUp,
  Minus,
  Calendar,
  Bell,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  getNotificationPermission,
  scheduleWeightReminderPush,
} from '@/lib/utils/pushNotifications';

interface WeightProgressViewProps {
  showToast: (msg: string) => void;
}

export function WeightProgressView({ showToast }: WeightProgressViewProps) {
  const { user, profile, updateProfile } = useAuth();
  const weightUnit = profile?.weight_unit || 'kg';

  const [logs, setLogs] = useState<BodyWeightLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<TimeRangeFilter>('1M');

  // Modals state
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<BodyWeightLog | null>(null);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [deletingLog, setDeletingLog] = useState<BodyWeightLog | null>(null);
  const [isResetAllOpen, setIsResetAllOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const refreshLogs = useCallback(async () => {
    if (!user) return;
    try {
      const data = await weightService.getWeightLogs(user.id);
      setLogs(data);
    } catch (err) {
      console.error('Error fetching weight logs:', err);
      showToast('Errore nel caricamento delle pesate');
    }
  }, [user, showToast]);

  useEffect(() => {
    let ignore = false;
    if (!user) return;

    weightService
      .getWeightLogs(user.id)
      .then((data) => {
        if (!ignore) {
          setLogs(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error('Error fetching weight logs:', err);
          showToast('Errore nel caricamento delle pesate');
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [user, showToast]);

  // Keep upcoming weight reminder actively scheduled if enabled in user profile
  useEffect(() => {
    if (
      profile?.weight_reminder_enabled &&
      profile?.weight_reminder_time &&
      profile?.id &&
      typeof window !== 'undefined'
    ) {
      if (getNotificationPermission() === 'granted') {
        scheduleWeightReminderPush({
          userId: profile.id,
          time: profile.weight_reminder_time,
          day: profile.weight_reminder_day ?? 1,
        }).catch((err) => console.warn('[WeightProgressView] Auto-reschedule push error:', err));
      }
    }
  }, [
    profile?.id,
    profile?.weight_reminder_enabled,
    profile?.weight_reminder_time,
    profile?.weight_reminder_day,
  ]);

  // Derived calculations
  const stats = useMemo(() => calculateWeightStats(logs), [logs]);
  const filteredLogs = useMemo(
    () => filterLogsByRange(logs, selectedRange),
    [logs, selectedRange]
  );
  const chartPoints = useMemo(
    () => calculateChartPoints(filteredLogs, 7),
    [filteredLogs]
  );
  const descendingLogs = useMemo(() => [...logs].reverse(), [logs]);

  // Handlers
  const handleSaveLog = async (data: {
    weight: number;
    date: string;
    notes?: string;
  }) => {
    if (!user) return;

    if (editingLog) {
      await weightService.updateWeightLog(
        editingLog.id,
        data.weight,
        data.date,
        data.notes
      );
      showToast('Pesata aggiornata con successo');
    } else {
      await weightService.logWeight(
        user.id,
        data.weight,
        data.date,
        data.notes
      );
      showToast('Pesata registrata con successo');
    }

    setEditingLog(null);
    await refreshLogs();
  };

  const handleDeleteLog = async () => {
    if (!deletingLog) return;
    setIsActionLoading(true);
    try {
      await weightService.deleteWeightLog(deletingLog.id);
      showToast('Pesata eliminata');
      setDeletingLog(null);
      await refreshLogs();
    } catch {
      showToast("Errore durante l'eliminazione");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResetAll = async () => {
    if (!user) return;
    setIsActionLoading(true);
    try {
      await weightService.resetAllWeightLogs(user.id);
      showToast('Tutto lo storico del peso è stato azzerato');
      setIsResetAllOpen(false);
      await refreshLogs();
    } catch {
      showToast("Errore durante l'azzeramento dello storico");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSaveReminderSettings = async (settings: {
    enabled: boolean;
    time: string;
    day: number;
  }) => {
    await updateProfile({
      weight_reminder_enabled: settings.enabled,
      weight_reminder_time: settings.time,
      weight_reminder_day: settings.day,
    });
  };

  const handleExportCsv = async () => {
    if (!user) return;
    try {
      await dataExportService.exportWeightsAsCsv(user.id);
      showToast('File CSV scaricato con successo');
    } catch {
      showToast("Errore durante l'esportazione CSV");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-5 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="h-28 rounded-3xl bg-slate-200 dark:bg-zinc-800" />
          <div className="h-28 rounded-3xl bg-slate-200 dark:bg-zinc-800" />
          <div className="h-28 rounded-3xl bg-slate-200 dark:bg-zinc-800" />
          <div className="h-28 rounded-3xl bg-slate-200 dark:bg-zinc-800" />
        </div>
        <div className="h-72 rounded-3xl bg-slate-200 dark:bg-zinc-800" />
        <div className="h-64 rounded-3xl bg-slate-200 dark:bg-zinc-800" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
            <span>Andamento Peso Corporeo</span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Monitora l&apos;evoluzione della tua composizione corporea e le variazioni a lungo termine.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Reminder button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsReminderModalOpen(true)}
            className="text-xs"
            title="Configura promemoria pesata"
          >
            <Bell
              className={`w-3.5 h-3.5 mr-1.5 ${
                profile?.weight_reminder_enabled
                  ? 'text-emerald-500 fill-emerald-500/20'
                  : 'text-zinc-400'
              }`}
            />
            <span>
              {profile?.weight_reminder_enabled ? 'Promemoria Attivo' : 'Promemoria'}
            </span>
          </Button>

          {/* Reset button (if logs exist) */}
          {logs.length > 0 && (
            <button
              type="button"
              onClick={() => setIsResetAllOpen(true)}
              className="p-2.5 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 border border-slate-200 dark:border-zinc-800 transition-colors cursor-pointer"
              title="Azzera tutto lo storico peso"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Log weight CTA */}
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingLog(null);
              setIsLogModalOpen(true);
            }}
            className="text-xs gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Registra Peso</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      {logs.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="Nessun dato sul peso registrato"
          description="Inizia a tracciare il tuo peso corporeo al mattino a digiuno per visualizzare i grafici di andamento e la media mobile."
          actionLabel="Registra la tua prima pesata"
          onAction={() => {
            setEditingLog(null);
            setIsLogModalOpen(true);
          }}
        />
      ) : (
        <>
          {/* 1. KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Current Weight */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-5 shadow-xs flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Scale className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block truncate">
                  Peso Attuale
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-slate-900 dark:text-zinc-100">
                    {stats.currentWeight !== null ? stats.currentWeight.toFixed(1) : '--'}
                  </span>
                  <span className="text-xs font-bold text-zinc-400">{weightUnit}</span>
                </div>
                {stats.changeSinceLast !== null && (
                  <span
                    className={`text-[10px] font-bold mt-0.5 block ${
                      stats.changeSinceLast > 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : stats.changeSinceLast < 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-zinc-400'
                    }`}
                  >
                    {stats.changeSinceLast > 0 ? `+${stats.changeSinceLast}` : stats.changeSinceLast}{' '}
                    {weightUnit} vs prec.
                  </span>
                )}
              </div>
            </motion.div>

            {/* 7-Day Change */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-5 shadow-xs flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                {stats.change7Days !== null && stats.change7Days > 0 ? (
                  <TrendingUp className="w-6 h-6" />
                ) : stats.change7Days !== null && stats.change7Days < 0 ? (
                  <TrendingDown className="w-6 h-6" />
                ) : (
                  <Minus className="w-6 h-6" />
                )}
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block truncate">
                  Trend 7 Giorni
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-slate-900 dark:text-zinc-100">
                    {stats.change7Days !== null
                      ? `${stats.change7Days > 0 ? '+' : ''}${stats.change7Days.toFixed(1)}`
                      : '--'}
                  </span>
                  <span className="text-xs font-bold text-zinc-400">{weightUnit}</span>
                </div>
                <span className="text-[10px] font-semibold text-zinc-400 mt-0.5 block">
                  {stats.change7DaysPct !== null
                    ? `${stats.change7DaysPct > 0 ? '+' : ''}${stats.change7DaysPct}% negli ultimi 7 gg`
                    : 'Dati 7gg insufficienti'}
                </span>
              </div>
            </motion.div>

            {/* 30-Day Change */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-5 shadow-xs flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block truncate">
                  Trend 30 Giorni
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-slate-900 dark:text-zinc-100">
                    {stats.change30Days !== null
                      ? `${stats.change30Days > 0 ? '+' : ''}${stats.change30Days.toFixed(1)}`
                      : '--'}
                  </span>
                  <span className="text-xs font-bold text-zinc-400">{weightUnit}</span>
                </div>
                <span className="text-[10px] font-semibold text-zinc-400 mt-0.5 block">
                  {stats.change30DaysPct !== null
                    ? `${stats.change30DaysPct > 0 ? '+' : ''}${stats.change30DaysPct}% nell'ultimo mese`
                    : 'Dati 30gg insufficienti'}
                </span>
              </div>
            </motion.div>

            {/* Range & Average */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-5 shadow-xs flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block truncate">
                  Media & Range
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-slate-900 dark:text-zinc-100">
                    {stats.avgWeight !== null ? stats.avgWeight.toFixed(1) : '--'}
                  </span>
                  <span className="text-xs font-bold text-zinc-400">{weightUnit} (media)</span>
                </div>
                <span className="text-[10px] font-semibold text-zinc-400 mt-0.5 block truncate">
                  Min: {stats.minWeight} • Max: {stats.maxWeight} {weightUnit}
                </span>
              </div>
            </motion.div>
          </div>

          {/* 2. Interactive Charts */}
          {chartPoints.length > 0 && (
            <WeightProgressCharts
              points={chartPoints}
              weightUnit={weightUnit}
              selectedRange={selectedRange}
              onSelectRange={setSelectedRange}
            />
          )}

          {/* 3. History List */}
          <WeightHistoryList
            logs={descendingLogs}
            weightUnit={weightUnit}
            onEdit={(log) => {
              setEditingLog(log);
              setIsLogModalOpen(true);
            }}
            onDelete={(log) => setDeletingLog(log)}
            onExportCsv={handleExportCsv}
          />
        </>
      )}

      {/* Log / Edit Weight Modal */}
      <WeightLogModal
        isOpen={isLogModalOpen}
        onClose={() => {
          setIsLogModalOpen(false);
          setEditingLog(null);
        }}
        initialWeight={
          editingLog ? editingLog.weight : stats.currentWeight || undefined
        }
        initialDate={editingLog ? editingLog.recorded_at : undefined}
        initialNotes={editingLog ? editingLog.notes : undefined}
        weightUnit={weightUnit}
        onSave={handleSaveLog}
        isEditing={Boolean(editingLog)}
      />

      {/* Reminder Preferences Modal */}
      <WeightReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        profile={profile}
        onSavePreferences={handleSaveReminderSettings}
        showToast={showToast}
      />

      {/* Confirm Delete Single Log Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingLog)}
        onClose={() => setDeletingLog(null)}
        onConfirm={handleDeleteLog}
        title="Elimina Rilevazione Peso"
        message={
          deletingLog
            ? `Sei sicuro di voler eliminare la pesata di ${deletingLog.weight} ${weightUnit} registrata in data ${new Date(
                deletingLog.recorded_at
              ).toLocaleDateString('it-IT')}?`
            : ''
        }
        confirmLabel="Elimina"
        cancelLabel="Annulla"
        isDanger={true}
        isLoading={isActionLoading}
      />

      {/* Confirm Reset All Logs Dialog */}
      <ConfirmDialog
        isOpen={isResetAllOpen}
        onClose={() => setIsResetAllOpen(false)}
        onConfirm={handleResetAll}
        title="Azzera Tutto lo Storico Peso"
        message="Sei sicuro di voler cancellare tutte le registrazioni del peso corporeo? Questa azione non può essere annullata."
        confirmLabel="Azzera Tutto"
        cancelLabel="Annulla"
        isDanger={true}
        isLoading={isActionLoading}
      />
    </div>
  );
}
