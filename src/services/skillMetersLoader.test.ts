import { describe, it, expect, vi, beforeEach } from 'vitest';

// Count the board-detector runs: the meters must judge each slip ONCE.
const calls = vi.hoisted(() => ({ n: 0 }));
vi.mock('./capabilityEvidence', async (orig) => {
  const real = await orig<typeof import('./capabilityEvidence')>();
  return {
    ...real,
    capabilityOutcomes: (...a: Parameters<typeof real.capabilityOutcomes>) => { calls.n += 1; return real.capabilityOutcomes(...a); },
  };
});

import { db } from '../db/schema';
import { metersFrom, readSkillRows, warmSlipBreaks, liveSlipBreaks, type StoredSlip } from './skillMetersLoader';

// A real live slip on an Italian board (White to move).
const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 3';
const slip = (id: string, playedSan: string, tag = 'missed-opponents-threat'): StoredSlip => ({
  id, tag, fen: FEN, playedSan, createdAt: 1, source: 'discussion-practice', cpLoss: 600,
});

describe('the skill meters never re-run the board over the record (prod 2026-10-19: 7s freezes every 7s)', () => {
  beforeEach(async () => {
    calls.n = 0;
    await db.misconceptionTags.clear();
  });

  it('judges each slip once however often the meters refresh', () => {
    const rows = { held: [], slips: [slip('a', 'Qe2'), slip('b', 'd3')], startRating: 1200 };
    metersFrom(rows);
    const first = calls.n;
    expect(first).toBe(2);
    for (let i = 0; i < 5; i++) metersFrom(rows);
    expect(calls.n).toBe(first);
  });

  it('keeps the verdict on the row, so a new session reads it without the detectors', async () => {
    await db.misconceptionTags.bulkAdd([slip('c', 'Nc3') as never]);
    const { slips } = await readSkillRows();
    expect(slips[0].skillBreak?.key).toBe('missed-opponents-threat|600|');
    const stored = await db.misconceptionTags.get('c');
    expect(stored?.skillBreak).toEqual(slips[0].skillBreak);
    calls.n = 0;
    // A fresh row object with the kept verdict and a board this session never saw.
    const kept = { ...slip('d', 'Nc3'), fen: FEN.replace(' 2 3', ' 4 5'), skillBreak: slips[0].skillBreak };
    expect(liveSlipBreaks(kept)).toBe(slips[0].skillBreak?.breaks);
    expect(calls.n).toBe(0);
  });

  it('NEGATIVE CONTROL: a re-attributed tag is judged again', async () => {
    const r = slip('e', 'a3');
    await warmSlipBreaks([r]);
    calls.n = 0;
    const moved = { ...r, tag: 'neglected-development' };
    liveSlipBreaks(moved);
    expect(calls.n).toBe(1);
  });
});
