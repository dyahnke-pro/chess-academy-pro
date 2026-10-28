import { describe, it, expect } from 'vitest';
// @ts-expect-error — plain .mjs audit helper, no types.
import { isWhy, planTally, isTeachingLine } from '../../scripts/audit-lib/why-count.mjs';

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
  'One knight move here answers no, whatever they reply. After Bd2, your bishop on c3 can be taken.',
  'So Bc3 was the right square — it was the move played; the next best, Be3, costs about a point.',
  "They're eyeing knight takes a7, check — your pawn on a7 has no defender.",
  "Watch what they're building — left alone, their idea starts with b-pawn takes c5, and it swings the game by five points or more.",
  "You're now threatening knight to c2, check — it forks the king and rook on a1.",
  'Their a3 costs them b3: no pawn of theirs can ever guard it again.',
  'Here is what you build toward: the g-file — a rook on an open file reaches their camp.',
  'Your plan from here: pushing the passed pawn on the d-file — every push brings it closer to promotion.',
  'That was a critical moment. Only one move kept you on top here, and it was knight takes e2.',
  'You plant an outpost on d5, where no pawn of theirs can chase it.',
  'That line still comes out behind, by a little.',
  'Your pawn reached f5 first — their f5 can never come now, so f5 is yours.',
  'Your queen to b3 takes the open b-file.',
  'Here is what you build toward: getting the queen to c3 — c3 is a square no pawn of theirs can cover.',
  'Your bishop to g6 lands on the g6 outpost, a square none of their pawns can attack.',
  'Attacks your pawn on e4, and it needs an answer this move.',
  'Brings their bishop out and clears the way to castle next move.',
  'The difference between b3 and Be3: b3 keeps your pawn on b2 defended, and Be3 leaves it with no guard.',
  'Qxd4 would put the queen on d4, where …Nc6 hits it.',
  'Here, king to g1, not d2 — on d2 their knight checks on e4 and wins time.',
  'Qf3 brings your queen into the attack on their king — 2 of your pieces on it against 1 defender.',
  'Takes their bishop out of reach of your pawn on a6.',
  'Your b5 kicks their bishop off a4, gaining time.',
  'You still have two minor pieces at home — bring them out before anything else; a piece at home cannot join the fight.',
  '…hxg4 rips open the h-file next to their king.',
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
  'Your rook stands on the b-file.',
  'c3 is a dark square in front of their pawns.',
  'Their queen on c8 pins your bishop on c4 against your queen on c3.',
  'Your knight lands on d5, where the bishop was.',
  'Your queen now has 2 of its squares on the d-file.',
  'Their bishop goes to b5.',
  'The h-file is half-open.',
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
  it('a passed pawn or extra material to convert is not owed the method (planThread.methodOwns)', () => {
    expect(planTally(["The plan changes here — now it's to get your passed pawn on e6 promoting. Why this one first? Nothing stops it."]).methodAsked).toBe(true);
    expect(planTally(['The plan from here is to convert your extra material. Why it matters: trades favour you.']).methodAsked).toBe(true);
  });
});

describe('prompts and menus are not teaching lines (prod Learn 2026-10-17)', () => {
  const isTeaching = isTeachingLine as (s: string) => boolean;
  it('a question-led find prompt and the session menu are not measured', () => {
    expect(isTeaching('Are you safe? Find each of your pieces that is in danger.')).toBe(false);
    expect(isTeaching("Your games are mapped. The two patterns hurting you most are ignoring a threat and same piece twice. Want a lesson on one of them — or the full set?")).toBe(false);
  });
  it('the review intro is setup in every form — in, against, or no opening (prod Review 2026-10-20)', () => {
    expect(isTeaching("Here's your game against the Sicilian Defense: Najdorf Variation, Zagreb Variation — you had White and it ended in a win.")).toBe(false);
    expect(isTeaching("Here's your game in the Vienna Game — you had White and it ended in a loss.")).toBe(false);
    expect(isTeaching("Here's your game — you had Black and it ended in a draw.")).toBe(false);
  });
  it('NEGATIVE CONTROL: a question followed by a lesson is still teaching', () => {
    expect(isTeaching('Why this one first? A rook on an open file reaches their camp.')).toBe(true);
  });
});
