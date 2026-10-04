import { describe, it, expect } from 'vitest';
import { betterMoveReason } from './inaccuracyCall';

// Clean-pass review walk 2026-10-04, G3 (lichess mZ1GOTOw) 31.Nc4: "the stronger
// move was a4 — the idea is to unleash a discovered attack". Over a4 g5 h3 f6
// Kg2 fxe5 Bxe5 the bishop only takes back the pawn Black just took; the
// battery it forms on the e-file wins nothing. A tactic is a plan only when the
// line wins with it — counted from before the trade the tactic ply completes.
const FEN = '3r4/p2r1pp1/1p1Nk2p/2p1P3/8/P7/1B5P/4RK2 w - - 2 31';
const LINE = ['a3a4', 'g7g5', 'h2h3', 'f7f6', 'f1g2', 'f6e5', 'b2e5'];

describe('a recapture that forms a battery is not a plan that wins', () => {
  it('a4 is not credited with a discovered attack', () => {
    expect(betterMoveReason(FEN, 'Nc4', 'a4', LINE, 'white', null, false) ?? '').not.toMatch(/discovered attack/);
  });
});
