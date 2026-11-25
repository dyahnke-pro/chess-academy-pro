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
