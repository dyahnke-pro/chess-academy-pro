// A borrowed note is framed honestly and still names squares from somewhere
// else — and the student hears the squares.
//
// A full 16-ply game on prod (2026-08-09, run learn-full-wgk4ngmf) spoke, at
// two separate plies:
//
//   "As a rule in these positions: After Black plays Ke7, White should snap off
//    the bishop on d6 with Nxd6…"        — d6 empty
//   "…Black's plan was to meet Ng5 with Ne5… once the king on g1…"
//                                        — no king on g1
//
// The "as a rule" framing is what makes the borrow legitimate at all, and it is
// exactly what makes this dangerous: the sentence sounds like a generalization
// right up to the square, which the student then looks for and cannot find.
// Every one of these came from `CoachTeachPage.voicePackage`, the teaching tier
// — the one lane on the turn that reached the student ungraded.
import { describe, it, expect } from 'vitest';
import { gradeBorrowedTeaching, gradeNarrationText } from './coachAnswerGates';

// The two positions from that game, both mid-middlegame with a full board, so
// nothing passes here for want of pieces to contradict.
const PLY_11 = 'rn2k2N/ppp3pp/5n2/2Pb4/2P1p3/8/PP2BP1q/RNB1KR2 b Qq - 0 12';
const PLY_13 = 'r3k2N/ppp3pp/2n2n2/2Pb4/2P5/5B2/PP5q/RNB1KR2 b Qq - 0 14';

const graded = (text: string, fen: string) =>
  gradeBorrowedTeaching(text, fen, 'coachTeach.teachingTier');

describe('the teaching tier is graded against the board it is spoken over', () => {
  it('drops the sentence that put a bishop on an empty d6', () => {
    const said = 'After Black plays Ke7, White should snap off the bishop on d6 with Nxd6, driving the king to d6.';
    expect(graded(said, PLY_11)).not.toContain('d6');
  });

  it('drops the sentence that put a king on an empty g1', () => {
    const said = 'If White takes twice on e5, Black opens the f-file against the king on g1.';
    expect(graded(said, PLY_13)).not.toContain('g1');
  });

  it('keeps the general teaching the borrow was reached for', () => {
    // The point is not to silence borrowed notes — it is to keep the part that
    // was true anywhere and lose the part that claimed a square here.
    const said = 'Trading pieces when the knight is pinned is better than retreating. '
      + 'White should snap off the bishop on d6 with Nxd6.';
    const out = graded(said, PLY_11);
    expect(out).toContain('better than retreating');
    expect(out).not.toContain('d6');
  });

  it('leaves a note that is true of this board alone', () => {
    // d5 really does hold a bishop at ply 11 — grading must not eat teaching
    // just for naming a square.
    const said = 'The bishop on d5 is the piece holding this position together.';
    expect(graded(said, PLY_11)).toContain('d5');
  });
});

describe('the coach\'s own line keeps its hypotheticals', () => {
  it('the ordinary gate still lets a real future board through', () => {
    // The exemption exists for a reason and must survive this: narrating the
    // line it is playing, the coach may talk about a board one move away.
    // Only the BORROWED tiers are judged strictly.
    const said = 'After Bd6, the bishop on d6 rakes the long diagonal.';
    expect(gradeNarrationText(said, PLY_11, 'test')).toContain('d6');
    expect(gradeBorrowedTeaching(said, PLY_11, 'test')).not.toContain('d6');
  });
});
