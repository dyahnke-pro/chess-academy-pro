/**
 * reachRating — the ONE adaptive-difficulty controller for the whole app.
 *
 * David's vision (docs/plans/2026-09-14-adaptive-reach-ladder.md, "go big or
 * go home"): every Elo/algo training surface — Tactics, Train My Mistakes,
 * Teach Me Tactics, Review questions, Master Level — rides ONE persisted
 * "reach rating" that:
 *   - pushes the student just PAST their level (seed = puzzleRating + 200),
 *   - is FELT as a challenge (streak ramp + boss spikes + a coach step-up cue),
 *   - REMEMBERS where they climbed to (persisted in profile.preferences, never
 *     session-reset),
 *   - floats freely UP and DOWN to their true tactical level (NO band cage —
 *     a weak solver adapts down to where they belong; floor only at the pool
 *     minimum), equilibrating at ~80% success (the learning zone, not 50%).
 *
 * This module is PURE math + events (state in → state out). It touches no
 * Dexie, no store, no clock — so it is trivially testable and the same code
 * runs on every surface. Persistence is the caller's one-liner (mirror the
 * puzzleRating pattern: db.profiles.update + setActiveProfile), reading/writing
 * `preferences.reachState` (or `masterReachState`).
 *
 * G0: nothing here decides chess content. It decides the TARGET DIFFICULTY and
 * emits COMPUTED cue events; the coach only voices them, the pool only serves a
 * puzzle near the target.
 */

// ─── Tunable constants (one place — dial after feeling it) ──────────────────

/** First-time seed: base puzzleRating + this, so the very first ladder puzzle
 *  already sits just past the player's comfort level. */
export const STRETCH_SEED = 200;

/** Equilibrium success rate — the learning zone. NOT 50%: at 80% each puzzle
 *  still sits at the top of the player's ability (a fight, not a freebie) but
 *  most reps succeed, which is where people actually improve fastest
 *  ("desirable difficulty" / the 85% rule). */
export const TARGET_SUCCESS = 0.8;

/** Base up-step on a correct solve. The down-step is derived from TARGET so the
 *  ladder provably equilibrates at TARGET_SUCCESS: at steady state
 *  p·UP = (1−p)·DOWN ⇒ DOWN = UP · p/(1−p). At p=0.8 that's UP×4. */
export const BASE_UP = 12;
export const BASE_DOWN = Math.round(BASE_UP * (TARGET_SUCCESS / (1 - TARGET_SUCCESS))); // 48

/** Streak ramp — the FELT climb. On a correct answer that reaches these streak
 *  lengths, the up-step is multiplied so the rating (and the puzzles) toughen
 *  visibly. Transient: any miss resets the streak, so the long-run equilibrium
 *  stays near TARGET. Highest matching threshold wins. */
export const STREAK_RAMP: ReadonlyArray<{ at: number; mult: number }> = [
  { at: 5, mult: 3 },
  { at: 3, mult: 2 },
];

/** Boss spike — a single puzzle WELL above reach, cued as a challenge. Fires on
 *  a cadence (every SPIKE_CADENCE solves) and on a hot streak. Missing a spike
 *  carries a REDUCED penalty so a boss never tanks the ladder or demoralizes. */
export const SPIKE = 350;
export const SPIKE_CADENCE = 8;
export const HOT_STREAK_SPIKE = 5;
export const SPIKE_MISS_MULT = 0.25;

/** Tier band width — for the "you leveled up" milestone cue. Crossing UP into a
 *  never-before-reached band fires a LOUD cue once; re-climbing a band you've
 *  seen is quiet. Crossing DOWN a band fires a GENTLE settle cue. */
export const TIER_BAND = 150;

/** Ladder bounds. Floor = pool minimum (NOT the player's own rating — a weak
 *  solver must be able to adapt down to where they belong). Ceiling = pool max
 *  (Master band top). */
export const FLOOR = 400;
export const CEILING = 3000;

/** Master Level ladder floor (its own separate ReachState). */
export const MASTER_FLOOR = 2400;
export const MASTER_CEILING = 3200;

// ─── State + events ─────────────────────────────────────────────────────────

/** Persisted ladder state (in profile.preferences; non-indexed, no schema
 *  bump). One per ladder — the general tactics ladder and the Master ladder
 *  each hold their own. */
export interface ReachState {
  /** Current reach rating — the target difficulty the pool selects around. */
  rating: number;
  /** Consecutive-correct streak. Persists across sessions (David: "streak
   *  MUST PERSIST"). Reset to 0 on any miss. */
  streak: number;
  /** Total solves on this ladder (lifetime) — drives boss-spike cadence. */
  solved: number;
  /** Solves since the last boss spike — reset to 0 when a spike is served. */
  sinceSpike: number;
  /** Highest tier (floor(rating/TIER_BAND)) ever reached — so a level-up cue
   *  fires only on genuinely NEW ground, never re-climbing. */
  peakTier: number;
  /** Whether the NEXT served puzzle is a boss spike (decided after each
   *  result; consumed by nextTarget). */
  spikePending: boolean;
}

/** A computed cue the caller may voice/visualize. The coach only phrases these
 *  (G0). Up cues are celebratory; the settle cue is gentle. */
export type ReachEvent =
  | { kind: 'tier-up'; tier: number; rating: number }
  | { kind: 'streak'; streak: number }
  | { kind: 'spike-cleared'; rating: number }
  | { kind: 'settle'; tier: number };

export interface ReachResult {
  state: ReachState;
  /** Signed rating change actually applied this step. */
  delta: number;
  events: ReachEvent[];
}

// ─── API ────────────────────────────────────────────────────────────────────

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));

