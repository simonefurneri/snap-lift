import { describe, it, expect } from 'vitest';
import { calculateProgression, roundToStep, ProgressionInput } from './progression';

describe('roundToStep', () => {
  it('correctly rounds to nearest 1.25 step', () => {
    expect(roundToStep(101.2, 1.25)).toBe(101.25);
    expect(roundToStep(102.4, 1.25)).toBe(102.5);
    expect(roundToStep(100.6, 1.25)).toBe(100);
    expect(roundToStep(100.7, 1.25)).toBe(101.25);
  });

  it('correctly rounds to nearest 2.5 step', () => {
    expect(roundToStep(102.4, 2.5)).toBe(102.5);
    expect(roundToStep(101.2, 2.5)).toBe(100);
    expect(roundToStep(103.8, 2.5)).toBe(105);
  });

  it('correctly rounds to nearest 0.5 step', () => {
    expect(roundToStep(22.3, 0.5)).toBe(22.5);
    expect(roundToStep(22.1, 0.5)).toBe(22);
    expect(roundToStep(22.8, 0.5)).toBe(23);
  });
});

describe('calculateProgression', () => {
  it('returns null and status "none" when no history is provided', () => {
    const res = calculateProgression({
      previousSets: [],
      repsMin: 8,
      repsMax: 10,
      progressionPct: 2.5,
      loadStep: 1.25,
    });

    expect(res.suggestedWeight).toBeNull();
    expect(res.status).toBe('none');
    expect(res.allSetsHitMax).toBe(false);
  });

  it('returns null when previousSets is null/undefined', () => {
    const res = calculateProgression({
      previousSets: null,
      repsMin: 8,
      repsMax: 10,
      progressionPct: 2.5,
      loadStep: 1.25,
    });

    expect(res.suggestedWeight).toBeNull();
    expect(res.status).toBe('none');
  });

  it('increases weight and shows badge when ALL sets reached repsMax', () => {
    // 3 sets of 10 reps on 100kg with 8-10 target range
    const input: ProgressionInput = {
      previousSets: [
        { set_number: 1, weight: 100, reps: 10 },
        { set_number: 2, weight: 100, reps: 10 },
        { set_number: 3, weight: 100, reps: 10 },
      ],
      repsMin: 8,
      repsMax: 10,
      progressionPct: 2.5, // 100 * 1.025 = 102.5 -> rounded to 1.25 is 102.5
      loadStep: 1.25,
    };

    const res = calculateProgression(input);

    expect(res.status).toBe('increase');
    expect(res.allSetsHitMax).toBe(true);
    expect(res.suggestedWeight).toBe(102.5);
    expect(res.percentageIncreaseBadge).toBe('+2.5%');
  });

  it('ensures at least +1 loadStep if percentage increase would round down', () => {
    // 20kg with 2% increase = 20.4kg. With 1.25 step, 20.4 rounds to 20kg.
    // Logic must guarantee a step up to 21.25kg.
    const input: ProgressionInput = {
      previousSets: [
        { set_number: 1, weight: 20, reps: 12 },
        { set_number: 2, weight: 20, reps: 12 },
      ],
      repsMin: 10,
      repsMax: 12,
      progressionPct: 2,
      loadStep: 1.25,
    };

    const res = calculateProgression(input);

    expect(res.status).toBe('increase');
    expect(res.suggestedWeight).toBe(21.25);
  });

  it('recommends same weight with goal to add reps when all sets in range but not all at repsMax', () => {
    // Sets: 10, 9, 8 reps on 80kg with 8-10 range
    const input: ProgressionInput = {
      previousSets: [
        { set_number: 1, weight: 80, reps: 10 },
        { set_number: 2, weight: 80, reps: 9 },
        { set_number: 3, weight: 80, reps: 8 },
      ],
      repsMin: 8,
      repsMax: 10,
      progressionPct: 2.5,
      loadStep: 1.25,
    };

    const res = calculateProgression(input);

    expect(res.status).toBe('add_reps');
    expect(res.allSetsHitMax).toBe(false);
    expect(res.suggestedWeight).toBe(80);
    expect(res.percentageIncreaseBadge).toBeUndefined();
  });

  it('recommends consolidating same weight when at least one set is below repsMin', () => {
    // Sets: 8, 7, 5 reps on 80kg with 6-8 range (5 is < 6)
    const input: ProgressionInput = {
      previousSets: [
        { set_number: 1, weight: 80, reps: 8 },
        { set_number: 2, weight: 80, reps: 7 },
        { set_number: 3, weight: 80, reps: 5 },
      ],
      repsMin: 6,
      repsMax: 8,
      progressionPct: 2.5,
      loadStep: 1.25,
    };

    const res = calculateProgression(input);

    expect(res.status).toBe('below_range');
    expect(res.allSetsHitMax).toBe(false);
    expect(res.suggestedWeight).toBe(80);
  });
});
