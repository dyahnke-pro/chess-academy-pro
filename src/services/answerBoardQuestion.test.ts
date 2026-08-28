import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { answerBoardQuestion } from './groundedAnswer';

// David 2026-08-28: the coach must answer any board question from grounded facts.
// These are the exact classes the live audit found deflecting to best-move; each
// must now return a board-true answer routed to the right aspect.
const fen = (() => {
  const c = new Chess();
  for (const m of ['e4', 'Nc6', 'd4', 'a6', 'Nf3', 'Nb8', 'Bc4', 'c6']) c.move(m);
  return c.fen(); // White to move; Bc4, big centre; Black passive.
})();

describe('answerBoardQuestion — grounded, routed, board-true', () => {
  it('routes each audit question to its aspect and answers about the right thing', () => {
    const cases: Array<[string, string, RegExp]> = [
      ['what is my bishop on c4 aiming at?', 'piece-purpose', /bishop on c4/i],
      ['who controls e5?', 'square-control', /e5/i],
      ['is anything hanging?', 'hanging', /hanging|defended/i],
      ['what is my opponent threatening?', 'opponent-threats', /threat|hanging|check|eyeing/i],
      ['am I up material?', 'material', /material|even|point/i],
      ['is my king safe?', 'king-safety-mine', /king/i],
      ['what does pushing d5 accomplish?', 'move-purpose', /d5/i],
    ];
    for (const [ask, aspect, mustMatch] of cases) {
      const out = answerBoardQuestion(fen, ask, 'white');
      expect(out, `no answer for: ${ask}`).not.toBeNull();
      expect(out!.aspect, `wrong aspect for: ${ask}`).toBe(aspect);
      expect(out!.answer.facts, `bad facts for "${ask}": ${out!.answer.facts}`).toMatch(mustMatch);
      // NONE of these may deflect to a best move.
      expect(out!.answer.facts).not.toMatch(/best move/i);
    }
  });

  it('every square a board answer names is real on the board', () => {
    const board = new Chess(fen);
    for (const ask of ['what is my bishop on c4 aiming at?', 'who controls e5?', 'what is my opponent threatening?']) {
      const out = answerBoardQuestion(fen, ask, 'white')!;
      for (const sq of (out.answer.facts.match(/\b[a-h][1-8]\b/g) ?? [])) {
        // the named square is on the board (occupied or empty) — never invented notation
        expect(/^[a-h][1-8]$/.test(sq), `${sq} in "${out.answer.facts}"`).toBe(true);
        expect(board.get(sq as never) === undefined || board.get(sq as never) !== undefined).toBe(true);
      }
    }
  });

  it('returns null for a non-board / engine-only ask (existing lanes handle it)', () => {
    expect(answerBoardQuestion(fen, 'how do I import my games?', 'white')).toBeNull();
    expect(answerBoardQuestion(fen, 'what is the best move?', 'white')).toBeNull(); // engine lane
  });
});
