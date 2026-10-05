'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { workoutService } from '@/lib/services/workoutService';
import { dataExportService } from '@/lib/services/dataExportService';
import {
  User,
  Settings,
  Scale,
  TrendingUp,
  Percent,
  LogOut,
  CheckCircle2,
  Moon,
  ShieldCheck,
  RotateCcw,
  Download,
  FileJson,
  FileSpreadsheet,
  Trash2,
  Users,
  ChevronRight,
  ShieldAlert,
  Bell,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/cn';
import {
  getNotificationPermission,
  requestNotificationPermission,
  getPushSubscription,
} from '@/lib/utils/pushNotifications';

export default function ProfilePage() {
  const { user, profile, updateProfile, signOut } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [progressionPct, setProgressionPct] = useState('2.5');
  const [loadStep, setLoadStep] = useState('1.25');
  const [loading, setLoading] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pendingUsersCount, setPendingUsersCount] = useState<number | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isTestingPush, setIsTestingPush] = useState(false);
  const [isResetAllOpen, setIsResetAllOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [isDeleteAccountDoubleConfirmOpen, setIsDeleteAccountDoubleConfirmOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setNotificationPermission(getNotificationPermission());
    }
  }, []);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setWeightUnit(profile.weight_unit || 'kg');
      setProgressionPct((profile.progression_pct ?? 2.5).toString());
      setLoadStep((profile.load_step ?? 1.25).toString());

      if (profile.is_admin) {
        // Fetch pending count
        fetch('/api/admin/users')
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data && typeof data.totalPending === 'number') {
              setPendingUsersCount(data.totalPending);
            }
          })
          .catch(() => {});
      }
    }
  }, [profile]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
  };

  const handleRequestPush = async () => {
    const perm = await requestNotificationPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      const sub = await getPushSubscription();
      if (sub) {
        showToast('Notifiche push attivate e collegate con successo!');
      } else {
        showToast('Permesso concesso. Configurazione in corso...');
      }
    } else {
      showToast('Permesso notifiche non concesso.');
    }
  };

  const handleTestPush = async () => {
    setIsTestingPush(true);
    try {
      let sub = await getPushSubscription();
      if (!sub) {
        await requestNotificationPermission();
        sub = await getPushSubscription();
      }
      if (!sub) {
        showToast('Nessuna sottoscrizione attiva. Assicurati che l\'app sia installata su schermata Home.');
        return;
      }
      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (res.ok) {
        showToast('Notifica programmata (5s)! Blocca lo schermo o cambia app.');
      } else {
        showToast('Errore durante l\'invio della notifica di test.');
      }
    } catch {
      showToast('Errore durante il test delle notifiche.');
    } finally {
      setIsTestingPush(false);
    }
  };

  const handleLoadStepChange = (val: string) => {
    const sanitized = val.replace(',', '.');
    if (/^\d*\.?\d*$/.test(sanitized)) {
      setLoadStep(sanitized);
    }
  };

  const handleProgressionPctChange = (val: string) => {
    const sanitized = val.replace(',', '.');
    if (/^\d*\.?\d*$/.test(sanitized)) {
      setProgressionPct(sanitized);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const parsedProgression = parseFloat(progressionPct.replace(',', '.')) || 2.5;
      const parsedLoadStep = parseFloat(loadStep.replace(',', '.')) || 1.25;

      const { error } = await updateProfile({
        display_name: displayName.trim() || null,
        weight_unit: weightUnit,
        progression_pct: parsedProgression,
        load_step: parsedLoadStep,
      });

      if (error) {
        showToast(`Errore: ${error}`);
      } else {
        showToast('Profilo aggiornato con successo');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-2xl mx-auto">
        {/* Toast Alert */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="fixed top-[calc(1rem+env(safe-area-inset-top,0px))] right-4 sm:right-6 left-4 sm:left-auto max-w-sm ml-auto z-50 flex items-center gap-2 px-4 py-3 bg-emerald-600/95 text-white rounded-2xl shadow-xl text-xs font-semibold backdrop-blur-md"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">
            Profilo & Impostazioni
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Personalizza le tue preferenze di calcolo e unità di misura per i sovraccarichi.
          </p>
        </div>

        {/* User Card */}
        <div className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-4 sm:p-6 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-black text-lg sm:text-xl flex items-center justify-center border border-emerald-500/20 shrink-0 aspect-square">
              {((profile?.display_name || user?.email || user?.user_metadata?.full_name || 'U')[0] || 'U').toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-sm sm:text-lg text-zinc-900 dark:text-zinc-100 truncate">
                {profile?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || ''}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                {user?.email || ''}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            isLoading={isSigningOut}
            className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 shrink-0"
          >
            <LogOut className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Disconnetti</span>
          </Button>
        </div>

        {/* Admin Management Card (Visible only to Admin) */}
        {profile?.is_admin && (
          <Link
            href="/admin/users"
            className="group bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/30 dark:border-emerald-500/20 hover:border-emerald-500/60 rounded-3xl p-4 sm:p-5 md:p-6 shadow-xs flex items-center justify-between gap-3 sm:gap-4 transition-all hover:scale-[1.01]"
          >
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500 text-zinc-950 flex items-center justify-center font-black shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform shrink-0 aspect-square">
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <h3 className="font-extrabold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 tracking-tight">
                    Gestione Utenti
                  </h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-zinc-950 shrink-0 leading-none">
                    ADMIN
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
                  Approva le registrazioni, revoca accessi ed elimina utenti.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0 pl-1">
              {typeof pendingUsersCount === 'number' && (
                <span
                  className={cn(
                    'inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-black shadow-xs shrink-0 whitespace-nowrap leading-none',
                    pendingUsersCount > 0
                      ? 'bg-amber-500 text-white animate-pulse'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
                  )}
                >
                  {pendingUsersCount > 0 ? `${pendingUsersCount} in attesa` : 'Nessuno in attesa'}
                </span>
              )}
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
          </Link>
        )}

        {/* Profile Settings Form */}
        <div className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-xs">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-zinc-800">
            <Settings className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              Parametri di Progressione
            </h3>
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-5">
            <Input
              label="Nome Visualizzato"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Il tuo nome"
              leftIcon={<User className="w-4 h-4" />}
            />

            {/* Weight Unit selection */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-2">
                Unità di Misura Peso
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setWeightUnit('kg')}
                  className={`min-h-[44px] rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                    weightUnit === 'kg'
                      ? 'bg-emerald-500 text-zinc-950 border-emerald-500 shadow-xs'
                      : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Scale className="w-4 h-4" />
                  <span>Chilogrammi (kg)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setWeightUnit('lbs')}
                  className={`min-h-[44px] rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                    weightUnit === 'lbs'
                      ? 'bg-emerald-500 text-zinc-950 border-emerald-500 shadow-xs'
                      : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Scale className="w-4 h-4" />
                  <span>Libbre (lbs)</span>
                </button>
              </div>
            </div>

            {/* Step Increment and Progression Percentage */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label={`Passo di Arrotondamento / Minimo Carico (${weightUnit})`}
                  type="text"
                  inputMode="decimal"
                  placeholder="1.25"
                  value={loadStep}
                  onChange={(e) => handleLoadStepChange(e.target.value)}
                  helperText="Taglio micro-carichi per bilanciere/manubri"
                  leftIcon={<TrendingUp className="w-4 h-4" />}
                />
                <div className="flex items-center gap-1.5 mt-2">
                  {[0.5, 1.0, 1.25, 2.5].map((stepVal) => (
                    <button
                      key={stepVal}
                      type="button"
                      onClick={() => setLoadStep(stepVal.toString())}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        parseFloat(loadStep.replace(',', '.')) === stepVal
                          ? 'bg-emerald-500 text-zinc-950 shadow-xs'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {stepVal} {weightUnit}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Input
                  label="Percentuale di Progressione (2% - 5%)"
                  type="text"
                  inputMode="decimal"
                  placeholder="2.5"
                  value={progressionPct}
                  onChange={(e) => handleProgressionPctChange(e.target.value)}
                  helperText="Incremento applicato quando completi tutte le reps al max"
                  leftIcon={<Percent className="w-4 h-4" />}
                />
                <div className="flex items-center gap-1.5 mt-2">
                  {[2.0, 2.5, 3.0, 5.0].map((pctVal) => (
                    <button
                      key={pctVal}
                      type="button"
                      onClick={() => setProgressionPct(pctVal.toString())}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        parseFloat(progressionPct.replace(',', '.')) === pctVal
                          ? 'bg-emerald-500 text-zinc-950 shadow-xs'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      +{pctVal}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={loading}
              >
                Salva Impostazioni
              </Button>
            </div>
          </form>
        </div>

        {/* Rest Timer Push Notifications Section */}
        <div className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-xs flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    Notifiche Push Timer
                  </h3>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-extrabold',
                      notificationPermission === 'granted'
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                        : notificationPermission === 'denied'
                        ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                        : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                    )}
                  >
                    {notificationPermission === 'granted'
                      ? 'Attive'
                      : notificationPermission === 'denied'
                      ? 'Bloccate nel browser'
                      : 'Da autorizzare'}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Ricevi avvisi a schermo bloccato o mentre usi altre app quando scade il recupero.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              {notificationPermission !== 'granted' ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleRequestPush}
                >
                  <Bell className="w-3.5 h-3.5 mr-1" />
                  <span>Autorizza Notifiche</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestPush}
                  isLoading={isTestingPush}
                >
                  <Bell className="w-3.5 h-3.5 mr-1" />
                  <span>Invia Notifica di Test</span>
                </Button>
              )}
            </div>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Su iOS/iPhone le notifiche a schermo bloccato sono supportate installando SnapLift come PWA (pulsante Condividi &rarr; &quot;Aggiungi alla schermata Home&quot;).
          </p>
        </div>

        {/* Appearance & Theme Section */}
        <div className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  Tema Interfaccia
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Scegli tra chiaro, scuro o sincronizza con il sistema operativo
                </p>
              </div>
            </div>

            <ThemeToggle />
          </div>
        </div>

        {/* Security & Database Status */}
        <div className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-xs">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Sicurezza & Protezione Dati (RLS)
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Row Level Security attivo su tutte le tabelle Postgres.
              </p>
            </div>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Ogni piano di allenamento, esercizio e serie registrata è isolato e crittografato mediante il tuo identificatore utente univoco.
          </p>
        </div>

        {/* Data Export & Backup Section */}
        <div className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-xs flex flex-col gap-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                Esporta i tuoi Dati
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Scarica una copia completa dei tuoi piani, sessioni e serie in formato standard.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={async () => {
                if (!user) return;
                try {
                  await dataExportService.exportAllDataAsJson(user.id);
                  showToast('File JSON scaricato con successo');
                } catch (e) {
                  showToast('Errore durante l\'esportazione JSON');
                }
              }}
              className="w-full sm:w-auto justify-center"
            >
              <FileJson className="w-4 h-4 mr-2 text-emerald-500" />
              <span>Esporta Tutto (JSON)</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={async () => {
                if (!user) return;
                try {
                  await dataExportService.exportWorkoutsAsCsv(user.id);
                  showToast('File CSV scaricato con successo');
                } catch (e) {
                  showToast('Errore durante l\'esportazione CSV');
                }
              }}
              className="w-full sm:w-auto justify-center"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-500" />
              <span>Esporta Storico Serie (CSV)</span>
            </Button>
          </div>
        </div>

        {/* Data Management & Workout Reset Section */}
        <div className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <RotateCcw className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  Azzeramento Storico Allenamenti
                </h3>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Elimina tutti i registri delle serie e le sessioni mantenendo intatte le tue schede.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsResetAllOpen(true)}
              className="shrink-0 text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            >
              <RotateCcw className="w-4 h-4 mr-1.5" />
              <span>Azzera Progressi</span>
            </Button>
          </div>
        </div>

        {/* Account Deletion (Danger Zone) */}
        <div className="bg-white dark:bg-zinc-900/90 border border-red-200/80 dark:border-red-950/60 rounded-3xl p-5 sm:p-7 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Trash2 className="w-4 h-4 text-red-500" />
                <h3 className="font-bold text-sm text-red-600 dark:text-red-400">
                  Zona Pericolo — Elimina Account Definitivamente
                </h3>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Cancella per sempre il tuo account, tutte le schede, le sessioni e i dati correlati.
              </p>
            </div>

            <Button
              type="button"
              variant="danger"
              size="md"
              onClick={() => setIsDeleteAccountOpen(true)}
              className="shrink-0"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              <span>Elimina Account</span>
            </Button>
          </div>
        </div>

        {/* Legal & Privacy Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 py-4 text-xs text-zinc-400 border-t border-slate-200/60 dark:border-zinc-800">
          <Link href="/privacy" className="hover:text-emerald-500 transition-colors underline underline-offset-4">
            Informativa sulla Privacy (GDPR)
          </Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-emerald-500 transition-colors underline underline-offset-4">
            Termini di Servizio
          </Link>
        </div>

        {/* Confirm Reset All Dialog */}
        <ConfirmDialog
          isOpen={isResetAllOpen}
          title="Azzera TUTTI i progressi?"
          message="Sei sicuro di voler eliminare definitivamente tutto lo storico dei tuoi allenamenti? Le schede rimarranno salvate. Questa azione non può essere annullata."
          confirmLabel="Azzera Tutto"
          cancelLabel="Annulla"
          isDanger={true}
          isLoading={isResetting}
          onConfirm={async () => {
            if (!user) return;
            setIsResetting(true);
            try {
              await workoutService.resetAllProgress(user.id);
              showToast('Tutti i progressi e le sessioni sono stati azzerati con successo');
              setIsResetAllOpen(false);
            } catch (err) {
              console.error('Error resetting all progress:', err);
              showToast('Errore durante l\'azzeramento');
            } finally {
              setIsResetting(false);
            }
          }}
          onClose={() => setIsResetAllOpen(false)}
        />

        {/* Confirm Delete Account Dialog (Step 1) */}
        <ConfirmDialog
          isOpen={isDeleteAccountOpen}
          title="Eliminare definitivamente l'account?"
          message="Attenzione: tutti i tuoi dati (schede, allenamenti, storico e profilo) verranno rimossi irreversibilmente dai server. Vuoi procedere?"
          confirmLabel="Continua all'eliminazione"
          cancelLabel="Annulla"
          isDanger={true}
          onConfirm={() => {
            setIsDeleteAccountOpen(false);
            setIsDeleteAccountDoubleConfirmOpen(true);
          }}
          onClose={() => setIsDeleteAccountOpen(false)}
        />

        {/* Confirm Delete Account Dialog (Step 2 - Final Double Confirmation) */}
        <ConfirmDialog
          isOpen={isDeleteAccountDoubleConfirmOpen}
          title="CONFERMA DEFINITIVA ELIMINAZIONE"
          message="Questa operazione è ISTANTANEA e IRREVERSIBILE. Confermi di voler cancellare per sempre il tuo account e tutti i dati?"
          confirmLabel="Cancella Definitivamente Tutto"
          cancelLabel="Ripensaci"
          isDanger={true}
          isLoading={isDeletingAccount}
          onConfirm={async () => {
            setIsDeletingAccount(true);
            try {
              const res = await fetch('/api/user/delete-account', {
                method: 'POST',
              });
              if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Errore durante l\'eliminazione');
              }
              await signOut();
              if (typeof window !== 'undefined') {
                localStorage.clear();
                window.location.href = '/register';
              }
            } catch (err: any) {
              console.error('Error deleting account:', err);
              showToast(err.message || 'Errore durante l\'eliminazione dell\'account');
              setIsDeletingAccount(false);
            }
          }}
          onClose={() => setIsDeleteAccountDoubleConfirmOpen(false)}
        />
      </div>
    </AppLayout>
  );
}
