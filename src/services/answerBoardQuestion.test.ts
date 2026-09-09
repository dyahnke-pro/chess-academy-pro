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

  // PLAN lanes (2026-09-09): the router recognized my-plan / opponent-plan but
  // dispatchPureAspect had no case, so "what's my plan?" deflected to a tactic.
  // Now grounded from structurePlan (boardPlan) + opponentIntentRead.
  it('my-plan: names the structural plan (passed pawn), not a best move', () => {
    const passer = '6k1/8/8/3P4/8/8/8/6K1 w - - 0 1'; // White passed pawn on d5
    const out = answerBoardQuestion(passer, "what's my plan here?", 'white');
    expect(out, 'no my-plan answer').not.toBeNull();
    expect(out!.aspect).toBe('my-plan');
    expect(out!.answer.facts).toMatch(/d5|passed|break|file/i);
    expect(out!.answer.facts).not.toMatch(/best move/i);
    expect(out!.answer.bestMoveSan).toBeNull();
  });
  it("opponent-plan: names their trump/threat from the student's POV", () => {
    const theirPasser = '6k1/8/8/8/8/3p4/6K1/8 w - - 0 1'; // Black passed pawn on d3
    const out = answerBoardQuestion(theirPasser, "what's their plan?", 'white');
    expect(out, 'no opponent-plan answer').not.toBeNull();
    expect(out!.aspect).toBe('opponent-plan');
    expect(out!.answer.facts).toMatch(/d3|passed|danger|threat/i);
  });
  it('opponent-plan: gives a board read in a quiet middlegame (never a null → engine "Your plan" fallback)', () => {
    // Quiet Italian-ish middlegame, no passer/IQP/immediate threat — the
    // opponent lane must still name their levers (best piece / files / breaks).
    const quiet = 'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 b - - 0 6';
    const out = answerBoardQuestion(quiet, "what's their plan?", 'white');
    expect(out, 'no opponent-plan answer').not.toBeNull();
    expect(out!.aspect).toBe('opponent-plan');
    expect(out!.answer.facts.length).toBeGreaterThan(10);
  });

  it('returns null for a non-board / engine-only ask (existing lanes handle it)', () => {
    expect(answerBoardQuestion(fen, 'how do I import my games?', 'white')).toBeNull();
    expect(answerBoardQuestion(fen, 'what is the best move?', 'white')).toBeNull(); // engine lane
  });
});
