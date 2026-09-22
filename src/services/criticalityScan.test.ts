// The criticality scan — MultiPV variance decides whether a moment is quiet,
// critical, or an only-move. Driven by a DETERMINISTIC mock engine so the
// reasoning is proven without a real Stockfish (G0).
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { readFileSync } from 'node:fs';
import { scanCriticality, criticalityThresholds } from './criticalityScan';
import { INACCURACY_CP, MISTAKE_CP, BLUNDER_CP } from './engineConstants';
import type { EvaluateMulti, RawCandidate } from './criticalityScan';

const START = new Chess().fen();
const mock = (cands: RawCandidate[]): EvaluateMulti => async () => cands;

describe('criticalityThresholds — BAND-FREE (B6, 2026-09-22)', () => {
  // The rating's job is strength, never volume (CLAUDE.md THE FOUNDATION).
  // The bars used to run 200 / 100 / 50 by band, which made the same swing a
  // moment for one student and silence for another. Negative control: put the
  // band ladder back → the first `it` fails.
  it('is the app\'s ONE move-quality vocabulary and takes no rating', () => {
    const th = criticalityThresholds();
    expect(th).toEqual({ notable: INACCURACY_CP, critical: MISTAKE_CP, onlyMove: 250, blunder: BLUNDER_CP });
    expect(criticalityThresholds.length, 'a rating parameter crept back in').toBe(0);
    // A defaulted parameter does not count toward `.length`, so also PROVE the
    // property: a rating smuggled in must change nothing.
    const smuggle = criticalityThresholds as unknown as (r: number) => ReturnType<typeof criticalityThresholds>;
    expect(smuggle(800)).toEqual(th);
    expect(smuggle(2400)).toEqual(th);
  });

  it('BLAMES BY STATEMENT: no rating band reaches the bars', () => {
    const src = readFileSync('src/services/criticalityScan.ts', 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(src).not.toMatch(/coreRatingTier\(/);
    expect(src).not.toMatch(/criticalityThresholds\(rating/);
  });
});

describe('scanCriticality', () => {
  it('flags a FLAT position as quiet (no decision hinges here)', async () => {
    // three near-equal white moves → nothing hinges
    const cmp = await scanCriticality(START, mock([
      { uci: 'e2e4', cp: 25 }, { uci: 'd2d4', cp: 22 }, { uci: 'g1f3', cp: 18 },
    ]));
    expect(cmp!.severity).toBe('none');
    expect(cmp!.isCritical).toBe(false);
    expect(cmp!.isOnlyMove).toBe(false);
    expect(cmp!.best.san).toBe('e4');
  });

  it('flags a CRITICAL decision when best clears the field by the rating bar', async () => {
    // best +0.3, rest -0.9 → 1.2 gap ≥ 1.0 critical bar at 1500 → critical
    const cmp = await scanCriticality(START, mock([
      { uci: 'e2e4', cp: 30 }, { uci: 'd2d4', cp: -90 }, { uci: 'a2a3', cp: -120 },
    ]));
    expect(cmp!.severity).toBe('critical');
    expect(cmp!.isCritical).toBe(true);
    expect(cmp!.isOnlyMove).toBe(false);
    expect(cmp!.gapCp).toBe(120);
  });

  it('flags an ONLY-MOVE when the field falls off a cliff', async () => {
    // best +0.1, everything else drops ≥ 3 pawns → only-move
    const cmp = await scanCriticality(START, mock([
      { uci: 'e2e4', cp: 10 }, { uci: 'd2d4', cp: -300 }, { uci: 'g1f3', cp: -350 },
    ]));
    expect(cmp!.severity).toBe('only-move');
    expect(cmp!.isOnlyMove).toBe(true);
    expect(cmp!.gapCp).toBe(310);
  });

  it('a 1.2-pawn gap is CRITICAL — and there is no rating to make it not so', async () => {
    const cands: RawCandidate[] = [{ uci: 'e2e4', cp: 30 }, { uci: 'd2d4', cp: -90 }]; // 120 gap
    expect((await scanCriticality(START, mock(cands)))!.severity).toBe('critical'); // ≥ MISTAKE_CP
  });

  it('treats a position with ONE legal move as a literal only-move (gap Infinity)', async () => {
    // Black king a8 in check from the b7 pawn; only escape is Kb8 (a7 is next to
    // the white king, Kxb7 is defended). Verified single legal move.
    const oneMove = 'k7/1P6/K7/8/8/8/8/8 b - - 0 1';
    expect(new Chess(oneMove).moves()).toEqual(['Kb8']);
    const cmp = await scanCriticality(oneMove, mock([{ uci: 'a8b8', cp: 0 }]), {});
    expect(cmp!.isOnlyMove).toBe(true);
    expect(cmp!.gapCp).toBe(Infinity);
  });

  it('returns null on a game-over (checkmate) position', async () => {
    const mate = 'k1R5/8/1K6/8/8/8/8/8 b - - 0 1'; // black king mated by Rc8 (Kb6 covers a7/b7)
    expect(new Chess(mate).isCheckmate()).toBe(true);
    expect(await scanCriticality(mate, mock([]), {})).toBeNull();
  });
});
