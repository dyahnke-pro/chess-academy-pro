import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { createLearnMemory } from './learnMemory';
import { noteSlip, notePromise, payoffFor as payoffMv } from './learnBoardTeaching';
const payoffFor = (mem: Parameters<typeof payoffMv>[0], fen: string, san: string, ply: number) => payoffMv(mem, new Chess(fen).move(san), ply);
import { skipMiddleman, castleSide, threatStronger, keepSquareForKnight } from './speedRunReads';

const fenAt = (sans: string): string => { const c = new Chess(); for (const m of sans.split(' ')) c.move(m); return c.fen(); };
const line = (moves: string[], evaluation: number) => ({ moves, evaluation, mate: null });

describe('the coach reacts to the student: the same slip twice this game (David 2026-10-06)', () => {
  it('first is plain, second and third say so, a new game forgets', () => {
    const mem = createLearnMemory();
    expect(noteSlip(mem, 'loose-piece')).toBe('');
    expect(noteSlip(mem, 'tempo')).toBe('');
    expect(noteSlip(mem, 'loose-piece')).toMatch(/second time this game/);
    expect(noteSlip(mem, 'loose-piece')).toMatch(/Third time this game/);
    mem.newGame();
    expect(noteSlip(mem, 'loose-piece')).toBe('');
  });
});

describe('the thread across moves: an idea said, then paid off', () => {
  it('the break the coach named, played later, closes the loop once', () => {
    const fen = fenAt('d4 d5 Nf3 Nf6 e3 e6 Bd3 c5');
    const r = skipMiddleman(fen, 'c4');
    expect(r?.promise).toMatchObject({ piece: 'p', square: 'c4' });
    const mem = createLearnMemory();
    notePromise(mem, r!.promise!, 8);
    expect(payoffFor(mem, fen, 'O-O', 8)).toBeNull();
    expect(payoffFor(mem, fen, 'c4', 10)?.say).toMatch(/c-pawn break we talked about — it hits their pawn on d5/);
    expect(payoffFor(mem, fen, 'c4', 12)).toBeNull();
  });
  it('castling on the side the coach named', () => {
    const fen = 'r3k2r/pppppppp/8/8/8/8/P4PPP/R3K2R w KQkq - 0 1';
    const r = castleSide(fen, 'w');
    const mem = createLearnMemory();
    notePromise(mem, r!.promise!, 0);
    expect(payoffFor(mem, fen, 'O-O', 2)?.say).toMatch(/Castled short/);
  });
  it('the capture the threat kept: paid when the student finally takes', () => {
    const fen = '4k3/8/8/3p4/8/2N5/8/4KB2 w - - 0 1';
    const r = threatStronger(fen, 'w', [line(['f1c4'], 200), line(['c3d5'], 100)]);
    const mem = createLearnMemory();
    notePromise(mem, r!.promise!, 0);
    expect(payoffFor(mem, fen, 'Nxd5', 2)?.say).toMatch(/collect on d5 — the threat did its work first/);
  });
  it('the knight reaching the square the route aimed at', () => {
    const fen = '4k3/8/8/2p1p3/3pP3/3P4/2P5/1NB1K3 w - - 0 1';
    const r = keepSquareForKnight(fen, 'w', 'Ke2');
    expect(r?.promise).toMatchObject({ piece: 'n', square: 'd5' });
  });
  it('a promise goes stale after 16 plies', () => {
    const fen = fenAt('d4 d5 Nf3 Nf6 e3 e6 Bd3 c5');
    const mem = createLearnMemory();
    notePromise(mem, skipMiddleman(fen, 'c4')!.promise!, 0);
    expect(payoffFor(mem, fen, 'c4', 30)).toBeNull();
  });
});
