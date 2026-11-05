import { NO_STAKES } from './factStakes';
import { describe, it, expect } from 'vitest';
import { composeThought, type ThoughtFact, NOT_LED } from './thoughtComposer';
import { NO_PROOF } from './proof';

const FEN = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 4 4';

function fact(over: Partial<ThoughtFact> & Pick<ThoughtFact, 'text' | 'idea'>): ThoughtFact {
  return {
    id: `t:${over.text}`, namesStudentMove: false,
    kind: 'move-job', group: 'move', computer: 'moveJob', step: 'yours', source: 'moveJob', squares: [], weight: 60, stakes: NO_STAKES.unmeasured, proof: NO_PROOF.stated, thread: { none: 'local' },
    seat: 'student', fen: FEN, claims: [`t:${over.text}`], ...over,
  };
}

describe('the one composer (WO-ONE-COACH-01)', () => {
  it('says the steps in his order, whatever order the facts arrive in', () => {
    const out = composeThought([
      fact({ step: 'choices', idea: 'choice', text: 'Most people play Bc4 here, and it walks into a fork.' }),
      fact({ step: 'yours', idea: 'develop', text: 'You play Bb5 — it develops the bishop.' }),
    ], 'lesson', null, NOT_LED);
    expect(out.spoken.indexOf('Bb5')).toBeLessThan(out.spoken.indexOf('Bc4'));
  });

  it('one idea on one square is said once, by the fact worth more', () => {
    const out = composeThought([
      fact({ idea: 'prevent', text: 'You play h3 — it takes the g4 square away from their bishop.', squares: ['g4'], weight: 60, source: 'boardTeacher' }),
      fact({ idea: 'prevent', text: 'You play h3 — it keeps their bishop off g4, where it would pin your knight on f3.', squares: ['g4', 'f3'], weight: 70 }),
    ], 'lesson', null, NOT_LED);
    expect(out.spoken).toBe('You play h3 — it keeps their bishop off g4, where it would pin your knight on f3.');
    expect(out.held.map((h) => h.why)).toContain('same-idea');
  });

  it('a second job of a kind speaks behind the lead; an afterthought does not', () => {
    const lead = fact({ idea: 'prevent', text: 'You play h3 — it keeps their bishop off g4.', squares: ['g4'], weight: 70 });
    const close = fact({ idea: 'king-safety', text: 'You play h3 — it makes luft.', alsoText: 'It also makes luft.', weight: 60 });
    expect(composeThought([lead, close], 'lesson', null, NOT_LED).spoken).toBe('You play h3 — it keeps their bishop off g4. It also makes luft.');
    // Under the fitted floor (40, `thought-policy.json`) it is an afterthought.
    const far = { ...close, weight: 30 };
    expect(composeThought([lead, far], 'lesson', null, NOT_LED).spoken).toBe('You play h3 — it keeps their bishop off g4.');
  });

  // HOW OFTEN EACH COMPUTER IS CHOSEN IS FITTED (Build 5): the fundamentals
  // lead a board teacher's reading of equal or higher raw weight, because on
  // half of Danya's videos that order said more of what he says, and a larger
  // share of it was his.
  it("the fitted offsets decide which computer's fact leads", () => {
    const teacher = fact({ source: 'boardTeacher', idea: 'center', text: 'You play Nc3 — the knight bears down on d5.', alsoText: 'The knight bears down on d5.', squares: ['d5'], weight: 60 });
    const fundamental = fact({ source: 'fundamental', idea: 'develop', text: 'You play Nc3 — it develops into the game.', alsoText: 'It also develops into the game.', squares: ['e4'], weight: 50 });
    expect(composeThought([teacher, fundamental], 'lesson', null, NOT_LED).spoken).toBe('You play Nc3 — it develops into the game. The knight bears down on d5.');
  });
  it('every fitted offset names a computer the composer knows', async () => {
    const policy = (await import('../data/thought-policy.json')).default as { offsets: Record<string, number> };
    const { SOURCE_RANK } = await import('./thoughtComposer');
    for (const k of Object.keys(policy.offsets)) expect(Object.keys(SOURCE_RANK)).toContain(k);
  });

  it('a line that only restates the move never leads a step another fact explains', () => {
    const out = composeThought([
      fact({ idea: 'develop', text: 'You play Nbd2 — it brings your knight out.', weight: 80, restates: true }),
      fact({ idea: 'route', source: 'pieceRoute', text: 'You play Nbd2, sending the knight on to e3, by way of f1.', squares: ['f1', 'e3'], weight: 52 }),
    ], 'lesson', null, NOT_LED);
    expect(out.spoken).toBe('You play Nbd2, sending the knight on to e3, by way of f1.');
  });

  it('the same squares in other words are one claim ("guards e5" / "supports the center, guarding e5")', () => {
    const out = composeThought([
      fact({ idea: 'guard', text: 'You play d6 — it adds a guard to your pawn on e5.', squares: ['e5'], weight: 64 }),
      fact({ idea: 'center', text: 'You play d6 — it supports the center, guarding e5.', alsoText: 'It also supports the center, guarding e5.', squares: ['e5'], weight: 60, source: 'fundamental' }),
    ], 'lesson', null, NOT_LED);
    expect(out.spoken.match(/e5/g)?.length).toBe(1);
  });

  it('a move whose facts only restate the board says nothing (the quiet-move rule)', () => {
    const out = composeThought([fact({ idea: 'recapture', text: 'You play Nxe3 — it takes back the bishop.', restates: true })], 'lesson', null, NOT_LED);
    expect(out.spoken).toBe('');
  });

  // ONE MOVE, TWO JOBS (M-TWO-JOBS, round 3).
  it('a move says at most two jobs: the third is held, never stacked', () => {
    const lead = fact({ idea: 'outpost', text: 'You play Bf6 — it lands on the f6 outpost.', squares: ['f6'], weight: 80 });
    const mate = fact({ idea: 'threat', text: 'You play Bf6 — it threatens Qg7#.', alsoText: 'It also threatens Qg7#.', squares: ['g7'], weight: 75 });
    const rook = fact({ idea: 'pressure', text: 'You play Bf6 — it attacks their rook on c3.', alsoText: 'It also attacks their rook on c3.', squares: ['c3'], weight: 70 });
    const out = composeThought([lead, mate, rook], 'lesson', null, NOT_LED);
    expect(out.spoken).toBe('You play Bf6 — it lands on the f6 outpost. It also threatens Qg7#.');
    expect(out.held.find((h) => h.fact.id === rook.id)?.why).toBe('third-job');
  });

  it('the second job is said as its own kind, in its step, for either seat', () => {
    const lead = fact({ idea: 'prevent', text: 'You play h3 — it keeps their bishop off g4.', squares: ['g4'], weight: 70 });
    const close = fact({ idea: 'king-safety', text: 'You play h3 — it makes luft.', alsoText: 'It also makes luft.', weight: 60 });
    const mine = composeThought([lead, close], 'lesson', null, NOT_LED).kept;
    expect(mine.map((f) => [f.kind, f.step])).toEqual([['move-job', 'yours'], ['two-jobs', 'yours']]);
    const theirs = composeThought([lead, close].map((f) => ({ ...f, seat: 'opponent' as const, step: 'theirs' as const })), 'lesson', null, NOT_LED).kept;
    expect(theirs.map((f) => [f.kind, f.step])).toEqual([['move-job', 'theirs'], ['two-jobs', 'theirs']]);
  });

  it('behind a material win, where the piece now stands is a by-product, never the second job', () => {
    const wins = fact({ idea: 'win-material', text: 'You play Qxa1+ — it wins a rook.', squares: ['a1'], weight: 95 });
    const centre = fact({ idea: 'center', text: 'You play Qxa1+ — it takes aim at the center.', alsoText: 'It also takes aim at the center.', squares: ['d4'], weight: 86 });
    const out = composeThought([wins, centre], 'lesson', null, NOT_LED);
    expect(out.spoken).toBe('You play Qxa1+ — it wins a rook.');
    expect(out.held.map((h) => h.why)).toContain('by-product');
    // A concrete second job behind it still speaks: "takes a pawn and attacks a rook".
    const rook = fact({ idea: 'threat', text: 'You play Nxe5 — it attacks their rook on h8.', alsoText: 'It also attacks their rook on h8.', squares: ['h8'], weight: 75 });
    const pawn = { ...wins, id: 't:pawn', claims: ['t:pawn'], text: 'You play Nxe5 — it wins a pawn.', squares: ['e5'] };
    const both = composeThought([pawn, rook], 'lesson', null, NOT_LED);
    expect(both.held).toEqual([]);
    expect(both.kept.map((f) => f.kind)).toEqual(['move-job', 'two-jobs']);
  });

  it('what the move gave up is said behind it, but is not one of its jobs', () => {
    const space = fact({ idea: 'space', text: 'You play g5 — it grabs space on the kingside.', squares: ['g5'], weight: 80 });
    const kick = fact({ idea: 'tempo', text: 'You play g5 — it kicks their knight off f4.', alsoText: 'It also kicks their knight off f4.', squares: ['f4'], weight: 75 });
    const cover = fact({ kind: 'aspect-own-king-cover', idea: 'king-safety', text: "You play g5 — it loosens your own king's cover, and a pawn never moves back.", alsoText: "It also loosens your own king's cover, and a pawn never moves back.", weight: 70 });
    const out = composeThought([space, kick, cover], 'lesson', null, NOT_LED);
    expect(out.kept.map((f) => f.kind)).toEqual(['move-job', 'two-jobs', 'aspect-own-king-cover']);
    expect(out.spoken).toBe("You play g5 — it grabs space on the kingside. It also kicks their knight off f4. It also loosens your own king's cover, and a pawn never moves back.");
  });

  it('behind another line on the move, the composer says one job — the second — and nothing follows', () => {
    const job = fact({ idea: 'prepare', text: 'You play Nbd2 — it prepares e4.', squares: ['e4'], weight: 60 });
    const next = fact({ idea: 'guard', text: 'You play Nbd2 — it guards c4.', alsoText: 'It also guards c4.', squares: ['c4'], weight: 55 });
    const out = composeThought([job, next], 'review', null, new Set(['yours']));
    expect(out.spoken).toBe('You play Nbd2 — it prepares e4.');
    expect(out.kept.map((f) => f.kind)).toEqual(['two-jobs']);
    expect(out.held.find((h) => h.fact.id === next.id)?.why).toBe('third-job');
  });

  it('a lesson says an idea once across its moves', () => {
    const memory = { keys: new Set<string>() };
    const f = fact({ idea: 'center', text: 'You play d4 — it stakes a claim in the center.', claims: ['idea:center:d4'] });
    expect(composeThought([f], 'lesson', memory, NOT_LED).spoken).not.toBe('');
    expect(composeThought([{ ...f, text: 'You play d4 — it stakes a claim in the center, again.' }], 'lesson', memory, NOT_LED).spoken).toBe('');
  });
});
