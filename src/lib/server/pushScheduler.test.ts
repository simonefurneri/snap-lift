import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('./webPush', () => ({
  sendWebPush: vi.fn().mockResolvedValue({ statusCode: 201 }),
}));

// Mock Supabase storage
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    storage: {
      listBuckets: vi.fn().mockResolvedValue({ data: [{ name: 'timer-state' }] }),
      createBucket: vi.fn().mockResolvedValue({ data: null, error: null }),
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: null, error: null }),
        download: vi.fn().mockResolvedValue({ data: null, error: null }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    },
  })),
}));

import {
  scheduleTimerPush,
  cancelTimerPush,
  dispatchScheduledPush,
  isTimerCancelled,
  isScheduleActive,
} from './pushScheduler';
import { sendWebPush } from './webPush';

const mockSubscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint-device-1',
  keys: {
    p256dh: 'test-p256dh',
    auth: 'test-auth',
  },
} as any;

const mockPayload = {
  title: 'Recupero Terminato! ⏰',
  body: 'È ora della prossima serie!',
};

describe('pushScheduler - Comprehensive Rest Timer Notification Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Creazione (Timer creation): Schedules timer and dispatches push accurately', async () => {
    const timerId = `timer-${Date.now()}-create`;
    const res = scheduleTimerPush(timerId, 90, mockSubscription, mockPayload);

    expect(res.scheduled).toBe(true);
    expect(res.scheduleId).toBeDefined();
    expect(res.delayMs).toBe(90000);
    expect(isScheduleActive(res.scheduleId)).toBe(true);
    expect(isTimerCancelled(timerId)).toBe(false);

    // Dispatch
    const dispatched = await dispatchScheduledPush(res.scheduleId);
    expect(dispatched).toBe(true);
    expect(sendWebPush).toHaveBeenCalledTimes(1);
    expect(sendWebPush).toHaveBeenCalledWith(mockSubscription, mockPayload);
  });

  it('2. Riduzione (-15s): Previous schedule cancelled, new shorter duration scheduled', async () => {
    const endpoint = 'https://fcm.googleapis.com/fcm/send/test-reduce';
    const sub = { ...mockSubscription, endpoint };

    const timer1 = 'timer-reduce-initial';
    const res1 = scheduleTimerPush(timer1, 60, sub, mockPayload);

    // User reduces by 15s -> 45s remaining
    const timer2 = 'timer-reduce-new';
    await cancelTimerPush(timer1, endpoint);
    const res2 = scheduleTimerPush(timer2, 45, sub, mockPayload);

    expect(isScheduleActive(res1.scheduleId)).toBe(false);
    expect(isScheduleActive(res2.scheduleId)).toBe(true);
    expect(res2.delayMs).toBe(45000);

    // Old cannot dispatch
    expect(await dispatchScheduledPush(res1.scheduleId)).toBe(false);
    // New dispatches cleanly
    expect(await dispatchScheduledPush(res2.scheduleId)).toBe(true);
  });

  it('3. Aumento (+30s): Previous schedule cancelled, new longer duration scheduled', async () => {
    const endpoint = 'https://fcm.googleapis.com/fcm/send/test-increase';
    const sub = { ...mockSubscription, endpoint };

    const timer1 = 'timer-increase-initial';
    const res1 = scheduleTimerPush(timer1, 30, sub, mockPayload);

    // User taps +30s -> 60s
    const timer2 = 'timer-increase-new';
    await cancelTimerPush(timer1, endpoint);
    const res2 = scheduleTimerPush(timer2, 60, sub, mockPayload);

    expect(isScheduleActive(res1.scheduleId)).toBe(false);
    expect(isScheduleActive(res2.scheduleId)).toBe(true);
    expect(res2.delayMs).toBe(60000);

    expect(await dispatchScheduledPush(res1.scheduleId)).toBe(false);
    expect(await dispatchScheduledPush(res2.scheduleId)).toBe(true);
  });

  it('4. Presets (30s, 60s, 90s, 120s): Resetting to fixed preset cleanly updates schedule', async () => {
    const endpoint = 'https://fcm.googleapis.com/fcm/send/test-presets';
    const sub = { ...mockSubscription, endpoint };

    // Starts at 90s
    const timer1 = 'timer-preset-90';
    const res1 = scheduleTimerPush(timer1, 90, sub, mockPayload);

    // Taps preset 120s
    const timer2 = 'timer-preset-120';
    await cancelTimerPush(timer1, endpoint);
    const res2 = scheduleTimerPush(timer2, 120, sub, mockPayload);

    // Taps preset 30s
    const timer3 = 'timer-preset-30';
    await cancelTimerPush(timer2, endpoint);
    const res3 = scheduleTimerPush(timer3, 30, sub, mockPayload);

    expect(isScheduleActive(res1.scheduleId)).toBe(false);
    expect(isScheduleActive(res2.scheduleId)).toBe(false);
    expect(isScheduleActive(res3.scheduleId)).toBe(true);
    expect(res3.delayMs).toBe(30000);

    expect(await dispatchScheduledPush(res1.scheduleId)).toBe(false);
    expect(await dispatchScheduledPush(res2.scheduleId)).toBe(false);
    expect(await dispatchScheduledPush(res3.scheduleId)).toBe(true);
  });

  it('5. Sovrascrittura avviando un altro timer: Starting next set overrides old timer without getting killed by unmount', async () => {
    const endpoint = 'https://fcm.googleapis.com/fcm/send/test-overwrite';
    const sub = { ...mockSubscription, endpoint };

    // Set 1 timer starts
    const timerSet1 = 'timer-set-1';
    const resSet1 = scheduleTimerPush(timerSet1, 90, sub, mockPayload);

    // Set 2 timer starts BEFORE unmount cleanup of Set 1 finishes
    const timerSet2 = 'timer-set-2';
    const resSet2 = scheduleTimerPush(timerSet2, 90, sub, mockPayload);

    // Set 1 unmount cleanup arrives AFTER Set 2 was already scheduled!
    await cancelTimerPush(timerSet1, endpoint);

    // CRITICAL: Set 2 schedule MUST STILL BE ACTIVE!
    expect(isScheduleActive(resSet2.scheduleId)).toBe(true);
    expect(isTimerCancelled(timerSet2)).toBe(false);

    // Set 2 dispatches successfully!
    const dispatched = await dispatchScheduledPush(resSet2.scheduleId);
    expect(dispatched).toBe(true);
  });

  it('6. Play / Pause: Pausing cancels server push; Resuming reschedules with remaining duration', async () => {
    const endpoint = 'https://fcm.googleapis.com/fcm/send/test-playpause';
    const sub = { ...mockSubscription, endpoint };

    const timer1 = 'timer-pause-test';
    const res1 = scheduleTimerPush(timer1, 60, sub, mockPayload);

    // Pause clicked
    await cancelTimerPush(timer1, endpoint);
    expect(isTimerCancelled(timer1)).toBe(true);
    expect(isScheduleActive(res1.scheduleId)).toBe(false);
    expect(await dispatchScheduledPush(res1.scheduleId)).toBe(false);

    // Resume clicked with 40s remaining
    const timer2 = 'timer-resume-test';
    const res2 = scheduleTimerPush(timer2, 40, sub, mockPayload);
    expect(isTimerCancelled(timer2)).toBe(false);
    expect(isScheduleActive(res2.scheduleId)).toBe(true);
    expect(await dispatchScheduledPush(res2.scheduleId)).toBe(true);
  });

  it('7. Skip / Chiusura (Close button X or Skip): Completely cancels server push', async () => {
    const endpoint = 'https://fcm.googleapis.com/fcm/send/test-close';
    const sub = { ...mockSubscription, endpoint };

    const timer1 = 'timer-close-test';
    const res1 = scheduleTimerPush(timer1, 90, sub, mockPayload);

    await cancelTimerPush(timer1, endpoint);

    expect(isTimerCancelled(timer1)).toBe(true);
    expect(isScheduleActive(res1.scheduleId)).toBe(false);
    expect(await dispatchScheduledPush(res1.scheduleId)).toBe(false);
  });

  it('8. Deselezione serie (Uncompleting set): Cancels active rest timer immediately', async () => {
    const endpoint = 'https://fcm.googleapis.com/fcm/send/test-uncheck';
    const sub = { ...mockSubscription, endpoint };

    const timer1 = 'timer-set-uncheck';
    const res1 = scheduleTimerPush(timer1, 90, sub, mockPayload);

    // User unchecks set row -> WorkoutRunner closes RestTimer -> cancelTimerPush called
    await cancelTimerPush(timer1, endpoint);

    expect(isScheduleActive(res1.scheduleId)).toBe(false);
    expect(await dispatchScheduledPush(res1.scheduleId)).toBe(false);
  });

  it('9. Idempotency: Multiple concurrent calls to dispatch cannot send double notifications', async () => {
    const timer1 = 'timer-idempotency';
    const res1 = scheduleTimerPush(timer1, 60, mockSubscription, mockPayload);

    // Concurrent dispatch calls (e.g. from Node timer AND after() at the same instant)
    const [disp1, disp2] = await Promise.all([
      dispatchScheduledPush(res1.scheduleId),
      dispatchScheduledPush(res1.scheduleId),
    ]);

    // Exactly ONE call succeeds in claiming the dispatch
    expect(disp1 !== disp2).toBe(true);
    expect(disp1 || disp2).toBe(true);
    expect(sendWebPush).toHaveBeenCalledTimes(1);
  });
});
