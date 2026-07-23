// The criticality scan — MultiPV variance decides whether a moment is quiet,
// critical, or an only-move. Driven by a DETERMINISTIC mock engine so the
// reasoning is proven without a real Stockfish (G0).
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { scanCriticality, criticalityThresholds } from './criticalityScan';
import type { EvaluateMulti, RawCandidate } from './criticalityScan';

const START = new Chess().fen();
const mock = (cands: RawCandidate[]): EvaluateMulti => async () => cands;

describe('criticalityThresholds — scale with rating', () => {
  it('a beginner cares about blunders, an expert about subtleties', () => {
    expect(criticalityThresholds(800).critical).toBe(200);
    expect(criticalityThresholds(1500).critical).toBe(100);
    expect(criticalityThresholds(2400).critical).toBe(50);
    // only-move floor holds across levels
    expect(criticalityThresholds(2400).onlyMove).toBe(250);
  });
});

describe('scanCriticality', () => {
  it('flags a FLAT position as quiet (no decision hinges here)', async () => {
    // three near-equal white moves → nothing hinges
    const cmp = await scanCriticality(START, mock([
      { uci: 'e2e4', cp: 25 }, { uci: 'd2d4', cp: 22 }, { uci: 'g1f3', cp: 18 },
    ]), { rating: 1500 });
    expect(cmp!.severity).toBe('none');
    expect(cmp!.isCritical).toBe(false);
    expect(cmp!.isOnlyMove).toBe(false);
    expect(cmp!.best.san).toBe('e4');
  });

  it('flags a CRITICAL decision when best clears the field by the rating bar', async () => {
    // best +0.3, rest -0.9 → 1.2 gap ≥ 1.0 critical bar at 1500 → critical
    const cmp = await scanCriticality(START, mock([
      { uci: 'e2e4', cp: 30 }, { uci: 'd2d4', cp: -90 }, { uci: 'a2a3', cp: -120 },
    ]), { rating: 1500 });
    expect(cmp!.severity).toBe('critical');
    expect(cmp!.isCritical).toBe(true);
    expect(cmp!.isOnlyMove).toBe(false);
    expect(cmp!.gapCp).toBe(120);
  });

  it('flags an ONLY-MOVE when the field falls off a cliff', async () => {
    // best +0.1, everything else drops ≥ 3 pawns → only-move
    const cmp = await scanCriticality(START, mock([
      { uci: 'e2e4', cp: 10 }, { uci: 'd2d4', cp: -300 }, { uci: 'g1f3', cp: -350 },
    ]), { rating: 1500 });
    expect(cmp!.severity).toBe('only-move');
    expect(cmp!.isOnlyMove).toBe(true);
    expect(cmp!.gapCp).toBe(310);
  });

  it('rating calibration: a 1.2-pawn gap is CRITICAL at 1500 but below the beginner bar', async () => {
    const cands: RawCandidate[] = [{ uci: 'e2e4', cp: 30 }, { uci: 'd2d4', cp: -90 }]; // 120 gap
    expect((await scanCriticality(START, mock(cands), { rating: 1500 }))!.severity).toBe('critical'); // ≥100
    expect((await scanCriticality(START, mock(cands), { rating: 800 }))!.isCritical).toBe(false);       // <200
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
