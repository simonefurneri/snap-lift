import { createClient } from '@/lib/supabase/client';
import {
  Plan,
  PlanDay,
  Exercise,
  PlanWithDetails,
  PlanInsert,
  PlanUpdate,
  PlanDayInsert,
  PlanDayUpdate,
  ExerciseInsert,
  ExerciseUpdate,
} from '@/types/database.types';

export const planService = {
  // 1. Get all plans for user
  async getPlans(userId: string, includeArchived: boolean = false): Promise<PlanWithDetails[]> {
    const supabase = createClient();
    let query = supabase
      .from('plans')
      .select(`
        *,
        days:plan_days(
          *,
          exercises(*)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!includeArchived) {
      query = query.eq('archived', false);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Sort nested days and exercises by position
    const sorted = ((data as any[]) || []).map((plan: any) => {
      const days = (plan.days || [])
        .sort((a: any, b: any) => a.position - b.position)
        .map((day: any) => ({
          ...day,
          exercises: (day.exercises || []).sort((a: any, b: any) => a.position - b.position),
        }));
      return { ...plan, days };
    });

    return sorted as PlanWithDetails[];
  },

  // 2. Get single plan by ID
  async getPlanById(planId: string): Promise<PlanWithDetails | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('plans')
      .select(`
        *,
        days:plan_days(
          *,
          exercises(*)
        )
      `)
      .eq('id', planId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    const planData = data as any;
    const sortedDays = (planData.days || [])
      .sort((a: any, b: any) => a.position - b.position)
      .map((day: any) => ({
        ...day,
        exercises: (day.exercises || []).sort((a: any, b: any) => a.position - b.position),
      }));

    return {
      ...planData,
      days: sortedDays,
    } as PlanWithDetails;
  },

  // 3. Create plan
  async createPlan(userId: string, name: string, notes?: string): Promise<PlanWithDetails> {
    const supabase = createClient();
    const newPlanPayload: PlanInsert = {
      user_id: userId,
      name: name.trim(),
      notes: notes?.trim() || null,
    };

    const { data: newPlan, error: planError } = await supabase
      .from('plans')
      .insert(newPlanPayload as any)
      .select()
      .single();

    if (planError) throw planError;

    const planObj = newPlan as Plan;

    // Create a default first day
    const firstDayPayload: PlanDayInsert = {
      user_id: userId,
      plan_id: planObj.id,
      name: 'Giorno 1',
      position: 0,
    };

    const { data: firstDay, error: dayError } = await supabase
      .from('plan_days')
      .insert(firstDayPayload as any)
      .select()
      .single();

    if (dayError) throw dayError;

    const dayObj = firstDay as PlanDay;

    return {
      ...planObj,
      days: [
        {
          ...dayObj,
          exercises: [],
        },
      ],
    };
  },

  // 4. Update plan details
  async updatePlan(planId: string, updates: { name?: string; notes?: string | null; archived?: boolean }) {
    const supabase = createClient();
    const payload: PlanUpdate = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('plans')
      .update(payload as any)
      .eq('id', planId);

    if (error) throw error;
  },

  // 5. Duplicate plan (deep copy: plan + days + exercises)
  async duplicatePlan(planId: string, userId: string): Promise<string> {
    const supabase = createClient();
    // Fetch full plan with days & exercises
    const original = await this.getPlanById(planId);
    if (!original) throw new Error('Piano non trovato');

    // Insert new plan
    const { data: newPlan, error: planError } = await supabase
      .from('plans')
      .insert({
        user_id: userId,
        name: `${original.name} (Copia)`,
        notes: original.notes,
        archived: false,
      } as any)
      .select()
      .single();

    if (planError) throw planError;
    const planObj = newPlan as Plan;

    // Insert days & exercises
    for (const day of original.days) {
      const { data: newDay, error: dayError } = await supabase
        .from('plan_days')
        .insert({
          user_id: userId,
          plan_id: planObj.id,
          name: day.name,
          position: day.position,
        } as any)
        .select()
        .single();

      if (dayError) throw dayError;
      const dayObj = newDay as PlanDay;

      if (day.exercises && day.exercises.length > 0) {
        const exercisesToInsert = day.exercises.map((ex) => ({
          user_id: userId,
          plan_day_id: dayObj.id,
          name: ex.name,
          position: ex.position,
          sets: ex.sets,
          reps_min: ex.reps_min,
          reps_max: ex.reps_max,
          rest_seconds: ex.rest_seconds,
          technique_notes: ex.technique_notes,
          video_url: ex.video_url,
        }));

        const { error: exError } = await supabase.from('exercises').insert(exercisesToInsert as any);
        if (exError) throw exError;
      }
    }

    return planObj.id;
  },

  // 6. Delete plan
  async deletePlan(planId: string) {
    const supabase = createClient();
    const { error } = await supabase.from('plans').delete().eq('id', planId);
    if (error) throw error;
  },

  // 7. Add plan day
  async addPlanDay(planId: string, userId: string, name: string, position: number): Promise<PlanDay> {
    const supabase = createClient();
    const payload: PlanDayInsert = {
      user_id: userId,
      plan_id: planId,
      name: name.trim(),
      position,
    };

    const { data, error } = await supabase
      .from('plan_days')
      .insert(payload as any)
      .select()
      .single();

    if (error) throw error;
    return data as PlanDay;
  },

  // 8. Update plan day
  async updatePlanDay(dayId: string, updates: { name?: string; position?: number }) {
    const supabase = createClient();
    const payload: PlanDayUpdate = updates;
    const { error } = await supabase.from('plan_days').update(payload as any).eq('id', dayId);
    if (error) throw error;
  },

  // 9. Reorder plan days
  async reorderPlanDays(planId: string, orderedDayIds: string[]) {
    const supabase = createClient();
    const updates = orderedDayIds.map((id, index) =>
      supabase.from('plan_days').update({ position: index } as any).eq('id', id)
    );
    await Promise.all(updates);
  },

  // 10. Delete plan day
  async deletePlanDay(dayId: string) {
    const supabase = createClient();
    const { error } = await supabase.from('plan_days').delete().eq('id', dayId);
    if (error) throw error;
  },

  // 11. Add exercise
  async addExercise(
    userId: string,
    exerciseData: {
      plan_day_id: string;
      name: string;
      position: number;
      sets: number;
      reps_min: number;
      reps_max: number;
      rest_seconds: number;
      technique_notes?: string | null;
      video_url?: string | null;
    }
  ): Promise<Exercise> {
    const supabase = createClient();
    const payload: ExerciseInsert = {
      user_id: userId,
      plan_day_id: exerciseData.plan_day_id,
      name: exerciseData.name.trim(),
      position: exerciseData.position,
      sets: exerciseData.sets,
      reps_min: exerciseData.reps_min,
      reps_max: exerciseData.reps_max,
      rest_seconds: exerciseData.rest_seconds,
      technique_notes: exerciseData.technique_notes?.trim() || null,
      video_url: exerciseData.video_url?.trim() || null,
    };

    const { data, error } = await supabase
      .from('exercises')
      .insert(payload as any)
      .select()
      .single();

    if (error) throw error;
    return data as Exercise;
  },

  // 12. Update exercise
  async updateExercise(
    exerciseId: string,
    updates: Partial<Omit<Exercise, 'id' | 'created_at' | 'updated_at'>>
  ) {
    const supabase = createClient();
    const payload: ExerciseUpdate = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('exercises')
      .update(payload as any)
      .eq('id', exerciseId);

    if (error) throw error;
  },

  // 13. Reorder exercises
  async reorderExercises(dayId: string, orderedExerciseIds: string[]) {
    const supabase = createClient();
    const updates = orderedExerciseIds.map((id, index) =>
      supabase.from('exercises').update({ position: index } as any).eq('id', id)
    );
    await Promise.all(updates);
  },

  // 14. Delete exercise
  async deleteExercise(exerciseId: string) {
    const supabase = createClient();
    const { error } = await supabase.from('exercises').delete().eq('id', exerciseId);
    if (error) throw error;
  },
};
