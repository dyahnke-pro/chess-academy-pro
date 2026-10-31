# WO-STORY-MATRIX-01 Phase 1: wire in the computers (design)

Written 2026-10-30 against `main` at `5e4b632`. No `src/` file has changed since `3ee5743`, where the memory maps were taken, so their line numbers still hold.

Inputs, all in `/tmp/claude-0/-home-user-chess-academy-pro/0f88d73e-3ffc-51d5-9748-a55ad2122b96/scratchpad/`:
- `p1/shapes.md`, `p1/relations.md`, `p1/stakes.md`, `p1/unwired.md`
- `memory/plans.md`, `memory/say-once.md`, `memory/story.md`, `memory/inventory.md`

Out of scope: the shared capture phrasing and its gate (Phase 1 item 4), which is being built separately. `buildInstantReplyLine` (playCommentary.ts:339) is one of the capture sayers, so that build owns it.

---

## 0. What Phase 1 has to deliver

PLAN.md WO-STORY-MATRIX-01 lists five Phase 1 items: one fact shape, every computer reaching the matrix on every surface, one per-game story state, one capture phrasing (done elsewhere), and a measurement. Phase 1 builds no bracket. At the end of Phase 1:

1. **One fact object, `CoachFact`.** Every fact enters every composer as a `CoachFact`. Its required fields are `kind`, `group`, `computer`, `id`, `seat`, `namesStudentMove`, `thread`, `stakes`, `relations` and `proof`. A producer that leaves any of them out fails to compile.
2. **One catalog of computers.** Every teaching computer that emits a fact has a row answering every surface. `lesson` is one of those surfaces, and each row also carries a phase column. A static reach check in ship-check proves every row that claims "wired" is really wired.
3. **The 57 computers are dealt with.** These are the 51 wired nowhere plus the 6 that never reach the composer. 19 are wired, 29 are deleted, and 9 stay out of the matrix, each with a named reason (verdicts in `p1/unwired.md`). None is left switched off.
4. **One `GameStory` per game.** Every surface reads and writes it. It replaces the board memories listed in §3.8.
5. **The bench reports reach.** For each computer and each surface it shows built, reached the composer, and said.

**Rule for the whole phase:** the matrix does not exist yet, so the composers that exist today (`composeThought`, `decide`, `decideTurn`) are the consumers. A new field lands in the same step as its first reader, so no commit leaves something built but unwired (G8.5).

---

## 1. Step order

Each step is one commit, or a short series of commits where marked. Each must pass `npx vitest related <files> --run` and the tests and bench run named for it. Before each commit, run `node scripts/surface-map.mjs --changed`. Commits go on the session branch. Phase 1 ends with one `npm run ship-check`, one push to `main`, and the muted prod audits read line by line (PLAN "Rules held throughout").

| # | Step | Changes what is said? |
|---|---|---|
| P1-0 | Instruments and baselines | no |
| P1-1 | Delete the dead and switched-off producers | no live voice changes; one route moves (§2) |
| P1-2 | One win-chance converter | no (byte-identical) |
| P1-3 | `CoachFact` M0: `kind`, `group`, `computer` | no (byte-identical) |
| P1-4 | One group table, plus the catalog's lesson surface and phase column | yes, at a listed set of points |
| P1-5 | Doors take objects, text joins deleted | no (identical decision rows) |
| P1-6 | Producers emit `CoachFact`; adapters deleted (5 commits) | no (identical decision rows) |
| P1-7 | One reader per relation, the relation snapshot, `causalChain` and `boardDelta` read it | yes, small; truth fixes |
| P1-8 | `GameStory` (5 commits) | yes: takeback, second game, Review explore |
| P1-9 | Engine reads reach the move's facts; the six plus the IP-1 computers are wired | yes: reach rises, word count measured |
| P1-10 | Stakes as win chance under four rules | yes: rank changes |
| P1-11 | Needs and causes on every fact | yes: support links |
| P1-12 | The remaining wires and deletes | yes, per computer |
| P1-13 | Close: reach gate, ship-check, push, prod audits read | no |

**Why this order.** Each item below is a risk from §5 and the ordering choice that reduces it.

- **Measure first.** P1-0 is first so that every later step is a diff against a recorded baseline.
- **Delete before migrating.** P1-1 shrinks the number of producers P1-6 has to convert.
- **Byte-identical refactors before any behaviour change.** P1-2, P1-3, P1-5 and P1-6 are each proven against the bench report and the decision rows. P1-4 is the only early step that changes order, and only at listed points.
- **Story state before the new facts.** `GameStory` (P1-8) comes before wiring (P1-9). More facts poured into split memories would multiply repeats; lessons keep no memory at all today.
- **Reach before rank.** Wiring (P1-9) is separate from stakes (P1-10). Build 4 changed both at once and could not tell which one cost the 1.6 points.
- **Needs and causes last** (P1-11). They need every producer's line and squares in place, and the snapshot (P1-7).

---

## 2. Steps in detail

For each step: files touched, type changes, the tests that fail on the old code, the measurement, and what is deleted.

### P1-0 Instruments and baselines (no product change)

**Files and changes:**
- `src/services/danyaBench.measure.test.ts`
  - Add a REACH table. Each fact is tagged with the computer that made it, using a temporary provenance map that P1-3's `computer` field later replaces.
  - Per computer and per surface (`lesson` = `moveThoughtFacts` output; `review` = the facets and thought facts handed to `decide`; `chat` = the live composer's candidates, the bench's `liveCandidates` source at :409), report three counts:
    - **BUILT:** the computer produced a fact on the note.
    - **REACHED:** that fact is in the composer's input.
    - **SAID:** the composer kept it.
  - Learn is not reachable from the bench, because its door input is assembled in `CoachTeachPage`. Learn reach comes from the `learn-turn-decision` rows of `audit-concept-gameplay-prod` and from the replay fixtures below.
- **`scripts/computer-reach.mjs`**
  - Commit the scratch static-reach tool (`memory/reach.cjs` and `memory/symgraph.cjs`, the TypeScript AST path from each surface root to each computer).
  - It writes `docs/computer-reach.json`. Its first report must reproduce 355 computers and 51 wired nowhere.
- **The short game as a committed fixture**
  - `src/test/fixtures/gotham-jelena.json` holds 27 plies plus the cached MultiPV reads from `scratchpad/onegame/jelena-reads/reads-0.jsonl`, so vitest needs no engine.
  - `src/services/shortGame.measure.test.ts` prints each ply's lesson line and Review line. In this step it is a measurement, not an assertion.
- **Decision-row baseline**
  - `src/test/decisionRows.baseline.test.ts` writes every `coach-decision` row (coachDecisionEvents.ts:29) and spoken output from:
    - Review's fixture builds (`buildReviewSegmentsForTests`);
    - the Learn replay fixtures (`replayFence.*.test.ts`, `replayFence.*.rewalk.test.ts`, `walkOct1Learn.test.ts`).
  - Output goes to `audit-reports/.fixtures/decision-baseline.json`.
  - P1-2, P1-3, P1-5 and P1-6 must reproduce it byte for byte.

