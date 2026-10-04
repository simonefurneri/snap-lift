'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, X, BrainCircuit, Dumbbell, Clock, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';

interface ImportLoadingStateProps {
  onCancel: () => void;
  imagesCount: number;
}

const TIPS = [
  {
    icon: BrainCircuit,
    title: 'Analisi visiva in corso…',
    desc: 'Gemini sta esaminando la foto per rilevare la suddivisione in giorni (Push, Pull, Legs…).',
  },
  {
    icon: Dumbbell,
    title: 'Trascrizione esercizi e parametri…',
    desc: 'Riconoscimento dei nomi degli esercizi, range di ripetizioni e numero di serie.',
  },
  {
    icon: Clock,
    title: 'Conversione tempi di recupero…',
    desc: 'Calcolo automatico dei recuperi in secondi e note tecniche di esecuzione.',
  },
  {
    icon: Layers,
    title: 'Validazione struttura e sicurezza…',
    desc: 'Verifica della coerenza dei dati estratti prima della schermata di revisione.',
  },
];

export function ImportLoadingState({ onCancel, imagesCount }: ImportLoadingStateProps) {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  const CurrentTip = TIPS[tipIndex];
  const TipIcon = CurrentTip.icon;

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      {/* Animated Glowing AI Icon */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-3xl bg-linear-to-tr from-emerald-500 to-teal-400 text-zinc-950 flex items-center justify-center shadow-2xl shadow-emerald-500/30 animate-pulse">
          <Sparkles className="w-10 h-10 animate-spin" style={{ animationDuration: '6s' }} />
        </div>
        <div className="absolute -inset-2 bg-emerald-500/20 rounded-3xl blur-xl -z-10 animate-ping" style={{ animationDuration: '3s' }} />
      </div>

      <h3 className="text-xl font-black text-slate-900 dark:text-zinc-100 mb-1.5 tracking-tight">
        Sto leggendo la tua scheda…
      </h3>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mb-6">
        Elaborazione di {imagesCount} {imagesCount === 1 ? 'immagine' : 'immagini'} con intelligenza artificiale.
      </p>

      {/* Rotating Tips Box */}
      <div className="w-full max-w-sm p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/70 dark:border-zinc-700/60 mb-6 min-h-[90px] flex items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={tipIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="flex items-start gap-3 text-left w-full"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <TipIcon className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-0.5">
                {CurrentTip.title}
              </h5>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {CurrentTip.desc}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Cancel analysis button */}
      <Button
        variant="ghost"
        size="md"
        onClick={onCancel}
        className="text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 text-xs"
      >
        <X className="w-4 h-4 mr-1.5" />
        <span>Annulla analisi</span>
      </Button>
    </div>
  );
}
