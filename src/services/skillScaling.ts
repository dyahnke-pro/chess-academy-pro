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

/**
 * The hint tier a player STARTS at on their first tap (David 2026-07-03:
 * adaptive hints). Weaker players get the answer immediately (tier 3 — move +
 * arrow); stronger players begin at the WHY (1) or WHICH (2) tier so they do
 * the calculation before the answer appears. Repeat taps always climb toward 3.
 *
 * A player strong at tactics for their rating starts one rung higher (less
 * spoon-feeding); weak-for-rating starts lower. `skill` is optional
 * (SkillRadar.tactics, 0-100); omitted → rating only.
 *
 *   tier 1 = WHY (strategic diagnosis, no piece/square)
 *   tier 2 = WHICH (name the piece, hide the square)
 *   tier 3 = ANSWER (move + green arrow + one-line reason)
 */
export function hintStartTier(rating: number, skill?: number): 1 | 2 | 3 {
  // Blend rating with tactics skill: ±(skill-50)*6 ≈ ±300 rating-equivalent.
  const effective = rating + (typeof skill === 'number' ? (Math.max(0, Math.min(100, skill)) - 50) * 6 : 0);
  if (effective < 1400) return 3; // beginner/improver — answer on the first tap
  if (effective < 1800) return 2; // intermediate — name the piece, hide the square
  return 1;                       // advanced (1800+) — WHY first, full ladder
}
