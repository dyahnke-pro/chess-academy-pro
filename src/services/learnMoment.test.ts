// LEARN SPEAKS ON A MOMENT, AND IS QUIET OTHERWISE (David 2026-11-18: "So learn
// narrations are needed only when the player makes an error of some kind …
// And it knows when not to say anything. Like a chess coach." → "Or it can be
// used to reenforce proper move behavior" → "It gets more quiet if you make
// all the right moves. But it speaks on errors"). The old door spoke whatever
// its producers offered on every move: a plan, a board read, their threat
// before the student had moved, the opening's story. Each of these tests fails
// on that door.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { NO_PROOF } from './proof';
import { NAMES_NO_MOVE } from './studentMoveNaming';
import { onLearnTurn, type LearnTurnRow } from './coachDecisionEvents';
import { learnMoment } from './learnTurnDoor';
import { decideTurn, laneFacts, type LaneFixture } from '../test/learnDoorFixtures';

const FEN = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
const fact = (lane: LaneFixture['lane'], text: string, squares: string[], extra: Partial<LaneFixture> = {}): LaneFixture => ({
  lane, text, fen: FEN, squares, namesStudentMove: NAMES_NO_MOVE, proof: NO_PROOF.stated, role: 'teach', ...extra,
});
const turn = (slipCp: number | null, decision: 'only-move' | 'clear-best' | null) =>
  ({ kind: 'late' as const, ply: 7, slipCp, priceSettled: true, price: null, midExchange: null, decision });

const plan = fact('planArc', 'So the plan: put a rook on the open d-file.', ['d1']);
const read = fact('structureJudgement', 'Their pawn on e5 is the target: nothing of theirs can come up to back it up.', ['e5']);
const threat = fact('threat', 'Watch out: their bishop can take on g5.', ['g5'], { stakes: { points: 1, plies: 1 } });
const reason = fact('movePoint', 'Your knight now hits e5, the pawn their knight on c6 guards.', ['f3', 'e5', 'c6'], { ownMoveReason: true });
const verdict = fact('mistake', 'Your move was a mistake: it let them take on e4.', ['e4']);

function heldWhy(run: () => void): Record<string, string> {
  const rows: LearnTurnRow[] = [];
  const off = onLearnTurn((r) => rows.push(r));
  try { run(); } finally { off(); }
  return rows.at(-1)?.heldWhy ?? {};
}

describe('the turn\'s moment', () => {
  it('a turn with no correction and no decision is quiet', () => {
    expect(learnMoment(turn(null, null), laneFacts([plan, read]))).toBe('quiet');
    expect(learnMoment(turn(null, 'only-move'), laneFacts([plan]))).toBe('decision');
    expect(learnMoment(turn(140, null), laneFacts([plan]))).toBe('correction');
    // The grade's own verdict makes it a correction whatever the price said.
    expect(learnMoment(turn(null, null), laneFacts([verdict]))).toBe('correction');
  });

  it('a calm move says nothing: no plan, no board read, no threat before the move', () => {
    let spoke: string[] = [];
    const why = heldWhy(() => { spoke = decideTurn([plan, read, threat, reason], '', undefined, null, null, false, turn(null, null)).spoke; });
    expect(spoke).toEqual([]);
    expect(why.planArc).toBe('quiet-turn');
    expect(why.structureJudgement).toBe('quiet-turn');
    expect(why.threat).toBe('quiet-turn');
    expect(why.movePoint).toBe('quiet-turn');
  });

  it('a right move at a real decision says its one reason, and nothing else', () => {
    const d = decideTurn([plan, read, threat, reason], '', undefined, null, null, false, turn(null, 'clear-best'));
    expect(d.spoke).toEqual(['movePoint']);
  });

  it('an error speaks: the verdict, and the danger that costs something now', () => {
    const d = decideTurn([verdict, threat, plan], '', undefined, null, null, false, turn(140, null));
    expect(d.spoke).toContain('mistake');
    expect(d.spoke).toContain('threat');
    expect(d.spoke).not.toContain('planArc');
  });

  it('a phase change, their new plan and an only-move moment speak on any turn', () => {
    const phase = fact('phase', 'The opening is over: both sides are castled and the middlegame starts.', []);
    const theirPlan = fact('planArc', 'Their plan is taking shape: the knight is heading for d4.', ['d4'], { claims: ['plan:opponent:knight-d4:emerge'] });
    const slowDown = fact('positionFacts', 'Critical moment: only one move keeps your edge here.', ['e4'], { factKind: 'key-moment', stakes: { points: 2, plies: 0 } });
    // Each on its own turn: on one turn the thought keeps one of them.
    for (const [f, lane] of [[phase, 'phase'], [theirPlan, 'planArc'], [slowDown, 'positionFacts']] as const) {
      expect(decideTurn([f], '', undefined, null, null, false, turn(null, null)).spoke).toEqual([lane]);
    }
    // The student's own plan is not one of them.
    expect(decideTurn([plan], '', undefined, null, null, false, turn(null, null)).spoke).toEqual([]);
  });
});

describe('the Learn page names the decision from the grade, never on a recapture', () => {
  it('turnDecision reads the grade\'s reason and skips a fault and a recapture', () => {
    const page = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    expect(page).toMatch(/turnDecision = grade && !grade\.fault && !isRecapture && \(grade\.reason === 'only-move' \|\| grade\.reason === 'clear-best'\)/);
    // Every wave of the turn carries it.
    expect(page).toMatch(/kind: 'late'[^}]*decision: turnDecision/);
    expect(page).toMatch(/kind: 'instant'[^}]*decision: args\.decision/);
  });
});
