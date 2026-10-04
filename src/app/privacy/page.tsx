import React from 'react';
import Link from 'next/link';
import { Dumbbell, ArrowLeft, Shield, Lock, Trash2, Database } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function PrivacyPage() {
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
            <Shield className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Trasparenza & Privacy</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-zinc-100">
            Informativa sulla Privacy
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Ultimo aggiornamento: 4 Ottobre 2026
          </p>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 flex flex-col gap-6 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed shadow-sm">
          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-500" />
              1. Quali dati raccogliamo
            </h2>
            <p>
              SnapLift raccoglie esclusivamente i dati necessari al funzionamento dell'applicazione e al monitoraggio dei tuoi allenamenti:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-xs">
              <li><strong>Informazioni di account:</strong> indirizzo email, nome visualizzato (display name) forniti al momento della registrazione o del login con Google/OAuth.</li>
              <li><strong>Dati di allenamento:</strong> schede di allenamento create, giorni, esercizi, serie, carichi, ripetizioni, tempi di recupero e note tecniche.</li>
              <li><strong>Preferenze atleta:</strong> unità di misura (kg/lbs), percentuale di progressione e passo di arrotondamento.</li>
              <li><strong>Importazione schede:</strong> le foto o screenshot caricati per l'importazione AI vengono elaborati temporaneamente in memoria volatile e NON vengono mai salvati in modo permanente sui nostri server né ceduti a terzi.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-500" />
              2. Come proteggiamo i tuoi dati
            </h2>
            <p>
              Tutte le comunicazioni tra il tuo dispositivo e i server avvengono tramite crittografia SSL/TLS (HTTPS). L'accesso al database è protetto da criteri Row Level Security (RLS) di Supabase, garantendo che ciascun utente possa visualizzare e modificare solo ed esclusivamente i propri dati.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-emerald-500" />
              3. I tuoi diritti (Esportazione e Cancellazione totale)
            </h2>
            <p>
              In piena conformità con il Regolamento Generale sulla Protezione dei Dati (GDPR):
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-xs">
              <li><strong>Diritto di esportazione:</strong> puoi scaricare in qualsiasi momento l'intero archivio dei tuoi dati in formato standard JSON o CSV dalla schermata del tuo Profilo.</li>
              <li><strong>Diritto all'oblio (Cancellazione definitiva):</strong> puoi eliminare il tuo account e tutti i dati correlati (schede, sessioni, serie, storico) con un solo tocco dalla sezione Profilo. L'eliminazione è immediata, permanente e irreversibile.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100 mb-2">
              4. Contatti
            </h2>
            <p>
              Per qualsiasi chiarimento o richiesta relativa alla privacy dei tuoi dati su SnapLift, puoi contattare l'amministratore del progetto tramite i canali di supporto dell'applicazione.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
