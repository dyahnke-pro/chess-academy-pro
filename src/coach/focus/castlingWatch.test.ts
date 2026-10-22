import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import {
  CASTLE_LOSING_CP, castleProbe, castleReady, castleStopLine, castleVerdict, castleWhatIf, hungMaterial, isAttack,
  reminderDue, rewindTarget, watchOver, type CastleBoard,
} from './castlingWatch';
import type { ReadLine } from './focusChances';

const play = (fen: string, san: string): string => { const c = new Chess(fen); c.move(san); return c.fen(); };

/** The Italian, White to move: castling is ready. */
const READY = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
/** The read before: castling is best; d3 costs 150. */
const READ: ReadLine[] = [
  { moves: ['e1g1', 'f6e4'], evaluation: 30, mate: null },
  { moves: ['d2d3', 'f6g4'], evaluation: -120, mate: null },
];

describe('the what-if: the student\'s king and rook on their castled squares', () => {
  it('kingside, the opponent to move, the student\'s rights gone and theirs kept', () => {
    const w = castleWhatIf(play(READY, 'd3'), 'w');
    expect(w?.side).toBe('k');
    const c = new Chess(w?.fen ?? '');
    expect(c.get('g1')).toEqual({ type: 'k', color: 'w' });
    expect(c.get('f1')).toEqual({ type: 'r', color: 'w' });
    expect(c.get('e1')).toBeUndefined();
    expect(w?.fen.split(' ')[1]).toBe('b');
    expect(w?.fen.split(' ')[2]).toBe('kq');
  });
  it('twins: squares blocked, or the king\'s path attacked — no claim', () => {
    expect(castleWhatIf(play(new Chess().fen(), 'e4'), 'w'), 'the f1 bishop and g1 knight are home').toBeNull();
    // The c4 bishop hits f1 through e2 and d3: the king cannot pass.
    expect(castleWhatIf('4k3/8/8/8/2b5/8/8/4K2R b K - 0 1', 'w')).toBeNull();
    expect(castleWhatIf('4k3/8/8/8/8/8/8/4K2R b K - 0 1', 'w')?.side, 'twin: nothing attacks the path').toBe('k');
  });
  it('the queenside when it is the side that is open', () => {
    expect(castleWhatIf('4k3/8/8/8/8/8/8/R3K1NR b KQ - 0 1', 'w')?.side).toBe('q');
  });
});

describe('the probe: only a costly move, with the king uncastled, that hung nothing', () => {
  const m = (san: string, lines: ReadLine[] | null = READ) => ({ fenBefore: READY, san, fenAfter: play(READY, san), student: 'w' as const, lines });
  it('a move that cost 150 with castling open is probed; the read gives the real value', () => {
    expect(castleProbe(m('d3'))).toMatchObject({ side: 'k', bestCp: 30, realCp: -120 });
  });
  it('a move the read does not list is probed with the real value unknown (the page reads it)', () => {
    expect(castleProbe(m('a3'))).toMatchObject({ bestCp: 30, realCp: null });
  });
  it('twins: castling itself, no read, a cheap move', () => {
    expect(castleProbe(m('O-O'))).toBeNull();
    expect(castleProbe(m('d3', null))).toBeNull();
    expect(castleProbe(m('d3', [{ moves: ['e1g1'], evaluation: 30, mate: null }, { moves: ['d2d3'], evaluation: -40, mate: null }]))).toBeNull();
  });
  it('twin: a move that hangs material is the tactics focus\'s, never the king\'s', () => {
    // Bxf7+ gives the bishop for a pawn: …Kxf7.
    const lines: ReadLine[] = [READ[0], { moves: ['c4f7', 'e8f7'], evaluation: -200, mate: null }];
    expect(hungMaterial(READY, play(READY, 'Bxf7+'), 'w')).toBe(true);
    expect(castleProbe(m('Bxf7+', lines))).toBeNull();
    expect(hungMaterial(READY, play(READY, 'd3'), 'w')).toBe(false);
  });
  it('twin: the watch is over once the student has no castling right', () => {
    expect(watchOver(play(READY, 'Ke2'), 'w')).toBe(true);
    expect(castleProbe(m('Ke2'))).toBeNull();
    expect(watchOver(play(READY, 'd3'), 'w')).toBe(false);
  });
});

