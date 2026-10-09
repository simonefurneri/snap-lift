import { createClient } from '@/lib/supabase/client';

export const dataExportService = {
  // 1. Export complete account data as JSON
  async exportAllDataAsJson(userId: string): Promise<void> {
    const supabase = createClient();

    // Fetch all user records
    const [
      { data: profile },
      { data: plans },
      { data: planDays },
      { data: exercises },
      { data: sessions },
      { data: setLogs },
      { data: weightLogs },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('plans').select('*').eq('user_id', userId),
      supabase.from('plan_days').select('*'),
      supabase.from('exercises').select('*'),
      supabase.from('workout_sessions').select('*').eq('user_id', userId),
      supabase.from('set_logs').select('*').eq('user_id', userId),
      supabase.from('body_weight_logs').select('*').eq('user_id', userId).order('recorded_at', { ascending: true }),
    ]);

    // Filter days and exercises belonging to user's plans
    const userPlanIds = new Set((plans || []).map((p) => p.id));
    const userDays = (planDays || []).filter((d) => userPlanIds.has(d.plan_id));
    const userDayIds = new Set(userDays.map((d) => d.id));
    const userExercises = (exercises || []).filter((e) => userDayIds.has(e.plan_day_id));

    const exportPayload = {
      exported_at: new Date().toISOString(),
      app: 'SnapLift Workout Tracker',
      version: '1.0',
      profile,
      body_weight_logs: weightLogs || [],
      plans: (plans || []).map((plan) => ({
        ...plan,
        days: userDays
          .filter((d) => d.plan_id === plan.id)
          .map((day) => ({
            ...day,
            exercises: userExercises.filter((e) => e.plan_day_id === day.id),
          })),
      })),
      workout_sessions: (sessions || []).map((session) => ({
        ...session,
        set_logs: (setLogs || []).filter((log) => log.session_id === session.id),
      })),
    };

    // Trigger download
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `snaplift-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  // 2. Export workout history as CSV
  async exportWorkoutsAsCsv(userId: string): Promise<void> {
    const supabase = createClient();

    const [{ data: sessions }, { data: setLogs }] = await Promise.all([
      supabase.from('workout_sessions').select('*').eq('user_id', userId),
      supabase.from('set_logs').select('*').eq('user_id', userId),
    ]);

    const sessionMap = new Map((sessions || []).map((s) => [s.id, s]));

    const headers = [
      'Data Sessione',
      'Orario Inizio',
      'ID Sessione',
      'Esercizio',
      'Numero Serie',
      'Carico (kg)',
      'Ripetizioni',
      'Volume (kg)',
      'Completata',
    ];

    const rows: string[][] = [];

    (setLogs || []).forEach((log) => {
      const session = sessionMap.get(log.session_id);
      const sessionDate = session ? new Date(session.started_at).toLocaleDateString('it-IT') : '';
      const sessionTime = session ? new Date(session.started_at).toLocaleTimeString('it-IT') : '';
      const weight = log.weight || 0;
      const reps = log.reps || 0;
      const volume = weight * reps;

      rows.push([
        `"${sessionDate}"`,
        `"${sessionTime}"`,
        `"${log.session_id}"`,
        `"${(log.exercise_name || '').replace(/"/g, '""')}"`,
        `${log.set_number}`,
        `${weight}`,
        `${reps}`,
        `${volume}`,
        `"${(log as any).is_completed !== false ? 'Sì' : 'No'}"`,
      ]);
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    // Trigger download
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `snaplift-storico-allenamenti-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  // 3. Export body weight history as CSV
  async exportWeightsAsCsv(userId: string): Promise<void> {
    const supabase = createClient();

    const { data: weightLogs, error } = await supabase
      .from('body_weight_logs')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false });

    if (error) {
      console.error('[dataExportService] exportWeightsAsCsv error:', error);
      throw error;
    }

    const headers = ['Data Rilevazione', 'Peso (kg)', 'Note', 'Registrato Il'];
    const rows: string[][] = [];

    (weightLogs || []).forEach((log) => {
      const recordedDate = log.recorded_at ? new Date(log.recorded_at).toLocaleDateString('it-IT') : '';
      const createdAt = log.created_at ? new Date(log.created_at).toLocaleString('it-IT') : '';
      const notes = (log.notes || '').replace(/"/g, '""');

      rows.push([
        `"${recordedDate}"`,
        `${log.weight}`,
        `"${notes}"`,
        `"${createdAt}"`,
      ]);
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `snaplift-storico-peso-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
