'use client';

import React from 'react';
import Link from 'next/link';
import { WifiOff, RotateCcw, Dumbbell, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function OfflinePage() {
  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 flex flex-col justify-between p-6">
      {/* Top Brand */}
      <header className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-emerald-500 text-zinc-950 flex items-center justify-center font-black shadow-md shadow-emerald-500/20">
          <Dumbbell className="w-4 h-4" />
        </div>
        <span className="font-extrabold text-lg tracking-tight bg-linear-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
          SnapLift
        </span>
      </header>

      {/* Center Offline Card */}
      <main className="max-w-md w-full mx-auto my-auto text-center flex flex-col items-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-5 shadow-inner">
          <WifiOff className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight mb-2">
          Sei offline
        </h1>

        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
          Nessuna connessione internet disponibile. Le schede salvate in memoria e le sessioni di allenamento in corso continuano a funzionare: i dati verranno sincronizzati automaticamente appena tornerà la rete.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Button variant="primary" size="md" onClick={handleReload} className="w-full sm:w-auto justify-center">
            <RotateCcw className="w-4 h-4 mr-2" />
            <span>Riprova Connessione</span>
          </Button>

          <Link href="/plans" className="w-full sm:w-auto">
            <Button variant="secondary" size="md" className="w-full justify-center">
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span>Torna alle Schede</span>
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer info */}
      <footer className="text-center text-xs text-zinc-400">
        SnapLift Gym PWA · Funzionalità offline attiva
      </footer>
    </div>
  );
}
