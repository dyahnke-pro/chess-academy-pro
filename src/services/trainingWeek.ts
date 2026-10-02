/**
 * trainingWeek — today's ring, trained days, the gold week and the opening a
 * gold week earns (David 2026-10-01).
 *
 *   - Three short app-suggested bites fill TODAY'S RING; the third closes it.
 *   - A closed ring is a TRAINED DAY. Days are counted per WEEK (5/7), never as
 *     a consecutive streak: one missed day must not send anyone back to zero
 *     (a broken streak is where people quit).
 *   - 5 trained days in a week is a GOLD WEEK.
 *   - A gold week earns ONE free opening, at most one per calendar month, for
 *     free users on paywall builds only (the web app is already unlocked; Pro
 *     already has everything).
 *
 * The date maths is pure and tested; persistence is two meta rows.
 */
import { db } from '../db/schema';

export const RING_SIZE = 3;
export const GOLD_WEEK_DAYS = 5;

const DAYS_KEY = 'training_ring_days_v1';
const EARNED_MONTH_KEY = 'training_opening_earned_month_v1';

/** Local calendar day, YYYY-MM-DD. */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Monday of the week containing `d` (local), as a day key. */
export function weekStartKey(d: Date): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // Mon=0 … Sun=6
  x.setDate(x.getDate() - dow);
  return dayKey(x);
}

export function monthKey(d: Date): string {
  return dayKey(d).slice(0, 7);
}

/** Trained days in the week containing `now`. */
export function daysTrainedThisWeek(days: readonly string[], now: Date): number {
  const wk = weekStartKey(now);
  return new Set(days.filter((k) => weekStartKey(new Date(`${k}T12:00:00`)) === wk)).size;
}

export interface EarnInput {
  daysThisWeek: number;
  /** YYYY-MM of the last opening earned by training, or null. */
  earnedMonth: string | null;
  now: Date;
  /** Paywall live on this build AND the student is not Pro. */
  freeUserOnPaywall: boolean;
}

/** Does closing today's ring earn an opening? Pure. */
export function earnsOpening(i: EarnInput): boolean {
  return i.freeUserOnPaywall
    && i.daysThisWeek >= GOLD_WEEK_DAYS
    && i.earnedMonth !== monthKey(i.now);
}

async function readList(key: string): Promise<string[]> {
  try {
    const rec = await db.meta.get(key);
    const v: unknown = JSON.parse(rec?.value ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export async function getTrainedDays(): Promise<string[]> {
  return readList(DAYS_KEY);
}

export interface RingCloseResult {
  /** True the first time today's ring closes (fires the fanfare once). */
  firstCloseToday: boolean;
  daysThisWeek: number;
  goldWeek: boolean;
  earnedOpening: boolean;
}

/**
 * Today's ring just closed. Records the trained day (idempotent), and — on a
 * gold week, once a month, for a free user on a paywall build — grants the
 * training opening through `grant`.
 */
export async function recordRingClosed(
  now: Date,
  freeUserOnPaywall: boolean,
  grant: () => Promise<unknown>,
): Promise<RingCloseResult> {
  const days = await readList(DAYS_KEY);
  const today = dayKey(now);
  const firstCloseToday = !days.includes(today);
  const next = firstCloseToday ? [...days, today].slice(-60) : days;
  if (firstCloseToday) await db.meta.put({ key: DAYS_KEY, value: JSON.stringify(next) });
  const daysThisWeek = daysTrainedThisWeek(next, now);
  let earnedOpening = false;
  if (firstCloseToday) {
    const rec = await db.meta.get(EARNED_MONTH_KEY).catch(() => undefined);
    if (earnsOpening({ daysThisWeek, earnedMonth: rec?.value ?? null, now, freeUserOnPaywall })) {
      await grant();
      await db.meta.put({ key: EARNED_MONTH_KEY, value: monthKey(now) });
      earnedOpening = true;
    }
  }
  return { firstCloseToday, daysThisWeek, goldWeek: daysThisWeek >= GOLD_WEEK_DAYS, earnedOpening };
}
