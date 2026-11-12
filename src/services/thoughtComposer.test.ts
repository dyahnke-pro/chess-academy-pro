import { readFileSync } from 'node:fs';
import { NO_STAKES } from './factStakes';
import { describe, it, expect } from 'vitest';
import { composeThought, type ThoughtFact, type ThoughtRecord, NOT_LED, SOURCE_DEPTH, IDEA_DEPTH, factDepth } from './thoughtComposer';
import { IDEA_FAMILY } from './ideaKind';
import { NO_PROOF } from './proof';
import policy from '../data/thought-policy.json';

const FEN = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 4 4';

function fact(over: Partial<ThoughtFact> & Pick<ThoughtFact, 'text' | 'idea'>): ThoughtFact {
  return {
    id: `t:${over.text}`, namesStudentMove: false,
    kind: 'move-job', group: 'move', computer: 'moveJob', step: 'yours', source: 'moveJob', squares: [], weight: 60, stakes: NO_STAKES.unmeasured, proof: NO_PROOF.stated, thread: { none: 'local' },
    seat: 'student', fen: FEN, claims: [`t:${over.text}`], ...over,
  };
}
const said = (facts: ThoughtFact[], record: ThoughtRecord | null = null): string => composeThought(facts, 'lesson', null, NOT_LED, record).spoken;

