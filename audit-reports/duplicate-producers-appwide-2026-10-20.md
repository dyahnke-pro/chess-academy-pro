# Duplicate producers, app-wide — Learn and Review voice first (2026-10-20)

**Base:** `origin/batch3` **b7d7093**. Read-only map; no `src/` was edited. Builds on `docs/plans/2026-10-07-duplicate-census.md`, which mapped duplicate FACT computers (groups 1–15) and fixed several. This map adds three things:
- (A) the same CLAIM reaching the voice from several producers, measured on the heard tapes of the four OS-11 games;
- (B) definitions of one fact that are copies of each other, run side by side;
- (C) producers whose only callers are tests or nothing.

**How it was measured:**
- **Tapes:** every `voiceService.speakCloud` sentence of the four OS-11 replays (b7ab6d3 = main 8a42c79; 50 + 14 + 16 + 16 turns, David's record loaded). Pairs of sentences that state the same fact about the same square were found by script, then read by hand. Each line was attributed to its producer by its template.
- **Definitions:** competing detectors were run on all 193 positions of the four games (`tsx`, scratchpad `probe11/defs.ts`).
- **Dead code:** every `export` in `src/services` that nothing outside its own file references except tests (`rg -w`). Side-effect imports and dynamic imports were checked by hand.

The four game PGNs are in `audit-reports/os11-games/`. The four sets already given in `os11-item6-duplicate-producers-map.md` (race, king plan, pin claim key, Bxf7+ verdict) are not repeated here, only ranked.

## Top 10

| # | claim said by several producers | heard on the tapes | producers (file:line) | one owner → delete |
|---|---|---|---|---|
| 1 | Opposite-castling race | g2: 3 producers, 3 wordings | see item-6 map (a) | planRace on boardStructure.kings → delete `splitPosition()` and openingStory.ts:437 |
| 2 | Where the king goes vs "storm their king" | g3 7.c4 vs 9.d3, g4 4…Nge7 | item-6 map (b); plus castling-claim stems in moveIntent.ts:413, positionalRead.ts:200, kingSafety.ts:212 | `castleRoute` (kingSafety.ts:225) answers it; `kingCommitted` reads it |
| 3 | A piece is loose / a tactic is on — said by up to five producers, with no shared claim key | g1 13.Rad1→14.Rd5: the bishop on f4 three times in two turns | see section 3 | one claim key per (fact, squares), attached by every producer; delete `hangingPieceLine`'s separate copy of the loose fact |
| 4 | Outpost — four sentence producers and a copy-paste definition | g1 29.Nf6 → 31.g5 (and 24.Kxg2's plan): three outpost sentences in five plies | moveFundamentals.ts:447-454; pvPlayback.ts:683-686; reviewMoveTeaching.ts:461; reviewMoveBriefing.ts:280; definitions `forwardTeaching.isKnightOutpost` ≡ `outpost.isOutpost(…, true)` | `outpost.isOutpost` + one phrase function → delete `isKnightOutpost` |
| 5 | Hole / weak square — four computers | g3 10.Nf3 (+2.8s) and 11.O-O (+17.0s): the d5 hole twice; g4 10…Bf5 "the hole on d3" | openingStory.ts:247-262 holesLeft + :469; pawnJudgement ("stays a hole"); planChoice method ("Their weakness was the hole on X"); positionReadingService.ts:652 findWeakSquares; moveInsight.ts:1144 holeAccess | `moveInsight.holeAccess` over `findWeakSquares` → the others read it, one key `hole:<sq>` |
| 6 | Attackers vs defenders on one square — the same count twice in one turn | g3 10.Nf3 (+15.7s): "Count before you take on e5: two attackers against two defenders" + "Their rook on e8 is tied down now: you hit the pawn on e5 twice and it is guarded twice" | countMethod.ts:33-36; tiedDefender.ts:75-77 (via boardComputers.ts:229, reviewFullData.ts:1463); threatProof.ts:47-75 | one count per square (the exchange ledger / SEE already behind threatProof) → countMethod and tiedDefender become two readings of one fact with one key `count:<sq>` |
| 7 | The plan — the method+plan line is built in two files, and the plan computers are still five (census 9, open) | g4 9…dxe4 (+4.4s) "So the plan: take their pawn on c3 …", then 12…Bxe4 (+4.8s) "The plan changes here — now it's to win their weak pawn on c3" | planThread.ts:195 and boardPlanFacts.ts:123 (the same template); planThread.ts:170; positionFacts.ts:461; nextPlans.deriveNextPlans:161; boardPlan.structurePlan:84; positionReadingService.namedPawnStructure:1060; mastersPlanRead:83; movePlan.classifyPlan:57 | planThread as the voice; delete boardPlanFacts.ts:123's copy of the line; the census-9 merge is still owed |
| 8 | The opening's name, twice in one breath | g2 5…a6 "It's the Najdorf Variation of the Sicilian Defense. You chose the Najdorf: …"; g4 2…Nc6 "It's the Ruy Lopez. They've gone for the Ruy Lopez: …" | openingAnnouncement.ts:70-103 (the name); openingStory.ts:362 (`You chose the X`); openingStory.ts:385 (`They've gone for the X`) | the announcement owns the name; openingStory's beats speak the CHOICE and its reason without re-naming — one claim key `opening-name:<family>` |
| 9 | "How many moves hold here" — four computers, two in one file, contradicting | g3 8.Nc2: "One pawn move here answers no" vs "Your next move is not a big decision — several are about equally good", 6ms apart; g1/g2 "Nothing hinges" beside "grab it" | speedRunReads.ts:84 (srr:any-move-fine); speedRunReads.ts:431 (srr:every-branch); criticalMoment.ts (only-move count); countMethod | the one criticality (`criticalityScan` gapCp, per CLAUDE.md) → both speedRun reads read it; same claim key `criticality:<fen>` |
| 10 | Built but not wired — four dead modules and ~50 narration functions only tests call | — | see section C | delete (list below) |

## A. Claims said by more than one producer — evidence and test designs

### 3. Loose piece / tactic

g1 13.Rad1 Ng4 → 14.Rd5 Qb4. The bishop on f4 was said loose three times in two turns, by four templates:
- (+7.1s) "Danger — a whole piece is at stake: your bishop on f4 is the only defender of your knight on g5 — and it can be taken." — liveTacticsContext.ts:902 stake prefix + tacticsDetector.ts:573 description.
- "It is attacked once and nothing guards it: rook takes f4 — they win a bishop." — threatProof.ts:47-75.
- next turn (+7.2s): "Careful — your bishop on f4 is attacked and nothing's defending it." — learnBoardTeaching.ts:1275-1279 `hangingPieceLine`, spoken through CoachTeachPage.tsx:8869.

The fact had not changed (the bishop was still loose). The pin in g2 is the same disease (item-6 map (c)): the threat lane entry at CoachTeachPage.tsx:9499 carries no `claims`, and the door subsumes only within one wave (learnTurnDoor.ts:618-636).

**One owner.** The census already made one hanging computer (census 2 ✅, `tacticClassifier.findHangingPieces`). What is missing is one CLAIM: a shared key builder (`loose:<sq>`, `tactic:<type>:<squares>`) that every producer stating the fact attaches. With it the say-once ledger drops the repeat across waves and turns.

**Delete:** the second loose template in `hangingPieceLine` once the threat lane carries the key (keep one wording table).

**Failing test:**
- board g1 after 13…Ng4, `r1b1kr2/pp2p1bp/2np2p1/q5N1/4PBn1/1QN5/PP3PPP/3RR1K1 w - - 10 14`;
- then g1 after 14…Qb4, `r1b1kr2/pp2p1bp/2np2p1/3R2N1/1q2PBn1/1QN5/PP3PPP/4R1K1 w - - 12 15`.

The facts the Learn producers build for f4 on both boards must carry the same claim key, and the second turn's loose line must be dropped as said. Old code: the threat lane has no key, so the test fails.

### 4. Outpost

The tape (g1):
- 29.Nf6 (+…): "Your knight to f6 lands on the f6 outpost, a square none of their pawns can attack — a piece no pawn can chase stays there for the whole game." — moveFundamentals.ts:452, the "led" stem;
- two moves later, 31.g5: "g5 makes f6 an outpost for the knight — no enemy pawn can ever challenge it." — reviewMoveTeaching.ts:461, shared into Learn through learnBoardTeaching.ts:78 (`buildReviewMoveTeachingFact`).

The same f6 outpost, two producers, unchanged. 24.Kxg2 also spoke moveFundamentals.ts:454's imperative as a plan: "plant the knight on the g5 outpost, where no pawn can challenge it".

**Definitions, run side by side on all 193 positions:**
- `forwardTeaching.isKnightOutpost` (forwardTeaching.ts:62-85) vs `outpost.isOutpost(board, sq, color, true)` on every empty square: **0 disagreements in 15,634 checks** — the same function written twice.
- `boardStructure.computeOutposts` (boardStructure.ts:154) vs `isOutpost(…, true)` on every square holding a knight or bishop: **0 in 1,099.**

**Owner:** `outpost.isOutpost`, plus one phrase function (pvPlayback.ts:683 `outpostPhrase` is the most general).
- Delete `isKnightOutpost`; nextPlans.ts:110 and forwardTeaching.ts:188 call `isOutpost(…, true)` for empty squares.
- `computeOutposts` calls `isOutpost`.
- reviewMoveTeaching.ts:461 and reviewMoveBriefing.ts:280 render through the one phrase.

**Failing test:** g1 after 31.g5, `r7/pp3k2/3p1N2/6P1/3nP3/1P6/6K1/5R2 b - - 0 31`, plus the board after 29.Nf6. Across the two turns the outpost fact on f6 carries one key `outpost:f6`, and the second is dropped. Old code says it twice.

### 5. Hole

The tape (g3):
- 10.Nf3 (+2.8s): "c5 has a cost for them: no pawn of theirs can cover d5 again, and your knight on c2 is two moves from it." — openingStory.ts:469;
- 11.O-O (+17.0s): "they can never guard d5 the same way, so that square stays a hole for them." — pawnJudgement.ts.

g4 10…Bf5: "Their weakness was the hole on d3 that no pawn of theirs can guard." — planChoice method (planChoice.ts:316).

**Four computers decide "hole":**
- openingStory.ts:247 `holesLeft` (from the move history);
- moveInsight.ts:1144 `holeAccess`;
- positionReadingService.ts:652 `findWeakSquares`;
- pawnJudgement's hole read.

**Owner:** `findWeakSquares` (board-only) as the definition, read by `holeAccess` for "can a piece reach it". openingStory's "has a cost for them" stays as the CHOICE that created the hole, keyed `hole:<sq>`, so pawnJudgement's later restatement is dropped.

**Failing test:** g3 after 10…c5, `r1bqr1k1/3p1ppp/p2b1n2/npp1p3/2P5/1P1PPN2/PBN1BPPP/R2QK2R w KQ - 0 11`, then after 11…Bc7, `r1bqr1k1/2bp1ppp/p4n2/npp1p3/2P5/1P1PPN2/PBN1BPPP/R2Q1RK1 w - - 2 12`. The d5-hole facts from openingStory and pawnJudgement carry one key, and the second turn's is dropped. Old code says both.

### 6. One square, counted twice

g3 10.Nf3, one line:
- "Count before you take on e5: two attackers against two defenders. Not enough — start the trades there and you come out behind." — countMethod.ts:36;
- "Their rook on e8 is tied down now: you hit the pawn on e5 twice and it is guarded twice — the rook is the guard that holds it." — tiedDefender.ts:77.

Both are TRUE, and both are one count.

**Owner:** the exchange count threatProof already uses (computeMustDefend / exchange ledger). countMethod (the method beat: "count before you take") and tiedDefender (the consequence: "the guard cannot leave") read it and share key `count:e5`; the door keeps the higher-ranked one.

**Failing test:** g3 after 10…c5 (above). `countMethodTeaching` and the tied-defender read on e5 share one claim key. Old code: `count-method` vs `tied:<…>`.

### 7. The plan

g4:
- 9…dxe4 (+4.4s): "How do you find a plan? … So the plan: take their pawn on c3, the piece attacking your pawn; put a rook on the open e-file; bring your knight on e7 to d3 …";
- three moves later (+4.8s): "The plan changes here — now it's to win their weak pawn on c3."

The method+plan line is built twice in the code, with the same template: planThread.ts:195 and boardPlanFacts.ts:123. `positionFacts.ts:461` has a third "The plan changes here:" stem.

The plan COMPUTERS are still the census-9 five: `nextPlans.deriveNextPlans`, `boardPlan.structurePlan`, `positionReadingService.namedPawnStructure`, `mastersPlanRead`, `movePlan.classifyPlan`. Census 8 is also still four "worst piece" computers: `findPieceQuality`, `pieceValueRead` weakest/strongestByDelta, `pieceQuality.explainEvalByPieceQuality`, `nextPlans.findWorstPlacedPiece`.

**Owner:** planThread is the plan's voice; delete boardPlanFacts.ts:123's copy of the line and positionFacts.ts:461's stem. The computer merge (census 8/9) is the real job and is still owed.

**Failing test:** g4 after 10.Bxe4, `r1b1kb1r/pp2nppp/2p2q2/8/3pB3/2P5/PP1PNPPP/R1BQ1RK1 b kq - 0 10`, and after 13.dxe4, `r3kb1r/pp2nppp/2p2q2/8/4P3/2P5/P3NPPP/R1BQ1RK1 b kq - 0 13`. The c3-pawn plan is one claim across the turns (the second says only what CHANGED). Old code repeats it with a new frame.

### 8. Opening name

- g2 5…a6: "It's the Najdorf Variation of the Sicilian Defense. You chose the Najdorf: a6 takes b5 away …"
- g4 2…Nc6: "It's the Ruy Lopez. They've gone for the Ruy Lopez: in master games from here …"

The producers are openingAnnouncement (the name) and openingStory.ts:362 / :385 (the choice), which re-names.

**Owner:** the announcement. openingStory's choice beats drop the name when the announcement said it this turn (one key `opening-name:<family>`).

**Failing test:**
- g2 after 6.f3, `rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N2P2/PPP3PP/R1BQKB1R b KQkq - 0 6` (history to ply 11);
- g4 after 3.Bb5, `r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3`.

The instant wave's text names the family once. Old code names it twice.

### 9. How many moves hold

- g3 8.Nc2, 6ms apart: "One pawn move here answers no, whatever they reply" (speedRunReads.ts:431, srr:every-branch) and "Your next move is not a big decision — several are about equally good" (speedRunReads.ts:84, srr:any-move-fine).
- g1 7.O-O and g2 8.Be3: "Nothing hinges on your next move" in the same wave as a look-ahead "grab it" / "spot it".

**Owner:** the one criticality (`criticalityScan` gapCp). Both speedRun reads take its verdict, and "any move fine" is impossible to emit when the same board has a one-move answer.

**Failing test:** g3 after 8…Re8, `r1bqr1k1/1ppp1ppp/p2b1n2/n3p3/2P5/1P2P3/PBNPBPPP/R2QK1NR w KQ - 3 9`. Both speedRun reads on this board cannot both be offered. Old code offers both.

### Smaller sets (not in the top 10)
- **Praise of the played move, three producers:** strongChoice.ts:39 ("That's what strong players play here — it …"), deliberation.ts:653 ("That was the move here — it …", ×7 in g1, unrotated) and dnaRules.ts:26 EARNED_PRAISE. One praise table, rotated by ply.
- **A rule restating its fact:** moveFundamentals.ts:1353 "The rule behind e5: kick their knight off d4 …" after movePoint said "e5 kicks their knight off d4" (g2), and as a plan in g3 ("kick their knight off a5 with a pawn").
- **Isolated pawns:** `positionReadingService.findWeakPawns(…).isolated` ≡ `describeStructure(…).pawns.isolatedPawns` — **0 disagreements in 386 sets**. A copy census 10 did not list; read describeStructure.
- **Census 3** (skewer/discovery) still has three implementations: tacticsDetector.ts:222/472, tacticClassifier.ts:232/275, missedTacticService.ts:176/210.
- **Census 5** (turning point) still has two on one Review page: turningPoints.ts:229 (CoachGameReview.tsx:842) and reviewTurningPoint.ts:88 (teachingSelector.ts:212).

## C. Built but not wired (test-only or no caller)

**Whole modules no production file imports** (checked for side-effect and dynamic imports):
- `walkthroughResolver.ts` (224 lines; only comments mention it; 3 test files);
- `puzzleDifficulty.ts` (138);
- `tablebases.ts` (99);
- `lichessDailyPuzzleService.ts` (92).

`memoryLifetimes.ts` is read only by scripts/ship-check.mjs; that is deliberate, leave it.

**Narration or gate functions only tests call** (export kept alive by its test alone — G8.5), the ones closest to the voice:
- **tacticalRead.ts** — `speakTemptingTurn`, `candidateCompareClause`, `lineOutcomeClause`, `tacticalReadFacts`, and two VALIDATORS, `voiceRejectsBestMove` and `voiceNamesUngroundedMove`. Validators are the shape G0 bans. Delete with their tests.
- **coachAnswerGates.ts** — `gradeBorrowedTeaching` (5 test files, no caller: a gate that never runs).
- **zugzwang.ts** — `triangulationSentence` (no test, no caller).
- **playCommentary.ts** — `describeMoveConsequence`.
- **planMemory.ts** — `planProgressText`.
- **whyBestMove.ts** — `computeWhyBestMove` (3 tests).
- **reviewTeachingPoints.ts** — `deriveNextPlan`.
- **misconceptionCallbacks.ts** — `composeWeaknessCallback`.
- **coachThread.ts** — `threadCallbackAlreadySpoken`.
- **studentMemory.ts** — `recallKind`.
- **teachingLayers.ts** — `leadLayer`.
- **narrationSegments.ts** — `speakSegments` (the module's other exports are live).
- **walkthroughNarration.ts** — `pickCoachHint`, `pickEvaluation`.
- **tacticNarrationService.ts** — `drillIntro`, `drillCorrect`, `drillIncorrect`.
- **chessConceptService.ts** — `buildOpeningNarrationContext`, `getCoverageSummary`.
- **explorerTranslate.ts** — `describeTopMasterMove`.
- **exchangeLedger.ts** — `exchangeNetForLine`.
- **endgamePawnReads.ts** — `findBreakthrough`.
- **bookMoveWhy.ts** — `moveJobs`.
- **openingSublines.ts** — `buildSublines`.
- **tablebases.ts** — `formatTablebaseVerdict` (the whole module is dead).
- **coachPrompts.ts** — 13 unused exports (`GAME_NARRATION_ADDITION`, `HINT_TIER_1_ADDITION`, `HINT_TIER_2_ADDITION`, `buildOpeningAnnotationContext`, …).

In all, 213 exports are referenced only by their own definition outside tests. Many of those are internal helpers exported only for a test, and are harmless. The list above is the narration and gate subset. The full list is in the scratchpad (`os11/dead.txt`, column own=1).

**Test design for C:** none needed per function. A gate test that fails when a `src/services` export has no production reference, with an allowlist for helpers exported for tests, is the unreopenable form (G8.5). It fails today on the 50 above.
