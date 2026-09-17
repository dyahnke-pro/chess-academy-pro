// conceptVocabulary — the ONE canonical bridge between the app's two CONCEPT
// vocabularies (the computer-unification map, 2026-09-17,
// docs/plans/2026-09-17-computer-unification.md §0.2).
//
// The same rot as the tactic enums (see tacticVocabulary), one axis over. The
// app grew two independent concept vocabularies that never got reconciled:
//
//   • POSITIONAL tags — the LIVE vocabulary. `boardConcepts` emits them and
//     `conceptEngine.positionalConcepts` renders them into a `ComputedConcept`
//     for the live board, the puzzle explanation and the Learn narration.
//   • `ConceptBeat['concept']` — the REVIEW vocabulary, 12 keys that
//     `reviewConcepts.detectConcept` emits per ply. Its own comment says the
//     key feeds "the dedup ledger + telemetry", so these strings are
//     PERSISTED — which is exactly why this is a BRIDGE and not a rename
//     (never destructively merge something live devices already store).
//
// They spell SIX of the same ideas differently:
//
//     knight-outpost ↔ outpost              passed-pawn  ↔ passed-pawn-push
//     open-file      ↔ rook-open-file       king-safety  ↔ king-safety-castle
//     bishop-pair    ↔ two-bishops          pawn-storm   ↔ open-lines-at-king
//
// so a student whose live weakness is "knight-outpost" would never match the
// review beat "outpost", and a concept taught in review could be re-taught live
// as if it were new. Same silent-mismatch class the tactic bridge exists to
// kill.
//
// Both maps are `Record`s over the FULL union, so TypeScript FAILS TO COMPILE
// if either vocabulary gains a member without a decision here. The divergence
// cannot silently reopen.

/**
 * The LIVE positional concepts — the nine `boardConcepts` tags that
 * `POSITIONAL_INVARIANT` teaches. (`rook-endgame`, `pawn-endgame` and
 * `king-activity` are also emitted by `boardConcepts` but are owned by the
 * matchup/endgame classifier, not by the positional renderer — they are
 * deliberately NOT concepts here.)
 */
export type PositionalConceptId =
  | 'passed-pawn'
  | 'knight-outpost'
  | 'king-safety'
  | 'pawn-storm'
  | 'piece-activity'
  | 'open-file'
  | 'bishop-pair'
  | 'pawn-structure'
  | 'development';

/** The REVIEW per-ply concept beats. PERSISTED (dedup ledger + telemetry) —
 *  never rename a member, only bridge it. */
export type ReviewConceptId =
  | 'simplify-when-ahead'
  | 'outpost'
  | 'open-lines-at-king'
  | 'two-bishops'
  | 'convert-dont-rush'
  | 'passed-pawn-push'
  | 'rook-seventh'
  | 'rook-open-file'
  | 'king-safety-castle'
  | 'centralize-king'
  | 'space-advantage'
  | 'create-weakness';

/**
 * Live positional tag → review concept key. `null` where the live tag has no
 * honest review counterpart:
 *  - `pawn-structure` — review says `create-weakness`, which is about MAKING a
 *    weakness in the opponent's camp; having one is not the same claim, and
 *    joining them would file the student's own weak pawn under a plan to
 *    create one.
 *  - `development` — review has no development beat; the development axis is
 *    owned by the FUNDAMENTALS vocabulary (`neglected-development`), not here.
 * Never guess a mapping to force a match (G3 / "empty > generic > invented").
 */
export const POSITIONAL_TO_REVIEW: Record<PositionalConceptId, ReviewConceptId | null> = {
  'passed-pawn': 'passed-pawn-push',
  'knight-outpost': 'outpost',
  'king-safety': 'king-safety-castle',
  'pawn-storm': 'open-lines-at-king',
  'piece-activity': 'rook-seventh',
  'open-file': 'rook-open-file',
  'bishop-pair': 'two-bishops',
  'pawn-structure': null,
  development: null,
};

/**
 * Review concept key → live positional tag. `null` where the review beat is
 * about a DECISION the live positional renderer does not model:
 *  - `simplify-when-ahead` / `convert-dont-rush` — conversion technique, owned
 *    by the matchup/endgame classifier.
 *  - `centralize-king` — the live tag is `king-activity`, which this module
 *    deliberately excludes (endgame-owned, above).
 *  - `space-advantage` — no live positional tag computes space today; the
 *    positive fundamental `space` is a different axis (moveFundamentals).
 *  - `create-weakness` — see `pawn-structure` above.
 */
export const REVIEW_TO_POSITIONAL: Record<ReviewConceptId, PositionalConceptId | null> = {
  'passed-pawn-push': 'passed-pawn',
  outpost: 'knight-outpost',
  'king-safety-castle': 'king-safety',
  'open-lines-at-king': 'pawn-storm',
  'rook-seventh': 'piece-activity',
  'rook-open-file': 'open-file',
  'two-bishops': 'bishop-pair',
  'simplify-when-ahead': null,
  'convert-dont-rush': null,
  'centralize-king': null,
  'space-advantage': null,
  'create-weakness': null,
};

/** Do a live tag and a review key name the SAME idea? The join the coach needs
 *  to avoid re-teaching in Learn what review just taught, and to let one
 *  student weakness match evidence from either surface. */
export function sameConcept(live: PositionalConceptId, review: ReviewConceptId): boolean {
  return POSITIONAL_TO_REVIEW[live] === review || REVIEW_TO_POSITIONAL[review] === live;
}

/** Narrow an unknown string to a live positional concept, or null. Used where a
 *  tag arrives from `boardConcepts` as a bare string. */
export function asPositionalConcept(tag: string): PositionalConceptId | null {
  return tag in POSITIONAL_TO_REVIEW ? (tag as PositionalConceptId) : null;
}
