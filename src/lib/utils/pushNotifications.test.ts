import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateNextReminderDelay,
  formatNextReminderDescription,
} from './pushNotifications';

describe('pushNotifications - Weight Reminder Scheduling Logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calculates delay accurately when target time is later today (test scenario e.g. 2 minutes ahead)', () => {
    // Current time: 2026-10-09 14:01:00
    vi.setSystemTime(new Date(2026, 9, 9, 14, 1, 0));

    // Target: 14:03 (every day: -1)
    const { delaySeconds, targetDate } = calculateNextReminderDelay('14:03', -1);

    expect(delaySeconds).toBe(120);
    expect(targetDate.getFullYear()).toBe(2026);
    expect(targetDate.getMonth()).toBe(9);
    expect(targetDate.getDate()).toBe(9);
    expect(targetDate.getHours()).toBe(14);
    expect(targetDate.getMinutes()).toBe(3);

    const desc = formatNextReminderDescription(targetDate);
    expect(desc).toContain('Oggi alle 14:03');
    expect(desc).toContain('tra 2 minuti');
  });

  it('schedules for tomorrow when target time has already passed today', () => {
    // Current time: 2026-10-09 14:01:00
    vi.setSystemTime(new Date(2026, 9, 9, 14, 1, 0));

    // Target: 08:00 (every day: -1)
    const { delaySeconds, targetDate } = calculateNextReminderDelay('08:00', -1);

    // Target should be 2026-10-10 08:00:00 (17 hours and 59 minutes = 64740 seconds)
    expect(targetDate.getDate()).toBe(10);
    expect(targetDate.getHours()).toBe(8);
    expect(targetDate.getMinutes()).toBe(0);
    expect(delaySeconds).toBe(17 * 3600 + 59 * 60);

    const desc = formatNextReminderDescription(targetDate);
    expect(desc).toContain('Domani alle 08:00');
  });

  it('schedules for specific day of the week', () => {
    // Current time: Friday, 2026-10-09 10:00:00 (day = 5)
    vi.setSystemTime(new Date(2026, 9, 9, 10, 0, 0));

    // Target: Monday (day = 1) at 07:30
    const { targetDate } = calculateNextReminderDelay('07:30', 1);

    // Next Monday is 2026-10-12
    expect(targetDate.getDay()).toBe(1);
    expect(targetDate.getDate()).toBe(12);
    expect(targetDate.getHours()).toBe(7);
    expect(targetDate.getMinutes()).toBe(30);

    const desc = formatNextReminderDescription(targetDate);
    expect(desc).toContain('07:30');
  });

  it('schedules for next week if today is the target day but the time has already passed', () => {
    // Current time: Monday, 2026-10-12 10:00:00 (day = 1)
    vi.setSystemTime(new Date(2026, 9, 12, 10, 0, 0));

    // Target: Monday (day = 1) at 08:00 (already passed)
    const { targetDate } = calculateNextReminderDelay('08:00', 1);

    // Should be next Monday: 2026-10-19
    expect(targetDate.getDay()).toBe(1);
    expect(targetDate.getDate()).toBe(19);
    expect(targetDate.getHours()).toBe(8);
    expect(targetDate.getMinutes()).toBe(0);
  });
});
