import { describe, it, expect } from 'vitest';
import { skillQuestions } from './skillQuestions';

const tags = (fen: string): string[] => skillQuestions(fen).map((q) => q.tag).sort();

describe('skillQuestions — the board asks the skills that could only be failed', () => {
  it('asks castle-in-time when castling is legal past move 8', () => {
    // Italian, White to move on move 8 with O-O legal.
    expect(tags('r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 8')).toContain('king-stuck-center');
    // Same board on move 4: too early to ask.
    expect(tags('r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 4')).not.toContain('king-stuck-center');
  });
  it('asks the free-looking pawn only when a piece can take one safely on the count', () => {
    // Qd1xd5? no — Bxf7+ is a pawn the bishop takes but it is recaptured: not asked.
    expect(tags('rnbqkbnr/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 0 3')).not.toContain('greedy-pawn-grab');
    // A loose pawn on b7 the queen can take.
    expect(tags('rn1qkbnr/pbpppppp/8/1p6/8/1Q6/PPPPPPPP/RNB1KBNR w KQkq - 0 5')).toContain('greedy-pawn-grab');
  });
  it('asks the even trade when a like-for-like capture is recaptured', () => {
    // Bxc6 dxc6 — bishop for knight.
    expect(tags('r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4')).toContain('bad-trade');
  });
  it('asks which pawn takes when two pawns can capture on one square', () => {
    expect(tags('rnbqkb1r/pppp1ppp/8/4n3/3P1P2/8/PPP3PP/RNBQKBNR w KQkq - 0 4')).toContain('capture-toward-centre');
  });
  it('asks nothing on the opening position', () => {
    expect(tags('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toEqual([]);
  });
});
