// coachDecider — THE ONE DECIDING COMPUTER (David 2026-09-16: "I want one
// unified deciding computer. Merge them if possible").
//
// Everything the coach says passes through exactly one decision, made here, in
// code (G0 — the LLM decides nothing, it only phrases what this returns).
//
// WHAT WAS MERGED. The decision used to be spread across three modules that no
// caller composed the same way twice:
//   • `narrationImportance.computeImportance` — does this MOMENT earn voice.
//   • the NEED score (N2)                     — does THIS STUDENT need it here.
//   • `factSelector.selectFacts`              — which FACTS at that moment speak.
// plus `reviewFacetRank` for the order. Three doors meant three places for a
// surface to disagree with another surface about the same board, and it is why
// `factSelector` reached review and nothing else.
//
// They are now ONE call with one result. The maths still lives in those modules
// — they are separately tested and this composes them rather than copying them
// (the CLAUDE.md rule: never add a second criticality). What changes is that
// there is a single entry point, so a new surface cannot invent its own
// composition, and so a change to the decision reaches every surface at once.
//
// THE ORDER OF THE DECISION, and why it is this order:
//   1. IMPORTANCE — is this moment worth anything at all? (band-free bars,
//      contested-gated; a swing inside a decided game is not a moment.)
//   2. NEED — does this student need it? A line they have played correctly five
//      times is silent even when the position is interesting.
//   3. SUBSUME — collapse the facts that are one claim about one geometry.
//   4. FLOOR — sweep what is not worth saying at this moment.
//   5. ORDER — most-important-first, with the student's weaknesses raised.
// Steps 1–2 decide WHETHER, 3–5 decide WHAT. Silence at any step is a computed
// verdict with a reason attached — never an absence.
import { computeImportance, type ImportanceSignals, type ImportanceTier, type ImportanceVerdict } from './narrationImportance';
import { selectFacts, supportedFacts, type QuietFact } from './factSelector';
import { rankFacets, facetTag, FACET_ROLE, CLAUSE_ROLE } from './reviewFacetRank';
import { methodBeatFor, type MethodSignals, type HabitNeed, type HabitStanding, type MethodHabit } from './methodBeat';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import type { WeaknessSignal } from './weaknessSignal';
import { emitCoachDecision } from './coachDecisionEvents';
import { NO_BOOST, type StudentBoost } from './studentMomentBoost';

/** HOW A SURFACE LISTENS — and it is not cosmetic, it decides what silence MEANS.
 *
 *  • 'walk'      — review / Watch: the coach is narrating a sequence the student
 *                  asked to be walked through. Every ply is a beat. Importance
 *                  RANKS the moment and sets the floor; it must NOT decide
 *                  whether the ply speaks, because the student came for the walk.
 *  • 'interrupt' — Play / live boards: silence is the default and the coach has
 *                  to EARN the interruption, so importance gates.
 *
 *  This distinction was learned the hard way, twice in one night. Applying the
 *  live-surface gate to review cut a 46-ply walk to SIX narrated plies, and
 *  every unit test stayed green — only reading the narration caught it. A
 *  surface must declare its posture; there is no safe default. */
export type SurfacePosture = 'walk' | 'interrupt';

