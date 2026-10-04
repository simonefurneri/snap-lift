'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Modal } from '@/components/ui/Modal';
import { ProcessedImage } from '@/lib/utils/imageCompressor';
import { ImportedPlan } from '@/app/api/import-plan/route';
import { planImportService } from '@/lib/services/planImportService';
import { ImportImageUploader } from '@/components/import/ImportImageUploader';
import { ImportLoadingState } from '@/components/import/ImportLoadingState';
import { ImportReviewEditor } from '@/components/import/ImportReviewEditor';
import { AlertCircle, RotateCcw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ImportPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (planId: string) => void;
}

type ImportStep = 'upload' | 'analyzing' | 'review';

export function ImportPlanModal({ isOpen, onClose, onSuccess }: ImportPlanModalProps) {
  const router = useRouter();
  const { user } = useAuth();

  const [step, setStep] = useState<ImportStep>('upload');
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [extractedPlan, setExtractedPlan] = useState<ImportedPlan | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Reset state when closing or starting over
  const handleResetAndClose = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStep('upload');
    setImages([]);
    setExtractedPlan(null);
    setErrorMessage(null);
    setIsSaving(false);
    onClose();
  };

  // Start analysis API call
  const handleStartAnalysis = async () => {
    if (images.length === 0) return;

    setErrorMessage(null);
    setStep('analyzing');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const payload = {
        images: images.map((img) => ({
          base64Data: img.base64Data,
          mimeType: img.mimeType,
        })),
      };

      const res = await fetch('/api/import-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Errore durante l\'analisi della scheda.');
      }

      setExtractedPlan(data.plan);
      setStep('review');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User aborted
        setStep('upload');
        return;
      }
      setErrorMessage(
        err.message || 'Si è verificato un errore di connessione. Riprova più tardi.'
      );
    } finally {
      abortControllerRef.current = null;
    }
  };

  // Abort analysis in progress
  const handleCancelAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStep('upload');
  };

  // Save the reviewed plan
  const handleSavePlan = async (planToSave: ImportedPlan) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const newPlanId = await planImportService.saveImportedPlan(user.id, planToSave);
      handleResetAndClose();

      if (onSuccess) {
        onSuccess(newPlanId);
      } else {
        router.push(`/plans/${newPlanId}`);
      }
    } catch (err: any) {
      console.error('Error saving imported plan', err);
      setErrorMessage(err.message || 'Errore durante il salvataggio del piano.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleResetAndClose}
      title={
        step === 'upload'
          ? 'Importa Piano da Foto / Screenshot'
          : step === 'analyzing'
          ? 'Analisi Intelligente'
          : 'Revisiona Scheda Estratta'
      }
      description={
        step === 'upload'
          ? 'Carica una o più foto (fino a 5) della tua scheda per convertirla automaticamente con AI.'
          : step === 'analyzing'
          ? 'Gemini sta elaborando il contenuto visivo.'
          : 'Verifica e modifica i giorni, le serie e i recuperi prima di confermare il salvataggio.'
      }
      maxWidth={step === 'review' ? '2xl' : 'lg'}
      className={step === 'review' ? 'h-[90dvh] sm:h-[85vh]' : undefined}
      contentClassName={step === 'review' ? 'p-0 overflow-hidden flex flex-col flex-1 min-h-0' : undefined}
    >
      <div className={step === 'review' ? 'h-full flex flex-col min-h-0 flex-1 overflow-hidden' : 'pt-2'}>
        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mb-4 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex flex-col gap-3 text-xs text-red-700 dark:text-red-300">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="font-semibold leading-relaxed">{errorMessage}</p>
            </div>

            <div className="flex items-center gap-2 justify-end pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setErrorMessage(null);
                  setStep('upload');
                }}
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                <span>Cambia Foto</span>
              </Button>

              <Button variant="primary" size="sm" onClick={handleStartAnalysis}>
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                <span>Riprova</span>
              </Button>
            </div>
          </div>
        )}

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <ImportImageUploader
            images={images}
            onImagesChange={setImages}
            onStartAnalysis={handleStartAnalysis}
            onCancel={handleResetAndClose}
          />
        )}

        {/* Step 2: Analyzing Loading State */}
        {step === 'analyzing' && !errorMessage && (
          <ImportLoadingState
            onCancel={handleCancelAnalysis}
            imagesCount={images.length}
          />
        )}

        {/* Step 3: Review & Edit */}
        {step === 'review' && extractedPlan && (
          <ImportReviewEditor
            initialPlan={extractedPlan}
            onSave={handleSavePlan}
            onCancel={handleResetAndClose}
            isSaving={isSaving}
          />
        )}
      </div>
    </Modal>
  );
}
