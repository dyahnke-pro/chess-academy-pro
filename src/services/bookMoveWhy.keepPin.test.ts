import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { moveJob, MINE } from './bookMoveWhy';
import { NO_FOLLOW } from './exchangeLedger';

const fenAfter = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };

// Danya's Italian (vc-F7UDk49ESWs): "The bishop to h4, keeping the pin."
describe('a retreat that keeps the pin', () => {
  it('Bh4 against …h6 keeps the pin on the knight on f6', () => {
    const fen = 'r1bq1rk1/p1p2pp1/2pp1n1p/6B1/1b2P3/2NB4/PPP2PPP/R2Q1RK1 w - - 0 10';
    expect(moveJob(fen, 'Bh4', 'w', MINE, null, NO_FOLLOW)?.clause).toBe("it takes your bishop out of reach of their h-pawn, keeping the pin on their knight on f6");
  });
  it('a retreat off the pin line says only the retreat', () => {
    const fen = fenAfter(['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'Bg5', 'h6']);
    expect(moveJob(fen, 'Bf4', 'w', MINE, null, NO_FOLLOW)?.clause ?? '').not.toMatch(/keeping the pin/);
  });
});
