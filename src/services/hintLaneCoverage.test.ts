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
    // The but-turn now runs on the unified tacticalRead engine (migration
    // 2026-08-21) — its HintPackage is a local `hint`, still routed through the
    // register exactly as before.
    proof: /packageForRegister\(hint, discussion\.hintDial\.register\)/,
  },
  {
    name: 'think-aloud',
    near: 'think_aloud_offered',
    proof: /maxReads: readsForRegister\(discussion\.hintDial\.register\)/,
  },
  {
    name: 'improving-move',
    near: 'improving_move_offered',
    proof: /improve\.facts\.slice\(0, readsForRegister\(discussion\.hintDial\.register\)\)/,
  },
  {
    name: 'gem alert',
    near: 'GEM ALERT',
    proof: /packageForRegister\(\{[\s\S]*?GEM ALERT[\s\S]*?\}, discussion\.hintDial\.register\)/,
  },
  {
    // DELIBERATE EXEMPTION, and the gate has to say so out loud rather than
    // keep failing. The look-ahead plan used to be truncated to 3 parts on
    // 'obvious' and 2 elsewhere; that was removed on purpose — the key square,
    // the board read and both plans are computed from one PV line and are all
    // board-true, so the register was throwing away half of what the position
    // says. The register governs how much help a HINT gives, not how much of
    // the position is described.
    //
    // What must still hold: the parts are graded INDIVIDUALLY (so the spoken
    // text and the board marks cannot disagree), and the register is still
    // reported, so the choice stays visible in the stream. Left red on `main`
    // since that change because this file was not in ship-check; it is now.
    name: 'look-ahead plan',
    near: 'lookahead_plan_offered',
    proof: /register: discussion\.hintDial\.register,/,
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
    // The other half of David's rule: "less often" for a strong player. Both
    // hand-tuned gaps are scaled, so the RATIO between the beats survives and
    // only the cadence breathes.
    expect(src).toMatch(/scaleGap\(THINK_ALOUD_MIN_PLY_GAP, discussion\.hintDial\.register\)/);
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

describe('a hint never becomes an answer, however plain it gets', () => {
  const src = readFileSync(SOURCE, 'utf8');

  it('the gem withholds its square at every register', () => {
    // The gem alert is the loudest pointer the coach has. Plainer means a
    // shorter walk to the answer, never the answer — so the withhold sits
    // OUTSIDE the tiers, which `packageForRegister` appends unconditionally.
    // Anchored on the anchor line rather than the first mention of "GEM ALERT"
    // in the file — the phrase appears in commentary above the code too.
    const at = src.indexOf('anchor: `GEM ALERT');
    expect(at, 'the gem alert no longer ships as a tiered package').toBeGreaterThan(-1);
    expect(src.slice(at, at + 900))
      .toMatch(/withhold: 'Do NOT name or hint the move or its square\.'/);
  });
});
