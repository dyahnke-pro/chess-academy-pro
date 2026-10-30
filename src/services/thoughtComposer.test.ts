import { describe, it, expect } from 'vitest';
import { composeThought, type ThoughtFact } from './thoughtComposer';
import { NO_PROOF } from './proof';

const FEN = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 4 4';

function fact(over: Partial<ThoughtFact> & Pick<ThoughtFact, 'text' | 'idea'>): ThoughtFact {
  return {
    step: 'yours', source: 'moveJob', squares: [], weight: 60, stakes: null, proof: NO_PROOF.stated,
    seat: 'student', fen: FEN, claims: [`t:${over.text}`], ...over,
  };
}

describe('the one composer (WO-ONE-COACH-01)', () => {
  it('says the steps in his order, whatever order the facts arrive in', () => {
    const out = composeThought([
      fact({ step: 'choices', idea: 'choice', text: 'Most people play Bc4 here, and it walks into a fork.' }),
      fact({ step: 'yours', idea: 'develop', text: 'You play Bb5 — it develops the bishop.' }),
    ], 'lesson', null);
    expect(out.spoken.indexOf('Bb5')).toBeLessThan(out.spoken.indexOf('Bc4'));
  });

  it('one idea on one square is said once, by the fact worth more', () => {
    const out = composeThought([
      fact({ idea: 'prevent', text: 'You play h3 — it takes the g4 square away from their bishop.', squares: ['g4'], weight: 60, source: 'boardTeacher' }),
      fact({ idea: 'prevent', text: 'You play h3 — it keeps their bishop off g4, where it would pin your knight on f3.', squares: ['g4', 'f3'], weight: 70 }),
    ], 'lesson', null);
    expect(out.spoken).toBe('You play h3 — it keeps their bishop off g4, where it would pin your knight on f3.');
    expect(out.held.map((h) => h.why)).toContain('same-idea');
  });

  it('a second job of a kind speaks behind the lead; an afterthought does not', () => {
    const lead = fact({ idea: 'prevent', text: 'You play h3 — it keeps their bishop off g4.', squares: ['g4'], weight: 70 });
    const close = fact({ idea: 'king-safety', text: 'You play h3 — it makes luft.', alsoText: 'It also makes luft.', weight: 60 });
    expect(composeThought([lead, close], 'lesson', null).spoken).toBe('You play h3 — it keeps their bishop off g4. It also makes luft.');
    const far = { ...close, weight: 40 };
    expect(composeThought([lead, far], 'lesson', null).spoken).toBe('You play h3 — it keeps their bishop off g4.');
  });

  it('a line that only restates the move never leads a step another fact explains', () => {
    const out = composeThought([
      fact({ idea: 'develop', text: 'You play Nbd2 — it brings your knight out.', weight: 80, restates: true }),
      fact({ idea: 'route', source: 'pieceRoute', text: 'You play Nbd2, sending the knight on to e3, by way of f1.', squares: ['f1', 'e3'], weight: 52 }),
    ], 'lesson', null);
    expect(out.spoken).toBe('You play Nbd2, sending the knight on to e3, by way of f1.');
  });

  it('the same squares in other words are one claim ("guards e5" / "supports the center, guarding e5")', () => {
    const out = composeThought([
      fact({ idea: 'guard', text: 'You play d6 — it adds a guard to your pawn on e5.', squares: ['e5'], weight: 64 }),
      fact({ idea: 'center', text: 'You play d6 — it supports the center, guarding e5.', alsoText: 'It also supports the center, guarding e5.', squares: ['e5'], weight: 60, source: 'fundamental' }),
    ], 'lesson', null);
    expect(out.spoken.match(/e5/g)?.length).toBe(1);
  });

  it('a move whose facts only restate the board says nothing (the quiet-move rule)', () => {
    const out = composeThought([fact({ idea: 'recapture', text: 'You play Nxe3 — it takes back the bishop.', restates: true })], 'lesson', null);
    expect(out.spoken).toBe('');
  });

  it('a lesson says an idea once across its moves', () => {
    const memory = { keys: new Set<string>() };
    const f = fact({ idea: 'center', text: 'You play d4 — it stakes a claim in the center.', claims: ['idea:center:d4'] });
    expect(composeThought([f], 'lesson', memory).spoken).not.toBe('');
    expect(composeThought([{ ...f, text: 'You play d4 — it stakes a claim in the center, again.' }], 'lesson', memory).spoken).toBe('');
  });
});