describe('the one composer (WO-ONE-COACH-01)', () => {
  it('says the steps in his order, whatever order the facts arrive in', () => {
    const out = said([
      fact({ step: 'choices', idea: 'choice', text: 'Most people play Bc4 here, and it walks into a fork.' }),
      fact({ step: 'yours', idea: 'develop', text: 'You play Bb5 — it develops the bishop.' }),
    ]);
    expect(out.indexOf('Bb5')).toBeLessThan(out.indexOf('Bc4'));
  });

  it('one idea on one square is said once, by the fact worth more', () => {
    const out = composeThought([
      fact({ idea: 'prevent', text: 'You play h3 — it takes the g4 square away from their bishop.', squares: ['g4'], weight: 60, source: 'boardTeacher' }),
      fact({ idea: 'prevent', text: 'You play h3 — it keeps their bishop off g4, where it would pin your knight on f3.', squares: ['g4', 'f3'], weight: 70 }),
    ], 'lesson', null, NOT_LED, null);
    expect(out.spoken).toBe('You play h3 — it keeps their bishop off g4, where it would pin your knight on f3.');
    expect(out.held.map((h) => h.why)).toContain('same-idea');
  });

  // EVERY VERIFIED FIND IS SAID (David 2026-11-12): no floor, no gap, no news
  // margin, no count of jobs.
  it('a further job speaks behind the lead whatever its weight', () => {
    const lead = fact({ idea: 'prevent', text: 'You play h3 — it keeps their bishop off g4.', squares: ['g4'], weight: 70 });
    const faint = fact({ idea: 'king-safety', text: 'You play h3 — it makes luft.', alsoText: 'It also makes luft.', weight: 1 });
    expect(said([lead, faint])).toBe('You play h3 — it keeps their bishop off g4. It also makes luft.');
  });
  it('a move says every job it has', () => {
    const lead = fact({ idea: 'outpost', text: 'You play Bf6 — it lands on the f6 outpost.', squares: ['f6'], weight: 80 });
    const mate = fact({ idea: 'threat', text: 'You play Bf6 — it threatens Qg7#.', alsoText: 'It also threatens Qg7#.', squares: ['g7'], weight: 75 });
    const rook = fact({ idea: 'diagonal', text: 'You play Bf6 — it opens the long diagonal.', alsoText: 'It also opens the long diagonal.', squares: ['a1'], weight: 70 });
    const out = composeThought([lead, mate, rook], 'lesson', null, NOT_LED, null);
    expect(out.held).toEqual([]);
    expect(out.kept.map((f) => f.kind)).toEqual(['move-job', 'two-jobs', 'two-jobs']);
  });

  // HOW DEEP A FACT SITS (David 2026-11-12: "The obvious facts I want at the
  // bottom of the list" / "second and third order consequences weighted heavily").
  it('an obvious fact comes after one that says why, whatever their raw weights', () => {
    const obvious = fact({ source: 'fundamental', idea: 'develop', text: 'You play Nc3 — it develops into the game.', alsoText: 'It also develops into the game.', squares: [], weight: 95 });
    const why = fact({ source: 'moveJob', idea: 'guard', text: 'You play Nc3 — it guards your pawn on e4.', alsoText: 'It also guards your pawn on e4.', squares: ['e4'], weight: 40 });
    expect(said([obvious, why])).toBe('You play Nc3 — it guards your pawn on e4. It also develops into the game.');
  });
  it('a hidden consequence on the same squares is never folded into the plainer fact', () => {
    const guard = fact({ idea: 'guard', text: 'You play d6 — it adds a guard to your pawn on e5.', squares: ['e5'], weight: 64 });
    const deep = fact({ source: 'deepFact', idea: 'set-up', text: 'You play d6 — then Nxe5 drops a piece.', alsoText: 'Then Nxe5 drops a piece.', squares: ['e5'], weight: 50 });
    const out = composeThought([guard, deep], 'lesson', null, NOT_LED, null);
    expect(out.kept.map((f) => f.id).sort()).toEqual([guard.id, deep.id].sort());
  });
  it('an obvious idea that names what it acts on says why', () => {
    const named = fact({ source: 'fundamental', idea: 'develop', text: 'You play Nf3 — it develops into the game, attacking the pawn on e5.', squares: ['e5'], weight: 60 });
    const bare = fact({ source: 'fundamental', idea: 'develop', text: 'You play Nf3 — it develops.', squares: [], weight: 60 });
    expect(factDepth(named)).toBe('why');
    expect(factDepth(bare)).toBe('obvious');
  });
  it('a square merely taken from a piece is the move\'s face; a stopped pin is a consequence', () => {
    // The fundamentals' reading is "why"; a stop of a pin, kick or fork is hidden.
    const taken = fact({ source: 'fundamental', idea: 'prevent', text: 'You play e6 — it takes d5 from their bishop.', squares: ['d5'] });
    const stop = fact({ source: 'prophylaxis', idea: 'prevent', text: 'You play h3 — it takes away g4: Bg4 would pin your knight on f3.', squares: ['g4', 'f3'] });
    const out = composeThought([taken, stop], 'lesson', null, NOT_LED, null);
    expect(out.kept.map((f) => f.id).sort()).toEqual([taken.id, stop.id].sort());
  });

  it('a line that only restates the move never leads a step another fact explains', () => {
    const out = said([
      fact({ idea: 'develop', text: 'You play Nbd2 — it brings your knight out.', weight: 80, restates: true }),
      fact({ idea: 'route', source: 'pieceRoute', text: 'You play Nbd2, sending the knight on to e3, by way of f1.', squares: ['f1', 'e3'], weight: 52 }),
    ]);
    expect(out.startsWith('You play Nbd2, sending the knight on to e3')).toBe(true);
  });

  it('one claim on the same squares is said in the words that say more (a kick over a bare attack)', () => {
    const attack = fact({ idea: 'threat', text: 'They play a6 — it attacks your bishop on b5.', squares: ['b5'], weight: 70 });
    const kick = fact({ idea: 'tempo', source: 'fundamental', text: 'They play a6 — it kicks your bishop off b5, gaining time.', squares: ['b5'], weight: 40 });
    expect(said([attack, kick])).toBe('They play a6 — it kicks your bishop off b5, gaining time.');
  });
  it('the same squares in other words are one claim ("guards e5" / "supports the center, guarding e5")', () => {
    const out = said([
      fact({ idea: 'guard', text: 'You play d6 — it adds a guard to your pawn on e5.', squares: ['e5'], weight: 64 }),
      fact({ idea: 'center', text: 'You play d6 — it supports the center, guarding e5.', alsoText: 'It also supports the center, guarding e5.', squares: ['e5'], weight: 60, source: 'fundamental' }),
    ]);
    expect(out.match(/e5/g)?.length).toBe(1);
  });

  it('a move whose facts only restate the board says nothing (the quiet-move rule)', () => {
    expect(said([fact({ idea: 'recapture', text: 'You play Nxe3 — it takes back the bishop.', restates: true })])).toBe('');
  });

  it('the second job is said as its own kind, in its step, for either seat', () => {
    const lead = fact({ idea: 'prevent', text: 'You play h3 — it keeps their bishop off g4.', squares: ['g4'], weight: 70 });
    const close = fact({ idea: 'king-safety', text: 'You play h3 — it makes luft.', alsoText: 'It also makes luft.', weight: 60 });
    const mine = composeThought([lead, close], 'lesson', null, NOT_LED, null).kept;
    expect(mine.map((f) => [f.kind, f.step])).toEqual([['move-job', 'yours'], ['two-jobs', 'yours']]);
    const theirs = composeThought([lead, close].map((f) => ({ ...f, seat: 'opponent' as const, step: 'theirs' as const })), 'lesson', null, NOT_LED, null).kept;
    expect(theirs.map((f) => [f.kind, f.step])).toEqual([['move-job', 'theirs'], ['two-jobs', 'theirs']]);
  });

  it('behind a material win, where the piece now stands is a by-product, never the second job', () => {
    const wins = fact({ idea: 'win-material', text: 'You play Qxa1+ — it wins a rook.', squares: ['a1'], weight: 95 });
    const centre = fact({ idea: 'center', text: 'You play Qxa1+ — it takes aim at the center.', alsoText: 'It also takes aim at the center.', squares: ['d4'], weight: 86 });
    const out = composeThought([wins, centre], 'lesson', null, NOT_LED, null);
    expect(out.spoken).toBe('You play Qxa1+ — it wins a rook.');
    expect(out.held.map((h) => h.why)).toContain('by-product');
  });

  it('what the move gave up is said behind it, but is not one of its jobs', () => {
    const space = fact({ idea: 'outpost', text: 'You play g5 — it takes the g5 outpost.', squares: ['g5'], weight: 80 });
    const kick = fact({ idea: 'tempo', text: 'You play g5 — it kicks their knight off f4.', alsoText: 'It also kicks their knight off f4.', squares: ['f4'], weight: 75 });
    const cover = fact({ kind: 'aspect-own-king-cover', idea: 'king-safety', text: "You play g5 — it loosens your own king's cover, and a pawn never moves back.", alsoText: "It also loosens your own king's cover, and a pawn never moves back.", weight: 70 });
    const out = composeThought([space, kick, cover], 'lesson', null, NOT_LED, null);
    expect(out.kept.map((f) => f.kind)).toEqual(['move-job', 'two-jobs', 'aspect-own-king-cover']);
    expect(out.kept.filter((f) => f.kind === 'two-jobs')).toHaveLength(1);
  });

  it('behind another line on the move, every job of its own speaks as one more job', () => {
    const job = fact({ idea: 'prepare', text: 'You play Nbd2 — it prepares e4.', squares: ['e4'], weight: 60 });
    const next = fact({ idea: 'guard', text: 'You play Nbd2 — it guards c4.', alsoText: 'It also guards c4.', squares: ['c4'], weight: 55 });
    const out = composeThought([job, next], 'review', null, new Set(['yours']), null);
    expect(out.kept.map((f) => f.kind)).toEqual(['two-jobs', 'two-jobs']);
  });

  it('a lesson says an idea once across its moves', () => {
    const memory = { keys: new Set<string>() };
    const f = fact({ idea: 'center', text: 'You play d4 — it stakes a claim in the center.', claims: ['idea:center:d4'] });
    expect(composeThought([f], 'lesson', memory, NOT_LED, null).spoken).not.toBe('');
    expect(composeThought([{ ...f, text: 'You play d4 — it stakes a claim in the center, again.' }], 'lesson', memory, NOT_LED, null).spoken).toBe('');
  });
});

