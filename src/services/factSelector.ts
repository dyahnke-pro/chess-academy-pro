// factSelector — THE COMPUTER THAT DECIDES WHICH FACTS SPEAK, at narration time
// (David 2026-09-16: "we don't make a cut on the code side, the computer that
// ranks the narrations does. At narrations time. If the battery is more
// important than the pin, then the pin stays quiet and the battery pro wins").
//
// WHY THIS EXISTS. The coach already had two value-based deciders and was
// missing the third:
//   • `computeImportance` — does this MOMENT earn voice (position-level).
//   • the need score      — does THIS STUDENT need teaching here (per ply).
//   • …nothing scored an INDIVIDUAL FACT, so once a moment earned voice every
//     fact computed at it spoke. `reviewFacetRank` ordered them and, by its own
//     comment, never changed the set.
//
// The symptom David read back: at one ply the coach said the bishop pins the
// bishop against the queen, AND that the queen and bishop form a battery on the
// same diagonal, AND that the bishop is guarded only by king and queen — four
// readings of ONE geometric configuration, delivered as four findings.
//
// TWO MECHANISMS, NOT ONE. Ranking alone cannot fix that, and it is worth being
// precise about why: ranking gives a total order across UNRELATED facts, but
// between the pin and the battery you do not want an order, you want one of them
// to win BECAUSE THEY ARE THE SAME CLAIM. So:
//   1. SUBSUMPTION — facts whose square sets essentially coincide collapse to
//      the highest-ranked one. This is what makes the battery silence the pin.
//   2. A VALUE BAR — what survives must still be worth saying at this moment.
//
// 🔒 A BAR IS NOT A CAP (G4.5). A cap says "stop after N regardless of worth";
// a bar says "worth ≥ X regardless of count". On a rich position ten facts can
// clear the bar and all ten speak. Never replace the bar with a count.
//
// 🔒 IT IS NOT A SECOND CRITICALITY. The bar is DERIVED from the moment's
// existing importance tier — a critical moment admits nearly everything, a quiet
// teaching moment admits only the high-value facts. It composes the computers we
// have rather than adding a parallel judgement (CLAUDE.md G4.5/importance).
import type { ImportanceTier } from './narrationImportance';
import { facetRank } from './reviewFacetRank';
import type { WeaknessSignal } from './weaknessSignal';

/** Why a fact did not speak. Kept for the audit trail — silence is a computed
 *  verdict, so it has to be explainable, never just absent.
 *
 *  The first three are THIS selector's (steps 3–4 of the door). The last two
 *  are the DOOR's own gates, named here so one vocabulary covers every quiet
 *  fact: `'importance'` — the moment was not worth anything on this surface;
 *  `'need'` — this student did not need it here. Until 2026-09-22 both were
 *  emitted as `'below-bar'`, so the `quietBy` distribution the audits read could
 *  not tell a posture bug (importance closing a walk) from a need bug — the
 *  exact two diagnoses the emission exists to separate. */
export type QuietReason = 'subsumed' | 'below-bar' | 'said-already' | 'importance' | 'need';

export interface QuietFact {
  text: string;
  why: QuietReason;
  /** For 'subsumed', the fact that won the geometry. */
  by?: string;
}

export interface FactSelection {
  spoken: string[];
  quiet: QuietFact[];
}

/** How much square overlap counts as "the same claim". Jaccard, not containment:
 *  containment would let a one-square fact ("their bishop on e2 is guarded only
 *  by king and queen") be eaten by ANY multi-square fact that happens to mention
 *  e2, which silences a genuinely different teaching. Jaccard keeps that one and
 *  still collapses the pin against the battery, whose square sets are identical.
 *
 *  Worked, from David's game — pin {g4,e2,d1} vs battery {d1,e2,g4}: 3/3 = 1.00
 *  → collapse. Lone-defender {d7,g4} vs pin: 1/4 = 0.25 → both speak. Royal
 *  guard {e2} vs pin: 1/3 = 0.33 → both speak. */
export const SAME_CLAIM_JACCARD = 0.6;

/** The value bar per moment tier. A moment that matters admits nearly every
 *  computed fact; a quiet one admits only what is worth interrupting calm for.
 *  These are FLOORS on `facetRank`, whose own table runs ~12 (consequence) to
 *  ~100 (principle), plus a weakness boost of ≤30. */
