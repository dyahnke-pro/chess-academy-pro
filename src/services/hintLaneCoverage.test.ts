// No hint escapes the register.
//
// David 2026-08-09, after the dial was built: "Make sure no hint is part of the
// adaptive" — read as: every hint-shaped lane must ride it. The dial is
// worthless if half the coach's pointers still speak at one volume, and the
// failure is invisible from the outside: a lane that bypasses the register
// sounds completely normal to whoever wrote it, and wrong only to the student
// it was not tuned for.
//
// Two lanes were found bypassing it when this was written — the improving-move
// recommendation and the gem alert, the latter being the LOUDEST hint the coach
// has. Neither was a deliberate exception; both simply predated the dial. That
// is exactly why this is a gate rather than a one-time sweep: the next hint
// someone adds will predate nothing, and will still forget.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const SOURCE = 'src/components/Coach/CoachTeachPage.tsx';

/** Lanes that POINT THE STUDENT AT A MOVE without naming it. Each maps to the
 *  marker that proves it went through the register. */
const HINT_LANES: Array<{ name: string; near: string; proof: RegExp }> = [
  {
    name: 'priority-first',
    near: 'priority_first_offered',
    proof: /packageForRegister\(pf\.hint, discussion\.hintDial\.register\)/,
  },
  {
    name: 'rejected-tempting',
    near: 'rejected_tempting_offered',
    proof: /packageForRegister\(rt\.hint, discussion\.hintDial\.register\)/,
  },
];

describe('every hint lane rides the register', () => {
  const src = readFileSync(SOURCE, 'utf8');

  for (const lane of HINT_LANES) {
    it(`${lane.name} is adaptive`, () => {
      expect(src, `${lane.name} is not in ${SOURCE} any more — update this gate`).toContain(lane.near);
      expect(
        lane.proof.test(src),
        `${lane.name} speaks at one volume for every student — route it through the hint register`,
      ).toBe(true);
    });
  }

  it('the frequency dial reaches the beats that carry cooldowns', () => {
    // The other half of David's rule: "less often" for a strong player. The
    // hand-tuned gap is scaled, so only the cadence breathes.
    expect(src).toMatch(/scaleGap\(PRIORITY_FIRST_MIN_PLY_GAP, discussion\.hintDial\.register\)/);
  });

  it('the dial is fed on every evaluated move, not only interrupting ones', () => {
    // A dial fed only by moves that raised a card would be reading a filtered
    // sample of the student's worst play and would sit at "obvious" forever.
    // `hintDialTally.test.ts` proves the behaviour; this pins the call site so
    // the recording cannot drift back behind a gate.
    const hook = readFileSync('src/hooks/useDiscussionPractice.ts', 'utf8');
    const evaluate = hook.slice(
      hook.indexOf('const evaluatePlayerMove'),
      hook.indexOf('const raiseSlipPrompt'),
    );
    expect(evaluate, 'the tally is no longer recorded inside evaluatePlayerMove').toContain('recordAttempt');
    // …and BEFORE the rating-adaptive interruption bar, which decides what to
    // SHOW and must never decide what is remembered.
    expect(
      evaluate.indexOf('recordAttempt'),
      'the tally moved behind slipWarrantsInterjection — the rating gate is now deciding what the coach learns',
    ).toBeLessThan(evaluate.indexOf('slipWarrantsInterjection'));
  });
});

// (The tiered GEM ALERT package lived in the late read's facts list, which no
// voice ever read; it was removed 2026-09-29 under G8.5. The gem Learn SPEAKS is
// the instant pass's `gem.callout` — authored narration that names the chance
// and withholds the move — see `punishGems.test.ts`.)

describe('the gem Learn speaks never names its answer', () => {
  it('every live callout on a real surfaceable gem withholds the move and every square', async () => {
    const { getAllPunishGems, isSurfaceableGem } = await import('../data/lessons/punishGems');
    const { findLivePunishment } = await import('./gemCrushLines');
    const gems = getAllPunishGems().filter(isSurfaceableGem).slice(0, 40);
    let checked = 0;
    for (const g of gems) {
      const live = findLivePunishment(null, [...g.lineMoves.split(/\s+/).filter(Boolean), g.inaccuracy]);
      if (!live) continue;
      checked += 1;
      expect(live.callout, `${g.lineMoves} ${g.inaccuracy} names its punish`).not.toContain(live.punish.replace(/[+#]$/, ''));
      expect(live.callout, `${g.lineMoves} ${g.inaccuracy} names a square`).not.toMatch(/\b[a-h][1-8]\b/);
    }
    expect(checked, 'no real gem produced a live callout — this test checked nothing').toBeGreaterThan(5);
  });
});
