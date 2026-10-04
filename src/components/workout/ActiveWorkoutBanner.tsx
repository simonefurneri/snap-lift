'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { offlineDb, OfflineActiveSession } from '@/lib/services/offlineDb';
import { Dumbbell, Play, X } from 'lucide-react';

export function ActiveWorkoutBanner() {
  const [activeSession, setActiveSession] = useState<OfflineActiveSession | null>(null);

  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        const sessions = await offlineDb.getActiveSessions();
        if (sessions.length > 0) {
          // Get the most recent active session
          const sorted = sessions.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
          const latest = sorted[0];
          if (latest && latest.is_active) {
            setActiveSession(latest);
          }
        }
      } catch (e) {
        console.warn('Error checking active session:', e);
      }
    };

    checkActiveSession();
  }, []);

  const handleDismiss = async () => {
    if (activeSession) {
      await offlineDb.deleteActiveSession(activeSession.id);
      setActiveSession(null);
    }
  };

  if (!activeSession) {
    return null;
  }

  return (
    <div className="w-full bg-linear-to-r from-emerald-600 to-teal-600 text-white px-4 py-3 shadow-lg flex items-center justify-between gap-3 text-xs sm:text-sm animate-in fade-in slide-in-from-top duration-300">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-black shrink-0 animate-pulse">
          <Dumbbell className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-extrabold truncate">
            Hai un allenamento in corso: <span className="underline decoration-white/50">{activeSession.day_name}</span>
          </p>
          <p className="text-[11px] text-white/80 truncate">
            Tocca per riprendere la sessione da dove l'hai lasciata.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link href={`/workout/${activeSession.id}`}>
          <button className="px-3.5 py-1.5 rounded-xl bg-white text-emerald-950 font-black text-xs flex items-center gap-1.5 shadow-md hover:bg-emerald-50 active:scale-95 transition-all cursor-pointer">
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Riprendi</span>
          </button>
        </Link>

        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Ignora sessione"
          aria-label="Ignora sessione"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
