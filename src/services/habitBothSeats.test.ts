// ONE HABIT COMPUTER, BOTH SEATS (A-plan P4, 2026-10-16). In both audit games
// the opponent (the coach's engine) had no habits, while the student left
// pieces loose two and five times and nobody said so. The same counts, read
// for the student, worded to the student.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { habitsOf, opponentHabits, depthClauses, NO_SOUND_PLIES } from './thinkAloud';
import { buildReviewSegmentsForTests, type ReviewMoveInput } from './coachFeatureService';

const G2 = 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 Bg4 h3 Nc6 hxg4 O-O-O d5 e6 Bd2 exd5 Be2 Nxg4 O-O Bc5 a3 Bxf2+ Rxf2 Nxf2 Kxf2 Qc5+ Kf1 Nd4 Be3 Nxf3 Bxc5 Nh2+ Ke1 c6 Qd3 d4 Bxd4 Rd6 Rd1 Re6 Qf5 f6 Kd2 Kb8 Qf4+ Ka8 Kc1'.split(' ');

describe('the student\'s habit, from the same computer', () => {
  it('the student (Black) left pieces loose repeatedly; the habit is worded to "you"', () => {
    const mine = habitsOf(G2, 'b', 'your', NO_SOUND_PLIES);
    expect(mine.find((h) => h.kind === 'loose')?.text).toMatch(/^That's \w+ times now you've left a piece loose under their attack\. Before every move, check what it leaves without a guard/);
    // The opponent's wording is unchanged, and the engine had none to say.
    expect(opponentHabits(G2, 'w', NO_SOUND_PLIES)).toEqual(habitsOf(G2, 'w', 'their', NO_SOUND_PLIES));
  });
  it('Learn\'s depth read carries it', () => {
    const c = new Chess(); for (const s of G2) c.move(s);
    const out = depthClauses({ fen: c.fen(), history: G2, topLines: [], studentColor: 'b', nameMove: false });
    expect(out.find((x) => x.kind === 'your-habit')?.text).toMatch(/you've left a piece loose/);
  });
  it('Review names it on the move that made it a habit', () => {
    const c = new Chess();
    // Ungraded: a move the grader called sound is never a habit's evidence
    // (`soundPlies`), so the board alone reads the loose pieces here.
    const inputs = G2.map((san, i) => { c.move(san); return { ply: i + 1, san, fenAfter: c.fen(), isCoachMove: i % 2 === 0, classification: null, preMoveEval: 0, evaluation: 0, bestMove: null } as unknown as ReviewMoveInput; });
    const said = buildReviewSegmentsForTests(inputs, 'black', null, true, 1500).map((s) => s.narration ?? '').join(' ');
    expect(said).toMatch(/you've left a piece loose under their attack/);
  }, 120000);
  it('one loose-piece habit a game: the habit and the loose tail never both name it (prod Review 2026-10-29)', () => {
    const c = new Chess();
    const inputs = G2.map((san, i) => { c.move(san); return { ply: i + 1, san, fenAfter: c.fen(), isCoachMove: i % 2 === 0, classification: null, preMoveEval: 0, evaluation: 0, bestMove: null } as unknown as ReviewMoveInput; });
    const said = buildReviewSegmentsForTests(inputs, 'black', null, true, 1500).map((s) => s.narration ?? '').join(' ');
    const named = (said.match(/you've left a piece loose under their attack|the second time you've left a piece with no guard/g) ?? []).length;
    expect(named).toBe(1);
  }, 120000);
  it('…and never on moves the grader called sound (a sacrifice that holds is not a loose piece)', () => {
    const c = new Chess();
    const inputs = G2.map((san, i) => { c.move(san); return { ply: i + 1, san, fenAfter: c.fen(), isCoachMove: i % 2 === 0, classification: 'good', preMoveEval: 0, evaluation: 0, bestMove: null } as unknown as ReviewMoveInput; });
    const said = buildReviewSegmentsForTests(inputs, 'black', null, true, 1500).map((s) => s.narration ?? '').join(' ');
    expect(said).not.toMatch(/left a piece loose/);
  }, 120000);
});
