import { describe, it, expect } from 'vitest';
import type { Square } from 'chess.js';
import {
  applicableSteps, choiceAnswerDetail, choiceLine, choicePromptLine, gradedStep, mixedBoards, stepLabel,
  type StepChoiceAnswer,
} from './thinkingMixedRound';
import { ThinkingLessonSession, type AnsweredQuestion, type LessonProgress, type LessonView, type SessionDeps, type StepKit } from './thinkingLessonSession';
import { answerEvidenceOutcome } from './capabilityEvidence';
import { boardIdentity, type LessonPositionCandidate } from './thinkingPositions';

// Four boards. A: only "am I safe?" applies; B: only "their targets"; C: both;
// D: neither.
const A = '4k3/8/8/8/8/8/8/R3K3 w - - 0 1';
const B = '4k3/8/8/8/8/8/8/1R2K3 w - - 0 1';
const C = '4k3/8/8/8/8/8/8/2R1K3 w - - 0 1';
const D = '4k3/8/8/8/8/8/8/3RK3 w - - 0 1';

const fakeKit = (step: string, keys: Record<string, Square[]>): StepKit => ({
  step,
  keyFor: (fen) => (keys[fen] ? { key: keys[fen], nearMiss: [] } : null),
  showLine: () => 'show', prompt: () => `${step} prompt`, wrongTapLine: () => 'no', reasonFor: () => null, intro: `${step} intro`,
});
const SAFE = fakeKit('am-i-safe', { [A]: ['a1'], [C]: ['c1'] });
const TARGETS = fakeKit('their-targets', { [B]: ['e8'], [C]: ['e8'] });
const KITS = [SAFE, TARGETS];
const pool = (fens: string[], origin: 'game' | 'puzzle' = 'puzzle'): LessonPositionCandidate[] => fens.map((fen) => ({ fen, origin }));

describe('applicableSteps / mixedBoards', () => {
  it('a step applies where its own kit has a fair key', () => {
    expect(applicableSteps(KITS, { fen: C, origin: 'puzzle' }).map((h) => h.step)).toEqual(['am-i-safe', 'their-targets']);
    expect(applicableSteps(KITS, { fen: D, origin: 'puzzle' })).toEqual([]);
  });

  it('one board per step, the crisp board first, never a used one, never a board no step asks', () => {
    const boards = mixedBoards(KITS, pool([C, A, B, D]), new Set());
    expect(boards.map((b) => b.candidate.fen).sort()).toEqual([A, B].sort());
    expect(boards.find((b) => b.candidate.fen === A)?.applicable).toEqual(['am-i-safe']);
    // A used: the board both steps ask stands in for "am I safe?".
    const again = mixedBoards(KITS, pool([C, A, B]), new Set([boardIdentity(A)]));
    expect(again.map((b) => b.candidate.fen).sort()).toEqual([B, C].sort());
    expect(again.find((b) => b.candidate.fen === C)?.keys).toEqual({ 'am-i-safe': ['c1'], 'their-targets': ['e8'] });
  });

  it('own games first, and the same pool always gives the same order', () => {
    const own = mixedBoards([SAFE], [...pool([A]), { fen: C, origin: 'game' }], new Set());
    expect(own.map((b) => b.candidate.fen)).toEqual([C]);
    expect(mixedBoards(KITS, pool([A, B]), new Set())).toEqual(mixedBoards(KITS, pool([B, A]), new Set()));
  });
});

describe('the step-choice words', () => {
  it('a right pick names the question, with no praise', () => {
    const line = choiceLine('am-i-safe', ['am-i-safe'], 0);
    expect(line).toMatch(/^Am I safe\? — /);
    expect(line).not.toMatch(/great|well done|excellent|correct/i);
  });
  it('a right pick on a board two steps ask names the other too', () => {
    expect(choiceLine('am-i-safe', ['am-i-safe', 'their-targets'], 0)).toMatch(/"Where are their targets\?" as well/);
  });
  it('a wrong pick says why it does not fit and names what the board asks', () => {
    expect(choiceLine('their-targets', ['am-i-safe'], 0)).toBe('Nothing on this board answers "Where are their targets?" cleanly. It asks "Am I safe?".');
    expect(choiceLine(null, ['am-i-safe'], 0)).toBe('This board asks "Am I safe?".');
  });
  it('the prompt rotates on a stable key, never rolled', () => {
    expect(choicePromptLine(4)).toBe(choicePromptLine(4));
    expect(new Set([0, 1, 2].map(choicePromptLine)).size).toBe(3);
  });
  it('the graded step is the pick when it applies, else the first that does', () => {
    expect(gradedStep('their-targets', ['am-i-safe', 'their-targets'])).toBe('their-targets');
    expect(gradedStep('hit-two', ['am-i-safe', 'their-targets'])).toBe('am-i-safe');
    expect(gradedStep(null, ['their-targets'])).toBe('their-targets');
    expect(stepLabel('am-i-safe')).toBe('Am I safe?');
  });
});

