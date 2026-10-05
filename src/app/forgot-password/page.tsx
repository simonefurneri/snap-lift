'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Dumbbell, Mail, CheckCircle2, ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const { error: resetError, message: successMsg } = await resetPassword(email);
      if (resetError) {
        setError(resetError);
      } else if (successMsg) {
        setMessage(successMsg);
      }
    } catch {
      setError('Errore durante l\'invio della richiesta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 p-4 sm:p-6 pt-safe pb-safe">
      <header className="w-full max-w-7xl mx-auto flex justify-between items-center px-2 sm:px-6 py-2 sm:py-4">
        <Link href="/login" className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 text-zinc-950 flex items-center justify-center font-black shadow-md shadow-emerald-500/20">
            <Dumbbell className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-xl tracking-tight bg-linear-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
            SnapLift
          </span>
        </Link>
        <div className="flex items-center shrink-0">
          <ThemeToggle showLabels="responsive" />
        </div>
      </header>

      <div className="max-w-md w-full mx-auto my-auto py-8">
        <div className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Torna al login</span>
          </Link>

          <div className="text-left mb-6">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-zinc-100 mb-1.5">
              Recupera Password
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              Inserisci l'indirizzo email associato al tuo account e ti invieremo le istruzioni.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-600 dark:text-red-400 font-medium">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              placeholder="atleta@esempio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={loading}
            >
              Invia link di recupero
            </Button>
          </form>
        </div>
      </div>

      <div className="text-center text-xs text-zinc-400 py-2">
        SnapLift &copy; {new Date().getFullYear()}
      </div>
    </div>
  );
}
