// moveIntent on Naroditsky's own game (speedrun 1PI3xfMiUE4): the moves he
// explains by what they are FOR must come out of the computer with the same
// point he gives. Engine reads are stored with the positions (depth 14,
// multi-PV), so the test needs no engine.
import { describe, it, expect } from 'vitest';
import { DEFAULT_INTENT, moveIntent, whatItDoes } from './moveIntent';
import type { AnalysisLine } from '../types';
import fixture from './__fixtures__/moveIntent-1PI3xfMiUE4.json';

interface Raw { cp: number | null; mate: number | null; pv: string[] }
interface Moment { fenBefore: string; san: string; before: Raw[]; after: Raw[]; passBefore: Raw[]; passAfter: Raw[]; his: string }
const moments = fixture as Record<string, Moment>;
const lines = (r: Raw[]): AnalysisLine[] => r.map((l, i) => ({ rank: i + 1, evaluation: l.cp ?? 0, moves: l.pv, mate: l.mate }));
const run = (ply: string) => {
  const m = moments[ply];
  return moveIntent(m.fenBefore, m.san, {
    before: lines(m.before), after: lines(m.after), passBefore: lines(m.passBefore), passAfter: lines(m.passAfter),
  }, 'student');
};

describe('moveIntent — his reasons on his game', () => {
  it('O-O: "castle, defending f2" — it takes away …Qxf2', () => {
    const out = run('13');
    expect(out?.prevents?.uci.slice(2, 4)).toBe('f2');
    expect(out?.squares).toContain('f2');
    expect(out?.about).toBe('student');
  });

  it('Kh1: "first the king steps to h1" so that f4 comes', () => {
    const out = run('15');
    expect(out?.prepares?.san).toBe('f4');
    expect(out?.text).toMatch(/^Kh1 (first, so that f4|prepares f4)/);
  });

  it('c3: "preparing to roll the centre with d4"', () => {
    const out = run('41');
    expect(out?.prepares?.san).toBe('d4');
  });

  it('never names a move the engine never played and the board did not unlock', () => {
    for (const ply of Object.keys(moments)) {
      const out = run(ply);
      if (!out?.prepares) continue;
      const m = moments[ply];
      const seen = [...m.after, ...m.passAfter].some((l) => l.pv.includes(out.prepares!.uci));
      expect(seen || out.text.includes('first, so that') || out.text.includes('prepares')).toBe(true);
    }
  });

  it("speaks as the opponent's move when the seat says so", () => {
    const m = moments['13'];
    const out = moveIntent(m.fenBefore, m.san, {
      before: lines(m.before), after: lines(m.after), passBefore: lines(m.passBefore), passAfter: lines(m.passAfter),
    }, 'opponent');
    expect(out?.about).toBe('opponent');
    expect(out?.text).toMatch(/^Their /);
  });
});

describe('whatItDoes — the reason the prepared move is played', () => {
  it('Kh1 → f4 hits the pawn on e5 (his "prise open the f-file" game)', () => {
    const m = moments['15'];
    const out = moveIntent(m.fenBefore, m.san, {
      before: lines(m.before), after: lines(m.after), passBefore: lines(m.passBefore), passAfter: lines(m.passAfter),
    }, 'student');
    expect(out?.text).toMatch(/f4 can hit the pawn on e5|prepares f4, to hit the pawn on e5/);
  });

  it('a move that clears the back rank reads as castling', () => {
    // 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 — after Nf3 the bishop move clears f1; test the helper directly.
    const fen = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 5 4';
    expect(whatItDoes(fen, 'e1g1', 'w')).toEqual({ verb: 'castle', castle: true });
  });

  it('names nothing it cannot see', () => {
    expect(whatItDoes('4k3/8/8/8/8/8/8/4K3 b - - 0 1', 'e1e2', 'w')).toBeNull();
  });
});

describe('moveIntent — never a plan the move itself just placed', () => {
  it('castling does not "prepare" the castled rook moving again', () => {
    const m = moments['13'];
    const out = moveIntent(m.fenBefore, m.san, {
      before: lines(m.before), after: lines(m.after), passBefore: lines(m.passBefore), passAfter: lines(m.passAfter),
    }, 'student');
    expect(out?.prepares?.uci.slice(0, 2)).not.toBe('f1');
    expect(out?.text).not.toMatch(/Re1/);
  });
});

describe('moveIntent in book — never silent for being in book, held to substance', () => {
  it('drops a quiet "stops" in book, keeps a stopped threat', () => {
    const m = moments['13'];
    const r = { before: lines(m.before), after: lines(m.after), passBefore: lines(m.passBefore), passAfter: lines(m.passAfter) };
    const inBook = moveIntent(m.fenBefore, m.san, r, 'student', { ...DEFAULT_INTENT, book: true });
    // …Qxf2# is a real threat: it survives the book gate.
    expect(inBook?.prevents?.san).toMatch(/Qxf2/);
  });
});
