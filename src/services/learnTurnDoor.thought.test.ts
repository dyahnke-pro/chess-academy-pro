// THE THOUGHT (WO-THINK-01, David 2026-10-29: "the coach thinks out loud for
// the student, the way Danya does … One thread, never a stack"). A Learn turn
// is one thought said in his order — what your move changed, what theirs
// changed, the choices, "not yet", the idea on the board, the habit — and each
// step says one thing. The prod Learn tape of 2026-10-29 averaged 102 words a
// move: every fact a producer marked as teaching was "important", so a turn
// stacked "don't cash in on g4 yet", "nothing attacks f7 yet", "a pawn break is
// ready now" and "their knight sits in front of c2" in one breath.
import { describe, it, expect } from 'vitest';
import { NO_PROOF } from './proof';
import { NAMES_NO_MOVE } from './studentMoveNaming';
import { costStakes } from './factStakes';
import { decideTurn, THOUGHT_STEP, CLAUSE_STEP, thoughtStepOf, type LaneFact, type LearnLane } from './learnTurnDoor';

const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
const LATE = { kind: 'late' as const, ply: 14, slipCp: null, priceSettled: true, price: null, midExchange: null };

function fact(lane: LearnLane, text: string, squares: readonly string[], extra: Partial<LaneFact> = {}): LaneFact {
  return { lane, text, fen: FEN, squares, namesStudentMove: NAMES_NO_MOVE, proof: NO_PROOF.stated, role: 'teach', ...extra };
}

describe('the thought: one thread for the move to come', () => {
  it('four ideas about four different squares: the most valuable speaks, the rest wait', () => {
    const d = decideTurn([
      fact('notYetPlayed', 'The guard on that pawn can wait, the piece comes out first.', ['f7', 'f1']),
      fact('positionFacts', 'The capture can wait while it ties them up.', ['g4'], { factKind: 'not-yet' }),
      fact('positionFacts', 'A pawn break is ready now.', ['c5'], { factKind: 'speedrun-read' }),
      fact('structureJudgement', 'That pawn cannot come up to back up the center.', ['c3', 'c2', 'd4']),
    ], undefined, undefined, null, null, false, LATE);
    expect(d.spoke).toEqual(['notYetPlayed']);
    expect(d.pkg.kept).toHaveLength(1);
  });

  it('an idea that shares the thread\'s square speaks as its support, one a step', () => {
    const d = decideTurn([
      fact('rejectedTempting', 'Taking right away fails: the knight is trapped there.', ['d4', 'b3']),
      fact('structureJudgement', 'That square is the weak point of their structure.', ['d4']),
      fact('openingIdea', 'The break masters go for is on the queenside.', ['b5']),
    ], undefined, undefined, null, null, false, LATE);
    expect(d.spoke).toEqual(['rejectedTempting', 'structureJudgement']);
  });

  it('news in its own right still speaks: a fact with a piece at stake is never held for the thread', () => {
    const d = decideTurn([
      fact('tactic', 'There is a fork winning a rook.', ['c7', 'a8', 'e8'], { stakes: { points: 5, plies: 1 } }),
      fact('structureJudgement', 'That pawn cannot come up to back up the center.', ['c3', 'c2', 'd4']),
      fact('playedConcept', 'A second piece is hanging on the other wing.', ['h4'], { stakes: { points: 3, plies: 1 } }),
    ], undefined, undefined, null, null, false, LATE);
    expect(d.spoke).toEqual(['tactic', 'playedConcept']);
  });

  it('an earlier wave\'s idea anchors the next wave: a new unrelated idea waits', () => {
    const instant = decideTurn([
      fact('tactic', 'There is a pin to pile on.', ['a5', 'c3', 'e1']),
    ], undefined, undefined, null, null, false, { ...LATE, kind: 'instant' });
    expect(instant.lead?.thread).toEqual(['a5', 'c3', 'e1']);
    const late = decideTurn([
      fact('planArc', 'The plan is to go after their weak pawns.', ['b2']),
      fact('structureJudgement', 'The pinned piece cannot be helped by a pawn.', ['c3']),
    ], undefined, undefined, instant.lead, null, false, LATE);
    expect(late.spoke).toEqual(['structureJudgement']);
  });
});

