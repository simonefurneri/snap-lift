'use client';

import React, { useState } from 'react';
import { PlanDayWithExercises } from '@/types/database.types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, GripHorizontal, Edit3, Trash2, MoreHorizontal, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface DayManagerProps {
  days: PlanDayWithExercises[];
  selectedDayId: string | null;
  onSelectDay: (dayId: string) => void;
  onAddDay: (name: string) => Promise<void>;
  onRenameDay: (dayId: string, newName: string) => Promise<void>;
  onDeleteDay: (dayId: string) => Promise<void>;
  onReorderDays: (orderedIds: string[]) => Promise<void>;
}

function SortableDayTabItem({
  day,
  isSelected,
  onSelect,
  onOpenOptions,
}: {
  day: PlanDayWithExercises;
  isSelected: boolean;
  onSelect: () => void;
  onOpenOptions: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: day.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative flex items-center rounded-2xl transition-all select-none shrink-0',
        isSelected
          ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-zinc-950 font-bold shadow-md shadow-emerald-500/20 ring-2 ring-emerald-500/40'
          : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className={cn(
          'min-h-[44px] pl-2.5 pr-1 flex items-center justify-center opacity-40 group-hover:opacity-100 cursor-grab active:cursor-grabbing touch-none',
          isSelected ? 'text-white dark:text-zinc-950' : 'text-zinc-400'
        )}
        title="Trascina giorno per riordinare"
      >
        <GripHorizontal className="w-3.5 h-3.5" />
      </button>

      {/* Day label click */}
      <button
        type="button"
        onClick={onSelect}
        className="min-h-[44px] px-2 py-2 text-xs sm:text-sm font-semibold flex items-center gap-1.5 cursor-pointer"
      >
        <span>{day.name}</span>
        <span
          className={cn(
            'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
            isSelected
              ? 'bg-white/20 text-white dark:text-zinc-950 dark:bg-black/20'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
          )}
        >
          {day.exercises?.length || 0}
        </span>
      </button>

      {/* Quick Day options (Opens non-clipped modal) */}
      <div className="pr-1.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenOptions();
          }}
          className={cn(
            'min-h-[44px] min-w-[32px] flex items-center justify-center rounded-lg transition-colors cursor-pointer',
            isSelected
              ? 'text-white/80 hover:text-white dark:text-zinc-950/80 dark:hover:text-zinc-950'
              : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
          )}
          title="Opzioni giorno"
          aria-label="Opzioni giorno"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function DayManager({
  days,
  selectedDayId,
  onSelectDay,
  onAddDay,
  onRenameDay,
  onDeleteDay,
  onReorderDays,
}: DayManagerProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDayName, setNewDayName] = useState('');
  const [activeManageDay, setActiveManageDay] = useState<PlanDayWithExercises | null>(null);
  const [dayToRename, setDayToRename] = useState<PlanDayWithExercises | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [dayToDelete, setDayToDelete] = useState<PlanDayWithExercises | null>(null);
  const [loading, setLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = days.findIndex((d) => d.id === active.id);
      const newIndex = days.findIndex((d) => d.id === over.id);
      const newOrder = arrayMove(days, oldIndex, newIndex);
      await onReorderDays(newOrder.map((d) => d.id));
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDayName.trim()) return;
    setLoading(true);
    try {
      await onAddDay(newDayName.trim());
      setNewDayName('');
      setIsAddModalOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dayToRename || !renameValue.trim()) return;
    setLoading(true);
    try {
      await onRenameDay(dayToRename.id, renameValue.trim());
      setDayToRename(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!dayToDelete) return;
    setLoading(true);
    try {
      await onDeleteDay(dayToDelete.id);
      setDayToDelete(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Giorni di Allenamento ({days.length})
        </span>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="min-h-[44px] px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Aggiungi Giorno</span>
        </button>
      </div>

      {/* Horizontal Draggable Day Pills Container */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={days.map((d) => d.id)}
            strategy={horizontalListSortingStrategy}
          >
            {days.map((day) => (
              <SortableDayTabItem
                key={day.id}
                day={day}
                isSelected={day.id === selectedDayId}
                onSelect={() => onSelectDay(day.id)}
                onOpenOptions={() => setActiveManageDay(day)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* Day Options Action Sheet / Modal */}
      {activeManageDay && (
        <Modal
          isOpen={!!activeManageDay}
          onClose={() => setActiveManageDay(null)}
          title={`Opzioni: ${activeManageDay.name}`}
          description={`${activeManageDay.exercises?.length || 0} esercizi in questa sessione`}
          maxWidth="sm"
        >
          <div className="flex flex-col gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                const day = activeManageDay;
                setActiveManageDay(null);
                setDayToRename(day);
                setRenameValue(day.name);
              }}
              className="w-full min-h-[48px] px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold text-sm flex items-center gap-3 transition-colors cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-emerald-500" />
              <span>Rinomina Giorno</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const day = activeManageDay;
                setActiveManageDay(null);
                setDayToDelete(day);
              }}
              className="w-full min-h-[48px] px-4 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950/70 text-red-600 dark:text-red-400 font-semibold text-sm flex items-center gap-3 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
              <span>Elimina Giorno</span>
            </button>

            <div className="pt-2">
              <Button
                variant="secondary"
                size="md"
                className="w-full"
                onClick={() => setActiveManageDay(null)}
              >
                Annulla
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Day Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Aggiungi Nuovo Giorno"
        description="Es: Giorno A - Spinta, Push, Gambe & Addome, Full Body..."
      >
        <form onSubmit={handleAddSubmit} className="flex flex-col gap-4">
          <Input
            label="Nome del Giorno *"
            placeholder="Es: Giorno C - Gambe e Core"
            value={newDayName}
            onChange={(e) => setNewDayName(e.target.value)}
            required
            autoFocus
          />
          <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsAddModalOpen(false)}
            >
              Annulla
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={loading}>
              Aggiungi
            </Button>
          </div>
        </form>
      </Modal>

      {/* Rename Day Modal */}
      <Modal
        isOpen={!!dayToRename}
        onClose={() => setDayToRename(null)}
        title="Rinomina Giorno"
      >
        <form onSubmit={handleRenameSubmit} className="flex flex-col gap-4">
          <Input
            label="Nome del Giorno *"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            required
            autoFocus
          />
          <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setDayToRename(null)}
            >
              Annulla
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={loading}>
              Salva
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Day Confirmation */}
      {dayToDelete && (
        <Modal
          isOpen={!!dayToDelete}
          onClose={() => setDayToDelete(null)}
          title="Eliminare questo giorno?"
          description={`Tutti gli esercizi contenuti in "${dayToDelete.name}" verranno eliminati.`}
          maxWidth="sm"
        >
          <div className="flex justify-end gap-2.5 pt-3">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setDayToDelete(null)}
            >
              Annulla
            </Button>
            <Button
              type="button"
              variant="danger"
              size="md"
              onClick={handleDeleteConfirm}
              isLoading={loading}
            >
              Elimina Definitivamente
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
