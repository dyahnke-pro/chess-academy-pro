import { describe, it, expect } from 'vitest';
import { candidateMoves, temptingOnBoard, walksIntoMate, type WeighRead } from './weighedMoves';

// Danya, "how to avoid blunders" part 1, board 3 (2026-11-18): 39.Kh3??
// walks into …Nxf4 mate — "the checkmate check". The king move sits at 2% of
// the eye at 1500, under the candidate bar, so it was never weighed.
const FEN = '2r5/4p3/3p1npk/3n2N1/5P1N/1P1r2P1/4R1KP/4R3 w - - 0 1';
const READS: WeighRead[] = [
  { evaluation: 29, mate: null, moves: ['g5f7', 'h6g7', 'f7g5', 'g7h6', 'h4f3', 'c8c7', 'b3b4', 'd3b3', 'e1a1', 'b3b4'] },
  { evaluation: 26, mate: null, moves: ['h4f3', 'c8c7', 'b3b4', 'd3b3', 'e1a1', 'b3b4', 'g5e6', 'c7c8', 'f3g5', 'b4b3'] },
  { evaluation: 25, mate: null, moves: ['b3b4', 'd3b3', 'h4f3', 'c8c7', 'e1a1', 'c7c4', 'a1a8', 'c4b4', 'g5e6', 'b4b8'] },
  // Stockfish (depth 14, searchmoves g2h3): mate in one for Black.
  { evaluation: -10000, mate: -1, moves: ['g2h3', 'd5f4'] },
];

describe('weighedMoves — a move that walks into mate is weighed', () => {
  it('Kh3 makes …Nxf4#: a candidate, and refuted by the mate', () => {
    expect(walksIntoMate(FEN, 'g2h3')).toBe(true);
    expect(candidateMoves(FEN, 1500, { played: null, scored: null }).some((c) => c.uci === 'g2h3')).toBe(true);
    const t = temptingOnBoard({ fen: FEN, student: 'w', rating: 1500, reads: READS, priorMove: null });
    expect(t[0]?.san).toBe('Kh3');
    expect(t[0]?.text).toMatch(/Nxf4#/);
  });
  it('quiet when the move makes no mate (the engine\'s best, a pawn move)', () => {
    expect(walksIntoMate(FEN, 'g5f7')).toBe(false);
    expect(walksIntoMate(FEN, 'b3b4')).toBe(false);
  });
  it('quiet when the mate was already threatened before the move', () => {
    // Back-rank: …Rd1# is on whatever White plays with the a-pawn.
    const threatened = '3r2k1/5ppp/8/8/8/8/P4PPP/6K1 w - - 0 1';
    expect(walksIntoMate(threatened, 'a2a3')).toBe(false);
  });
});
