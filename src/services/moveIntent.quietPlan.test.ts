// A QUIET MOVE GETS ITS PLAN (David 2026-11-05, the Colle read: "Quiet moves
// should get something. Plans, or something not obvious"). 22.Qg3 was said
// nothing: its follow-up Bh6 — safe only because the queen now pins the
// g-pawn, and threatening Qxg7 mate (Bf6 the same) — was cut: what the
// bishop move does had no reading for a mate it sets up, so the prepared piece
// move had "no reason".
import { describe, it, expect } from 'vitest';
import { moveIntent, DEFAULT_INTENT, whatItDoes } from './moveIntent';
import type { AnalysisLine } from '../types';

const BEFORE_FEN = 'r3r1k1/1b3ppp/pq2p3/1p1p2B1/5Q2/2P5/P4PPP/R3R1K1 w - - 1 22';
const AFTER_FEN = 'r3r1k1/1b3ppp/pq2p3/1p1p2B1/8/2P3Q1/P4PPP/R3R1K1 b - - 2 22';
const L = (rows: Array<[number, string]>): AnalysisLine[] =>
  rows.map(([evaluation, moves], i) => ({ rank: i + 1, evaluation, mate: null, moves: moves.split(' ') }) as AnalysisLine);
// Stockfish depth 16, MultiPV (the game's board, colle800 ply 43).
const READS = {
  before: L([[-159, 'f4g3 g8h8 g5e3 b6d8 f2f4 f7f6 e3d4 b7c6'], [-168, 'e1e5 a8c8 a1e1 b6c7 f4g4 g8h8 h2h3 c7c3'], [-258, 'a2a4 e6e5 f4g3 f7f6 g5e3 b6c7 f2f4 b5a4']]),
  after: L([[-152, 'g8h8 g5e3 b6d8 e3d4 f7f6 f2f4 a8c8 e1e3'], [-135, 'b6c5 e1e3 d5d4 g5h6 c5f8 c3d4 g8h8 h6f4'], [-113, 'e6e5 e1e5 e8e5 g3e5 f7f6 g5e3 f6e5 e3b6']]),
  passBefore: L([[-327, 'e6e5 f4g3 f7f6 g5d2 g8h8 d2e3 b6c7 f2f4'], [-274, 'b6c6 e1e5 d5d4 f2f3 d4c3 g5f6 g7f6 e5h5'], [-268, 'a8c8 a2a4 e6e5 e1e5 f7f6 e5e8 c8e8 g5h4']]),
  passAfter: L([[118, 'g5h6 g7g6 g3e5 f7f6 e5f6 b6c7 e1e6 c7f7'], [54, 'g5f6 g7g6 h2h4 e6e5 f6e5 e8e6 e5d4 b6d6'], [-61, 'e1e5 g8h8 g5f4 d5d4 e5g5 e6e5 g5e5 f7f6']]),
};

describe('22.Qg3: the plan of a quiet move', () => {
  it('reads what Bh6 does: the mate it sets up on g7', () => {
    expect(whatItDoes(AFTER_FEN, 'g5h6', 'w')?.verb).toBe('threaten mate on g7');
  });

  it('Learn says the plan by its piece, never the move', () => {
    const mi = moveIntent(BEFORE_FEN, 'Qg3', READS, 'student', { ...DEFAULT_INTENT, holdPrepared: true });
    expect(mi?.prepares?.san).toMatch(/^B[hf]6$/);
    expect(mi?.text).toBe('You play Qg3 first, so that your bishop can threaten mate on g7.');
  });

  it('a mate already on the board is not the prepared move\'s doing', () => {
    // White to move with Qxg7 already mate (bishop on h6, queen on g3): a
    // further prepared move does not "threaten" it.
    const FEN = '2r1r1k1/1b3ppp/pq2p2B/1p1p4/8/2P3Q1/P4PPP/R3R1K1 b - - 4 23';
    expect(whatItDoes(FEN, 'a2a4', 'w')?.verb ?? null).not.toMatch(/mate/);
  });
});