**Baseline to record:**
- `DANYA_BENCH=1` report at `5e4b632`. Build 5 shipped any idea 42.2% and lead idea 31.8% held out (thoughtComposer.ts:147-155 comment).
- The REACH table.
- The short-game dump.
- The decision baseline.

### P1-1 Delete the dead and switched-off producers (G8.5 rule 4)

Each one has zero live voice or zero callers (verdicts in `p1/unwired.md`). Before each delete, grep every consumer.

**Play producers behind the off switch.** Keep the record path: `raiseWhyForSlip` stays.
- `assembleSlipNarration`: groundedAnswer.ts:6218, gated at CoachGamePage.tsx:3821.
- `generateMoveCommentary`: coachMoveCommentary.ts:128, gated at :4131/:4182. It is also an LLM producer (G0).
- `buildPlayEntryNarration`: playEntryNarration.ts:80, gated at :631.

**No callers:**
- 12 dead `coachTemplates`. Only `takeback_allowed` has a caller, CoachGamePage.tsx:4549.
- `conceptForSolution` (conceptEngine.ts:760). Its callers call `conceptForLine` directly.
- `framingSide` (conceptEngine.ts:101). The seat is required, so a guessed seat is a bug.
- `formatReadingFacts` (positionReadingService.ts:1848).
- The `questionsAnswered` slot in learnMemory: no reader; its only write is at page :11966.
- `voiceService.resetSpokenMemory` (:2172).
- The `THOUGHT_REGISTER.learn` and `.chat` rows (thoughtComposer.ts:123-128). The `Record<ThoughtSurface>` shrinks to `lesson | review`.
- The `extra` parameter of `lessonThought` (moveThoughtFacts.ts:224). None of its 5 callers pass it.

**A second Review:** `gameNarrationBuilder` (gameNarrationBuilder.ts:57). Route `/coach/session/narrate` (CoachSessionPage.tsx:298, coachSessionRouter.ts:343) to the Review walk.

**Recites the record:** `drilledTransferLine` (learnBoardTeaching.ts:808), covered by the 2026-10-28 rule (OUTLINE.md:287). `lastTimeHere` is **not** deleted: OUTLINE.md:287 and PLAN.md:328 record it as kept on David's call.
- **Test that fails on the old code:** widen `RECALL` in coachNoRecall.test.ts:12 to cover "you drilled … this time you found it".

**Remove from the inventory only:** `legacyTacticGeometry`, a test fixture by design.

**Measurement:**
- The bench report is unchanged.
- `audit-play-silent-prod.mjs` still passes; it is the switch's own audit.
- `gameNarrationBuilder`'s route change is the only user-visible change.

### P1-2 One win-chance converter (rot rule, byte-identical)

**Files:**
- New leaf `src/services/winChance.ts` with `winningChances(cp)` (−1..1), `winChancePercent(cp)` (0..100), `seatCp(line, seat)`, `moverCp(fen, line)`, and one mate constant.
- `expectedScore(cp)` (0..1) and `wcGap(cpFor, cpAgainst)` are NOT in P1-2: nothing reads them until P1-10, and an export with no caller is parked code (G8.5). They land in the leaf with their first reader in P1-10.
- Delegate to it:
  - `accuracyService.winPercent` (:28-31). Keep its ±1500 cap as an explicit argument.
  - `turningPoints.winChance` (:113-115).
  - `humanMove.winningChances` (:86-88).
  - The five private line-value-from-the-mover's-seat copies:
    - speedRunReads.ts:42, orderReads.ts:40, opponentMoveReads.ts:69 (`seatCp`);
    - deliberation.ts:205 (`moverEval`);
    - refutedAlternativeCore.ts:232 (inside `alternativeCostCp`).

**Gate:** `oneWinChance.gate.test.ts` fails on any `0.00368208` outside `winChance.ts`. It fails today on 3 sites: turningPoints.ts:114, humanMove.ts:87, accuracyService.ts:30.

**Measurement:**
- The existing tests of all eight callers stay green with no number changed.
- The bench report is byte-identical.
- `humanMove.measure.test.ts` is unchanged.

### P1-3 `CoachFact` M0: the type, output byte-identical

**New leaf `src/services/coachFact.ts`:**
- `type FactGroup` with 14 members: `story | name | structure | verdict | danger | theirSide | notYet | move | choices | line | tactics | technique | concepts | habit`.
- `GROUP_STEP: Record<FactGroup, (seat: Seat) => ThoughtStep>`.
  - For identical output, all five "board" groups (story, structure, tactics, technique, concepts) map to `'board'`.
  - `move` maps to `'yours'` and `theirSide` to `'theirs'`.
- `interface CoachFact extends ThoughtFact`, with these REQUIRED additions:
  - `kind: FactKind`. This is the one vocabulary already declared at reviewFacetRank.ts:406-412 (`FacetTag | ClauseKind`). It is widened with every kind the lesson adapter needs: `move-job`, `deep-fact`, `binding`, `route`, `not-yet`, `stop`, and one kind per briefing aspect.
  - `group: FactGroup`, always read from `FACT_GROUP[kind]`, never set by hand.
  - `computer: ComputerName`, a key of the new catalog `COMPUTER_CATALOG` (§3.2).
- `step` becomes derived: `GROUP_STEP[FACT_GROUP[kind]](seat)`. `ThoughtFact` becomes an alias of `CoachFact`, so `composeThought` (thoughtComposer.ts:194) is untouched.

**Where a new member fails to compile:**
- `FACT_GROUP: Record<FactKind, FactGroup>`: a new kind needs a group.
- `GROUP_STEP: Record<FactGroup, …>`: a new group needs a step.
- `COMPUTER_CATALOG: Record<ComputerName, …>`: a new computer needs a row.

**Producers changed:** only `add()` (moveThoughtFacts.ts:89-100) and the not-yet push (:196-199). Each call names its `kind`.

**Tests:**
- `coachFact.test.ts`: every lesson fact's derived step equals the step it carried at `5e4b632`, checked on the bench's positions.
- The decision baseline and bench report are identical. The fields `stakes`, `thread` and `relations` are **not** added here (§0 rule).

### P1-4 One group table, plus the catalog's lesson surface and phase column (M1)

**Type changes:**
- One `FACT_GROUP: Record<FactKind, FactGroup>` (in `coachFact.ts`) replaces the step role of all four step tables.
  - FACET_STEP (reviewFacetRank.ts:384), CLAUSE_STEP (:364) and FACT_STEP (:412) become derived from it, then are deleted once nothing reads them.
  - THOUGHT_STEP (learnTurnDoor.ts:236) is derived for lanes through the lane's REQUIRED `kind`. Lanes that carry many kinds (`positionFacts`, `phase`) use the fact's own kind, as `thoughtStepOf` :262 does today.
  - STORY_TAG (coachFeatureService.ts:1319) is deleted. Story facts carry kinds.
