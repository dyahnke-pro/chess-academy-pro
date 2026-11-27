import { describe, expect, it } from 'vitest';
import { lastSaidOfTurn, whyAnswer } from './whyAnswers';
import type { Proof } from './proof';

// 1.e4 e5 2.Nf3, Black to move.
const FEN = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2';
const AFTER_NC6 = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
const proof = (short: string): Proof => ({ kind: 'line', exact: true, short, full: short });

describe('Why? answers the last thing the coach said', () => {
  it('a turn\'s last proof is what Why says', () => {
    const last = lastSaidOfTurn([{ proof: proof('Nxe5 wins the pawn') }, { proof: { none: 'description' } as never }, { proof: proof('Qh5 hits f7') }]);
    expect(whyAnswer(last, FEN)).toEqual({ kind: 'proof', proof: proof('Qh5 hits f7') });
  });
  it('a later line with no proof replaces the older one: Why has nothing to answer', () => {
    expect(whyAnswer(lastSaidOfTurn([{ proof: { none: 'description' } as never }, {}]), FEN)).toBeNull();
  });
  it('after a hint, Why answers the hint on its own board only', () => {
    const hint = { kind: 'hint' as const, fen: FEN, uci: 'b8c6' };
    expect(whyAnswer(hint, FEN)).toEqual(hint);
    expect(whyAnswer(hint, AFTER_NC6)).toBeNull();
  });
});
