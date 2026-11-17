import { describe, it, expect } from 'vitest';
import { deriveNextPlans } from './nextPlans';
import { readConversion } from './conversionMethod';
import { outsidePasserDecoy } from './endgamePawnReads';

// Naroditsky, speedrun kYbh2NTFsS8 after 37.Kh3: a pure pawn ending, Black's
// h-pawn passed, White's king already inside its square, the a-pawns on the
// far wing. He: "leave the h-pawn and walk to the queenside" — the engine
// agrees (…Kf5–e5–d5 wins; marching the h-pawn draws). Review said "get your
// passed pawn on h7 promoting … escort it with your king".
const FEN = '8/7p/p7/P5k1/8/7K/8/8 b - - 1 37';

describe('the outside passer in a pawn ending is a decoy, in every plan', () => {
  it('the decoy computer reads it', () => {
    expect(outsidePasserDecoy(FEN, 'b')?.passer).toBe('h7');
  });
  it('the next-move plan never says to escort or push it', () => {
    const plans = deriveNextPlans(FEN, 'b', { namesStudentMoves: true }).join(' ');
    expect(plans).toMatch(/decoy/);
    expect(plans).toMatch(/queenside/);
    expect(plans).not.toMatch(/escort|promoting|one safe square at a time/);
  });
  it('the conversion read says decoy, not escort', () => {
    const r = readConversion(FEN, 'b');
    if (r?.step === 'escort-passer') {
      expect(r.text).toMatch(/decoy/);
      expect(r.text).not.toMatch(/escorting/);
    }
  });
});
