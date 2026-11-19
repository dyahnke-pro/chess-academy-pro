// THE READ SPEAKS THE PICTURE (WO-PICTURE-01 P5): on three of Danya's boards
// (the engine reads stored in `fixtures/pictureBoards.ts`), "Read this
// position" says the picture's conclusions in his order — the verdict with its
// reason, the "but" (each failed try with the reply that refutes it), the plan
// that survives with its details and its "because", then the move's jobs.
// Before P5 the read never said the verdict or the plan at all. Print the
// reads: READ_SPEAKS_PRINT=1 npx vitest run src/services/readDecider.speaks.test.ts
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { boardReadFacts, type BoardFact } from './boardReadFacts';
import { decideRead, readContextOf, type ReadContext, type ReadFact } from './readDecider';
import { becauseAfterConclusion, type ThoughtFact } from './thoughtComposer';
import { NO_STAKES } from './factStakes';
import { NO_PROOF } from './proof';
import { ROOKLIFT, ENDGAME, SEVENTH, type Board } from '../test/fixtures/pictureBoards';
import type { AnalysisLine } from '../types';

const place = (f: string): string => f.split(' ').slice(0, 2).join(' ');
const asLine = (ev: number, moves: string[], k = 0): AnalysisLine => ({ rank: k + 1, evaluation: ev, mate: null, moves, depth: 16 } as AnalysisLine);

/** The engine, replayed off the stored reads: each candidate's line from the
 *  board after it. */
function readerFor(b: Board): (fen: string) => Promise<readonly AnalysisLine[] | null> {
  const m = new Map<string, AnalysisLine[]>();
  for (const [ev, mv] of [...b.reads, ...b.top]) {
    const moves = mv.split(' ');
    const c = new Chess(b.fen);
    try { c.move({ from: moves[0].slice(0, 2), to: moves[0].slice(2, 4), promotion: moves[0][4] }); } catch { continue; }
    if (!m.has(place(c.fen()))) m.set(place(c.fen()), [asLine(ev, moves.slice(1))]);
  }
  return async (fen) => m.get(place(fen)) ?? null;
}

const cache = new Map<string, Promise<{ facts: BoardFact[]; read: ReadFact[] }>>();
function readOf(b: Board, readTempting = true): Promise<{ facts: BoardFact[]; read: ReadFact[] }> {
  const key = `${b.fen}|${readTempting}`;
  if (!cache.has(key)) cache.set(key, (async () => {
    const student = b.fen.split(' ')[1] as 'w' | 'b';
    const before = b.top.map(([ev, mv], k) => asLine(ev, mv.split(' '), k));
    const set = await boardReadFacts({ fen: b.fen, studentColor: student, rating: 1800, before, read: readerFor(b), withhold: false, tense: 'now', history: [], theory: false, readTempting, studentNeedContext: null });
    const ctx = readContextOf({ fen: b.fen, top: { evaluation: before[0].evaluation, mate: null }, bestUci: before[0].moves[0], withheld: null, studentShot: false });
    const read = decideRead(set.facts, ctx).facts;
    if (process.env.READ_SPEAKS_PRINT) console.log(`\n${b.fen}\n${read.map((f, i) => `${i + 1}. [${f.kind}${f.computer ? `:${f.computer}` : ''}] ${f.text}`).join('\n')}`);
    return { facts: set.facts, read };
  })());
  return cache.get(key) as Promise<{ facts: BoardFact[]; read: ReadFact[] }>;
}

/** The read's shape: the verdict leads, every try it names is refuted right
 *  after it in its own order, then the plan. */
function expectArgument(read: readonly ReadFact[]): void {
  const v = read[0];
  expect(v.computer).toBe('pictureVerdict');
  const tries = v.tries ?? [];
  expect(tries.length).toBeGreaterThan(0);
  expect(read.slice(1, 1 + tries.length).map((f) => f.move)).toEqual(tries);
  expect(read[1 + tries.length].computer).toBe('picturePlan');
}