describe('the verdict: STOP only when the castled king would have held the cost', () => {
  it('the what-if is better than the real board by at least the drop → STOP', () => {
    expect(castleVerdict({ bestCp: 30, realCp: -120, whatIfCp: 40 })).toEqual({ stop: true, drop: 150, gain: 160 });
  });
  it('twin: the what-if barely helps — the cost is something else, nothing is said', () => {
    expect(castleVerdict({ bestCp: 30, realCp: -120, whatIfCp: -50 }).stop).toBe(false);
  });
  it('twin: a cheap move is never a STOP, however much castling would help', () => {
    expect(castleVerdict({ bestCp: 30, realCp: -40, whatIfCp: 300 }).stop).toBe(false);
  });
});

describe('the four fixed lines, always true', () => {
  it('losing vs a cost; an attack vs a quiet move', () => {
    expect(castleStopLine(true, true)).toBe("STOP! You're not castled, and because of that you're now in a losing position! You need to castle before you attack!");
    expect(castleStopLine(true, false)).toBe("STOP! You're not castled, and because of that you're now in a losing position! You need to castle first!");
    expect(castleStopLine(false, true)).toBe("STOP! You're not castled, and that just cost you! You need to castle before you attack!");
    expect(castleStopLine(false, false)).toBe("STOP! You're not castled, and that just cost you! You need to castle first!");
  });
  it('an attack is a capture, a check, or a piece moving toward their king', () => {
    expect(isAttack(READY, 'Bxf7+')).toBe(true);
    expect(isAttack(READY, 'Ng5')).toBe(true);
    expect(isAttack(READY, 'd3'), 'a pawn push is never "toward the king"').toBe(false);
    expect(isAttack(READY, 'Bb3'), 'a retreat').toBe(false);
  });
});

describe('the reminder: once, early, when castling was ready and something else was played', () => {
  const m = (san: string) => ({ fenBefore: READY, san, student: 'w' as const });
  it('said in the student\'s first twelve moves', () => {
    expect(castleReady(READY, 'w')).toBe(true);
    expect(reminderDue(m('d3'), 7, false)).toBe(true);
  });
  it('twins: castling, already reminded, past move 12, castling not ready', () => {
    expect(reminderDue(m('O-O'), 7, false)).toBe(false);
    expect(reminderDue(m('d3'), 7, true)).toBe(false);
    expect(reminderDue(m('d3'), 25, false)).toBe(false);
    expect(reminderDue({ fenBefore: play(new Chess().fen(), 'e4').replace(' b ', ' w '), san: 'd4', student: 'w' }, 3, false)).toBe(false);
  });
});

describe('the rewind goes to the latest board where castling was ready and not yet losing', () => {
  const lines = (cp: number): ReadLine[] => [{ moves: ['e1g1'], evaluation: cp, mate: null }];
  const NOT_READY = play(new Chess().fen(), 'e4').replace(' b ', ' w ');
  const boards = (lastCp: number): CastleBoard[] => [
    { ply: 7, fen: READY, prevFen: null, lines: lines(20) },
    { ply: 9, fen: READY, prevFen: null, lines: lines(lastCp) },
    { ply: 11, fen: NOT_READY, prevFen: null, lines: lines(0) },
  ];
  it('skips a board where castling was not ready', () => {
    expect(rewindTarget(boards(-200), 'w')?.ply).toBe(9);
  });
  it('skips a board that was already losing', () => {
    expect(rewindTarget(boards(CASTLE_LOSING_CP), 'w')?.ply).toBe(7);
  });
  it('none at all: no rewind', () => {
    expect(rewindTarget([{ ply: 11, fen: NOT_READY, prevFen: null, lines: null }], 'w')).toBeNull();
  });
});
