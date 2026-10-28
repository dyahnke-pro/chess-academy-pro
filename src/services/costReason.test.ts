// The one cost reason, both seats (WO-DECIDER-02): the same walker reads your
// slip and theirs; only the seat differs.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { costReason, costReasonRow, reasonNeed } from './costReason';

const fenAfter = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };

// 1.e4 e5 2.Nf3 d6 3.Nxe5?? dxe5 — the knight for a pawn.
const BEFORE = fenAfter(['e4', 'e5', 'Nf3', 'd6']);

describe('costReason — one walker, both seats', () => {
  it('your slip: what it allowed, named on one read inside two moves', () => {
    const r = costReason({
      fenBefore: BEFORE, playedSan: 'Nxe5', mover: 'w', student: 'w', costCp: 250,
      after: { uci: ['d6e5', 'b1c3', 'g8f6'], source: 'record', seconds: [] }, before: null, priorMove: null,
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
      after: { uci: ['d6e5', 'd2d4'], source: 'deep', seconds: [] }, before: null, priorMove: null,
    });
    expect(r).toMatchObject({ kind: 'allowed', blowPlies: 1, netForWinner: 2 });
  });
  it('their slip: the same reason, the other seat', () => {
    const r = costReason({
      fenBefore: BEFORE, playedSan: 'Nxe5', mover: 'w', student: 'b', costCp: 250,
      after: { uci: ['d6e5', 'b1c3', 'g8f6'], source: 'record', seconds: [] }, before: null, priorMove: null,
    });
    expect(r).toMatchObject({ seat: 'them', kind: 'allowed', blowPlies: 1, netForWinner: 2 });
  });
  it('a reason must cover most of the cost: a pawn does not explain a lost knight', () => {
    expect(reasonNeed(250)).toBe(2);
    expect(reasonNeed(100)).toBe(1);
    // The line wins a knight for a pawn (net 2); a 600-point cost needs 4.
    expect(costReason({
      fenBefore: BEFORE, playedSan: 'Nxe5', mover: 'w', student: 'w', costCp: 600,
      after: { uci: ['d6e5'], source: 'record', seconds: [] }, before: null, priorMove: null,
    })).toBeNull();
  });
  it('under a pawn is not a cost to explain', () => {
    expect(costReason({
      fenBefore: BEFORE, playedSan: 'Nxe5', mover: 'w', student: 'w', costCp: 60,
      after: { uci: ['d6e5'], source: 'record', seconds: [] }, before: null, priorMove: null,
    })).toBeNull();
  });
  it('the decision row carries the seat and whether the line may be said', () => {
    const r = costReason({
      fenBefore: BEFORE, playedSan: 'Nxe5', mover: 'w', student: 'b', costCp: 250,
      after: { uci: ['d6e5'], source: 'deep', seconds: [] }, before: null, priorMove: null,
    });
    expect(costReasonRow(5, 'them', r)).toEqual({ ply: 5, seat: 'them', kind: 'allowed', blowPlies: 1, named: true, why: 'near', source: 'deep' });
    expect(costReasonRow(7, 'you', null)).toMatchObject({ kind: 'none', named: false, why: 'no-material-reason' });
  });
});