/**
 * Seed a fresh ladder from the player's base puzzleRating. First-time ONLY —
 * thereafter the caller resumes the persisted state (never re-inflates +200
 * each session). `opts.master` seeds the elite ladder in its own band.
 */
export function initReachState(
  basePuzzleRating: number,
  opts: { master?: boolean } = {},
): ReachState {
  const floor = opts.master ? MASTER_FLOOR : FLOOR;
  const ceiling = opts.master ? MASTER_CEILING : CEILING;
  const seed = clamp(Math.round(basePuzzleRating) + STRETCH_SEED, floor, ceiling);
  return {
    rating: seed,
    streak: 0,
    solved: 0,
    sinceSpike: 0,
    peakTier: Math.floor(seed / TIER_BAND),
    spikePending: false,
  };
}

/**
 * Resolve the ladder state to use: the persisted one if present, otherwise a
 * fresh seed. Pure — the caller persists the result of recordReachResult.
 */
export function resolveReachState(
  persisted: ReachState | undefined,
  basePuzzleRating: number,
  opts: { master?: boolean } = {},
): ReachState {
  if (persisted && Number.isFinite(persisted.rating)) return persisted;
  return initReachState(basePuzzleRating, opts);
}

/**
 * The target rating the pool should select a puzzle around, and whether this
 * one is a boss spike (so the surface can cue it + the caller passes wasSpike
 * back into recordReachResult). Does NOT mutate state — spikePending is
 * consumed at record time.
 */
export function nextTarget(
  state: ReachState,
  opts: { master?: boolean } = {},
): { target: number; isSpike: boolean } {
  const floor = opts.master ? MASTER_FLOOR : FLOOR;
  const ceiling = opts.master ? MASTER_CEILING : CEILING;
  if (state.spikePending) {
    return { target: clamp(state.rating + SPIKE, floor, ceiling), isSpike: true };
  }
  return { target: clamp(state.rating, floor, ceiling), isSpike: false };
}

function rampMult(streakAfter: number): number {
  for (const { at, mult } of STREAK_RAMP) if (streakAfter >= at) return mult;
  return 1;
}

/**
 * Apply one result. Returns the new state, the signed delta, and any cue
 * events. `opts.wasSpike` = the puzzle just answered was served as a boss spike
 * (from nextTarget().isSpike) → reduced miss penalty + a spike-cleared cue on a
 * correct answer.
 */
export function recordReachResult(
  state: ReachState,
  correct: boolean,
  opts: { wasSpike?: boolean; master?: boolean } = {},
): ReachResult {
  const floor = opts.master ? MASTER_FLOOR : FLOOR;
  const ceiling = opts.master ? MASTER_CEILING : CEILING;
  const events: ReachEvent[] = [];

  const prevTier = Math.floor(state.rating / TIER_BAND);
  let delta: number;
  let streak: number;

  if (correct) {
    streak = state.streak + 1;
    delta = BASE_UP * rampMult(streak);
  } else {
    streak = 0;
    delta = -BASE_DOWN * (opts.wasSpike ? SPIKE_MISS_MULT : 1);
  }

  const rating = clamp(state.rating + delta, floor, ceiling);
  const solved = state.solved + (correct ? 1 : 0);
  // A spike is "consumed" whenever one was pending (served), regardless of
  // outcome — reset the cadence counter and clear the flag.
  const spikeServed = state.spikePending;
  const sinceSpike = spikeServed ? 0 : state.sinceSpike + (correct ? 1 : 0);

  // Decide whether the NEXT puzzle is a boss spike: cadence reached, or a hot
  // streak just landed. Never stack a spike immediately after one.
  const spikePending =
    !spikeServed &&
    correct &&
    (sinceSpike >= SPIKE_CADENCE || streak === HOT_STREAK_SPIKE);

  // Cue events (computed — the coach only voices them). Order: milestone first.
  const newTier = Math.floor(rating / TIER_BAND);
  let peakTier = state.peakTier;
  if (correct && newTier > state.peakTier) {
    peakTier = newTier;
    events.push({ kind: 'tier-up', tier: newTier, rating });
  } else if (!correct && newTier < prevTier) {
    // Genuine downward band cross — gentle settle, never "you're getting worse".
    events.push({ kind: 'settle', tier: newTier });
  }

  if (opts.wasSpike && correct) events.push({ kind: 'spike-cleared', rating });

  // Streak milestone cue (celebratory) at the ramp thresholds — deduped to the
  // exact step the threshold is crossed so it fires once, not every solve after.
  if (correct && STREAK_RAMP.some((r) => r.at === streak)) {
    events.push({ kind: 'streak', streak });
  }

  return {
    state: { rating, streak, solved, sinceSpike, peakTier, spikePending },
    delta,
    events,
  };
}

/** The user-facing tier number (1-based) for a rating — for a "Level N" badge. */
export function reachTier(rating: number): number {
  return Math.max(1, Math.floor(rating / TIER_BAND));
}

/**
 * How many moves of a review multi-move sequence the student must find UNAIDED
 * before the tail auto-plays. Scales with the reach ladder and adds a +1 stretch
 * so the ask always sits a little BEYOND their comfort level (David 2026-09-14:
 * "a couple hundred elo above the player's current level… push them to find
 * things beyond their skill level"). The caller caps this at the line's real
 * length — a short/forcing line can't ask more moves than it has. A game
 * position has no Elo, so the line's difficulty is handled by that cap: a longer
 * line naturally exposes more of the ask as reach climbs. */
export function reachAskDepth(reachRating: number): number {
  const base = Math.max(1, Math.floor((reachRating - 800) / 400)); // 1200→1, 1600→2, 2000→3, 2400→4
  return base + 1; // the stretch — push just past their level
}
