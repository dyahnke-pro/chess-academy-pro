import { describe, it, expect } from 'vitest';
import { Chess, type Color } from 'chess.js';
import { reasonTries, consideredTries } from './tryCandidates';
import { standingRefutations, temptingOnBoard, type WeighRead } from './weighedMoves';
import tries from './__fixtures__/danyaTries.reads.json';

// Every board is Danya's, from the tries bench: the try he weighs out loud
// and rules out, which the eye never offered.
const whyOf = (fen: string, san: string): string | undefined => reasonTries(fen).find((t) => t.san === san)?.why;

describe('the moves weighed for a reason (reasonTries)', () => {
  it('a pawn ending: every king step is weighed — his "Ke2?! Ke4"', () => {
    expect(whyOf('8/8/8/4k1p1/6P1/4PK2/8/8 w - - 1 66', 'Ke2')).toBe('king');
  });

  it('a passed pawn queening: every promotion piece is weighed — his "f8=Q? Rd2+"', () => {
    const fen = '4R3/5P1k/4N1p1/3pn3/1b6/3r4/1PK5/8 w - - 0 49';
    expect(whyOf(fen, 'f8=Q')).toBe('passer');
    expect(whyOf(fen, 'f8=R')).toBe('passer');
    expect(whyOf(fen, 'f8=B')).toBe('passer');
    expect(whyOf(fen, 'f8=N+')).toBe('check');
  });

  it('a passed pawn pushed: "b2?? Rf8+"', () => {
    expect(whyOf('6k1/3r2p1/4p3/2B1P1R1/p3P3/1pn4P/r5PK/5R2 b - - 5 50', 'b2')).toBe('passer');
  });

  it('every capture is weighed — his "fxg4?? Rxf4+"', () => {
    expect(whyOf('6k1/1p4p1/pPp2r1p/P1Pp1p2/3PrPn1/2NR1P2/3Q2Bq/R4K2 w - - 1 32', 'fxg4')).toBe('capture');
  });

  it('a pawn lever: "g4? hxg4" strikes the h5 pawn', () => {
    expect(whyOf('2b1rrk1/2pR1p2/1pq1pQp1/p3P2p/P1PR3P/5N2/2P2PPK/8 w - - 2 32', 'g4')).toBe('lever');
  });

  it('a pawn push that wins something next move is a threat first: "…b5? Nxb5" hits c4', () => {
    expect(whyOf('r2r2k1/3nqp1p/pp1npp2/2p4N/2P3P1/P1NPP3/1B3Q1P/5RK1 b - - 7 25', 'b5')).toBe('threat');
  });

  it('a rook doubled on a file: "…Rhd8?" behind the rook on d5', () => {
    expect(whyOf('2k4r/1p2p1bp/p5p1/q2rPb2/2pB4/2P5/P2Q1NPP/2R1KB1R b K - 0 18', 'Rhd8')).toBe('double');
  });

  it('a quiet move that threatens mate: Qf6 eyes h8 beside the rook on h6', () => {
    expect(whyOf('6k1/5p2/4p1pR/1q1pP3/3P2K1/p4Q2/P4P2/2r5 w - - 0 46', 'Qf6')).toBe('mate-threat');
  });

  it('NEGATIVE CONTROL: the starting position has no move weighed for a reason', () => {
    expect(reasonTries('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toEqual([]);
  });

  it("a move that is both keeps the plan's reason (and its target)", () => {
    // Endgame attacks #3: Qc5 hits the weak b5 pawn.
    const c = consideredTries('6k1/1q3pp1/5n1p/1p3P2/p2Qp3/2P1P1P1/1P5P/5BK1 w - - 0 29').get('d4c5');
    expect(c).toEqual({ why: 'plan', target: 'b5', storm: false });
  });
});

interface TryRow { id: string; fen: string; try: string; reads: WeighRead[] }
const row = (id: string, san: string): TryRow => {
  const r = (tries as TryRow[]).find((t) => t.id === id && t.try === san);
  if (!r) throw new Error(`no fixture row ${id} ${san}`);
  return r;
};
const saidOf = (r: TryRow, considered: ReturnType<typeof consideredTries> | undefined): string | null => {
  const m = new Chess(r.fen).move(r.try);
  const uci = m.from + m.to + (m.promotion ?? '');
  const student = r.fen.split(' ')[1] as Color;
  return temptingOnBoard({ fen: r.fen, student, rating: 1800, reads: r.reads, priorMove: null, considered }).find((x) => x.uci === uci)?.text
    ?? standingRefutations({ fen: r.fen, student, rating: 1800, reads: r.reads, considered }).find((x) => x.uci === uci)?.text
    ?? null;
};

describe('a move weighed for a reason is read past the human floor', () => {
  it('"f8=Q? Rd2+": the promotion is ruled out by the check that follows', () => {
    const r = row('a-guide-to-underpromotion#2', 'f8=Q');
    expect(saidOf(r, undefined)).toBeNull();
    expect(saidOf(r, consideredTries(r.fen))).toMatch(/^f8=Q .*Rd2\+/);
  });

  it('"Bh6? e7": the bishop move lets the e-pawn run', () => {
    const r = row('mastering-opposite-colored-bishops#1', 'Bh6');
    expect(saidOf(r, undefined)).toBeNull();
    expect(saidOf(r, consideredTries(r.fen))).toMatch(/Bh6 .*e7.*queens on e8/);
  });

  it('"b4?! cxb4": the target pawn takes on b4, so it is never said to "still stand" on c5', () => {
    const r = row('modern-chess-technique#3', 'b4');
    const t = saidOf(r, consideredTries(r.fen));
    expect(t).toMatch(/pawn on c5 takes on b4 instead/);
    expect(t).not.toMatch(/still stands/);
  });

  it("the plan's try that costs half a pawn is said even when the result holds — \"…c4? bxc4\"", () => {
    const r = row('the-positional-rook-lift#2', 'c4');
    const t = saidOf(r, consideredTries(r.fen));
    expect(t).toMatch(/c4/);
    expect(t).toMatch(/bxc4/);
  });
});
