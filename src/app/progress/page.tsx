'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { workoutService, ExerciseProgressData } from '@/lib/services/workoutService';
import { AppLayout } from '@/components/layout/AppLayout';
import { ExerciseProgressCharts } from '@/components/progress/ExerciseProgressCharts';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  TrendingUp,
  Dumbbell,
  Search,
  Loader2,
  Trash2,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProgressPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [loggedExercises, setLoggedExercises] = useState<
    { name: string; totalSets: number; lastSessionDate: string }[]
  >([]);
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [progressData, setProgressData] = useState<ExerciseProgressData | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(false);

  // Dialog & toast state
  const [isResetSingleOpen, setIsResetSingleOpen] = useState(false);
  const [isResetAllOpen, setIsResetAllOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const weightUnit = profile?.weight_unit || 'kg';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Fetch all logged exercises
  useEffect(() => {
    if (authLoading || !user) return;

    const fetchExercises = async () => {
      setLoadingList(true);
      try {
        const list = await workoutService.getLoggedExercises(user.id);
        setLoggedExercises(list);
        if (list.length > 0) {
          setSelectedExercise(list[0].name);
        } else {
          setSelectedExercise('');
        }
      } catch (err) {
        console.error('Error fetching logged exercises', err);
      } finally {
        setLoadingList(false);
      }
    };

    fetchExercises();
  }, [user, authLoading]);

  // 2. Fetch progress data when selectedExercise changes
  useEffect(() => {
    if (!user || !selectedExercise) {
      setProgressData(null);
      return;
    }

    const fetchProgress = async () => {
      setLoadingCharts(true);
      try {
        const data = await workoutService.getExerciseProgress(user.id, selectedExercise);
        setProgressData(data);
      } catch (err) {
        console.error('Error fetching progress charts', err);
      } finally {
        setLoadingCharts(false);
      }
    };

    fetchProgress();
  }, [user, selectedExercise]);

  // 3. Reset progress for single exercise
  const handleResetSingleExercise = async () => {
    if (!user || !selectedExercise) return;
    setIsResetting(true);
    const exerciseToReset = selectedExercise;
    try {
      await workoutService.resetExerciseProgress(user.id, exerciseToReset);

      // Remove the exercise immediately from the list so it is no longer visible
      const updatedList = loggedExercises.filter(
        (e) => e.name.toLowerCase() !== exerciseToReset.toLowerCase()
      );
      setLoggedExercises(updatedList);

      if (updatedList.length > 0) {
        setSelectedExercise(updatedList[0].name);
      } else {
        setSelectedExercise('');
        setProgressData(null);
      }

      showToast(`I progressi di "${exerciseToReset}" sono stati azzerati con successo.`);
      setIsResetSingleOpen(false);
    } catch (err) {
      console.error('Error resetting exercise progress', err);
      showToast('Errore durante l\'azzeramento dei progressi.');
    } finally {
      setIsResetting(false);
    }
  };

  // 4. Reset progress for all exercises
  const handleResetAllExercises = async () => {
    if (!user) return;
    setIsResetting(true);
    try {
      await workoutService.resetAllProgress(user.id);
      setLoggedExercises([]);
      setSelectedExercise('');
      setProgressData(null);
      showToast('Tutti i progressi e le sessioni sono stati azzerati.');
      setIsResetAllOpen(false);
    } catch (err) {
      console.error('Error resetting all progress', err);
      showToast('Errore durante l\'azzeramento totale.');
    } finally {
      setIsResetting(false);
    }
  };

  const filteredExercises = loggedExercises.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-5xl mx-auto">
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">
                Progressi & Sovraccarico
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              Traccia il carico massimo e il volume totale settimana per settimana per ogni esercizio.
            </p>
          </div>

          {/* Reset All Action */}
          {loggedExercises.length > 0 && (
            <button
              type="button"
              onClick={() => setIsResetAllOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/60 border border-red-200 dark:border-red-900/40 transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Azzera Tutti i Dati</span>
            </button>
          )}
        </div>

        {loadingList ? (
          <div className="flex flex-col gap-4 animate-pulse">
            <div className="h-14 rounded-2xl bg-slate-200 dark:bg-zinc-800" />
            <div className="h-64 rounded-3xl bg-slate-200 dark:bg-zinc-800" />
          </div>
        ) : loggedExercises.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title="Nessun dato di allenamento disponibile"
            description="Per visualizzare i grafici dei progressi e i calcoli del sovraccarico, avvia ed esegui il tuo primo allenamento da una scheda."
            actionLabel="Vai ai Piani di Allenamento"
            onAction={() => router.push('/plans')}
          />
        ) : (
          <div className="flex flex-col gap-5">
            {/* Exercise Selector & Search */}
            <div className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="relative w-full">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cerca esercizio..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Reset single exercise button */}
                {selectedExercise && (
                  <button
                    type="button"
                    onClick={() => setIsResetSingleOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0 cursor-pointer"
                    title={`Azzera lo storico di ${selectedExercise}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    <span>Azzera {selectedExercise}</span>
                  </button>
                )}
              </div>

              {/* Quick Exercise Pills Carousel */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
                {filteredExercises.map((ex) => {
                  const isSelected = ex.name.toLowerCase() === selectedExercise.toLowerCase();
                  return (
                    <button
                      key={ex.name}
                      type="button"
                      onClick={() => setSelectedExercise(ex.name)}
                      className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                          : 'bg-slate-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {ex.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Exercise Charts Container */}
            {loadingCharts ? (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                <span className="text-xs font-semibold text-zinc-400">
                  Elaborazione statistiche per {selectedExercise}...
                </span>
              </div>
            ) : progressData ? (
              <ExerciseProgressCharts data={progressData} weightUnit={weightUnit} />
            ) : null}
          </div>
        )}

        {/* Dialog: Confirm Reset Single Exercise */}
        <ConfirmDialog
          isOpen={isResetSingleOpen}
          title={`Azzera progressi per ${selectedExercise}?`}
          message={`Tutti i dati storici, le serie e i carichi registrati per "${selectedExercise}" verranno eliminati definitivamente e l'esercizio non comparirà più tra i progressi.`}
          confirmLabel="Azzera Esercizio"
          cancelLabel="Annulla"
          isDanger={true}
          isLoading={isResetting}
          onConfirm={handleResetSingleExercise}
          onClose={() => setIsResetSingleOpen(false)}
        />

        {/* Dialog: Confirm Reset All Exercises */}
        <ConfirmDialog
          isOpen={isResetAllOpen}
          title="Azzera TUTTI i progressi?"
          message="Sei sicuro di voler eliminare tutto lo storico degli allenamenti? Questa operazione eliminerà tutti i registri delle serie e i dati sui carichi per ogni esercizio in modo permanente."
          confirmLabel="Azzera Tutto Definitivamente"
          cancelLabel="Annulla"
          isDanger={true}
          isLoading={isResetting}
          onConfirm={handleResetAllExercises}
          onClose={() => setIsResetAllOpen(false)}
        />
      </div>
    </AppLayout>
  );
}
