/**
 * Spaced-review REMINDERS — one local notification a day at most, scheduled on
 * the phone from the review dates the phone already holds (WO-COURSE-01 F,
 * David 2026-10-27: "Can we also build push notifications plz for reminding
 * users about the repetition?").
 *
 * On the device, never a server: the due dates live only in Dexie, so the phone
 * schedules its own reminder — no APNs key, no device tokens, no Redis, no
 * cron, works offline. Native only; the web app schedules nothing.
 *
 * The rules (`planReminder`, pure):
 *  - at the student's usual training hour — the hour they most often start a
 *    session over the last 30 days (≥ 3 sessions), else 19:00 — or the hour
 *    they set in Settings;
 *  - only when something is actually due by then, saying how many;
 *  - never on a day they have already reviewed;
 *  - backing off when ignored: 3 unopened in a row → every other day; 7 →
 *    stopped, and the trainer says so with a switch to turn them back on.
 * Re-planned on every boot, every return to the background and every finished
 * review, so the count is never stale.
 */
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { db } from '../db/schema';
import { preferencesPatch } from '../db/profilePreferences';
import { useAppStore } from '../stores/appStore';
import { captureEvent } from './analytics';
import { coachNavigate } from './coachActuator';
import type { ReviewReminderPrefs } from '../types';

export const REMINDER_ID = 4201;
export const DEFAULT_HOUR = 19;
export const EVERY_OTHER_DAY_AFTER = 3;
export const STOP_AFTER = 7;
const DAY = 24 * 60 * 60 * 1000;

export const NO_REMINDERS: ReviewReminderPrefs = { enabled: false, prompted: false, ignoredInARow: 0 };

/** The hour (local) the student most often starts training. */
export function usualHour(sessionDates: readonly string[], now: number): number {
  const counts = new Map<number, number>();
  for (const d of sessionDates) {
    const t = Date.parse(d);
    if (!Number.isFinite(t) || now - t > 30 * DAY || t > now) continue;
    const h = new Date(t).getHours();
    counts.set(h, (counts.get(h) ?? 0) + 1);
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  if (total < 3) return DEFAULT_HOUR;
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
}

/** Fold the last reminder's fate into the ignore count. A reminder whose time
 *  has passed with no tap and no review since counts as ignored once. */
export function settleLastReminder(prefs: ReviewReminderPrefs, now: number): ReviewReminderPrefs {
  const last = prefs.lastScheduledFor;
  if (!last || last > now) return prefs;
  const engaged = (prefs.lastEngagedAt ?? 0) >= last;
  return {
    ...prefs,
    ignoredInARow: engaged ? 0 : prefs.ignoredInARow + 1,
    lastScheduledFor: undefined,
  };
}

export interface ReminderPlan {
  at: number;
  due: number;
}

/**
 * When to remind next, or null. `dueBy(t)` counts the cards due by time t.
 * `reviewedToday` — a review finished since local midnight.
 */
export function planReminder(args: {
  now: number;
  prefs: ReviewReminderPrefs;
  hour: number;
  reviewedToday: boolean;
  dueBy: (t: number) => number;
}): ReminderPlan | null {
  const { now, prefs, hour, reviewedToday, dueBy } = args;
  if (!prefs.enabled || prefs.ignoredInARow >= STOP_AFTER) return null;
  const today = new Date(now);
  today.setHours(hour, 0, 0, 0);
  let at = today.getTime();
  if (at <= now || reviewedToday) at += DAY;
  if (prefs.ignoredInARow >= EVERY_OTHER_DAY_AFTER) at += DAY;
  const due = dueBy(at);
  return due > 0 ? { at, due } : null;
}

/** The words. The count is real; the minutes are ~20 s a card, rounded up. */
export function reminderText(due: number): { title: string; body: string } {
  const minutes = Math.max(1, Math.ceil((due * 20) / 60));
  return {
    title: 'Opening review',
    body: `${due} position${due === 1 ? '' : 's'} due — about ${minutes} min.`,
  };
}

// ── device side ─────────────────────────────────────────────────────────────

function readPrefs(): ReviewReminderPrefs {
  return useAppStore.getState().activeProfile?.preferences.reviewReminders ?? NO_REMINDERS;
}

async function writePrefs(next: ReviewReminderPrefs): Promise<void> {
  const store = useAppStore.getState();
  const profile = store.activeProfile;
  if (!profile) return;
  await db.profiles.update(profile.id, preferencesPatch({ reviewReminders: next }));
  const now = useAppStore.getState().activeProfile ?? profile;
  store.setActiveProfile({ ...now, preferences: { ...now.preferences, reviewReminders: next } });
}

async function permissionGranted(): Promise<boolean> {
  try {
    return (await LocalNotifications.checkPermissions()).display === 'granted';
  } catch {
    return false;
  }
}

/** Re-plan the one reminder. Safe to call often; a no-op off native. */
export async function syncReviewReminder(now = Date.now()): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const settled = settleLastReminder(readPrefs(), now);
  try {
    await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] });
  } catch { /* nothing pending */ }
  if (!settled.enabled || !(await permissionGranted())) {
    if (settled !== readPrefs()) await writePrefs(settled);
    return;
  }
  const sessions = await db.sessions.toArray();
  const hour = settled.hour ?? usualHour(sessions.map((s) => s.date), now);
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  const reviewedToday = sessions.some(
    (s) => s.completed && Date.parse(s.date) >= midnight.getTime() && s.plan.blocks.some((b) => b.type === 'opening_review' || b.type === 'flashcards'),
  );
  const cards = await db.srsOpeningCards.toArray();
  const plan = planReminder({ now, prefs: settled, hour, reviewedToday, dueBy: (t) => cards.filter((c) => c.nextReviewAt <= t).length });
  if (plan) {
    const { title, body } = reminderText(plan.due);
    await LocalNotifications.schedule({
      notifications: [{ id: REMINDER_ID, title, body, schedule: { at: new Date(plan.at), allowWhileIdle: true } }],
    });
    captureEvent('review_reminder_scheduled', { due: plan.due, hour, every_other_day: settled.ignoredInARow >= EVERY_OTHER_DAY_AFTER });
  } else if (settled.ignoredInARow >= STOP_AFTER && readPrefs().ignoredInARow < STOP_AFTER) {
    captureEvent('review_reminder_stopped', { ignored: settled.ignoredInARow });
  }
  await writePrefs({ ...settled, lastScheduledFor: plan?.at });
}

