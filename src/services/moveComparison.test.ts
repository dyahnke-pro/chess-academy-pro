// The method of comparison — engine-proven "why". These tests drive the core
// with a DETERMINISTIC mock engine (keyed by exact FEN), so they prove the
// REASONING is sound — a reason is spoken only when ablation collapses the gap
// and the magnitude reconciles; otherwise no reason is invented.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { compareTwoMoves, __test } from './moveComparison';
import type { EngineEval, Evaluate } from './moveComparison';

function mockEngine(table: Record<string, EngineEval>): Evaluate {
  return async (fen: string): Promise<EngineEval> => table[fen] ?? { cp: 0 };
}
const fenAfter = (base: string, san: string): string => { const c = new Chess(base); c.move(san); return c.fen(); };
const fenAblate = (fen: string, sq: string): string => { const c = new Chess(fen); c.remove(sq as never); return c.fen(); };

describe('passedPawns (board fact)', () => {
  it('flags a pawn with no enemy pawn ahead on its file or the neighbours', () => {
    // white c6 pawn; black pawns on a7,h7 only → c6 is passed
    expect(__test.passedPawns('6k1/p6p/2P5/8/8/8/8/6K1 w - - 0 1', 'w')).toContain('c6');
  });
  it('does NOT flag a pawn a neighbour enemy pawn still covers', () => {
    // white c5, black b6 one file over and ahead → not passed
    expect(__test.passedPawns('6k1/8/1p6/2P5/8/8/8/6K1 w - - 0 1', 'w')).not.toContain('c5');
  });
});

describe('compareTwoMoves — PASSED-PAWN proven by ABLATION', () => {
  // Base: white c5 is blocked by black b6. Pushing c5-c6 walks PAST b6 and
  // creates a passed pawn — no capture, so material is unchanged; the ONLY
  // difference from a neutral king move is the passer. Perfect ablation case.
  const base = '6k1/p6p/1p6/2P5/8/8/P6P/6K1 w - - 0 1';
  const fenA = fenAfter(base, 'c6');   // creates the passer
  const fenB = fenAfter(base, 'Kf1');  // neutral
  const fenAbl = fenAblate(fenA, 'c6'); // the experiment: passer removed

  it('names the passed pawn WHEN removing it collapses the gap', async () => {
    const eng = mockEngine({
      [fenA]: { cp: 150 },   // white clearly better with the passer
      [fenB]: { cp: 0 },     // neutral move: equal
      [fenAbl]: { cp: 10 },  // passer gone → edge gone → PROVES it was the cause
    });
    const cmp = await compareTwoMoves(base, 'c6', 'Kf1', eng);
    expect(cmp).not.toBeNull();
    expect(cmp!.better).toBe('A');
    expect(cmp!.sanBetter).toBe('c6');
    expect(cmp!.delta?.kind).toBe('passed-pawn');
    expect(cmp!.delta?.proof).toBe('ablation');
    expect(cmp!.delta?.text).toMatch(/passed pawn on c6/);
    // the experiment's numbers are carried for the voice/telemetry layer
    expect(cmp!.delta?.ablation).toEqual({ full: 150, ablated: 10, worse: 0 });
  });

  it('REFUSES to name the pawn when removing it does NOT collapse the gap', async () => {
    // Same board, but the edge PERSISTS without the pawn → the passer was a
    // bystander, not the cause. No reason is invented; delta is null.
    const eng = mockEngine({
      [fenA]: { cp: 150 },
      [fenB]: { cp: 0 },
      [fenAbl]: { cp: 140 }, // gap holds → hypothesis rejected
    });
    const cmp = await compareTwoMoves(base, 'c6', 'Kf1', eng);
    expect(cmp!.better).toBe('A');
    expect(cmp!.delta).toBeNull(); // <-- the guardrail: no manufactured reason
  });
});

describe('compareTwoMoves — MATERIAL reconciles directly', () => {
  // c4xd5 wins a pawn AND the recapture leaves white a clean pawn up.
  const base = '6k1/1p5p/8/3p4/2P5/8/P6P/6K1 w - - 0 1';
  it('names the material edge when the better line simply keeps a pawn', async () => {
    const fenA = fenAfter(base, 'cxd5'); // up a pawn
    const fenB = fenAfter(base, 'Kf1');  // equal
    const eng = mockEngine({ [fenA]: { cp: 110 }, [fenB]: { cp: 0 } });
    const cmp = await compareTwoMoves(base, 'cxd5', 'Kf1', eng);
    expect(cmp!.delta?.kind).toBe('material');
    expect(cmp!.delta?.proof).toBe('material-count');
    expect(cmp!.delta?.text).toMatch(/material ahead/);
  });
});

describe('compareTwoMoves — honesty + robustness', () => {
  const base = '6k1/p6p/1p6/2P5/8/8/P6P/6K1 w - - 0 1';
  it('calls two near-equal moves "about the same" (no fabricated why)', async () => {
    const eng = mockEngine({ [fenAfter(base, 'c6')]: { cp: 20 }, [fenAfter(base, 'Kf1')]: { cp: 5 } });
    const cmp = await compareTwoMoves(base, 'c6', 'Kf1', eng);
    expect(cmp!.delta?.kind).toBe('none');
  });
  it('returns the engine line to SHOW the why when no delta is provable', async () => {
    // A gap exists but neither material nor a passer explains it → no reason,
    // but hand back the PV so the caller plays it out instead of inventing.
    const fenA = fenAfter(base, 'Kf1');
    const fenB = fenAfter(base, 'c6');
    const eng = mockEngine({
      [fenA]: { cp: 120, pv: ['g8f8', 'a2a4', 'h7h6'] }, // legal from fenA (Black to move)
      [fenB]: { cp: 0 },
    });
    const cmp = await compareTwoMoves(base, 'Kf1', 'c6', eng);
    expect(cmp!.better).toBe('A');
    expect(cmp!.delta).toBeNull();
    expect(cmp!.line.length).toBeGreaterThan(0); // the "show me" line survives
  });
  it('returns null on an illegal candidate move', async () => {
    expect(await compareTwoMoves(base, 'c6', 'Qz9', mockEngine({}))).toBeNull();
  });
});
