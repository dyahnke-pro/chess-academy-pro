/**
 * THE READING PICKS THE BRANCH (WO-CHAT-01 P3a). After the reader decided,
 * the brain's phrase-matched flags could pick a different branch — whichever
 * fired first in the chain.
 */
import { describe, it, expect } from 'vitest';
import { pinGroundingToReading, pinnedFlagFor, LANE_FLAG } from './readingPin';
import { CHAT_KINDS, ALL_CHAT_KINDS } from './chatTurn';

describe('pinGroundingToReading', () => {
  it('only the reading\'s question stays on; board data is untouched', () => {
    const g = { currentFen: 'x', moveHistory: ['e4'], bestMoveQuestion: true, tacticsQuestion: false, planQuestion: true, groundedBoardQuestion: true };
    const p = pinGroundingToReading(g, 'tactics');
    expect(p.tacticsQuestion).toBe(true);
    expect(p.bestMoveQuestion).toBeUndefined();
    expect(p.planQuestion).toBeUndefined();
    expect(p.groundedBoardQuestion).toBeUndefined();
    expect(p.currentFen).toBe('x');
    expect(p.moveHistory).toEqual(['e4']);
  });
  it('a data flag the words did not yield is not invented', () => {
    const p = pinGroundingToReading({ planQuestion: true }, 'opening-identity');
    expect(p.openingIdentityName).toBeUndefined();
    expect(p.planQuestion).toBeUndefined();
  });
  it('a kind with no lane flag is left alone', () => {
    const g = { bestMoveQuestion: true, compareMoves: { a: 1, b: 2 } as never };
    expect(pinGroundingToReading(g, 'compare-moves')).toBe(g);
    expect(pinGroundingToReading(g, 'command')).toBe(g);
    expect(pinGroundingToReading(g, null)).toBe(g);
  });
  it('every kind whose lane is pinned maps to a flag that lane fires on', () => {
    for (const k of ALL_CHAT_KINDS) {
      const lane = CHAT_KINDS[k].lane as string;
      const flag = pinnedFlagFor(k);
      expect(flag).toBe((LANE_FLAG as Record<string, string>)[lane] ?? null);
    }
  });
});
