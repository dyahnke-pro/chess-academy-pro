import { describe, it, expect } from 'vitest';
import { admitArrows, refusalFor, ARROW_COLOR, withAdmitted } from './arrowDoor';

// David's Learn game (2026-09-27, 21:41): White to move, black queen on c4.
const DAVID = 'r4bkr/pb1p2p1/1p6/1P2P1B1/2q1P3/2P2Q2/1P4PP/5R1K w - - 0 23';
const ctxW = { fen: DAVID, studentColor: 'white' as const };

describe('arrowDoor — play', () => {
  it('refuses Qd3 while their queen on c4 takes it (the bug David saw)', () => {
    expect(refusalFor({ from: 'f3', to: 'd3', role: 'play', source: 't' }, ctxW)).toBe('unsafe');
  });
  it('admits the same move when the engine chose it on this board', () => {
    expect(refusalFor({ from: 'f3', to: 'd3', role: 'play', vouchedBy: 'engine', source: 't' }, ctxW)).toBeNull();
  });
  it('admits a safe move, green', () => {
    const r = admitArrows([{ from: 'f1', to: 'e1', role: 'play', source: 't' }], ctxW);
    expect(r.arrows).toEqual([{ startSquare: 'f1', endSquare: 'e1', color: ARROW_COLOR.mine }]);
  });
  it('refuses an illegal move and an empty start square', () => {
    expect(refusalFor({ from: 'h1', to: 'h3', role: 'play', source: 't' }, ctxW)).toBe('illegal');
    // Qxf8+ is legal, but the queen is lost to …Kxf8.
    expect(refusalFor({ from: 'f3', to: 'f8', role: 'play', source: 't' }, ctxW)).toBe('unsafe');
    expect(refusalFor({ from: 'e3', to: 'e4', role: 'play', source: 't' }, ctxW)).toBe('no-piece');
  });
  it('refuses the opponent piece as a "play" arrow', () => {
    expect(refusalFor({ from: 'c4', to: 'c3', role: 'play', source: 't' }, ctxW)).toBe('wrong-side');
  });
  it('a capture that wins what it gives is safe (trade)', () => {
    // 1.e4 d5: exd5 Qxd5 — pawn for pawn.
    const fen = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    expect(refusalFor({ from: 'e4', to: 'd5', role: 'play', source: 't' }, { fen, studentColor: 'white' })).toBeNull();
  });
  it('ranked candidates keep their shade', () => {
    const r = admitArrows([{ from: 'f1', to: 'e1', role: 'play', rank: 2, source: 't' }], ctxW);
    expect(r.arrows[0].color).toBe('#3b82f6');
  });
});

describe('arrowDoor — threat', () => {
  it('a real threat is red and starts on THEIR piece', () => {
    // …Qxe4 wins a pawn: after Qxe4 the bishop on b7 takes back on e4.
    expect(refusalFor({ from: 'c4', to: 'e4', role: 'threat', source: 't' }, ctxW)).toBeNull();
    // Their queen takes c3 — defended by b2, so wins nothing either.
    expect(refusalFor({ from: 'c4', to: 'c3', role: 'threat', source: 't' }, ctxW)).toBe('wins-nothing');
  });
  it('a capture that wins material is admitted in red', () => {
    // Black knight on d4 can take the undefended bishop on b3.
    const fen = '4k3/8/8/8/3n4/1B6/8/4K3 b - - 0 1';
    const r = admitArrows([{ from: 'd4', to: 'b3', role: 'threat', source: 't' }], { fen, studentColor: 'white' });
    expect(r.arrows).toEqual([{ startSquare: 'd4', endSquare: 'b3', color: ARROW_COLOR.theirs }]);
    // …Nxe2 against a bishop the king guards wins nothing: knight for bishop.
    expect(refusalFor({ from: 'd4', to: 'e2', role: 'threat', source: 't' }, { fen: '4k3/8/8/8/3n4/8/4B3/4K3 b - - 0 1', studentColor: 'white' })).toBe('wins-nothing');
  });
  it('the student\'s own piece can never be a threat arrow', () => {
    expect(refusalFor({ from: 'f3', to: 'f8', role: 'threat', source: 't' }, ctxW)).toBe('wrong-side');
  });
});

describe('arrowDoor — line and vision', () => {
  it('a line ply is checked on its own board and coloured by the mover', () => {
    const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const afterE4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    const r = admitArrows([
      { from: 'e2', to: 'e4', role: 'line', fen: start, source: 't' },
      { from: 'e7', to: 'e5', role: 'line', fen: afterE4, source: 't' },
      { from: 'e7', to: 'e5', role: 'line', fen: start, source: 't' }, // wrong board for this ply → legal for black via turn flip
    ], { fen: start, studentColor: 'white' });
    expect(r.arrows.map((a) => a.color)).toEqual([ARROW_COLOR.mine, ARROW_COLOR.theirs]);
    expect(r.refused.map((x) => x.reason)).toEqual(['duplicate']);
  });
  it('vision needs a clear sight line', () => {
    expect(refusalFor({ from: 'g5', to: 'd8', role: 'vision', source: 't' }, ctxW)).toBeNull();
    expect(refusalFor({ from: 'f1', to: 'f8', role: 'vision', source: 't' }, ctxW)).toBe('no-sight');
  });
});

describe('withAdmitted', () => {
  it('merges unique by square pair', () => {
    const a = { startSquare: 'e2', endSquare: 'e4', color: 'x' };
    expect(withAdmitted([a], [{ ...a, color: 'y' }])).toEqual([{ ...a, color: 'y' }]);
  });
});

describe('arrowDoor — played trail and named moves', () => {
  it('the trail of the move just made is admitted only where it was made', () => {
    const afterE4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    const ctx = { fen: afterE4, studentColor: 'white' as const };
    expect(refusalFor({ from: 'e2', to: 'e4', role: 'played', source: 't' }, ctx)).toBeNull();
    expect(refusalFor({ from: 'd2', to: 'd4', role: 'played', source: 't' }, ctx)).toBe('not-played');
  });
  it('a named move is that side\'s move; a named square it cannot reach is a sight line', async () => {
    const { namedMoveClaim } = await import('./arrowDoor');
    const ctx = { fen: DAVID, studentColor: 'white' as const };
    expect(namedMoveClaim('f1', 'e1', ctx, 'engine', 't').role).toBe('play');
    expect(namedMoveClaim('c4', 'c3', ctx, 'engine', 't').role).toBe('theirs');
    // The rook on f1 guards its own queen on f3 — seen, but not a move.
    expect(namedMoveClaim('f1', 'f3', ctx, 'engine', 't').role).toBe('vision');
  });
});
