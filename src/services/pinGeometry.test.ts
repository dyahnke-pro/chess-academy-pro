// The escape test that makes a pin a pin. Every case here is a REAL board —
// the first one is the position prod narrated wrongly on 2026-09-17.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { canLeaveLine } from './pinGeometry';
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
