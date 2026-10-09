'use client';

import React, { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  workoutService,
  ExerciseProgressData,
  LoggedExerciseItem,
} from '@/lib/services/workoutService';
import { planService } from '@/lib/services/planService';
import { PlanWithDetails } from '@/types/database.types';
import { AppLayout } from '@/components/layout/AppLayout';
import { ExerciseProgressCharts } from '@/components/progress/ExerciseProgressCharts';
import { PlanSelector } from '@/components/progress/PlanSelector';
import { WeightProgressView } from '@/components/progress/WeightProgressView';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  TrendingUp,
  Dumbbell,
  Scale,
  Search,
  Loader2,
  Trash2,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function ProgressContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlanIdParam = searchParams.get('planId');
  const activeTab = searchParams.get('tab') === 'weight' ? 'weight' : 'exercises';

  const handleTabChange = (tab: 'exercises' | 'weight') => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'weight') {
      params.set('tab', 'weight');
    } else {
      params.delete('tab');
    }
    const query = params.toString();
    router.replace(`/progress${query ? `?${query}` : ''}`);
  };

  const { user, profile, loading: authLoading } = useAuth();

  // Plans state
  const [plans, setPlans] = useState<PlanWithDetails[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(initialPlanIdParam || '');
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Exercises & Charts state
  const [loggedExercises, setLoggedExercises] = useState<LoggedExerciseItem[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [progressData, setProgressData] = useState<ExerciseProgressData | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(false);

  // Dialog & toast state
  const [isResetSingleOpen, setIsResetSingleOpen] = useState(false);
  const [isResetPlanOpen, setIsResetPlanOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const exercisesCarouselRef = useRef<HTMLDivElement | null>(null);
  const carouselCleanupRef = useRef<(() => void) | null>(null);

  const carouselCallbackRef = useCallback((node: HTMLDivElement | null) => {
    if (carouselCleanupRef.current) {
      carouselCleanupRef.current();
      carouselCleanupRef.current = null;
    }

    exercisesCarouselRef.current = node;

    if (node) {
      const onWheel = (e: WheelEvent) => {
        if (e.deltaY !== 0 && node.scrollWidth > node.clientWidth) {
          e.preventDefault();
          node.scrollLeft += e.deltaY;
        }
      };

      node.addEventListener('wheel', onWheel, { passive: false });
      carouselCleanupRef.current = () => {
        node.removeEventListener('wheel', onWheel);
      };
    }
  }, []);

  const weightUnit = profile?.weight_unit || 'kg';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Fetch all plans for the user (active and archived)
  useEffect(() => {
    if (authLoading || !user) return;

    const fetchPlans = async () => {
      setLoadingPlans(true);
      try {
        const userPlans = await planService.getPlans(user.id, true);
        setPlans(userPlans);

        // Determine initial selectedPlanId
        if (initialPlanIdParam && userPlans.some((p) => p.id === initialPlanIdParam)) {
          setSelectedPlanId(initialPlanIdParam);
        } else if (userPlans.length > 0) {
          // Default to first active plan, or first plan
          const firstActive = userPlans.find((p) => !p.archived);
          setSelectedPlanId(firstActive ? firstActive.id : userPlans[0].id);
        } else {
          setSelectedPlanId('all');
        }
      } catch (err) {
        console.error('Error fetching plans:', err);
        setSelectedPlanId('all');
      } finally {
        setLoadingPlans(false);
      }
    };

    fetchPlans();
  }, [user, authLoading, initialPlanIdParam]);

  // 2. Fetch exercises when selectedPlanId or user changes
  useEffect(() => {
    if (authLoading || !user || !selectedPlanId) return;

    const fetchExercises = async () => {
      setLoadingList(true);
      try {
        const planArg = selectedPlanId === 'all' ? null : selectedPlanId;
        const list = await workoutService.getLoggedExercises(user.id, planArg);
        setLoggedExercises(list);

        // Keep existing selectedExercise if it is present in the new list, otherwise pick first
        setSelectedExercise((prev) => {
          if (prev && list.some((e) => e.name.toLowerCase() === prev.toLowerCase())) {
            return prev;
          }
          return list.length > 0 ? list[0].name : '';
        });
      } catch (err) {
        console.error('Error fetching exercises for plan', err);
        setLoggedExercises([]);
        setSelectedExercise('');
      } finally {
        setLoadingList(false);
      }
    };

    fetchExercises();
  }, [user, authLoading, selectedPlanId]);

  // 3. Fetch progress data when selectedExercise or selectedPlanId changes
  useEffect(() => {
    if (!user || !selectedExercise || !selectedPlanId) {
      return;
    }

    let ignore = false;

    const fetchProgress = async () => {
      setLoadingCharts(true);
      try {
        const planArg = selectedPlanId === 'all' ? null : selectedPlanId;
        const data = await workoutService.getExerciseProgress(user.id, selectedExercise, planArg);
        if (!ignore) setProgressData(data);
      } catch (err) {
        console.error('Error fetching progress charts', err);
        if (!ignore) setProgressData(null);
      } finally {
        if (!ignore) setLoadingCharts(false);
      }
    };

    fetchProgress();
    return () => {
      ignore = true;
    };
  }, [user, selectedExercise, selectedPlanId]);

  // Auto-scroll carousel to active exercise when selectedExercise changes or list loads
  useEffect(() => {
    if (selectedExercise && exercisesCarouselRef.current) {
      const activePill = exercisesCarouselRef.current.querySelector(
        `[data-exercise-name="${encodeURIComponent(selectedExercise)}"]`
      );
      if (activePill) {
        activePill.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [selectedExercise, loadingList]);

  // Helper info for selected plan
  const currentPlan = plans.find((p) => p.id === selectedPlanId);
  const currentPlanName = selectedPlanId === 'all' ? 'Tutte le schede' : currentPlan?.name || 'Scheda selezionata';

  // 4. Reset progress for single exercise
  const handleResetSingleExercise = async () => {
    if (!user || !selectedExercise || !selectedPlanId) return;
    setIsResetting(true);
    const exerciseToReset = selectedExercise;
    try {
      const planArg = selectedPlanId === 'all' ? null : selectedPlanId;
      await workoutService.resetExerciseProgress(user.id, exerciseToReset, planArg);

      // Refresh exercises list for this plan
      const updatedList = await workoutService.getLoggedExercises(user.id, planArg);
      setLoggedExercises(updatedList);

      if (updatedList.some((e) => e.name.toLowerCase() === exerciseToReset.toLowerCase())) {
        // Exercise is still configured in plan definition, reload its 0-set charts
        setSelectedExercise(exerciseToReset);
        const refreshedData = await workoutService.getExerciseProgress(user.id, exerciseToReset, planArg);
        setProgressData(refreshedData);
      } else if (updatedList.length > 0) {
        setSelectedExercise(updatedList[0].name);
      } else {
        setSelectedExercise('');
        setProgressData(null);
      }

      showToast(
        selectedPlanId === 'all'
          ? `I progressi di "${exerciseToReset}" sono stati azzerati con successo.`
          : `I progressi di "${exerciseToReset}" per "${currentPlanName}" sono stati azzerati.`
      );
      setIsResetSingleOpen(false);
    } catch (err) {
      console.error('Error resetting exercise progress', err);
      showToast("Errore durante l'azzeramento dei progressi.");
    } finally {
      setIsResetting(false);
    }
  };

  // 5. Reset progress for current plan or all exercises
  const handleResetPlanOrAll = async () => {
    if (!user || !selectedPlanId) return;
    setIsResetting(true);
    try {
      if (selectedPlanId === 'all') {
        await workoutService.resetAllProgress(user.id);
        setLoggedExercises([]);
        setSelectedExercise('');
        setProgressData(null);
        showToast('Tutti i progressi e le sessioni sono stati azzerati.');
      } else {
        await workoutService.resetPlanProgress(user.id, selectedPlanId);
        // Refresh exercise list for this plan
        const updatedList = await workoutService.getLoggedExercises(user.id, selectedPlanId);
        setLoggedExercises(updatedList);
        if (updatedList.length > 0) {
          setSelectedExercise(updatedList[0].name);
          const refreshedData = await workoutService.getExerciseProgress(user.id, updatedList[0].name, selectedPlanId);
          setProgressData(refreshedData);
        } else {
          setSelectedExercise('');
          setProgressData(null);
        }
        showToast(`Tutti i progressi della scheda "${currentPlanName}" sono stati azzerati.`);
      }
      setIsResetPlanOpen(false);
    } catch (err) {
      console.error('Error resetting progress', err);
      showToast("Errore durante l'azzeramento.");
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
                {activeTab === 'weight' ? <Scale className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">
                {activeTab === 'weight' ? 'Progressi & Peso Corporeo' : 'Progressi & Sovraccarico'}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              {activeTab === 'weight'
                ? 'Monitora l\'evoluzione del peso corporeo, la media mobile e le variazioni nel tempo.'
                : 'Seleziona una scheda per tracciare il carico massimo e il volume dei relativi esercizi.'}
            </p>
          </div>

          {/* Reset Action (only in exercises tab) */}
          {activeTab === 'exercises' && loggedExercises.some((e) => e.totalSets > 0) && (
            <button
              type="button"
              onClick={() => setIsResetPlanOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/60 border border-red-200 dark:border-red-900/40 transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>
                {selectedPlanId === 'all' ? 'Azzera Tutti i Dati' : `Azzera Dati Scheda`}
              </span>
            </button>
          )}
        </div>

        {/* Tab Switcher: Carichi & Schede vs Peso Corporeo */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-200/60 dark:bg-zinc-800/80 rounded-2xl border border-slate-300/40 dark:border-zinc-700/50 self-start">
          <button
            type="button"
            onClick={() => handleTabChange('exercises')}
            className={`relative px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'exercises'
                ? 'text-slate-900 dark:text-zinc-100'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            {activeTab === 'exercises' && (
              <motion.div
                layoutId="activeProgressMainTab"
                className="absolute inset-0 bg-white dark:bg-zinc-900 rounded-xl shadow-xs"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <Dumbbell className="w-4 h-4 relative z-10" />
            <span className="relative z-10">Carichi & Schede</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('weight')}
            className={`relative px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'weight'
                ? 'text-slate-900 dark:text-zinc-100'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            {activeTab === 'weight' && (
              <motion.div
                layoutId="activeProgressMainTab"
                className="absolute inset-0 bg-white dark:bg-zinc-900 rounded-xl shadow-xs"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <Scale className="w-4 h-4 relative z-10" />
            <span className="relative z-10">Peso Corporeo</span>
          </button>
        </div>

        {/* Main Content Area */}
        <AnimatePresence mode="wait">
          {activeTab === 'weight' ? (
            <motion.div
              key="tab-weight-content"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <WeightProgressView showToast={showToast} />
            </motion.div>
          ) : (
            <motion.div
              key="tab-exercises-content"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col gap-6"
            >
              {/* Plan Selector (Selettore Scheda) */}
        {plans.length > 0 && (
          <PlanSelector
            plans={plans}
            selectedPlanId={selectedPlanId}
            onSelectPlan={(id) => {
              setSelectedPlanId(id);
              setSearchQuery('');
            }}
            isLoading={loadingPlans}
          />
        )}

        {/* Main Content Area */}
        {loadingList ? (
          <div className="flex flex-col gap-4 animate-pulse">
            <div className="h-14 rounded-2xl bg-slate-200 dark:bg-zinc-800" />
            <div className="h-64 rounded-3xl bg-slate-200 dark:bg-zinc-800" />
          </div>
        ) : plans.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title="Nessun piano di allenamento creato"
            description="Crea la tua prima scheda per iniziare a tracciare i progressi e il sovraccarico progressivo per ciascun esercizio."
            actionLabel="Crea Scheda di Allenamento"
            onAction={() => router.push('/plans')}
          />
        ) : loggedExercises.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title={
              selectedPlanId === 'all'
                ? 'Nessun dato di allenamento disponibile'
                : `Nessun esercizio nella scheda "${currentPlanName}"`
            }
            description={
              selectedPlanId === 'all'
                ? 'Per visualizzare i grafici dei progressi, avvia ed esegui un allenamento da una scheda.'
                : 'Questa scheda non ha ancora esercizi configurati. Aggiungi esercizi alla scheda o avvia una sessione per visualizzarne i progressi.'
            }
            actionLabel={selectedPlanId === 'all' ? 'Vai ai Piani di Allenamento' : 'Configura Scheda'}
            onAction={() =>
              router.push(selectedPlanId === 'all' ? '/plans' : `/plans/${selectedPlanId}`)
            }
          />
        ) : (
          <div className="flex flex-col gap-5">
            {/* Exercise Selector & Search */}
            <div className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col gap-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="relative w-full">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder={`Cerca esercizio ${
                        selectedPlanId !== 'all' ? `in "${currentPlanName}"...` : '...'
                      }`}
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
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
                    title={`Azzera lo storico di ${selectedExercise}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    <span>Azzera {selectedExercise}</span>
                  </button>
                )}
              </div>

              {/* Quick Exercise Pills Carousel */}
              <div
                ref={carouselCallbackRef}
                className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar touch-pan-x scroll-smooth -mx-1 px-1"
              >
                {filteredExercises.map((ex) => {
                  const isSelected = ex.name.toLowerCase() === selectedExercise.toLowerCase();
                  return (
                    <button
                      key={ex.name}
                      type="button"
                      data-exercise-name={encodeURIComponent(ex.name)}
                      onClick={() => setSelectedExercise(ex.name)}
                      className={`shrink-0 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 select-none active:scale-[0.98] ${
                        isSelected
                          ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20 scale-[1.02]'
                          : 'bg-slate-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      <span>{ex.name}</span>

                      {/* Pill Badge for sets or days */}
                      {ex.totalSets > 0 ? (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                            isSelected
                              ? 'bg-zinc-950/15 text-zinc-950'
                              : 'bg-slate-200/90 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'
                          }`}
                        >
                          {ex.totalSets} set
                        </span>
                      ) : ex.isConfiguredInPlan ? (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                            isSelected
                              ? 'bg-zinc-950/15 text-zinc-950'
                              : 'bg-slate-200/60 dark:bg-zinc-700/60 text-zinc-400'
                          }`}
                        >
                          Nuovo
                        </span>
                      ) : null}
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
              <ExerciseProgressCharts
                data={progressData}
                weightUnit={weightUnit}
                planName={currentPlanName}
                planId={selectedPlanId}
              />
            ) : null}
          </div>
        )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dialog: Confirm Reset Single Exercise */}
        <ConfirmDialog
          isOpen={isResetSingleOpen}
          title={`Azzera progressi per "${selectedExercise}"?`}
          message={
            selectedPlanId === 'all'
              ? `Tutti i dati storici, le serie e i carichi registrati per "${selectedExercise}" verranno eliminati definitivamente da tutti gli allenamenti.`
              : `I dati storici e le serie registrate per "${selectedExercise}" nelle sessioni della scheda "${currentPlanName}" verranno eliminati. I dati relativi ad altre schede non verranno toccati.`
          }
          confirmLabel="Azzera Esercizio"
          cancelLabel="Annulla"
          isDanger={true}
          isLoading={isResetting}
          onConfirm={handleResetSingleExercise}
          onClose={() => setIsResetSingleOpen(false)}
        />

        {/* Dialog: Confirm Reset Plan / All Exercises */}
        <ConfirmDialog
          isOpen={isResetPlanOpen}
          title={
            selectedPlanId === 'all'
              ? 'Azzera TUTTI i progressi?'
              : `Azzera i progressi di "${currentPlanName}"?`
          }
          message={
            selectedPlanId === 'all'
              ? 'Sei sicuro di voler eliminare tutto lo storico degli allenamenti? Questa operazione eliminerà tutti i registri delle serie e i dati sui carichi per ogni esercizio in modo permanente.'
              : `Sei sicuro di voler azzerare tutti i progressi e le sessioni registrate per la scheda "${currentPlanName}"? La scheda e la configurazione dei suoi esercizi rimarranno intatti.`
          }
          confirmLabel={
            selectedPlanId === 'all'
              ? 'Azzera Tutto Definitivamente'
              : 'Azzera Dati Scheda'
          }
          cancelLabel="Annulla"
          isDanger={true}
          isLoading={isResetting}
          onConfirm={handleResetPlanOrAll}
          onClose={() => setIsResetPlanOpen(false)}
        />
      </div>
    </AppLayout>
  );
}

function ProgressLoadingFallback() {
  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-5xl mx-auto animate-pulse">
        <div className="h-10 w-48 rounded-xl bg-slate-200 dark:bg-zinc-800" />
        <div className="h-14 rounded-2xl bg-slate-200 dark:bg-zinc-800" />
        <div className="h-64 rounded-3xl bg-slate-200 dark:bg-zinc-800" />
      </div>
    </AppLayout>
  );
}

export default function ProgressPage() {
  return (
    <Suspense fallback={<ProgressLoadingFallback />}>
      <ProgressContent />
    </Suspense>
  );
}