// THE STUDENT'S RECORD (David 2026-11-12: "Unless the student record shows it
// doesn't need to be said").
describe('the record decides what is held and what rises', () => {
  const rec = (states: Record<string, 'red' | 'green' | 'short'>): ThoughtRecord => ({ stateOf: (t) => states[t] ?? 'grey' });
  const develop = fact({ idea: 'develop', text: 'You play Nf3 — it develops your knight.', squares: ['f3'] });
  it('a skill the record proves (green) is held', () => {
    const out = composeThought([develop], 'review', null, NOT_LED, rec({ 'neglected-development': 'green' }));
    expect(out.spoken).toBe('');
    expect(out.held[0]?.why).toBe('record-green');
  });
  it('grey (never asked) teaches in full', () => {
    expect(said([develop], rec({}))).not.toBe('');
  });
  it('a hidden consequence still speaks on a green skill, and so does a danger', () => {
    const setUp = fact({ source: 'deepFact', idea: 'set-up', text: 'You play Nf3 — then Ng5 hits f7 twice.', squares: ['f7'] });
    expect(said([setUp], rec({ 'missed-set-up': 'green' }))).not.toBe('');
    const danger = fact({ step: 'danger', idea: 'win-material', text: 'Your knight on c3 is hanging.', squares: ['c3'] });
    expect(said([danger], rec({ 'missed-your-free-piece': 'green' }))).not.toBe('');
  });
  it('a red skill rises within its band', () => {
    const a = fact({ idea: 'guard', text: 'You play Re1 — it guards e4.', alsoText: 'It also guards e4.', squares: ['e4'], weight: 90 });
    const b = fact({ idea: 'file', text: 'You play Re1 — it takes the open e-file.', alsoText: 'It also takes the open e-file.', squares: ['e1'], weight: 10 });
    expect(said([a, b], rec({})).startsWith('You play Re1 — it guards e4')).toBe(true);
    expect(said([a, b], rec({ 'passive-rook': 'red' })).startsWith('You play Re1 — it takes the open e-file')).toBe(true);
  });
});

