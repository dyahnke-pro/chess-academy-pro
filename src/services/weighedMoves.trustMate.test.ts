/**
 * Danya's tries, ruled out the way he rules them out (2026-11-19): a line the
 * BOARD proves is named on one engine read, and a forced mate is always said.
 * Every board is a real row of his tries fixture, with its stored reads.
 */
import { describe, it, expect } from 'vitest';
import { Chess, type Color } from 'chess.js';
import { temptingOnBoard, type WeighRead } from './weighedMoves';
import { boardProvesLine, lineTrust } from './lineTrust';
import tries from './__fixtures__/danyaTries.reads.json';

interface TryRow { id: string; fen: string; try: string; reads: WeighRead[] }
const row = (id: string, t: string): TryRow => {
  const r = (tries as TryRow[]).find((x) => x.id === id && x.try === t);
  if (!r) throw new Error(`no fixture row ${id} ${t}`);
  return r;
};
const said = (r: TryRow) => temptingOnBoard({ fen: r.fen, student: r.fen.split(' ')[1] as Color, rating: 1800, reads: r.reads, priorMove: null });

describe('gap A: a line the board proves is named without a second read', () => {
  it('names Rxd8 …Rg2+ Kh1 …Rd2+ Kg1 …Rxd8 — every move of theirs a check or a capture, every reply the only one', () => {
    const r = row('modern-chess-technique#3', 'Rxd8');
    const t = said(r).find((x) => x.san === 'Rxd8');
    expect(t).toBeDefined();
    expect(t!.reason.trust.why).toBe('board-proven');
    expect(t!.text).toMatch(/Rg2\+.*Rxd8/);
  });

  it('keeps a quiet engine line deeper than two moves unconfirmed', () => {
    // Kxf2 …Bc2+ Qxf7+ …Qxf7+ Kg1 …Bg5 Rf1 …Bxe3+: …Bg5 is a quiet move.
    const r = row('mastering-the-queen-sacrifice#1', 'Kxf2');
    const c = new Chess(r.fen);
    const m = c.move(r.try);
    const read = r.reads.find((x) => x.moves[0] === m.from + m.to)!;
    const after = c.fen();
    const line = read.moves.slice(1, 8);
    expect(boardProvesLine(after, line, 7, 'b')).toBe(false);
    expect(lineTrust({ fen: after, uci: line, plies: 7, winner: 'b', seconds: [] }).name).toBe(false);
  });
});

describe('gap B: a forced mate is always said', () => {
  it('says Nxc3 walking into Qh7#, though a player would rarely play it', () => {
    const r = row('the-positional-sacrifice#0', 'Nxc3');
    const t = said(r).find((x) => x.san === 'Nxc3');
    expect(t).toBeDefined();
    expect(t!.reason.mate).toBe(true);
    expect(t!.text).toMatch(/Qh7#/);
  });

  it('says Qd4 walking into a mate five moves long, the mate shown', () => {
    const r = row('never-trust-your-opponent#2', 'Qd4');
    const t = said(r).find((x) => x.san === 'Qd4');
    expect(t).toBeDefined();
    expect(t!.reason.mate).toBe(true);
    expect(t!.reason.trust.name).toBe(true);
    expect(t!.text).toMatch(/Qc6#/);
  });
});
