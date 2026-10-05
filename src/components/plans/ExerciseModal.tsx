'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Exercise } from '@/types/database.types';
import { parseYouTubeUrl } from '@/lib/utils/youtube';
import { VideoModal } from '@/components/ui/VideoModal';
import { YouTubeIcon } from '@/components/ui/Icons';
import { CheckCircle2, AlertCircle, Play } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface ExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    sets: number;
    reps_min: number;
    reps_max: number;
    rest_seconds: number;
    technique_notes?: string | null;
    video_url?: string | null;
  }) => Promise<void>;
  exerciseToEdit?: Exercise | null;
}

const REST_PRESETS = [
  { label: '30s', value: 30 },
  { label: '45s', value: 45 },
  { label: '60s (1m)', value: 60 },
  { label: '90s (1m30)', value: 90 },
  { label: '120s (2m)', value: 120 },
  { label: '180s (3m)', value: 180 },
];

export function ExerciseModal({
  isOpen,
  onClose,
  onSubmit,
  exerciseToEdit,
}: ExerciseModalProps) {
  const [name, setName] = useState('');
  const [sets, setSets] = useState(3);
  const [repsMin, setRepsMin] = useState(8);
  const [repsMax, setRepsMax] = useState(12);
  const [restSeconds, setRestSeconds] = useState(90);
  const [techniqueNotes, setTechniqueNotes] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testVideoOpen, setTestVideoOpen] = useState(false);

  useEffect(() => {
    if (exerciseToEdit) {
      setName(exerciseToEdit.name);
      setSets(exerciseToEdit.sets);
      setRepsMin(exerciseToEdit.reps_min);
      setRepsMax(exerciseToEdit.reps_max);
      setRestSeconds(exerciseToEdit.rest_seconds);
      setTechniqueNotes(exerciseToEdit.technique_notes || '');
      setVideoUrl(exerciseToEdit.video_url || '');
    } else {
      setName('');
      setSets(3);
      setRepsMin(8);
      setRepsMax(12);
      setRestSeconds(90);
      setTechniqueNotes('');
      setVideoUrl('');
    }
    setError(null);
  }, [exerciseToEdit, isOpen]);

  const ytValidation = videoUrl ? parseYouTubeUrl(videoUrl) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Inserisci il nome dell\'esercizio');
      return;
    }

    if (sets < 1) {
      setError('Il numero di serie deve essere almeno 1');
      return;
    }

    if (repsMin < 0 || repsMax < 0 || repsMax < repsMin) {
      setError('Intervallo di ripetizioni non valido (Max deve essere >= Min)');
      return;
    }

    if (videoUrl && !ytValidation?.isValid) {
      setError(ytValidation?.errorMessage || 'Link YouTube non valido');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSubmit({
        name: name.trim(),
        sets: Number(sets),
        reps_min: Number(repsMin),
        reps_max: Number(repsMax),
        rest_seconds: Number(restSeconds),
        technique_notes: techniqueNotes.trim() || null,
        video_url: videoUrl.trim() || null,
      });
      onClose();
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Errore durante il salvataggio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={exerciseToEdit ? 'Modifica Esercizio' : 'Aggiungi Nuovo Esercizio'}
        description="Configura serie, ripetizioni, tempi di recupero e video tutorial"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium">
              {error}
            </div>
          )}

          {/* Exercise Name */}
          <Input
            label="Nome Esercizio *"
            placeholder="Es: Panca Piana Bilanciere, Squat, Lat Machine..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          {/* Sets and Reps range in a grid */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-1.5">
                Serie
              </label>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min="1"
                max="50"
                value={sets}
                onChange={(e) => setSets(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full min-h-[44px] px-3 py-2 text-center font-bold text-base rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-1.5">
                Reps Min
              </label>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min="0"
                max="200"
                value={repsMin}
                onChange={(e) => {
                  const val = Math.max(0, parseInt(e.target.value) || 0);
                  setRepsMin(val);
                  if (val > repsMax) setRepsMax(val);
                }}
                className="w-full min-h-[44px] px-3 py-2 text-center font-bold text-base rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-1.5">
                Reps Max
              </label>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min={repsMin}
                max="200"
                value={repsMax}
                onChange={(e) => setRepsMax(Math.max(repsMin, parseInt(e.target.value) || repsMin))}
                className="w-full min-h-[44px] px-3 py-2 text-center font-bold text-base rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Rest seconds with quick presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Recupero tra le serie (secondi)
              </label>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {restSeconds} sec ({Math.floor(restSeconds / 60)}m {restSeconds % 60}s)
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-2">
              {REST_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setRestSeconds(preset.value)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
                    restSeconds === preset.value
                      ? 'bg-emerald-500 text-zinc-950 font-bold shadow-xs'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <input
              type="range"
              min="15"
              max="360"
              step="15"
              value={restSeconds}
              onChange={(e) => setRestSeconds(parseInt(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Technique Notes */}
          <Textarea
            label="Note Tecniche & Focus (opzionale)"
            placeholder="Es: Gomiti a 45 gradi, fermo al petto di 1 sec, eccentrica controllata in 3 sec..."
            value={techniqueNotes}
            onChange={(e) => setTechniqueNotes(e.target.value)}
            rows={2}
          />

          {/* Video URL with YouTube validation & test preview */}
          <div>
            <Input
              label="Link Video Tutorial YouTube (opzionale)"
              placeholder="https://www.youtube.com/watch?v=... o youtu.be/..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              leftIcon={<YouTubeIcon className="w-4 h-4 text-red-500" />}
            />

            {/* Video validation feedback */}
            {videoUrl && (
              <div className="mt-2 flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/50">
                <div className="flex items-center gap-2 overflow-hidden">
                  {ytValidation?.isValid ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium truncate">
                        Link YouTube valido (ID: {ytValidation.videoId})
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                      <span className="text-xs text-red-500 truncate">
                        {ytValidation?.errorMessage || 'Formato non supportato'}
                      </span>
                    </>
                  )}
                </div>

                {ytValidation?.isValid && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setTestVideoOpen(true)}
                  >
                    <Play className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                    <span>Anteprima</span>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
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
              {exerciseToEdit ? 'Salva Esercizio' : 'Aggiungi Esercizio'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Test Video Preview Modal */}
      {testVideoOpen && (
        <VideoModal
          isOpen={testVideoOpen}
          onClose={() => setTestVideoOpen(false)}
          videoUrl={videoUrl}
          exerciseName={name || 'Anteprima Video'}
        />
      )}
    </>
  );
}
