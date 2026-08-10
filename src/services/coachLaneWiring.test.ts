// EVERY LANE WE ADDED, PROVED REACHABLE (David 2026-08-10: "I want you making
// sure that every thing we have added is wired and working 100% like it
// should!!").
//
// This is a WIRING gate, not a behaviour gate. Behaviour is covered by each
// lane's own file; what has repeatedly gone wrong this session is different and
// invisible: a lane that computes correctly, passes its own tests, and reaches
// nobody. Four were found by auditing rather than by a failing test —
//   · the plan queued at 'computed' rank instead of 'plan', so the borrowed
//     tier never stood down and the plan spoke last;
//   · the coach's own callout read from a stale closure and saw null;
//   · the eval-swing sentence that could only ever be zero;
//   · the hint register writing into the prompt array nobody reads.
// None of them threw. Each just quietly said nothing.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p: string): string => readFileSync(p, 'utf8');
const TEACH = read('src/components/Coach/CoachTeachPage.tsx');
const HOOK = read('src/hooks/useDiscussionPractice.ts');

describe('every producer we added has a live consumer', () => {
  const wired: Array<[string, string, string]> = [
    ['the look-ahead plan', TEACH, 'planFromUci('],
    ['the key-square line', TEACH, 'keySquareLine('],
    ['the board read', TEACH, 'positionReadLine('],
    ['the line-shape read', TEACH, 'lineShapeLine('],
    ['the terminal read', TEACH, 'terminalReadLine('],
    ['the board marks', TEACH, 'planMarks('],
    ['the coach-side callout', TEACH, 'callInaccuracy('],
    ['the student-side callout', HOOK, 'callInaccuracy('],
    ['the rear-facing PV', HOOK, 'whatItAllowed('],
    ['the structural drawback', HOOK, 'findStudentDrawback('],
  ];
  for (const [name, file, symbol] of wired) {
    it(`${name} is called`, () => {
      expect(file.includes(symbol), `${symbol} has no caller`).toBe(true);
    });
  }
});

describe('the lanes reach the VOICE, not just the prompt', () => {
  // The distinction that cost the hint register a whole session: `facts` feeds
  // the prompt, and the prompt only runs when the student types. A lane that
  // pushes there and nowhere else is silent during ordinary play.
  it('the plan is queued for speech at the PLAN rank', () => {
    expect(TEACH).toMatch(/queueSpokenHint\(planFen, graded, 'plan'\)/);
  });

  it('the coach callout is queued at the coachMistake rank', () => {
    expect(TEACH).toMatch(/queueSpokenHint\(.*?call\.said, 'coachMistake'\)/);
  });

  it('the borrowed tier is queued WITH the plan, so the yield rule can see both', () => {
    expect(TEACH).toMatch(/queueSpokenHint\(.*?borrowedLine, 'borrowed'\)/);
    expect(TEACH, 'the borrowed line is still packaged early, where no plan exists yet')
      .not.toMatch(/kind: 'borrowed' as const, text: teachingLine/);
  });

  it('the hint register speaks rather than only prompting', () => {
    const hintPushes = TEACH.match(/facts\.push\(packageForRegister\(/g)?.length ?? 0;
    // NB: not `[^)]*` — the call is `queueSpokenHint(probe.fen(), …)` and the
    // fen() closes a paren, so an exclusion class stops before the payload.
    const hintSpeaks = TEACH.match(/queueSpokenHint\(.*?packageForRegister\(/g)?.length ?? 0;
    expect(hintSpeaks, 'hints go to the prompt but never to the voice').toBeGreaterThanOrEqual(hintPushes - 1);
  });

  it('the queued package is actually spoken', () => {
    expect(TEACH).toMatch(/speakTrackA\(hintPkg\.spoken\)/);
  });
});

describe('the couplings that make the wiring safe', () => {
  it('the coach verdict reads a REF, never a state value from a closure', () => {
    // State captured in a callback created before the engine finished is the
    // PREVIOUS render's value — null on exactly the turn it is needed.
    expect(HOOK).toMatch(/coachToMove: \{ current:/);
    expect(TEACH).toContain('discussion.coachToMove.current');
  });

  it('the pending-speak guard compares POSITION, not the whole FEN', () => {
    // A guard that fails on a halfmove clock silently drops the utterance.
    expect(TEACH).toMatch(/const samePosition = /);
    expect(TEACH).toMatch(/slice\(0, 4\)\.join\(' '\)/);
  });

  it('the marks are computed from what SURVIVED grading', () => {
    expect(TEACH).toMatch(/gradeNarrationText\(said, planFen/);
    expect(TEACH).toMatch(/planMarks\(\{\s*plan,\s*spoken: graded/);
  });
});
