// reviewFacet — THE ONE FACT REVIEW'S FACETS ARE (WO-STORY-MATRIX-01 P1-6d).
//
// Review used to build each fact of a move as a string, `"[tag] words"`, and
// keep what the computer knew about it — its squares, whose it is, what it is
// worth, its proof, its claims, its say-once identity — in seven maps keyed by
// that string, read back by regex on the tag. A rewrite of the words lost the
// key; two facts with one sentence shared their records; and the door's
// adapter rebuilt a `CoachFact` from the pieces. Each fact is now the one
// fact, made by the computer that found it, with everything it knows on it.
//
// Types and the one maker, over coachFact, reviewFacetRank and the
// fundamentals' claim families.
import { LOCAL_THREAD, placeFact, stakesOf, type CoachFact, type ComputerName, type FactSeat } from './coachFact';
import { NO_PROOF, type FactProof } from './proof';
import type { FactStakes } from './factStakes';
import type { SpokenLine } from './voicePackage';
import { TIE_ORDER, type FacetTag, type FactKind } from './reviewFacetRank';
import { FUNDAMENTAL_CLAIM_FAMILY, fundamentalOfLine } from './moveFundamentals';
import { stripThink } from '../utils/thinkPause';

/** A REVIEW FACT — the one fact, with the facet tag it is said under (its
 *  slot in Review's walk: the habit is said last, a structure once, a plan
 *  by its thread) and its say-once identity. `kind` is the claim family the
 *  door weighs it by: the tag, except a rule that restates another fact,
 *  which takes that fact's family so the door sees one claim. */
export type ReviewFacet = CoachFact & {
  kind: FactKind;
  tag: FacetTag;
  /** Its say-once identity in the walk (`hint:…`, `once:…`, `rule:…`,
   *  `motif:…`, `refuted:…`, …), coupled where it was made. */
  identity?: string;
  /** A positional verdict's word and its reasons, each its own claim, coupled
   *  where it was made: the walk says only the reasons not yet said, and
   *  never re-reads them off the words (they were split on a semicolon the
   *  voice should never have said). */
  verdict?: { word: string; reasons: readonly string[] };
  /** Its sentence opens with the move it is about ("Your Rc4 takes the
   *  half-open c-file"): a later fact about the same move may follow it as
   *  "It also …". Set where the sentence is built, never read off its words. */
  headsMove?: boolean;
};

/** What a facet's computer knows besides its words. */
export interface ReviewFacetParts {
  squares?: readonly string[];
  claims?: readonly string[];
  stakes?: FactStakes | null;
  proof?: FactProof | null;
  /** The opponent's: something they do to the student. */
  incoming?: boolean;
  identity?: string;
  /** The claim family the door weighs it by, when it is not the tag. */
  kind?: FactKind;
  /** The line its words say, played on the board where they say it. */
  lines?: readonly SpokenLine[];
}

/** Review's facts name no move the student has yet to find: the game is over. */
const REVIEW_NAMES_NO_MOVE = false;

/** THE ONE MAKER of a Review fact, on the board after the move (`fen`) with
 *  the board before it (`altFen`). Its id is its computer, its tag and its
 *  words; its place comes from its kind and seat. */
export function reviewFacet(
  computer: ComputerName,
  tag: FacetTag,
  text: string,
  fen: string,
  altFen: string,
  parts: ReviewFacetParts = {},
): ReviewFacet {
  const kind = parts.kind ?? tag;
  const seat: FactSeat = parts.incoming ? 'opponent' : 'student';
  // Review has no think pause: Learn's question and its answer run on as one
  // line here, for every producer (decision baseline 2026-11-08, the priority
  // read "What's the priority here? ‖ Their pawn on h2 is isolated … ‖" reached
  // the walk with its marks — two producers stripped them by hand, this one
  // did not).
  const said = stripThink(text);
  return {
    ...placeFact(kind, seat),
    kind,
    id: `${computer}:${tag}:${said}`,
    computer,
    tag,
    text: said,
    fen,
    altFen,
    seat,
    squares: [...new Set(parts.squares ?? [])],
    claims: parts.claims ?? [],
    stakes: stakesOf(kind, parts.stakes && parts.stakes.points > 0 ? parts.stakes : null),
    proof: parts.proof ?? NO_PROOF.description,
    namesStudentMove: REVIEW_NAMES_NO_MOVE,
    thread: LOCAL_THREAD,
    ...(parts.identity ? { identity: parts.identity } : {}),
    ...(parts.lines?.length ? { lines: parts.lines } : {}),
  };
}

/** The same fact said in other words (a refrain folded, a habit appended) —
 *  everything it knows rides along. */
export function reworded(f: ReviewFacet, text: string): ReviewFacet {
  return { ...f, text };
}

/** The fact as the opponent's, its place moved with its seat. */
export function asIncoming(f: ReviewFacet): void {
  Object.assign(f, placeFact(f.kind, 'opponent'), { seat: 'opponent' as const });
}

/** A rule fact that restates another fact (the passed-pawn rule beside the
 *  passer read of the same pawn) is weighed in that fact's family
 *  (`FUNDAMENTAL_CLAIM_FAMILY`), so the door's subsumption sees ONE claim. Set
 *  where the rule is made, from the fundamental its line keeps. */
export function inRuleFamily(f: ReviewFacet, ruleLineId: string): void {
  const fundamental = fundamentalOfLine(ruleLineId);
  const family = fundamental ? FUNDAMENTAL_CLAIM_FAMILY[fundamental] : null;
  if (family === null || !(family in TIE_ORDER)) return;
  const kind = family as FactKind;
  Object.assign(f, placeFact(kind, f.seat), { kind });
}