/** What this student brings to the board. */
export interface StudentContext {
  /** STRENGTH, never volume (B6): the door does not read this for WHETHER a
   *  moment speaks — the bars are band-free. Carried for the depth-scaled
   *  computers a surface composes around the decision. */
  rating: number;
  /** The weakness spine — raises facts about the holes they keep falling in. */
  weaknesses: readonly WeaknessSignal[];
  /** The N2 need verdict for THIS ply, when the surface computed one. Absent
   *  means "no need data" — which is NOT the same as "no need": a cold student
   *  must never meet a mute coach, so absent reads as speak.
   *
   *  🚨 REQUIRED, and `null` is a real answer. See `momentBoost`. */
  need: { speak: boolean } | null;
  /** HOW MUCH THIS STUDENT'S OWN HISTORY RAISES THIS MOMENT — `boostFor(match)`
   *  for the best-matching fact here, computed by the SURFACE with the existing
   *  fine-grained join (`matchTacticPattern(conceptId) ?? matchClauseKind(kind)`).
   *
   *  It arrives pre-matched because `FactBundle.facts` is `string[]` — by the
   *  time facts reach this door they are PROSE, and joining prose to a weakness
   *  would mean scraping a concept back out of a sentence. The surface still
   *  holds the structured clauses, so the match belongs there; only its RESULT
   *  travels. (The first design had the decider do its own
   *  `Record<ImportanceTier, cluster>` lookup — a fourth, coarser join beside
   *  three existing ones, on a lossy key. See narrationImportance.)
   *
   *  `NO_BOOST` = no data / a hole the lifecycle marks `fixed`. `rank` is
   *  RAISE-ONLY; `opens` (a recurring RED hole) may open a quiet contested
   *  moment — see `studentMomentBoost` (B2).
   *
   * 🚨 REQUIRED, and this is the third field in this codebase made required for
   * the same reason. Both student terms were optional, and review simply never
   * passed `momentBoost` — so on the surface where diagnosis happens, a
   * student's own recorded holes could ORDER facts and could not raise a single
   * moment. Nothing failed; the field was absent, the default was 0, and the
   * student model was silently not consulted by the computer that decides what
   * is worth saying.
   *
   * That is the same defect shape as `NeedPlyInput.clauseKind` (the live lane
   * never passed it, killing the largest term in the need score) and
   * `posedTags` (pre-filtered by a guard that belonged to the other consumer).
   * Three instances, all found by hand, all invisible to every prod audit.
   * An optional student term is a lane's licence to forget the student, so the
   * door no longer offers one: a caller must ANSWER, even if the answer is
   * `NO_BOOST`.
   */
  momentBoost: StudentBoost;
}

/** The facts a surface computed at this moment, with the geometry coupled from
 *  the computers that produced them (never scraped from the prose). */
export interface FactBundle {
  facts: readonly string[];
  squares: ReadonlyMap<string, readonly string[]>;
  /** Facts describing what the OPPONENT is doing TO the student. */
  incoming?: ReadonlySet<string>;
  /** SENTENCES THIS SURFACE HAS ALREADY SPOKEN — see `selectFacts`. A standing
   *  fact is true for as long as its geometry stands, so it re-earns its place
   *  on every ply and the student hears it again and again. The surface decides
   *  what is eligible; the door enforces it. */
  alreadySaid?: ReadonlySet<string>;
  /** THE SURFACE'S OWN SCALE, when it has one — the ranks AND the bar that
   *  belongs to them. Steps 4 and 5 use these instead of `barForTier` +
   *  `rankFacets`.
   *
   *  This exists so ONE door can serve two vocabularies. Review's facts carry
   *  `[tag]` prefixes that `rankFacets` knows how to order; the live composer's
   *  clauses carry their own tuned ranks (a named tactic at 70 sits under a
   *  must-defend at 75 and above a generic critical moment at 65 — deliberate,
   *  and separately tested). Handing that text to the review ranker would throw
   *  the tuning away and silently reorder every live narration, which is exactly
   *  the kind of change that passes every unit test. A surface with no scale of
   *  its own omits this and gets the review ranker, unchanged. */
  order?: { rank: ReadonlyMap<string, number>; bar: number };
  /** HOLES THE SURFACE ALREADY MATCHED, per fact — handed to the review ranker
   *  in step 5 (`rankFacets`'s `matched`). Ignored when the surface supplies
   *  its own `order`, because it has then already applied its own boost.
   *
   *  It exists so a fact whose hole the surface knows EXACTLY is not re-joined
   *  here by its coarse tag. Review's `[principle]` facet is the case: the
   *  attributor proved which fundamental the move broke, and the tag route
   *  answers with the leader of the whole positional bucket instead. Same
   *  reasoning as `StudentContext.momentBoost` — the facts are prose by the
   *  time they arrive, so the match belongs upstream and only its result
   *  travels. */
  holeByFact?: ReadonlyMap<string, WeaknessSignal | null>;
  /** THE CLAIM FAMILY per fact — see `FactSelectOptions.family`. The live
   *  composer passes each clause's `kind`; review's facets carry theirs in the
   *  `[tag]` prefix and may omit this. */
  family?: ReadonlyMap<string, string>;
}

