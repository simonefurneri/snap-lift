'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import {
  Clock,
  Dumbbell,
  LogOut,
  RotateCcw,
  Mail,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function PendingApprovalScreen() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'info' | 'success' | 'error'; message: string } | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setFeedback(null);
    try {
      await refreshProfile();
      // If still not approved after refresh:
      setTimeout(() => {
        setFeedback({
          type: 'info',
          message: 'Il tuo account è ancora in attesa di approvazione. Riprova più tardi.',
        });
        setTimeout(() => setFeedback(null), 4000);
      }, 300);
    } catch {
      setFeedback({
        type: 'error',
        message: 'Errore durante la verifica dello stato.',
      });
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
  };

  const createdAtFormatted = profile?.created_at
    ? new Intl.DateTimeFormat('it-IT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(profile.created_at))
    : 'Recentemente';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 flex flex-col justify-between p-4 sm:p-6 pt-safe pb-safe select-none">
      {/* Top Bar */}
      <header className="w-full max-w-lg mx-auto flex items-center justify-between py-2 sm:py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 text-zinc-950 flex items-center justify-center font-black shadow-md shadow-emerald-500/20">
            <Dumbbell className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-xl tracking-tight bg-linear-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
            SnapLift
          </span>
        </div>
        <ThemeToggle showLabels="responsive" />
      </header>

      {/* Main Content Card */}
      <main className="w-full max-w-md mx-auto my-auto py-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xl text-center"
        >
          {/* Status Icon */}
          <div className="relative mx-auto w-20 h-20 mb-6 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-amber-500/15 animate-ping opacity-75" />
            <div className="relative w-20 h-20 rounded-full bg-amber-500/10 dark:bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-inner">
              <Clock className="w-10 h-10 animate-pulse" />
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-zinc-100 tracking-tight mb-2.5">
            Account in attesa di approvazione
          </h1>

          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
            La tua richiesta di registrazione è stata registrata con successo. Un amministratore deve approvare il tuo account prima che tu possa accedere a schede ed allenamenti.
          </p>

          {/* Account Details Box */}
          <div className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/60 dark:border-zinc-700/60 rounded-2xl p-4 text-left mb-6 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 font-medium">
                <Mail className="w-3.5 h-3.5" /> Email account
              </span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[180px]">
                {user?.email || 'N/D'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200/50 dark:border-zinc-700/40">
              <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 font-medium">
                <ShieldAlert className="w-3.5 h-3.5" /> Stato autorizzazione
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300 dark:border-amber-800/60">
                In revisione
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200/50 dark:border-zinc-700/40">
              <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                Data registrazione
              </span>
              <span className="text-zinc-600 dark:text-zinc-400">
                {createdAtFormatted}
              </span>
            </div>
          </div>

          {/* Toast / Feedback Banner */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: -5, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -5, height: 0 }}
                className={`mb-4 p-3 rounded-xl text-xs font-medium flex items-center gap-2 text-left ${
                  feedback.type === 'info'
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50'
                    : feedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                    : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800/50'
                }`}
              >
                {feedback.type === 'info' && <Clock className="w-4 h-4 shrink-0" />}
                {feedback.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                {feedback.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{feedback.message}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleRefresh}
              isLoading={isRefreshing}
              className="w-full min-h-[48px] font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-md shadow-emerald-500/20"
            >
              <RotateCcw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Ricontrolla stato
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={handleSignOut}
              isLoading={isSigningOut}
              className="w-full min-h-[44px] text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <LogOut className="w-4 h-4 mr-2 text-zinc-400 hover:text-red-500" />
              Disconnetti
            </Button>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-lg mx-auto text-center py-2 text-[11px] text-zinc-400 dark:text-zinc-500">
        SnapLift &bull; Sistema di approvazione sicuro
      </footer>
    </div>
  );
}
