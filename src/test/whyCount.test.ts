import { describe, it, expect } from 'vitest';
// @ts-expect-error — plain .mjs audit helper, no types.
import { isWhy } from '../../scripts/audit-lib/why-count.mjs';

const isWhyFn = isWhy as (s: string) => boolean;

/** Real reasons from the 2026-10-14 walks that the counter used to miss. */
const EFFECT_WHYS = [
  'Careful — their pawn on b4 hits your queen on a5, and a guard does not help: the pawn is worth less than your queen.',
  'Their queen going to b2 lifts the pressure: your pawn on h7 is safe now, and this move is yours to spend.',
  'A piece that far from home takes moves to come back.',
  'Your knight to b6 saves the knight from their knight on c3.',
  'The pawn takes b6 away from their knight on d7.',
];

/** NEGATIVE CONTROL: descriptions with no reason. If the counter ever counts
 *  one of these, it is rewarding wording, not teaching. */
const DESCRIPTIONS_NOT_WHY = [
  'The pawn now covers b4 in their half.',
  'Your knight on c6 now eyes their pawn on e5 and their pawn on d4.',
  'The bishop rakes toward d3 and e4.',
  'They answer a4.',
  'The line so far is the Sicilian Defense: Alapin Variation.',
  'Your knight on c6 now touches eight squares, up from three on b8.',
  "Here's the stronger line — d5.",
];

describe('the why-counter (David 2026-10-14: consequence wordings count when they name what they act on)', () => {
  it.each(EFFECT_WHYS)('counts %s', (s) => expect(isWhyFn(s)).toBe(true));
  it.each(DESCRIPTIONS_NOT_WHY)('does not count %s', (s) => expect(isWhyFn(s)).toBe(false));
});