describe('the read says the picture in Danya\'s order', { timeout: 300_000 }, () => {
  it('the rook lift #2: slightly better, but breaking through is another matter; the tries; the lift and the rook\'s road', async () => {
    const { read } = await readOf(ROOKLIFT);
    expectArgument(read);
    // The verdict with its reason, the band said once.
    expect(read[0].text).toMatch(/^You're slightly better — their king is still in the middle\. But (it is hard to finish them off|breaking through is another matter)\. .*…Qf6.* all fail\.$/);
    expect(read[0].text.match(/slightly better/g)).toHaveLength(1);
    // …Qf6 has no refuter's sentence: it is said in the verdict's own words.
    expect(read.some((f) => /^…Qf6 (is met by|runs into) Rh5, and the queen (goes|heads straight) back to g6\.$/.test(f.text))).toBe(true);
    const plan = read.findIndex((f) => f.computer === 'picturePlan');
    expect(read[plan].text).toMatch(/^So the slower way: …Kb8 first, then the rook lift\./);
    // The rook's road is the lift said in more detail, right behind it.
    expect(read[plan + 1]).toMatchObject({ computer: 'planOfTheBoard' });
    expect(read[plan + 1].text).toMatch(/^Your rook on d8 has a better road/);
    // NEGATIVE: the rival plan about other pieces ("break with d5", the try
    // the same read refuted) is never its detail.
    expect(read.some((f) => /break with d5/.test(f.text))).toBe(false);
    // NEGATIVE: a try the verdict does not name (a blunder like …Nc7) is no step.
    expect(read.some((f) => /^Nc7 /.test(f.text))).toBe(false);
  });

  it('endgame attacks #3: level with no direct way in; first Be2, because b5 is the target its line takes', async () => {
    const { read } = await readOf(ENDGAME);
    expectArgument(read);
    expect(read[0].text).toMatch(/^It's level, and (there is no direct way in|the direct tries get nowhere)\. c4, Qc5, Qe5 and Qb4 all fail\.$/);
    const plan = read.findIndex((f) => f.computer === 'picturePlan');
    expect(read[plan].text).toMatch(/^So (first Be2|the quiet Be2 instead)\.$/);
    // THE BECAUSE: Be2's line goes on to take the pawn on b5.
    expect(read[plan + 1].kind).toBe('priority');
    expect(read[plan + 1].squares).toEqual(['b5']);
    // NEGATIVE: the c-pawn's guard of d4 shares the queen's square with the
    // line, but is no detail of a plan that never names the queen.
    expect(read.some((f) => /Your c-pawn can still guard d4/.test(f.text))).toBe(false);
  });

  it('the seventh rank #2: clearly better, but hard to finish; first Bf7, its road, and the h-pawn it guards — the …g6 break said once', async () => {
    const { read } = await readOf(SEVENTH);
    expectArgument(read);
    expect(read[0].text).toMatch(/^You're clearly better — .*a5.*\. But (it is hard to finish them off|breaking through is another matter)\. Rxa5, Kf4 and Rd5 all fail\.$/);
    const plan = read.findIndex((f) => f.computer === 'picturePlan');
    expect(read[plan].text).toMatch(/^So (first Bf7|the quiet Bf7 instead)\. On f7 the bishop guards your h-pawn/);
    expect(read[plan + 1].computer).toBe('planOfTheBoard');
    expect(read[plan + 2]).toMatchObject({ kind: 'their-target', squares: ['h5'] });
    // ONE IDEA ONCE, BY ITS CLAIM: the board plan, their dead counterplay and
    // the stopped break are one idea.
    expect(read.filter((f) => /g6 break|push to g6/.test(f.text))).toHaveLength(1);
  });

  it('NEGATIVE: with no tries read there is no picture — no verdict beyond the band, the old order', async () => {
    const { read } = await readOf(ROOKLIFT, false);
    expect(read.some((f) => f.computer === 'pictureVerdict' || f.computer === 'picturePlan')).toBe(false);
    expect(read[0].text).toBe("You're slightly better — their king is still in the middle.");
    expect(read.some((f) => /hard to finish|breaking through|all fail/.test(f.text))).toBe(false);
  });
});

describe('no support is stapled without a computed link', () => {
  // White to move: Nf3 with Nd4 and Ng5 behind it; their pawns on a7 and h7.
  const FEN = '4k3/p6p/8/8/8/5N2/8/4K3 w - - 0 1';
  // The best move left unread: the weights read the tries off it, not on it.
  const ctx: ReadContext = { fen: FEN, bucket: 'open', best: [], withheld: [], puzzle: false, studentShot: false };
  const verdict: ReadFact = { from: 'position', kind: 'verdict', computer: 'pictureVerdict', text: "You're slightly better, but it is hard to finish them off. Ng5 fails.", squares: ['f3', 'g5'], tries: ['f3g5'] };
  const plan: ReadFact = { from: 'position', kind: 'plan-now', computer: 'picturePlan', text: 'So first Nd4.', squares: ['f3', 'd4'], line: ['f3d4', 'e8d7', 'd4b5'] };
  const named: ReadFact = { from: 'tempting', kind: 'refuted', computer: 'temptingOnBoard', text: 'Ng5 is met by …h6.', squares: ['f3', 'g5'], move: 'f3g5' };
  // Shares the try's squares but refutes another move: not the verdict's "but".
  const other: ReadFact = { from: 'tempting', kind: 'refuted', computer: 'temptingOnBoard', text: 'Nh4 runs into nothing much.', squares: ['f3', 'g5'], move: 'f3h4' };
  // The knight's line reaches a7's neighbour b5, never a7 or h7 directly — a7
  // is reached (b5 hits a7), h7 is not, though both share nothing with the plan.
  const reached: ReadFact = { from: 'position', kind: 'target', text: 'Their pawn on a7 is the target.', squares: ['a7'] };
  const notReached: ReadFact = { from: 'position', kind: 'target', text: 'Their pawn on h7 is the target.', squares: ['h7'] };
  const said = (fs: ReadFact[]): string[] => decideRead(fs, ctx).facts.map((f) => f.text);

  it('the verdict\'s "but" is the refutation of a try it names, never another move on the same squares', () => {
    const s = said([verdict, other, named, plan]);
    expect(s.slice(0, 2)).toEqual([verdict.text, named.text]);
    expect(s).not.toContain(other.text);
  });

  it('a target is the plan\'s because only when its line goes after it', () => {
    const s = said([verdict, named, plan, reached, notReached]);
    expect(s.indexOf(reached.text)).toBe(s.indexOf(plan.text) + 1);
    expect(s).not.toContain(notReached.text);
  });
});

describe('the composer says the because behind its conclusion (`becauseAfterConclusion`)', () => {
  const FEN = '6k1/1q3pp1/5n1p/1p3P2/p2Qp3/2P1P1P1/1P5P/5BK1 w - - 0 29';
  const fact = (over: Partial<ThoughtFact> & Pick<ThoughtFact, 'id' | 'computer' | 'squares'>): ThoughtFact => ({
    namesStudentMove: false, kind: 'plan-steps', group: 'story', step: 'board', source: 'teachingMove', idea: 'plan', weight: 50,
    stakes: NO_STAKES.unmeasured, proof: NO_PROOF.stated, thread: { none: 'local' }, seat: 'student', fen: FEN, claims: [over.id], text: over.id, ...over,
  } as ThoughtFact);
  const target = fact({ id: 'target', computer: 'pictureTarget', kind: 'priority', group: 'choices', step: 'choices', squares: ['b5', 'd5'] });
  const job = fact({ id: 'job', computer: 'moveJob', kind: 'move-job', group: 'move', step: 'yours', squares: ['e2'] });
  it('a target on the plan\'s own pawn moves behind the plan', () => {
    const plan = fact({ id: 'plan', computer: 'planSteps', squares: ['e2', 'b5'] });
    const picked = [job, target, plan];
    becauseAfterConclusion(picked);
    expect(picked.map((f) => f.id)).toEqual(['job', 'plan', 'target']);
  });
  it('NEGATIVE: sharing only an empty square (d5) is no link — the target keeps its step', () => {
    const plan = fact({ id: 'plan', computer: 'planSteps', squares: ['e2', 'd5'] });
    const picked = [job, target, plan];
    becauseAfterConclusion(picked);
    expect(picked.map((f) => f.id)).toEqual(['job', 'target', 'plan']);
  });
});
