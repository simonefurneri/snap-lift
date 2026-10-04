'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { planService } from '@/lib/services/planService';
import { workoutService } from '@/lib/services/workoutService';
import { PlanWithDetails, Exercise } from '@/types/database.types';
import { AppLayout } from '@/components/layout/AppLayout';
import { DayManager } from '@/components/plans/DayManager';
import { ExerciseList } from '@/components/plans/ExerciseList';
import { PlanModal } from '@/components/plans/PlanModal';
import { Button } from '@/components/ui/Button';
import {
  ArrowLeft,
  Edit2,
  Calendar,
  Dumbbell,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const planId = resolvedParams.id;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [plan, setPlan] = useState<PlanWithDetails | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditPlanModalOpen, setIsEditPlanModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadPlan = async () => {
    try {
      setLoading(true);
      const data = await planService.getPlanById(planId);
      if (!data) {
        router.push('/plans');
        return;
      }
      setPlan(data);
      if (data.days && data.days.length > 0) {
        setSelectedDayId((prev) => {
          if (prev && data.days.some((d) => d.id === prev)) {
            return prev;
          }
          return data.days[0].id;
        });
      } else {
        setSelectedDayId(null);
      }
    } catch (err) {
      console.error('Error fetching plan:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      loadPlan();
    }
  }, [planId, authLoading]);

  // Plan info update
  const handleUpdatePlanInfo = async (data: { name: string; notes?: string }) => {
    await planService.updatePlan(planId, data);
    showToast('Dettagli scheda aggiornati');
    await loadPlan();
  };

  // Day handlers
  const handleAddDay = async (name: string) => {
    if (!user || !plan) return;
    const newPosition = plan.days ? plan.days.length : 0;
    const newDay = await planService.addPlanDay(planId, user.id, name, newPosition);
    showToast(`Giorno "${name}" aggiunto`);
    await loadPlan();
    setSelectedDayId(newDay.id);
  };

  const handleRenameDay = async (dayId: string, newName: string) => {
    await planService.updatePlanDay(dayId, { name: newName });
    showToast('Giorno rinominato');
    await loadPlan();
  };

  const handleDeleteDay = async (dayId: string) => {
    await planService.deletePlanDay(dayId);
    showToast('Giorno eliminato');
    await loadPlan();
  };

  const handleReorderDays = async (orderedIds: string[]) => {
    if (plan) {
      const dayMap = new Map(plan.days.map((d) => [d.id, d]));
      const updatedDays = orderedIds
        .map((id, idx) => {
          const d = dayMap.get(id);
          return d ? { ...d, position: idx } : null;
        })
        .filter(Boolean) as any;
      setPlan({ ...plan, days: updatedDays });
    }
    await planService.reorderPlanDays(planId, orderedIds);
  };

  // Exercise handlers
  const handleAddExercise = async (data: {
    plan_day_id: string;
    name: string;
    sets: number;
    reps_min: number;
    reps_max: number;
    rest_seconds: number;
    technique_notes?: string | null;
    video_url?: string | null;
  }) => {
    if (!user || !selectedDay) return;
    const newPosition = selectedDay.exercises ? selectedDay.exercises.length : 0;
    await planService.addExercise(user.id, {
      ...data,
      position: newPosition,
    });
    showToast(`Esercizio "${data.name}" aggiunto`);
    await loadPlan();
  };

  const handleUpdateExercise = async (
    exerciseId: string,
    data: Partial<Exercise>
  ) => {
    await planService.updateExercise(exerciseId, data);
    showToast('Esercizio modificato');
    await loadPlan();
  };

  const handleDeleteExercise = async (exerciseId: string) => {
    await planService.deleteExercise(exerciseId);
    showToast('Esercizio rimosso');
    await loadPlan();
  };

  const handleReorderExercises = async (
    dayId: string,
    orderedIds: string[]
  ) => {
    if (plan && selectedDay) {
      const exMap = new Map(selectedDay.exercises.map((e) => [e.id, e]));
      const reordered = orderedIds
        .map((id, idx) => {
          const e = exMap.get(id);
          return e ? { ...e, position: idx } : null;
        })
        .filter(Boolean) as Exercise[];

      const updatedDays = plan.days.map((d) =>
        d.id === dayId ? { ...d, exercises: reordered } : d
      );
      setPlan({ ...plan, days: updatedDays });
    }
    await planService.reorderExercises(dayId, orderedIds);
  };

  const selectedDay = plan?.days.find((d) => d.id === selectedDayId) || null;
  const totalExercises = (plan?.days || []).reduce(
    (acc, d) => acc + (d.exercises ? d.exercises.length : 0),
    0
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-4xl mx-auto">
        {/* Toast Alert */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-2xl shadow-xl text-xs font-semibold"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Back Link */}
        <div>
          <Link
            href="/plans"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 min-h-[44px] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Torna a tutte le schede</span>
          </Link>
        </div>

        {loading || !plan ? (
          <div className="flex flex-col gap-4 animate-pulse">
            <div className="h-28 rounded-3xl bg-slate-200 dark:bg-zinc-800" />
            <div className="h-12 rounded-2xl bg-slate-200 dark:bg-zinc-800" />
            <div className="h-64 rounded-3xl bg-slate-200 dark:bg-zinc-800" />
          </div>
        ) : (
          <>
            {/* Plan Header Card */}
            <div className="bg-white dark:bg-zinc-900/95 border border-slate-200/80 dark:border-zinc-800/80 rounded-3xl p-5 sm:p-7 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">
                      {plan.name}
                    </h1>
                    {plan.archived && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
                        Archiviata
                      </span>
                    )}
                  </div>

                  {plan.notes && (
                    <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed mb-3">
                      {plan.notes}
                    </p>
                  )}

                  {/* Summary counts & Start Workout */}
                  <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-emerald-500" />
                      <span>{plan.days?.length || 0} Giorni</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Dumbbell className="w-4 h-4 text-teal-500" />
                      <span>{totalExercises} Esercizi totali</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
                  {selectedDay && selectedDay.exercises && selectedDay.exercises.length > 0 && (
                    <Button
                      variant="primary"
                      size="md"
                      onClick={async () => {
                        if (!user || !selectedDay) return;
                        const sess = await workoutService.startSession(user.id, selectedDay.id);
                        router.push(`/workout/${sess.id}`);
                      }}
                      className="shadow-lg shadow-emerald-500/25 animate-pulse"
                    >
                      <Dumbbell className="w-4 h-4 mr-1.5" />
                      <span>Inizia Allenamento</span>
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => setIsEditPlanModalOpen(true)}
                    className="shrink-0"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Modifica Scheda</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Day Switcher / Manager (with Drag & Drop) */}
            <div className="bg-white/80 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800/80 rounded-3xl p-4 sm:p-5 shadow-xs">
              <DayManager
                days={plan.days || []}
                selectedDayId={selectedDayId}
                onSelectDay={(id) => setSelectedDayId(id)}
                onAddDay={handleAddDay}
                onRenameDay={handleRenameDay}
                onDeleteDay={handleDeleteDay}
                onReorderDays={handleReorderDays}
              />
            </div>

            {/* Exercises in Selected Day */}
            {selectedDay ? (
              <div className="bg-white/80 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800/80 rounded-3xl p-4 sm:p-6 shadow-xs">
                <ExerciseList
                  dayId={selectedDay.id}
                  dayName={selectedDay.name}
                  exercises={selectedDay.exercises || []}
                  onAddExercise={handleAddExercise}
                  onUpdateExercise={handleUpdateExercise}
                  onDeleteExercise={handleDeleteExercise}
                  onReorderExercises={handleReorderExercises}
                />
              </div>
            ) : (
              <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800">
                <p className="text-sm text-zinc-500">
                  Nessun giorno presente. Clicca &quot;Aggiungi Giorno&quot; per iniziare.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Plan Modal */}
      {plan && (
        <PlanModal
          isOpen={isEditPlanModalOpen}
          onClose={() => setIsEditPlanModalOpen(false)}
          onSubmit={handleUpdatePlanInfo}
          planToEdit={plan}
        />
      )}
    </AppLayout>
  );
}
