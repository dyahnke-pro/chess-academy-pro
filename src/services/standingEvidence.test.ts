// THE STANDING WITH ITS EVIDENCE (2026-11-26): the reasons the count missed —
// a trapped piece, a pawn nobody catches, a king with no square, a queen hit
// with tempo, a clamp, the material the best line wins, and why a level board
// is level — each said with the squares, the count or the engine's line that
// proves it. Every board here is a real one from Danya's videos, with the
// engine's own lines (danya-reads, depth 12).
import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { verdictWithReasons, type ReasonKind } from './verdictWithReasons';
import { evalReading, evalReadingEvidence } from './reviewMoveBriefing';

const NONE: ReadonlySet<ReasonKind> = new Set();
const read = (fen: string, cp: number, student: 'w' | 'b', pv: string[][]) =>
  verdictWithReasons({ fen, evalCp: cp, mate: null, lines: pv.map((moves) => ({ moves })), student, lastMove: null, said: NONE });

describe('the reasons the count missed', () => {
  it('a trapped queen, with the line that takes it', () => {
    const v = read('rn2kb1r/pp3ppn/2p1p3/3pP2p/3q1P2/P1NBBQ1P/1PP3P1/R3K2R b KQkq - 1 12', 557, 'w',
      [['h7g5', 'f3e2', 'f8c5', 'e3d4', 'c5d4', 'f4g5', 'd4c3', 'b2c3', 'b8d7', 'g5g6']])!;
    expect(v.text).toBe('Their queen on d4 is trapped: every square it has loses it.');
    expect(v.arrows.at(-1)).toEqual(['e3', 'd4']);
    expect(v.proofLines[0].sans.at(-1)).toBe('Bxd4');
  });

  it('a pawn the best line promotes — said as a promotion, not a queen, when it is not one', () => {
    const v = read('2k5/ppp5/4p3/1PP2p2/P4b2/5Ppp/8/6K1 b - - 1 31', -907, 'b',
      [['f4e3', 'g1h1', 'e3c5', 'f3f4', 'g3g2', 'h1h2', 'g2g1r', 'h2h3', 'c8d7']])!;
    expect(v.text).toContain('Your passed pawn on g3 goes through: the best line promotes it.');
  });

  it('a king with no square and two pieces at it, the checks drawn', () => {
    const v = read('4Rbk1/2p2p1p/pqN3p1/2nP4/8/2Q4P/Pr3PP1/3R2K1 b - - 1 28', 768, 'w',
      [['b6c6', 'd5c6', 'b2b5', 'e8f8', 'g8f8', 'c3f6', 'b5b8']])!;
    expect(v.text).toContain('Their king on g8 has no square to step to, and two of your pieces bear on it.');
    expect(v.arrows.length).toBeGreaterThan(0);
  });

  it('a queen hit with tempo', () => {
    const v = read('r4rk1/4ppb1/3p3p/qb1P2pP/4P1P1/2pN4/P1Q2PB1/R3R1K1 b - - 1 26', -350, 'b',
      [['g7d4', 'e4e5', 'a5a4', 'c2a4', 'a8a4', 'g2e4', 'd6e5', 'e4f5', 'b5d3']])!;
    expect(v.text).toContain('Their queen on c2 can be hit with tempo: it has to move again.');
  });

  it('a clamp, with the squares it takes', () => {
    const v = read('1r5r/3np1k1/p2p2P1/PppP1P1p/2P2P2/1R2R2P/1P1B4/6K1 b - - 1 32', 330, 'w',
      [['h8e8', 'e3e6', 'd7f8', 'f5f6', 'e7f6', 'e6d6', 'b5b4', 'f4f5', 'e8e2', 'd2e3', 'b8e8', 'e3f2', 'e2d2']])!;
    expect(v.text).toContain('Your pawns on f5 and g6 clamp their kingside, taking four squares in front of their king.');
    expect(v.squares).toEqual(expect.arrayContaining(['f5', 'g6', 'h7', 'f7']));
  });

  it('the material the best line wins, arrowed to its last capture', () => {
    const v = read('2kr4/ppp2pp1/2n1b3/3pb3/P3p2q/BP4p1/R1PPPPB1/1N1QR1K1 w - - 0 19', -735, 'b',
      [['f2g3', 'e5g3', 'b1c3', 'g3e1', 'a3c5', 'e1g3', 'c3b5', 'h4h2', 'g1f1']])!;
    expect(v.text).toBe("You win a rook's worth in the best line.");
    expect(v.arrows).toEqual([['f2', 'g3'], ['e5', 'g3'], ['b1', 'c3'], ['g3', 'e1']]);
  });

  it('a level board says why it is level, with its count', () => {
    const c = new Chess(); for (const s of ['e4', 'e5', 'Nf3']) c.move(s);
    expect(read(c.fen(), 37, 'w', [])?.text).toBe('Material is level, eight pawns each, and both kings keep their pawn cover.');
  });

  it('no evidence → not said: an edge the board cannot back goes out with no reason, and Review says nothing', () => {
    const c = new Chess(); c.move('e4');
    expect(read(c.fen(), 200, 'w', [])).toBeNull();
    expect(evalReading(c.fen(), 0, 200, null, 'w', null, null)).toBeNull();
  });

  it('Review\'s standing carries its squares and its proving line', () => {
    const fen = 'rn2kb1r/pp3ppn/2p1p3/3pP2p/3q1P2/P1NBBQ1P/1PP3P1/R3K2R b KQkq - 1 12';
    const r = evalReadingEvidence(fen, 40, 557, null, 'w', { to: 'e3', captured: null },
      [{ moves: ['h7g5', 'f3e2', 'f8c5', 'e3d4', 'c5d4', 'f4g5'] }])!;
    expect(r.text).toMatch(/^You're winning — their queen on d4 is trapped/);
    expect(r.squares).toContain('d4');
    expect(r.proofLines[0].sans.length).toBe(4);
  });
});