- `CoachSurface` (boardComputers.ts:45) gains `'lesson'`. Every one of the 20 `BOARD_COMPUTERS` rows fails to compile until it answers the lesson surface.
- `ComputerSpec` (boardComputers.ts:162-165) gains three REQUIRED fields:
  - `group: FactGroup`. The 20 registry reads stop being relabelled per surface.
  - `phase: ReadonlySet<GamePhase | 'any'>`.
  - `kind`.
- `LANE_PHASE` (learnTurnDoor.ts:312) becomes derived from the catalog's phase.
- **Consumer of `phase`:** `readBoard` / `readBoardAll` skip a computer outside its phase, so it is never computed and then held.

**The order changes, all of them:** each settles a measured disagreement with one answer, decided by the plan's bundle definitions (PLAN Phase 2 regions table).

| Fact | Today | Group |
|---|---|---|
| `timing` | FACET notYet, CLAUSE yours | notYet |
| `capture-choice` | FACET choices, CLAUSE yours | choices |
| `prevent-test` | FACET notYet, CLAUSE choices | notYet |
| Registry `moveOrder` | Learn yours / Review notYet (reviewFullData.ts:1520) / live yours | notYet |
| Registry `bookMove` | Learn yours / Review name (:1522) / live rule→yours | name |
| Registry `priorityFirst` | Learn choices / Review and live habit (positionFacts.ts:1246) | **bench decides** |
| The 10 story beats | Learn: 5 steps (STORY_LANE :286); Review: all `name` | story; `identity` → name; `fork` → **bench decides** |

For the two "bench decides" rows, the plan's definitions leave two candidates, so the bench picks the step Danya says that idea in. This is a measured placement, not a behaviour question for David.

**Tests:**
- `oneGroupTable.gate.test.ts`: no table other than `FACT_GROUP` maps a kind, lane or beat to a step or group. It fails today on 4 tables.
- A test that `[timing]` lands in the same step through the door (coachDecider.ts:523) and through the walk (coachFeatureService.ts:2502). It fails today: yours vs notYet.

**Measurement:**
- Bench before and after: any and lead held out ≥ 42.2% / 31.8%.
- The decision-baseline diff lists only the rows the table above predicts.
- `audit-review-overhaul-prod` is run once on the branch, on localhost, against David's record.

### P1-5 Doors take objects, text joins deleted (M2)

**Type changes:**
- `CoachFact` gains REQUIRED `id: string` and `namesStudentMove: boolean`. Both already have readers: the joins below, and the Learn door's names-no-move rule.
- `VoiceFact` (voicePackage.ts:98) gains `factId`. `buildVoicePackage` carries it through `kept` and `dropped`.
- `FactBundle` (coachDecider.ts:205-257) becomes `facts: readonly CoachFact[]`. The text-keyed maps `squares`, `stakes`, `claims`, `family`, `proofs`, `holeByFact`, `skillOf` and `incoming` are deleted, so `selectFacts` and `supportedFacts` (factSelector.ts:209/:308) read fields.
- `LaneFact` (learnTurnDoor.ts:503-545) becomes `CoachFact & { lane }`.

**The four door entries become `toCoachFact` adapters, deleted again in P1-6:**
- positionFacts.ts:1322-1341
- coachFeatureService.ts:2875
- learnTurnDoor.ts:684-690
- learnTurnDoor.ts:1183

**Deleted:**
- `laneOf` / `stakesOf` / `roleOf` (learnTurnDoor.ts:701-727, substring joins on prose).
- `laneOfKept` (:1014).
- `rekeyFacet` (coachFeatureService.ts:2101-2110), which re-copies 7 maps when words change.

**Test that fails on the old code:** two Learn facts whose texts are substrings of each other ("It also guards e5" / "guards e5"). Today `laneOf` attributes the kept fact to the first lane that contains the text; after the change it is attributed by id.

**Measurement:**
- The decision baseline and spoken output are byte-identical.
- `coachDecider.test.ts` and `learnTurnDoor.test.ts` are green.
- `coachDecisionEmits.test.ts` is green, so every return path still emits.

### P1-6 Producers emit `CoachFact`; adapters deleted as each empties (M3, five commits)

Each commit converts one producer family, deletes the adapter it emptied, and reproduces the decision baseline.

