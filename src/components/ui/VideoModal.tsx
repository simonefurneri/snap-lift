'use client';

import React from 'react';
import { Modal } from './Modal';
import { parseYouTubeUrl } from '@/lib/utils/youtube';
import { AlertCircle, ExternalLink } from 'lucide-react';
import { YouTubeIcon } from '@/components/ui/Icons';
import { Button } from './Button';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string | null;
  exerciseName: string;
}

export function VideoModal({
  isOpen,
  onClose,
  videoUrl,
  exerciseName,
}: VideoModalProps) {
  const result = parseYouTubeUrl(videoUrl);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={exerciseName}
      description="Video dimostrativo di esecuzione"
      maxWidth="lg"
      footer={
        <div className="flex justify-end">
          <Button variant="secondary" size="md" onClick={onClose}>
            Chiudi
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {result.isValid && result.embedUrl ? (
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-lg border border-zinc-800">
            <iframe
              src={result.embedUrl}
              title={`Video tutorial ${exerciseName}`}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 bg-zinc-100 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              Impossibile riprodurre il video
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 max-w-sm">
              {result.errorMessage || 'Il link fornito non sembra un URL valido di YouTube.'}
            </p>
            {videoUrl && (
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
              >
                <span>Prova ad aprire il link esternamente</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
