/**
 * WAS THE LAST SESSION KILLED? (2026-11-25: a new App Store user's web view was
 * killed again and again on /weaknesses, and nothing said so — the events from
 * the last second before a kill never leave the phone, so the only trace was a
 * second `app_session_started` on the same page.)
 *
 * The page writes a small heartbeat to Dexie every few seconds while it is in
 * front: the route, how long it has been up, and how many batch engines are
 * running. Going to the background or closing marks it clean. A launch that
 * finds a heartbeat NOT marked clean knows the last session died in front of
 * the student, and reports it once as `webview_killed` with what was on screen
 * and what was running. One record, overwritten; nothing grows.
 */
import { Capacitor } from '@capacitor/core';
import { db } from '../db/schema';
import { captureEvent } from './analytics';
import { holdBackfills } from './foregroundActivity';

export const SESSION_WATCH_KEY = 'session-watch';
const KEY = SESSION_WATCH_KEY;
const BEAT_MS = 3000;

export interface SessionBeat {
  startedAt: number;
  lastBeat: number;
  route: string;
  clean: boolean;
  poolWorkers: number;
  analysing: boolean;
}

let poolWorkers = 0;
let analysing = false;

/** The batch pool says how many engines it holds and whether a sweep runs. */
export function noteAnalysis(workers: number, running: boolean): void {
  poolWorkers = workers;
  analysing = running;
}

/** What a launch reports for the previous session, or null when it ended
 *  cleanly (backgrounded or closed) or there was none. Pure, for the tests. */
export function killReport(prev: SessionBeat | null, now: number): Record<string, unknown> | null {
  if (!prev || prev.clean) return null;
  return {
    route: prev.route,
    alive_s: Math.round((prev.lastBeat - prev.startedAt) / 1000),
    gap_s: Math.round((now - prev.lastBeat) / 1000),
    pool_workers: prev.poolWorkers,
    analysing: prev.analysing,
  };
}

async function write(beat: SessionBeat): Promise<void> {
  await db.meta.put({ key: KEY, value: JSON.stringify(beat) }).catch(() => undefined);
}

function routeNow(): string {
  try { return window.location.pathname; } catch { return ''; }
}

/** The previous session's record, read ONCE per launch and before this
 *  session's first beat overwrites it — the watch and the crash-loop breaker
 *  share this one read, so neither can see this session's own heartbeat. */
let started = false;
let cleanNow: (() => Promise<void>) | null = null;

/** The app is about to reload itself on purpose (an OTA bundle applied):
 *  mark this session clean first, so the reload is never reported as a
 *  kill (2026-11-25: the first two reports were the launch install). */
export async function markSessionClean(): Promise<void> {
  if (cleanNow) await cleanNow();
}
let previousRead: Promise<Record<string, unknown> | null> | null = null;

function readPrevious(): Promise<Record<string, unknown> | null> {
  if (!previousRead) {
    previousRead = (async () => {
      try {
        const rec = await db.meta.get(KEY);
        const prev = rec?.value ? (JSON.parse(rec.value) as SessionBeat) : null;
        return killReport(prev, Date.now());
      } catch { return null; /* a bad record is just dropped */ }
    })();
  }
  return previousRead;
}

/**
 * 🔒 THE CRASH-LOOP BREAKER (2026-11-25). A web view killed on /weaknesses
 * while the batch ran reloaded onto /weaknesses, and everything that killed
 * it started again on open — a loop the student could not leave. When the
 * last session was killed in front of the student, THIS session starts no
 * heavy work on its own: no automatic batch analysis, no whole-library
 * derivations on page open. A tap still runs them; the next clean session
 * is back to normal.
 */
export function lastSessionWasKilled(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  return readPrevious().then((r) => r !== null);
}

/**
 * 🔒 A KILLED LAUNCH LANDS ON HOME (2026-11-26). iOS reloads a killed web view
 * at the URL it died on, so a page that killed it opened again on launch and
 * killed it again — 11 kills in two days on one phone, 8 of them on
 * /weaknesses within 3 s of launch. The launch after a kill goes to the home
 * screen; the student taps back in. PURE: the path to land on, or null to
 * stay where the launch opened.
 */
export function landingAfterKill(report: Record<string, unknown> | null, path: string, native: boolean): string | null {
  // NATIVE ONLY: iOS reloading a killed web view is the loop. On the web a
  // refresh can lose the clean-exit write and read as a kill, and a reload
  // there must keep its page.
  if (!native || !report) return null;
  if (path === '/' || path === '') return null;
  return '/';
}

/** The path a killed launch opened on before it was sent home — carried on
 *  the `webview_killed` report (analytics starts after the landing). */
let landedFrom: string | null = null;

/** The launch's landing: '/' when the last session was killed off the home
 *  screen (carried on the `webview_killed` report as `landed_home_from`), else null. */
export async function launchLanding(path: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const report = await readPrevious();
  let native = false;
  try { native = Capacitor.isNativePlatform(); } catch { native = false; }
  const landing = landingAfterKill(report, path, native);
  if (landing) landedFrom = path;
  return landing;
}

/** Tests only: forget the per-launch read. */
export function __resetSessionWatchForTests(): void {
  previousRead = null;
  started = false;
  landedFrom = null;
}

/** Start the watch once at boot. Reports the previous session if it was
 *  killed, then beats for this one. */

export async function startSessionWatch(): Promise<void> {
  if (started || typeof window === 'undefined' || typeof document === 'undefined') return;
  started = true;
  const report = await readPrevious();
  if (report) {
    captureEvent('webview_killed', landedFrom ? { ...report, landed_home_from: landedFrom } : report);
    // The crash-loop breaker: the boot backfills re-read the whole library,
    // and a pass killed mid-way restarts on every launch. Held for this
    // session; the next clean launch runs them.
    holdBackfills();
  }

  const startedAt = Date.now();
  let clean = document.visibilityState === 'hidden';
  const beat = (): void => {
    void write({ startedAt, lastBeat: Date.now(), route: routeNow(), clean, poolWorkers, analysing });
  };
  beat();
  setInterval(() => { if (!clean) beat(); }, BEAT_MS);
  document.addEventListener('visibilitychange', () => {
    clean = document.visibilityState === 'hidden';
    beat();
  });
  window.addEventListener('pagehide', () => { clean = true; beat(); });
  cleanNow = async () => {
    clean = true;
    await write({ startedAt, lastBeat: Date.now(), route: routeNow(), clean, poolWorkers, analysing });
  };
}