| Commit | Producers | Adapter / plumbing deleted |
|---|---|---|
| 6a | `BOARD_COMPUTERS` 20 → `read()` returns `CoachFact` (`BoardRead` boardComputers.ts:50-95 deleted; `HeldRead` becomes the fact's held form) | positionFacts.ts:1233-1260 `push(kind, rank, …)`; reviewFullData.ts:1495-1525 `add(tag, r)`; the per-surface relabels in CoachTeachPage |
| 6b | `TeachingHint` (learnBoardTeaching.ts:101-131, ~35 lane literals + orderTeaching.ts 8) | `REVIEW_TAG_FOR_LANE` (coachFeatureService.ts:136, :2236) |
| 6c | `ClauseItem` 40 sites (positionFacts.ts:390-445) | `ClauseItem.rank` and the hand-rank ternaries (:1208, :1225); the positionFacts door adapter :1322 |
| 6d | Review facets: 69 push sites in `computeMoveFacets` plus ~22 tag literals in coachFeatureService.ts | the `"[tag] text"` string form and its out-maps (reviewFullData.ts:290-319); the facet adapter :2875 |
| 6e | `queueSpokenHint` (CoachTeachPage.tsx:10145, 15 positional params, 40 call sites) takes one `CoachFact`; `PhaseFact` (positionFacts.ts:485) becomes `CoachFact` | the pending-line adapter (page :12075); learnTurnDoor.ts:1183 |

**Also in 6a–6e:**
- `StoryFact` (openingStory.ts:44-57) emits `CoachFact`; `STORY_LANE` keeps only the lane (the speaking slot).
- The three phantom `ThoughtSource`s (`moveWhy`, `refuted`, `alternatives`, thoughtComposer.ts:51-52) stay until P1-9 gives two of them real producers and deletes `moveWhy`.

**Test:** `oneFactShape.gate.test.ts` fails on any construction of `ClauseItem`, `TeachingHint`, `BoardRead`, `PhaseFact`, `StoryFact` or a facet string in `src/`. Today it fails at hundreds of sites; at 6e it reaches zero.

**Measurement:** the decision baseline and spoken output are identical after each commit; bench identical.

### P1-7 Relations: one reader each, the snapshot, and its first readers

**7a: one definition per relation** (relations.md §2, rot rule). These change output where the readers disagree, so each is measured.

- **Pins:** export `findPins` (tacticsDetector.ts:160). `tacticClassifier.detectPin` (:181), `nextPlans.isPinnedPiece` (:147, which is `findPins` filtered to absolute pins) and `kingSafety.absolutePinRay` (:277) delegate to it.
  - Test: an agreement suite over the `tacticsDetector.test` fixtures. It fails today where `nextPlans` walks its own ray.
- **Open files:** `findOpenFiles` (positionReadingService.ts:1609) delegates to `describeStructure` (boardStructure.ts:241).
- **King shield:** `kingSafety.shieldCount` (:52-57) and `boardStructure` `shieldPawns` (:180-192) both claim to be "the ONE" (tradeQuality.ts:98), and `reviewMoveBriefing` reads both (:131, :390).
  - Rule: one module. Either one definition, or two named concepts if the bench shows the two jobs differ (the castled shelter vs any king's cover).
  - Same treatment for the king zone: boardDelta.ts:55 uses a radius ≤ 2, kingSafety.ts:256 uses ≤ 1.

**7b: new leaf `src/services/relations.ts`:**
- `Relation`, a discriminated union: `guard | attack | pin | loose | hanging | file | passer | cover | zone | material | check | hole`.
- `relationKey`; `snapshot(fen)`, memoised in a bounded first-in-first-out cache like openingStory.ts:88-98; `diff(a, b) → { gained, lost }`; `lineDiff(line: SpokenLine)`.
- A pinned guard is marked `guard-pinned`. Guards are otherwise geometric, so a pin-blind guard would claim a defence that cannot happen (causalChain.ts:33-42 `winnableGain`).
- **Kept out of the eager snapshot:** `detectTactics` (20.9 ms average, up to 103) and `findPinBreaks` (23.7 ms, up to 112). Measured in `p1/time.log`; their facts carry their own relations.
- **Where a new member fails to compile:** `RELATION_RENDER: Record<RelationKind, …>`.

**7c: the first live readers** (G8.5: the snapshot ships with callers):
- **`causalChain`:**
  - Widen `CausalRelation` (causalChain.ts:62-69) to the relation kinds.
  - Keep `CausalEdge` and `CausalStance` (:108, :120).
  - Rebuild the two patterns (:425, :573) as reads of snapshot diffs over the plies' own boards.
  - Delete `replay` (:227) and `plyPieceArrived`'s per-ply replay (:355). Cost today is O(n²), 4.8 ms average per ply. Review calls it every ply three times (coachFeatureService.ts:2049-2052).
- **`computeBoardDelta`** (boardDelta.ts:65) becomes a renderer over `diff`. Its five categories map onto atoms. Delete its private `attackSet` (:42).

**Tests that fail on the old code:**
- `relations.test.ts`: on the 13.Bxf7+ board (FEN in relations.md §2), `lineDiff([Bxf7+, Kxf7, Qxd8])` loses `guard:d8<e8` and gains `loose:d8`, and material goes from −1 to +8.
- A pinned "guard" no longer counts as a guard in `causalChain`'s removed-defender pattern.
- `causalChain.test.ts` and `boardDelta.test.ts` fixtures produce the same chains and sentences, except where a pinned guard was counted.

**Measurement:**
- Bench and Review fixture diff.
- **Phone cost:** `AUTO_TRACE=1 AUTO_PROFILE=1` on `audit-review-overhaul-prod` against a local `vite build --sourcemap` preview with David's record (CLAUDE.md audit matrix, "the SCREEN staying responsive"). The review build's main-thread busy time must not rise.

### P1-8 `GameStory`: one per-game story state (five commits)

The full design is in §3.8. Each commit moves one family of memories in and deletes what it replaced.

| Commit | Moves in | Deleted / replaced |
|---|---|---|
| 8a | the say-once ledger: one claim map + one sentence-key map, each storing the ply said | Learn: `standingFactMemory` (66 lines), `positionalSaidRef`, learnMemory `spokenKeys` / `conceptTaught` / `principleTaught` / `spokenThreatLines` / `lastThreatKey` / `loudAlarms` / `spokenTacticLines` / `saidExplainers` / `pieceQualitySaid`, `fundamentalSeenRef`, `threatSaidRef`, `drilledSaidRef`; usePhaseNarration's `ownStandingRef` |
| 8b | `threads`, keyed by the plan-aim key (`nextPlans.planAimKey` :559-566), per seat; also adds `CoachFact.thread` (REQUIRED, `ThreadKey \| { none: 'local' }`) | `PlanThread` state moves in (planThread stays a step function); `planArc` `ArcState` (planArcRef, page :2036); `planMemory` (89 lines) and `foldPlans`; `TeachingPackage.planByPly` (teachingSelector.ts:134, :370-373, write-only); Review `planT` (:1646), `passerPlanFiles`, `convertTaughtPly`, `lastRaceVerdict` (:1725); `planToldBoardsRef` becomes derived; positionFacts' `plan:<id>#<n>` said-set hack (:856-869) |
| 8c | `events`: phase change, opening named, identity said, character, verdict said, promise made/paid, cause chain said, turning point (Review). The IP-3 computers are wired here: `characterOf`, `detectPhaseTransition`, `computedPlanAt` | `phaseStateRef` (page :8693, never reset today); `characterRef` (:2038); `openingBreakRef`; learnMemory `identitySaid` / `spokenOpeningName` / `queuedOpeningName` / `detectedOpeningName` / `promises` / `slipsThisGame`; Review `announcedOpeningNames` / `Families` / `lastAnnouncedOpeningName` / `spokenOpening` / `storyShown` / `endgameAnnounced` / flags (:1925-1932); the second `selectTeaching` call (CoachGameReview.tsx:1530) reads the turning point from the story instead of recomputing it |
| 8d | Review's whole per-build state | the 30 seeded ledgers (:1910-1922), the 11 seeded flags and the 17 that were not seeded (story.md §5). `segment.ledgerKeys` (:477-479) and `spokenLedgerSeed` (reviewNarrationBuild.ts:170-174) are replaced by a serialized `GameStory` checkpoint in the narration cache (reviewNarrationCache.ts:70-87) |
| 8e | lessons and chat | lessons: `LessonVoice.keys` (the `ThoughtMemory`) becomes a `GameStory` per lesson line. Chat: `gameArcs` recomputed from scratch on every ask (learnBoardTeaching.ts:968-979) reads `story.threads` instead |

**Stays separate, as PLAN says:**
- Calculators: `exchangeLedger`, `sacrificeLedger`.
- Wording rotation, gathered into one `PhraseMemory` and not into the story: `motifLedger` (learnMemory `motifLastSpoken`, Review :1549/:1552), `stemCounts`, `formulasSaid`, `thoughtPhrases`, `reviewPhrases`, `spokenRefrains`, `characterRef.spoken`.
- Cross-game memory: `teachingLedger`, `coachThread`, `studentMemory`.
- UI and record state: `heldMove`, `theirPrep`, `slipAnswer`, `lastReplyDictated`, `lastProof`, the steered and coach-made ply sets, tallies.
- The voice's own 30-second guard: `voiceService.spokenLedger`.

**Tests that fail on the old code:**
- `gameStory.rewind.test.ts`: a plan stated at ply 9 and a claim said at ply 10; `rewind(8)` forgets both, and replaying ply 9 states the plan again.
  - Fails today: `learnMemory.rewind` (learnMemory.ts:323) only lowers the plies count, `standingFactMemory` has no rewind, and `planThread` is never rewound (plans.md §2).
- `gameStory.newGame.test.ts`: two games in one mount. Game 2's move into the middlegame fires its phase event.
  - Fails today: `phaseStateRef` is never reset (say-once.md §2).
- `reviewExplore.continuity.test.ts`: build the game, then an explored line from ply k with the stored checkpoint. The stated plan carries on and is not announced again.
  - Fails today: `planT` is local to each build (:1646) and not in the seed list.
- `oneStoryState.gate.test.ts`: `CoachTeachPage.tsx`, `usePhaseNarration.ts` and `coachFeatureService.reviewSegmentSteps` declare no say-once, plan or story memory outside `GameStory`.
  - It scans `useRef(new Set|new Map)` and locals named `said|seen|announced|spoken|taught|planT|Arc|phaseState|character`, plus `createStandingFactMemory` / `newPlanThread` / `EMPTY_ARC` outside `gameStory.ts`.
  - It closes the blind spot of `memoryLifetimes.gate.test.ts`, which does not see refs made by factories (say-once.md §1).
- One claim vocabulary across surfaces: Learn keys stored as `claim:<c>`, raw `<c>`, `student-bishop-pair` / `bishop-pair` (page :9880), and Review's `h:`/`f:`/… prefixes collapse into the fact's own `claims`.
  - Test: the same game through Learn replay and Review writes the same claim keys.

**Measurement and audits:**
- `audit-second-game-memory-prod.mjs`: one mount, two games, computed vs spoken.
- `audit-concept-gameplay-prod.mjs` and `audit-review-overhaul-prod.mjs`.
- `audit-learn-focus-prod.mjs` must be unchanged. The focus keeps its own chances and rung state; only its said-keys move into the story.
- Short-game fixture through one lesson `GameStory`: no claim is said twice.

### P1-9 Engine reads reach the move's facts; the six and the IP-1 computers are wired

This is the single input fix behind six silent computers (unwired.md, "root cause").

**Type change:** `MoveThoughtInput` (moveThoughtFacts.ts:29-45) gains two REQUIRED fields:
- `reads: IntentReads | null` (moveIntent.ts:26-39).
- `costCp: number | null`.

Every caller fails to compile until it writes an answer: useTeachWalkthrough.ts:1432, gamesCourse.ts:274, walkthroughLlmNarrator.ts:150, openingGenerator.ts:1656 and :2535, coachFeatureService.ts:2507, plus the bench.

**Lessons:**
- The analysis already run at openingGenerator.ts:2150 (`analyzeWithBudget(preFen, 12, 1200)`) is passed into `computedPlyBeat` (:1641), not thrown away.
- `DELIB_PLY_CAP = 16` (:2105) is deleted (a G4.5 cap).
- Opponent plies are analysed too, for their move's gap.
- The generation is cached once per lesson, so the added engine time is paid once. It is measured on the page's Watch by `audit-all-openings-page-prod`.

**Review:** passes the stored line and the deep read where they exist.

**Wired at IP-1, each as its own facts with proof and squares:**
- **`buildDeliberation`** (deliberation.ts:174): each alternative becomes a `choices` fact (proof: `refutationProof`, exact when the drop is a ledger), and the best line a `line` fact.
  - Its text splice (`deliberationByPly`, `deliberationAlternativesFacts` path at openingGenerator.ts:2155-2158 and :2262-2264) is deleted.
- **`studentMoveTeaching`** (learnBoardTeaching.ts:193): its lanes, not the bundle. Seat-free lanes open to both seats.
- **`depthClauses`** (thinkAloud.ts:310): its readers one by one. The wrapper is deleted.
- **`theirTarget`** (threeFacts.ts:264): its own `theirSide` fact. `bindingFact` (:305) becomes its second job, no longer its gate (moveThoughtFacts.ts:167-171).
- `decisiveReason` (decisiveReason.ts:159). The `learnMoveReason` adapter is deleted.
- `planChoice` (planChooser.ts:30).
- `moveOrder` (moveOrder.ts:68), with its one extra search. The registry id `moveOrder` on `findEnablingMove` (boardComputers.ts:115) is renamed `enablingMove`.
- `counterThreat` (counterThreat.ts:35).
- `ruleForPurpose` (moveFundamentals.ts:1654), as proof on the `prepares` fact.
- `slipQuestion` (learnBoardTeaching.ts:1181), folded into one habit table with `methodBeatFor` (methodBeat.ts:119).

**The fourth composer:** the beat-two picker (openingGenerator.ts:2202-2266) stops joining strings. `landedTacticTeaching` and `refutedByPly` become facts in the composer. What stays is David's own rules, not code choices:
- the note leads the beat;
- two beats per move when a note leads, with beat two cut to one sentence (:2221).

**Fold, then delete:**
- `bestMoveReason`'s geometry squares and `playedConcept`'s description go into the briefing's tactic aspect (reviewMoveBriefing.ts:347-348 ships `squares: []`).
  - Test that fails on the old code: Gotham ply 22 "lands a fork" carries the fork's targets.
- Then delete `moveWhy` (deliberation.ts:543; it lowered the bench twice and was wrong on 10…Qe7 and 13…Ke7), `bestMoveReason` (:487), `playedConcept` (playedConcept.ts:40), `pinKickWhy` (folded into `moveJob`'s `stopsPin`).
- Delete `ThoughtSource` `moveWhy` and its `SOURCE_RANK` row (thoughtComposer.ts:51/:59).
- `refuted` and `alternatives` get their real producers.

**Deleted because their replacement is now wired on the same surface:**
- `theirDeepFactTeaching` (learnBoardTeaching.ts:1068)
- `buildRejectedTempting` (playCommentary.ts:366)
- `tacticalReadFromLines` (tacticalRead.ts:299)
- Each one first passes the Learn walk audit below with its replacement speaking.

**Tests that fail on the old code:**
- A reach test (CLAUDE.md "a wire that does not fire is not a wire"): for each wired computer, a real fixture position where its fact comes **out of `moveThoughtFacts`**. Today it is zero for all 13.
- 13.Bxf7+ on the Gotham fixture: the facts going into the lesson composer contain `studentMoveTeaching`'s line ("Bxf7+, Kxf7, Qxd8 … a queen") and `deliberation`'s Qf5 drop.

**Measurement:**
- The bench REACH table: lesson and Review REACHED > 0 for every wired computer.
- Any and lead held out ≥ 42.2% / 31.8% after refitting `POLICY` offsets for the new sources (`scripts/bench/fit-thought-policy.py` on half the videos, scored on the other half). No weight is set by hand.
- Words per said line are reported, so added speech is visible.
- `P4_PAIRS=1` pairs are read against his notes.
- `audit-concept-gameplay-prod` (Learn walk) and `audit-review-overhaul-prod` are read line by line.

### P1-10 Stakes: win chance on the decision each fact answers

Full design in `p1/stakes.md` §5–6. Summary:

**Type change:** the new `Stakes` replaces `FactStakes` (factStakes.ts:27-37) on `CoachFact`, REQUIRED:
```
Stakes =
  | { wc; plies; decision; basis: 'paid'|'gap'|'line'|'ledger'|'result'|'what-if'|'inherit'; mate? }
  | { none: 'identity'|'closes'|'state'|'unmeasured' }
```
- `wc` is computed only by `winChance.ts` (P1-2), from the centipawns or ledger the producer hands in.
- `costStakes`, `exchangeStakes`, `threatStakes`, `forkPoints`, `lineTacticPoints` and `mateStakes` become constructors of the union.
- `ErrorWhy` (inaccuracyCall.ts:989-1029) gains the `costCp` it already consumes (:1121).

**Consumers, all of them already reading stakes today:**
- `composeThought.order` (thoughtComposer.ts:163-172) and its `NEWS_VALUE` (:144);
- coachDecider `factValue` (:454-461);
- reviewFacetRank `factValue` (:564-575);
- the Learn door's stake order (learnTurnDoor.ts:691-722, by id after P1-5).

`stakeValue` (factStakes.ts:66-76) is re-expressed over `wc`. `STAKED_FLOOR` (:55) keeps its meaning: a fact with stakes `none` sorts below every staked fact.

**The four rules, one per Build 4 cause** (stakes.md §4):
1. **One decision, one gap.** Facts in the `move` and `theirSide` groups on one move share G(D), and `wc(F) = min(G(D), own(F))`. No gap known (reads null) means `none:'unmeasured'` for the whole group. A partial gap is never written, because partial coverage is what made stakes act as an on/off switch in Build 4.
2. **Coverage is total.** Every producer answers, with a named `none` where it has no gap.
3. **The richer claim wins a merge.** In the same-claim test (thoughtComposer.ts:219-220), keep the fact whose idea contains the other (tempo contains the threat, `ideaKind.ts`), not the staked one.
4. **News is relative to the turn.** `NEWS_VALUE` ("a pawn or more") is deleted. A fact speaks as news only when its `wc` clears the lead's by a fitted margin, or it answers a different decision.

**Per group, the basis** (stakes.md §6):
- **Move, their side:** the shared gap.
- **Choices:** each alternative's gap (deliberation.ts:219).
- **Line:** a settled ledger, trusted through `lineTrust` (costReason.ts:152).
- **Danger:** the threat's own proven line after the best reply.
  - `threatStakes` (threatProof.ts:103-109) stops returning the face value of the threatened piece. It returns the ledger of `provenThreatLine` (:95) through `proofCut` (exchangeLedger.ts:321): the `tacticVerification` model (tacticVerification.ts:87-108).
- **Tactics:** after the best defence.
- **Technique:** the tablebase result, 0 / 0.5 / 1.
- **Structure and story:** `what-if` only when the engine's best line acts on it, otherwise `none:'unmeasured'`.
- **Name:** `none:'identity'`.
- **Verdict:** the swing since the last verdict said, read from `GameStory` events (P1-8).
- **Concepts:** inherit.
- **Habit:** `none:'closes'`.

**Fitted, never set by hand:** the distance discount (today 0.8, factStakes.ts:52), the news margin, and the what-if horizon. The fit runs on half the videos and is scored on the other half. The expected loss at the student's level (stakes.md §5.3) is an optional bench arm, wired only if it wins.

**Tests that fail on the Build 4 patch (`scratchpad/patches/wt-stakes.patch`) or on today's code** (stakes.md §7):
1. **Nc3 against …Qd5:** the move facts share one `decision`, and "develops with tempo, hitting the queen" leads. The queen's 9 points sit only on their danger fact, on their decision.
2. **13.Bxf7+** (Bxf7+ +675, Qf5 +369 → G = 0.128): the queen-winning line leads the `yours` step. "Creates a passed pawn on e5" is `none:'unmeasured'`.
3. **10…Qe7** (paid 0.248 from their seat): in Review, the paid cost and its reason (Qxb7) lead over "takes the half-open e-file".
4. **A decided game:** +8 → +5 is staked at 0.087, below a 0.00 → −1.00 drop (0.091).
5. **Gotham fixture:** "X is playable, but not as precise" (deliberation.ts:339) is said at most once. Today it is said on 7 of 13 student moves (short-game-dump.md:44). A shortfall under 40 cp (deliberation.ts:72) has near-zero `wc` and is not news.

**Measurement:**
- Bench: no idea falls beyond its half-split noise against the P1-9 report. Tempo and develop are watched by name, because Build 4 took tempo from 25% to 2%.
- Any and lead held out ≥ the P1-9 numbers and ≥ Build 5.
- Review audit rows `REASON both-seats-same-depth` stay green.

### P1-11 Needs and causes on every fact

**Type change:** `CoachFact` gains REQUIRED `relations: RelationBasis`:
```
RelationBasis =
  | { line: SpokenLine }      // its proof line
  | { squares: readonly string[]; fen: string }
  | { none: 'identity' | 'method' | 'story' | 'description' }
```
- This follows the `NoProof` pattern (proof.ts:119-122). Most producers already hold the line or squares, so they answer with what they hold.
- `factRelations(fact) → { needs, causes }` is pure and memoised by FEN:
  - **causes** are the `lineDiff` along the fact's line;
  - **needs** are the relations on its starting board at the squares the line captures on, checks through or moves from (relations.md §4).
- `RELATION_FAMILY: Record<FundamentalId, RelationKind[]>` (FundamentalId, moveFundamentals.ts:51-97): a new fundamental fails to compile until it is mapped.

**Per computer** (relations.md §4):
- `deliberation`: its `proofSans` and `drops` / `leaves`.
- `costReason`: its plies carry their own boards (costReason.ts:36), so it needs no replay.
- `deepFact`: keep `follow`, `opener` and `hit`. Today moveThoughtFacts.ts:164 keeps only `[deep.target]`.
- `openingStory`: the beats structure-cost / -paid / key-break.
- The fundamentals and `principleAttribution` (`evidence.moves`, :171-191).

**Consumer** (G8.5): `composeThought`'s support test (thoughtComposer.ts:229, "names a square the step's lead names") also admits a **cause → effect** link (A.causes ∩ B.needs ≠ ∅). This is a superset, so no fact loses its place. The `coach-decision` row gains the link kind of each fact after the lead (`coachDecisionEvents.ts`), and an audit contract reads it (`algoAuditContract.test.ts`).

**Phase 2 inherits the rest:** link strengths, piece tracking across moves, "same line" and "same decision" links. None of these is built here without a reader.

**Tests that fail on the old code:**
- On 13.Bxf7+, the line fact's causes include losing `guard:d8<e8`. The queen-capture fact's needs include that relation, so the two are linked.
- `Record<FundamentalId, …>` is exhaustive.

**Measurement:**
- Bench: words per line, and the share of what is said that matches him (Build 5: 32.8%) must not drop. Any and lead ≥ P1-10.
- A link-match preview for Phase 2: on consecutive notes, does our cause → effect link match the next thing he said? This is reported, not gated.
- Phone cost: the trace audit on Review and Learn. `factRelations` runs only for facts that reached a composer.

### P1-12 The remaining wires and deletes

**Wired, each with a fact-comes-out test:**
- `threatAnswer` (threatAnswer.ts:110): a new registry id next to `threatCost` (boardComputers.ts:135).
- `structureLines` (boardComputers.ts:151/:375): fed wherever MultiPV exists (lessons, Review deep reads).
- `readZugzwang` (zugzwang.ts:38, async, ≤ 7 pieces): collected with the reads.
- `findBreakthrough` (endgamePawnReads.ts:189) and `findTriangulation` (zugzwang.ts:73): into `conceptForLine` (conceptEngine.ts:618).
- `queenVsSeventh` (queenVsPawn.ts:25): into `namedTechniqueFor` (:289).
- `positionTransformation` (positionTransformation.ts:83): the Tactics / My Mistakes miss fact, classified through `exchangeIdeas` (exchangeIdeas.ts:865), so teaching and catching use one trade vocabulary.

**Deleted, each only after its replacement speaks on that surface:**
- `hangingPieceLine` (learnBoardTeaching.ts:1336). The danger fact is `computeMustDefend`.
- `detectBehaviors` (danyaBehaviors.ts:878). First check that `bestMinorToKeep` lands in `pieceQuality`.
- `callInaccuracyDetailed`'s decider (inaccuracyCall.ts:567). Its declines become qualify reasons; `errorWhy` stays.
- `mistakeTurnLine` (mistakeTurnLine.ts:66).
- `backwardLook` (backwardLook.ts:106). Update `oneErrorComputer.gate.test.ts:83`, which names it.
- `movePlan` (movePlan.ts:76).
- `opponentGap` (opponentGap.ts:39).
- The `learnFundamentalNarration` adapter. Its seen set now lives in `GameStory`.
- `drillReasons.wrongMoveReason` becomes `errorWhy`; keep `hintBeat`.
- `moveReasonClause` (moveReason.ts:152); keep `classifyMoveReason`.
- `detectGameplayTactic` (tacticAlertService.ts:429).

**Kept out, with reasons recorded in the catalog** (§3.2):
- Kid: `kidBoardAnswers`, `kidPuzzleService`, `kidGameCoach`.
- Campaign mission checks.
- `bookMoveQuestion`, a quiz answer key.
- `gemCrushLines`: opening pages only, locked 2026-10-29.
- Not teaching computers: `shareableInsightsService`, `getCoachGreeting`; `weaknessAnalyzer` is a record reader.

**Measurement:**
- `audit-concept-gameplay-prod`: the Learn walk is where the held adapters spoke.
- `audit-review-overhaul-prod`.
- `audit-tactics-record-prod` and `audit-my-weaknesses-merge-prod` for `positionTransformation`.
- `endgameConceptDrills.test.ts` (:35-36).
- Bench REACH: every wired computer has REACHED > 0 on its surfaces.

### P1-13 Close

- **`computerReach.gate.test.ts`:** every `COMPUTER_CATALOG` row answers every surface with either `{ wired: <file> }` or `{ not: NotReason }`.
  - `NotReason` is a closed union: `kid-contract | play-silent | opening-pages-only | not-a-voice | quiz-key | mission-check | needs-reads-surface-lacks`.
- `scripts/computer-reach.mjs --verify` runs in ship-check. It fails when the static path disagrees with a `wired` claim, the same way `surface-map --verify` does.
- The bench report shows the REACH table, closing PLAN item 5.
- One `npm run ship-check`, then one push to `main`.
- Muted prod audits, read line by line:
  - `audit-concept-gameplay-prod`, `audit-review-overhaul-prod`, `audit-all-openings-page-prod`
  - `audit-chat-surfaces-prod`, `audit-second-game-memory-prod`, `audit-learn-focus-prod`
  - `audit-play-silent-prod`, `audit-tactics-record-prod`, `audit-loop-closes-prod` / `audit-loop-green-prod`
- Update PLAN.md (Phase 1 status) and OUTLINE.md in the same commit.

---

## 3. The designs behind the steps

### 3.1 `CoachFact` at the end of Phase 1

```ts
interface CoachFact {
  id: string;                         // P1-5 — VoiceFact.factId; doors join by id
  kind: FactKind;                     // P1-3 — the one vocabulary (reviewFacetRank.ts:406)
  group: FactGroup;                   // P1-3 — FACT_GROUP[kind]; step derived
  computer: ComputerName;             // P1-3 — COMPUTER_CATALOG key
  seat: 'student' | 'opponent';       // exists (thoughtComposer.ts:101)
  namesStudentMove: boolean;          // P1-5
  thread: ThreadKey | { none: 'local' };   // P1-8 — GameStory.threads
  stakes: Stakes;                     // P1-10
  relations: RelationBasis;           // P1-11
  proof: FactProof;                   // exists, REQUIRED (proof.ts:119-122)
  idea: IdeaKind; claims; squares; text; alsoText?; fen; altFen?; lines?; weight; restates?;  // exist
}
```
- **No `'estimate'` tier is added to `Proof`.** The plan's "an estimate cannot lead" is carried by the stakes basis `what-if` / `none:'unmeasured'`, so `Proof.exact` (proof.ts:30) stays two-valued. One axis for "how sure", not two.

### 3.2 `COMPUTER_CATALOG` (PLAN item 2)

```ts
COMPUTER_CATALOG: Record<ComputerName, {
  group; phase;
  surfaces: Record<'lesson'|'review'|'learn'|'chat'|'play'|'tactics'|'weaknesses', SurfaceAnswer>;
}>
```
- One row per computer that emits a `CoachFact`. Helper functions are reached through their emitter.
- `BOARD_COMPUTERS` (boardComputers.ts:190) stays the uniform-read subset. Its rows reference the catalog instead of repeating surfaces.
- First filled from `memory/rows.json`, the inventory's 355 rows.

### 3.3 The relation snapshot

See P1-7. Cost measured 2.0 ms on a busy middlegame on this machine, with about 48 atoms on the 13.Bxf7+ board (relations.md §2); a phone is likely 5–10× slower. It is memoised by FEN, and a game costs one snapshot per ply. A proof line of k moves costs k snapshots, and only for facts that reached a composer.

### 3.4–3.7 Stakes, the 57 computers, the group table

See P1-10, P1-9 / P1-12, and P1-4.

### 3.8 `GameStory`

```ts
interface GameStory {                     // leaf src/services/gameStory.ts, pure, no Dexie
  gameId: string;
  ply: number;
  said: ReadonlyMap<ClaimKey, number>;          // claim → ply first said
  sentences: ReadonlyMap<string, number>;       // voice-package sentence keys → ply
  threads: ReadonlyMap<ThreadKey, ThreadState>; // plan-aim key, per seat: stated, streak, missing, steps, stopped, how/method/why said
  events: readonly StoryEvent[];                // phase | opening-named | character | verdict | promise | paid | cause | turn
}
interface StoryStore {                    // the one holder per surface
  current(): GameStory;
  commit(ply: number, kept: readonly CoachFact[], events: readonly StoryEvent[]): void;
  rewind(ply: number): void;   // drops every entry with ply > target; threads restored from the checkpoint
  newGame(gameId: string): void;
  serialize(): string;         // Review's narration cache; replaces ledgerKeys
}
```
- **Writes happen at the door only:** what was kept, by fact id. Today some memories are written when a line is computed (say-once.md tags: page :9474-9477, :9880, :9919, :11256, :11503; usePhaseNarration :459), which marks a line "said" that the door may then drop.
- **Rewind** takes back exactly what the undone plies wrote: say-once, threads, events.
- **`newGame` is the one reset door.** Today there are two detectors for "the board went backwards" (`learnMemory.observe` by plies, `standingFactMemory.observe` by full move). There are also two resets: `resetPerGameMemory` renews `standingRef` (page :1964), but `onNewGame` → `forgetPageRefs` does not.
- **Threads:**
  - `planThread`'s and `planArc`'s step functions stay as calculators; only their state moves in.
  - `planMemory` is folded into `planThread` and deleted. Its `StructurePlanFact.id` is joined by the same plan-aim key (nextPlans.ts:672-704).
  - Learn, Review, lessons and chat then hold one plan per aim, per seat. Today: three stores, three identity vocabularies, three hold rules (plans.md "Overlaps" 1–8).
- **Takeback that does not rewind:**
  - Learn: `planThread` (plans.md §2 "Takeback"), `standingFactMemory` (say-once.md §0).
  - Review: the explore build forgets the plan (story.md §5: `planT` not seeded).
  - Both are fixed by construction.

---

## 4. Tests and measurements summary

| Step | Tests that fail on the old code | Bench / audit proof |
|---|---|---|
| P1-0 | — | baselines recorded |
| P1-1 | `RECALL` widened (coachNoRecall.test.ts:12) | bench identical; `audit-play-silent-prod` |
| P1-2 | `oneWinChance.gate` (3 sites today) | identical |
| P1-3 | step-equality test | identical |
| P1-4 | `oneGroupTable.gate`; `[timing]` one step in door and walk | bench ≥ 42.2 / 31.8; diff only at listed points |
| P1-5 | substring lane-misattribution case | decision rows identical |
| P1-6 | `oneFactShape.gate` | decision rows identical, per commit |
| P1-7 | Bxf7+ `lineDiff`; pinned guard; pin-reader agreement | Review trace not slower; fixtures |
| P1-8 | rewind; new game phase event; Review explore continuity; `oneStoryState.gate`; one claim vocabulary | `audit-second-game-memory-prod`; Learn / Review / focus audits |
| P1-9 | 13 reach tests; Gotham ply 22 fork squares; Bxf7+ facts present | REACH > 0; bench ≥ Build 5 after refit; P4 pairs |
| P1-10 | four stakes tests + "not as precise" ≤ 1 | no idea beyond noise; any / lead ≥ P1-9 |
| P1-11 | Bxf7+ link; fundamental map exhaustive | share-matches ≥ 32.8%; link preview; trace |
| P1-12 | a fact-comes-out test per wire | REACH; Learn walk, Review, Tactics audits |
| P1-13 | `computerReach.gate`; reach `--verify` | ship-check; prod audits read |

---

## 5. Risks, and how the order handles them

| # | Risk | Where it bites | Mitigation |
|---|---|---|---|
| R1 | **Build 4 again:** new facts or new stakes lower the teaching. Build 4 lost 1.6 points; tempo fell from 25% to 2%. | P1-9, P1-10 | Reach (P1-9) and rank (P1-10) in separate commits. Rules 1–4 cause the four Build 4 failures to fail tests. POLICY offsets and the discount fitted on half the videos, scored on the other half. No idea may fall beyond its noise. |
| R2 | **Silent decision drift in a large mechanical migration:** about 250 producer sites, 4 step tables, 3 doors, `queueSpokenHint`'s 40 sites in a 17,283-line page. Mostly on surfaces the bench does not see (Learn walks, chat). | P1-3 to P1-6 | Identity-preserving steps first. A byte-identical decision-row and spoken-output baseline (P1-0) is diffed after every commit. One producer family per commit. `surface-map --changed` before each. The only intended order changes are listed in P1-4. |
| R3 | **Phone cost:** snapshots per proof-line board, MultiPV on both seats for lessons, `moveOrder`'s extra search, async zugzwang. History: Review held 91 of 103 s; the boot freeze. | P1-7, P1-9, P1-11, P1-12 | Snapshot memoised by FEN; `detectTactics` and pin breaks kept out (20–112 ms). Relations derived only for facts that reach a composer. Engine reads only where a surface already holds them; lesson generation is cached once. Main-thread trace audits on Review and Learn before the push. |
| R4 | **The memory merge regresses the second game, takeback or Review explore.** | P1-8 | A checkpointed fold with one reset door and one write point (the door). The failing-first tests in P1-8 plus `audit-second-game-memory-prod`, whose single mount is the only instrument that sees this class (CLAUDE.md audit matrix). |
| R5 | **Deleting "held" Learn adapters that still speak in walks** (inventory: held lines speak when a named opening stops the focus). | P1-9, P1-12 | Delete only after the replacement speaks on Learn's door. The Learn walk audit (`audit-concept-gameplay-prod` plays a named opening) is read line by line. |
| R6 | **Fields computed with no reader** (G8.5) while the matrix does not exist. | every step | Each field lands with its first reader: group → step, id → door joins, thread → `GameStory`, stakes → the existing stake orders, relations → the support link plus the decision row. |
| R7 | **Parallel sessions on the same hot files** (`CoachTeachPage.tsx`, `coachFeatureService.ts`). | P1-5, P1-6, P1-8 | Short-lived commits per family. `git fetch` + `git log HEAD..origin/main` before each. The capture build is coordinated on `buildInstantReplyLine` and the capture sayers. |

**Behaviour questions that are David's, not mine:**
- **None blocks Phase 1.**
- **`lastTimeHere`** stays as recorded (OUTLINE.md:287).
- **The two-beat clip** in lessons stays (David 2026-09-12).
- **The three tag disagreements** are settled by the plan's own group definitions.
- **`priorityFirst` and the `fork` story beat** are placed by the bench.
