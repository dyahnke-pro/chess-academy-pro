# Phase 1 Surface Map — weakness→selector wire + the adaptive score

**The §0 pre-build gate for Phase 1** of `docs/plans/2026-09-08-unified-coach.md`.
No code until this map is written and reviewed. Status: **DRAFT — awaiting the
orphan-adaptive + gates/shapes maps (agents in flight).**

## What Phase 1 changes (the shared computers)

1. `PositionFactsInput` (positionFacts.ts:32) — ADD `studentWeaknesses?: WeaknessSignal[]`.
2. `computePositionFacts` (positionFacts.ts:149) — after `buildClauses`, run a
   pure `applyWeaknessBoost(clauses, weaknesses)` post-pass: bump the `rank` of
   any `ClauseItem` whose `kind`/concept matches a persistent student hole,
   re-sort. (buildClauses itself stays UNCHANGED — the boost is a separate,
   unit-testable function.)
3. `computeImportance` (narrationImportance.ts:82) — the tier ranks stay; the
   per-fact boost is applied at the clause layer (where facts carry a `kind`),
   not here. `computeImportance` may gain an optional `weaknessBoost?: number`
   only if a cleaner design needs it — TBD after the concept-map agent returns.
4. NEW leaf `src/services/weaknessSignal.ts` (proposed) — `WeaknessSignal` type
   + `toWeaknessSignals(profile, lifecycle)` builder + the
   weakness-bucket→ClauseKind mapping + `applyWeaknessBoost`. Pure, G0, tested.

## Blast radius — every consumer (from the consumer map, VERIFIED)

The three functions nest: `criticalityThresholds` ← `computeImportance` ←
`computePositionFacts`. Radius by surface:

### `computeImportance` — ONE production consumer
- `positionFacts.ts:174` (inside `computePositionFacts`). Its entire live radius
  = whatever reaches `computePositionFacts` (below). All other refs are tests.

### `computePositionFacts` — 5 callers → learn / play / openings
- `whyBestMove.ts:61` (`computeWhyBestMove`) → **play** (CoachGamePage.tsx:4240)
  + **openings/WLPP** (OpeningPlayMode.tsx:116).
- `usePhaseNarration.ts:567` → **learn** (CoachTeachPage.tsx:6248) + **play**
  (CoachGamePage.tsx:1748).
- `usePositionNarration.ts:234` ("Read this position") → **learn**
  (CoachTeachPage.tsx:6233) + **play** (CoachGamePage.tsx:1711).
- `useLiveCoach.ts:220` (live interjections) → **play** (CoachGamePage.tsx:957).
- `CoachTeachPage.tsx:7683` (direct) → **learn**.
- Every caller already passes `rating`, `studentColor`, `analysis`. Result is
  only ever used to GATE + RANK narration (never scoring/legality/persistence) —
  so a re-rank post-pass is safe for all of them.

### `criticalityThresholds` — 4 sites (one reaches REVIEW independently)
- `narrationImportance.ts:84`, `positionFacts.ts:145` — inside the funnel above.
- `reviewTurningPoint.ts:64` (`minSwingPawns`) → **review** (CoachGameReview.tsx:48
  via `buildTurningPointQuestion`). Review does NOT go through
  `computePositionFacts` — its weakness wire is separate (buildReviewSegments,
  which already receives `rating`; it would also receive the weakness profile).
- `scanCriticality.ts:121` → `walkForcedSequence` (onlyMoveSequence.ts) has NO
  production importer (test-only). Editing `criticalityThresholds` won't move any
  live surface through that branch.

### NOT affected (verified)
- **chat** (/coach/chat) — the chat spine (coachService/coachApi) reads only the
  `isWhyBestMoveQuestion` intent flag; never calls `computeWhyBestMove`/
  `computePositionFacts`.
- **tactics** (/tactics/*), **endgame** (/coach/endgame) — don't mount the hooks
  or import these services.
- **kid** (/kid/*) — VERIFIED clear directly AND transitively. `kidGameCoach.ts`
  imports coachApi/voiceFacts/liveTacticsContext/etc., none of which reach
  positionFacts/narrationImportance/criticalityScan. KEEP kid excluded — do NOT
  pass `studentWeaknesses` on any kid path.

## Register per affected surface (the boost must stay correct in each)
- **learn** (present-tense): phase-transition + read-position + direct teach call.
  A boosted clause must still read present-tense; the boost changes ORDER/rank,
  not tense (the text is authored in buildClauses per surface conventions).
- **play** (silent-until-asked): the boost re-ranks the SAME facts play already
  volunteers (phase transitions) or answers on request (whyBestMove,
  read-position). It must NOT make play start volunteering more — the boost
  changes order/depth of what already fires, gated by play's existing triggers.
- **openings/WLPP**: whyBestMove answer ordering only.
- **review**: separate wire via buildReviewSegments (rating already threaded).

## Contract delta
- `PositionFactsInput.studentWeaknesses` is OPTIONAL → every existing caller
  compiles and behaves identically until it opts in (no weaknesses passed = no
  boost = today's behavior). This is the safety property: the wire is inert until
  a surface feeds it.
- `applyWeaknessBoost([], clauses)` (empty profile) is the identity function.

## PENDING (fill when agents return)
- [ ] Orphan adaptive functions to be aware of (P7 roll-in list) — agent 2.
- [ ] `WeaknessSignal` exact shape from `UnifiedWeakness` + `WeaknessLifecycleEntry`;
      the weakness-bucket → ClauseKind/concept mapping vocabulary — agent 3 Part A.
- [ ] Gates + audits each affected surface owes before "done" — agent 3 Part B.
- [ ] Where each surface obtains `rating` (to hang the per-game weakness
      precompute off the same source) — agent 3 Part C.

## Tests this phase ships (a "note comes OUT" per affected path)
- `weaknessSignal.test.ts` — persistent+worsening fork hole → boosted; fixed hole
  → no boost; empty profile → identity.
- `positionFacts` weakness test — same board, persistent must-defend hole →
  must-defend clause leads with higher rank than default student.
- A learn + a play path test that the boosted order comes OUT of the surface.
- Review: buildReviewSegments weakness-boost test.
