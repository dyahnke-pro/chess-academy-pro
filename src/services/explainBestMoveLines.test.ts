// WO-OUTCOME-01 B: with the engine's lines in hand, "your move let them play X,
// winning the Y" is what the ledger settles over the played line — never a
// one-square swap count the line itself does not play.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { explainBestMoveGrounded } from './groundedAnswer';
import { toOtherSeat } from '../utils/seatPronouns';

const c = new Chess();
for (const m of ['e4', 'e5', 'Nf3']) c.move(m);
const FEN = c.fen(); // Black to move; …Qg5 puts the queen where Nf3 hits it.

describe('explainBestMoveGrounded reads the line when it has one', () => {
  it('says the queen falls when the line takes it', () => {
    const out = explainBestMoveGrounded(FEN, 'Qg5', 'b8c6', 'black', null, { afterPlayed: ['f3g5'], afterBest: null }, 'mover');
    expect(out ?? '').toMatch(/left your queen on g5 hanging — the knight on f3 just takes it/);
  });
  it('says nothing about the queen when the line never takes it', () => {
    const out = explainBestMoveGrounded(FEN, 'Qg5', 'b8c6', 'black', null, { afterPlayed: ['d2d4', 'g5g2'], afterBest: null }, 'mover');
    expect(out ?? '').not.toMatch(/winning the queen/);
  });
  it('with no line it reads the board\'s own answer (errorWhy boardReplyUci)', () => {
    const out = explainBestMoveGrounded(FEN, 'Qg5', 'b8c6', 'black', null, null, 'mover');
    expect(out ?? '').toMatch(/left your queen on g5 hanging — the knight on f3 just takes it/);
  });
});

// THE SEAT RIDES ON THE PRODUCER (2026-10-28): said about the other side's
// move, the same reason is flipped once, at the source — Review appended it to
// the opponent's slips in the mover's voice (92 of 99 false claims over 34 of
// David's games: "That left your knight on d4 hanging" about their knight).
describe('explainBestMoveGrounded — the listener', () => {
  it('flips every seat word for the other side, and nothing else', () => {
    const mover = explainBestMoveGrounded(FEN, 'Qg5', 'b8c6', 'black', null, { afterPlayed: ['f3g5'], afterBest: null }, 'mover') ?? '';
    const other = explainBestMoveGrounded(FEN, 'Qg5', 'b8c6', 'black', null, { afterPlayed: ['f3g5'], afterBest: null }, 'other-side') ?? '';
    expect(mover).toMatch(/\byour\b|\bthem\b|\btheir\b/);
    expect(other).toBe(toOtherSeat(mover));
    expect(other).not.toBe(mover);
  });
});