/** What the student should have DONE differently in their head. Optional: a
 *  surface that cannot supply these simply gets no method beat. */
export type MethodContext = Omit<MethodSignals, 'tier'> & { ply?: number };

/** Step 1 of the door, on its own.
 *
 *  A COMPOSER needs the moment's verdict BEFORE it has facts to hand over — the
 *  tier picks which clause it writes, and an expensive probe is only worth
 *  running on a moment that earned it. Without this such a surface has to call
 *  `computeImportance` itself, which is how it ends up composing its own
 *  decision out of the three modules and drifting from every other surface.
 *
 *  This is NOT a second door: it is the first step of the same one, and
 *  `decide` runs it internally. A surface may read the verdict; only `decide`
 *  decides. */
export interface MomentVerdict {
  importance: ImportanceVerdict;
  /** Does this moment speak at all, given the surface's posture? On a `'walk'`
   *  it always does — the student asked for the sequence. */
  speaks: boolean;
}

export function judgeMoment(
  signals: ImportanceSignals,
  posture: SurfacePosture,
  /** The student term — see `StudentContext.momentBoost`. A bare number is the
   *  raise-only form, for the leaf tests; a surface hands a `StudentBoost`. */
  momentBoost: number | StudentBoost = NO_BOOST,
): MomentVerdict {
  const importance = computeImportance(signals, momentBoost);
  return { importance, speaks: posture === 'walk' || importance.speak };
}

export interface CoachDecision {
  /** Does this moment speak at all? */
  speak: boolean;
  /** Why it does or does not — the observability trail. */
  reason: 'importance' | 'need' | 'unsupported' | 'spoken';
  tier: ImportanceTier;
  /** Moment-level weight, for ordering moments against each other. */
  rank: number;
  /** The facts that speak, most-important-first. Empty when `speak` is false. */
  spoken: string[];
  /** Every fact that did not, and why. */
  quiet: QuietFact[];
}

/**
 * THE decision. One call, one answer, every surface.
 *
 * @param signals the moment's grounded signals (engine/board, already computed)
 * @param student who is being taught
 * @param bundle  the candidate facts + their coupled geometry
 */
/** Emit the decision so the WEIGHTING is observable, not just its prose.
 *  Every return path of `decide()` goes through here — a path that returns
 *  without emitting is a decision nobody can audit, which is the whole reason
 *  this exists (David 2026-09-20: "I want audit tools on all algo based
 *  builds"). Gate: `coachDecisionEmits.test.ts`. */
function emit(
  posture: SurfacePosture,
  d: CoachDecision,
  student: StudentContext,
  method: boolean,
): CoachDecision {
  emitCoachDecision({
    posture,
    tier: d.tier,
    rank: d.rank,
    speak: d.speak,
    reason: d.reason,
    needSpeak: student.need?.speak ?? null,
    spokenCount: d.spoken.length,
    quietCount: d.quiet.length,
    quietBy: d.quiet.reduce<Record<string, number>>((acc, q) => {
      acc[q.why] = (acc[q.why] ?? 0) + 1;
      return acc;
    }, {}),
    subsumed: d.quiet
      .filter((q) => q.why === 'subsumed' && q.by)
      .map((q) => [q.text.slice(0, 80), (q.by ?? '').slice(0, 80)] as [string, string]),
    method,
  });
  return d;
}

/** The tiers the student's need may NOT veto — see step 2 of `decide`. A
 *  `Record` over the whole union, so a new tier fails to compile until someone
 *  decides whether it is a lesson (need-gated) or the board (not). */