/** A review finished, or a reminder was tapped: the student is engaged. */
export async function markReviewEngaged(now = Date.now()): Promise<void> {
  const prefs = readPrefs();
  await writePrefs({ ...prefs, ignoredInARow: 0, lastEngagedAt: now });
  await syncReviewReminder(now);
}

/** The student's answer to the reminder card. Yes asks iOS for permission. */
export async function answerReminderPrompt(yes: boolean): Promise<boolean> {
  let granted = false;
  if (yes && Capacitor.isNativePlatform()) {
    try {
      granted = (await LocalNotifications.requestPermissions()).display === 'granted';
    } catch {
      granted = false;
    }
  }
  await writePrefs({ ...readPrefs(), prompted: true, enabled: yes && granted, ignoredInARow: 0 });
  captureEvent(yes ? (granted ? 'review_reminder_accepted' : 'review_reminder_denied') : 'review_reminder_declined', {});
  await syncReviewReminder();
  return granted;
}

/** Should the reminder card show? Native, never answered, and something is
 *  already in review (the card follows the first Learn that adds positions). */
export async function shouldOfferReminders(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  if (readPrefs().prompted) return false;
  return (await db.srsOpeningCards.count()) > 0;
}

/** Settings switch. Turning on asks for permission when needed; a turn-on
 *  also restarts reminders the back-off stopped. `hour`: a number sets it,
 *  null returns to the usual training time, undefined leaves it. */
export async function setRemindersEnabled(enabled: boolean, hour?: number | null): Promise<void> {
  if (enabled && !(await permissionGranted())) await answerReminderPrompt(true);
  const prefs = readPrefs();
  const next: ReviewReminderPrefs = { ...prefs, prompted: true, enabled: enabled && (prefs.enabled || (await permissionGranted())), ignoredInARow: 0 };
  if (hour === null) delete next.hour;
  else if (hour !== undefined) next.hour = hour;
  await writePrefs(next);
  await syncReviewReminder();
}

let listening = false;
/** Boot: listen for a tap (opens the review) and plan the next reminder. */
export function startReviewReminders(): void {
  if (!Capacitor.isNativePlatform() || listening) return;
  listening = true;
  void LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
    if (action.notification.id !== REMINDER_ID) return;
    captureEvent('review_reminder_opened', {});
    void markReviewEngaged();
    coachNavigate('/openings/srs');
  });
  // Leaving the app is when the count is freshest — plan from it.
  void CapApp.addListener('appStateChange', ({ isActive }) => {
    if (!isActive) void syncReviewReminder();
  });
  void syncReviewReminder();
}
