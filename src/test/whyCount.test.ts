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
  'The plan here: take the half-open g-file, where the rook belongs — a rook needs an open file to reach their camp.',
  'You could take on d4 right now, but the threat is stronger than carrying it out.',
  'Nothing has to happen yet — a useful waiting move is enough, and it makes them commit first.',
  'Bishop takes c3, check is a good trade — it removes a defender of their king.',
  'One knight move here answers no — the next-best leaves your bishop on c3 to be taken.',
  'So Bc3 was the right square — it was the move played; the next best, Be3, costs about a point.',
  "They're eyeing knight takes a7, check — your pawn on a7 has no defender.",
  'Your pawn reached f5 first — their f5 can never come now, so f5 is yours.',
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
