import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { moveAspects } from './reviewMoveBriefing';
import { NO_PREV_CAPTURE } from './captureRun';

// A capture the other side can take back on the same square leaves a board
// that lasts one move: its structure is said when the exchange is over (Danya
// bench reading, 2026-10-30 — "cxd4 concedes doubled pawns" with White about
// to take back on d4; "axb5 leaves them an isolated a-pawn" with …axb5 next).
const weaknessesAfter = (line: string, san: string, moverIsStudent: boolean): string[] => {
  const c = new Chess();
  for (const m of line.split(' ').filter(Boolean)) c.move(m);
  const read = moveAspects({ fenBefore: c.fen(), san, prev: NO_PREV_CAPTURE, moverIsStudent });
  return (read?.aspects ?? []).filter((a) => a.idea === 'weakness').map((a) => a.verb);
};

describe('no structure claim in the middle of an exchange', () => {
  it('…cxd4 in the Sicilian concedes nothing: White takes back on d4', () => {
    expect(weaknessesAfter('e4 c5 Nf3 d6 d4', 'cxd4', false)).toEqual([]);
  });

  it('axb5 leaves them no isolated a-pawn: …axb5 takes back (Carlsen–Grischuk 2015)', () => {
    expect(weaknessesAfter('Nf3 c5 e4 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 g3 e5 Nde2 Be7 Bg2 b5 Nd5 Nbd7 Nec3 Bb7 a4 Nxd5 Nxd5 Nf6', 'axb5', true)).toEqual([]);
  });

  it('the exchange over, the structure is said: …dxc6 in the Exchange Ruy doubles the c-pawns', () => {
    expect(weaknessesAfter('e4 e5 Nf3 Nc6 Bb5 a6 Bxc6', 'dxc6', false).join(' ')).toMatch(/doubled pawns on the c-file/);
  });
});
