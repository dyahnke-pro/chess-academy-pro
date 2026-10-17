import { describe, it, expect } from 'vitest';
import { assembleOpponentMoveAnswer } from './groundedAnswer';
import { Chess } from 'chess.js';
import { theirMoveAnswerLines } from './learnBoardTeaching';

// P-IV.1 — "why did they play that?" The opponent's last move, explained from
// chess.js geometry + the standing threat. Self-gates on the position.
describe('assembleOpponentMoveAnswer — opponent last-move why (P-IV.1)', () => {
  it('explains a capturing opponent move and names it as theirs', () => {
    // 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Bxc6 — White (opponent) just captured on c6.
    // Student is Black, now to move.
    const history = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Bxc6'];
    // FEN after 4.Bxc6 (Black to move):
    const fen = 'r1bqkbnr/1ppp1ppp/p1B5/4p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 4';
    const a = assembleOpponentMoveAnswer({ fen, moveHistory: history, studentColor: 'black' });
    expect(a).not.toBeNull();
    expect(a!.facts).toMatch(/They played Bxc6/);
    expect(a!.facts.toLowerCase()).toContain('c6');
    expect(a!.sources).toContain('chess.js');
  });

  it('self-gates: returns null when the STUDENT moved last (their turn to ask makes no sense)', () => {
    // After 1.e4 (White/student just moved), Black to move — the last move was
    // the STUDENT's, so the opponent-move lane must NOT fire.
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    const a = assembleOpponentMoveAnswer({ fen, moveHistory: ['e4'], studentColor: 'white' });
    expect(a).toBeNull();
  });

  it('returns null with no move history', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(assembleOpponentMoveAnswer({ fen, moveHistory: [], studentColor: 'white' })).toBeNull();
    expect(assembleOpponentMoveAnswer({ fen, moveHistory: undefined, studentColor: 'white' })).toBeNull();
  });
});

describe('a move another computer found a point for is never called quiet (escalating walk 2026-10-17)', () => {
  // …Kg8 stops Qxb7, forking the rooks: the stopped-threat computer finds it,
  // so the base answer must not also say "a quiet move with no immediate tactical point".
  const history = 'e4 e5 Nf3 Nc6 Bc4 h6 O-O Nf6 d4 d6 dxe5 Nxe5 Nxe5 dxe5 Bxf7+ Ke7 Bg6 Qd7 Bd2 Qg4 Bb4+ c5 Bxc5+ Ke6 Bf5+ Qxf5 exf5+ Kf7 Ba3 Bxf5 h3 e4 Qe2 Bxa3 Nxa3 Rhf8 Rfd1 Rac8 b3 Rfe8 Qb5 Kg8'.split(' ');
  const c = new Chess();
  for (const m of history) c.move(m);
  it('the other computers find Kg8\'s point', () => {
    expect(theirMoveAnswerLines(history, history.length - 1, 'w').join(' ')).toMatch(/Qxb7|stops/);
  });
  it('with the point known, the base answer drops the "quiet" claim', () => {
    const quiet = assembleOpponentMoveAnswer({ fen: c.fen(), moveHistory: history, studentColor: 'white' });
    const known = assembleOpponentMoveAnswer({ fen: c.fen(), moveHistory: history, studentColor: 'white', pointKnown: true });
    expect(quiet?.facts).toMatch(/quiet move/);
    expect(known?.facts).not.toMatch(/quiet move/);
    expect(known?.facts).toMatch(/They played Kg8/);
  });
});

describe('a capture that is taken back is a trade, not a sacrifice (escalating walk 2026-10-17, Q6)', () => {
  it('Qxg4 (queen for queen) is never "sound — you give up 9 points"', async () => {
    const { assembleCandidateMoveAnswer } = await import('./groundedAnswer');
    const fen = 'r1b2b1r/pp2k1p1/5nBp/2p1p3/1B2P1q1/8/PPP2PPP/RN1Q1RK1 w - - 0 12';
    const a = assembleCandidateMoveAnswer({ fen, candidateSan: 'Qxg4', bestMoveUci: 'b4c5', bestEvalCp: 592, candidateEvalCp: 331, candidateMateIn: null,
      candidateLineUci: 'f6g4 b4c5 e7f6 c5f8'.split(' '), candidateSettled: true, studentColor: 'white', masterFreqPct: null });
    expect(a?.facts).not.toMatch(/sound|give up 9|compensation/);
  });
});
