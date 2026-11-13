// The one cost reason, both seats (WO-DECIDER-02): the same walker reads your
// slip and theirs; only the seat differs.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { allowedClause, costReason, costReasonRow, reasonNeed } from './costReason';

const fenAfter = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };

// 1.e4 e5 2.Nf3 d6 3.Nxe5?? dxe5 — the knight for a pawn.
const BEFORE = fenAfter(['e4', 'e5', 'Nf3', 'd6']);

describe('costReason — one walker, both seats', () => {
  it('your slip: what it allowed, named on one read inside two moves', () => {
    const r = costReason({
      fenBefore: BEFORE, playedSan: 'Nxe5', mover: 'w', student: 'w', costCp: 250,
      after: { uci: ['d6e5', 'b1c3', 'g8f6'], source: 'record', seconds: [] }, before: null, priorMove: null, against: null,
    });
    expect(r).toMatchObject({ seat: 'you', kind: 'allowed', blowPlies: 1, netForWinner: 2 });
    expect(r?.trust).toMatchObject({ name: true, why: 'near' });
    expect(r?.plies[0].san).toBe('dxe5');
  });
  it('a deep line that ends mid-fight still has its reason (the first blow that holds)', () => {
    // After …dxe5 the line runs on to d4, where the e5 pawn can take: the
    // line's END proves nothing, its first blow still does.
    const r = costReason({
      fenBefore: BEFORE, playedSan: 'Nxe5', mover: 'w', student: 'w', costCp: 250,
      after: { uci: ['d6e5', 'd2d4'], source: 'deep', seconds: [] }, before: null, priorMove: null, against: null,
    });
    expect(r).toMatchObject({ kind: 'allowed', blowPlies: 1, netForWinner: 2 });
  });
  it('their slip: the same reason, the other seat', () => {
    const r = costReason({
      fenBefore: BEFORE, playedSan: 'Nxe5', mover: 'w', student: 'b', costCp: 250,
      after: { uci: ['d6e5', 'b1c3', 'g8f6'], source: 'record', seconds: [] }, before: null, priorMove: null, against: null,
    });
    expect(r).toMatchObject({ seat: 'them', kind: 'allowed', blowPlies: 1, netForWinner: 2 });
  });
  it('a reason must cover most of the cost: a pawn does not explain a lost knight', () => {
    expect(reasonNeed(250)).toBe(2);
    expect(reasonNeed(100)).toBe(1);
    // The line wins a knight for a pawn (net 2); a 600-point cost needs 4.
    expect(costReason({
      fenBefore: BEFORE, playedSan: 'Nxe5', mover: 'w', student: 'w', costCp: 600,
      after: { uci: ['d6e5'], source: 'record', seconds: [] }, before: null, priorMove: null, against: null,
    })).toBeNull();
  });
  it('under a pawn is not a cost to explain', () => {
    expect(costReason({
      fenBefore: BEFORE, playedSan: 'Nxe5', mover: 'w', student: 'w', costCp: 60,
      after: { uci: ['d6e5'], source: 'record', seconds: [] }, before: null, priorMove: null, against: null,
    })).toBeNull();
  });
  it('the decision row carries the seat and whether the line may be said', () => {
    const r = costReason({
      fenBefore: BEFORE, playedSan: 'Nxe5', mover: 'w', student: 'b', costCp: 250,
      after: { uci: ['d6e5'], source: 'deep', seconds: [] }, before: null, priorMove: null, against: null,
    });
    expect(costReasonRow(5, 'them', r)).toEqual({ ply: 5, seat: 'them', kind: 'allowed', blowPlies: 1, named: true, why: 'near', source: 'deep' });
    expect(costReasonRow(7, 'you', null)).toMatchObject({ kind: 'none', named: false, why: 'no-material-reason' });
  });
});

