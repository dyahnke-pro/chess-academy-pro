// THE ANSWER WAITS FOR THE MOVE, AND IS READ AGAINST IT (Black walk
// 2026-10-19): the method's answer read on 11…Bh4 — "nothing of yours can be
// taken, and nothing of theirs is free … a pawn break is ready right now —
// find it" — was spoken after 12.Bb3 Nxb3, with the rook on a1 attacked.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { methodRead, methodLine } from './planChoice';
import { splitThink, resolveOwed } from '../utils/thinkPause';

const GAME = 'e4 c5 Ne2 Nc6 Nbc3 e5 Ng3 Nf6 Bc4 d6 h3 Be7 Bb5 O-O O-O Nd4 Bc4 Be6 d3 Nd7 Nd5 Bh4 Bb3 Nxb3'.split(' ');
const at = (n: number): string => { const c = new Chess(); GAME.slice(0, n).forEach((m) => c.move(m)); return c.fen(); };
const owedOf = (fen: string): string => splitThink(methodLine(methodRead(fen, 'w', true)!, fen))![1];

describe('the method answer after the student moved', () => {
  it('11…Bh4 → 12.Bb3 Nxb3: no present-tense "can be taken" on the board after Nxb3', () => {
    const said = resolveOwed(owedOf(at(22)), { fenBefore: at(22), san: 'Bb3', fenNow: at(24) });
    expect(said).not.toMatch(/can be taken|is free|right now — find it/);
    expect(said).toMatch(/^Before your move, checks, captures, threats: nothing of yours could be taken, and nothing of theirs was free\./);
    // The held break was missed: said, never named.
    expect(said).toMatch(/A pawn break was ready to push\./);
    expect(said).not.toMatch(/f4|d4|c3|b4/);
  });

  it('found: the break that was ready is credited by name', () => {
    const fen = at(22);
    const read = methodRead(fen, 'w', true)!;
    const c = new Chess(fen);
    const push = c.moves({ verbose: true }).find((m) => m.piece === 'p' && !m.captured && read.breaks.includes(m.to));
    expect(push).toBeDefined();
    const after = new Chess(fen); after.move(push!.san);
    const said = resolveOwed(owedOf(fen), { fenBefore: fen, san: push!.san, fenNow: after.fen() });
    expect(said).toContain(`You found it — ${push!.san} was the pawn break that was ready.`);
  });

  it('a move from another board resolves nothing', () => {
    expect(resolveOwed(owedOf(at(22)), { fenBefore: at(20), san: 'Nd5', fenNow: at(22) })).toBe('');
  });
});

describe('every other question reads its answer against the move', () => {
  it('threat answer: the engine move found is credited; another move leaves it to the verdict', async () => {
    const { threatAnswer } = await import('./threatAnswer');
    const fen = '6k1/5ppp/8/8/8/6b1/4NR1P/6K1 w - - 0 31';
    const t = threatAnswer({ fen, squares: ['g3', 'f2'], bestUci: 'h2g3', studentCp: 300, student: 'w', ply: 0, shape: 'hit', namesMove: false })!;
    const owed = splitThink(t.text)![1];
    const after = (san: string): string => { const c = new Chess(fen); c.move(san); return c.fen(); };
    expect(resolveOwed(owed, { fenBefore: fen, san: 'hxg3', fenNow: after('hxg3') })).toBe('You found it — hxg3 took the piece doing it.');
    const t2 = threatAnswer({ fen, squares: ['g3', 'f2'], bestUci: 'h2g3', studentCp: 300, student: 'w', ply: 0, shape: 'hit', namesMove: false })!;
    expect(resolveOwed(splitThink(t2.text)![1], { fenBefore: fen, san: 'Nxg3', fenNow: after('Nxg3') })).toBe('');
  });
  it('the bait question: left alone, said in the past; taken, left to the verdict', async () => {
    const { buildRejectedTempting } = await import('./playCommentary');
    const fen = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    const mk = () => buildRejectedTempting({ fen, studentColor: 'white', baitSquare: 'd5', lines: [{ uci: 'e4e5', replyUci: 'c7c5', evalCp: 40 }, { uci: 'e4d5', replyUci: 'd8d5', evalCp: -140 }] })!;
    const after = (san: string): string => { const c = new Chess(fen); c.move(san); return c.fen(); };
    expect(resolveOwed(splitThink(mk().spoken)![1], { fenBefore: fen, san: 'e5', fenNow: after('e5') })).toBe('The pawn on d5 was bait: exd5 runs into Qxd5.');
    expect(resolveOwed(splitThink(mk().spoken)![1], { fenBefore: fen, san: 'exd5', fenNow: after('exd5') })).toBe('');
  });
});