/** 🔒 THE BAR IS A FLOOR, NOT A SHAPER (corrected 2026-09-16, same hour, after
 *  READING the output). The first numbers here ran 40–101 and cut the Alapin
 *  review from 44 narrated plies to SIX — quiet plies land on tier 'none', and a
 *  bar above every rank silences the whole ply. That is precisely the "things
 *  don't get stated, teachings left out" failure David banned, arriving through
 *  the door marked 'importance'.
 *
 *  Two rules that keep it honest:
 *   1. SUBSUMPTION does the real work. Collapsing four readings of one diagonal
 *      is a judgement about DUPLICATION and is always safe. The bar only sweeps
 *      genuine trivia (the `consequence` band at 12, "it nudged the balance your
 *      way"). If the coach still says too much, tighten subsumption first.
 *   2. THE BAR MAY NEVER SILENCE A PLY. Whether a quiet ply speaks at all is the
 *      NEED gate's decision (N2), made from the student's own data. A per-fact
 *      floor must not re-litigate it — so no tier's bar may sit above the lowest
 *      real fact rank, and `none` is not a mute. */
const BAR_BY_TIER: Record<ImportanceTier, number> = {
  mate: 0,          // everything — nothing outranks a forced mate on the board
  'only-move': 0,
  blunder: 0,
  'must-defend': 0,
  critical: 0,
  swing: 0,
  teaching: 20,     // sweeps the consequence-band tail only
  convert: 20,
  none: 20,         // NOT a mute — ply-level silence belongs to the need gate
};

export function barForTier(tier: ImportanceTier): number {
  return BAR_BY_TIER[tier];
}

