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
  /** The student's own NEED VERDICT at this ply, when the surface computed
   *  one; `null` means it supplied none — itself worth seeing, since absent
   *  need reads as SPEAK by the cold-start rule.
   *
   *  It is the verdict and NOT the score on purpose: `StudentContext.need` is
   *  typed `{ speak: boolean } | null`, so the score genuinely does not reach
   *  this door. Emitting one here would mean inventing a number the computer
   *  never saw. The score's distribution belongs to a second emission inside
   *  `computeNeed`, where it is actually computed — that is the next increment,
   *  not something to fake from here. */
  needSpeak: boolean | null;
  /** How many facts survived, and how many the selector silenced. `subsumed`
   *  is the count collapsed as one claim about one geometry; `floored` fell
   *  under the bar. A spike in either is the signal that matters. */
  spokenCount: number;
  quietCount: number;
  /** Whether a method beat closed the beat — the habit teaching, which is the
   *  half of the coach that was near-silent before 2026-09-16. */
  method: boolean;
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

/** Test/boot helper — drop every listener. */
export function resetCoachDecisionListeners(): void {
  listeners.clear();
}
