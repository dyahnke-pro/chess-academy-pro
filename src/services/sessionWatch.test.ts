import { describe, it, expect } from 'vitest';
import { killReport, landingAfterKill, type SessionBeat } from './sessionWatch';

const beat = (o: Partial<SessionBeat>): SessionBeat => ({ startedAt: 0, lastBeat: 5000, route: '/weaknesses', clean: false, poolWorkers: 4, analysing: true, ...o });

describe('was the last session killed?', () => {
  it('a session that died in front reports where and what ran', () => {
    expect(killReport(beat({}), 65000)).toEqual({ route: '/weaknesses', alive_s: 5, gap_s: 60, pool_workers: 4, analysing: true });
  });
  it('a session that went to the background or closed reports nothing', () => {
    expect(killReport(beat({ clean: true }), 65000)).toBeNull();
  });
  it('a first launch reports nothing', () => {
    expect(killReport(null, 65000)).toBeNull();
  });
});

// The report must leave the phone: the first wiring ran the watch at mount,
// before analytics started, and PostHog dropped the event (2026-11-25).
describe('the report is sent after analytics starts', () => {
  it('App starts the watch right after initAnalytics, not at mount', async () => {
    const { readFileSync } = await import('node:fs');
    const app = readFileSync('src/App.tsx', 'utf8');
    const init = app.indexOf('initAnalytics({');
    const watch = app.indexOf('startSessionWatch()');
    expect(init).toBeGreaterThan(0);
    expect(watch).toBeGreaterThan(init);
    expect(app.slice(init, watch).length).toBeLessThan(400);
  });
});

// 🔒 THE CRASH-LOOP BREAKER (2026-11-25): a launch after a killed session must
// know it, and must read the PREVIOUS record — never this session's own beat.
describe('the crash-loop breaker reads the previous session', () => {
  it('a killed previous session is seen, even after this session starts beating', async () => {
    const { db } = await import('../db/schema');
    const sw = await import('./sessionWatch');
    sw.__resetSessionWatchForTests();
    await db.meta.put({ key: 'session-watch', value: JSON.stringify(beat({ clean: false })) });
    await sw.startSessionWatch(); // overwrites the record with this session's beat
    expect(await sw.lastSessionWasKilled()).toBe(true);
  });

  it('a clean previous session holds nothing', async () => {
    const { db } = await import('../db/schema');
    const sw = await import('./sessionWatch');
    sw.__resetSessionWatchForTests();
    await db.meta.put({ key: 'session-watch', value: JSON.stringify(beat({ clean: true })) });
    expect(await sw.lastSessionWasKilled()).toBe(false);
  });
});

// An OTA bundle applied at launch reloads the page from native code (no
// pagehide): the first two reports on 2026-11-25 were that reload, not kills.
describe('an applied bundle is not a kill', () => {
  it('markSessionClean writes the session clean before the reload', async () => {
    const { db } = await import('../db/schema');
    const { startSessionWatch, markSessionClean } = await import('./sessionWatch');
    await startSessionWatch();
    await markSessionClean();
    const rec = await db.meta.get('session-watch');
    expect(JSON.parse(rec?.value ?? '{}').clean).toBe(true);
  });
});

// 🔒 A KILLED LAUNCH LANDS ON HOME (2026-11-26): iOS reopened a killed web view
// at /weaknesses, which killed it again — 11 kills in two days on one phone.

describe('landingAfterKill', () => {
  const killed = { route: '/weaknesses', alive_s: 3, gap_s: 10, pool_workers: 0, analysing: false };
  it('a native launch after a kill goes home, from the page that died and any other', () => {
    expect(landingAfterKill(killed, '/weaknesses', true)).toBe('/');
    expect(landingAfterKill(killed, '/coach/teach', true)).toBe('/');
  });
  it('stays put when nothing was killed, when it is already home, and on the web', () => {
    expect(landingAfterKill(null, '/weaknesses', true)).toBeNull();
    expect(landingAfterKill(killed, '/', true)).toBeNull();
    expect(landingAfterKill(killed, '/weaknesses', false)).toBeNull();
  });
});
