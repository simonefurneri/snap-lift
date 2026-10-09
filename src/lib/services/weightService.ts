import { createClient } from '@/lib/supabase/client';
import { BodyWeightLog } from '@/types/database.types';

export type TimeRangeFilter = '1M' | '3M' | '6M' | '1Y' | 'ALL';

export interface WeightStats {
  currentWeight: number | null;
  previousWeight: number | null;
  changeSinceLast: number | null;
  changeSinceLastPct: number | null;
  change7Days: number | null;
  change7DaysPct: number | null;
  change30Days: number | null;
  change30DaysPct: number | null;
  changeAllTime: number | null;
  changeAllTimePct: number | null;
  minWeight: number | null;
  maxWeight: number | null;
  avgWeight: number | null;
  totalEntries: number;
}

export interface WeightChartPoint {
  id: string;
  date: string; // YYYY-MM-DD
  displayDate: string; // e.g. 14 ott
  weight: number;
  movingAvg7d: number;
  notes?: string | null;
}

/**
 * Pure calculation helper: Computes KPI stats from chronological logs
 */
export function calculateWeightStats(chronologicalLogs: BodyWeightLog[]): WeightStats {
  if (chronologicalLogs.length === 0) {
    return {
      currentWeight: null,
      previousWeight: null,
      changeSinceLast: null,
      changeSinceLastPct: null,
      change7Days: null,
      change7DaysPct: null,
      change30Days: null,
      change30DaysPct: null,
      changeAllTime: null,
      changeAllTimePct: null,
      minWeight: null,
      maxWeight: null,
      avgWeight: null,
      totalEntries: 0,
    };
  }

  const latestIndex = chronologicalLogs.length - 1;
  const current = chronologicalLogs[latestIndex];
  const currentWeight = current.weight;
  const currentDate = new Date(current.recorded_at).getTime();

  // Previous weight (penultimate entry)
  let previousWeight: number | null = null;
  let changeSinceLast: number | null = null;
  let changeSinceLastPct: number | null = null;

  if (chronologicalLogs.length > 1) {
    previousWeight = chronologicalLogs[latestIndex - 1].weight;
    changeSinceLast = Math.round((currentWeight - previousWeight) * 100) / 100;
    changeSinceLastPct =
      previousWeight > 0
        ? Math.round(((currentWeight - previousWeight) / previousWeight) * 1000) / 10
        : null;
  }

  // 7 days ago comparison (closest entry between 5 and 9 days ago, or oldest before 7d)
  let change7Days: number | null = null;
  let change7DaysPct: number | null = null;
  const target7d = currentDate - 7 * 24 * 60 * 60 * 1000;

  // 30 days ago comparison
  let change30Days: number | null = null;
  let change30DaysPct: number | null = null;
  const target30d = currentDate - 30 * 24 * 60 * 60 * 1000;

  // Find closest logs to 7d and 30d targets
  let closest7dLog: BodyWeightLog | null = null;
  let closest7dDiff = Infinity;
  let closest30dLog: BodyWeightLog | null = null;
  let closest30dDiff = Infinity;

  for (let i = 0; i < latestIndex; i++) {
    const log = chronologicalLogs[i];
    const logTime = new Date(log.recorded_at).getTime();
    
    // Check 7d
    const diff7 = Math.abs(logTime - target7d);
    if (diff7 < closest7dDiff && diff7 <= 4 * 24 * 60 * 60 * 1000) {
      closest7dDiff = diff7;
      closest7dLog = log;
    }

    // Check 30d
    const diff30 = Math.abs(logTime - target30d);
    if (diff30 < closest30dDiff && diff30 <= 10 * 24 * 60 * 60 * 1000) {
      closest30dDiff = diff30;
      closest30dLog = log;
    }
  }

  if (closest7dLog) {
    change7Days = Math.round((currentWeight - closest7dLog.weight) * 100) / 100;
    change7DaysPct =
      closest7dLog.weight > 0
        ? Math.round(((currentWeight - closest7dLog.weight) / closest7dLog.weight) * 1000) / 10
        : null;
  }

  if (closest30dLog) {
    change30Days = Math.round((currentWeight - closest30dLog.weight) * 100) / 100;
    change30DaysPct =
      closest30dLog.weight > 0
        ? Math.round(((currentWeight - closest30dLog.weight) / closest30dLog.weight) * 1000) / 10
        : null;
  }

  // All time comparison (vs first entry)
  const first = chronologicalLogs[0];
  const changeAllTime = Math.round((currentWeight - first.weight) * 100) / 100;
  const changeAllTimePct =
    first.weight > 0
      ? Math.round(((currentWeight - first.weight) / first.weight) * 1000) / 10
      : null;

  // Min, Max, Avg
  let min = chronologicalLogs[0].weight;
  let max = chronologicalLogs[0].weight;
  let sum = 0;

  for (const log of chronologicalLogs) {
    if (log.weight < min) min = log.weight;
    if (log.weight > max) max = log.weight;
    sum += log.weight;
  }

  const avgWeight = Math.round((sum / chronologicalLogs.length) * 100) / 100;

  return {
    currentWeight,
    previousWeight,
    changeSinceLast,
    changeSinceLastPct,
    change7Days,
    change7DaysPct,
    change30Days,
    change30DaysPct,
    changeAllTime,
    changeAllTimePct,
    minWeight: min,
    maxWeight: max,
    avgWeight,
    totalEntries: chronologicalLogs.length,
  };
}

