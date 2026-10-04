'use client';

import React, { useRef, useState } from 'react';
import { ProcessedImage, processImagesList } from '@/lib/utils/imageCompressor';
import {
  Camera,
  Upload,
  Image as ImageIcon,
  X,
  Sparkles,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ImportImageUploaderProps {
  images: ProcessedImage[];
  onImagesChange: (images: ProcessedImage[]) => void;
  onStartAnalysis: () => void;
  onCancel: () => void;
}

export function ImportImageUploader({
  images,
  onImagesChange,
  onStartAnalysis,
  onCancel,
}: ImportImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);

  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setErrorMessages([]);
    setProcessing(true);

    try {
      const remainingSlots = Math.max(0, 5 - images.length);
      if (remainingSlots <= 0) {
        setErrorMessages(['Hai già raggiunto il limite massimo di 5 immagini.']);
        return;
      }

      const { processed, errors } = await processImagesList(fileArray, remainingSlots);

      if (errors.length > 0) {
        setErrorMessages(errors);
      }

      if (processed.length > 0) {
        onImagesChange([...images, ...processed]);
      }
    } catch (err: any) {
      setErrorMessages([err.message || 'Errore durante l\'elaborazione delle immagini']);
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveImage = (id: string) => {
    onImagesChange(images.filter((img) => img.id !== id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Hidden File Inputs */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      {/* Errors list */}
      {errorMessages.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex flex-col gap-1 text-xs text-red-600 dark:text-red-400 font-medium">
          {errorMessages.map((msg, i) => (
            <div key={i} className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* Upload & Drop Zone */}
      {images.length === 0 ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center p-6 sm:p-8 rounded-3xl border-2 border-dashed transition-all text-center ${
            isDragging
              ? 'border-emerald-500 bg-emerald-500/10'
              : 'border-slate-300 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-800/30'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 shadow-sm">
            <Camera className="w-7 h-7" />
          </div>

          <h4 className="text-base font-bold text-slate-900 dark:text-zinc-100 mb-1">
            Carica foto o screenshot della scheda
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mb-5">
            Puoi caricare fino a 5 immagini (JPG, PNG, WebP o HEIC) se il piano è diviso su più schermate.
          </p>

          {/* Action Buttons for Mobile & Desktop */}
          <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-xs">
            {/* Mobile Camera Button */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1 sm:hidden min-h-[44px] px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Scatta Foto</span>
            </button>

            {/* Gallery / File Picker */}
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="flex-1 min-h-[44px] px-4 py-2.5 rounded-2xl bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 font-bold text-xs flex items-center justify-center gap-2 border border-slate-200 dark:border-zinc-700 shadow-xs cursor-pointer"
            >
              <ImageIcon className="w-4 h-4 text-emerald-500" />
              <span>Scegli Foto</span>
            </button>
          </div>
        </div>
      ) : (
        /* Image Previews Grid */
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Immagini caricate ({images.length}/5)
            </span>

            {images.length < 5 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="sm:hidden px-2.5 py-1 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-1 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Scatta</span>
                </button>

                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Aggiungi</span>
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map((img, index) => (
              <div
                key={img.id}
                className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-zinc-900 group aspect-4/3 shadow-xs"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.dataUrl}
                  alt={`Screenshot ${index + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Badge Number */}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-white text-[10px] font-extrabold">
                  #{index + 1}
                </div>

                {/* Size Badge */}
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-zinc-300 text-[9px] font-semibold">
                  {formatSize(img.compressedSize)}
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => handleRemoveImage(img.id)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-xl bg-red-600/90 text-white flex items-center justify-center shadow-md hover:bg-red-500 transition-colors cursor-pointer"
                  title="Rimuovi immagine"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Actions */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
        <Button variant="secondary" size="md" onClick={onCancel}>
          Annulla
        </Button>

        <Button
          variant="primary"
          size="md"
          onClick={onStartAnalysis}
          disabled={images.length === 0 || processing}
          isLoading={processing}
          className="shadow-md shadow-emerald-500/20"
        >
          <Sparkles className="w-4 h-4 mr-1.5" />
          <span>Analizza con AI ({images.length})</span>
        </Button>
      </div>
    </div>
  );
}
