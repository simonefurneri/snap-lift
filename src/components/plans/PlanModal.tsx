'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Plan } from '@/types/database.types';

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; notes?: string }) => Promise<void>;
  planToEdit?: Plan | null;
}

export function PlanModal({
  isOpen,
  onClose,
  onSubmit,
  planToEdit,
}: PlanModalProps) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (planToEdit) {
      setName(planToEdit.name);
      setNotes(planToEdit.notes || '');
    } else {
      setName('');
      setNotes('');
    }
    setError(null);
  }, [planToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Inserisci il nome della scheda');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSubmit({
        name: name.trim(),
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Errore durante il salvataggio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={planToEdit ? 'Modifica Scheda' : 'Nuova Scheda di Allenamento'}
      description={
        planToEdit
          ? 'Aggiorna il nome o le note generali di questa scheda'
          : 'Crea una nuova scheda per organizzare i tuoi giorni di allenamento'
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Nome della Scheda"
          placeholder="Es: Ipertrofia Push/Pull/Legs, Forza 5x5..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error || undefined}
          autoFocus
          required
        />

        <Textarea
          label="Note o Obiettivi (opzionale)"
          placeholder="Es: Focus su petto e progressione carichi su stacco..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />

        <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={loading}
          >
            Annulla
          </Button>
          <Button type="submit" variant="primary" size="md" isLoading={loading}>
            {planToEdit ? 'Salva Modifiche' : 'Crea Scheda'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
