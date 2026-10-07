import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { legalSeeGainFor, takingTheAttackerAnswers } from './positionReadingService';

function after(sans: string[]): string {
  const c = new Chess();
  for (const s of sans) c.move(s);
  return c.fen();
}

describe('takingTheAttackerAnswers — signed, legal, never floored', () => {
  it('6.h3 in the Scandinavian: Bxh3 gxh3 loses the bishop, so it is NO answer', () => {
    // Both Learn tapes of 2026-10-07: the warning on the g4 bishop never fired
    // because the floored exchange read scored the losing capture as 0.
    const fen = after(['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qa5', 'd4', 'Nf6', 'Nf3', 'Bg4', 'h3']);
    expect(legalSeeGainFor(fen, 'h3', 'b')).toBe(0); // the floored read that hid it
    expect(takingTheAttackerAnswers(fen, 'h3', 'b')).toBe(false);
  });

  it('an even pawn-for-pawn trade answers it', () => {
    // f4 hits the e5 knight; gxf4 exf4 is level.
    expect(takingTheAttackerAnswers('4k3/8/8/4n1p1/5P2/4P3/8/6K1 b - - 0 1', 'f4', 'b')).toBe(true);
  });

  it('a free attacker answers it', () => {
    expect(takingTheAttackerAnswers('4k3/8/8/4n1p1/5P2/8/8/6K1 b - - 0 1', 'f4', 'b')).toBe(true);
  });

  it('a pinned capturer is no answer', () => {
    // d5 hits the e6 knight; the c6 pawn could take it, but Bb5 pins it to the king.
    expect(takingTheAttackerAnswers('4k3/8/2p1n3/1B1P4/8/8/8/6K1 b - - 0 1', 'd5', 'b')).toBe(false);
  });
});
