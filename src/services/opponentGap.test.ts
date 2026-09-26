import { describe, it, expect } from 'vitest';
import { detectOpponentGap, opponentGapClause } from './opponentGap';
import type { OpponentIntent } from './opponentIntent';

// Student is White. Opponent (Black) ideal line kept it near-equal (+20 white POV);
// their actual move left White clearly better.
const intent: OpponentIntent = { plans: [{ opponentMove: 'a6', studentReply: 'Ba4', evalCp: 20 , squares: [] }] };

describe('detectOpponentGap — the take-advantage-of-the-gap', () => {
  it('flags a real gift: the opponent under-played and White is now clearly better', () => {
    const gap = detectOpponentGap({
      opponentIntent: intent,
      opponentPlayedUci: 'h7h6',
      analysisAfter: { evaluation: 200, bestMove: 'f3e5', isMate: false, mateIn: null }, // +200 white POV, best Nxe5
      studentColor: 'w',
    })!;
    expect(gap).not.toBeNull();
    expect(gap.gainCp).toBe(180); // 200 - 20
    expect(gap.opportunityUci).toBe('f3e5');
    expect(gap.toSquare).toBe('e5');
  });

  it('stays silent when the deviation gave nothing usable (no cry-wolf)', () => {
    // Position barely moved from the ideal — 40cp swing, under the gift bar.
    expect(detectOpponentGap({
      opponentIntent: intent,
      opponentPlayedUci: 'h7h6',
      analysisAfter: { evaluation: 60, bestMove: 'f3e5', isMate: false, mateIn: null },
      studentColor: 'w',
    })).toBeNull();
  });

  it('stays silent in an already-won game (not a teaching moment)', () => {
    const wonIntent: OpponentIntent = { plans: [{ opponentMove: 'a6', studentReply: 'Ba4', evalCp: 700 , squares: [] }] };
    expect(detectOpponentGap({
      opponentIntent: wonIntent,
      opponentPlayedUci: 'h7h6',
      analysisAfter: { evaluation: 900, bestMove: 'f3e5', isMate: false, mateIn: null },
      studentColor: 'w',
    })).toBeNull();
  });

  it('returns null with no opponent intent, or no concrete follow-up', () => {
    expect(detectOpponentGap({ opponentIntent: null, opponentPlayedUci: 'h7h6', analysisAfter: { evaluation: 200, bestMove: 'f3e5', isMate: false, mateIn: null }, studentColor: 'w' })).toBeNull();
    expect(detectOpponentGap({ opponentIntent: intent, opponentPlayedUci: 'h7h6', analysisAfter: { evaluation: 200, bestMove: '', isMate: false, mateIn: null }, studentColor: 'w' })).toBeNull();
  });

  it('works for a Black student (POV flip)', () => {
    // Black student; ideal kept it ~equal (-20 white POV = +20 black POV). White
    // opponent blunders → -220 white POV = +220 black POV. Gift for Black.
    const gap = detectOpponentGap({
      opponentIntent: { plans: [{ opponentMove: 'Re1', studentReply: 'a6', evalCp: -20 , squares: [] }] },
      opponentPlayedUci: 'c1g5',
      analysisAfter: { evaluation: -220, bestMove: 'c6d4', isMate: false, mateIn: null },
      studentColor: 'b',
    })!;
    expect(gap.gainCp).toBe(200); // (+220 black) - (+20 black)
    expect(gap.toSquare).toBe('d4');
  });

  it('names the move WITH its reason, or says nothing (Learn names the move; re-walk 1380, 13.Be3)', () => {
    const gap = detectOpponentGap({ opponentIntent: intent, opponentPlayedUci: 'h7h6', analysisAfter: { evaluation: 200, bestMove: 'f3e5', isMate: false, mateIn: null }, studentColor: 'w' })!;
    expect(opponentGapClause(gap, 'coach-is-opponent', { san: 'Nxe5', why: 'wins the pawn on e5' }))
      .toBe('I let you off there: Nxe5 — it wins the pawn on e5.');
    expect(opponentGapClause(gap, 'coach-is-opponent', null)).toBeNull();
  });

  it('speaks from its seat — "I" when the coach is the opponent, "they" otherwise, never "he" (D-9)', () => {
    const gap = detectOpponentGap({ opponentIntent: intent, opponentPlayedUci: 'h7h6', analysisAfter: { evaluation: 200, bestMove: 'f3e5', isMate: false, mateIn: null }, studentColor: 'w' })!;
    const named = { san: 'Nxe5', why: 'wins the pawn on e5' };
    expect(opponentGapClause(gap, 'coach-is-opponent', named)).toMatch(/^I let you off/);
    expect(opponentGapClause(gap, 'student', named)).toMatch(/^They let you off/);
    for (const seat of ['coach-is-opponent', 'student'] as const) {
      expect(opponentGapClause(gap, seat, named)).not.toMatch(/\b(he|she|his|her)\b/i);
    }
  });
});