function jaccard(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter += 1;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Decide which of a ply's computed facts speak.
 *
 * @param facets   the computed facts, in authoring order
 * @param squares  facet text → the squares that fact NAMED, coupled from the
 *                 computer that produced it (never scraped from the prose)
 * @param tier     the moment's importance tier, from `computeImportance`
 * @param signals  this student's weakness spine — raises facts about their holes
 */
/** Everything optional, in ONE object — never as a positional tail.
 *
 *  This was four trailing positional parameters until 2026-09-16, when adding
 *  `alreadySaid` in the middle silently shifted `order` into its slot and every
 *  existing caller kept compiling while passing the wrong thing. A long
 *  positional tail is a trap that springs on the NEXT person; the options
 *  object cannot mis-bind. */
export interface FactSelectOptions {
  /** Facts that describe something the OPPONENT is doing TO the student —
   *  coupled from the detector's `beneficiary`, never inferred from the prose.
   *  Used ONLY to break a tie inside a same-claim group (see below). */
  incoming?: ReadonlySet<string>;
  /** SENTENCES THIS SURFACE HAS ALREADY SPOKEN — suppressed, with a reason.
   *
   *  Subsumption collapses two facts that are one claim about one board.
   *  Say-once collapses ONE fact that is the same claim about a board that has
   *  not changed: "your pawn on d4 and your queen share that file" is true for
   *  as long as the pin geometry stands, so it re-earns its place on every ply
   *  and the student hears it over and over. That is the repetition a real game
   *  walk actually shows — not duplicate geometry (2026-09-16 measurement).
   *
   *  The SURFACE decides what is eligible, because only it knows which of its
   *  clauses are standing context and which are live and urgent — a piece that
   *  is STILL hanging must say so again. This set holds only the sentences it
   *  has judged safe to say once. */
  alreadySaid?: ReadonlySet<string>;
  /** A surface's OWN ranking scale. `rank` and `bar` travel together on
   *  purpose: a bar is meaningless in a scale it did not come from, and
   *  splitting them is how they end up disagreeing. Omitted → facts are ranked
   *  by their `[tag]` and swept by `barForTier`. */
  order?: { rank: ReadonlyMap<string, number>; bar: number };
  /** THE CLAIM FAMILY of each fact — the KIND of computer that produced it
   *  (`ClauseKind` on the live lane), coupled at emission. Two facts are ONE
   *  claim only when their squares coincide AND they are the same kind of
   *  claim: a pin and a battery over one diagonal are both `[tactic]`, so the
   *  battery eats the pin; the loose piece on that diagonal is `[loose]`, a
   *  different teaching, and it keeps its voice even though its two squares
   *  are a subset of the pin's three (Jaccard 0.67 — see B12 below). Review's
   *  facets carry their family in the `[tag]` prefix, so a surface that omits
   *  this map still gets it; a fact with no family in either place is never
   *  collapsed against a fact of a known family. */
  family?: ReadonlyMap<string, string>;
}

/** The family a fact declares in its own text — review's `[tag]` prefix. */
const FAMILY_PREFIX = /^\[([a-z0-9-]+)\]/i;
function declaredFamily(text: string): string | null {
  const m = FAMILY_PREFIX.exec(text);
  return m ? m[1].toLowerCase() : null;
}

/** ONE CLAIM = same geometry AND same claim family (B12, 2026-09-22).
 *
 *  Jaccard alone ate a two-square fact whenever a three-square fact of a
 *  DIFFERENT kind happened to contain it (2/3 = 0.67 ≥ 0.6): the loose piece on
 *  e2 vanished under the pin through e2, and the student lost a teaching that
 *  was not a duplicate. Silence must never be a guess, so a fact whose family
 *  is unknown on BOTH sides still collapses on geometry alone (today's
 *  behaviour for a caller that supplies neither a map nor a prefix), while a
 *  fact with a known family collapses only into its own. */
export function sameClaim(
  a: { sq: readonly string[]; family: string | null },
  b: { sq: readonly string[]; family: string | null },
): boolean {
  if (a.sq.length === 0 || b.sq.length === 0) return false;
  if (jaccard(a.sq, b.sq) < SAME_CLAIM_JACCARD) return false;
  if (a.family === null && b.family === null) return true;
  return a.family === b.family;
}

export function selectFacts(
  facets: readonly string[],
  squares: ReadonlyMap<string, readonly string[]>,
  tier: ImportanceTier,
  signals: readonly WeaknessSignal[] = [],
  opts: FactSelectOptions = {},
): FactSelection {
  const { incoming = new Set<string>(), alreadySaid, order, family } = opts;
  const said = alreadySaid ?? new Set<string>();
  const bar = order ? order.bar : barForTier(tier);
  const rankOf = (text: string): number => (order ? (order.rank.get(text) ?? 0) : facetRank(text, signals));
  const familyOf = (text: string): string | null => family?.get(text) ?? declaredFamily(text);
  const scored = facets.map((text, i) => ({ text, i, rank: rankOf(text), sq: squares.get(text) ?? [], family: familyOf(text) }));
  // Highest rank first; authoring order breaks ties so the result is stable.
  const byRank = [...scored].sort((a, b) => (b.rank - a.rank) || (a.i - b.i));

  const quiet: QuietFact[] = [];
  // GROUP BY GEOMETRY FIRST, then pick each group's winner — rather than letting
  // whichever fact happens to come first claim the geometry. The order matters:
  // a greedy first-wins pass cannot express "the battery beats the pin", because
  // pin and battery carry the SAME tag and therefore the same rank, so the
  // winner would just be whoever the authoring order emitted first (it was the
  // pin — the opposite of the right answer).
  const groups: Array<typeof byRank> = [];
  for (const cand of byRank) {
    // Only facts that actually named squares can coincide. A fact with no
    // coupled squares is never collapsed — we cannot prove it is the same claim,
    // and silence must never be a guess.
    const g = cand.sq.length > 0
      ? groups.find((grp) => sameClaim(grp[0], cand))
      : undefined;
    if (g) g.push(cand); else groups.push([cand]);
  }
  const winners: typeof byRank = [];
  for (const grp of groups) {
    // THE TIE-BREAK, and it is a chess judgement, not an accident of ordering:
    // at equal rank the fact describing what the OPPONENT is doing TO the
    // student wins, because that is the one that changes what they must do next.
    // Your own pin is a standing asset; their battery bearing down on your
    // bishop is a question you have to answer. Deliberately scoped to INSIDE a
    // same-claim group: the rank table's bands sit 1–4 apart, so expressing this
    // as a global bonus would vault a tactic over the move's own verdict.
    const ranked = [...grp].sort((a, b) =>
      (b.rank - a.rank)
      || (Number(incoming.has(b.text)) - Number(incoming.has(a.text)))
      || (a.i - b.i));
    const [win, ...rest] = ranked;
    winners.push(win);
    for (const loser of rest) quiet.push({ text: loser.text, why: 'subsumed', by: win.text });
  }
  winners.sort((a, b) => (b.rank - a.rank) || (a.i - b.i));
  // THE BAR, applied after subsumption so a low-ranked duplicate cannot mask a
  // high-ranked original by consuming its slot. Say-once runs alongside it: a
  // sentence already spoken is not worth saying again at any rank.
  const spoken: typeof winners = [];
  for (const w of winners) {
    if (said.has(w.text)) { quiet.push({ text: w.text, why: 'said-already' }); continue; }
    if (w.rank < bar) { quiet.push({ text: w.text, why: 'below-bar' }); continue; }
    spoken.push(w);
  }
  return { spoken: spoken.map((x) => x.text), quiet };
}