describe('the fitted order', () => {
  it('every prior names an idea or a computer the composer knows', () => {
    for (const k of Object.keys(policy.ideaPrior)) expect(Object.keys(IDEA_FAMILY)).toContain(k);
    for (const k of Object.keys(policy.sourcePrior)) expect(Object.keys(SOURCE_DEPTH)).toContain(k);
  });
  it('no hidden idea or computer is fitted below zero (David: weighted heavily)', () => {
    for (const [k, v] of Object.entries(policy.ideaPrior)) if (IDEA_DEPTH[k as keyof typeof IDEA_DEPTH] === 'hidden') expect(v).toBeGreaterThanOrEqual(0);
    for (const [k, v] of Object.entries(policy.sourcePrior)) if (SOURCE_DEPTH[k as keyof typeof SOURCE_DEPTH] === 'hidden') expect(v).toBeGreaterThanOrEqual(0);
  });
  it('the offline replay holds the same depth tables as the code', () => {
    const py = readFileSync('scripts/bench/thought_replay.py', 'utf8');
    const set = (name: string): string[] => (py.match(new RegExp(`^${name} = \\{([^}]*)\\}`, 'm'))?.[1] ?? '').split(',').map((x) => x.trim().replace(/'/g, '')).filter(Boolean).sort();
    expect(set('HIDDEN_SOURCES')).toEqual(Object.entries(SOURCE_DEPTH).filter(([, d]) => d === 'hidden').map(([k]) => k).sort());
    expect(set('HIDDEN_IDEAS')).toEqual(Object.entries(IDEA_DEPTH).filter(([, d]) => d === 'hidden').map(([k]) => k).sort());
    expect(set('OBVIOUS_IDEAS')).toEqual(Object.entries(IDEA_DEPTH).filter(([, d]) => d === 'obvious').map(([k]) => k).sort());
  });
});
