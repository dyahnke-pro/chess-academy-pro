import { describe, it, expect } from 'vitest';
import { classifyMatchup, matchupSignature, type MatchupClass } from './endgameMatchup';

/** Assert a FEN reduces to the expected matchup class. */
function expectClass(fen: string, cls: MatchupClass): void {
  expect(classifyMatchup(fen).cls, fen).toBe(cls);
}

describe('endgameMatchup — signature calculator', () => {
  it('counts per-side pieces and bishop square-colours', () => {
    // White Bc3 (dark), Black Bg2 (light) + kings.
    const sig = matchupSignature('8/8/8/3k4/8/2B5/6b1/4K3 w - - 0 1');
    expect(sig.white.B).toBe(1);
    expect(sig.white.bishops).toEqual(['dark']);
    expect(sig.black.B).toBe(1);
    expect(sig.black.bishops).toEqual(['light']);
    expect(sig.totalPieces).toBe(2);
  });

  it('does not count kings as pieces', () => {
    expect(matchupSignature('4k3/8/8/8/8/8/8/4K3 w - - 0 1').totalPieces).toBe(0);
  });
});

describe('endgameMatchup — class reducer', () => {
  it('kp-vs-k: king + pawn vs lone king', () => {
    expectClass('8/8/8/4k3/8/4P3/4K3/8 w - - 0 1', 'kp-vs-k');
  });

  it('pawn-endgame: kings + pawns both sides', () => {
    expectClass('8/5p2/8/4k3/8/4P3/4K3/8 w - - 0 1', 'pawn-endgame');
  });

  it('rook-endgame: rooks and pawns only (Lucena)', () => {
    expectClass('1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1', 'rook-endgame');
  });

  it('queen-endgame: queens and pawns only', () => {
    expectClass('6k1/5p2/8/8/8/8/5PQ1/6K1 w - - 0 1', 'queen-endgame');
  });

  it('queen-vs-rook: Q for one side, R for the other', () => {
    expectClass('6k1/5p2/8/8/8/8/5P2/1r4QK w - - 0 1', 'queen-vs-rook');
  });

  it('rook-vs-minor: rook vs bishop, no other rook', () => {
    expectClass('6k1/5p2/8/8/8/5b2/5P2/R5K1 w - - 0 1', 'rook-vs-minor');
  });

  it('opposite-bishops: one bishop each, opposite colours', () => {
    // Bc3 dark vs Bg2 light.
    expectClass('6k1/8/8/3k4/8/2B5/6b1/4K3 w - - 0 1', 'opposite-bishops');
  });

  it('same-bishops: one bishop each, same colour', () => {
    // Bc3 dark vs Bf6 dark (f=5, rank6→idx5 → 10 even → dark).
    expectClass('8/8/5b2/3k4/8/2B5/8/4K3 w - - 0 1', 'same-bishops');
  });

  it('bishop-vs-knight: one bishop vs one knight', () => {
    expectClass('6k1/5p2/5n2/8/8/2B5/5P2/6K1 w - - 0 1', 'bishop-vs-knight');
  });

  it('knight-endgame: knights and pawns, no bishops', () => {
    expectClass('6k1/5p2/5n2/8/8/2N5/5P2/6K1 w - - 0 1', 'knight-endgame');
  });

  it('minor-endgame: two minors a side (no rooks/queens)', () => {
    expectClass('6k1/5p2/3b1n2/8/8/2N1B3/5P2/6K1 w - - 0 1', 'minor-endgame');
  });

  it('rook-and-minor: both sides rook + minor, no queens', () => {
    expectClass('r5k1/5pp1/5n2/8/8/2N5/5PP1/R5K1 b - - 0 1', 'rook-and-minor');
  });

  it('mating-material: rook vs lone king', () => {
    expectClass('7k/8/8/8/8/8/8/R3K3 w - - 0 1', 'mating-material');
  });

  it('non-endgame: the starting position', () => {
    expectClass('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'non-endgame');
  });
});
