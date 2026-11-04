// The bracket (WO-STORY-MATRIX-01 Phase 2): regions crown champions, the top
// score leads, and each further seat goes to a champion linked to what was
// said — no link, no seat.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { runMatrix, linkStrength, GROUP_REGION, type MatrixSettings } from './storyMatrix';
import { NO_PROOF, type Proof } from './proof';
import { LOCAL_THREAD, type FactGroup } from './coachFact';
import type { ThoughtFact } from './thoughtComposer';

const S: MatrixSettings = { perRegion: 1, tie: 0, minLink: 1, squareLink: 0, threadBonus: 0, engineProof: 0.95, noProof: 0.9 };
const SANS = ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'h4', 'h6', 'g4', 'Bd7', 'c4', 'dxc4', 'Bxc4', 'e6', 'Nc3', 'c5', 'd5', 'exd5', 'Qxd5', 'Qe7', 'Qxb7', 'Bc6', 'Qc8+', 'Qd8'];
const FEN = (() => { const c = new Chess(); for (const s of SANS) c.move(s); return c.fen(); })();
const line = (sans: string[]): Proof => ({ kind: 'line', exact: true, short: '', full: '', line: { fen: FEN, sans } } as Proof);

function fact(id: string, group: FactGroup, step: ThoughtFact['step'], weight: number, squares: string[], extra: Partial<ThoughtFact> = {}): ThoughtFact {
  return {
    id, text: id, group, step, kind: 'line', computer: 'buildDeliberation', source: 'bestLine', idea: 'tactic', weight, squares,
    seat: 'student', fen: FEN, stakes: { none: 'unmeasured' }, proof: NO_PROOF.description, thread: LOCAL_THREAD,
    namesStudentMove: false, claims: [id], ...extra,
  } as unknown as ThoughtFact;
}
const run = (fs: ThoughtFact[], s: MatrixSettings = S) => runMatrix(fs, s, (f) => f.weight, () => false);

describe('the bracket', () => {
  it('every group sits in one region', () => {
    expect(Object.keys(GROUP_REGION).length).toBe(14);
  });
  it('the top score leads; a region sends one champion', () => {
    const a = fact('move-a', 'move', 'yours', 60, ['e4']);
    const b = fact('move-b', 'move', 'yours', 40, ['d4']);
    const r = run([b, a]);
    expect(r.lead?.id).toBe('move-a');
    expect(r.held.find((h) => h.fact.id === 'move-b')?.why).toBe('region');
  });
  it('a champion linked cause → effect is seated; an unlinked one waits', () => {
    const lead = fact('deflection', 'line', 'line', 80, ['f7'], { proof: line(['Bxf7+', 'Kxf7']) });
    const queen = fact('queen', 'danger', 'danger', 50, ['d8']);
    const aside = fact('aside', 'structure', 'board', 50, ['a3']);
    const r = run([lead, queen, aside]);
    expect(linkStrength(queen, lead, S)).toBe(3);
    expect(r.seated.map((f) => f.id)).toEqual(['queen', 'deflection']);
    expect(r.held.find((h) => h.fact.id === 'aside')?.why).toBe('unlinked');
  });
  it('two facts on one decision are linked; a square alone is not, unless the setting says so', () => {
    const d = { points: 0.1, plies: 0, wc: 0.1, decision: 'x|student' };
    const a = fact('a', 'move', 'yours', 60, ['e4'], { stakes: d });
    const b = fact('b', 'choices', 'choices', 50, ['e4'], { stakes: d });
    const c = fact('c', 'structure', 'board', 50, ['e4']);
    expect(linkStrength(a, b, S)).toBe(2);
    expect(linkStrength(a, c, S)).toBe(0);
    expect(linkStrength(a, c, { ...S, squareLink: 1 })).toBe(1);
  });
  it('a fact the story already heard is out', () => {
    const a = fact('a', 'move', 'yours', 60, ['e4']);
    expect(runMatrix([a], S, (f) => f.weight, () => true).seated).toEqual([]);
  });
});
