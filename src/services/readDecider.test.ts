import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { decideRead, readContextOf, readWeight, type ReadContext, type ReadFact } from './readDecider';
import { READ_HABIT } from './methodBeat';

// Every fact the app's computers made on Korchnoi's board from Danya's "How to
// avoid blunders" (a3 to play), with what the old read said (`keptToday`).
interface FixtureFact extends ReadFact { keptToday: boolean }
const korchnoi = JSON.parse(readFileSync('src/test/fixtures/read-korchnoi-board.json', 'utf8')) as { fen: string; facts: FixtureFact[] };

// Danya's boards (facts from the saved board-facts dump; squares backfilled
// once from the words, the dump predating coupled squares) and two Lichess
// puzzles read with the answer withheld (facts from `boardReadFacts`).
interface Board { fen: string; top: { cp: number | null; mate: number | null; best: string }; facts: ReadFact[] }
interface Puzzle { fen: string; answer: string; facts: ReadFact[] }
const fx = JSON.parse(readFileSync('src/test/fixtures/read-decider-boards.json', 'utf8')) as { boards: Record<string, Board>; puzzles: Record<string, Puzzle> };

const ctxOf = (b: Board, over: Partial<ReadContext> = {}): ReadContext => ({
  ...readContextOf({
    fen: b.fen,
    top: { evaluation: b.top.mate != null ? (b.top.mate > 0 ? 100000 : -100000) : (b.top.cp ?? 0), mate: b.top.mate },
    bestUci: b.top.best, withheld: null, studentShot: false, said: null,
  }),
  ...over,
});
const OPEN: ReadContext = { fen: null, bucket: 'open', best: [], withheld: [], puzzle: false, studentShot: false, said: new Set() };
const said = (facts: readonly ReadFact[], ctx: ReadContext): string[] => decideRead(facts, ctx).facts.map((f) => f.text);

describe('the read decider: his order, the fact he would say at each step', () => {
  it("Korchnoi's board: the verdict, a3 and why, Nxb5 refuted — never the minority attack", () => {
    const s = said(korchnoi.facts, { ...OPEN, best: ['a2', 'a3'] });
    expect(s[0]).toMatch(/pawn down.*bishop pair/);
    expect(s[1]).toMatch(/^a3 first.*covers b4/);
    // Every fact of the best-move step that clears the bar speaks (G4.5: a
    // bar, not one a step), so the refutation follows them.
    expect(s.findIndex((t) => /^Nxb5 .*Qe8/.test(t))).toBeGreaterThan(1);
    expect(korchnoi.facts.filter((f) => f.keptToday).some((f) => /minority attack/.test(f.text))).toBe(true);
    expect(s.some((t) => /minority attack/.test(t))).toBe(false);
  });

  it('the verdict is the standing with its reason, not the best move\'s bare eval (mysterious-gm-moves#2)', () => {
    const b = fx.boards['mysterious-gm-moves#2'];
    const s = said(b.facts, ctxOf(b));
    // Danya: "White is slightly better" — the bishop pair.
    expect(s[0]).toBe("You're slightly better — you have the bishop pair.");
    expect(s).not.toContain('Roughly balanced.');
  });

  it('a verdict is said with its reason or not at all (endgame-attacks-part-2#3)', () => {
    const b = fx.boards['endgame-attacks-part-2#3'];
    expect(said(b.facts, ctxOf(b))).not.toContain('Roughly balanced.');
    // NEGATIVE CONTROL: the same standing with the board's reason is said.
    const reasoned: ReadFact[] = b.facts.map((f) => (f.kind === 'standing-bare' ? { ...f, kind: 'standing', text: 'Roughly balanced — their pawn on b5 is backward.' } : f));
    expect(said(reasoned, ctxOf(b))[0]).toBe('Roughly balanced — their pawn on b5 is backward.');
  });

  it('a habit is never a step: "what is their last move doing?" is not said mid-read (endgame-attacks-part-2#0)', () => {
    const b = fx.boards['endgame-attacks-part-2#0'];
    expect(b.facts.some((f) => f.kind === 'opp-think')).toBe(true);
    expect(said(b.facts, ctxOf(b)).some((t) => /last move doing/.test(t))).toBe(false);
  });

  it('their threat is said, and closes the read named, only when the best move answers it (the-art-of-setting-traps#3)', () => {
    // e4 hits the knight on d5 and the best move, Ne3, moves it: real.
    const b = fx.boards['the-art-of-setting-traps#3'];
    const r = decideRead(b.facts, ctxOf(b));
    expect(r.facts.map((f) => f.text)).toContain('Their pawn attacks your knight on d5.');
    expect(r.habit).toBe("Their threat first, your idea second: right now they're after your knight.");
    // A shot of your own comes first.
    // The best move is quiet: the habit is the quiet threat, chosen for the board's point.
    expect(decideRead(b.facts, ctxOf(b, { studentShot: true })).habit).toBe(READ_HABIT['quiet-shot']);
  });

  it('NEGATIVE CONTROL: a threat the best move ignores is not said (mastering-the-queen-sacrifice#0, Rc8 leaves the bishop)', () => {
    // Danya: the bishop on b2 is NOT really hanging.
    const b = fx.boards['mastering-the-queen-sacrifice#0'];
    const r = decideRead(b.facts, ctxOf(b));
    expect(r.facts.some((f) => f.kind === 'must-defend')).toBe(false);
    expect(r.habit ?? '').not.toMatch(/last move doing|their threat/i);
  });

  it('a fact that only restates the board is never a step\'s say', () => {
    const b = fx.boards['mysterious-gm-moves#2'];
    const first = decideRead(b.facts, ctxOf(b)).facts.find((f) => f.from === 'bestMove');
    expect(first).toBeDefined();
    const marked = b.facts.map((f) => (f === first ? { ...f, restates: true } : f));
    expect(said(marked, ctxOf(b))).not.toContain(first!.text);
  });

  it('the weights are learned per kind and position: plans fall quiet when the game is decided', () => {
    const plan: ReadFact = { from: 'position', kind: 'structure-plan', computer: 'readPosition', text: 'x', squares: [] };
    expect(readWeight(plan, { ...OPEN, bucket: 'decided' })).toBeLessThan(readWeight(plan, OPEN));
  });

  it('a step with nothing to say stays empty; a fact is said once', () => {
    expect(said([{ from: 'position', kind: 'nothing-he-reads', text: 'x', squares: [] }], OPEN)).toEqual([]);
    const f: ReadFact = { from: 'tempting', kind: 'refuted', computer: 'temptingOnBoard', text: 'y', squares: [] };
    expect(said([f, { ...f }], OPEN)).toHaveLength(1);
  });

  it('one idea once: a line whose squares the read has already named is not said again', () => {
    const facts: ReadFact[] = [
      // A plan computer Danya's reads say (`boardStructure`, over the bar);
      // the read's own `readPosition` plans sit under it since the all-video fit.
      { from: 'position', kind: 'structure-plan', computer: 'boardStructure', text: 'Their pawn on d5 is isolated — your rooks on d3 and d1 press it.', squares: ['d3', 'd1', 'd5'] },
      { from: 'position', kind: 'concept', computer: 'conceptForBoard', text: 'Your rooks on d3 and d1 would form a battery on the d-file against d5.', squares: ['d3', 'd1', 'd5'] },
    ];
    expect(said(facts, OPEN)).toEqual([facts[0].text]);
    // NEGATIVE CONTROL: a concept on a square not yet named is said.
    expect(said([facts[0], { ...facts[1], squares: ['g7'] }], OPEN)).toHaveLength(2);
  });

  it('the second front follows the story\'s own target, never another pawn', () => {
    const wing: ReadFact = { from: 'position', kind: 'switch-wing', computer: 'switchWing', text: 'Their pawn on h7 holds. Open a second front: the c5 break.', squares: ['h7', 'c5'] };
    expect(said([wing], OPEN)).toEqual([]);
  });
});

