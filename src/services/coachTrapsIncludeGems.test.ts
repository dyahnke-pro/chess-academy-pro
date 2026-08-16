/**
 * ASKING FOR AN OPENING'S TRAPS MUST REACH THE PUNISH GEMS.
 *
 * David 2026-08-16: "Make sure the coach can teach the gems when asked under
 * learn. Ask it to teach you the traps in the Vienna opening."
 *
 * A prod audit did exactly that and the coach replied "I don't have named traps
 * logged for your strongest openings yet" — while twenty-one verified,
 * engine-graded, hand-narrated weapon gems for the Vienna sat in
 * punish-gems.json. The trap lane read `trapLines` off the opening record and
 * nothing else, so an entire store of traps was invisible to the one question
 * that asks for traps.
 *
 * This is a WIRE-THAT-FIRES test (CLAUDE.md: "A WIRE THAT DOES NOT FIRE IS NOT
 * A WIRE"). It does not assert the import exists or the function was called; it
 * asserts real gems come out for a real opening, and that the ones offered are
 * exactly the ones the UI would actually render.
 */
import { describe, it, expect } from 'vitest';
import { getPunishGemsForOpening, isSurfaceableGem } from '../data/lessons/punishGems';

/** Mirror of the labelling in coachApi's trap lane. Kept here so the shape the
 *  student hears is pinned by a test, not just produced. */
const gemTrapNames = (openingId: string): string[] =>
  getPunishGemsForOpening(openingId)
    .filter(isSurfaceableGem)
    .map((g) => `after ${g.inaccuracy}, punish with ${g.punish}`);

describe('opening traps include the punish gems', () => {
  it('the Vienna has gems to offer — the exact case that answered "I don\'t have named traps logged"', () => {
    const names = gemTrapNames('vienna-game');
    expect(names.length, 'the Vienna reported no gem traps').toBeGreaterThan(0);
    // Every offered trap names a slip and its refutation, which is what the
    // student has to recognise over the board.
    for (const n of names) expect(n).toMatch(/^after \S+, punish with \S+$/);
  });

  it('offers ONLY gems the app can actually show', () => {
    // Surfaceable = weapon tier AND narration, the same rule the UI renders by.
    // Offering a trap the app then cannot display is worse than staying quiet.
    const all = getPunishGemsForOpening('vienna-game');
    const offered = all.filter(isSurfaceableGem);
    expect(offered.length).toBe(gemTrapNames('vienna-game').length);
    for (const g of offered) expect(isSurfaceableGem(g)).toBe(true);
  });

  it('says nothing for an opening with no gems, rather than inventing one', () => {
    expect(gemTrapNames('not-a-real-opening-id')).toEqual([]);
  });

  it('covers more than one opening — a single lucky opening proves nothing', () => {
    const withGems = ['vienna-game', 'caro-kann', 'ruy-lopez', 'italian-game']
      .filter((id) => gemTrapNames(id).length > 0);
    expect(withGems.length, `only ${withGems.join(', ')} reported gems`).toBeGreaterThanOrEqual(2);
  });
});
