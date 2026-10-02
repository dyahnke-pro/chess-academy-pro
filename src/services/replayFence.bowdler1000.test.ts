/**
 * REPLAY FENCE — Sicilian Bowdler Attack, 1000-rated (lichess K6K9k4lK, student
 * Black), walked by hand 2026-09-27. Each case is a flagged line replayed on the
 * real game position; engine lines are real Stockfish (stockfish-18-lite, d16).
 */
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { bestMinorToKeep } from './positionReadingService';
import { computeMoveFundamentals } from './moveFundamentals';
import { attributePrinciples } from './principleAttribution';
import { betterMoveFact, phraseBetterMove } from './inaccuracyCall';
import { opponentGapClause } from './opponentGap';

const GAME = 'e4 c5 Bc4 e6 Nc3 d5 exd5 exd5 Bxd5 Nf6 Bxf7+ Kxf7 Qe2 Qe7 Qxe7+ Bxe7 Nf3 Re8 O-O Bg4 Ne5+ Kg8 Nxg4 Nxg4 Nd5 Bd6 d3 Bxh2+ Kh1 Bd6 Bg5 h6 Bh4 Re5 c4 Rh5 g3 Nf6 Nxf6+ gxf6 Rae1 Nc6 Re6 Be5 Kg2 Nd4 Re7 Nf5 Rxb7 Nxh4+ gxh4 Rf5 Kh3 Rf3+ Kg4 Rxd3 Rg1 Rd4+ Kf5+ Kf8 Rh7 Rf4+ Ke6 Re8+ Kd7 Rd4+ Kc6 Re7 Rxh6 Rg7 Rh8+ Kf7 Rxg7+ Kxg7 Ra8 Rxh4 Kxc5 Bd4+ Kd5 Bxf2 c5 Rh5+ Ke6 Bxc5 Rc8 Bd4 Rc7+ Kg6 Rc4 Re5+ Kd7 Bxb2 Rg4+ Kf5 Rg2 Bd4 Rc2'.trim().split(' ');
const fenAt = (n: number): string => { const c = new Chess(); for (const m of GAME.slice(0, n)) c.move(m); return c.fen(); };

describe('ply 82 — a bishop cannot "outclass their minor" when they have none', () => {
  it('after 42.Rh5+ Ke6 (their rook, no minor) the bishop is not dominant', () => {
    expect(bestMinorToKeep(fenAt(83), 'b')?.dominant).toBe(false);
  });
  it('NEGATIVE CONTROL: with an enemy minor on the board, dominance is still read', () => {
    // 20…Bd6 v the h4 bishop: both sides have minors, so the comparison runs.
    expect(bestMinorToKeep(fenAt(40), 'b')).not.toBeNull();
  });
});

describe('ply 42 — 21…Nc6 is one development claim, not two', () => {
  it('"completes your development" and "develops into the game" never both', () => {
    const ids = computeMoveFundamentals(fenAt(41), 'Nc6', 'black').map((f) => f.id);
    expect(ids).toContain('development-complete');
    expect(ids).not.toContain('development');
  });
});

describe('ply 54 — Kh8 is not "walking the king in"', () => {
  it('passive-king is not attributed when the better king move goes to the corner', () => {
    const ids = attributePrinciples({
      historySans: GAME.slice(0, 54), bestSan: 'Kh8', classification: 'mistake',
      evalBefore: 304, evalAfterPlayed: 183, replySan: 'Kg4',
      pvAfterPlayed: ['Kg4', 'Rf4+', 'Kh5', 'Kf8', 'Rg1', 'f5'],
      pvAfterBest: ['f4', 'Rg8', 'Ra7', 'Rf4', 'Rxf4', 'Bxf4'],
    }).map((a) => a.id);
    expect(ids).not.toContain('passive-king-endgame');
  });
});

describe('ply 58 — Kf8 does not serve another piece\'s plan', () => {
  it('the better-move reason is not "the idea is to park a piece on d4"', () => {
    const f = betterMoveFact(fenAt(57), 'Rd4+', 'Kf8', ['g8f8', 'g4h5', 'f6f5', 'f2f4', 'a8b8', 'b7a7', 'e5d4', 'g1g6'], 'black', null);
    expect(f ? phraseBetterMove(f) : '').not.toMatch(/the idea is to/);
  });
});

describe('ply 80 — a pawn move keeps its case: "c5", never "C5"', () => {
  it('the dictated gift line opens with the move as written', () => {
    const line = opponentGapClause({ opportunityUci: 'h4h5' } as never, 'dictated', fenAt(81), 'b', 'c5');
    expect(line).toMatch(/^c5 gives you something: Rh5\+/);
  });
});
