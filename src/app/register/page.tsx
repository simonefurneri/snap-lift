'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Dumbbell, Mail, Lock, User as UserIcon, CheckCircle2 } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function RegisterPage() {
  const router = useRouter();
  const { signUpWithEmail, signInWithGoogle } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (password.length < 6) {
      setError('La password deve contenere almeno 6 caratteri');
      return;
    }

    setLoading(true);
    try {
      const { error: signUpError, message } = await signUpWithEmail(
        email,
        password,
        fullName
      );
      if (signUpError) {
        setError(signUpError);
      } else if (message) {
        setSuccessMessage(message);
      } else {
        router.push('/plans');
      }
    } catch {
      setError('Errore durante la creazione dell\'account.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const { error: googleError } = await signInWithGoogle();
      if (googleError) {
        setError(googleError);
        setGoogleLoading(false);
      }
      // On success, window.location.href navigates directly to Google OAuth
    } catch {
      setError('Errore durante l\'accesso con Google.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 p-4 sm:p-6 pt-safe pb-safe">
      {/* Top Header */}
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

      {/* Register Card */}
      <div className="max-w-md w-full mx-auto my-auto py-8">
        <div className="bg-white dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-zinc-100 mb-1.5">
              Crea il tuo account
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              Inizia a strutturare i tuoi allenamenti in modo professionale.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-600 dark:text-red-400 font-medium">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Nome o Nickname"
              placeholder="Marco Rossi"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              leftIcon={<UserIcon className="w-4 h-4" />}
              required
            />

            <Input
              label="Email"
              type="email"
              placeholder="atleta@esempio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
              autoComplete="email"
            />

            <Input
              label="Password (min. 6 caratteri)"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              required
              autoComplete="new-password"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={loading}
            >
              Crea Account
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-zinc-900 px-3 text-zinc-400 font-semibold">
                oppure
              </span>
            </div>
          </div>

          {/* Social / Google Login */}
          <Button
            type="button"
            variant="outline"
            size="md"
            className="w-full"
            onClick={handleGoogleSignIn}
            isLoading={googleLoading}
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Registrati con Google</span>
          </Button>

          <div className="mt-6 text-center">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Hai già un account?{' '}
              <Link
                href="/login"
                className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
              >
                Accedi qui
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-zinc-400 py-2">
        SnapLift &copy; {new Date().getFullYear()} — Mobile-First Workout Tracking
      </div>
    </div>
  );
}
