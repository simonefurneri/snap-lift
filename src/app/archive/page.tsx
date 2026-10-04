'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { planService } from '@/lib/services/planService';
import { PlanWithDetails } from '@/types/database.types';
import { AppLayout } from '@/components/layout/AppLayout';
import { PlanCard } from '@/components/plans/PlanCard';
import { PlanModal } from '@/components/plans/PlanModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Archive,
  Search,
  CheckCircle2,
  FolderArchive,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function ArchivePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [archivedPlans, setArchivedPlans] = useState<PlanWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planToEdit, setPlanToEdit] = useState<PlanWithDetails | null>(null);
  const [planToDelete, setPlanToDelete] = useState<PlanWithDetails | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Load archived plans
  const loadArchivedPlans = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const allPlans = await planService.getPlans(user.id, true);
      const onlyArchived = allPlans.filter((p) => p.archived);
      setArchivedPlans(onlyArchived);
    } catch (err) {
      console.error('Error loading archived plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      loadArchivedPlans();
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

  // Edit plan
  const handleSavePlan = async (data: { name: string; notes?: string }) => {
    if (!user || !planToEdit) return;
    await planService.updatePlan(planToEdit.id, data);
    showToast('Scheda modificata');
    await loadArchivedPlans();
  };

  // Duplicate plan
  const handleDuplicate = async (planId: string) => {
    if (!user) return;
    try {
      const newPlanId = await planService.duplicatePlan(planId, user.id);
      showToast('Scheda duplicata');
      router.push(`/plans/${newPlanId}`);
    } catch (err: unknown) {
      console.error('Duplicate error:', err);
    }
  };

  // Restore plan to active
  const handleRestore = async (plan: PlanWithDetails) => {
    await planService.updatePlan(plan.id, { archived: false });
    showToast('Scheda ripristinata tra i piani attivi');
    await loadArchivedPlans();
  };

  // Delete plan
  const handleDeleteConfirm = async () => {
    if (!planToDelete) return;
    try {
      setDeleteLoading(true);
      await planService.deletePlan(planToDelete.id);
      showToast('Scheda eliminata definitivamente');
      setPlanToDelete(null);
      await loadArchivedPlans();
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filtered archived plans
  const filteredPlans = archivedPlans.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.notes && p.notes.toLowerCase().includes(q))
    );
  });

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Toast alert */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-2xl shadow-xl text-xs font-semibold"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{notification}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Archive className="w-4 h-4" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">
                Archivio Schede
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              I piani completati o archiviati che puoi ripristinare o consultare in qualsiasi momento.
            </p>
          </div>
        </div>

        {/* Search Bar & Total Counter */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Piani Archiviati ({filteredPlans.length})
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
            icon={FolderArchive}
            title={searchQuery ? 'Nessun piano archiviato per la ricerca' : 'Nessuna scheda in archivio'}
            description={
              searchQuery
                ? 'Prova a modificare i termini di ricerca.'
                : 'Quando archivi un piano dalla lista attiva, verrà conservato qui per essere ripristinato quando vuoi.'
            }
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
                  onToggleArchive={handleRestore}
                  onDelete={(p) => setPlanToDelete(p)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Edit Plan Modal */}
      {planToEdit && (
        <PlanModal
          isOpen={isPlanModalOpen}
          onClose={() => {
            setIsPlanModalOpen(false);
            setPlanToEdit(null);
          }}
          onSubmit={handleSavePlan}
          planToEdit={planToEdit}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!planToDelete}
        onClose={() => setPlanToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Eliminare questa scheda archiviata?"
        message={`Sei sicuro di voler eliminare definitivamente "${planToDelete?.name}"? L'azione non è reversibile.`}
        confirmLabel="Elimina Definitivamente"
        isLoading={deleteLoading}
        isDanger
      />
    </AppLayout>
  );
}
