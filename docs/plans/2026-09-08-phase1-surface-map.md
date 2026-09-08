# Phase 1 Surface Map — weakness→selector wire + the adaptive score

**The §0 pre-build gate for Phase 1** of `docs/plans/2026-09-08-unified-coach.md`.
No code until this map is written and reviewed. Status: **COMPLETE — ready for
David's review before code.**

## TL;DR (read this, then the detail below)
- **The match is harder than "boost a clause."** A weakness is a cluster id like
  `analysis:tactic:fork`. Live facts carry a DIFFERENT enum (`TacticPatternType`)
  than weaknesses (`TacticType`), with NO normalizer today. Phase 1 must build
  that normalizer, and the boost applies at THREE fact-assembly sites, not one.
- **The funnel covers 3 surfaces.** `computePositionFacts` feeds learn+play+
  openings; review is a separate wire. Both get an optional, inert-until-fed
  `studentWeaknesses`.
- **The profile is precomputed once per game** (async Dexie: `getUnifiedWeaknessProfile`
  + `getWeaknessLifecycle`) and threaded down — a real wiring cost in 4 surface
  components, not just a leaf edit.
- **Scope call for David (§SCOPE):** do all three match sites in Phase 1, or ship
  the positionFacts/positional slice first and tactic-motif matching second?

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

## The student-model shapes I consume (VERIFIED)

