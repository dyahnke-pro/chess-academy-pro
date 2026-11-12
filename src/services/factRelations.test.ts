// Needs and causes on every fact (WO-STORY-MATRIX-01 P1-11). Read off the
// board, never the words. Gotham–Jelena, 13.Bxf7+: the queen on d8 has one
// guard, the king; the line that drags the king to f7 CAUSES the loss of that
// guard, and the claim that the queen falls NEEDS it.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { factRelations, causeEffect } from './factRelations';
import { lineDiff } from './relations';
import { NO_PROOF, type Proof } from './proof';
import { composeThought, type ThoughtFact, NOT_LED } from './thoughtComposer';
import { LOCAL_THREAD } from './coachFact';

const SANS = ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'h4', 'h6', 'g4', 'Bd7', 'c4', 'dxc4', 'Bxc4', 'e6', 'Nc3', 'c5', 'd5', 'exd5', 'Qxd5', 'Qe7', 'Qxb7', 'Bc6', 'Qc8+', 'Qd8'];
const FEN = (() => { const c = new Chess(); for (const s of SANS) c.move(s); return c.fen(); })();
const proofOf = (sans: string[]): Proof => ({ kind: 'line', exact: true, short: sans.join(' '), full: sans.join(' '), line: { fen: FEN, sans } } as Proof);

describe('factRelations — needs and causes from the board', () => {
  it('the line Bxf7+ Kxf7 causes the loss of the queen\'s only guard', () => {
    const r = factRelations({ fen: FEN, proof: proofOf(['Bxf7+', 'Kxf7', 'Qxd8']), squares: [] });
    expect([...r.causes]).toContain('guard:d8(bq)<e8(bk)');
  });
  it('"their queen on d8 falls" needs that guard — the two facts are linked cause → effect', () => {
    const deflection = { fen: FEN, proof: proofOf(['Bxf7+', 'Kxf7']), squares: ['f7', 'e8'] };
    const queen = { fen: FEN, proof: NO_PROOF.description, squares: ['d8'] };
    expect([...factRelations(queen).needs]).toContain('guard:d8(bq)<e8(bk)');
    expect(causeEffect(deflection, queen)).toBe(true);
  });
  it('a fact with no line and no squares needs and causes nothing', () => {
    const r = factRelations({ fen: FEN, proof: NO_PROOF.name, squares: [] });
    expect(r.needs.size + r.causes.size).toBe(0);
  });
  it('lineDiff is null on an illegal line', () => {
    expect(lineDiff(FEN, ['Bxf7+', 'Qxd8'])).toBeNull();
  });
});

describe('the composer reads the link as support', () => {
  const fact = (id: string, step: ThoughtFact['step'], squares: string[], proof: ThoughtFact['proof']): ThoughtFact => ({
    id, text: id === 'lead' ? 'Bxf7+ drags their king off e8.' : 'Their queen on d8 has no other guard.', squares, step, proof,
    group: 'line', kind: 'line', computer: 'buildDeliberation', source: 'bestLine', idea: id === 'lead' ? 'tactic' : 'guard',
    weight: 50, seat: 'student', fen: FEN, stakes: { none: 'unmeasured' }, thread: LOCAL_THREAD, namesStudentMove: false, claims: [id],
  } as unknown as ThoughtFact);
  it('a fact on another square follows its cause', () => {
    const lead = fact('lead', 'line', ['f7'], proofOf(['Bxf7+', 'Kxf7']));
    const queen = fact('queen', 'line', ['d8'], NO_PROOF.description);
    expect(composeThought([lead, queen], 'lesson', null, NOT_LED, null).kept.map((f) => f.id)).toEqual(['lead', 'queen']);
  });
});
