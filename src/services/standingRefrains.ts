/**
 * standingRefrains — a STANDING FACT is taught once and REFERRED TO after
 * (David 2026-09-16: "Once a plan is announced we can use common language to
 * readdress it. 'Don't forget about the isolated pawn', 'don't forget about
 * their plan to pressure the open file.'").
 *
 * The defect this fixes, measured on his own Alapin review (33 narrated plies):
 * `their pawn on d4 is isolated — a target you can pile on` spoke ELEVEN times,
 * seven of them on consecutive plies about the same pawn. The verdict WORD
 * repeating is correct — that is the state of the game. Re-teaching the reason
 * at full length, as if new, is not.
 *
 * 🔒 REFER, DO NOT SUPPRESS. The first instinct was to speak it once and go
 * quiet; David's answer is better and this module implements his. Reinforcement
 * IS teaching — a coach keeps the weakness in front of you all game. What must
 * not repeat is the EXPLANATION ("— a target you can pile on"). So a standing
 * fact has three states, not two:
 *
 *     UNSAID       →  FULL   "their pawn on d6 is isolated — a target you can pile on"
 *     NEW INSTANCE →  FACT   "their pawn on d4 is isolated"
 *     SAME AGAIN   →  REFRAIN "still their isolated d4-pawn"
 *
 * THREE states, because there are TWO things being said and they go stale at
 * different rates. The SQUARE is news every time it changes — that Alapin had
 * five different isolated pawns (d6, d4, d5, a3, b4) and each one is a real new
 * weakness the student should hear about. The LESSON attached to it ("— a target
 * you can pile on") is the same sentence about all five, and after the first it
 * is a lecture the student has already had. So the instance key is the square
 * and the lesson key is the fact KIND, and they are consumed separately.
 *
 * This also keeps the rule that a verdict must carry its reason (2026-09-16: "a
 * verdict without its reason is the eval bar read aloud"). The reason is still
 * there; it is just no longer a lecture.
 *
 * 🔒 ONE ORDERED PASS, ONE LEDGER — this is why it is a post-pass and not a
 * fourth composer. Two composers produce these clauses: the per-ply `[verdict]`
 * facet (`reviewFullData`) and the projection terminal (`verdictAtEnd` in
 * `coachFeatureService`), and the projections are composed LATER, over the
 * whole game at once. A ledger inside either one would let a projection at ply
 * 12 render a callback to a full form that is not spoken until ply 20 — a
 * reference with no antecedent, which is worse than the repetition. Walking the
 * finished segments in ply order makes "the first mention in reading order is
 * the full one" true by construction.
 *
 * G0: every string here is a rephrasing of a fact CODE already computed and
 * already decided to speak. Nothing is added, nothing is judged, no board is
 * read. The decision of WHETHER the fact speaks stays with `coachDecider`.
 */

/** A standing fact the narration can teach once and then refer back to. */
export interface StandingRefrain {
  /** Stable id — the LESSON key, and half of the instance key. */
  id: string;
  /**
   * Matches the FULL form exactly as the composer writes it. Capture groups
   * feed the keys and both shortened renderings.
   *
   * These patterns are anchored to templates this app authors itself
   * (`reviewPositionalAssessment.ts`), never to prose a model wrote — and
   * `standingRefrains.test.ts` walks every prefix of a real game through the
   * real composer and asserts every reason it can produce is still matched, so
   * an edit to a template cannot quietly turn the refrain off.
   */
  re: RegExp;
  /** The INSTANCE key — the square, file or count this occurrence is about. */
  keyOf: (m: RegExpMatchArray) => string;
  /**
   * The clause with the LESSON removed: a new instance of a fact whose lesson
   * has already been taught. Must still read as a clause, because these are
   * joined with '; ' after a colon. Omit when the full form carries no lesson
   * (the bishop pair is the whole fact; there is no tail to drop).
   */
  fact?: (m: RegExpMatchArray) => string;
  /** The callback spoken when THIS instance has already been stated. */
  refrain: (m: RegExpMatchArray) => string;
}

