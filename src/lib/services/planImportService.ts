import { createClient } from '@/lib/supabase/client';
import { ImportedPlan } from '@/app/api/import-plan/route';
import { PlanWithDetails } from '@/types/database.types';

export const planImportService = {
  // Save reviewed imported plan to Supabase
  async saveImportedPlan(userId: string, planData: ImportedPlan): Promise<string> {
    const supabase = createClient();

    // 1. Insert plan
    const { data: newPlan, error: planError } = await supabase
      .from('plans')
      .insert({
        user_id: userId,
        name: planData.plan_name.trim() || 'Piano importato',
        notes: 'Importato da foto con AI',
        archived: false,
      } as any)
      .select()
      .single();

    if (planError || !newPlan) {
      throw new Error(`Errore creazione piano: ${planError?.message || 'Errore sconosciuto'}`);
    }

    const planId = newPlan.id;

    try {
      // 2. Insert days and exercises in order
      for (let dayIndex = 0; dayIndex < planData.days.length; dayIndex++) {
        const day = planData.days[dayIndex];

        const { data: newDay, error: dayError } = await supabase
          .from('plan_days')
          .insert({
            user_id: userId,
            plan_id: planId,
            name: day.name.trim() || `Giorno ${dayIndex + 1}`,
            position: dayIndex,
          } as any)
          .select()
          .single();

        if (dayError || !newDay) {
          throw new Error(`Errore creazione giorno "${day.name}": ${dayError?.message}`);
        }

        const dayId = newDay.id;

        // 3. Insert exercises for this day
        if (day.exercises && day.exercises.length > 0) {
          const exercisesPayload = day.exercises.map((ex, exIndex) => ({
            user_id: userId,
            plan_day_id: dayId,
            name: ex.name.trim() || `Esercizio ${exIndex + 1}`,
            position: exIndex,
            sets: ex.sets && ex.sets > 0 ? ex.sets : 3,
            reps_min: typeof ex.reps_min === 'number' && ex.reps_min >= 0 ? ex.reps_min : 8,
            reps_max:
              typeof ex.reps_max === 'number' && ex.reps_max >= 0
                ? Math.max(ex.reps_max, typeof ex.reps_min === 'number' ? ex.reps_min : 8)
                : 12,
            rest_seconds: typeof ex.rest_seconds === 'number' && ex.rest_seconds >= 0 ? ex.rest_seconds : 90,
            technique_notes: ex.technique_notes?.trim() || null,
            video_url: null,
          }));

          const { error: exError } = await supabase.from('exercises').insert(exercisesPayload as any);
          if (exError) {
            throw new Error(`Errore inserimento esercizi: ${exError.message}`);
          }
        }
      }

      return planId;
    } catch (saveError) {
      // Rollback / cleanup created plan in case of any failure
      try {
        await supabase.from('plans').delete().eq('id', planId);
      } catch (cleanupErr) {
        console.warn('Could not rollback plan creation:', cleanupErr);
      }
      throw saveError;
    }
  },
};
