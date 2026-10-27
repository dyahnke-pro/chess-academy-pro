import { describe, it, expect } from 'vitest';
import { DEFAULT_HOUR, EVERY_OTHER_DAY_AFTER, NO_REMINDERS, STOP_AFTER, planReminder, reminderText, settleLastReminder, usualHour } from './reviewReminders';
import type { ReviewReminderPrefs } from '../types';

const at = (y: number, mo: number, d: number, h: number, mi = 0): number => new Date(y, mo - 1, d, h, mi).getTime();
const NOW = at(2026, 10, 27, 10);
const ON: ReviewReminderPrefs = { ...NO_REMINDERS, enabled: true, prompted: true };

describe('usualHour', () => {
  it('is the hour the student most often starts training over the last 30 days', () => {
    const dates = [at(2026, 10, 20, 21), at(2026, 10, 22, 21, 30), at(2026, 10, 25, 8), at(2026, 10, 26, 21, 5)].map((t) => new Date(t).toISOString());
    expect(usualHour(dates, NOW)).toBe(21);
  });
  it('falls back to the evening with fewer than 3 recent sessions, and ignores old ones', () => {
    expect(usualHour([new Date(at(2026, 10, 26, 7)).toISOString()], NOW)).toBe(DEFAULT_HOUR);
    const old = [1, 2, 3].map((d) => new Date(at(2026, 8, d, 7)).toISOString());
    expect(usualHour(old, NOW)).toBe(DEFAULT_HOUR);
  });
});

describe('planReminder', () => {
  const dueBy = (n: number) => () => n;
  it('reminds today at the hour when something is due by then', () => {
    expect(planReminder({ now: NOW, prefs: ON, hour: 19, reviewedToday: false, dueBy: dueBy(14) })).toEqual({ at: at(2026, 10, 27, 19), due: 14 });
  });
  it('nothing due → no reminder', () => {
    expect(planReminder({ now: NOW, prefs: ON, hour: 19, reviewedToday: false, dueBy: dueBy(0) })).toBeNull();
  });
  it('already reviewed today, or the hour has passed → tomorrow', () => {
    expect(planReminder({ now: NOW, prefs: ON, hour: 19, reviewedToday: true, dueBy: dueBy(3) })?.at).toBe(at(2026, 10, 28, 19));
    expect(planReminder({ now: NOW, prefs: ON, hour: 8, reviewedToday: false, dueBy: dueBy(3) })?.at).toBe(at(2026, 10, 28, 8));
  });
  it('backs off: every other day after 3 ignored, stopped after 7', () => {
    const every = planReminder({ now: NOW, prefs: { ...ON, ignoredInARow: EVERY_OTHER_DAY_AFTER }, hour: 19, reviewedToday: false, dueBy: dueBy(3) });
    expect(every?.at).toBe(at(2026, 10, 28, 19));
    expect(planReminder({ now: NOW, prefs: { ...ON, ignoredInARow: STOP_AFTER }, hour: 19, reviewedToday: false, dueBy: dueBy(3) })).toBeNull();
  });
  it('off → never', () => {
    expect(planReminder({ now: NOW, prefs: NO_REMINDERS, hour: 19, reviewedToday: false, dueBy: dueBy(9) })).toBeNull();
  });
});

describe('settleLastReminder', () => {
  it('a reminder that fired with no tap and no review counts as ignored once', () => {
    const s = settleLastReminder({ ...ON, ignoredInARow: 2, lastScheduledFor: NOW - 1000 }, NOW);
    expect(s.ignoredInARow).toBe(3);
    expect(s.lastScheduledFor).toBeUndefined();
    expect(settleLastReminder(s, NOW).ignoredInARow).toBe(3); // settled once only
  });
  it('a tap or a review after it resets the count', () => {
    expect(settleLastReminder({ ...ON, ignoredInARow: 5, lastScheduledFor: NOW - 5000, lastEngagedAt: NOW - 1000 }, NOW).ignoredInARow).toBe(0);
  });
  it('a reminder still in the future is not settled', () => {
    const p = { ...ON, ignoredInARow: 1, lastScheduledFor: NOW + 1000 };
    expect(settleLastReminder(p, NOW)).toBe(p);
  });
});

describe('reminderText', () => {
  it('states the real count and a rough time', () => {
    expect(reminderText(14).body).toBe('14 positions due — about 5 min.');
    expect(reminderText(1).body).toBe('1 position due — about 1 min.');
  });
});
