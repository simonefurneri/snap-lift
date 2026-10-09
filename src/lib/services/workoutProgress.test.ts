import { describe, it, expect, vi, beforeEach } from 'vitest';
import { workoutService } from './workoutService';

// Mock Supabase client
const mockFrom = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

describe('workoutService Progress & Plan Scope', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getLoggedExercises with planId', () => {
    it('returns configured exercises from the plan and computes totalSets from session logs', async () => {
      // Mock plan_days query
      const mockDaysSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'day-1',
                name: 'Giorno A: Push',
                position: 0,
                exercises: [
                  { id: 'ex-1', name: 'Panca Piana', position: 0 },
                  { id: 'ex-2', name: 'Croci Manubri', position: 1 },
                ],
              },
            ],
            error: null,
          }),
        }),
      });

      // Mock workout_sessions query
      const mockSessionsSelect = vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: [{ id: 'sess-1' }],
          error: null,
        }),
      });

      // Mock set_logs query
      const mockLogsSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [
                { exercise_name: 'Panca Piana', created_at: '2026-10-01T10:00:00Z' },
                { exercise_name: 'Panca Piana', created_at: '2026-10-01T10:05:00Z' },
              ],
              error: null,
            }),
          }),
        }),
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'plan_days') return { select: mockDaysSelect };
        if (table === 'workout_sessions') return { select: mockSessionsSelect };
        if (table === 'set_logs') return { select: mockLogsSelect };
        return {};
      });

      const result = await workoutService.getLoggedExercises('user-1', 'plan-123');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Panca Piana');
      expect(result[0].totalSets).toBe(2);
      expect(result[0].isConfiguredInPlan).toBe(true);
      expect(result[0].dayNames).toEqual(['Giorno A: Push']);

      expect(result[1].name).toBe('Croci Manubri');
      expect(result[1].totalSets).toBe(0);
      expect(result[1].isConfiguredInPlan).toBe(true);
    });

    it('returns all unique logged exercises across workouts when planId is not provided or "all"', async () => {
      const mockLogsSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [
              { exercise_name: 'Squat', created_at: '2026-10-02T10:00:00Z' },
              { exercise_name: 'Squat', created_at: '2026-10-02T10:05:00Z' },
              { exercise_name: 'Stacco', created_at: '2026-10-03T10:00:00Z' },
            ],
            error: null,
          }),
        }),
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'set_logs') return { select: mockLogsSelect };
        return {};
      });

      const result = await workoutService.getLoggedExercises('user-1', 'all');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Squat');
      expect(result[0].totalSets).toBe(2);
      expect(result[1].name).toBe('Stacco');
      expect(result[1].totalSets).toBe(1);
    });
  });

  describe('getExerciseProgress with planId', () => {
    it('filters set_logs by session IDs belonging to the selected plan', async () => {
      // Mock plan_days query
      mockFrom.mockImplementation((table: string) => {
        if (table === 'plan_days') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ id: 'day-1' }],
                error: null,
              }),
            }),
          };
        }
        if (table === 'workout_sessions') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [{ id: 'sess-plan1' }],
                error: null,
              }),
            }),
          };
        }
        if (table === 'set_logs') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                ilike: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    in: vi.fn().mockResolvedValue({
                      data: [
                        {
                          set_number: 1,
                          weight: 80,
                          reps: 8,
                          created_at: '2026-10-01T10:00:00Z',
                          session_id: 'sess-plan1',
                        },
                        {
                          set_number: 2,
                          weight: 85,
                          reps: 6,
                          created_at: '2026-10-01T10:05:00Z',
                          session_id: 'sess-plan1',
                        },
                      ],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      const progress = await workoutService.getExerciseProgress('user-1', 'Panca Piana', 'plan-1');

      expect(progress.exerciseName).toBe('Panca Piana');
      expect(progress.allTimeMaxWeight).toBe(85);
      expect(progress.allTimeTotalVolume).toBe(80 * 8 + 85 * 6);
      expect(progress.totalWorkouts).toBe(1);
      expect(progress.weeklyPoints).toHaveLength(1);
    });

    it('returns empty progress data if plan has no sessions', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'plan_days') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ id: 'day-1' }],
                error: null,
              }),
            }),
          };
        }
        if (table === 'workout_sessions') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      const progress = await workoutService.getExerciseProgress('user-1', 'Panca Piana', 'plan-empty');

      expect(progress.weeklyPoints).toHaveLength(0);
      expect(progress.allTimeMaxWeight).toBe(0);
      expect(progress.allTimeTotalVolume).toBe(0);
    });
  });

  describe('resetPlanProgress', () => {
    it('deletes set_logs and workout_sessions belonging to the plan days', async () => {
      const mockSetLogsDelete = vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ error: null }),
      });
      const mockSessionsDelete = vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ error: null }),
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'plan_days') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ id: 'day-1' }],
                error: null,
              }),
            }),
          };
        }
        if (table === 'workout_sessions') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [{ id: 'sess-1' }],
                error: null,
              }),
            }),
            delete: mockSessionsDelete,
          };
        }
        if (table === 'set_logs') {
          return {
            delete: mockSetLogsDelete,
          };
        }
        return {};
      });

      await workoutService.resetPlanProgress('user-1', 'plan-1');

      expect(mockSetLogsDelete).toHaveBeenCalled();
      expect(mockSessionsDelete).toHaveBeenCalled();
    });
  });
});
