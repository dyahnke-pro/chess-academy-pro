/**
 * firstRunJourney — the first five minutes (David 2026-10-18: "Drop them into
 * learn with coach. Then import, then pick an opening.").
 *
 * Measured on 64 real new App Store users: 73% used the app on one day, the
 * median first hour lasted 2.5 minutes, and they spent it browsing menus — 13
 * ever reached a game with the coach. So a new install no longer starts at a
 * menu. It walks one path, one step at a time:
 *
 *   learn   → a game with the coach, on the board, at once
 *   import  → after that game: bring your Chess.com / Lichess games
 *   opening → after import (or a skip): pick your free opening
 *   done
 *
 * And no paywall while the journey is young (`journeyShieldsPaywall`): the
 * first session shows the product, never the price.
 *
 * Existing installs are 'done' the first time this runs (retroactive handling):
 * anyone with games, a record, or free-tier use already knows the app.
 */
import { db } from '../db/schema';

export type FirstRunStep = 'learn' | 'import' | 'opening' | 'done';

const STEP_KEY = 'first_run_step';
const STARTED_KEY = 'first_run_started_at';
/** The paywall stays away this long after a new install starts the journey. */
export const JOURNEY_SHIELD_MS = 24 * 60 * 60 * 1000;

const ORDER: readonly FirstRunStep[] = ['learn', 'import', 'opening', 'done'];

async function readMeta(key: string): Promise<string | null> {
  try {
    const row = await db.meta.get(key);
    return row?.value ?? null;
  } catch {
    return null;
  }
}

async function writeMeta(key: string, value: string): Promise<void> {
  try { await db.meta.put({ key, value }); } catch { /* best effort */ }
}

function notify(): void {
  try { window.dispatchEvent(new CustomEvent('first-run-step')); } catch { /* no window */ }
}

/** Whether this install already knows the app (so it skips the journey). */
async function isEstablishedInstall(): Promise<boolean> {
  try {
    // The review samples are seeded on demand, not by the student — they are
    // not use. (The free-tier row is not read either: a referral sync can
    // write it on a brand-new install's first boot.)
    const [games, evidence, tags] = await Promise.all([
      db.games.filter((g) => !g.id.startsWith('sample-')).count(),
      db.capabilityEvidence.count(),
      db.misconceptionTags.count(),
    ]);
    return games > 0 || evidence > 0 || tags > 0;
  } catch {
    return true; // unreadable state → never trap a returning user in onboarding
  }
}

/** The current step, deciding it once for an install that has none yet. */
export async function getFirstRunStep(): Promise<FirstRunStep> {
  const stored = await readMeta(STEP_KEY);
  if (stored && (ORDER as readonly string[]).includes(stored)) return stored as FirstRunStep;
  const step: FirstRunStep = (await isEstablishedInstall()) ? 'done' : 'learn';
  await writeMeta(STEP_KEY, step);
  if (step !== 'done') await writeMeta(STARTED_KEY, String(Date.now()));
  return step;
}

/** Move the journey forward to `step`. Never backward: a later screen visited
 *  early must not drag a finished journey back. */
export async function advanceFirstRun(step: FirstRunStep): Promise<void> {
  const cur = await getFirstRunStep();
  if (ORDER.indexOf(step) <= ORDER.indexOf(cur)) return;
  await writeMeta(STEP_KEY, step);
  notify();
}

/** True while a new install's journey is under a day old and unfinished. */
export async function journeyShieldsPaywall(now: number = Date.now()): Promise<boolean> {
  const step = await getFirstRunStep();
  if (step === 'done') return false;
  const started = Number(await readMeta(STARTED_KEY));
  return Number.isFinite(started) && started > 0 && now - started < JOURNEY_SHIELD_MS;
}
