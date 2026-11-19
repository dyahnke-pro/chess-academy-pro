// THE SHOT THAT EARNS THE FORCING-SCAN HABIT (Danya narration test
// 2026-11-19): read off the engine, never off a standing pin.
import { describe, it, expect } from 'vitest';
import { readHasShot } from './positionReadComposer';

const L = (cp: number, moves: string[], mate: number | null = null) => ({ evaluation: mate != null ? (mate > 0 ? 100000 : -100000) : cp, mate, moves });

describe('readHasShot', () => {
  it('a quiet squeeze is no shot (mysterious GM moves #3: Bf3 +0.71, then +0.60 and +0.56)', () => {
    const fen = '5rk1/pp2qrpp/4b3/3pPp1Q/2pP3P/P1P3P1/1P3RB1/5RK1 w - - 0 25';
    expect(readHasShot(fen, 'w', [L(71, ['g2f3']), L(60, ['g2h3']), L(56, ['g1h2'])], true)).toBe(false);
  });
  it('a check that stands clearly above the rest is (the chess investigator #1: Nf6+ +4.03 over +2.75)', () => {
    const fen = 'r5k1/p2p2pp/b7/1ppNrp2/3pP3/PB1P4/1PPb1PPP/R4RK1 w - - 0 18';
    expect(readHasShot(fen, 'w', [L(403, ['d5f6']), L(275, ['f2f4']), L(264, ['f1d1'])], false)).toBe(true);
  });
  it('one move far above the rest is a shot even when quiet; the opponent to move is never one', () => {
    const fen = '8/8/8/8/8/8/5k2/R6K w - - 0 1';
    expect(readHasShot(fen, 'w', [L(500, ['a1a2']), L(0, ['h1h2'])], false)).toBe(true);
    expect(readHasShot(fen, 'b', [L(500, ['a1a2']), L(0, ['h1h2'])], true)).toBe(false);
  });
  it('their forced mate is not the student\'s shot; one line falls back to the detectors (a puzzle)', () => {
    const fen = '8/8/8/8/8/8/5k2/R6K w - - 0 1';
    expect(readHasShot(fen, 'w', [L(0, ['h1g1'], -3), L(0, ['h1h2'], -2)], true)).toBe(false);
    expect(readHasShot(fen, 'w', [L(400, ['a1a2'])], true)).toBe(true);
    expect(readHasShot(fen, 'w', [L(400, ['a1a2'])], false)).toBe(false);
  });
});
