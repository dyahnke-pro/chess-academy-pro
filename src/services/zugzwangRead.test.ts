import { describe, it, expect } from 'vitest';
import { zugzwangOn, zugzwangSyncLine, zugzwangMade } from './zugzwangRead';
import { readBoard } from './boardComputers';

// THE TRÉBUCHET: each king guards its own pawn and attacks the other's (c4
// and d4). Whoever has to move steps away from their pawn and loses it —
// mutual zugzwang, found by the bounded count (no engine).
const TREBUCHET_W = '8/8/8/3k4/2pP4/2K5/8/8 w - - 0 1';
const TREBUCHET_B = '8/8/8/3k4/2pP4/2K5/8/8 b - - 0 1';

describe('zugzwangRead — the count, kings and pawns only', () => {
  it('the trébuchet: whoever moves drops the pawn, both seats', () => {
    const w = zugzwangOn(TREBUCHET_W, null);
    expect(w).toMatchObject({ side: 'w', source: 'count', drops: 1, mutual: true });
    expect(zugzwangSyncLine(w!, 'w', false)).toMatch(/Every move you have gives up a pawn/);
    const b = zugzwangOn(TREBUCHET_B, null);
    expect(b).toMatchObject({ side: 'b', mutual: true });
    expect(zugzwangSyncLine(b!, 'w', false)).toMatch(/Every move they have gives up a pawn/);
  });

  it('a spare pawn move breaks it (negative control): h3 passes the move', () => {
    expect(zugzwangOn('8/8/8/3k4/2pP4/2K5/7P/8 w - - 0 1', null)).toBeNull();
  });

  it('a pawn that falls anyway is no zugzwang (passing loses it too)', () => {
    // The black king takes on d4 whoever moves: the white king is far away.
    expect(zugzwangOn('8/8/8/4k3/3P4/8/8/7K w - - 0 1', null)).toBeNull();
  });

  it('silent with pieces on and no engine read, and in check', () => {
    expect(zugzwangOn('8/8/8/3k4/2pP4/2K5/8/6R1 w - - 0 1', null)).toBeNull();
    expect(zugzwangOn('8/8/8/3k4/2pP4/2K5/8/3r4 w - - 0 1', null)).toBeNull();
  });
});

describe('zugzwangRead — the engine read with the null-move read', () => {
  // Black to move: the d6 king must give way and the white king walks in to
  // c6 or e5; White to move, it is level. Stockfish, depth 22, White's view:
  // +3571 on Black's move, +4 with White to move instead (the pass board).
  const SQUEEZE = '8/8/1p1k4/1P6/2PK4/8/8/8 b - - 0 1';
  it('on move it loses; if Black could pass, it holds', () => {
    const z = zugzwangOn(SQUEEZE, { lines: [{ evaluation: 3571, mate: null, moves: [] }], pass: [{ evaluation: 4, mate: null, moves: [] }] });
    expect(z).toMatchObject({ side: 'b', source: 'engine', onMove: -1, ifPassed: 0 });
    expect(zugzwangSyncLine(z!, 'w', false)).toMatch(/If they could pass, they would hold the draw/);
    expect(zugzwangSyncLine(z!, 'b', false)).toMatch(/If you could pass, you would hold the draw/);
  });
  // Danya, "In Pursuit of Zugzwang" (move 54): "54...a6!!… White has no
  // choice but to move his king — but moving it in any direction is
  // suicidal". Stockfish, depth 18, White's view: -421 on White's move, +53
  // with Black to move instead. A score of a pawn and a quarter is no draw
  // and no win, so it claims no result (pawn-endgames #1: +129 against +305).
  it('his …a6: on move White loses; with a pass it would hold', () => {
    const A6 = '8/8/p4p1p/6p1/1PK3P1/kBp2P1P/2P5/1n6 w - - 0 55';
    const z = zugzwangOn(A6, { lines: [{ evaluation: -421, mate: null, moves: [] }], pass: [{ evaluation: 53, mate: null, moves: [] }] });
    expect(z).toMatchObject({ side: 'w', onMove: -1, ifPassed: 0 });
    expect(zugzwangOn('8/8/3k4/1P4p1/2K1ppP1/8/5P2/8 w - - 0 59', { lines: [{ evaluation: 129, mate: null, moves: [] }], pass: [{ evaluation: 305, mate: null, moves: [] }] })).toBeNull();
  });
  // Danya, "In Pursuit of Zugzwang" (Dvoirys–Svidler): after 50...Qe2 he calls
  // it zugzwang; Stockfish at depth 18 reads -217 on White's move and -230
  // with Black to move — the engine sees no difference, so nothing is said
  // (negative control: the read never outruns its numbers).
  it('no band change, no zugzwang', () => {
    const DVOIRYS = '7k/5Bp1/p5P1/8/1P6/1KP5/4q3/8 w - - 1 51';
    expect(zugzwangOn(DVOIRYS, { lines: [{ evaluation: -217, mate: null, moves: [] }], pass: [{ evaluation: -230, mate: null, moves: [] }] })).toBeNull();
  });
});

describe('zugzwangRead — the move that made it, through the registry', () => {
  it('Kd3 into the trébuchet hands Black the move: the count says Black is in it', () => {
    const before = '8/8/8/3k4/2pP4/3K4/8/8 w - - 0 1';
    const m = zugzwangMade(before, 'Kc3', null);
    expect(m?.read.side).toBe('b');
    const f = readBoard('zugzwangRead', { fenBefore: before, san: 'Kc3', student: 'w', after: null, passAfter: null });
    expect(f?.text).toMatch(/zugzwang/i);
    expect(f?.seat).toBe('student');
    expect(f?.claims[0]).toBe('zugzwang:8/8/8/3k4/2pP4/2K5/8/8 b');
  });
});
