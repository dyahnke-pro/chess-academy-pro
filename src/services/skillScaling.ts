/**
 * Shared adaptivity primitives (David 2026-07-03: "all training aids adaptive").
 *
 * These keep every training aid scaling to the player's level in ONE consistent
 * way instead of each surface inventing its own constants. The tactic-lookahead
 * ladder (`getTacticLookahead`) is the ply-count analogue; this file is the
 * centipawn-threshold analogue for alert/interjection sensitivity.
 */

/**
 * Multiplier applied to a "how big must this swing be to be worth flagging"
 * centipawn threshold, so training aids are MORE sensitive (lower bar → more,
 * earlier help) for weaker players and QUIETER (higher bar → less noise,
 * expected to find it themselves) for stronger ones.
 *
 * Centered on 1.0 at ~1500 rating and neutral (50) category skill. Range is
 * clamped to [0.5, 1.6]. Multiply a threshold by this:
 *   `const bar = BASELINE_CP * alertSensitivityMultiplier(rating, skill)`
 *
 * @param rating overall or puzzle rating (always available)
 * @param skill  optional 0-100 category skill (e.g. SkillRadar.tactics) that
 *               sharpens the bar for a player strong/weak at THAT category for
 *               their rating. Omitted → rating-only scaling.
 */
export function alertSensitivityMultiplier(rating: number, skill?: number): number {
  const r = Math.max(-1, Math.min(1, (rating - 1500) / 900)); // -1..1 around 1500
  let mult = 1 + r * 0.4; // ~0.6 .. 1.4 by rating alone
  if (typeof skill === 'number') {
    const s = Math.max(0, Math.min(100, skill));
    mult *= 1 + (s - 50) / 250; // ±20% at the skill extremes
  }
  return Math.max(0.5, Math.min(1.6, mult));
}