describe('the thought: one reason for each move, whichever computer gave it', () => {
  it('three reasons for the student\'s move: the most valuable speaks', () => {
    const d = decideTurn([
      fact('movePoint', 'That took their last defender away.', ['g4']),
      fact('timing', 'It works now because their bishop has left.', ['f1']),
      fact('recapture', 'Taking back with the knight keeps the file closed.', ['d4']),
    ], undefined, undefined, null, null, false, LATE);
    expect(d.spoke).toEqual(['timing']);
  });

  it('their move: one reason and one verdict, never three readings of it', () => {
    const d = decideTurn([
      fact('theirPurpose', 'Their move frees their bishop.', ['c1']),
      fact('theirIntent', 'Their move prepares a jump to g5.', ['g5']),
      fact('theirMoveCost', 'Their move leaves a hole for your knight.', ['e4']),
      fact('gap', 'Their move left their pawn without a guard.', ['b2']),
    ], undefined, undefined, null, null, false, LATE);
    expect(d.spoke).toEqual(['theirPurpose', 'theirMoveCost']);
  });

  it('a slip keeps every reason it has (the verdict\'s reasons are one thought)', () => {
    const d = decideTurn([
      fact('mistake', 'That was a mistake.', ['d6'], { stakes: costStakes(300) ?? undefined }),
      fact('drawback', 'It left the pawn behind it without a guard.', ['f6'], { stakes: costStakes(50) ?? undefined }),
      fact('fundamental', 'The same piece moved twice in the opening.', ['e7'], { stakes: costStakes(100) ?? undefined }),
    ], undefined, undefined, null, null, false, { ...LATE, slipCp: 300 });
    expect(d.spoke).toEqual(expect.arrayContaining(['mistake', 'drawback', 'fundamental']));
  });
});

describe('the thought is said in his order', () => {
  it('your move, their move, the board, the verdict, the habit — whatever leads on value', () => {
    const d = decideTurn([
      fact('blunderCheck', 'Blunder check before you let go of a piece.', ['b7'], { stakes: costStakes(300) ?? undefined }),
      fact('character', 'The position is tactical now.', []),
      fact('planArc', 'The plan is to go after their king.', ['e1'], { stakes: { points: 2, plies: 1 } }),
      fact('theirPurpose', 'Their move frees their bishop.', ['c1']),
      fact('movePoint', 'That took their last defender away.', ['g4']),
    ], undefined, undefined, null, null, false, LATE);
    const order = d.pkg.kept.map((k) => k.text.split(' ').slice(0, 3).join(' '));
    expect(order).toEqual(['That took their', 'Their move frees', 'The plan is', 'The position is', 'Blunder check before']);
  });

  it('danger speaks first, before the move\'s own reason', () => {
    const d = decideTurn([
      fact('movePoint', 'That took their last defender away.', ['g4']),
      fact('threat', 'Your knight is attacked.', ['c6'], { stakes: { points: 3, plies: 1 } }),
    ], undefined, undefined, null, null, false, LATE);
    expect(d.pkg.kept.map((k) => k.text.split(' ')[0])).toEqual(['Your', 'That']);
  });
});

describe('every lane and every clause kind answers which step it says', () => {
  it('the tables are total and place the facts by what they are about', () => {
    expect(THOUGHT_STEP.theirIntent).toBe('theirs');
    expect(THOUGHT_STEP.heldMove).toBe('yours');
    expect(THOUGHT_STEP.notYetPlayed).toBe('notYet');
    expect(CLAUSE_STEP.deliberation).toBe('choices');
    expect(thoughtStepOf('positionFacts', 'rule')).toBe('yours');
    expect(thoughtStepOf('positionFacts', 'not-a-kind')).toBe('board');
    expect(thoughtStepOf('phase', 'not-yet')).toBe('notYet');
  });
});
