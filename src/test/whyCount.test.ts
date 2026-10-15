import { describe, it, expect } from 'vitest';
// @ts-expect-error — plain .mjs audit helper, no types.
import { isWhy, planTally } from '../../scripts/audit-lib/why-count.mjs';

const isWhyFn = isWhy as (s: string) => boolean;

/** Real reasons from the 2026-10-14 walks that the counter used to miss. */
const EFFECT_WHYS = [
  'Careful — their pawn on b4 hits your queen on a5, and a guard does not help: the pawn is worth less than your queen.',
  'Their queen going to b2 lifts the pressure: your pawn on h7 is safe now, and this move is yours to spend.',
  'A piece that far from home takes moves to come back.',
  'Your knight to b6 saves the knight from their knight on c3.',
  'Your bishop to e5 saves it from their knight on b5.',
  'The pawn takes b6 away from their knight on d7.',
  'The plan here: take the half-open g-file, where the rook belongs — a rook needs an open file to reach their camp.',
  'You could take on d4 right now, but the threat is stronger than carrying it out.',
  'Nothing has to happen yet — a useful waiting move is enough, and it makes them commit first.',
  'Bishop takes c3, check is a good trade — it removes a defender of their king.',
  'One knight move here answers no — the next-best leaves your bishop on c3 to be taken.',
  'So Bc3 was the right square — it was the move played; the next best, Be3, costs about a point.',
  "They're eyeing knight takes a7, check — your pawn on a7 has no defender.",
  "Watch what they're building — left alone, their idea starts with b-pawn takes c5, and it swings the game by five points or more.",
  "You're now threatening knight to c2, check — it forks the king and rook on a1.",
  'Their a3 costs them b3: no pawn of theirs can ever guard it again.',
  'Here is what you build toward: the g-file — a rook on an open file reaches their camp.',
  'Your plan from here: pushing the passed pawn on the d-file — every push brings it closer to promotion.',
  'That was a critical moment. Only one move kept you on top here, and it was knight takes e2.',
  'You plant an outpost on d5, where no enemy pawn can chase it.',
  'That line still comes out behind, by a little.',
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

describe('turn length is an average over TEACHING turns (David 2026-10-15)', () => {
  it('filler lines never pull the average down', async () => {
    // @ts-expect-error — plain .mjs audit helper, no types.
    const { turnLength } = await import('../../scripts/audit-lib/why-count.mjs');
    const long = Array.from({ length: 100 }, () => 'idea').join(' ') + ' because it attacks your knight on c6.';
    const r = (turnLength as (l: string[]) => { turns: number; avg: number })([long, 'e4 — your move.', 'e5 — your move.', 'Nf3 — your move.']);
    expect(r.turns).toBe(1);
    expect(r.avg).toBeGreaterThan(100);
  });
});

describe('plan teaching tally (2026-10-15)', () => {
  it('a plan stated without its why fails; with the method and the why it passes', () => {
    expect(planTally(['The plan from here is to seize the open c-file. Here\'s how: put a rook on it.']).everyPlanHasWhy).toBe(false);
    expect(planTally(['The plan from here is to seize the open c-file.']).methodAsked).toBe(false);
    const ok = planTally(['How do you find a plan? Ask three things.', 'So: the plan from here is to win their weak pawn on d5. Why this one first? No pawn of theirs can protect it.']);
    expect(ok.everyPlanHasWhy && ok.methodAsked).toBe(true);
  });
});
