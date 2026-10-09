import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn(),
  }),
}));

import {
  calculateWeightStats,
  calculateChartPoints,
  filterLogsByRange,
} from './weightService';
import { BodyWeightLog } from '@/types/database.types';

describe('weightService calculations', () => {
  const mockLogs: BodyWeightLog[] = [
    {
      id: '1',
      user_id: 'user-1',
      weight: 80.0,
      recorded_at: '2026-09-01',
      notes: 'Initial check-in',
      created_at: '2026-09-01T08:00:00Z',
    },
    {
      id: '2',
      user_id: 'user-1',
      weight: 79.2,
      recorded_at: '2026-09-08',
      notes: null,
      created_at: '2026-09-08T08:00:00Z',
    },
    {
      id: '3',
      user_id: 'user-1',
      weight: 78.5,
      recorded_at: '2026-09-15',
      notes: 'Post workout',
      created_at: '2026-09-15T08:00:00Z',
    },
    {
      id: '4',
      user_id: 'user-1',
      weight: 78.0,
      recorded_at: '2026-09-22',
      notes: null,
      created_at: '2026-09-22T08:00:00Z',
    },
    {
      id: '5',
      user_id: 'user-1',
      weight: 77.4,
      recorded_at: '2026-09-29',
      notes: 'Feeling light',
      created_at: '2026-09-29T08:00:00Z',
    },
  ];

  it('calculates stats correctly for empty logs', () => {
    const stats = calculateWeightStats([]);
    expect(stats.currentWeight).toBeNull();
    expect(stats.previousWeight).toBeNull();
    expect(stats.totalEntries).toBe(0);
  });

  it('calculates stats correctly for non-empty logs', () => {
    const stats = calculateWeightStats(mockLogs);
    expect(stats.currentWeight).toBe(77.4);
    expect(stats.previousWeight).toBe(78.0);
    expect(stats.changeSinceLast).toBe(-0.6);
    expect(stats.changeAllTime).toBe(-2.6); // 77.4 - 80.0
    expect(stats.minWeight).toBe(77.4);
    expect(stats.maxWeight).toBe(80.0);
    expect(stats.totalEntries).toBe(5);
    // 77.4 vs 78.0 from 7 days ago (2026-09-22 is 7 days before 2026-09-29)
    expect(stats.change7Days).toBe(-0.6);
  });

  it('computes rolling 7-day average points properly', () => {
    const points = calculateChartPoints(mockLogs, 7);
    expect(points.length).toBe(5);
    expect(points[0].weight).toBe(80.0);
    expect(points[0].movingAvg7d).toBe(80.0);
    expect(points[4].weight).toBe(77.4);
    expect(points[4].movingAvg7d).toBe(77.4); // Since previous was 7 days prior, window [Sep 23 - Sep 29] has only Sep 29
  });

  it('computes rolling average when multiple entries fall in window', () => {
    const consecutiveLogs: BodyWeightLog[] = [
      {
        id: '1',
        user_id: 'user-1',
        weight: 80.0,
        recorded_at: '2026-10-01',
        notes: null,
        created_at: '2026-10-01T08:00:00Z',
      },
      {
        id: '2',
        user_id: 'user-1',
        weight: 81.0,
        recorded_at: '2026-10-02',
        notes: null,
        created_at: '2026-10-02T08:00:00Z',
      },
      {
        id: '3',
        user_id: 'user-1',
        weight: 82.0,
        recorded_at: '2026-10-03',
        notes: null,
        created_at: '2026-10-03T08:00:00Z',
      },
    ];

    const points = calculateChartPoints(consecutiveLogs, 7);
    expect(points[0].movingAvg7d).toBe(80.0);
    expect(points[1].movingAvg7d).toBe(80.5); // (80 + 81) / 2
    expect(points[2].movingAvg7d).toBe(81.0); // (80 + 81 + 82) / 3
  });

  it('filters logs by range correctly', () => {
    const all = filterLogsByRange(mockLogs, 'ALL');
    expect(all.length).toBe(5);

    const oneMonth = filterLogsByRange(mockLogs, '1M');
    // latest is Sep 29, 30 days cutoff is Aug 30 -> all Sep logs included
    expect(oneMonth.length).toBe(5);
  });
});
