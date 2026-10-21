import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { hasActiveWeights, scoreCandidates, type ScoringContext } from '../moveScoring';
import { steerScore } from './steer';
import { freeSquares } from '../patterns/free-piece';

/** A board reached by legal moves from the start (chess.js plays every one). */
function boardAfter(sans: readonly string[]): string {
  const c = new Chess();
  for (const s of sans) c.move(s);
  return c.fen();
}

// White (the coach) to move after 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6.
const RUY = boardAfter(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6']);
const ctx = (over: Partial<ScoringContext> = {}): ScoringContext => ({
  fen: RUY, coach: 'w', windowCp: 200, coachEvalCp: 0, pattern: 'free-piece', phase: 'middlegame', bossId: null, targets: [], focus: null, ...over,
});

describe('the steer scorer', () => {
  it('registers itself under "steer"', () => {
    expect(hasActiveWeights({ steer: 1 })).toBe(true);
  });

  it('likes a coach move after which the card pattern is on the board for the student', () => {
    // The a6 pawn attacks the bishop on b5. Moving the bishop away leaves
    // nothing to win.
    expect(steerScore({ uci: 'b5a4', cpLoss: 0 }, ctx())).toBe(0);
    expect(steerScore({ uci: 'b5d3', cpLoss: 30 }, ctx())).toBe(0);
    // Castling leaves it there, unguarded: the pattern itself reads b5 as free.
    const castled = new Chess(RUY);
    castled.move('O-O');
    expect(freeSquares(castled.fen(), 'b', { to: 'g1' })).toEqual(['b5']);
    expect(steerScore({ uci: 'e1g1', cpLoss: 0 }, ctx())).toBe(1);
  });

  it('a capture the student merely takes back is an exchange, not a planted piece', () => {
    // 4.Bxc6 — …dxc6 nets a bishop on the board, but the bishop just took a knight.
    const after = new Chess(RUY);
    after.move('Bxc6');
    expect(freeSquares(after.fen(), 'b', null)).toEqual(['c6']); // the raw SEE says "free"
    expect(steerScore({ uci: 'b5c6', cpLoss: 0 }, ctx())).toBe(0);
  });

  it('says nothing without a pattern, and nothing for an illegal move', () => {
    expect(steerScore({ uci: 'e1g1', cpLoss: 0 }, ctx({ pattern: null }))).toBe(0);
    expect(steerScore({ uci: 'e1e5', cpLoss: 0 }, ctx())).toBe(0);
  });

  it('re-ranks inside the window only: the steered move leads, a costlier one is never offered', () => {
    const ranked = scoreCandidates(
      [{ uci: 'b5a4', cpLoss: 0 }, { uci: 'e1g1', cpLoss: 40 }, { uci: 'b5c6', cpLoss: 10 }, { uci: 'd2d4', cpLoss: 500 }],
      ctx({ windowCp: 100 }),
      { steer: 1 },
    );
    expect(ranked.map((c) => c.uci)).toEqual(['e1g1', 'b5a4', 'b5c6']);
  });
});