// A COST IS A DIFFERENCE (Learn replay of his Scotch Gambit, NqtT3roFaBs,
// 2026-11-08). After 8.Qxc5+ the coach said "Nce7 looks natural, but it
// doesn't work: they play Nxc3 — they win a pawn" — and the move played,
// 8…d6, lost the same c3 pawn to the Qxc3 they played next. Stockfish d16:
// d6 −72, Nce7 −242; the c3 pawn is in both lines, so it is not why Nce7 is
// worse. A reason is what the costly line wins beyond the other move's line.
describe('costReason — a reason is what the costly line wins BEYOND the move it is measured against', () => {
  const FEN = 'r1bq1knr/pppp2pp/2n5/2Q5/4P3/2p2N2/PP3PPP/RNB1K2R b KQ - 0 8';
  const NCE7_AFTER = ['b1c3', 'd7d6', 'c5c4', 'e7g6', 'e1g1', 'c7c6', 'c1g5', 'g8f6', 'f3h4', 'g6e5', 'c4b3'];
  const D6_LINE = ['d7d6', 'c5c3', 'd8f6', 'e1g1', 'f6c3', 'b1c3', 'c8g4', 'f3h4', 'a8e8', 'b2b3', 'g4d7', 'c1b2'];
  const read = (against: readonly string[] | null) => costReason({
    fenBefore: FEN, playedSan: 'Nce7', mover: 'b', student: 'b', costCp: 170,
    after: { uci: NCE7_AFTER, source: 'deep', seconds: [] }, before: null, priorMove: null, against,
  });
  it('the pawn both lines lose is no reason', () => {
    expect(read(D6_LINE)).toBeNull();
  });
  it('read alone (no other line known), the line still wins the pawn — the comparison is what decides', () => {
    expect(read(null)).toMatchObject({ kind: 'allowed', netForWinner: 1 });
  });
  it('a loss the other line does not share stays the reason: Nxe5 drops a knight, Nc3 drops nothing', () => {
    const r = costReason({
      fenBefore: BEFORE, playedSan: 'Nxe5', mover: 'w', student: 'w', costCp: 250,
      after: { uci: ['d6e5', 'b1c3', 'g8f6'], source: 'record', seconds: [] }, before: null, priorMove: null,
      against: ['b1c3', 'g8f6', 'f1c4'],
    });
    expect(r).toMatchObject({ kind: 'allowed', blowPlies: 1, netForWinner: 2 });
  });

  // Review 2026-11-08 (Carlsen–Caruana, before 35.Bb3): "they play a1, making a
  // rook … they win a new rook" — the engine picks a rook when the result is
  // the same, and its pick was read out as the point of the line.
  it('a promotion is said as a queen unless the engine\'s piece is the point', () => {
    const r = costReason({
      fenBefore: 'k7/8/8/8/8/8/p7/4B2K w - - 0 1', playedSan: 'Bf2', mover: 'w', student: 'w', costCp: 900,
      after: { uci: ['a2a1r'], source: 'record', seconds: [] }, before: null, priorMove: null, against: null,
    });
    expect(r?.plies[0].san).toBe('a1=Q+');
  });
});

// A trade later in the line is not material given back (baseline replay
// 2026-11-13, Sicilian Closed 1000 ply 28): …e6 hung the queen to Bxd8, and
// the line went on …Bd4+ Kh1 Rxd8 …Bxc3 bxc3 — the lead dipped for one ply
// mid-trade and the reason was thrown away.
describe('a trade later in the line does not void the blow', () => {
  it('…e6 hanging the queen to Bxd8 is said, past the …Bxc3 bxc3 trade', () => {
    const r = costReason({
      fenBefore: 'r1bq1rk1/pp2ppb1/6pp/2p5/2B4B/2NP1R2/PPP3PP/R5K1 b - - 1 14', playedSan: 'e6', mover: 'b', student: 'b', costCp: 467,
      after: { uci: ['h4d8', 'g7d4', 'g1h1', 'f8d8', 'a1f1', 'd4c3', 'b2c3', 'd8f8', 'h1g1', 'b7b6', 'h2h4', 'c8b7'], source: 'deep', seconds: [] },
      before: null, priorMove: null, against: null,
    });
    expect(r?.kind).toBe('allowed');
    expect(r && allowedClause(r, 'b')).toMatch(/^lets them win a queen for a bishop/);
  });
});