describe('PUZZLE MODE: the answer withheld, the side to move winning', () => {
  const ctxOfPuzzle = (p: Puzzle, withheld: string[] | null): ReadContext => readContextOf({
    fen: p.fen,
    top: { evaluation: p.fen.split(' ')[1] === 'w' ? 400 : -400, mate: null },
    bestUci: null, withheld, studentShot: false, said: null,
  });

  it('a back-rank mate puzzle: the pattern and the attacking habit, never "what are they threatening?" (01qIp)', () => {
    const p = fx.puzzles['01qIp'];
    // Rf1+ from f8: the answer's squares.
    const r = decideRead(p.facts, ctxOfPuzzle(p, ['f8', 'f1']));
    expect(r.facts.map((f) => f.text)).toEqual(['There is a forced mate here: the pattern is Back-Rank mate.']);
    expect(r.habit).toBe(READ_HABIT['forcing-scan']);
    // NEGATIVE CONTROL: the same board not withheld is not a puzzle read.
    expect(decideRead(p.facts, ctxOfPuzzle(p, null)).habit).not.toBe(READ_HABIT['forcing-scan']);
  });

  it('a tactic puzzle: no bare verdict, no plan, nothing on the answer\'s squares (05XlR, Bxd2+)', () => {
    const p = fx.puzzles['05XlR'];
    const s = decideRead(p.facts, ctxOfPuzzle(p, ['h6', 'd2'])).facts;
    expect(s.some((f) => f.kind === 'standing-bare' || f.kind === 'structure-plan')).toBe(false);
    expect(s.some((f) => f.squares.some((q) => q === 'h6' || q === 'd2'))).toBe(false);
    // NEGATIVE CONTROL: read as a live board, the board's one plan speaks;
    // the same plan on the puzzle stays silent. (The fixture's own plan
    // computers sit under the bar since the all-video fit, so the control
    // carries the plan the plan step says first.)
    const plan: ReadFact = { from: 'position', kind: 'structure-plan', computer: 'planOfTheBoard', text: 'The plan: bring the knight on g8 into the game.', squares: ['g8'] };
    expect(decideRead([...p.facts, plan], { ...ctxOfPuzzle(p, null), bucket: 'open' }).facts.some((f) => f.kind === 'structure-plan')).toBe(true);
    expect(decideRead([...p.facts, plan], ctxOfPuzzle(p, ['h6', 'd2'])).facts.some((f) => f.kind === 'structure-plan')).toBe(false);
  });
});

describe("the verdict's reason is said once (beginner chess strategy #6)", () => {
  it('a target line about a pawn the verdict already named is not said again', () => {
    const fen = '8/5ppk/3P3p/8/8/2pK3P/5PP1/8 b - - 0 2';
    const facts: ReadFact[] = [
      { from: 'position', kind: 'standing', text: "You're losing — their passed pawn on d6 is two steps from queening, your isolated pawn on c3 is attacked once and nothing guards it.", squares: ['d6', 'c3'] },
      { from: 'position', kind: 'their-target', text: 'The target is your pawn on c3: it is isolated, so no pawn can ever guard it. Their king on d3 hits it, and nothing guards it.', squares: ['c3', 'd3'] },
    ];
    const ctx = readContextOf({ fen, top: { evaluation: 500, mate: null }, bestUci: 'g7g5', withheld: null, studentShot: false, said: null });
    expect(decideRead(facts, ctx).facts.map((f) => f.kind)).toEqual(['standing']);
  });
});