export const STANDING_REFRAINS: StandingRefrain[] = [
  {
    id: 'enemy-isolated-pawn',
    re: /their pawn on ([a-h][1-8]) is isolated — a target you can pile on/g,
    keyOf: (m) => m[1],
    fact: (m) => `their pawn on ${m[1]} is isolated`,
    refrain: (m) => `still their isolated ${m[1]}-pawn`,
  },
  {
    id: 'enemy-doubled-pawns',
    re: /their doubled pawns on the ([a-h])-file are a structural weakness to work against/g,
    keyOf: (m) => m[1],
    fact: (m) => `their pawns on the ${m[1]}-file are doubled`,
    refrain: (m) => `still their doubled ${m[1]}-pawns`,
  },
  {
    id: 'my-outpost',
    re: /your (knight|bishop) sits on a protected outpost on ([a-h][1-8]) where no enemy pawn attacks the square/g,
    keyOf: (m) => `${m[1]}${m[2]}`,
    fact: (m) => `your ${m[1]} sits on a protected outpost on ${m[2]}`,
    refrain: (m) => `your ${m[1]} still holds the ${m[2]} outpost`,
  },
  {
    id: 'my-open-file',
    // No lesson tail — the clause IS the fact, so there is nothing to strip on
    // a new file and only the callback applies.
    re: /you own the open ([a-h])-file/g,
    keyOf: (m) => m[1],
    refrain: (m) => `you still own the ${m[1]}-file`,
  },
  {
    id: 'my-passed-pawn',
    re: /your passed pawn on ([a-h][1-8]) is a long-term trump/g,
    keyOf: (m) => m[1],
    fact: (m) => `you have a passed pawn on ${m[1]}`,
    refrain: (m) => `your ${m[1]}-passer is still the trump`,
  },
  {
    id: 'my-bishop-pair',
    // No square: the pair is the fact. One key for the whole game — and it is
    // correctly re-taught in a LATER game, because the ledger is per review.
    re: /you have the bishop pair/g,
    keyOf: () => 'pair',
    refrain: () => 'you still have the bishop pair',
  },
  // ── THE MIRROR — the same facts read from the OPPONENT's side (D-16). The
  // verdict's reasons come from whichever side the eval favours, so every
  // student-seat refrain above has a sibling here; a fact the composer can
  // phrase both ways needs a refrain both ways or one of them repeats.
  {
    id: 'my-isolated-pawn',
    re: /your pawn on ([a-h][1-8]) is isolated — a target they can pile on/g,
    keyOf: (m) => m[1],
    fact: (m) => `your pawn on ${m[1]} is isolated`,
    refrain: (m) => `still your isolated ${m[1]}-pawn`,
  },
  {
    id: 'my-doubled-pawns',
    re: /your doubled pawns on the ([a-h])-file are a structural weakness they can work against/g,
    keyOf: (m) => m[1],
    fact: (m) => `your pawns on the ${m[1]}-file are doubled`,
    refrain: (m) => `still your doubled ${m[1]}-pawns`,
  },
  {
    id: 'their-outpost',
    re: /their (knight|bishop) sits on a protected outpost on ([a-h][1-8]) where no pawn of yours attacks the square/g,
    keyOf: (m) => `${m[1]}${m[2]}`,
    fact: (m) => `their ${m[1]} sits on a protected outpost on ${m[2]}`,
    refrain: (m) => `their ${m[1]} still holds the ${m[2]} outpost`,
  },
  {
    id: 'their-open-file',
    re: /they own the open ([a-h])-file/g,
    keyOf: (m) => m[1],
    refrain: (m) => `they still own the ${m[1]}-file`,
  },
  {
    id: 'their-passed-pawn',
    re: /their passed pawn on ([a-h][1-8]) is a long-term trump/g,
    keyOf: (m) => m[1],
    fact: (m) => `they have a passed pawn on ${m[1]}`,
    refrain: (m) => `their ${m[1]}-passer is still the trump`,
  },
  {
    id: 'their-bishop-pair',
    re: /they have the bishop pair/g,
    keyOf: () => 'pair',
    refrain: () => 'they still have the bishop pair',
  },
  {
    id: 'their-development-lead',
    re: /they're (two pieces|three pieces|\d+ pieces) further developed/g,
    keyOf: (m) => m[1],
    refrain: (m) => `still ${m[1]} further developed for them`,
  },
  {
    id: 'my-development-lead',
    // The COUNT is the instance: going from two pieces ahead to four is a
    // different fact and earns its own statement. "Still two pieces further
    // developed" is the callback only while the number holds.
    re: /you're (two pieces|three pieces|\d+ pieces) further developed/g,
    keyOf: (m) => m[1],
    refrain: (m) => `still ${m[1]} further developed`,
  },
  // MATERIAL and KING SAFETY (WO-TEACH-02 S4) — the count is the instance, the
  // same as the development lead: up a pawn and up a piece are different facts.
  {
    id: 'my-material',
    re: /you're up (a pawn|a piece|\d+ points of material)/g,
    keyOf: (m) => m[1],
    refrain: (m) => `still up ${m[1]}`,
  },
  {
    id: 'their-material',
    re: /they're up (a pawn|a piece|\d+ points of material)/g,
    keyOf: (m) => m[1],
    refrain: (m) => `they're still up ${m[1]}`,
  },
  {
    id: 'my-king-safer',
    re: /your king is tucked away and theirs is still in the centre/g,
    keyOf: () => 'king',
    refrain: () => 'their king is still in the centre',
  },
  {
    id: 'their-king-safer',
    re: /their king is tucked away and yours is still in the centre/g,
    keyOf: () => 'king',
    refrain: () => 'your king is still in the centre',
  },
];

/** The ledger — which (refrain, key) pairs have had their full form spoken. */
export type RefrainLedger = Set<string>;

export const emptyRefrainLedger = (): RefrainLedger => new Set<string>();

/**
 * Rewrite one piece of narration, folding any standing fact whose full form was
 * already spoken down to its callback. Mutates `ledger`.
 *
 * Call this on the finished text IN PLY ORDER. Out of order, the antecedent
 * rule breaks (see the module note).
 */
export function foldStandingRefrains(text: string, ledger: RefrainLedger): string {
  if (!text) return text;
  let out = text;
  for (const r of STANDING_REFRAINS) {
    // A fresh RegExp per call: the entries are module-level and `g`-flagged, so
    // sharing them would carry `lastIndex` between texts and skip matches at
    // random. (Found the boring way — it drops roughly every other occurrence.)
    const re = new RegExp(r.re.source, 'g');
    out = out.replace(re, (...args: unknown[]) => {
      const m = args.slice(0, -2) as unknown as RegExpMatchArray;
      const lessonKey = `lesson:${r.id}`;
      const instanceKey = `${r.id}:${r.keyOf(m)}`;
      if (ledger.has(instanceKey)) return r.refrain(m);
      ledger.add(instanceKey);
      if (ledger.has(lessonKey)) return r.fact ? r.fact(m) : m[0];
      ledger.add(lessonKey);
      return m[0];
    });
  }
  return out;
}
