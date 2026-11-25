import { describe, it, expect } from 'vitest';
import { killReport, type SessionBeat } from './sessionWatch';

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
