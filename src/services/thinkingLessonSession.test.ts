import { describe, it, expect, beforeEach } from 'vitest';
import { Chess, type Color, type Square } from 'chess.js';
import { ThinkingLessonSession, type AnsweredQuestion, type LessonView, type SessionDeps } from './thinkingLessonSession';
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

describe('ThinkingLessonSession — follow-up chains (plan C1)', () => {
  // Black knight c6 guarded by b7, hit by the d5 pawn and the b4 knight.
  const GUARDED = '2k5/1p6/2n5/3P4/1N6/8/8/6K1 w - - 0 1'; // b7 guarded by the c8 king, so the key is clean
  const one: LessonPositionCandidate[] = [{ fen: GUARDED, origin: 'puzzle', puzzleId: 'p-chain' }];

  it('a right answer is followed by attackers → defenders → who takes first, then ONE record with the depth reached', async () => {
    const h = harness();
    const s = new ThinkingLessonSession(targetsKit(loose), one, new Set(), h.deps);
    const done = s.run('green');
    let v = await waitAsking(h);
    expect(v.fen).toBe(GUARDED);
    await s.tap('c6');

    v = await waitAsking(h);
    expect(v.focus).toEqual(['c6']);
    expect(v.prompt).toMatch(/attack/);
    await s.tap('d5');
    await s.tap('b4');

    v = await waitAsking(h);
    expect(v.prompt).toMatch(/defend/);
    await s.tap('b7');

    v = await waitAsking(h);
    expect(v.prompt).toMatch(/take|wins/);
    await s.tap('d5');

    const answers = await done;
    expect(answers).toHaveLength(1);
    expect(h.records).toHaveLength(1);
    expect(h.records[0].summary.detail.chainDepth).toBe(3);
    // The count is not given away before the chain asks for it…
    expect(h.said.some((l) => /guarded, but your pawn attacks it/.test(l))).toBe(false);
    // …and the computed exchange result closes it.
    expect(h.said.some((l) => /take with the pawn first.*3 points up/.test(l))).toBe(true);
  });

  it('a missed link is shown and the chain goes on; depth counts only the clean links from the first', async () => {
    const h = harness();
    const s = new ThinkingLessonSession(targetsKit(loose), one, new Set(), h.deps);
    const done = s.run('red');
    await waitAsking(h);
    await s.tap('c6');
    await waitAsking(h);
    await s.tap('g1');
    expect(h.said[h.said.length - 1]).toMatch(/cannot reach c6/);
    await s.dontKnow();
    await waitAsking(h);
    await s.tap('b7');
    await waitAsking(h);
    await s.tap('d5');
    const answers = await done;
    expect(h.said.some((l) => /The attackers: your (pawn|knight)/.test(l))).toBe(true);
    expect(answers[0].summary.detail.chainDepth).toBe(0);
    expect(answers[0].summary.held).toBe(true);
  });

  it('no chain after a root answer that was shown', async () => {
    const h = harness();
    const s = new ThinkingLessonSession(targetsKit(loose), one, new Set(), h.deps);
    const done = s.run('green');
    await waitAsking(h);
    await s.dontKnow();
    const answers = await done;
    expect(answers[0].summary.detail.chainDepth).toBe(0);
    expect(h.views.some((x) => x.focus.length > 0)).toBe(false);
  });
});