const NEED_MAY_VETO: Record<ImportanceTier, boolean> = {
  mate: false,
  'only-move': false,
  blunder: false,
  'must-defend': false,
  critical: true,
  swing: true,
  teaching: true,
  convert: true,
  none: true,
};
const SPEAKS_ON_IMPORTANCE: ReadonlySet<ImportanceTier> = new Set(
  (Object.keys(NEED_MAY_VETO) as ImportanceTier[]).filter((t) => !NEED_MAY_VETO[t]),
);

export function decide(
  signals: ImportanceSignals,
  student: StudentContext,
  bundle: FactBundle,
  posture: SurfacePosture,
  /** When supplied, the decider also decides whether to teach the METHOD here —
   *  the habit that would have found the move. It lives in THIS computer, not
   *  at a call site, because it is a teaching decision and it needs the tier
   *  this function computes (David 2026-09-16: how to think IS the teaching). */
  method?: MethodContext,
): CoachDecision {
  const { importance, speaks } = judgeMoment(signals, posture, student.momentBoost ?? NO_BOOST);
  const base = { tier: importance.tier, rank: importance.rank };

  // 1 — THE MOMENT, but ONLY where silence is the default. On a 'walk' the
  // student asked for the sequence, so an unimportant moment is a QUIETER beat,
  // never a missing one.
  // Every fact goes quiet under the GATE's own name (B9, 2026-09-22): the
  // emitted `quietBy` used to file both closes as `'below-bar'`, so the row
  // could name the gate in `reason` and then contradict itself per fact.
  if (!speaks) {
    return emit(posture, { ...base, speak: false, reason: 'importance', spoken: [], quiet: bundle.facts.map((text) => ({ text, why: 'importance' as const })) }, student, false);
  }
  // 2 — THE STUDENT. Absent need data reads as speak: a fresh install must meet
  // a teaching coach, not a mute one (the cold-start rule).
  //
  // 🚨 THE VETO IS TIER-AWARE (B5, 2026-09-22). `needScore`'s own contract has
  // said since N2 that need "gates the quiet per-ply teaching beat only; a
  // swing / must-defend / mate speaks on its own importance regardless of
  // need" — and this door never honoured it: a hanging piece on a line the
  // student had played right five times was silenced by their familiarity
  // with the LINE, which says nothing about the PIECE. Need answers "does this
  // student need the lesson here"; a forced mate, an only-move, a blunder and
  // a live hang are not lessons, they are the board — they speak on the
  // moment. The teaching / critical / swing / convert / none tiers stay
  // need-gated, which is where a familiar line SHOULD go quiet.
  if (student.need && !student.need.speak && !SPEAKS_ON_IMPORTANCE.has(importance.tier)) {
    return emit(posture, { ...base, speak: false, reason: 'need', spoken: [], quiet: bundle.facts.map((text) => ({ text, why: 'need' as const })) }, student, false);
  }
  // 3 + 4 — WHICH FACTS. Subsumption collapses one-claim duplicates; the floor
  // sweeps trivia. The floor may never mute a ply — that was step 2's job and
  // it has already run (see `factSelector`'s BAR_BY_TIER note).
  const selection = selectFacts(
    bundle.facts,
    bundle.squares,
    importance.tier,
    student.weaknesses,
    { incoming: bundle.incoming, alreadySaid: bundle.alreadySaid, order: bundle.order, family: bundle.family },
  );
  // 4b — TEACHING POINTS FIRST (2026-09-23). A description speaks only where it
  // supports a teaching point on this ply. ONE rule on every surface: review's
  // facts carry their role in the `[tag]`, the live composer's in the clause
  // `family` (its kind). Only review has a move-reason line (`[does]`) to keep
  // on a ply with no teaching point; a live clause set has no such kind.
  const family = bundle.family;
  const support = supportedFacts(
    selection.spoken,
    bundle.squares,
    family
      ? (t) => { const k = family.get(t); return k !== undefined && k in CLAUSE_ROLE ? CLAUSE_ROLE[k as keyof typeof CLAUSE_ROLE] : 'teach'; }
      : (t) => { const tag = facetTag(t); return tag === null ? 'teach' : FACET_ROLE[tag]; },
    family ? () => false : (t) => facetTag(t) === 'does',
  );
  selection.spoken = support.spoken;
  selection.quiet = [...selection.quiet, ...support.quiet];
  // 5 — THE ORDER. The surface's own ranks when it supplied them, else the
  // review ranker. Either way the student's holes are raised: `rankFacets` does
  // it by tag, and a surface that ranks its own facts has already applied its
  // weakness boost before handing them over (positionFacts does).
  const order = bundle.order;
  const spoken = order
    ? [...selection.spoken].sort((x, y) => (order.rank.get(y) ?? 0) - (order.rank.get(x) ?? 0))
    : rankFacets(selection.spoken, student.weaknesses, bundle.holeByFact);
  let methodSpoke = false;
  // 6 — THE METHOD, last. Ranked lowest so it CLOSES the beat: the board fact,
  // then the principle it broke, then the habit that finds it next time.
  if (method) {
    // The habit bar is the STUDENT'S OWN RECORD, not a flat number. `habitNeed`
    // passed by the caller wins; otherwise it is derived here from the weakness
    // spine, so every surface gets the same answer from the same door.
    const beat = methodBeatFor(
      { ...method, tier: importance.tier, habitNeed: method.habitNeed ?? habitNeedFrom(student.weaknesses) },
      method.ply ?? 0,
    );
    if (beat) { spoken.push(`[method] ${beat}`); methodSpoke = true; }
  }
  // A ply whose every fact was a description with no teaching point to
  // support says nothing — and says WHICH gate closed it, rather than
  // reporting `speak: true` over an empty list.
  if (spoken.length === 0) {
    return emit(posture, { ...base, speak: false, reason: 'unsupported', spoken, quiet: selection.quiet }, student, false);
  }
  return emit(posture, { ...base, speak: true, reason: 'spoken', spoken, quiet: selection.quiet }, student, methodSpoke);
}

