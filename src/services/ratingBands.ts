// ratingBands — THE single rating→tier taxonomy (P7 unification, David 2026-09-08:
// "change any other 'adaptive function' to the new algo ... roll in the orphans").
//
// The coarse teaching taxonomy — beginner / intermediate / advanced at the
// <1000 / 1000–2000 / >2000 boundaries — was hand-copied in three places that all
// agreed by luck (criticalityThresholds, slipDetector.slipWarrantsInterjection,
// hintRegister.openingRegister), each admitting in comments it was mirroring
// another "so there is one taxonomy, not two that drift apart." This makes it
// literally one taxonomy. Each consumer maps the tier to its OWN output (a cp
// threshold, a hint register, an interjection bar) — we unify the BANDING, not
// the outputs.
//
// Unknown rating defaults to 1200 (intermediate), matching the prior behavior of
// every consumer.

export type RatingTier = 'beginner' | 'intermediate' | 'advanced';

/** The coarse teaching tier for a rating. Boundaries: beginner < 1000,
 *  intermediate 1000–2000 (inclusive), advanced > 2000. */
export function coreRatingTier(rating: number | undefined | null): RatingTier {
  const r = rating ?? 1200;
  if (r < 1000) return 'beginner';
  if (r <= 2000) return 'intermediate';
  return 'advanced';
}

// ── The Lichess explorer band ────────────────────────────────────────────────
// Three call sites picked this band three different ways, over TWO different
// bucket lists, all three claiming the same intent ("the amateur band around a
// student rating, as the explorer expects" — the identical comment sat over two
// of them). Measured disagreements before this: 1300 → `1200,1400` vs
// `1400,1600`; 1900 → `1800,2000` vs `1600,1800`; 2400 → a LONE `2200`, because
// amateurPlayCache's list stopped at 2200 and had no bucket to pair with.
//
// A band is not a matter of taste — it decides which humans' games we quote back
// as "what people at your level play". Two students at the same rating were
// being told about two different populations depending on which surface asked.

/** Lichess explorer rating buckets. A bucket labelled 1600 holds games by
 *  players rated 1600–1799, so the label is the FLOOR of the band. 2500 is the
 *  explorer's top bucket. */
/**
 * 🔒 ONE NUMBER FOR AN UNRATED STUDENT — the whole app, every surface.
 *
 * David 2026-09-17, emphatic: "An unrated student is a different person on each
 * tab. NO!" Measured 2026-09-18, he was describing something real: the
 * student's rating fell back to 1200 in 63 places, 1500 in twelve COMPUTERS
 * (criticality thresholds, PV depth, the causal chain, the teaching selector,
 * refuted-alternative, positionFacts, whyBestMove) and 1420 in five more —
 * including a prompt that handed the model the sentence "Student rating: 1420"
 * as though it were a fact about the person.
 *
 * Every rating-scaled decision hangs off whichever number its call site
 * happened to type, so the same unrated student met a different coach on every
 * tab. The point is NOT that 1200 is the best constant — `ratingBands` explains
 * below that CAPACITY and SUPPORT scale in OPPOSITE directions, so no single
 * value is "more teaching" everywhere. The point is that there is one student,
 * so there is one number.
 *
 * It lives HERE because this module is a true leaf (zero imports).
 * `playerRatingService`, which owns the adaptive estimate, pulls in the db and
 * the store — so a leaf fact-computer must never import it just to learn what
 * "unknown" means.
 */
export const DEFAULT_STUDENT_RATING = 1200;

const EXPLORER_BUCKETS = [1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500] as const;

export interface ExplorerBand {
  /** The `ratings=` value the explorer API takes, e.g. `"1400,1600"`. */
  band: string;
  /** Spoken form, e.g. `"around 1400–1600"`. */
  bandLabel: string;
}

/**
 * The two buckets bracketing `rating` — the pool a player at this level
 * actually comes from. Pairs DOWNWARD at the top so the strongest band still
 * has two buckets rather than a lone one. Unknown/non-finite rating falls to
 * the same 1200 cold-start prior `coreRatingTier` uses.
 */
export function explorerBandFor(rating: number | null | undefined): ExplorerBand {
  const r = typeof rating === 'number' && Number.isFinite(rating) ? rating : 1200;
  let i = 0;
  for (let k = 0; k < EXPLORER_BUCKETS.length; k++) {
    if (EXPLORER_BUCKETS[k] <= r) i = k;
  }
  const pair = i + 1 < EXPLORER_BUCKETS.length
    ? [EXPLORER_BUCKETS[i], EXPLORER_BUCKETS[i + 1]]
    : [EXPLORER_BUCKETS[i - 1], EXPLORER_BUCKETS[i]];
  return { band: pair.join(','), bandLabel: `around ${pair[0]}–${pair[1]}` };
}

