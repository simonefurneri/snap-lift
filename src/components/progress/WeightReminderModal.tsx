'use client';

import React, { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  Bell,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendTestWeightReminderPush,
  calculateNextReminderDelay,
  formatNextReminderDescription,
  scheduleWeightReminderPush,
  cancelWeightReminderPush,
} from '@/lib/utils/pushNotifications';
import { Profile } from '@/types/database.types';

interface WeightReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  onSavePreferences: (settings: {
    enabled: boolean;
    time: string;
    day: number;
  }) => Promise<void>;
  showToast: (msg: string) => void;
}

const DAY_OPTIONS = [
  { value: -1, label: 'Ogni giorno' },
  { value: 1, label: 'Ogni Lunedì' },
  { value: 2, label: 'Ogni Martedì' },
  { value: 3, label: 'Ogni Mercoledì' },
  { value: 4, label: 'Ogni Giovedì' },
  { value: 5, label: 'Ogni Venerdì' },
  { value: 6, label: 'Ogni Sabato' },
  { value: 0, label: 'Ogni Domenica' },
];

function WeightReminderForm({
  onClose,
  profile,
  onSavePreferences,
  showToast,
}: Omit<WeightReminderModalProps, 'isOpen'>) {
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined') return getNotificationPermission();
    return 'default';
  });
  const [enabled, setEnabled] = useState(() => Boolean(profile?.weight_reminder_enabled));
  const [time, setTime] = useState(() => profile?.weight_reminder_time || '08:00');
  const [day, setDay] = useState<number>(() => profile?.weight_reminder_day ?? 1);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingPush, setIsTestingPush] = useState(false);

  const nextReminderPreview = useMemo(() => {
    try {
      const { targetDate } = calculateNextReminderDelay(time, day);
      return formatNextReminderDescription(targetDate);
    } catch {
      return '';
    }
  }, [time, day]);

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
    if (res === 'granted') {
      showToast('Permesso notifiche concesso!');
      setEnabled(true);
    } else {
      showToast('Permesso notifiche negato dal browser.');
    }
    return res;
  };

  const handleTestNotification = async () => {
    if (permission !== 'granted') {
      const res = await handleRequestPermission();
      if (res !== 'granted') return;
    }

    setIsTestingPush(true);
    try {
      const ok = await sendTestWeightReminderPush();
      if (ok) {
        showToast('Notifica di prova inviata! Controlla il tuo dispositivo.');
      } else {
        showToast('Impossibile inviare la notifica di test.');
      }
    } catch {
      showToast("Errore durante l'invio del test");
    } finally {
      setIsTestingPush(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (enabled) {
        let perm = permission;
        if (perm !== 'granted') {
          perm = await handleRequestPermission();
          if (perm !== 'granted') {
            showToast('Permesso notifiche negato: abilita le notifiche del browser');
            setIsSaving(false);
            return;
          }
        }

        // Program the push notification on the server & device
        if (profile?.id) {
          const scheduled = await scheduleWeightReminderPush({
            userId: profile.id,
            time,
            day,
          });
          if (!scheduled) {
            console.warn('[WeightReminder] Push scheduling returned false');
          }
        }
      } else {
        // Cancel scheduled push if disabled
        if (profile?.id) {
          await cancelWeightReminderPush(profile.id);
        }
      }

      await onSavePreferences({
        enabled,
        time,
        day,
      });

      if (enabled) {
        showToast(`Promemoria programmato! Prossimo avviso: ${nextReminderPreview}`);
      } else {
        showToast('Promemoria disattivato');
      }
      onClose();
    } catch {
      showToast('Errore durante il salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-5 pt-2 w-full max-w-full min-w-0">
      {/* Permission Banner */}
      <div
        className={`p-4 rounded-2xl border flex items-center justify-between gap-3 w-full max-w-full min-w-0 ${
          permission === 'granted'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {permission === 'granted' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
          )}
          <div className="min-w-0">
            <span className="block text-xs font-bold truncate">
              {permission === 'granted' ? 'Notifiche Browser Attive' : 'Permesso Notifiche Richiesto'}
            </span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block truncate">
              {permission === 'granted'
                ? 'Il dispositivo riceverà gli avvisi push.'
                : 'Autorizza il browser per ricevere gli avvisi.'}
            </span>
          </div>
        </div>

        {permission !== 'granted' && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleRequestPermission}
            className="shrink-0 text-xs"
          >
            Abilita
          </Button>
        )}
      </div>

      {/* Toggle Enabled */}
      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl border border-slate-200/80 dark:border-zinc-800 w-full max-w-full min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="block text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">
              Attiva Promemoria
            </span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block truncate">
              Invia una notifica all&apos;orario stabilito
            </span>
          </div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => {
              if (e.target.checked && permission !== 'granted') {
                handleRequestPermission();
              }
              setEnabled(e.target.checked);
            }}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-emerald-500"></div>
        </label>
      </div>

      {/* Scheduling Inputs */}
      {enabled && (
        <div className="flex flex-col gap-3.5 w-full max-w-full min-w-0">
          {/* Frequency / Day */}
          <div className="flex flex-col gap-1.5 w-full max-w-full min-w-0">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span>Frequenza</span>
            </label>
            <div className="w-full max-w-full min-w-0">
              <select
                value={day}
                onChange={(e) => setDay(parseInt(e.target.value, 10))}
                className="w-full max-w-full min-w-0 block box-border px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                style={{ maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}
              >
                {DAY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Time of day */}
          <div className="flex flex-col gap-1.5 w-full max-w-full min-w-0">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>Orario Notifica</span>
            </label>
            <div className="w-full max-w-full min-w-0">
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full max-w-full min-w-0 block box-border appearance-none px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                style={{ maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}
              />
            </div>

            {/* Quick time presets */}
            <div className="flex items-center gap-1.5 pt-1 overflow-x-auto scrollbar-none max-w-full">
              {['07:00', '07:30', '08:00', '08:30', '09:00'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTime(preset)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                    time === preset
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Next Reminder Preview Badge */}
          {nextReminderPreview && (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs font-medium text-emerald-800 dark:text-emerald-300">
              <Clock className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
              <span className="truncate">
                Prossimo avviso: <strong>{nextReminderPreview}</strong>
              </span>
            </div>
          )}

          {/* Test push button */}
          <button
            type="button"
            onClick={handleTestNotification}
            disabled={isTestingPush}
            className="mt-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-xl border border-emerald-500/20 transition-colors cursor-pointer w-full"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isTestingPush ? 'Invio test in corso...' : 'Invia Notifica di Test Ora'}</span>
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" size="md" onClick={onClose} disabled={isSaving}>
          Annulla
        </Button>
        <Button type="submit" variant="primary" size="md" isLoading={isSaving}>
          Salva Preferenze
        </Button>
      </div>
    </form>
  );
}

export function WeightReminderModal(props: WeightReminderModalProps) {
  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title="Promemoria Pesata"
      description="Ricevi una notifica push per ricordarti di salire sulla bilancia al mattino a digiuno."
      maxWidth="sm"
    >
      {props.isOpen && (
        <WeightReminderForm
          key={`${props.profile?.weight_reminder_enabled}-${props.profile?.weight_reminder_time}`}
          {...props}
        />
      )}
    </Modal>
  );
}
