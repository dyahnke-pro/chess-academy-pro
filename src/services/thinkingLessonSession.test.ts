import { describe, it, expect, beforeEach } from 'vitest';
import { Chess, type Color, type Square } from 'chess.js';
import { ThinkingLessonSession, type AnsweredQuestion, type LessonProgress, type LessonView, type SessionDeps } from './thinkingLessonSession';
import { targetsKit, type LooseSquares } from './thinkingTargetsStep';
import { onThinkingLesson, resetThinkingLessonListeners, type ThinkingLessonRow } from './thinkingLessonEvents';
import type { LessonPositionCandidate } from './thinkingPositions';

const loose: LooseSquares = (fen: string, color: Color) => {
  const c = new Chess(fen);
  const out: Square[] = [];
  for (const row of c.board()) for (const cell of row) {
    if (!cell || cell.color !== color || cell.type === 'k') continue;
    if (c.attackers(cell.square, color).length === 0) out.push(cell.square);
  }
  return out;
};

// Four distinct boards, each with one or two loose black pieces.
const BOARDS = [
  '4k3/8/2n5/8/8/8/8/4K3 w - - 0 1',
  '4k3/8/8/3b4/8/8/8/4K3 w - - 0 1',
  '4k3/8/1r6/8/8/6n1/8/4K3 w - - 0 1',
  '4k3/8/8/8/8/2q5/8/4K3 w - - 0 1',
  '4k3/8/8/8/5b2/8/8/4K3 w - - 0 1',
];
const cands: LessonPositionCandidate[] = BOARDS.map((fen, i) => ({ fen, origin: 'game', gameId: `g${i}` }));

interface Harness {
  said: string[];
  views: LessonView[];
  records: AnsweredQuestion[];
  timers: (() => void)[];
  deps: SessionDeps;
}
function harness(): Harness {
  const h: Harness = { said: [], views: [], records: [], timers: [], deps: null as unknown as SessionDeps };
  let t = 0;
  h.deps = {
    say: async (s) => { h.said.push(s); },
    record: async (a) => { h.records.push(a); },
    remember: async () => {},
    now: () => (t += 100),
    setTimer: (fn) => { h.timers.push(fn); return () => { h.timers = h.timers.filter((f) => f !== fn); }; },
    onView: (v) => h.views.push(v),
  };
  return h;
}
const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));
async function waitAsking(h: Harness): Promise<LessonView> {
  for (let i = 0; i < 50; i++) {
    const v = h.views[h.views.length - 1];
    if (v?.asking) return v;
    await flush();
  }
  throw new Error('never asked');
}

