'use client';

import React, { useState } from 'react';
import { Exercise } from '@/types/database.types';
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableExerciseItem } from './SortableExerciseItem';
import { ExerciseModal } from './ExerciseModal';
import { VideoModal } from '@/components/ui/VideoModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Plus, Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ExerciseListProps {
  dayId: string;
  dayName: string;
  exercises: Exercise[];
  onAddExercise: (data: {
    plan_day_id: string;
    name: string;
    sets: number;
    reps_min: number;
    reps_max: number;
    rest_seconds: number;
    technique_notes?: string | null;
    video_url?: string | null;
  }) => Promise<void>;
  onUpdateExercise: (
    exerciseId: string,
    data: Partial<Exercise>
  ) => Promise<void>;
  onDeleteExercise: (exerciseId: string) => Promise<void>;
  onReorderExercises: (dayId: string, orderedIds: string[]) => Promise<void>;
  onStartWorkout?: () => Promise<void> | void;
  isStartingWorkout?: boolean;
}

export function ExerciseList({
  dayId,
  dayName,
  exercises,
  onAddExercise,
  onUpdateExercise,
  onDeleteExercise,
  onReorderExercises,
  onStartWorkout,
  isStartingWorkout = false,
}: ExerciseListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exerciseToEdit, setExerciseToEdit] = useState<Exercise | null>(null);
  const [exerciseToDelete, setExerciseToDelete] = useState<Exercise | null>(null);
  const [videoModalData, setVideoModalData] = useState<{
    isOpen: boolean;
    url: string | null;
    name: string;
  }>({
    isOpen: false,
    url: null,
    name: '',
  });

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
      const oldIndex = exercises.findIndex((e) => e.id === active.id);
      const newIndex = exercises.findIndex((e) => e.id === over.id);
      const newOrder = arrayMove(exercises, oldIndex, newIndex);
      await onReorderExercises(
        dayId,
        newOrder.map((e) => e.id)
      );
    }
  };

  const handleModalSubmit = async (data: {
    name: string;
    sets: number;
    reps_min: number;
    reps_max: number;
    rest_seconds: number;
    technique_notes?: string | null;
    video_url?: string | null;
  }) => {
    if (exerciseToEdit) {
      await onUpdateExercise(exerciseToEdit.id, data);
    } else {
      await onAddExercise({
        plan_day_id: dayId,
        ...data,
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!exerciseToDelete) return;
    await onDeleteExercise(exerciseToDelete.id);
    setExerciseToDelete(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top Header inside day */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-base sm:text-lg text-zinc-900 dark:text-zinc-100">
            {dayName}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {exercises.length === 0
              ? 'Nessun esercizio presente'
              : `${exercises.length} ${exercises.length === 1 ? 'esercizio configurato' : 'esercizi configurati'}`}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {onStartWorkout && exercises.length > 0 && (
            <Button
              variant="primary"
              size="md"
              onClick={onStartWorkout}
              disabled={isStartingWorkout}
              className="shadow-lg shadow-emerald-500/25 flex-1 sm:flex-initial"
            >
              <Dumbbell className="w-4 h-4 mr-1.5" />
              <span>{isStartingWorkout ? 'Avvio...' : 'Inizia Allenamento'}</span>
            </Button>
          )}

          <Button
            variant={exercises.length > 0 ? 'outline' : 'primary'}
            size="md"
            onClick={() => {
              setExerciseToEdit(null);
              setIsModalOpen(true);
            }}
            className={exercises.length > 0 ? 'flex-1 sm:flex-initial' : 'shadow-md shadow-emerald-500/20'}
          >
            <Plus className="w-4 h-4" />
            <span>Aggiungi Esercizio</span>
          </Button>
        </div>
      </div>

      {/* Exercise items list */}
      {exercises.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="Nessun esercizio per questo giorno"
          description="Inizia ad aggiungere gli esercizi per questa sessione con serie, ripetizioni e tempo di recupero."
          actionLabel="Aggiungi il primo esercizio"
          onAction={() => {
            setExerciseToEdit(null);
            setIsModalOpen(true);
          }}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={exercises.map((e) => e.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-2.5">
              {exercises.map((exercise, index) => (
                <SortableExerciseItem
                  key={exercise.id}
                  exercise={exercise}
                  index={index}
                  onEdit={(ex) => {
                    setExerciseToEdit(ex);
                    setIsModalOpen(true);
                  }}
                  onDelete={(ex) => setExerciseToDelete(ex)}
                  onOpenVideo={(ex) => {
                    setVideoModalData({
                      isOpen: true,
                      url: ex.video_url,
                      name: ex.name,
                    });
                  }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add / Edit Exercise Modal */}
      <ExerciseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setExerciseToEdit(null);
        }}
        onSubmit={handleModalSubmit}
        exerciseToEdit={exerciseToEdit}
      />

      {/* Delete Exercise Dialog */}
      <ConfirmDialog
        isOpen={!!exerciseToDelete}
        onClose={() => setExerciseToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Elimina Esercizio"
        message={`Sei sicuro di voler eliminare "${exerciseToDelete?.name}"?`}
        confirmLabel="Elimina"
        isDanger
      />

      {/* YouTube Video Embed Modal */}
      <VideoModal
        isOpen={videoModalData.isOpen}
        onClose={() =>
          setVideoModalData({ isOpen: false, url: null, name: '' })
        }
        videoUrl={videoModalData.url}
        exerciseName={videoModalData.name}
      />
    </div>
  );
}
