'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { workoutService } from '@/lib/services/workoutService';
import { WorkoutRunner } from '@/components/workout/WorkoutRunner';
import { WorkoutSession, PlanDayWithExercises, Plan, SetLog } from '@/types/database.types';
import { Dumbbell, Loader2 } from 'lucide-react';

interface WorkoutPageProps {
  params: Promise<{ id: string }>;
}

export default function WorkoutSessionPage({ params }: WorkoutPageProps) {
  const resolvedParams = use(params);
  const sessionId = resolvedParams.id;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState<{
    session: WorkoutSession;
    day: PlanDayWithExercises;
    plan: Plan | null;
    setLogs: SetLog[];
  } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }

    const loadSession = async () => {
      try {
        const data = await workoutService.getSessionById(sessionId);
        if (!data || !data.day) {
          router.replace('/plans');
          return;
        }

        // If session is already finished, go back to plans
        if (data.session.finished_at) {
          router.replace('/plans');
          return;
        }

        setSessionData({
          session: data.session,
          day: data.day,
          plan: data.plan,
          setLogs: data.setLogs,
        });
      } catch (err) {
        console.error('Error loading session:', err);
        router.replace('/plans');
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [sessionId, user, authLoading, router]);

  if (loading || authLoading || !sessionData) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-zinc-950 flex items-center justify-center font-black shadow-lg shadow-emerald-500/20 mb-4 animate-pulse">
          <Dumbbell className="w-7 h-7" />
        </div>
        <div className="flex items-center gap-2 text-zinc-500 text-sm font-semibold">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
          <span>Caricamento sessione di allenamento...</span>
        </div>
      </div>
    );
  }

  return (
    <WorkoutRunner
      initialSession={sessionData.session}
      initialDay={sessionData.day}
      initialPlan={sessionData.plan}
      initialSetLogs={sessionData.setLogs}
    />
  );
}