describe('ThinkingLessonSession — step 5 end to end', () => {
  let rows: ThinkingLessonRow[];
  beforeEach(() => { resetThinkingLessonListeners(); rows = []; onThinkingLesson((r) => rows.push(r)); });

  it('a grey student gets Show, two Guided boards and a Solo, and every answer is recorded', async () => {
    const h = harness();
    const s = new ThinkingLessonSession(targetsKit(loose), cands, new Set(), h.deps);
    const done = s.run('grey');

    // Guide 1: one wrong tap (taught by method), then the right one.
    let v = await waitAsking(h);
    expect(v.stage).toBe('guide');
    const key1 = targetsKit(loose).keyFor(v.fen!)!.key;
    await s.tap('e1');
    expect(h.said[h.said.length - 1]).toMatch(/yours/);
    for (const sq of key1) await s.tap(sq);

    // Guide 2: clean.
    v = await waitAsking(h);
    for (const sq of targetsKit(loose).keyFor(v.fen!)!.key) await s.tap(sq);

    // Solo: clean.
    v = await waitAsking(h);
    expect(v.stage).toBe('solo');
    for (const sq of targetsKit(loose).keyFor(v.fen!)!.key) await s.tap(sq);

    const answers = await done;
    expect(answers.map((a) => a.stage)).toEqual(['guide', 'guide', 'solo']);
    expect(answers.map((a) => a.summary.held)).toEqual([false, true, true]);
    expect(h.records).toHaveLength(3);
    expect(rows.map((r) => r.outcome)).toEqual(['shown', 'broken', 'held', 'held']);
    expect(h.said.some((l) => /count who guards each|Finding targets is counting/.test(l))).toBe(true);
    expect(h.said[h.said.length - 1]).toMatch(/2 of 3 found clean/);
    // Four different boards were used.
    expect(new Set(answers.map((a) => a.position.fen)).size).toBe(3);
  });

  it('a green step is one quick Solo review', async () => {
    const h = harness();
    const s = new ThinkingLessonSession(targetsKit(loose), cands, new Set(), h.deps);
    const done = s.run('green');
    const v = await waitAsking(h);
    expect(v.stage).toBe('solo');
    expect(h.said[0]).toMatch(/skill chart shows this one green/);
    for (const sq of targetsKit(loose).keyFor(v.fen!)!.key) await s.tap(sq);
    expect((await done).length).toBe(1);
  });

  it('solo wrong taps are not narrated; silence after a partial nudges, then shows the rest', async () => {
    const h = harness();
    const two: LessonPositionCandidate[] = [{ fen: BOARDS[2], origin: 'puzzle', puzzleId: 'p' }];
    const s = new ThinkingLessonSession(targetsKit(loose), two, new Set(), h.deps);
    const done = s.run('green');
    await waitAsking(h);
    const before = h.said.length;
    await s.tap('a1');
    expect(h.said.length).toBe(before);
    await s.tap('b6');
    h.timers[h.timers.length - 1]();
    await flush();
    expect(h.said[h.said.length - 1]).toMatch(/one more/i);
    h.timers[h.timers.length - 1]();
    const answers = await done;
    expect(answers[0].summary).toMatchObject({ held: false, help: 'show', foundCount: 1 });
    expect(h.said.some((l) => /knight on g3 has no defender/.test(l))).toBe(true);
  });

  it('says so when there is no fair board, instead of serving an unfair one', async () => {
    const h = harness();
    const s = new ThinkingLessonSession(targetsKit(loose), [], new Set(), h.deps);
    expect(await s.run('grey')).toEqual([]);
    expect(h.said.join(' ')).toMatch(/could not find a clean board/);
  });

  it('stop ends the lesson at once', async () => {
    const h = harness();
    const s = new ThinkingLessonSession(targetsKit(loose), cands, new Set(), h.deps);
    const done = s.run('grey');
    await waitAsking(h);
    s.stop();
    await done;
    expect(h.views[h.views.length - 1].active).toBe(false);
  });
});

describe('ThinkingLessonSession — resumes where it stopped (plan D8)', () => {
  it('reports its place at every board; a stopped lesson leaves it, a finished one clears it', async () => {
    const h = harness();
    const progress: (LessonProgress | null)[] = [];
    h.deps.progress = async (p) => { progress.push(p); };
    const s = new ThinkingLessonSession(targetsKit(loose), cands, new Set(), h.deps);
    const done = s.run('grey');
    await waitAsking(h);
    s.stop();
    await done;
    expect(progress.map((p) => p?.cursor)).toEqual([0, 1]);
    expect(progress[1]).toEqual({ step: 'their-targets', stages: ['show', 'guide', 'guide', 'solo'], cursor: 1 });
    expect(s.wasStopped).toBe(true);
  });

  it('the next start continues at the stored board with the stored plan, no intro', async () => {
    const h = harness();
    const progress: (LessonProgress | null)[] = [];
    h.deps.progress = async (p) => { progress.push(p); };
    const s = new ThinkingLessonSession(targetsKit(loose), cands, new Set(), h.deps);
    const done = s.run('grey', { resume: { stages: ['show', 'guide', 'guide', 'solo'], cursor: 2 } });
    let v = await waitAsking(h);
    expect(h.said[0]).toMatch(/board 3 of 4/);
    expect(h.said.some((l) => l === targetsKit(loose).intro)).toBe(false);
    expect(v).toMatchObject({ stage: 'guide', index: 3, total: 4 });
    for (const sq of targetsKit(loose).keyFor(v.fen!)!.key) await s.tap(sq);
    v = await waitAsking(h);
    expect(v.stage).toBe('solo');
    for (const sq of targetsKit(loose).keyFor(v.fen!)!.key) await s.tap(sq);
    expect((await done).map((a) => a.stage)).toEqual(['guide', 'solo']);
    expect(progress[progress.length - 1]).toBeNull();
    expect(h.said[h.said.length - 1]).toMatch(/every one found clean/);
  });

  it('a resume at the first board, or past the end, starts fresh', async () => {
    const h = harness();
    const s = new ThinkingLessonSession(targetsKit(loose), cands, new Set(), h.deps);
    const done = s.run('green', { resume: { stages: ['solo'], cursor: 5 } });
    await waitAsking(h);
    expect(h.said[0]).toMatch(/skill chart shows this one green/);
    s.stop();
    await done;
  });
});