describe('choiceAnswerDetail — one evidence shape', () => {
  const base: StepChoiceAnswer = { fen: A, chosen: 'am-i-safe', applicable: ['am-i-safe'], graded: 'am-i-safe', right: true, msToFirst: 900 };
  it('a right pick is held and unprompted', () => {
    expect(answerEvidenceOutcome({ solved: true, answer: choiceAnswerDetail(base) })).toEqual({ outcome: 'held', prompted: false });
  });
  it('a wrong pick is an honest, unprompted break', () => {
    const wrong = { ...base, chosen: 'their-targets', right: false };
    expect(answerEvidenceOutcome({ solved: false, answer: choiceAnswerDetail(wrong) })).toEqual({ outcome: 'broken', prompted: false });
  });
  it('"I don\'t know" is prompted', () => {
    const dk = { ...base, chosen: null, right: false };
    expect(answerEvidenceOutcome({ solved: false, answer: choiceAnswerDetail(dk) }).prompted).toBe(true);
  });
});

// ─── The session runs a mixed round end to end ───────────────────────────

interface Harness { said: string[]; views: LessonView[]; records: AnsweredQuestion[]; choices: StepChoiceAnswer[]; progress: (LessonProgress | null)[]; remembered: string[]; deps: SessionDeps }
function harness(): Harness {
  const h: Harness = { said: [], views: [], records: [], choices: [], progress: [], remembered: [], deps: null as unknown as SessionDeps };
  let t = 0;
  h.deps = {
    say: async (s) => { h.said.push(s); },
    record: async (a) => { h.records.push(a); },
    recordChoice: async (c) => { h.choices.push(c); },
    progress: async (p) => { h.progress.push(p); },
    remember: async (step, fen) => { h.remembered.push(`${step}:${fen}`); },
    now: () => (t += 100),
    setTimer: () => () => {},
    onView: (v) => h.views.push(v),
  };
  return h;
}
const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));
async function waitFor(h: Harness, pred: (v: LessonView) => boolean): Promise<LessonView> {
  for (let i = 0; i < 80; i++) {
    const v = h.views[h.views.length - 1];
    if (v && pred(v)) return v;
    await flush();
  }
  throw new Error('never reached');
}
const MIXED_KIT: StepKit = { ...fakeKit('mixed', {}), intro: 'mixed intro' };

describe('ThinkingLessonSession — a mixed round', () => {
  it('asks which step each board asks, grades and records the choice, then asks that step\'s question', async () => {
    const h = harness();
    const s = new ThinkingLessonSession(MIXED_KIT, pool([A, B]), new Set(), h.deps, KITS);
    const done = s.run('green');

    // Board 1.
    let v = await waitFor(h, (x) => x.choosing);
    expect(v.choices.map((c) => c.step)).toEqual(['am-i-safe', 'their-targets']);
    expect(v.step).toBe('mixed');
    const first = v.fen!;
    const rightStep = first === A ? 'am-i-safe' : 'their-targets';
    const wrongStep = first === A ? 'their-targets' : 'am-i-safe';
    s.choose(wrongStep);                                   // a wrong pick
    v = await waitFor(h, (x) => x.asking);
    expect(v.step).toBe(rightStep);                        // the board's own step is asked
    expect(h.said.some((l) => /^Nothing on this board answers/.test(l))).toBe(true);
    for (const sq of (first === A ? ['a1'] : ['e8']) as Square[]) await s.tap(sq);

    // Board 2: the right pick.
    v = await waitFor(h, (x) => x.choosing && x.fen !== first);
    const second = v.fen!;
    s.choose(second === A ? 'am-i-safe' : 'their-targets');
    await waitFor(h, (x) => x.asking);
    for (const sq of (second === A ? ['a1'] : ['e8']) as Square[]) await s.tap(sq);

    const answers = await done;
    expect(h.said[0]).toMatch(/mixed round/i);
    expect(answers.map((a) => a.step).sort()).toEqual(['am-i-safe', 'their-targets']);
    expect(h.choices.map((c) => c.right)).toEqual([false, true]);
    expect(h.choices[0].graded).toBe(rightStep);
    expect(h.said[h.said.length - 1]).toMatch(/1 of 2 boards read right, 1 of 2 answered clean/);
    // Each board remembered for the round AND for the step it was answered under.
    expect(h.remembered).toContain(`mixed:${first}`);
    expect(h.remembered).toContain(`${rightStep}:${first}`);
    // Ran to its end: nothing to resume.
    expect(h.progress[h.progress.length - 1]).toBeNull();
  });

  it('"I don\'t know" at the choice names the question and moves on to it', async () => {
    const h = harness();
    const s = new ThinkingLessonSession(MIXED_KIT, pool([A]), new Set(), h.deps, KITS);
    const done = s.run('green');
    await waitFor(h, (x) => x.choosing);
    await s.dontKnow();
    await waitFor(h, (x) => x.asking);
    expect(h.said).toContain('This board asks "Am I safe?".');
    await s.tap('a1');
    await done;
    expect(h.choices[0]).toMatchObject({ chosen: null, right: false, graded: 'am-i-safe' });
  });

  it('a chip outside the round, or tapped when no choice is open, is ignored', async () => {
    const h = harness();
    const s = new ThinkingLessonSession(MIXED_KIT, pool([A]), new Set(), h.deps, KITS);
    s.choose('am-i-safe');                                 // nothing open yet
    const done = s.run('green');
    await waitFor(h, (x) => x.choosing);
    s.choose('hit-two');
    await flush();
    expect(h.choices).toHaveLength(0);
    s.stop();
    await done;
    expect(h.choices).toHaveLength(0);
    expect(s.wasStopped).toBe(true);
  });
});