/**
 * Pure calculation helper: Computes 7-day rolling moving average points
 */
export function calculateChartPoints(
  chronologicalLogs: BodyWeightLog[],
  windowDays = 7
): WeightChartPoint[] {
  if (chronologicalLogs.length === 0) return [];

  const points: WeightChartPoint[] = [];

  for (let i = 0; i < chronologicalLogs.length; i++) {
    const currentLog = chronologicalLogs[i];
    const currentDate = new Date(currentLog.recorded_at);
    const windowStart = new Date(currentDate.getTime() - (windowDays - 1) * 24 * 60 * 60 * 1000);

    // Collect all weights in the rolling window [windowStart, currentDate]
    let windowSum = 0;
    let windowCount = 0;

    for (let j = 0; j <= i; j++) {
      const candidateDate = new Date(chronologicalLogs[j].recorded_at);
      if (candidateDate >= windowStart && candidateDate <= currentDate) {
        windowSum += chronologicalLogs[j].weight;
        windowCount++;
      }
    }

    const movingAvg = windowCount > 0 ? Math.round((windowSum / windowCount) * 100) / 100 : currentLog.weight;

    const day = currentDate.getDate();
    const month = currentDate.toLocaleDateString('it-IT', { month: 'short' });

    points.push({
      id: currentLog.id,
      date: currentLog.recorded_at,
      displayDate: `${day} ${month}`,
      weight: currentLog.weight,
      movingAvg7d: movingAvg,
      notes: currentLog.notes,
    });
  }

  return points;
}

/**
 * Filter chronological logs by time range
 */
export function filterLogsByRange(
  chronologicalLogs: BodyWeightLog[],
  range: TimeRangeFilter
): BodyWeightLog[] {
  if (range === 'ALL' || chronologicalLogs.length === 0) {
    return chronologicalLogs;
  }

  const latestDate = new Date(chronologicalLogs[chronologicalLogs.length - 1].recorded_at).getTime();
  let days = 30;

  switch (range) {
    case '1M':
      days = 30;
      break;
    case '3M':
      days = 90;
      break;
    case '6M':
      days = 180;
      break;
    case '1Y':
      days = 365;
      break;
  }

  const cutoff = latestDate - days * 24 * 60 * 60 * 1000;
  return chronologicalLogs.filter((log) => new Date(log.recorded_at).getTime() >= cutoff);
}

export const weightService = {
  /**
   * Fetch all weight logs for a user, sorted ascending by recorded_at
   */
  async getWeightLogs(userId: string): Promise<BodyWeightLog[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('body_weight_logs')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: true });

    if (error) {
      console.error('[weightService] getWeightLogs error:', error);
      throw error;
    }

    return (data || []).map((row) => ({
      ...row,
      weight: Number(row.weight),
    }));
  },

  /**
   * Log or update today's/selected date's weight (upsert on unique user_id + recorded_at)
   */
  async logWeight(
    userId: string,
    weight: number,
    recordedAt?: string,
    notes?: string | null
  ): Promise<BodyWeightLog> {
    const supabase = createClient();
    const dateStr = recordedAt || new Date().toISOString().split('T')[0];
    const roundedWeight = Math.round(weight * 100) / 100;

    const { data, error } = await supabase
      .from('body_weight_logs')
      .upsert(
        {
          user_id: userId,
          weight: roundedWeight,
          recorded_at: dateStr,
          notes: notes?.trim() || null,
        },
        { onConflict: 'user_id, recorded_at' }
      )
      .select()
      .single();

    if (error) {
      console.error('[weightService] logWeight error:', error);
      throw error;
    }

    return {
      ...data,
      weight: Number(data.weight),
    };
  },

  /**
   * Update an existing weight log by ID
   */
  async updateWeightLog(
    id: string,
    weight: number,
    recordedAt: string,
    notes?: string | null
  ): Promise<BodyWeightLog> {
    const supabase = createClient();
    const roundedWeight = Math.round(weight * 100) / 100;

    const { data, error } = await supabase
      .from('body_weight_logs')
      .update({
        weight: roundedWeight,
        recorded_at: recordedAt,
        notes: notes?.trim() || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[weightService] updateWeightLog error:', error);
      throw error;
    }

    return {
      ...data,
      weight: Number(data.weight),
    };
  },

  /**
   * Delete a single weight log by ID
   */
  async deleteWeightLog(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from('body_weight_logs').delete().eq('id', id);

    if (error) {
      console.error('[weightService] deleteWeightLog error:', error);
      throw error;
    }
  },

  /**
   * Reset all weight logs for a user
   */
  async resetAllWeightLogs(userId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from('body_weight_logs').delete().eq('user_id', userId);

    if (error) {
      console.error('[weightService] resetAllWeightLogs error:', error);
      throw error;
    }
  },
};
