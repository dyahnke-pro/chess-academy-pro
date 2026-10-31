import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { createLearnMemory } from './learnMemory';
import { noteSlip, notePromise, promiseEvent, payoffFor as payoffMv } from './learnBoardTeaching';
const payoffFor = (mem: ReturnType<typeof createLearnMemory>, fen: string, san: string, ply: number) => payoffMv(mem.story, new Chess(fen).move(san), ply);
import { skipMiddleman, castleSide, threatStronger, keepSquareForKnight } from './speedRunReads';

const fenAt = (sans: string): string => { const c = new Chess(); for (const m of sans.split(' ')) c.move(m); return c.fen(); };
const line = (moves: string[], evaluation: number) => ({ moves, evaluation, mate: null });

describe('the coach reacts to the student: the same slip twice this game (David 2026-10-06)', () => {
  it('first is plain, second and third say so, a new game forgets', () => {
    const mem = createLearnMemory({ livePlies: () => 0 });
    expect(noteSlip(mem.story, 'loose-piece', 8)).toBe('');
    expect(noteSlip(mem.story, 'tempo', 10)).toBe('');
    expect(noteSlip(mem.story, 'loose-piece', 12)).toMatch(/second time this game/);
    expect(noteSlip(mem.story, 'loose-piece', 14)).toMatch(/Third time this game/);
    mem.newGame();
    expect(noteSlip(mem.story, 'loose-piece', 8)).toBe('');
  });
  it('a takeback takes back the slips it undid (the story\'s events, P1-8c)', () => {
    const mem = createLearnMemory({ livePlies: () => 0 });
    noteSlip(mem.story, 'loose-piece', 8);
    expect(noteSlip(mem.story, 'loose-piece', 12)).toMatch(/second time this game/);
    mem.rewind(10);
    expect(noteSlip(mem.story, 'loose-piece', 12)).toMatch(/second time this game/);
  });
});

describe('the thread across moves: an idea said, then paid off', () => {
  it('the break the coach named, played later, closes the loop once', () => {
    const fen = fenAt('d4 d5 Nf3 Nf6 e3 e6 Bd3 c5');
    const r = skipMiddleman(fen, 'c4');
    expect(r?.promise).toMatchObject({ piece: 'p', square: 'c4' });
    const mem = createLearnMemory({ livePlies: () => 0 });
    notePromise(mem.story, r!.promise!, 8);
    expect(payoffFor(mem, fen, 'O-O', 8)).toBeNull();
    expect(payoffFor(mem, fen, 'c4', 10)?.say).toMatch(/c-pawn break we talked about — it hits their pawn on d5/);
    expect(payoffFor(mem, fen, 'c4', 12)).toBeNull();
  });
  it('castling on the side the coach named', () => {
    const fen = 'r3k2r/pppppppp/8/8/8/8/P4PPP/R3K2R w KQkq - 0 1';
    const r = castleSide(fen, 'w');
    const mem = createLearnMemory({ livePlies: () => 0 });
    notePromise(mem.story, r!.promise!, 0);
    expect(payoffFor(mem, fen, 'O-O', 2)?.say).toMatch(/Castled short/);
  });
  it('the capture the threat kept: paid when the student finally takes', () => {
    const fen = '4k3/8/8/3p4/8/2N5/8/4KB2 w - - 0 1';
    const r = threatStronger(fen, 'w', [line(['f1c4', 'e8e7'], 200), line(['c3d5'], 100)]);
    const mem = createLearnMemory({ livePlies: () => 0 });
    notePromise(mem.story, r!.promise!, 0);
    expect(payoffFor(mem, fen, 'Nxd5', 2)?.say).toMatch(/collect on d5 — the threat did its work first/);
  });
  it('the knight reaching the square the route aimed at', () => {
    const fen = '4k3/8/8/2p1p3/3pP3/3P4/2P5/1NB1K3 w - - 0 1';
    const r = keepSquareForKnight(fen, 'w', 'Ke2');
    expect(r?.promise).toMatchObject({ piece: 'n', square: 'd5' });
  });
  it('a promise goes stale after 16 plies', () => {
    const fen = fenAt('d4 d5 Nf3 Nf6 e3 e6 Bd3 c5');
    const mem = createLearnMemory({ livePlies: () => 0 });
    notePromise(mem.story, skipMiddleman(fen, 'c4')!.promise!, 0);
    expect(payoffFor(mem, fen, 'c4', 30)).toBeNull();
  });
  it('an idea is remembered when it is said: offered on its line, the game\'s only if the door keeps it', () => {
    const fen = fenAt('d4 d5 Nf3 Nf6 e3 e6 Bd3 c5');
    const promise = skipMiddleman(fen, 'c4')!.promise!;
    const held = createLearnMemory({ livePlies: () => 0 });
    const e1 = promiseEvent(held.story, promise, 8);
    held.story.offer(fen, { text: 'Prepare the c-pawn break.', events: e1 ? [e1] : [] });
    held.story.commitKept(8, fen, []);
    expect(payoffFor(held, fen, 'c4', 10), 'the door held the idea: nothing to pay off').toBeNull();
    const kept = createLearnMemory({ livePlies: () => 0 });
    const e2 = promiseEvent(kept.story, promise, 8);
    kept.story.offer(fen, { text: 'Prepare the c-pawn break.', events: e2 ? [e2] : [] });
    kept.story.commitKept(8, fen, [{ text: 'Prepare the c-pawn break.' }]);
    expect(payoffFor(kept, fen, 'c4', 10)?.say).toMatch(/c-pawn break we talked about/);
    // Paid once: the same key is open again only when made again.
    expect(promiseEvent(kept.story, promise, 12)).not.toBeNull();
  });
});
