# Phase 2 Surface Map — threat depth rework

**The §0 pre-build gate for Phase 2** of `docs/plans/2026-09-08-unified-coach.md`.
Status: **BUILT (core) — David said "keep going", executed on the branch.**
- ✅ Remedial `describeThreatRecognition` REMOVED from the review callout
  (coachFeatureService.ts:1842); fn kept for the explicit Learn spot-it drill;
  import cleaned. reviewNarrationFidelity (27) still green.
- ✅ Rating-scaled threat depth: `pvDepthForRating(rating)` (pvPlayback.ts, the
  single PV-depth source) — `<1200→3, <1500→4, <1800→5, <2100→6, else 7`, capped
  at the reliable window. Threaded into `augmentWithProjections` (rating param)
  → both deep-threat passes (#5/#5c). +tests.
- ✅ "Spell for everyone" verified: #5/#5c already run in capped production
  (budget 2; the scope early-return is at :2781, AFTER them). Rating-scaling now
  makes that production depth adaptive.
- ✅ Causal "why" already LEADS every review beat (Phase 1 `causalLead`), so it
  is attached to the threat that follows it in the same beat.
- ⏳ **Phase 2b (deferred):** David #4 "the calculation … doesn't have to be
  forced. Spell the lines out for everyone." The deep-threat passes still gate on
  `isForcingProjection`. Relaxing it to spell a decisive-but-NON-forcing best
  line (with honest "not forced, but their strongest try is…" framing) is its own
  slice — needs a noise gate so a slow plan isn't mislabeled a threat, + a test.
  Deferred rather than loosen a review-surface gate hastily.

## What Phase 2 does (David 2026-09-07)
1. **KILL the remedial explainer** from the default path —
   `describeThreatRecognition` (groundedAnswer.ts:4933): "the pattern to spot: an
   under-defended high-value piece falls to a cheaper attacker." David:
   "Obvious, remedial, and unnecessary."
2. **Rating-scaled threat DEPTH via engine PV** (`computePvLine`): 1400 → 3-4
   ply, 1800 → 4-6 ply, min 1. Deeper for stronger (principle 4). Never
   hallucinate — cap at the reliable PV window.
3. **SPELL THE LINE OUT for everyone** — the opponent's threat is NOT the
   student's find-the-move (principle 5), so show the line. Best-but-not-forced
   is valid ("not forced, but their strongest try is…"); best moves that lead to
   a losing position count (David #4).
4. **Attach causal-chain logic to threats** where a chain proves the WHY ("their
   queen on f3 blocks the knight, so … threatens to trap it").

## The threat core (VERIFIED — groundedAnswer.ts)
- **`detectNewThreat(fenBefore, fenAfter, moverWB)` :4825 → `DetectedThreat|null`.**
  The SOUND fact-computer: null-move scan, biggest NEW threat (mate-1 / safe
  royal fork / SEE-verified clean capture), side-agnostic, board-proven,
  counter-tactic-checked. **KEEP — this is the G0 fact source.** Carries from/
  landing/targets/targetSquares/guards for arrows.
- **`describeStudentThreat` :4916** — "you're now threatening {san} — it {detail}".
  The 1-ply line David LIKED. KEEP; Phase 2 can DEEPEN it with a spelled PV line.
- **`describeThreatRecognition` :4933** — the REMEDIAL pattern-explainer. **REMOVE
  from the default path** (keep the function only if a caller genuinely wants the
  "how to spot it" teaching behind an explicit toggle; otherwise delete).
- **`describeThreatPrevention` :5000** — the DEFENSE teaching (undermine guard /
  cover square / move target / verified relief). KEEP — it's board-proven and
  useful; not remedial.
- **`computePvLine` (pvPlayback.ts)** — the engine PV spelled ply-by-ply with
  PlyFacts (captured/isCheck/tacticLanded/materialGained). The raw material to
  SPELL the threat line truthfully + name each consequence.

## The rework shape (design)
- New leaf helper (proposed) `threatLine.ts`: given `DetectedThreat` + fen +
  rating, spell the threat's continuation via `computePvLine` to the rating-
  scaled depth, naming each consequence from PlyFacts (board-true, G0). Returns
  the spoken line + arrows. Reused by every threat surface. Depth via the SAME
  rating machinery as Phase 1 (criticalityThresholds/the plan's depth tiers) —
  do NOT add a new depth curve (principle 8; the P7 orphan list already flags
  the depth deciders to unify).
- Replace `describeThreatRecognition` calls with either nothing (silence) or the
  spelled line, per surface.
- Where a causal chain (`buildCausalChain`/`findAllowedChain`) explains the
  threat's cause, prepend the chain's "why" (Phase 1 engine, already shipped).

## Blast radius (VERIFIED)
All four fns are in `groundedAnswer.ts`, pure (chess.js + SEE), and **kid-excluded**
(kidGameCoach imports only assembleConcept/Teaching/AppHelp — verified).

**`describeThreatRecognition` (the remedial line) — exactly TWO call sites:**
- `coachFeatureService.ts:1843` — the REVIEW opponent-threat callout (default
  path). ← David's complaint ("Careful — their move threatens…; the pattern to
  spot…"). **KILL here.**
- `learnMoveTeaching.ts:127` — inside `buildDrillThreatSpot`, whose ONLY consumer
  is `useTeachWalkthrough.ts:2669` (the LEARN "spot-the-threat" DRILL).
  `buildDrillThreatSpot` is ENTIRELY a wrapper of this fn. **DECISION: KEEP here**
  — an explicit "spot it" drill is where naming the pattern is the point; that is
  NOT the "default path" David flagged. Killing it would empty the drill. So the
  function STAYS; only the review-callout append is removed.

**The review opponent-threat callout (`coachFeatureService.ts` ~1828–1858):**
`"Careful — their move threatens {san}: it {detail}."` (KEEP — concrete fact) +
`describeThreatRecognition` (:1843, **REMOVE**) + `describeThreatPrevention`
(:1847 "The answer: …", KEEP — board-proven, not remedial). Add the spelled,
rating-scaled continuation.

**Deep spelled threat lines ALREADY EXIST** in `augmentWithProjections`
(coachFeatureService.ts): #5 deep student threat `maxPlies:7` (:2617), #5c deep
opponent threat `maxPlies:7` (:2667), gated on `isForcingProjection`; `staticThreat`
→ #4b `computePvLine(maxPlies:4)` bridge (:2559). **REVIEW-only** (uncapped;
capped production returns early at :2769 after the punishment pass). So "spell the
line" in review = rating-scale these existing passes, don't build new.

**Other `detectNewThreat` consumers (unaffected by the remedial kill, but the
spelled-line upgrade could extend to them later):** `reviewMoveBriefing.ts:237`
(review+openings, has register param), `reviewTeachingPoints.ts:382` (review
deepest-lookahead), `engineDeltaLines.ts:54` (LEARN via useTeachWalkthrough +
OPENINGS play), `learnMoveTeaching.ts:125` (LEARN drill). `describeStudentThreat`
: `coachFeatureService.ts:1766` + `reviewFullData.ts:345` (review facet).

**Rating scaling of threat depth today: NONE.** Depth is uniform engine plies
(1-ply static → maxPlies:7 deep). The only rating-scaled review element is
`renderCausalChain` (:1349). So Phase 2 ADDS the rating scale — reuse the plan's
depth tiers, do NOT add a second curve (principle 8).

**Gates/tests:** `reviewNarrationFidelity.test.ts` (THE core — tests all 4 fns
incl. describeThreatRecognition :226), `reviewMoveBriefing.test.ts`,
`learnMoveTeaching.test.ts` (buildDrillThreatSpot :80), `engineDeltaLines.test.ts`,
`learnDeltaAudit.test.ts`. `threatCheck.test.ts` is UNRELATED (different subsystem).
Per "update the audit before you run it": the review-callout test that asserts the
remedial line must flip to assert its ABSENCE + the spelled line.

## Recommended build order (surgical)
1. **Kill the remedial append** at `coachFeatureService.ts:1843` (review callout).
   Keep detail + prevention. Update `reviewNarrationFidelity` accordingly.
2. **Rating-scale the deep-threat depth** — `augmentWithProjections` #5/#5c
   `maxPlies` from a rating tier (`<1400→3, <1800→4, <2000→6, else 7`, min 1)
   instead of the uniform 7. One shared helper (the single depth source,
   principle 8).
3. **Spell for everyone (in review):** let the capped production path run the
   deep-threat pass (not only uncapped) so the spelled line reaches every review,
   rating-scaled — bounded by budget/timeout so it never stalls the walk.
4. **Attach causal "why"** where `buildCausalChain`/`findAllowedChain` proves the
   threat's cause (Phase 1 engine, shipped) — prepend the chain line to the callout.
5. Board-truth audit: extend the causal-chain audit's board reader to the spelled
   threat line (every named ply true on the board).

## 🚩 Recommendation to David (sequencing)
Phase 2 edits the delicate REVIEW narration pipeline (`augmentWithProjections`,
~350 lines, paying-adjacent). Phase 1 is on the branch but NOT yet merged/prod-
audited. Cleaner, reversible order: **merge PR #931 → run the Phase 1 prod audit
→ then execute Phase 2** on a verified base, rather than stacking two unaudited
phases on one branch. The map above is ready to execute the moment you want it.

## Tests this phase will ship
- The remedial line no longer appears on the default path (a "does NOT come out"
  gate).
- Threat depth scales: 1400 vs 1800 spelled line differs in ply count.
- Every spelled ply is board-accurate (extend the causal-chain audit's board-
  truth reader to the threat line).
- Forced vs best-but-not-forced framing is honest.
