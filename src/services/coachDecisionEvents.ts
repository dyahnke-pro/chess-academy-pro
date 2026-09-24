// coachDecisionEvents — ONE leaf signal: "the deciding computer just decided".
//
// WHY THIS EXISTS (David 2026-09-20: "I want audit tools on all algo based
// builds"). Everything the coach says passes through `coachDecider.decide()`,
// and until now that computer emitted NOTHING — no `logAppAudit`, no analytics,
// on any path. So the weighting was observable only by reading narration and
// judging it by eye, which is how every real defect of 2026-09-20 was found and
// exactly what does not scale: nothing would notice a term's contribution
// drifting, a fact being subsumed that should have spoken, or one term
// dominating every ply. An algo whose decisions cannot be inspected is the same
// class of problem as an audit that reports green having verified nothing.
//
// WHY A LEAF, and not a `logAppAudit` call inside the decider. `appAuditor`
// reaches Dexie, and `decide()` is a pure computer — a fact-computer that has
// to import the database to report on itself is no longer a fact-computer, and
// the repo already says a leaf must not import the db or the store to learn
// anything. Same shape as `weaknessModelEvents`: this module imports NOTHING,
// the decider emits, and a subscriber wired at boot forwards to the audit log.
//
// WHAT THE ROW IS FOR. Not prose — DISTRIBUTIONS. With one row per decision an
// audit can assert the shape of the weighting (which term carried the ply, how
// often the floor swept something, what subsumption collapsed) instead of a
// human noticing a sentence. A row nobody asserts on is decoration, so the rule
// is: emitting is half the build, and an audit contract on the rows is the
// other half.

/** One decision by the one deciding door. Every field is already computed by
 *  `decide()`; nothing here is derived a second time. */
export interface CoachDecisionRow {
  /** Which surface asked, and under which posture it was judged. */
  posture: 'walk' | 'interrupt';
  /** The moment's computed standing. */
  tier: string;
  rank: number;
  /** Did the coach speak at all, and if not, WHICH gate closed it —
   *  'importance' (the moment) or 'need' (this student). The two are different
   *  diagnoses and collapsing them is how a posture bug hides. */
  speak: boolean;
  reason: string;
  /** The teach meter: a spoken row where only descriptions spoke reads
   *  `false`. Audits hold the share of `teaches` among spoken rows. */
  teaches: boolean;
  /** The student's own NEED VERDICT at this ply, when the surface computed
   *  one; `null` means it supplied none — itself worth seeing, since absent
   *  need reads as SPEAK by the cold-start rule.
   *
   *  It is the verdict and NOT the score on purpose: `StudentContext.need` is
   *  typed `{ speak: boolean } | null`, so the score genuinely does not reach
   *  this door. Emitting one here would mean inventing a number the computer
   *  never saw. The score's distribution belongs to a second emission inside
   *  `computeNeed`, where it is actually computed — that is `NeedScoreRow`
   *  below; join the two on the ply rather than faking a score here. */
  needSpeak: boolean | null;
  /** How many facts survived, and how many the selector silenced. */
  spokenCount: number;
  quietCount: number;
  /** WHICH MECHANISM silenced them, counted. 'subsumed' (collapsed as one
   *  claim about one geometry), 'below-bar' (the floor), 'said-already' (the
   *  say-once pass), and — when the DOOR closed before any fact was weighed —
   *  'importance' (the moment) or 'need' (this student), the same two names
   *  `reason` carries. A spike in one of these is a different bug from a spike
   *  in another, and `quietCount` alone cannot tell them apart — which is how
   *  a subsumption widening and a floor raise look identical from outside. */
  quietBy: Record<string, number>;
  /** The subsumption pairs, [loser, winner] — the answer to "which claim ate
   *  which". Already computed by `factSelector` (`QuietFact.by`) and thrown
   *  away at this boundary until now.
   *
   *  The texts are CLIPPED to a prefix. That is a telemetry-payload decision,
   *  not a cap on teaching: nothing here reaches a student, and a prefix
   *  identifies the claim well enough to trend it. */
  subsumed: Array<[string, string]>;
  /** Whether a method beat closed the beat — the habit teaching, which is the
   *  half of the coach that was near-silent before 2026-09-16. */
  method: boolean;
  /** THE COMPUTED ORDER (2026-09-23): how many of the ply's facts carried
   *  STAKES — material from the computer that made them — and whether the
   *  first fact spoken was one of them (`null` when nothing spoke). A run in
   *  which no fact ever carries stakes means the wire does not fire and every
   *  ply is ordered by the tie table alone. */
  stakedCount: number;
  leadStaked: boolean | null;
}

type Listener = (row: CoachDecisionRow) => void;

const listeners = new Set<Listener>();

/** Subscribe. Returns the unsubscribe. */
export function onCoachDecision(cb: Listener): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

/** Emit. Never throws into the caller — a decision must not fail because
 *  telemetry did, which is the same reason `recordCapabilityEvidence` swallows
 *  its own errors. */
export function emitCoachDecision(row: CoachDecisionRow): void {
  for (const cb of listeners) {
    try { cb(row); } catch { /* telemetry never breaks the coach */ }
  }
}


/** One NEED computation — the student term, broken out PER TERM.
 *
 *  WHY IT LIVES BESIDE `CoachDecisionRow` and not in its own leaf. It is the
 *  same signal class (an algo reporting how it weighted), the same subscriber,
 *  and the same gate table; a second module would be the start of the
 *  hand-maintained-lists failure this repo keeps paying for. What it is NOT is
 *  a field on the decision row: `decide()` receives the VERDICT and never the
 *  score, so the score can only be honest where it is computed.
 *
 *  This is the answer to "which term carried the ply". A weighted sum whose
 *  terms cannot be separated can only be judged by its output, and a term
 *  quietly contributing nothing — or one dominating every ply — looks
 *  identical from there. */
export interface NeedScoreRow {
  ply: number;
  /** The clamped 0–100 result and the verdict it produced. */
  score: number;
  speak: boolean;
  /** True when the cold-start PRIOR decided instead of data — a score that is
   *  the rating's opinion, not the student's record, and must never be read as
   *  evidence about them. */
  prior: boolean;
  /** Per-term contribution, BEFORE the clamp. Negative is a lowering term
   *  (only `capability` can be), 0 means the term did not fire. Named so a
   *  distribution can be taken per term rather than per ply. */
  terms: Record<string, number>;
}

type NeedListener = (row: NeedScoreRow) => void;
const needListeners = new Set<NeedListener>();

/** Subscribe to need computations. Returns the unsubscribe. */
export function onNeedScore(cb: NeedListener): () => void {
  needListeners.add(cb);
  return () => { needListeners.delete(cb); };
}

/** Emit. Never throws into the caller, same contract as the decision emit. */
export function emitNeedScore(row: NeedScoreRow): void {
  for (const cb of needListeners) {
    try { cb(row); } catch { /* telemetry never breaks the coach */ }
  }
}

/** Test/boot helper — drop every listener. */
export function resetCoachDecisionListeners(): void {
  listeners.clear();
  needListeners.clear();
}