// ── THE TWO KINDS OF ADAPTIVE DECIDER ────────────────────────────────────────
//
// `docs/plans/2026-09-08-unified-coach.md` §Phase 7 says "unify the adaptive
// deciders". Read literally that is WRONG and would break the app in a way no
// test would catch, because the deciders are not one family — they are two,
// and they run in OPPOSITE directions on purpose:
//
//   CAPACITY — how much CHESS the student can handle. Calculation horizon,
//     puzzle depth, how subtle a mistake is worth teaching. RISES with
//     strength: a 900 cannot use a five-move line; a 2200 wants the subtlety.
//
//   SUPPORT — how much HELP the student gets. Threat warnings, sentences of
//     scaffolding, which hint rung they start on. FALLS with strength: a
//     beginner needs the warning spelled out; a strong player should find it.
//
// Beginner: teach only big mistakes, but warn often, and explain every link.
// Advanced: teach the subtleties, warn rarely, say it in one line.
//
// Two deciders of the SAME kind may be reconciled. Two of DIFFERENT kinds may
// never be — merging them inverts both pedagogies at once, and because each
// decider's own tests only pin its own numbers, nothing downstream goes red.
// That is precisely how this would be shipped by a session following the plan.
//
// Boundaries are deliberately NOT unified. Where "how far can you calculate"
// changes is not where "how subtle a mistake matters" changes; both are honest
// questions about the same student with different answers. Do not flatten them
// onto coreRatingTier's 1000/2000 without evidence that each move is right.

export type DeciderKind = 'capacity' | 'support';

/** Direction the decider's own RETURN VALUE moves as rating rises. Stated
 *  separately from the kind because a capacity decider can express itself as
 *  an inverse (a decider that returns a BAR: more capacity = a lower number).
 *  The gate runs each probe and proves this matches the code, so the two
 *  fields cannot silently disagree.
 *
 *  🔴 `criticalityThresholds` WAS LISTED HERE AND IS REMOVED (B6, 2026-09-22),
 *  not annotated. It was declared a 'capacity' decider that "falls" with
 *  rating — and that declaration was the rating deciding VOLUME through the
 *  back door, which THE FOUNDATION forbids ("it must never decide how much the
 *  coach SAYS"). The bars are band-free now; the student enters the decision
 *  only through their own record. A decider in this registry scales what the
 *  coach can DO for a student (depth, look-ahead, hints), never how much of
 *  the board it is allowed to mention. */
export type DeciderSlope = 'rises' | 'falls';

export interface AdaptiveDecider {
  kind: DeciderKind;
  slope: DeciderSlope;
  /** What question this decider answers, in one line. */
  answers: string;
}

/** Every rating-scaled decider in the coach. A `Record` over the union, so a
 *  NEW decider fails to compile until someone decides which kind it is — the
 *  question this whole section exists to force. */
export type AdaptiveDeciderId =
  | 'pvBandForRating'
  | 'getTacticLookahead'
  | 'alertSensitivityMultiplier'
  | 'causalChainDepth'
  | 'hintStartTier'
  | 'wrongTriesBeforeHint';

export const ADAPTIVE_DECIDERS: Record<AdaptiveDeciderId, AdaptiveDecider> = {
  pvBandForRating: {
    kind: 'capacity', slope: 'rises',
    answers: 'how many player-moves of the engine line a mistake puzzle asks for',
  },
  getTacticLookahead: {
    kind: 'capacity', slope: 'rises',
    answers: 'how many plies ahead the coach scans for a tactic to surface',
  },
  alertSensitivityMultiplier: {
    kind: 'support', slope: 'rises',
    answers: 'how big must a danger be before the coach WARNS about it',
  },
  causalChainDepth: {
    kind: 'support', slope: 'falls',
    answers: 'how many sentences of the cause-effect chain get spoken',
  },
  hintStartTier: {
    kind: 'support', slope: 'falls',
    answers: 'which rung of the hint ladder the first tap lands on',
  },
  wrongTriesBeforeHint: {
    kind: 'capacity', slope: 'rises',
    answers: 'how long the student is left to struggle before help is offered',
  },
};
