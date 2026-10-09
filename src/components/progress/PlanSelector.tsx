'use client';

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { PlanWithDetails } from '@/types/database.types';
import { truncateDayName } from '@/lib/utils/cn';
import {
  Layers,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Archive,
  ChevronDown,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PlanSelectorProps {
  plans: PlanWithDetails[];
  selectedPlanId: string; // 'all' or plan.id
  onSelectPlan: (planId: string) => void;
  isLoading?: boolean;
}

export function PlanSelector({
  plans,
  selectedPlanId,
  onSelectPlan,
  isLoading = false,
}: PlanSelectorProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [showArchivedDropdown, setShowArchivedDropdown] = useState(false);

  const activePlans = plans.filter((p) => !p.archived);
  const archivedPlans = plans.filter((p) => p.archived);

  // Check scroll positions for visual arrows
  const checkScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [checkScroll, plans]);

  // Horizontal wheel handler
  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0 && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      if (container.scrollWidth > container.clientWidth) {
        container.scrollLeft += e.deltaY;
        checkScroll();
      }
    }
  };

  const scrollByAmount = (offset: number) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
      setTimeout(checkScroll, 250);
    }
  };

  // Auto-scroll active item into view
  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeEl = scrollContainerRef.current.querySelector(
        `[data-plan-tab="${selectedPlanId}"]`
      );
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [selectedPlanId]);

  const countPlanExercises = (plan: PlanWithDetails) => {
    return (plan.days || []).reduce(
      (acc, day) => acc + (day.exercises ? day.exercises.length : 0),
      0
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-3 overflow-hidden animate-pulse">
          <div className="h-10 w-32 rounded-xl bg-slate-200 dark:bg-zinc-800" />
          <div className="h-10 w-36 rounded-xl bg-slate-200 dark:bg-zinc-800" />
          <div className="h-10 w-28 rounded-xl bg-slate-200 dark:bg-zinc-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col gap-3">
      {/* Selector Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wider">
            Seleziona Scheda
          </span>
          <span className="text-[11px] font-semibold text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
            {activePlans.length} {activePlans.length === 1 ? 'attiva' : 'attive'}
          </span>
        </div>

        {/* Dropdown for Archived Plans if any exist */}
        {archivedPlans.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowArchivedDropdown(!showArchivedDropdown)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Archiviate ({archivedPlans.length})</span>
              <span className="sm:hidden">Archivio</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            <AnimatePresence>
              {showArchivedDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowArchivedDropdown(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-9 z-50 w-56 p-1.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl shadow-xl flex flex-col gap-0.5"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-2.5 py-1">
                      Schede Archiviate
                    </span>
                    {archivedPlans.map((plan) => {
                      const isSelected = selectedPlanId === plan.id;
                      const exCount = countPlanExercises(plan);
                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => {
                            onSelectPlan(plan.id);
                            setShowArchivedDropdown(false);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'text-zinc-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700/60'
                          }`}
                        >
                          <div className="flex flex-col truncate pr-2">
                            <span className="truncate">{plan.name}</span>
                            <span className="text-[10px] text-zinc-400">
                              {exCount} esercizi
                            </span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Carousel Container with Scroll Indicators */}
      <div className="relative group">
        {/* Left Arrow (Desktop) */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollByAmount(-220)}
            className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/95 dark:bg-zinc-800/95 shadow-md border border-slate-200 dark:border-zinc-700 items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-emerald-500 transition-colors cursor-pointer"
            aria-label="Scorri schede a sinistra"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Right Arrow (Desktop) */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scrollByAmount(220)}
            className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/95 dark:bg-zinc-800/95 shadow-md border border-slate-200 dark:border-zinc-700 items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-emerald-500 transition-colors cursor-pointer"
            aria-label="Scorri schede a destra"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Scrollable Tabs */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          onWheel={onWheel}
          role="tablist"
          aria-label="Selettore schede di allenamento"
          className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar touch-pan-x scroll-smooth -mx-1 px-1"
        >
          {/* Active Plans Tabs */}
          {activePlans.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            const exCount = countPlanExercises(plan);
            const daysCount = plan.days?.length || 0;

            return (
              <button
                key={plan.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                data-plan-tab={plan.id}
                onClick={() => onSelectPlan(plan.id)}
                className={`relative shrink-0 min-h-[44px] px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 select-none active:scale-[0.98] ${
                  isSelected
                    ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/25 scale-[1.02]'
                    : 'bg-slate-100 dark:bg-zinc-800/90 text-zinc-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-transparent hover:border-slate-300 dark:hover:border-zinc-600'
                }`}
              >
                <span className="truncate max-w-[140px] sm:max-w-[200px]" title={plan.name}>
                  {truncateDayName(plan.name, 24)}
                </span>

                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-lg font-bold shrink-0 ${
                    isSelected
                      ? 'bg-zinc-950/15 text-zinc-950'
                      : 'bg-slate-200/80 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {exCount > 0 ? `${exCount} es.` : `${daysCount} gg.`}
                </span>
              </button>
            );
          })}

          {/* "Tutte le schede" Option for Global Aggregation */}
          <button
            type="button"
            role="tab"
            aria-selected={selectedPlanId === 'all'}
            data-plan-tab="all"
            onClick={() => onSelectPlan('all')}
            className={`relative shrink-0 min-h-[44px] px-3.5 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none active:scale-[0.98] ${
              selectedPlanId === 'all'
                ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/25 scale-[1.02]'
                : 'bg-slate-100 dark:bg-zinc-800/90 text-zinc-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Tutte le Schede</span>
          </button>

          {/* Archived Plan if currently selected */}
          {archivedPlans.some((p) => p.id === selectedPlanId) && (
            <div className="relative shrink-0 min-h-[44px] px-3.5 py-2 rounded-2xl text-xs font-bold bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/25 flex items-center gap-1.5">
              <Archive className="w-3.5 h-3.5" />
              <span>
                {plans.find((p) => p.id === selectedPlanId)?.name} (Archiviata)
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
