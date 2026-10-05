import { describe, it, expect } from 'vitest';
import { assembleOpponentHypotheticalAnswer } from './groundedAnswer';
import { opponentMoveBoard, tempoFen } from './tempoFen';
import { isOpponentHypotheticalQuestion, isCandidateMoveQuestion } from '../coach/questionIntents';
import { tapeMoveRef } from '../coach/coachService';

// The 1200 Sicilian (1ZmVtbO3) after 13 plies, the student White to move. The
// question walk asked "What if they play d5?" here and got the STUDENT's d5
// graded. Evals are real Stockfish 18 at depth 18, White-POV: now +116 (best
// d5 by White), and +206 once Black's …d5 is on the board (exd5 exd5 Nxd5).
const FEN = 'r1q2rk1/pp2bppp/2nppn2/8/Q2PP3/2N1BB2/PP3PPP/3R1RK1 w - - 8 13';
const HISTORY = ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'Nc6', 'Be3', 'e6'];

describe('what if THEY play d5 — the opponent hypothetical lane', () => {
  it('routes to the opponent lane, never the student candidate lane', () => {
    for (const q of ['What if they play d5?', 'What happens if my opponent plays d5', 'Can they play d5?']) {
      expect(isOpponentHypotheticalQuestion(q)).toBe(true);
      expect(isCandidateMoveQuestion(q)).toBe(false);
    }
    // The student's own move stays in the candidate lane.
    expect(isOpponentHypotheticalQuestion('What if I play d5?')).toBe(false);
    expect(isCandidateMoveQuestion('What if I play d5?')).toBe(true);
    // Retrospective "why did they play" is not a hypothetical.
    expect(isOpponentHypotheticalQuestion('Why did they play Qc8?')).toBe(false);
  });

  it('is never taken for a move off the tape', () => {
    expect(tapeMoveRef('Can they play d5?', FEN, HISTORY)).toBeNull();
  });

  it('plays their d5 on the tempo board and answers from the student seat', () => {
    const board = opponentMoveBoard(FEN, 'white');
    expect(board).toBe(tempoFen(FEN));
    expect(board?.split(' ')[1]).toBe('b');
    const a = assembleOpponentHypotheticalAnswer({
      board, theirSan: 'd5', studentColor: 'white',
      nowEvalCp: 116, afterEvalCp: 206, afterMateIn: null,
      lineUci: ['e4d5', 'e6d5', 'c3d5', 'f6d5', 'f3d5'], settled: true,
    });
    const f = a?.facts ?? '';
    expect(f).toMatch(/^If they get d5 in/);
    expect(f).toMatch(/you're up about [0-9.]+ points — clearly better/);
    expect(f).toMatch(/only help you/);
    expect(f).toMatch(/Your best answer is exd5: exd5 exd5 Nxd5/);
    expect(f).not.toMatch(/\bd5 is (?:perfectly fine|playable|an inaccuracy|a mistake)/);
    expect(a?.bestMoveFromTo).toEqual({ from: 'e4', to: 'd5' });
  });

  it('a move they cannot make is said so, and a check leaves them no free move', () => {
    const board = opponentMoveBoard(FEN, 'white');
    expect(assembleOpponentHypotheticalAnswer({ board, theirSan: 'd4', studentColor: 'white', nowEvalCp: null, afterEvalCp: null, afterMateIn: null, lineUci: [], settled: null })?.facts)
      .toMatch(/isn't a move they can play/);
    const CHECK = 'rnb1kbnr/pppp1ppp/8/4p3/4P2q/5P2/PPPP2PP/RNBQKBNR w KQkq - 1 3';
    expect(opponentMoveBoard(CHECK, 'white')).toBeNull();
  });

  it('on their own turn the live board is used as it is', () => {
    const theirTurn = FEN.replace(' w ', ' b ');
    expect(opponentMoveBoard(theirTurn, 'white')).toBe(theirTurn);
  });
});

describe('no engine read', () => {
  it('never leaves a dangling "If they get d5 in:" — it says the read is missing', () => {
    const board = opponentMoveBoard(FEN, 'white');
    const f = assembleOpponentHypotheticalAnswer({ board, theirSan: 'd5', studentColor: 'white', nowEvalCp: null, afterEvalCp: null, afterMateIn: null, lineUci: [], settled: null })?.facts ?? '';
    expect(f).not.toMatch(/in:?$/);
    expect(f).toMatch(/don't have an engine read on d5/);
  });
});