/** WHICH HABITS THIS STUDENT KEEPS BREAKING, read off the weakness spine.
 *
 *  A method beat is earned by RECURRENCE, not by the size of one slip (David
 *  2026-09-16, after his Alapin review spoke zero method). The spine already
 *  tracks recurrence per cluster; this joins those clusters to the habit that
 *  would have caught them.
 *
 *  Matching is on `clusterId`, the spine's documented join key — never on
 *  `label`, which is display text and is explicitly "never used for matching".
 *  A cluster must be genuinely open (`openCount > 0`): a hole the student has
 *  since closed is not a habit they still need taught. */
export function habitNeedFrom(weaknesses: readonly WeaknessSignal[]): HabitNeed {
  const need: HabitNeed = {};
  for (const w of weaknesses) {
    const habit = habitForCluster(w.clusterId);
    if (!habit) continue;
    const standing = standingOf(w);
    // Worst standing wins: two clusters map to one habit (hung-material and
    // missed-opponents-threat are both 'opponent-threat'), and a habit they
    // still break in ONE of them is still open.
    if (standing === 'open' || need[habit] === undefined) need[habit] = standing;
    else if (standing === 'fading' && need[habit] === 'closed') need[habit] = 'fading';
  }
  return need;
}

/** WHERE ONE CLUSTER STANDS — the lifecycle already computed this; we only read
 *  it. `fixed` means they stopped erring here, so the coach stops warning about
 *  it; `occasional` + improving means they mostly find it now. Everything else
 *  is still open. A cluster with no open instances is closed regardless of what
 *  the lifecycle says, and a cluster the lifecycle never scored (no sample
 *  floor) is treated as OPEN — unknown must never read as "they have it". */
