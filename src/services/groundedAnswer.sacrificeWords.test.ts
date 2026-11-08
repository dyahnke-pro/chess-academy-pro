import { describe, it, expect } from 'vitest';
import { assembleCandidateMoveAnswer, playedSacrificeVerdict } from './groundedAnswer';

// Hard-chat audit 2026-11-08, Lichess puzzle 0MOZp: …Bd5+ gives the bishop,
// cxd5 takes it, …Qxd5+ takes the pawn back. The answer said "you give up two
// pawns" — the net count said as if it were the pieces.
const BISHOP_SAC = '5n1r/3q4/ppp1b1k1/4PpN1/1PPP1Pp1/1PB1Q3/6K1/7R b - - 2 46';

describe('a sacrifice is said by the pieces that change hands', () => {
  it('the candidate lane: a bishop for a pawn, never two pawns', () => {
    const a = assembleCandidateMoveAnswer({ fen: BISHOP_SAC, candidateSan: 'Bd5+', bestMoveUci: 'e6d5', bestEvalCp: 440, candidateEvalCp: 440, candidateMateIn: null, candidateLineUci: [], candidateSettled: true, studentColor: 'black' });
    expect(a?.facts).toMatch(/you give up a bishop for a pawn/);
    expect(a?.facts).not.toMatch(/two pawns/);
  });

  it('the played lane says the same pieces', () => {
    expect(playedSacrificeVerdict(BISHOP_SAC, 'Bd5+', 440, 0)).toMatch(/you gave a bishop for a pawn/);
  });

  it('a pawn offered with nothing back is still a pawn', () => {
    // 1.e4 e5 2.f4: the f-pawn is on offer to …exf4.
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    expect(playedSacrificeVerdict(fen, 'f4', 0, 0)).toMatch(/you gave a pawn/);
  });
});
