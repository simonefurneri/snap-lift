'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { planService } from '@/lib/services/planService';
import { PlanWithDetails } from '@/types/database.types';
import { AppLayout } from '@/components/layout/AppLayout';
import { PlanCard } from '@/components/plans/PlanCard';
import { PlanModal } from '@/components/plans/PlanModal';
import { ImportPlanModal } from '@/components/import/ImportPlanModal';
import { ActiveWorkoutBanner } from '@/components/workout/ActiveWorkoutBanner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import {
  Plus,
  Dumbbell,
  Search,
  CheckCircle2,
  Camera,
  Sparkles,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function PlansPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [plans, setPlans] = useState<PlanWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [planToEdit, setPlanToEdit] = useState<PlanWithDetails | null>(null);
  const [planToDelete, setPlanToDelete] = useState<PlanWithDetails | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Load active plans
  const loadPlans = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await planService.getPlans(user.id, false);
      setPlans(data);
    } catch (err) {
      console.error('Error loading plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      loadPlans();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading]);

  // Notifications helper
  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  // Create or Update plan
  const handleSavePlan = async (data: { name: string; notes?: string }) => {
    if (!user) return;
    if (planToEdit) {
      await planService.updatePlan(planToEdit.id, data);
      showToast('Scheda modificata con successo');
    } else {
      const created = await planService.createPlan(user.id, data.name, data.notes);
      showToast('Nuova scheda creata');
      router.push(`/plans/${created.id}`);
    }
    await loadPlans();
  };

  // Duplicate plan
  const handleDuplicate = async (planId: string) => {
    if (!user) return;
    try {
      const newPlanId = await planService.duplicatePlan(planId, user.id);
      showToast('Scheda duplicata con successo');
      await loadPlans();
      router.push(`/plans/${newPlanId}`);
    } catch (err: unknown) {
      console.error('Duplicate error:', err);
    }
  };

  // Toggle Archive
  const handleToggleArchive = async (plan: PlanWithDetails) => {
    await planService.updatePlan(plan.id, { archived: true });
    showToast('Scheda spostata in Archivio');
    await loadPlans();
  };

  // Delete plan
  const handleDeleteConfirm = async () => {
    if (!planToDelete) return;
    try {
      setDeleteLoading(true);
      await planService.deletePlan(planToDelete.id);
      showToast('Scheda eliminata');
      setPlanToDelete(null);
      await loadPlans();
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filtered active plans
  const filteredPlans = plans.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.notes && p.notes.toLowerCase().includes(q))
    );
  });

  return (
    <AppLayout
      onOpenNewPlan={() => {
        setPlanToEdit(null);
        setIsPlanModalOpen(true);
      }}
    >
      <div className="flex flex-col gap-6">
        {/* Active Workout Resume Banner */}
        <ActiveWorkoutBanner />

        {/* Toast alert */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="fixed top-[calc(1rem+env(safe-area-inset-top,0px))] right-4 sm:right-6 left-4 sm:left-auto max-w-sm ml-auto z-50 flex items-center gap-2 px-4 py-3 bg-emerald-600/95 text-white rounded-2xl shadow-xl text-xs font-semibold backdrop-blur-md"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{notification}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header Title + Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">
              Piani di Allenamento
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              I tuoi piani attivi per le sessioni in palestra.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setIsImportModalOpen(true)}
              className="border-emerald-500/30 hover:border-emerald-500 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 shadow-xs"
            >
              <Camera className="w-5 h-5 mr-1.5 text-emerald-500" />
              <span>Importa da Foto</span>
            </Button>

            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                setPlanToEdit(null);
                setIsPlanModalOpen(true);
              }}
              className="shadow-lg shadow-emerald-500/25 shrink-0"
            >
              <Plus className="w-5 h-5" />
              <span>Nuovo Piano</span>
            </Button>
          </div>
        </div>

        {/* Search Bar & Total Counter */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Schede Attive ({filteredPlans.length})
            </span>
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cerca per nome o note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-h-[42px] pl-9 pr-4 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
        </div>

        {/* Plans Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-44 rounded-2xl bg-slate-200/60 dark:bg-zinc-800/40 animate-pulse border border-slate-200/40 dark:border-zinc-800/40"
              />
            ))}
          </div>
        ) : filteredPlans.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title={searchQuery ? 'Nessun piano trovato per la ricerca' : 'Nessuna scheda attiva'}
            description={
              searchQuery
                ? 'Prova a modificare i termini di ricerca.'
                : 'Crea il tuo primo piano di allenamento o importalo da una foto con AI.'
            }
            actionLabel={searchQuery ? undefined : 'Crea nuova scheda'}
            onAction={() => {
              setPlanToEdit(null);
              setIsPlanModalOpen(true);
            }}
            secondaryActionLabel={searchQuery ? undefined : 'Importa da foto con AI'}
            onSecondaryAction={() => setIsImportModalOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredPlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onEdit={(p) => {
                    setPlanToEdit(p);
                    setIsPlanModalOpen(true);
                  }}
                  onDuplicate={handleDuplicate}
                  onToggleArchive={handleToggleArchive}
                  onDelete={(p) => setPlanToDelete(p)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create / Edit Plan Modal */}
      <PlanModal
        isOpen={isPlanModalOpen}
        onClose={() => {
          setIsPlanModalOpen(false);
          setPlanToEdit(null);
        }}
        onSubmit={handleSavePlan}
        planToEdit={planToEdit}
      />

      {/* AI Import Plan Modal */}
      <ImportPlanModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={(newId) => {
          setIsImportModalOpen(false);
          showToast('Scheda importata con successo!');
          loadPlans();
          router.push(`/plans/${newId}`);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!planToDelete}
        onClose={() => setPlanToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Eliminare questa scheda?"
        message={`Sei sicuro di voler eliminare definitivamente "${planToDelete?.name}"? Tutti i giorni e gli esercizi associati verranno cancellati.`}
        confirmLabel="Elimina Scheda"
        isLoading={deleteLoading}
        isDanger
      />
    </AppLayout>
  );
}
