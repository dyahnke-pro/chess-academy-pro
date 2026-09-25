// The escape test that makes a pin a pin. Every case here is a REAL board —
// the first one is the position prod narrated wrongly on 2026-09-17.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { canLeaveLine, pinBites } from './pinGeometry';
import { detectTactics } from './tacticsDetector';

describe('canLeaveLine', () => {
  it('a pawn on its own file cannot leave it — the h7 case prod called a pin', () => {
    // Rh1, black pawn h7, Rh8. The pawn pushes to h6/h5 and stays on the file;
    // g6 is empty so there is nothing to capture either.
    const c = new Chess('6kr/6pp/8/8/8/8/6PP/5K1R w - - 0 1');
    expect(canLeaveLine(c, 'h7', [0, -1])).toBe(false);
  });

  it('…but the same pawn IS pinned once it has a capture off the file', () => {
    const c = new Chess('6kr/7p/6N1/8/8/8/6PP/5K1R w - - 0 1');
    expect(canLeaveLine(c, 'h7', [0, -1])).toBe(true);
  });

  it('a knight always has somewhere off the line — that is why knight pins bite', () => {
    // Bg4 / Nf3 / Qd1 — the Scandinavian pin the coach demoted to "a different one".
    const c = new Chess('rnb1kb1r/ppp1pppp/5n2/q7/3P2b1/2N2N2/PPP2PPP/R1BQKB1R w KQkq - 0 1');
    expect(canLeaveLine(c, 'f3', [-1, -1])).toBe(true);
  });

  it('a piece pinned against its own KING still counts — self-check is not the question', () => {
    // Bb5 pins Nc6 to Ke8 with d7 empty. The knight has no LEGAL move, but the
    // geometry says it could leave, which is exactly what makes it a pin.
    const c = new Chess('r1bqkbnr/ppp2ppp/2n5/1B6/8/8/PPPPPPPP/RNBQK1NR w KQkq - 0 1');
    expect(canLeaveLine(c, 'c6', [1, -1])).toBe(true);
  });

  it('a rook walled in by its own pieces can still leave — blockers are transient', () => {
    // Black rook a8 behind its own knight on b8 and pawn on a7. It has no move
    // this instant, but every move in its pattern along rank 8 leaves the
    // a-file; the knight develops and the pin bites. Occupancy is not the test.
    const c = new Chess('rn4k1/p5pp/8/8/8/8/6PP/R5K1 w - - 0 1');
    expect(canLeaveLine(c, 'a8', [0, 1])).toBe(true);
  });

  it('the Italian pin: Bc5 pins f2 to Kg1 even with the knight parked on f3 (2026-09-19)', () => {
    // e4 e5 Nf3 Nc6 Bc4 Bc5 d3 d6 O-O — f2 cannot move at all right now, and
    // the first version of this test called that "no pin". The push to f3 is
    // in the pawn's pattern and leaves the c5–g1 diagonal.
    const c = new Chess();
    for (const m of ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3', 'd6', 'O-O']) c.move(m);
    expect(c.get('f3')?.type).toBe('n');
    expect(canLeaveLine(c, 'f2', [1, -1])).toBe(true);
  });

  it('a bishop in the corner pinned along the long diagonal cannot leave — the rule still has teeth', () => {
    // Ba1 with the other diagonal running off the board: every move it has is
    // on the a1–h8 line, so nothing behind it is ever exposed.
    const c = new Chess('7k/8/8/8/8/8/8/b4K1Q w - - 0 1');
    expect(canLeaveLine(c, 'a1', [-1, -1])).toBe(false);
  });
});

describe('a pin that wins nothing is not a pin (WO-STANDARD-01 D-2, prod tape 2026-09-22)', () => {
  // Italian shape: Bc4 stares at f7 with the knight still on g8. Prod said
  // "your bishop on c4 pins their pawn on f7 against their knight on g8" —
  // but if f7 moved, Bxg8 would be a bishop for a defended knight. Nothing
  // is threatened, so nothing is frozen.
  const ITALIAN_G8 = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
  // A queen on d5 down the long diagonal at g2 with the rook still on h1 and
  // the king on g1 — "pins your pawn on g2 against your rook on h1". Qxh1 is
  // a queen for a defended rook.
  const QUEEN_D5 = 'rnb1kbnr/ppp1pppp/8/3q4/8/8/PPPP1PPP/RNBQ1RK1 w kq - 0 1';

  it('a pawn "pinned" to a defended piece worth no more than the attacker is silence', () => {
    const pins = detectTactics(ITALIAN_G8).tactics.filter((t) => t.type === 'pin');
    expect(pins.map((p) => p.description).filter((d) => /f7/.test(d))).toEqual([]);
    const pins2 = detectTactics(QUEEN_D5).tactics.filter((t) => t.type === 'pin');
    expect(pins2.map((p) => p.description).filter((d) => /g2/.test(d))).toEqual([]);
  });

  it('the same geometry BITES once the piece behind is undefended', () => {
    // Strip every defender of g8 (king, rook, and the queen looking down the
    // emptied back rank) — now Bxg8 collects a knight for free.
    const c = new Chess(ITALIAN_G8);
    c.remove('h8');
    c.remove('e8');
    c.remove('d8');
    c.put({ type: 'k', color: 'b' }, 'a8');
    expect(pinBites(c, 'c4', 'f7', 'g8')).toBe(true);
    const pins = detectTactics(c.fen()).tactics.filter((t) => t.type === 'pin');
    expect(pins.some((p) => /bishop on c4 pins pawn on f7 against knight on g8/i.test(p.description))).toBe(true);
  });

  it('a piece behind worth more than the attacker bites even when defended (Bg4 vs Nf3/Qd1)', () => {
    const c = new Chess('rnb1kb1r/ppp1pppp/5n2/q7/3P2b1/2N2N2/PPP2PPP/R1BQKB1R w KQkq - 0 1');
    expect(pinBites(c, 'g4', 'f3', 'd1')).toBe(true);
  });

  it('the negative control: without the bite clause the f7 "pin" comes back', () => {
    // The old rule was geometry + value + escape. Assert each of those STILL
    // passes on the Italian board, so the only thing keeping it quiet is the
    // bite — flip `pinBites` to return true and this describe fails.
    const c = new Chess(ITALIAN_G8);
    expect(canLeaveLine(c, 'f7', [1, 1])).toBe(true);
    expect(pinBites(c, 'c4', 'f7', 'g8')).toBe(false);
  });
});

describe('the detector no longer reports the file alignment', () => {
  it('Rh1 / h7 / Rh8 produces no pin', () => {
    const fen = '6kr/6pp/8/8/8/8/6PP/6KR w - - 0 1';
    const pins = detectTactics(fen).tactics.filter((t) => t.type === 'pin');
    expect(pins.map((p) => p.description)).toEqual([]);
  });

  it('a genuine bishop pin is still reported', () => {
    const fen = 'rnb1kb1r/ppp1pppp/5n2/q7/3P2b1/2N2N2/PPP2PPP/R1BQKB1R w KQkq - 0 1';
    const pins = detectTactics(fen).tactics.filter((t) => t.type === 'pin');
    expect(pins.some((p) => /bishop on g4 pins knight on f3 against queen on d1/i.test(p.description))).toBe(true);
  });

  it('reports the Italian pin on f2 with the knight on f3 — the validator board-rescue depends on it', () => {
    const c = new Chess();
    for (const m of ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3', 'd6', 'O-O']) c.move(m);
    const pins = detectTactics(c.fen()).tactics.filter((t) => t.type === 'pin');
    expect(pins.some((p) => /bishop on c5 pins pawn on f2 against king on g1/i.test(p.description))).toBe(true);
  });
});

describe('a front piece that can take the pinner is not pinned (hand walk 2340, move 8)', () => {
  it('no "bishop on c3 pins pawn on b2 against rook on a1" while bxc3 is on', () => {
    const c = new Chess();
    for (const m of 'e4 c5 Nf3 Nc6 c3 e5 d4 cxd4 cxd4 d5 exd5 Qxd5 Nc3 Bb4 Bd2 Bxc3'.split(' ')) c.move(m);
    const pins = detectTactics(c.fen()).tactics.filter((t) => t.type === 'pin');
    expect(pins.some((p) => p.involvedSquares.includes('c3') && p.involvedSquares.includes('b2'))).toBe(false);
  });
});
