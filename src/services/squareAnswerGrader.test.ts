import { describe, it, expect } from 'vitest';
import {
  applySquareHelp,
  applySquareShow,
  applySquareSilence,
  applySquareTap,
  gradeSquareSet,
  MISSES_BEFORE_SHOW,
  newSquareAnswer,
  squareAnswerDetail,
} from './squareAnswerGrader';
import { answerEvidenceOutcome } from './capabilityEvidence';

describe('gradeSquareSet — the deterministic set grader', () => {
  it('any: one key square is a full read', () => {
    const g = gradeSquareSet({ key: ['d5', 'f6'], taps: ['f6'], mode: 'any' });
    expect(g).toEqual({ hits: ['f6'], misses: ['d5'], extras: [], verdict: 'right' });
  });
  it('all: one of two is partial, both is right', () => {
    expect(gradeSquareSet({ key: ['d5', 'f6'], taps: ['d5'], mode: 'all' }).verdict).toBe('partial');
    expect(gradeSquareSet({ key: ['d5', 'f6'], taps: ['f6', 'd5'], mode: 'all' }).verdict).toBe('right');
  });
  it('an extra tap is wrong whatever else was found (guess-proofing)', () => {
    const g = gradeSquareSet({ key: ['d5', 'f6'], taps: ['d5', 'f6', 'a1'], mode: 'all' });
    expect(g.verdict).toBe('wrong');
    expect(g.extras).toEqual(['a1']);
    expect(gradeSquareSet({ key: ['d5'], taps: ['d5', 'e4'], mode: 'any' }).verdict).toBe('wrong');
  });
  it('no taps is partial (nothing answered, nothing wrong); duplicates count once', () => {
    expect(gradeSquareSet({ key: ['d5'], taps: [], mode: 'any' }).verdict).toBe('partial');
    expect(gradeSquareSet({ key: ['d5', 'f6'], taps: ['d5', 'd5'], mode: 'all' }).hits).toEqual(['d5']);
  });
  it('an empty key can never be tapped right', () => {
    expect(gradeSquareSet({ key: [], taps: ['e4'], mode: 'any' }).verdict).toBe('wrong');
  });
});

describe('the question state machine', () => {
  it('finds both squares of an all-question: found → complete, timings recorded', () => {
    let s = newSquareAnswer(['d5', 'f6'], 'all', 1000);
    let r = applySquareTap(s, 'd5', 1500);
    expect(r.outcome).toBe('found');
    s = r.state;
    r = applySquareTap(s, 'f6', 2300);
    expect(r.outcome).toBe('complete');
    const d = squareAnswerDetail(r.state);
    expect(d).toMatchObject({ msToFirst: 500, msBetween: [800], wrongAttempts: 0, help: 'none', keySize: 2 });
    expect(answerEvidenceOutcome({ solved: true, answer: d })).toEqual({ outcome: 'held', prompted: false });
  });

  it('a repeated right tap is ignored, not a second tap', () => {
    const s = applySquareTap(newSquareAnswer(['d5', 'f6'], 'all', 0), 'd5', 1).state;
    expect(applySquareTap(s, 'd5', 2).outcome).toBe('ignored');
  });

  it('wrong taps count; the key is shown after MISSES_BEFORE_SHOW, with the tag recorded once', () => {
    let s = newSquareAnswer(['d5'], 'any', 0);
    for (let i = 0; i < MISSES_BEFORE_SHOW - 1; i += 1) {
      const r = applySquareTap(s, i === 0 ? 'a1' : 'b2', i + 1, { wrongTag: 'hung-material' });
      expect(r.outcome).toBe('wrong');
      s = r.state;
    }
    const last = applySquareTap(s, 'c3', 10, { wrongTag: 'hung-material' });
    expect(last.outcome).toBe('reveal');
    expect(last.state.status).toBe('shown');
    const d = squareAnswerDetail(last.state);
    expect(d.wrongTags).toEqual(['hung-material']);
    expect(d.firstMissHelp).toBe('none');
    expect(d.help).toBe('show');
    // A miss made before any help is clean evidence of not knowing.
    expect(answerEvidenceOutcome({ solved: false, answer: d })).toEqual({ outcome: 'broken', prompted: false });
  });

  it('silence nudges only a PARTIAL answer, and a nudge is not a prompt', () => {
    const idle = newSquareAnswer(['d5', 'f6'], 'all', 0);
    expect(applySquareSilence(idle).nudge).toBe(false);
    const partial = applySquareTap(idle, 'd5', 1).state;
    const n = applySquareSilence(partial);
    expect(n.nudge).toBe(true);
    const done = applySquareTap(n.state, 'f6', 2).state;
    expect(answerEvidenceOutcome({ solved: true, answer: squareAnswerDetail(done) })).toEqual({ outcome: 'held', prompted: false });
  });

  it('a hint before the answer makes it prompted; "I don\'t know" shows it, prompted', () => {
    const hinted = applySquareTap(applySquareHelp(newSquareAnswer(['d5'], 'any', 0), 'hint'), 'd5', 1).state;
    expect(answerEvidenceOutcome({ solved: true, answer: squareAnswerDetail(hinted) })).toEqual({ outcome: 'held', prompted: true });
    const dk = applySquareShow(newSquareAnswer(['d5'], 'any', 0), 'dont-know');
    expect(dk.status).toBe('shown');
    expect(answerEvidenceOutcome({ solved: false, answer: squareAnswerDetail(dk) })).toEqual({ outcome: 'broken', prompted: true });
  });

  it('help never lowers', () => {
    const s = applySquareHelp(applySquareHelp(newSquareAnswer(['d5'], 'any', 0), 'hint'), 'nudge');
    expect(s.help).toBe('hint');
  });
});