function standingOf(w: WeaknessSignal): HabitStanding {
  if (w.openCount <= 0) return 'closed';
  if (w.lifecycleStatus === 'fixed') return 'closed';
  if (w.lifecycleStatus === 'occasional' && w.trend === 'improving') return 'fading';
  return 'open';
}

/** One cluster id → one habit, or null when the weakness is real but is not a
 *  THINKING habit. Both vocabularies are handled here so a caller never has to
 *  know which one it is holding. */
export function habitForCluster(clusterId: string): MethodHabit | null {
  for (const [re, habit] of ANALYSIS_HABIT) if (re.test(clusterId)) return habit;
  return COACH_TAG_HABIT[clusterId as MisconceptionTagId] ?? null;
}

/** THE COACH-SIDE TAG → HABIT MAP, EXHAUSTIVE OVER THE CLOSED SET.
 *
 *  There are TWO weakness vocabularies feeding `clusterId`: the generated
 *  `analysis:*` family (open — `analysis:tactic:${tacticType}`) and this closed
 *  set of 26 misconception tags, mapped straight through by
 *  `weaknessSignal.ts:63` (`clusterId: w.tag`).
 *
 *  A regex join across both silently missed the two tags that matter most for
 *  the threat habit, on a string NEAR-miss: `missed-opponents-threat` does not
 *  contain "missed-threat", and `hung-material` does not contain "hanging"
 *  (found 2026-09-16). That is the "two enums that mean the same thing and
 *  never reconcile" rot — it fails silently and every test stays green. A
 *  `Record` over `MisconceptionTagId` makes it IMPOSSIBLE to reopen: a 27th tag
 *  fails to compile until someone decides its habit.
 *
 *  `null` means "real weakness, but not a THINKING habit" — a positional
 *  principle (king safety, pawn structure, a passive rook) is taught by the
 *  fundamentals layer, not by a method beat. Empty beats generic. */
const COACH_TAG_HABIT: Record<MisconceptionTagId, MethodHabit | null> = {
  // — the opponent's move is the thing you did not look at —
  'missed-opponents-threat': 'opponent-threat',
  'hung-material': 'opponent-threat',
  'greedy-pawn-grab': 'opponent-threat',
  'poisoned-pawn': 'opponent-threat',
  // — the shot that was there was forcing —
  'missed-tactic': 'forcing-scan',
  // — you picked before you compared —
  'calculation-depth': 'candidates',
  'overvalued-attack': 'candidates',
  'bad-trade': 'candidates',
  'bad-trade-material': 'candidates',
  'no-plan': 'candidates',
  // — the moment deserved more clock than you gave it —
  'botched-conversion': 'slow-down',
  'mistimed-pawn-break': 'slow-down',
  // — real holes, taught by the fundamentals layer rather than a habit —
  'left-book-early': null,
  'neglected-development': null,
  'king-stuck-center': null,
  'tempo-handed': null,
  'space-conceded': null,
  'weakened-king-safety': null,
  'created-pawn-weakness': null,
  'misplaced-piece': null,
  'overextended-pawn': null,
  'capture-toward-centre': null,
  'passive-king-endgame': null,
  'passed-pawn-neglected': null,
  'passive-rook': null,
  other: null,
};

/** The GENERATED `analysis:*` family is open (`analysis:tactic:${type}`), so it
 *  matches by prefix — but only on prefixes that are actually emitted by
 *  `weaknessSpine.ts`, listed here rather than guessed. */
const ANALYSIS_HABIT: ReadonlyArray<readonly [RegExp, MethodHabit]> = [
  [/^analysis:missed-threat/, 'opponent-threat'],
  // "doesn't see what is on the board" IS the threat habit — the regex join
  // walked straight past this one.
  [/^analysis:boardvision/, 'opponent-threat'],
  [/^analysis:tactic:/, 'forcing-scan'],
  [/^analysis:conversion/, 'slow-down'],
  [/^analysis:timetrouble/, 'slow-down'],
];
