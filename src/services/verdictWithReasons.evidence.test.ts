import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { verdictWithReasons, type ReasonKind } from './verdictWithReasons';

// "WHY ONE SIDE IS BETTER", BACKED BY EVIDENCE (Coach Build Board): the
// reasons the Danya standing read missed, each on a real board, ranked by what
// the engine's line plays on, and a level board that says why it is level.
const fenOf = (sans: string): string => { const c = new Chess(); for (const m of sans.split(' ')) c.move(m); return c.fen(); };
const NONE: ReadonlySet<ReasonKind> = new Set();
const kinds = (v: ReturnType<typeof verdictWithReasons>): ReasonKind[] => (v?.reasons ?? []).map((r) => r.kind);

describe('the standing says why, with evidence', () => {
  it('a level opening board says why it is level', () => {
    const v = verdictWithReasons({ fen: fenOf('e4 e5 Nf3 Nc6'), evalCp: 20, mate: null, lines: null, student: 'w', lastMove: null, said: NONE });
    expect(kinds(v)).toEqual(['balance']);
    expect(v?.text).toBe('Material is level, and neither king is under fire.');
  });

  it('a mate threat is the reason (Scholar\'s setup, …d6 ignoring Qxf7)', () => {
    const v = verdictWithReasons({ fen: fenOf('e4 e5 Bc4 Nc6 Qh5 d6'), evalCp: 900, mate: null, lines: null, student: 'w', lastMove: null, said: NONE });
    expect(kinds(v)[0]).toBe('mate-threat');
    expect(v?.text).toMatch(/queen threatens mate on f7/);
  });

  it('a queen hit with tempo, ranked up because the best line plays it (Scandinavian, Nc3)', () => {
    const fen = fenOf('e4 d5 exd5 Qxd5');
    const v = verdictWithReasons({ fen, evalCp: 80, mate: null, lines: [{ moves: ['b1c3', 'd5a5', 'd2d4'], evaluation: 80, mate: null }], student: 'w', lastMove: null, said: NONE });
    expect(kinds(v)).toContain('tempo');
    expect(v?.text).toMatch(/knight can hit their queen on d5 with tempo/);
  });

  it('a trapped piece is the reason (…g4 traps the bishop on f3)', () => {
    const c = new Chess('6k1/pp2rp2/2pp1q1p/5bp1/3b4/1Q3BB1/P1P2PPP/3R2K1 b - - 1 21');
    c.move('g4');
    const v = verdictWithReasons({ fen: c.fen(), evalCp: -320, mate: null, lines: null, student: 'b', lastMove: null, said: NONE });
    expect(kinds(v)).toContain('trapped');
    expect(v?.text).toMatch(/bishop on f3 is trapped/);
  });
});
