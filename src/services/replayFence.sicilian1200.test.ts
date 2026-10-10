/**
 * REPLAY FENCE — the 1200 Sicilian (lichess 1ZmVtbO3, student White), walked by
 * hand 2026-09-27. Each case is a line the walk FLAGGED, replayed on the real
 * game position with REAL Stockfish numbers (stockfish-18-lite, depth 16,
 * mover POV), so a regression is caught on the board it was heard on.
 */
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { attributePrinciples } from './principleAttribution';
import { renderFundamentalVerdict } from './principleVoice';
import { whyItFailed } from './whyItFailed';

const GAME = 'e4 c5 Nf3 d6 c3 Nc6 d4 cxd4 cxd4 Bg4 Be2 Nf6 Nc3 Bxf3 Bxf3 e6 Qa4 Qd7 Be3 Be7 O-O O-O Rad1 Qc8 Qc2 a6 e5 dxe5 Be4 Nxe4 Nxe4 exd4 Bxd4 e5 Bc5 Bxc5 Nxc5'.split(' ');

const fenAt = (n: number): string => { const c = new Chess(); for (const m of GAME.slice(0, n)) c.move(m); return c.fen(); };

describe('ply 37 — 19.Nxc5 is a recapture, not a failed sacrifice', () => {
  const input = {
    historySans: GAME.slice(0, 37),
    bestSan: 'Qxc5',
    classification: 'blunder',
    evalBefore: -87,
    evalAfterPlayed: -431,
    pvAfterPlayed: ['Nd4', 'Qc4', 'b6', 'b4', 'bxc5', 'bxc5'],
    pvAfterBest: ['Qg4', 'Qe3', 'Rad8', 'Rxd8', 'Rxd8', 'h3'],
    replySan: 'Rd8',
  };
  it('"that sacrifice doesn\'t land" is not attributed', () => {
    expect(attributePrinciples(input).map((a) => a.id)).not.toContain('overvalued-attack');
  });
  it('the knight that took back is not said to have "eyed" b7', () => {
    const w = whyItFailed({ fenBefore: fenAt(36), playedSan: 'Nxc5', studentColor: 'white', playedLineUci: null });
    expect(w?.line ?? '').not.toMatch(/eyed/);
  });
});

describe('ply 33 — 17.Bxd4: the bishop is taken on the spot, not trapped', () => {
  const input = {
    historySans: GAME.slice(0, 33),
    bestSan: 'Bg5',
    classification: 'mistake',
    evalBefore: -308,
    evalAfterPlayed: -472,
    // Stockfish depth 18 — the line runs on until it settles (Black a bishop up).
    pvAfterPlayed: ['Nxd4', 'Qd3', 'Rfd8', 'Kh1', 'Nf5', 'Qe2', 'Rxd1', 'Rxd1'],
    pvAfterBest: ['f6', 'Bd2', 'Qd7', 'Qb3', 'Kh8', 'f4'],
    replySan: 'e5',
  };
  const poisoned = () => attributePrinciples(input).find((a) => a.id === 'poisoned-pawn');
  it('the grab is attributed, with no flight', () => {
    expect(poisoned()?.facts.fled).toBe(0);
  });
  it('the words never say "trapped" / "hunted" / "chased"', () => {
    for (let ply = 0; ply < 3; ply++) {
      const line = renderFundamentalVerdict([poisoned()!], { ply, seen: new Set(), replySan: 'e5' }) ?? '';
      expect(line).toMatch(/bishop/);
      expect(line).not.toMatch(/trapped|hunted|chased|snared/);
    }
  });
  it('NEGATIVE CONTROL: a grabber that FLED first is still called trapped', () => {
    const fledOnce = { ...poisoned()!, facts: { ...poisoned()!.facts, fled: 1 } };
    const lines = [0, 1, 2].map((ply) => renderFundamentalVerdict([fledOnce], { ply, seen: new Set(), replySan: 'e5' }) ?? '');
    expect(lines.join(' ')).toMatch(/trapped|hunted|chased|snared/);
  });
  it('the bishop that took is not said to have "eyed" g7', () => {
    const w = whyItFailed({ fenBefore: fenAt(32), playedSan: 'Bxd4', studentColor: 'white', playedLineUci: null });
    expect(w?.line ?? '').not.toMatch(/eyed/);
  });
});

describe('ply 47 — 24.Nf6+ Kg7: a forced king move is not what the check "let them" do', () => {
  // Real engine lines (stockfish-18-lite depth 16): best Qd3 (-124), Nf6+ → -221.
  it('the grade does not say "let them in with Kg7"', async () => {
    const { callInaccuracyDetailed } = await import('./inaccuracyCall');
    const c = new Chess(); for (const m of [...GAME, 'Rd8', 'Rfe1', 'g6', 'h3', 'b6', 'Ne4', 'Rxd1', 'Rxd1', 'Nd4']) c.move(m);
    const v = callInaccuracyDetailed({ namesBetterMove: true, priorMove: null,
      fenBefore: c.fen(), playedSan: 'Nf6+', bestSan: 'Qd3',
      bestLineUci: ['c2d3', 'c8e6', 'd1c1', 'e6a2', 'e4f6', 'g8g7'],
      cpLoss: 150, side: 'student', moverColor: 'white', // graded a mistake in the live walk
      replyLineUci: ['g8g7', 'c2c8', 'a8c8', 'f6g4', 'f7f6', 'g1f1'],
      replySan: 'Kg7',
    });
    expect(v.call).toBeTruthy();
    expect(v.call?.said ?? '').not.toMatch(/in with Kg7/);
  });
});
