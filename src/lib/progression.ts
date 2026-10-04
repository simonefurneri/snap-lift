/**
 * Pure Progression Calculation Module for SnapLift
 * Calculates suggested load based on historical performance, rep ranges,
 * progression percentage, and equipment load step.
 */

export interface PreviousSetLog {
  set_number: number;
  weight: number;
  reps: number;
}

export interface ProgressionInput {
  previousSets?: PreviousSetLog[] | null;
  repsMin: number;
  repsMax: number;
  progressionPct: number; // e.g. 2.5
  loadStep: number; // e.g. 1.25
}

export type ProgressionStatus =
  | 'none'
  | 'increase'
  | 'add_reps'
  | 'below_range';

export interface ProgressionResult {
  suggestedWeight: number | null;
  status: ProgressionStatus;
  percentageIncreaseBadge?: string;
  message: string;
  allSetsHitMax: boolean;
  previousWeight: number | null;
}

/**
 * Rounds a number to the nearest multiple of step, cleanly avoiding JS floating-point issues.
 */
export function roundToStep(value: number, step: number): number {
  if (step <= 0) return Math.round(value * 100) / 100;
  const multiplier = 1 / step;
  const rounded = Math.round(value * multiplier) / multiplier;
  // Clean decimal precision up to 2 decimal places
  return Number(rounded.toFixed(2));
}

/**
 * Calculates suggested weight for the next session based on previous set performance.
 */
export function calculateProgression(input: ProgressionInput): ProgressionResult {
  const { previousSets, repsMin, repsMax, progressionPct, loadStep } = input;

  // 1. No historical data
  if (!previousSets || previousSets.length === 0) {
    return {
      suggestedWeight: null,
      status: 'none',
      message: 'Nessuno storico precedente per questo esercizio.',
      allSetsHitMax: false,
      previousWeight: null,
    };
  }

  // Find baseline previous weight (using maximum weight achieved in previous session)
  const previousWeight = Math.max(...previousSets.map((s) => Number(s.weight) || 0));

  if (previousWeight <= 0) {
    return {
      suggestedWeight: null,
      status: 'none',
      message: 'Carico precedente non valido.',
      allSetsHitMax: false,
      previousWeight: 0,
    };
  }

  const allSetsHitMax = previousSets.every((s) => s.reps >= repsMax);
  const allSetsInRange = previousSets.every((s) => s.reps >= repsMin);
  const hasUnderReps = previousSets.some((s) => s.reps < repsMin);

  // 2. All sets reached or exceeded reps_max -> INCREASE LOAD
  if (allSetsHitMax) {
    const rawTarget = previousWeight * (1 + progressionPct / 100);
    let suggestedWeight = roundToStep(rawTarget, loadStep);

    // If rounding resulted in the exact same weight, step it up by at least 1 load step
    if (suggestedWeight <= previousWeight && loadStep > 0) {
      suggestedWeight = roundToStep(previousWeight + loadStep, loadStep);
    }

    const formattedPct = Number(progressionPct.toFixed(1));

    return {
      suggestedWeight,
      status: 'increase',
      percentageIncreaseBadge: `+${formattedPct}%`,
      message: `Tutte le serie chiuse a ${repsMax} reps! Incremento del ${formattedPct}% suggerito.`,
      allSetsHitMax: true,
      previousWeight,
    };
  }

  // 3. All sets are within [repsMin, repsMax], but not all hit repsMax -> SAME LOAD, ADD REPS
  if (allSetsInRange) {
    return {
      suggestedWeight: previousWeight,
      status: 'add_reps',
      message: `Serie completate nel range (${repsMin}-${repsMax}). Mantieni ${previousWeight} e punta a raggiungere ${repsMax} reps su tutte le serie.`,
      allSetsHitMax: false,
      previousWeight,
    };
  }

  // 4. At least one set below repsMin -> SAME LOAD (OR MAINTAIN/CONSOLIDATE)
  return {
    suggestedWeight: previousWeight,
    status: 'below_range',
    message: `Almeno una serie sotto il target di ${repsMin} reps. Consolida l'esecuzione con ${previousWeight}.`,
    allSetsHitMax: false,
    previousWeight,
  };
}