- **`UnifiedWeakness`** (weaknessSpine.ts:56) — identity is `tag`/`key` (a cluster
  id like `analysis:tactic:fork`), NOT `label` (display-only). Recurrence:
  `openCount` (primary rank), `total`, `severity` (0–100), `lastSeenAt`,
  `sources` (`coach`|`analysis`), `puzzleThemes` (Lichess camelCase), `positions`
  (the student's own flubbed FENs — real boards for a custom session later). NO
  status enum here.
- **`WeaknessLifecycleEntry`** (weaknessLifecycle.ts:30) — `clusterId` (== the
  analysis `UnifiedWeakness.tag`/`key`), `status`
  (`fixed`|`persistent`|`emerging`|`occasional`), `trend`
  (`improving`|`worsening`|`flat`), `recentCount`/`olderCount`, `worstCpLoss`.
  Built ONLY from `mistakePuzzles` → it joins the ANALYSIS half of the profile;
  coach-side `coach:*` keys have no lifecycle entry. `sampleFloorMet` is false
  below 4 games / 6 slips — "need more history," never guess (respect it: no
  boost when the floor isn't met).
- **The join:** `WeaknessLifecycleEntry.clusterId` === `UnifiedWeakness.tag` for
  analysis rows (both from `bucketForMistake`). So `WeaknessSignal` = a
  UnifiedWeakness row + its lifecycle status/trend (left-joined on tag).

### `WeaknessSignal` (the precomputed shape to add)
```
interface WeaknessSignal {
  clusterId: string;      // UnifiedWeakness.tag/key, e.g. 'analysis:tactic:fork'
  bucket: MisconceptionBucket;
  label: string;          // display only
  openCount: number;
  severity: number;       // 0-100
  lifecycleStatus?: 'fixed'|'persistent'|'emerging'|'occasional';  // undefined = coach-only row / floor not met
  trend?: 'improving'|'worsening'|'flat';
  puzzleThemes: string[];
}
```

### 🔴 The concept-match problem (the real Phase-1 work)
positionFacts clauses are NOT tactic-typed — they are `kind`s (`must-defend`,
`latent-danger`, `deliberation`, `fundamental`, `convert`…). Tactic-motif facts
(fork/pin/…) live in a DIFFERENT pipeline (`tacticsDetector` / `liveTacticsContext`
→ `TacticPatternType`) and in causal-chain nodes. So matching a weakness to a
fact splits by weakness type, across THREE sites:

1. **positional/defensive holes → positionFacts clause `kind`.** Map bucket/
   clusterId → ClauseKind: hangs-pieces (`analysis:tactic:hanging_piece`) ↔
   `must-defend`; walks-into-pins/skewers ↔ `latent-danger`; conversion
   (`analysis:conversion-endgame:*`) ↔ `convert`/`status`; decision/blunder-prone
   ↔ `key-moment`.
2. **tactic-motif holes → the tactic-fact pipeline + causal-chain nodes.**
   Requires a **NEW normalizer** `TacticPatternType → TacticType` (none exists):
   `discovery→discovered_attack`, `removal_of_guard→removing_the_guard`,
   `overload→overloaded_piece`; `fork/pin/skewer/back_rank/double_check/
   trapped_piece` verbatim; `mate_threat`/`battery` have no TacticType (→ no
   match). Then `analysis:tactic:<TacticType>` compares to `clusterId`.
   Causal-chain nodes already carry `fundamentalId` + misconception tag — match
   there directly.
3. **teachable-concept roll-up** exists: `conceptForCluster(clusterId, bucket)`
   (weaknessConceptMap.ts:71) → `{behavior, conceptQuery, conceptName}` for the
   theory/teaching text once a hole is matched (used more in P3/P5).

The reusable leaf is `matchesWeakness(factConcept, signals) → WeaknessSignal|null`
+ `boostFor(signal)` (persistent+worsening = big, emerging = medium, fixed/none =
0). `applyWeaknessBoost(clauses, signals)` uses it for site 1; the tactic-fact
assemblers + causal chain call the same `matchesWeakness` for sites 2/3.

## The per-game precompute + rating source (wiring cost — VERIFIED)
The profile is async Dexie (`getUnifiedWeaknessProfile` + `getWeaknessLifecycle`)
→ compute ONCE per game/session, hold in state/ref, thread down. Rating source
per surface (canonical resolver `studentPlayingRating(profile)` =
coachGameEngine.ts:992, `currentRating ?? puzzleRating ?? 1200`):
- **review** — `CoachGameReview` `playerRating` PROP (game-Elo-derived per color);
  `buildReviewSegments` takes `rating` param. Hang the precompute off the same
  prop chain (CoachReviewSessionPage / CoachGamePage).
- **learn** — `CoachTeachPage` reads store `activeProfile` via
  `studentPlayingRating` (play) / `puzzleRating??currentRating??1200` (tactics).
- **play** — `CoachGamePage` `studentPlayingRating(activeProfile)`.
- **openings** — `OpeningPlayMode` `activeProfile.currentRating ?? 1420`.
So 4 surface components gain a "load weakness profile once, pass down" wire.
Kid passes NOTHING (excluded).

## Gates + audits each affected surface owes before "done"
- **Cross-cutting (must stay green):** `coachInversion.gate.test.ts` (G0),
  `laneReachability.test.ts` (no dead lanes), `narrationAccuracy` /
  `narrationGrounding` / `perspectiveVoice` / `narrationFactCheck`,
  `bucketPipelineAudit.test.ts` (the weakness capture→bucket→drill delivery — most
  relevant to a weakness precompute).
- **review:** `coachFeatureService.test.ts` + `.causalChain.test.ts`,
  `coachTurnTruth.test.ts`, `bestReplyRanking.test.ts`; audits
  `audit-coach-review.mjs`, `audit-review-real-game.mjs`,
  `audit-review-overhaul-prod.mjs`.
- **learn:** `danyaDeviceCoverage`/`danyaExploitability`, `playCommentary.test.ts`;
  audits `audit-coach-teach-unknown-line.mjs`, `audit-teach-on-topic-prod.mjs`,
  `audit-coach-teach-functional.mjs` + `-loop.mjs`.
- **play:** `coachHubCopy.test.ts` (silent-until-asked), `useDiscussionPractice.test.ts`,
  `playCommentary.test.ts`; audits `audit-coach-play.mjs`, `audit-coach-full-games.mjs`.
- **openings:** the punish-gems loop / WLPP audits (unchanged — only whyBestMove
  ordering shifts).
- **tactics:** unaffected by the funnel, but if site-2 tactic-fact boosting lands,
  `tacticsDetector.test.ts` / `liveTacticsContext.test.ts` + `audit-tactics.mjs`.

## SCOPE — the one call for David before code
Phase 1 leaf + precompute + wiring is fixed. The question is match-site breadth:
- **Option A (narrower, ship first):** sites 1 only — positional/defensive holes
  boost positionFacts clauses across learn/play/openings + review. Tactic-motif
  boosting (sites 2/3 + the normalizer) is Phase 1b. Smaller, fully contained in
  the funnel + review.
- **Option B (complete):** sites 1+2+3 in one phase — build the normalizer and
  boost tactic facts + causal-chain nodes too, so a fork-blind student is served
  everywhere in one go.
Recommendation: **B** — the normalizer is small, and "hits a hole THIS student
keeps falling in" is mostly TACTIC holes (fork/pin/hanging), so A alone would
miss the most common case. But it touches the tactic pipeline (more surfaces),
so it's the bigger blast radius. David's call.

## Tests this phase ships (a "note comes OUT" per affected path)
- `weaknessSignal.test.ts` — persistent+worsening fork hole → boosted; fixed hole
  → no boost; empty profile → identity.
- `positionFacts` weakness test — same board, persistent must-defend hole →
  must-defend clause leads with higher rank than default student.
- A learn + a play path test that the boosted order comes OUT of the surface.
- Review: buildReviewSegments weakness-boost test.
