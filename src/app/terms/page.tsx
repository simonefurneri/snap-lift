import React from 'react';
import Link from 'next/link';
import { Dumbbell, ArrowLeft, FileText, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 p-4 sm:p-8 pt-safe pb-safe">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-zinc-800">
          <Link href="/profile" className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              <span>Indietro</span>
            </Button>
          </Link>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 text-zinc-950 flex items-center justify-center font-black">
              <Dumbbell className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-base tracking-tight">SnapLift</span>
          </div>
        </div>

        {/* Title */}
        <div>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
            <FileText className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Condizioni d'uso</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-zinc-100">
            Termini di Servizio
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Ultimo aggiornamento: 4 Ottobre 2026
          </p>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 flex flex-col gap-6 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed shadow-sm">
          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              1. Oggetto del Servizio
            </h2>
            <p>
              SnapLift è un'applicazione web progressiva (PWA) progettata per aiutare atleti e appassionati di fitness a registrare, organizzare e tracciare carichi e serie di allenamento in palestra.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100 mb-2">
              2. Responsabilità dell'Utente e Avvertenze Medico-Sportive
            </h2>
            <p>
              L'attività fisica con carichi e sovraccarichi comporta rischi intrinseci. SnapLift non fornisce consulenze mediche o piani nutrizionali prescrittivi. Prima di intraprendere qualsiasi programma di allenamento intensivo, è consigliabile consultare un medico abilitato. L'utente è l'unico responsabile della corretta esecuzione tecnica degli esercizi e della scelta dei carichi adeguati al proprio livello di forma fisica.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100 mb-2">
              3. Proprietà dei Dati
            </h2>
            <p>
              I dati immessi dall'utente restano di sua esclusiva proprietà. SnapLift garantisce all'utente la piena facoltà di esportare i propri dati o di cancellare l'account in qualunque momento in totale autonomia.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100 mb-2">
              4. Modifiche ai Termini
            </h2>
            <p>
              SnapLift si riserva il diritto di aggiornare periodicamente le presenti condizioni d'uso per migliorare le funzionalità o per adeguamenti normativi. Eventuali modifiche sostanziali verranno comunicate all'interno dell'applicazione.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
