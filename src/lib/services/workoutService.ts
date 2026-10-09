import { createClient } from '@/lib/supabase/client';
import {
  WorkoutSession,
  SetLog,
  PlanDayWithExercises,
  Plan,
} from '@/types/database.types';

export interface PreviousExerciseHistory {
  sessionId: string;
  finishedAt: string;
  sets: { set_number: number; weight: number; reps: number }[];
  allSetsHitMax: boolean;
  maxWeight: number;
}

export interface WeeklyProgressPoint {
  weekKey: string; // e.g. "2026-W40"
  weekLabel: string; // e.g. "29 Set - 5 Ott"
  weekStart: string; // ISO date string
  maxWeight: number;
  totalVolume: number;
  totalSets: number;
  weightChangePct?: number | null; // change vs previous week
  volumeChangePct?: number | null; // change vs previous week
}

export interface ExerciseProgressData {
  exerciseName: string;
  weeklyPoints: WeeklyProgressPoint[];
  allTimeMaxWeight: number;
  allTimeTotalVolume: number;
  totalWorkouts: number;
}

export interface LoggedExerciseItem {
  name: string;
  totalSets: number;
  lastSessionDate: string;
  dayNames?: string[];
  isConfiguredInPlan?: boolean;
}

export const workoutService = {
  // 1. Start a new workout session for a given plan day
  async startSession(userId: string, planDayId: string): Promise<WorkoutSession> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('workout_sessions')
      .insert({
        user_id: userId,
        plan_day_id: planDayId,
        started_at: new Date().toISOString(),
        finished_at: null,
      } as any)
      .select()
      .single();

    if (error) throw error;
    return data as WorkoutSession;
  },

  // 2. Get active (unfinished) session for user if one exists
  async getActiveSession(userId: string): Promise<WorkoutSession | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', userId)
      .is('finished_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data as WorkoutSession | null;
  },

  // 3. Get session details by ID (including day, plan, and current set logs)
  async getSessionById(sessionId: string): Promise<{
    session: WorkoutSession;
    day: PlanDayWithExercises | null;
    plan: Plan | null;
    setLogs: SetLog[];
  } | null> {
    const supabase = createClient();

    // Fetch session
    const { data: sessionData, error: sessionErr } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionErr || !sessionData) return null;
    const session = sessionData as WorkoutSession;

    // Fetch day and plan if plan_day_id exists
    let day: PlanDayWithExercises | null = null;
    let plan: Plan | null = null;

    if (session.plan_day_id) {
      const { data: dayData } = await supabase
        .from('plan_days')
        .select(`
          *,
          exercises(*)
        `)
        .eq('id', session.plan_day_id)
        .maybeSingle();

      if (dayData) {
        const sortedExercises = ((dayData as any).exercises || []).sort(
          (a: any, b: any) => a.position - b.position
        );
        day = {
          ...(dayData as any),
          exercises: sortedExercises,
        };

        if (dayData.plan_id) {
          const { data: planData } = await supabase
            .from('plans')
            .select('*')
            .eq('id', dayData.plan_id)
            .maybeSingle();

          if (planData) {
            plan = planData as Plan;
          }
        }
      }
    }

    // Fetch set logs for this session
    const { data: setLogsData } = await supabase
      .from('set_logs')
      .select('*')
      .eq('session_id', sessionId)
      .order('set_number', { ascending: true });

    return {
      session,
      day,
      plan,
      setLogs: (setLogsData || []) as SetLog[],
    };
  },

  // 4. Save or update a single set log
  async saveSetLog(payload: {
    userId: string;
    sessionId: string;
    exerciseId?: string | null;
    exerciseName: string;
    setNumber: number;
    weight: number;
    reps: number;
  }): Promise<SetLog> {
    const supabase = createClient();

    // Check if set already exists in this session for this exercise and set_number
    let query = supabase
      .from('set_logs')
      .select('id')
      .eq('session_id', payload.sessionId)
      .eq('set_number', payload.setNumber);

    if (payload.exerciseId) {
      query = query.eq('exercise_id', payload.exerciseId);
    } else {
      query = query.eq('exercise_name', payload.exerciseName);
    }

    const { data: existing } = await query.maybeSingle();

    if (existing?.id) {
      // Update
      const { data, error } = await supabase
        .from('set_logs')
        .update({
          weight: payload.weight,
          reps: payload.reps,
          exercise_name: payload.exerciseName,
          exercise_id: payload.exerciseId || null,
        } as any)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data as SetLog;
    } else {
      // Insert
      const { data, error } = await supabase
        .from('set_logs')
        .insert({
          user_id: payload.userId,
          session_id: payload.sessionId,
          exercise_id: payload.exerciseId || null,
          exercise_name: payload.exerciseName,
          set_number: payload.setNumber,
          weight: payload.weight,
          reps: payload.reps,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data as SetLog;
    }
  },

  // 5. Delete a single set log
  async deleteSetLog(sessionId: string, exerciseIdentifier: { id?: string | null; name: string }, setNumber: number) {
    const supabase = createClient();
    let query = supabase
      .from('set_logs')
      .delete()
      .eq('session_id', sessionId)
      .eq('set_number', setNumber);

    if (exerciseIdentifier.id) {
      query = query.eq('exercise_id', exerciseIdentifier.id);
    } else {
      query = query.eq('exercise_name', exerciseIdentifier.name);
    }

    const { error } = await query;
    if (error) throw error;
  },

  // 6. Finish workout session
  async finishSession(sessionId: string): Promise<WorkoutSession> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('workout_sessions')
      .update({
        finished_at: new Date().toISOString(),
      } as any)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return data as WorkoutSession;
  },

  // 7. Cancel/discard workout session
  async cancelSession(sessionId: string) {
    const supabase = createClient();
    // Cascade or manually delete set_logs
    await supabase.from('set_logs').delete().eq('session_id', sessionId);
    const { error } = await supabase.from('workout_sessions').delete().eq('id', sessionId);
    if (error) throw error;
  },

  // 8. Retrieve historical sets for an exercise from the most recent completed session
  async getPreviousHistoryForExercise(
    userId: string,
    exerciseName: string,
    currentSessionId?: string,
    repsMax: number = 10
  ): Promise<PreviousExerciseHistory | null> {
    const supabase = createClient();

    // Find all set_logs for this exercise name for the user
    const { data: logs, error } = await supabase
      .from('set_logs')
      .select(`
        id,
        session_id,
        exercise_name,
        set_number,
        weight,
        reps,
        created_at
      `)
      .eq('user_id', userId)
      .ilike('exercise_name', exerciseName.trim())
      .order('created_at', { ascending: false });

    if (error || !logs || logs.length === 0) return null;

    // Filter out current session sets
    const pastLogs = currentSessionId
      ? logs.filter((l) => l.session_id !== currentSessionId)
      : logs;

    if (pastLogs.length === 0) return null;

    // Group logs by session_id and find the most recent session
    const latestSessionId = pastLogs[0].session_id;
    const sessionSets = pastLogs
      .filter((l) => l.session_id === latestSessionId)
      .sort((a, b) => a.set_number - b.set_number);

    if (sessionSets.length === 0) return null;

    const sets = sessionSets.map((s) => ({
      set_number: s.set_number,
      weight: Number(s.weight),
      reps: Number(s.reps),
    }));

    const allSetsHitMax = sets.length > 0 && sets.every((s) => s.reps >= repsMax);
    const maxWeight = Math.max(...sets.map((s) => s.weight));

    return {
      sessionId: latestSessionId,
      finishedAt: sessionSets[0].created_at,
      sets,
      allSetsHitMax,
      maxWeight,
    };
  },

  // 9. Get all unique exercises logged by the user (or scoped to a specific plan)
  async getLoggedExercises(
    userId: string,
    planId?: string | null
  ): Promise<LoggedExerciseItem[]> {
    const supabase = createClient();

    if (planId && planId !== 'all') {
      // 1. Fetch days and configured exercises for this plan
      const { data: daysData, error: daysError } = await supabase
        .from('plan_days')
        .select(`
          id,
          name,
          position,
          exercises (
            id,
            name,
            position
          )
        `)
        .eq('plan_id', planId)
        .order('position', { ascending: true });

      if (daysError) throw daysError;

      const dayIds = (daysData || []).map((d) => d.id);

      interface PlanExEntry {
        name: string;
        dayNames: string[];
        isConfiguredInPlan: boolean;
        totalSets: number;
        lastSessionDate: string;
      }
      const exercisesMap = new Map<string, PlanExEntry>();

      // Populate configured exercises in day & position order
      for (const day of (daysData || [])) {
        const sortedDayExercises = ((day as any).exercises || []).sort(
          (a: any, b: any) => (a.position ?? 0) - (b.position ?? 0)
        );
        for (const ex of sortedDayExercises) {
          const name = ex.name?.trim();
          if (!name) continue;
          const key = name.toLowerCase();
          const existing = exercisesMap.get(key);
          if (!existing) {
            exercisesMap.set(key, {
              name,
              dayNames: day.name ? [day.name] : [],
              isConfiguredInPlan: true,
              totalSets: 0,
              lastSessionDate: '',
            });
          } else {
            if (day.name && !existing.dayNames.includes(day.name)) {
              existing.dayNames.push(day.name);
            }
          }
        }
      }

      // Check sessions logged for this plan
      if (dayIds.length > 0) {
        const { data: sessionRows, error: sessError } = await supabase
          .from('workout_sessions')
          .select('id')
          .in('plan_day_id', dayIds);

        if (sessError) throw sessError;

        const sessionIds = (sessionRows || []).map((s) => s.id);

        if (sessionIds.length > 0) {
          const { data: logsData, error: logsError } = await supabase
            .from('set_logs')
            .select('exercise_name, created_at')
            .eq('user_id', userId)
            .in('session_id', sessionIds)
            .order('created_at', { ascending: false });

          if (logsError) throw logsError;

          if (logsData) {
            for (const row of logsData) {
              const name = row.exercise_name?.trim();
              if (!name) continue;
              const key = name.toLowerCase();
              const existing = exercisesMap.get(key);
              if (existing) {
                existing.totalSets += 1;
                if (!existing.lastSessionDate || new Date(row.created_at) > new Date(existing.lastSessionDate)) {
                  existing.lastSessionDate = row.created_at;
                }
              } else {
                exercisesMap.set(key, {
                  name,
                  dayNames: [],
                  isConfiguredInPlan: false,
                  totalSets: 1,
                  lastSessionDate: row.created_at,
                });
              }
            }
          }
        }
      }

      return Array.from(exercisesMap.values());
    }

    // Default / All Plans: get all unique logged exercises across all workouts
    const { data, error } = await supabase
      .from('set_logs')
      .select('exercise_name, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    const map = new Map<string, { totalSets: number; lastSessionDate: string }>();

    for (const row of data) {
      const name = row.exercise_name?.trim();
      if (!name) continue;
      const lowerKey = name.toLowerCase();

      const existing = map.get(lowerKey);
      if (!existing) {
        map.set(lowerKey, {
          totalSets: 1,
          lastSessionDate: row.created_at,
        });
      } else {
        existing.totalSets += 1;
      }
    }

    // Format map back to readable exercise list
    const result: LoggedExerciseItem[] = [];
    const seenNames = new Set<string>();

    for (const row of data) {
      const name = row.exercise_name?.trim();
      if (!name || seenNames.has(name.toLowerCase())) continue;
      seenNames.add(name.toLowerCase());
      const stats = map.get(name.toLowerCase())!;
      result.push({
        name,
        totalSets: stats.totalSets,
        lastSessionDate: stats.lastSessionDate,
      });
    }

    return result;
  },

  // 10. Get weekly progress statistics for a specific exercise (optionally scoped to a plan)
  async getExerciseProgress(
    userId: string,
    exerciseName: string,
    planId?: string | null
  ): Promise<ExerciseProgressData> {
    const supabase = createClient();

    let sessionIds: string[] | null = null;

    if (planId && planId !== 'all') {
      const { data: days, error: daysError } = await supabase
        .from('plan_days')
        .select('id')
        .eq('plan_id', planId);

      if (daysError) throw daysError;

      const dayIds = (days || []).map((d) => d.id);
      if (dayIds.length === 0) {
        return {
          exerciseName,
          weeklyPoints: [],
          allTimeMaxWeight: 0,
          allTimeTotalVolume: 0,
          totalWorkouts: 0,
        };
      }

      const { data: sessions, error: sessError } = await supabase
        .from('workout_sessions')
        .select('id')
        .in('plan_day_id', dayIds);

      if (sessError) throw sessError;

      sessionIds = (sessions || []).map((s) => s.id);
      if (sessionIds.length === 0) {
        return {
          exerciseName,
          weeklyPoints: [],
          allTimeMaxWeight: 0,
          allTimeTotalVolume: 0,
          totalWorkouts: 0,
        };
      }
    }

    let query = supabase
      .from('set_logs')
      .select('set_number, weight, reps, created_at, session_id')
      .eq('user_id', userId)
      .ilike('exercise_name', exerciseName.trim())
      .order('created_at', { ascending: true });

    if (sessionIds !== null) {
      query = query.in('session_id', sessionIds);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return {
        exerciseName,
        weeklyPoints: [],
        allTimeMaxWeight: 0,
        allTimeTotalVolume: 0,
        totalWorkouts: 0,
      };
    }

    // Helper to get week key (ISO year & week number, and Monday start date)
    const getWeekInfo = (dateStr: string) => {
      const d = new Date(dateStr);
      // Find Monday of this week
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      const monday = new Date(d.setDate(diff));
      monday.setHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const monthNames = [
        'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
        'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic',
      ];

      const weekKey = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
      const weekLabel = `${monday.getDate()} ${monthNames[monday.getMonth()]} - ${sunday.getDate()} ${monthNames[sunday.getMonth()]}`;

      return { weekKey, weekLabel, mondayDate: monday.toISOString() };
    };

    // Group logs by week
    const weekMap = new Map<
      string,
      {
        weekLabel: string;
        weekStart: string;
        sets: { weight: number; reps: number; session_id: string }[];
      }
    >();

    const uniqueSessions = new Set<string>();
    let allTimeMaxWeight = 0;
    let allTimeTotalVolume = 0;

    for (const log of data) {
      const weight = Number(log.weight) || 0;
      const reps = Number(log.reps) || 0;
      const volume = weight * reps;

      if (weight > allTimeMaxWeight) allTimeMaxWeight = weight;
      allTimeTotalVolume += volume;
      if (log.session_id) uniqueSessions.add(log.session_id);

      const { weekKey, weekLabel, mondayDate } = getWeekInfo(log.created_at);
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, {
          weekLabel,
          weekStart: mondayDate,
          sets: [],
        });
      }

      weekMap.get(weekKey)!.sets.push({
        weight,
        reps,
        session_id: log.session_id,
      });
    }

    // Convert map to sorted weekly points array
    const sortedWeekKeys = Array.from(weekMap.keys()).sort();
    const weeklyPoints: WeeklyProgressPoint[] = [];

    let prevMaxWeight: number | null = null;
    let prevVolume: number | null = null;

    for (const key of sortedWeekKeys) {
      const info = weekMap.get(key)!;
      const maxWeight = Math.max(...info.sets.map((s) => s.weight));
      const totalVolume = info.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
      const totalSets = info.sets.length;

      let weightChangePct: number | null = null;
      if (prevMaxWeight !== null && prevMaxWeight > 0) {
        weightChangePct = Number((((maxWeight - prevMaxWeight) / prevMaxWeight) * 100).toFixed(1));
      }

      let volumeChangePct: number | null = null;
      if (prevVolume !== null && prevVolume > 0) {
        volumeChangePct = Number((((totalVolume - prevVolume) / prevVolume) * 100).toFixed(1));
      }

      weeklyPoints.push({
        weekKey: key,
        weekLabel: info.weekLabel,
        weekStart: info.weekStart,
        maxWeight,
        totalVolume,
        totalSets,
        weightChangePct,
        volumeChangePct,
      });

      prevMaxWeight = maxWeight;
      prevVolume = totalVolume;
    }

    return {
      exerciseName,
      weeklyPoints,
      allTimeMaxWeight,
      allTimeTotalVolume,
      totalWorkouts: uniqueSessions.size,
    };
  },

  // 11. Reset / delete all progress logs for a specific exercise (optionally scoped to a plan)
  async resetExerciseProgress(
    userId: string,
    exerciseName: string,
    planId?: string | null
  ): Promise<void> {
    const supabase = createClient();

    if (planId && planId !== 'all') {
      const { data: days } = await supabase
        .from('plan_days')
        .select('id')
        .eq('plan_id', planId);

      const dayIds = (days || []).map((d) => d.id);
      if (dayIds.length === 0) return;

      const { data: sessions } = await supabase
        .from('workout_sessions')
        .select('id')
        .in('plan_day_id', dayIds);

      const sessionIds = (sessions || []).map((s) => s.id);
      if (sessionIds.length === 0) return;

      const { error } = await supabase
        .from('set_logs')
        .delete()
        .eq('user_id', userId)
        .ilike('exercise_name', exerciseName.trim())
        .in('session_id', sessionIds);

      if (error) throw error;
      return;
    }

    const { error } = await supabase
      .from('set_logs')
      .delete()
      .eq('user_id', userId)
      .ilike('exercise_name', exerciseName.trim());

    if (error) throw error;
  },

  // 12. Reset all workout progress logs and sessions for a specific plan
  async resetPlanProgress(userId: string, planId: string): Promise<void> {
    const supabase = createClient();
    const { data: days } = await supabase
      .from('plan_days')
      .select('id')
      .eq('plan_id', planId);

    const dayIds = (days || []).map((d) => d.id);
    if (dayIds.length === 0) return;

    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('id')
      .in('plan_day_id', dayIds);

    const sessionIds = (sessions || []).map((s) => s.id);
    if (sessionIds.length === 0) return;

    // Delete set logs in these sessions
    const { error: logsError } = await supabase
      .from('set_logs')
      .delete()
      .in('session_id', sessionIds);

    if (logsError) throw logsError;

    // Delete workout sessions for these plan days
    const { error: sessError } = await supabase
      .from('workout_sessions')
      .delete()
      .in('id', sessionIds);

    if (sessError) throw sessError;
  },

  // 13. Reset / delete all workout progress logs and sessions for the user globally
  async resetAllProgress(userId: string): Promise<void> {
    const supabase = createClient();
    // Delete all set_logs
    const { error: logsError } = await supabase
      .from('set_logs')
      .delete()
      .eq('user_id', userId);

    if (logsError) throw logsError;

    // Delete all workout_sessions
    const { error: sessError } = await supabase
      .from('workout_sessions')
      .delete()
      .eq('user_id', userId);

    if (sessError) throw sessError;
  },
};
