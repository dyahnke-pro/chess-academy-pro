# Duplicate systems census (2026-10-07)

Four read-only code censuses of /home/user/wt-work/src (tests excluded). Raw reports, every file:line from grep. Spot-checked by hand: contractFor/withholds/speaks unread, rankFacets dead, buildThreatCheckQuestion dead, stockfishCache key `${fen}::${depth}` ignores MultiPV, MiddlegamePractice speaks via speechService directly.

## A. Fact computers
## Duplicate fact computers (searched src/, *.test.* excluded)

Some things are already shared and are not counted below. The loss bands all go through `accuracyService.gradeMove` (`slipDetector`, `playedMoveGrade`, `moveRating.classifyMove`, `classifyEvalSwing` and `tacticClassifier.classifyMoveQuality` all call it or `cpBand`). Pin validity goes through `pinGeometry.isRealPin`. The loose-piece scan is `loosePieces.findLoosePieces` and phase uses `gamePhaseService.classifyPhase`. Paths are relative to /home/user/wt-work/src/services unless stated otherwise.

| # | Question | Independent producers (file:line) | Surfaces reached (from call sites) |
|---|---|---|---|
| 1 | Is it a brilliant/great/good move, and what about a missed mate? | `gameAnalysisService.classifyCpLoss` :252 has its own mate rules (`preDistance<=SHORT_MATE_MOVES`, `MATE_HORIZON_CP`) and a brilliancy check that needs a sacrifice. `tacticClassifier.classifyMoveQuality` :142 says brilliant at a swing of +200 and great at +100, with no sacrifice needed. `coachMoveCommentary.classifyEvalSwing` :109 says excellent at +80 and good at +20. `liveCoachTriggers.detectGreatMove` :77 uses +40. `gamesService.gradeGuess` :239 has its own 10/30/60 ladder. | Review/analysis (classifyCpLoss); Play via `CoachGamePage:3355` classifyPosition (its moveQuality is only read by `coachChatService:405`, and no setter of `tacticAnalysis` turned up); Play cerebellum `stockfishClassifyMove`; Play `useLiveCoach`; GuessTheMove |
| 2 ✅ (2026-10-07: one computer — findHangingPieces is the SEE read narrowed to undefended pieces + the in-check rule; 157 x-ray false hangs gone) | Is this piece hanging? | `tacticClassifier.findHangingPieces` :553 (attacked and undefended). `positionReadingService.findHangingBySee` :361 (SEE, so it also flags defended pieces that lose the exchange). The comment at :356 admits they differ. | findHangingPieces: detectTactics, threatOut/threatCheck, deliberation, playedMoveGrade, moveReason, coachGameEngine, liveTacticsContext (Play). findHangingBySee: chat (groundedAnswer, chatTurnAnswers), Review turningPoints, How-to-Think steps, moveInsight, drillReasons |
| 3 | Fork / pin / skewer / discovery detection | `tacticsDetector` findForks :119, findPins :193, findSkewers, findDiscoveredAttacks. `tacticClassifier` detectFork :155, detectPin :206, detectSkewer, detectDiscovery, detectBackRank. `missedTacticService` detectPin :204, detectDiscoveredAttack :288 (fallback after `conceptForLine`). `groundedAnswer.findPinFrom` :2664. `nextPlans.isPinnedPiece` :118 (absolute pins only, no isRealPin). | detectTactics: about 25 consumers (Review reviewFullData, pvPlayback, openingGenerator, playCommentary). classifyPosition: Play `CoachGamePage`, `pvPlayback:407`. detectTacticType: puzzles, tactic drills, Review, Play alerts. findPinFrom: chat. isPinnedPiece: deliberation (Learn) |
| 4 ✅ partial (2026-10-07: chat reads computeMustDefend; detectNewThreat answers a different question — the mover’s threatening MOVE, mate/fork/verified capture, new only — and stays; the arrow and the alert bar are a drawing and a gate, not the fact) | What are they threatening? | `groundedAnswer.detectNewThreat` :6890 (null-move: mate-in-1, fork or SEE capture). `threatOut.computeMustDefend` :71 (null-move plus findHangingPieces). `groundedAnswer.assembleThreatAnswer` :606 (its own legalSeeGainFor board scan). `arrowEngine.computeThreatArrow` :61. `tacticAlertService.isCriticalThreat` :395 (cp bar). `deliberation.threatAnswerWhy` :424 vs `threatAnswer.threatAnswer` :58 (what meets the threat). | detectNewThreat: Review (reviewFullData, coachFeatureService, reviewTeachingPoints), Learn learnMoveTeaching, moveInsight. computeMustDefend: positionFacts, reviewHinge, playedMoveGrade, liveTacticsContext. assembleThreatAnswer: chat. Arrow and alert: Play. threatAnswer: Learn only |
| 5 | Turning point / critical moment | `turningPoints.selectTurningPoints` :211 (win-% drop ≥10, top 3). `reviewTurningPoint.turningPointCandidates` :115 (rating-scaled cp from criticalityThresholds, plus a "both sides already decided" gate at 600cp). | Both are on CoachGameReview: :783 asks with one, and :1454 / `teachingSelector.renderThesis` use the other |
| 6 | Why the better move is better / what a move does | `groundedAnswer.explainBestMoveGrounded` :2448. `inaccuracyCall.betterMoveReason` :194 (betterMoveFact). `deliberation.moveWhy` :334. `moveWhy.computeMoveWhy` :171 (keySquares only). `groundedMoveWhy.groundedMoveWhy` :49. `moveComparison.compareTwoMoves` :142 (engine ablation). | explainBestMoveGrounded: Learn, Play, chat, Openings (OpeningPlayMode). betterMoveReason: Review (reviewFullData, coachFeatureService, turningPoints). deliberation.moveWhy: Learn, turningPoints. computeMoveWhy: Openings walkthrough (`hooks/useTeachWalkthrough.ts`). groundedMoveWhy: whyBestMove (Play/Openings). compareTwoMoves: Review, moveInsight |
| 7 ✅ (2026-10-07: one judge — tradeJudgement keeps only the engine per-piece read and hands every other verdict to readTrade; readTrade gained the attacker-near-your-king lesson and an even-chain retake fix) | Was the trade good? | `tradeJudgement.tradeJudgement` :40 (bad piece from the engine table, needs cpLoss ≥50, "defender" means within 2 squares of the king). `tradeQuality.readTrade` (bad piece from findPieceQuality, needs cpLoss ≥30, "defender" means covers 2+ king squares while under fire). | tradeJudgement: Learn (learnBoardTeaching), moveInsight. readTrade: Review (reviewFullData), positionFacts |
| 8 | Which is the bad/worst piece? | `positionReadingService.findPieceQuality` :512 (static heuristics). `pieceValueRead` strongest/weakestByDelta :148/:166 (engine per-piece table). `pieceQuality.explainEvalByPieceQuality` (teleport ablation). `nextPlans.findWorstPlacedPiece` :81 (mobility). | Chat and tradeQuality; Learn (CoachTeachPage) and playCommentary; Review (coachFeatureService:3897); Review and chat plans (reviewTeachingPoints, moveInsight) |
| 9 | What's the plan? (passed pawn, IQP) | `nextPlans.deriveNextPlans` :161. `boardPlan.structurePlan` :84. `positionReadingService.namedPawnStructure` :1060 (its own pawn sets, has an IQP plan). `mastersPlanRead` :83 (master games). `movePlan.classifyPlan` :57. | deriveNextPlans: Review (coachFeatureService), chat, moveInsight, deliberation. structurePlan: positionFacts, chat, teachingSelector (Review thesis). namedPawnStructure: Learn (CoachTeachPage), chat, danyaBehaviors. mastersPlanRead: Learn only. classifyPlan: playedMoveGrade |
| 10 | Is this pawn passed / isolated / doubled? | `boardStructure.describeStructure` :269 is the canonical one. Separate copies: `positionReadingService.findPassedPawns` :1297, `reviewConcepts` :299/:496/:504, `principleAttribution` :380-389, `boardConcepts` :88/:100/:188, `moveComparison` :88, `moveFundamentals` :226, `endgameTechnique` :70, `endgamePawnReads` :35, `recaptureChoice` :34. | Review (reviewConcepts, principleAttribution), Play (boardConcepts→playCommentary), Learn (endgamePawnReads, recaptureChoice), chat (endgameTechnique, findPassedPawns) |
| 11 ✅ (2026-10-07: one counter — countMaterial totals on MATERIAL_VALUE, advantage = materialBalance; prompts + Play context read it; How-to-Think reads the settled quietBalance in words) | Material balance | `material.settledLeadFor`/`settledBalance` (accounts for a capture still being recaptured). Raw counts: `positionReadingService.countMaterial` :1803, `coachPrompts.computeMaterialBalance` :993, `liveTacticsContext.describeMaterialBalance` :283. | Settled: Review, trades. Raw: chat (groundedAnswer:6329), How-to-Think (thinkingAssessStep), LLM prompts, Play live context |
| 12 | Is the king unsafe? | `positionReadingService.kingSafetyRead` :1760. `kingSafety.detectKingExposure` :56 and `detectCentralKingDanger` :142. `reviewSacrifice.enemyKingStuckInCenter`. | Chat and How-to-Think (thinkingAssessStep); positionFacts and chat; Review (reviewFullData, coachFeatureService) and nextPlans |
| 13 ✅ partial (2026-10-07: one MIN_BOOK_GAMES; the two finders differ in SOURCE on purpose — Learn sync masters cache, Review async masters+amateur at the student’s band — merging the source is a decision, not a refactor) | Where did the game leave book? | `bookDeparture.bookDeparture` :49 (sync masters cache). `theoryDeparture.findTheoryDeparture` :73 (masters plus amateur explorer). Each declares its own `MIN_BOOK_GAMES = 20`. | Learn (openingAnnouncement→CoachTeachPage); Review (CoachGameReview, coachFeatureService, reviewOpeningTheory) and weakness profiles |
| 14 ✅ partial (2026-10-07: detectPhase reads the board via phaseOfFen; classifyPhase (move-number) still files the persisted mistake buckets + phase stats — switching it re-buckets future records against stored ones, a decision for David) | Which game phase is this? | `gamePhaseService.classifyPhase` :63. `narratedContinuation.detectPhase` :37 (no queens or nonpawn ≤16, ply ≥16). `boardConcepts.phaseOfFen` :209. `endgameMatchup.classifyMatchup` :153 (`ENDGAME_PIECE_CAP` 12). | classifyPhase: most surfaces. detectPhase: positionReadComposer. phaseOfFen: Play playCommentary, Review orientation, Danya. classifyMatchup: conceptEngine, pushOrHold |
| 15 | Did the student miss a tactic? | `missedTacticService.detectMissedTactics`. `liveCoachTriggers.detectMissedTactic` :91 (gap ≥100cp plus a boolean flag). `tacticAlertService.detectGameplayTactic` :428 (uses detectTacticType, so it is a wrapper for the type, but has its own gate). | Review and Play (CoachGamePage); Play `useLiveCoach` |

The grade wording is also split, though it is phrasing, not a fact: `reviewFullData.QUALITY_CLAUSE` :1266 vs the verdict strings in `groundedAnswer.assembleMoveRatingAnswer` :5765.

Single-implementation areas checked:
- **Endgame type:** `classifyMatchup` wraps `classifyEndgameType`.
- **Opening name:** `detectOpening` is shared.
- **Kid detectors:** kidBoardAnswers is chess.js-only (raw attacked-piece facts at :194), so it is a minor independent hanging read.

## Counts
- **Duplicate groups:** 15.
- **Extra producers:** about 47 beyond one per group. By group: 1:4, 2:1, 3:8, 4:5, 5:1, 6:5, 7:1, 8:3, 9:3, 10:10, 11:3, 12:2, 13:1, 14:3, 15:2. Counted conservatively, with the strong-divergence groups 2–9 and 11–13 alone it is about 33.
- **Highest-risk conflicts:**
  - Group 5: two turning-point definitions on the same Review page.
  - Group 7: two trade verdicts, Learn vs Review.
  - Group 2: hanging defined two ways, Play/Learn vs chat/Review/How-to-Think.
  - Group 11: raw vs settled material count, chat vs Review.
  - Group 1: "brilliant" means swing ≥200 in Play's classifier but needs a sacrifice in Review.

## B. Deciders, memory, questions, register, recaps
## Duplicate coach machinery census (repo: /home/user/wt-work/src, test files excluded)

All call sites below come from grep results.

### 1. Decider doors (what speaks, in what order)
| Door | Def | Surfaces (call sites) |
|---|---|---|
| `coachDecider.decide` (+ `factSelector.selectFacts`, `reviewFacetRank.FACT_ROLE`/`facetRank`) | services/coachDecider.ts:297 | Through `positionFacts.computePositionFacts`:1050: Play live (useLiveCoach:264, 'interrupt'), phase narration (usePhaseNarration:635, 'interrupt'), Learn walk read (CoachTeachPage:9692, 'walk'), Chat (positionReadComposer:130, whyBestMove:118, 'walk'). Called directly by Review (coachFeatureService:2308) and Tactics (puzzleMethod:41) |
| `learnTurnDoor.decideTurn` (LEARN_LANES `lead`, DESCRIPTION_LEAD=40, BEGINNER_ALWAYS, DANGER_LANES) | learnTurnDoor.ts:319 | Learn only (CoachTeachPage:7801, 8845, 11120). Its teach/describe split repeats the FACT_ROLE idea, and it does not import reviewFacetRank |
| `voicePackage.buildVoicePackage` (keep/order) | voicePackage.ts | learnTurnDoor, usePositionNarration (Puzzles, Play, Learn) |
| `playCommentary.buildPlayCommentary`/`buildPriorityFirst` | playCommentary.ts:652/579 | Learn only (CoachTeachPage:8523) |
| `usePhaseNarration` transition gate | hooks/usePhaseNarration.ts:149 | Play (CoachGamePage:1851), Learn (CoachTeachPage:7781) |
| `teachingSelector.selectTeaching` | teachingSelector.ts:192 | Review:1461, usePhaseNarration:545, openingGenerator:524 |
| Review pre-gates in coachFeatureService, applied before `decide` | coachFeatureService.ts:1487-1727, 2095-2456 | Review |
| Chat routing: `chatTurn.fastPathLane`/FAST_PATH_LANES/CHAT_KINDS and roughly 30 `questionIntents.is*` predicates | coach/chatTurn.ts:50,145,234; coach/questionIntents.ts | dispatchCoachTurn:170,188,236 and coachService |
| Kids: `kidGameCoach.answerKidGameQuestion` | kidGameCoach.ts:398 | GuidedGamePage:190. It skips dispatchCoachTurn. No call site anywhere passes `surface: 'kid'` |

- **Dead:** `rankFacets` (reviewFacetRank.ts:434) has no callers.
- **Surfaces that never reach coachDecider:** Learn instant/late turns, playCommentary, Openings walkthrough (openingGenerator uses selectTeaching), usePositionNarration, Kids, Chat grounded answers (except positionReadComposer and whyBestMove), Endgame recap.

### 2. Say-once / already-said memories
I found about 16 independent owners holding more than 60 sets.
1. `learnMemory` (services/learnMemory.ts:52/223), Learn. About 15 stores, including spokenKeys, conceptTaught, principleTaught, structureSaid, spokenTacticLines, spokenThreatLines, loudAlarms, questionsAnswered, pieceQualitySaid, saidExplainers, gemSeen, lastComputed, lastTacticKey/lastThreatKey and slipsThisGame.
2. `standingFactMemory` (standingFactMemory.ts:52), shared by Learn (CoachTeachPage:7748) and usePhaseNarration:167. **`takeDefinition` (CoachTeachPage:7752-7758) checks and writes both `learnMem.conceptTaught` and `standingRef.said`, so it keeps one ledger in two places.**
3. CoachTeachPage refs: positionalSaidRef:1842, drilledSaidRef:1782, fundamentalSeenRef:1697, taughtGemIdsRef:1113, planToldBoardsRef:1774, playOutPromptedFor:3164, openingBreakRef.said:1779. CoachTeachPage:9742 also merges standing.said with positionalSaidRef.
4. Review, inside one function in coachFeatureService (1487-1727): about 28 Sets, e.g. reviewSpokenKeys, standingSpoken, threatsAnnounced, refutedSaid, hintsSaid, spokenHabits, spokenRefrains, announcedOpeningNames/Families, deepSaid:4209.
5. `standingRefrains` RefrainLedger, Review only (coachFeatureService:5214).
6. CoachGameReview refs: narratedPliesRef:1400 (walk re-speak), criticalDoneRef:1031, quizzedPliesRef:888, rewindOfferedPliesRef:1006.
7. usePhaseNarration local `spokenKeys`:304.
8. useLiveCoach `saidRef`:162 (Play).
9. CoachGamePage `announcedHangingRef`:553 (Play).
10. `saidHabitsRef` copied verbatim in PuzzleBoard:183 and MistakePuzzleBoard:184.
11. `planMemory` (stepPlan in positionFacts:49, foldPlans in teachingSelector:39), plus the separate `planArc` entry.announced.
12. useTeachWalkthrough: deltaSaidRef:907, playedGemIdsRef:987.
13. useThinkingLesson `carryAskedRef`:126.
14. TacticDrillPage `noteIdsSeenRef`:103.
15. dispatchCoachTurn `conversations` Map per surface:56 (chat).

`coachDecider` keeps no store of its own; it passes `bundle.alreadySaid` through to factSelector ('said-already'). `learnFundamentalNarration:138` builds a fresh `seenLabels` set on each call, so it remembers nothing.

### 3. Questions and withholding
No module decides withholding for all surfaces; each site decides for itself.
- **Review turning-point pickers (3):** `turningPoints.selectTurningPoints` (questionPlan, CoachGameReview:783); `reviewTurningPoint.buildTurningPointQuestion` (CoachGameReview:1454, which uses `criticalMomentAsk`); `teachingSelector` turningPointCandidates + rankSwingCandidates:208-218 (for the thesis).
- **Review:** guidedFindTheMove `buildHoldChallenge`/`judgeGuidedFindAttempt`; blunderRewind `findRewindTarget`; `principleQuiz` reading quiz.
- **Learn:** learnMemory heldMove (deliberation), gemPending, slipAnswer, questionsAnswered; drills via `pickCoachDrill`.
- **Openings:** OpeningPlayMode:405-456 gem callout withholds the move.
- **Puzzles:** `usePositionNarration` `withhold` argument (PuzzleBoard:291, MistakePuzzleBoard:687; null from Play:1815 and Learn:7768).
- **Hints:** `hintRegister` `withhold`:156.
- **How-to-Think:** `useThinkingLesson` (PatternSchool, TacticSetupBoard, ThinkingLessonBoard, CoachesLibrary, CoachTeachPage).
- **Dead:** `threatCheck.buildThreatCheckQuestion` has no callers.

### 4. Surface register / identity
- `SURFACE_CONTRACT: Record<CoachSurface, SurfaceContract>` is declared at coach/surfaceContract.ts:30 with fields {register, withholds, speaks}.
- **Only `registerFor` is ever used**, in 3 places: CoachGameReview:1463, usePhaseNarration:549, openingGenerator:2471. `contractFor`, `.withholds` and `.speaks` have zero readers.
- CoachTeachPage never calls `registerFor`.
- Play has no CoachSurface of its own; it only appears as 'game-chat' and 'phase-narration'.
- Parallel registers are hard-coded at call sites:
  - `SurfacePosture` 'walk'/'interrupt' literals (6 sites)
  - `RaceRegister` (reviewFullData:897 'review'; conceptEngine:608 and boardPlan:125 'live')
  - `RecurrenceRegister` (coachFeatureService:1871, 2569)
  - `CausalRegister` 'review'|'learn' (coachFeatureService:1848)
  - `CriticalMomentRegister` (reviewTurningPoint:204)
  - `HintRegister`
  - `stakeText({past})`

### 5. Thesis / recap producers
- `selectTeaching`+`renderThesis` (Review, phase narration, Openings)
- `summarizeTeaching` (openingGenerator:2470)
- `generateNarrativeSummary` (coachFeatureService:325, Review 531-571)
- `phaseScopedReviewSummary` (gamePhaseService:191, Review 503)
- `renderFundamentalsRecap` (principleVoice:770, coachFeatureService:5328)
- `buildEndgameRecap` (EndgameRecapCard:71)
- `openingSummaryLine` (Learn 10500)
- `phaseVerdictLine`/`phaseVerdictKeys` (positionFacts:908)

Review alone has 4 recap producers, and Learn has none from selectTeaching.

### Duplicate-groups table
| Group | Implementations | Extra |
|---|---|---|
| Decider doors | 9 | 8 |
| Teach-vs-describe role tables (FACT_ROLE vs LEARN_LANES lead/DESCRIPTION_LEAD) | 2 | 1 |
| Say-once memories (owners) | 15 | 14 |
| Turning-point pickers | 3 | 2 |
| Question/withholding systems (live) | 11 | 10 |
| Register/posture declarations | 7 | 6 |
| Thesis/recap producers | 8 | 7 |
| Chat routers (fastPath/CHAT_KINDS, questionIntents, kid) | 3 | 2 |

**Totals: 8 groups, 58 implementations, 50 of them extra.** There are also 3 dead exports (`rankFacets`, `buildThreatCheckQuestion`, `contractFor`) and 2 exact copies (saidHabitsRef; the takeDefinition double ledger).

## C. Engine, phrasing, voice, arrows, players
I found **13 duplicate groups** with about **75 extra implementations** across the five scopes. Paths are relative to `/home/user/wt-work/src`. Everything is based on grep with `*.test.*` files excluded.

## 1. Engine reads

There are **2 engines and 2 caches**:
- **Singleton:** `services/stockfishEngine.ts`, with `analyzePosition` at :1381, `analyzeWithBudget` at :1898, `getBestMove` at :1723 and `setMultiPv` at :2015.
- **Separate worker pool:** `services/gameAnalysisService.ts`, spawned at :708/759. It pins MultiPV 1 (:566, :772) and has its own MultiPV fan at :615. `acquirePvEngines` is at :921.
- **Cache A:** `services/stockfishCache.ts`, an LRU of 256 keyed `fen::depth`, with in-flight coalescing. Only the singleton uses it.
- **Cache B:** `hooks/stockfishFenCache.ts`, a separate per-FEN cache used only by `usePositionNarration` and `usePhaseNarration`.

**Gaps that cause double reads:**
1. The pool never consults `stockfishCache`, so a position the batch analysed is analysed again by Review or Learn on the singleton.
2. The cache key ignores MultiPV.
   - `CoachGameReview.tsx:933` widens MultiPV to REVIEW_MULTIPV and `CoachTeachPage.tsx:9424` widens it to 6. Their results are cached under the same `fen::depth` as 3-line reads, so a later call can get the wrong number of lines.
   - `coachAnswerGates.ts:400` instead passes `{MultiPV:5}` as options, which bypasses the cache completely.
3. Depth is part of the key, so the same FEN at d8, d10, d12, d14, d16 or d18 is a separate search each time.

**Call sites by surface (depth / budget):**

| Surface | Call (depth / budget) |
|---|---|
| Play | `CoachGamePage` d10 @2368, @2788, @3183 (5s timeout); d8 @2582; d12 prefetch @4292; d16 @4544; getBestMove @2489. Also `coachPlaySession:231` getBestMove, `moveRating:297` d14, `useCoachTips:254` d10 |
| Learn | `CoachTeachPage` d12 @1456; COACH_TURN_DEPTH = 14 (`engineConstants:137`) with budgets of 900 ms (@2857, @10797, @10828, @10925), 1200 ms (@9425, MultiPV 6), 1500 ms (@9361) and 2500 ms warm (@9338); d15 @11945; getBestMove 1500 ms @12037. `useDiscussionPractice:400` d14 |
| Review | `CoachGameReview` d? at 4000 ms (@935, widened MultiPV), 3500 ms (@1590), d12 at 2500 ms (@1716), 2500 ms lecture (@2462). `scanCriticalMoments` @867 uses the pool. `coachFeatureService:3609` and `:3925` use the pool via `acquirePvEngines`, and `:4030` calls `computePvLine` (`pvPlayback:529`) |
| Batch / deep pass | `gameAnalysisService` pool: d16 (ANALYSIS_DEPTH) and d18 (BEST_MOVE_DEPTH) at 800 ms; a shallow d12 pass on the *singleton* @1920; deep pass @1972 |
| Chat | `VoiceChatMic:391` d10; `coachAnswerGates:400` d12 with MultiPV 5; `enginePlanContext` d18 @97 (budgeted) and @172 (unbudgeted, two paths for the same read); `liveTacticsContext:151` d12 at 1500 ms; `ExplainPositionSessionView` d18 |
| Hints | `useHintSystem:171` d10 |
| Narration | `usePositionNarration:212` and `usePhaseNarration:597`, both d10 on budget |
| Tactics / Puzzles | `mistakePuzzleService` (8 calls, d12); `gemFinder` d12 at 350 ms; `punishPlayout:137`; `thinkingCandidatesStep:47` d12 |
| Endgame | `endgameRecapService:152` d8 |
| Openings | WalkthroughMode, TrainMode, DrillMode, PracticeMode, OpeningPlayMode (×2), ModelGameViewer (×3), MiddlegamePractice |
| Kids | `GameChapterPage` (2 calls) |

`criticalityScan.scanCriticality` (:103) is imported by `onlyMoveSequence.ts` and `mistakeLineGrowth.ts` and runs another engine fan through its `EvaluateMulti` callback.

## 2. Phrasing templates

**G1. Piece-name tables:** about 40 separate copies of the `p→pawn` map. Examples:
- `sanToSpeech:47`, `moveFundamentals:196`, `reviewFullData:1280`, `reviewMoveBriefing:36`, `mistakeNarration:311`, `continuationMoveNarration:35`
- `pvPlayback:302`, `groundedAnswer:6312` and `:7224`, `chatTurn:223`, `threatCheck:15`, `tacticsDetector:15`, `tacticNarrationService:7`
- `turningPoints:94`, `deliberation:396`, `kidBoardAnswers:28`, `kidGameCoach:43`, `lookaheadPlan:38`, `fastMoveNarration:73`, `puzzleHints:3`, `pinPressure:150`, `tacticClassifier:41`
- …plus about 18 more.

There is also no shared reverse table (word→symbol): `chatTurnParser:57`, `chatTurn:349`, `spokenMoveParser:18`, `groundedAnswer:138` and `boardClaimValidator:61` each have their own.

**G2. SAN to words:** 6 implementations.
- `utils/sanToSpeech.ts:16` (`sanToSpeech`) and `:55` (`sanToWords`)
- `voiceService.ts:~509`, the SAN_MOVE_RE expander
- `useTeachWalkthrough.ts:~71` (`sanToFriendly`)
- `tacticNarrationService.ts:11` (`describeMove`)
- `groundedAnswer.ts:4358` (`explainSanNotation`)

On top of that, 13 separate `*SAN*_RE` tokenizers exist; `arrowEngine:122` and `coachMoveExtractor:47` are two of them.

**G3. List joining:** `utils/andList.ts` is used by 35 files, but 17 inline copies of `slice(0,-1).join(', ')` remain. They are in structureProse, keySquares, bluffDetector, thinkAloud, positionReadingService, tacticsDetector, coachFeatureService:3539 (Oxford comma), exchangeLedger, groundedAnswer (3), latentFork, reviewMoveTeaching (Oxford comma), boardDelta, lineCalc, lookaheadPlan (2) and useCoachTips. The copies disagree on the Oxford comma.

**G4. Cost / eval wording:** 7 implementations.
- `engineConstants.costWords:197` (14 importers) and `describeEvalCp:74`
- `autoAnalyzeGame.cpToWords:101`
- `coach/envelope.describeEval:662`
- `groundedAnswer.evalPhrase:90`
- inline `/100).toFixed(1) pawns` in coachContextEnricher, coachChatService and CoachGameReview

`utils/shareWords` is shared by 3 files.

**G5. Grade label / colour tables:** 8 copies, in ChessBoard:96, ControlledChessBoard:76, GameViewer:24/39, MoveListPanel:48, EndgameRecapCard:34/41, ReviewCitationPreviews:17/26, MyMistakesPage:34/41, plus prose versions in `reviewFullData:1269`, `gameNarrationBuilder:38` and `mistakePuzzleService:135`.

**G6. Tactic name / definition tables:** about 12.
- `tacticVocabulary` (3 tables, :45/:74/:147), `tacticClassifierService` (:16/:41/:64/:665)
- `conceptEngine:125/139`, `puzzleConceptExplanation:40/57`, `tacticNarrationService:192`
- `missedTacticService:933`, `danyaTeachingService:1249/1309`, `tacticAlertService:540`
- `gameCalculationPuzzleService:38`, `tacticalProfileService:25`, `patternRegistry:156`, `Insights/TacticsTab:15`

**G7. Principle / rule prose:** 2 ID spaces (`MoveFundamentalId` at `moveFundamentals:34` and `FundamentalId` at `principleAttribution:71`) and 8 prose tables:
- `moveFundamentals.PRINCIPLE_REASON:1191`
- `principleVoice.FUNDAMENTAL_HOW:48`
- `fundamentalsCatalog.SECTION_TEACHING:203` and `FUNDAMENTAL_LABEL:230`
- `data/fundamentalLessons.FUNDAMENTAL_LESSON:94`
- `groundedAnswer.FUNDAMENTALS:4064`
- `data/principles.PRINCIPLE_DEVICES:19`
- `methodBeat.FUNDAMENTAL_HABIT:64` (only 2 keys, a string-keyed bridge)

**G8. Side / pronoun helpers:** 8.
- `sideWord`, 4 copies: EndgameTablebaseTrainer:274, engineDeltaLines:34, gemCrushLines:288, thinkingAssessStep:52
- `structureProse.possessive:40`, `pieceOptions.whose:229`, `playEntryNarration.sideLabel:55`
- the rule text in `perspectiveRule.ts:86`

## 3. Voice delivery

**G9. Speech output paths:**
- `voiceService` has 8 public speak methods: speak (107 calls, 55 files), speakForced (20 calls, 15 files), speakIfFree (8), speakReadAloud (7), speakPackage (6), speakLecture (4), speakGrounded (4) and speakWhenIdle (2). Internally there are 5 private paths: speakInternal, speakInternalTracked, speakCloud, speakCloudChunked and speakFallback.
- **Bypasses voiceService:**
  - `Openings/MiddlegamePractice.tsx:303/353/358/364` calls `speechService.speak` directly, using Web Speech and skipping the cloud voice and the queue.
  - `Settings/VoiceSettingsPanel.tsx:120` uses `new Audio`, which is acceptable for a voice preview.

**G10. Narration queue / timing loops:** 6 of them.
- `useStrictNarration`: 3 timers, 5 speaks; used by WalkthroughMode, LessonPlayer, useReviewPlayback and useNarration
- `useNarration`: Play, Endgame, EvalLab
- `useTeachWalkthrough`: 14 timers, 2 speaks; 2,868 lines
- `useWalkthroughRunner` + `services/walkthroughRunner`: Session, MiddlegamePlanInline
- `PlayableLinePlayer`: 10 timers, 3 direct speaks, no shared hook
- `useReviewPlayback`: `AUTO_ADVANCE_PAUSE_MS` constants

`narrationSegments` is used only by LessonPlayer, CoachTeachPage and openingGenerator.

## 4. Arrows

**G11. Prose → move-arrow resolvers:** 5 independent implementations, all eventually going through `arrowDoor.admitArrows` (15 callers):
- `learnBoardTeaching.namedMoveArrows:432` — Learn, and Review via `coachFeatureService.segmentNamedArrows:611`
- `narrationArrows.deriveNarrationArrows:180` with its own tokenizer — Openings via `mentionedMoveArrows`, `openingGenerator.groundedSegmentArrows` and `repairNarrationArrows`, and `punishGems`
- `arrowEngine.spokenLineArrows:515` — Puzzles
- `coachMoveExtractor.extractMoveArrows:55` — Chat (GameChatPanel)
- `VoiceChatMic.extractArrows:32`, which parses `[ARROW:]` tags

There is also `MiddlegamePractice.buildEngineArrows:84`, a private derivation of engine arrows.

`injectCandidateArrows` is wrapped by `applyCandidateArrows` (5 surfaces), which is layered rather than duplicated. `computeLeadEyeArrows` (`arrowEngine:104`) has no caller outside its own file.

## 5. Boards and players

**G12. Board wrappers:** 4.
- `ConsistentChessboard` (28 files use it directly)
- `ChessBoard` (14) and `ControlledChessBoard` (14), each with its own grade-colour table
- `KidChessboard` (20)
- plus `MiniBoard` (3)

**G13. Lesson / line players:** 8.
- In Openings, all mounted only by `OpeningDetailPage`: `LessonPlayer` (400 lines), `PlayableLinePlayer` (981; also used by CourseSyllabus), `WalkthroughMode` (965), and `ModelGameViewer` (575; also used by ProGames)
- Plus `useTeachWalkthrough` (Learn, Endgame, Session), `useWalkthroughRunner`, `useReviewPlayback` (Review) and `useThinkingLesson` (Tactics, Learn, Library)
- `useLineWalk` (Puzzles, Tactics, Learn) is a further line-walk mechanism.

## Counts

| Group | Implementations | Extra |
|---|---|---|
| Engine stacks / caches | 2 + 2 | 2 |
| G1 piece names | ~40 | ~39 |
| G2 SAN to words | 6 | 5 |
| G3 list join | 18 | 17 |
| G4 cost wording | 7 | 6 |
| G5 grade tables | 8 | 7 |
| G6 tactic tables | ~12 | ~11 |
| G7 principle prose | 8 | 7 |
| G8 side words | 8 | 7 |
| G9 TTS bypass | 1 | 1 |
| G10 narration loops | 6 | 5 |
| G11 arrow resolvers | 5 | 4 |
| G12 boards | 4 | 3 |
| G13 players | 8 | 7 |

The largest problem is G1 and G3 combined with G2. The most severe correctness problem is the engine cache key, which ignores MultiPV and is never used by the pool.

## D. Student model
## Student-model duplicate census (/home/user/wt-work/src)

All paths are under `/home/user/wt-work/src/services/` unless noted. Call sites come from grep and exclude `*.test.*` files. I did not check any double-count against real data.

### Highest-impact findings
1. **`tacticalProfileService.computeTacticalProfile` (:43) has no callers.** `getStoredTacticalProfile` therefore always returns null. As a result, `tacticAlertService.isTacticWeakness` (:603) always returns false for `hooks/useCoachTips.ts`, and `getWeakestTypes` always returns `[]`. This is a dead parallel "is this a weakness" reader.
2. **A tactic hole is probably double-counted.** `weaknessSpine.mergeByKey` (:859) adds `openCount` and `total` together for `analysis:tactic:<type>`. Both `mistakePuzzles` (from `aggregateMistakePuzzles`) and `classifiedTactics` (from `aggregateClassifiedTactics` :601) are built from the same `game.annotations`, so one missed move likely counts twice. Positions are de-duplicated, but the counts are not.
3. **The theme↔tactic maps disagree.** `tacticClassifierService.LICHESS_THEME_TO_TACTIC` (:39) maps `capturingDefender` to `removing_the_guard`. The reverse map, `weaknessSpine.themesForTactic` (:347), maps `removing_the_guard` back to `defensiveMove` and maps `overloaded_piece` to `capturingDefender`. The round trip breaks.
4. **Up to six "green / fixed / mastered" rules give different answers** (group B2).

### A. Recording: parallel records of one event
| # | Event | Parallel records (writer → surfaces) |
|---|---|---|
| A1 | Game slip | `mistakePuzzles` (`generateMistakePuzzlesFromGame`: gameAnalysisService, CoachGamePage, CoachGameReview); `misconceptionTags` counted:false (`autoAnalyzeGame` :503/:543; also GameReviewWeaknessCapture); `classifiedTactics` (`classifyTacticsFromGame` via gameAnalysisService); `capabilityEvidence` broken (autoAnalyzeGame, gameAnalysisService); `moveVerdicts` (`saveVerdict`: gameAnalysisService, learnGameRecord) plus `games.annotations`. That is 5 stores. The spine de-duplicates by position only between coach rows and mistake puzzles. |
| A2 | Lichess puzzle miss (`components/Puzzles/PuzzleBoard.tsx` :464/:467/:538) | `puzzleMisses`; `misconceptionTags` (uncounted mirror); `capabilityEvidence`; `puzzles.attempts/successes` via `puzzleService.recordAttempt`; `recordTagDrillResult` (AdaptivePuzzlePage :293/:375, WeaknessTagDrillPage :65; pass bar `>=0.6` copied 3 times); `puzzleRating`. Two puzzle-performance stores feed different readers: `puzzles.attempts` → `getThemeSkills`, and `puzzleMisses` → the spine. |
| A3 | Spaced repetition | 5 schedulers: `srsEngine` (puzzles, mistakePuzzles, flashcards, setupPuzzles); `srsOpeningService.applySm2` :347 (a second SM-2); `misconceptionService.SRS_INTERVALS_MS`/`masteryHits`; `endgameProgressService.ENDGAME_REVIEW_INTERVALS_MS`; `trapLearning`. One slip is scheduled twice: its mistakePuzzle SRS and its misconception `masteryHits`. |
| A4 | Opening move failure | `openingWeakSpots` (`recordWeakSpot`: Openings TrainMode, PracticeMode, DrillMode); `srsOpeningCards` (SrsTrainerPage); `flashcards`; `openingProgress` (meta); `bookDepartureWeakness`. |
| A5 | Learn, How-to-Think and lessons (already unified) | `recordTeachingEvidence` → `recordLaneEvidence`; `recordAnswer` (answerRecord: AnalysisPracticePage, thinkingLessonRecord) writes 3 records. These all end in `capabilityEvidence`, so this is not a duplicate. |

### B. Readers giving different answers
| # | Question | Implementations |
|---|---|---|
| B1 | Whole weakness profile | `getUnifiedWeaknessProfile` (21 files). The legacy `weaknessAnalyzer.computeWeaknessProfile` / `getStoredWeaknessProfile` is still read by StatsPage, CoachGamePage, CoachTeachPage (:11587, beside the spine at :2706), coachChatService, coachContextSnapshot and coachTrainingService. `gameInsightsService.getMistakeInsights` / `getTacticInsights` (raw `mistakePuzzles`) back the **/weaknesses** page (GameInsightsPage), coachApi, groundedAnswer and coachContextEnricher. Also `getMisconceptionProfile` (MisconceptionsTab), `getEndgameWeaknessProfile`, and the dead tactical profile (finding 1). **6 readers.** |
| B2 | Green / fixed | `capabilityProven` (heatMap, needScore, studentMomentBoost, teachingLayers, thinkingLessonRecord, learnTurnDoor); `weaknessLifecycle` `'fixed'` (`boostFor`, `rankThemeTargets`, `teachingLayers.holeIsOpen`); curriculum `'mastered'` = no longer open in spine (coachCurriculumService :91); mistakePuzzle `'mastered'` = SRS reps (mistakePuzzleService :1388); `trapDecision` green = one unprompted hold (trapLearning :57); dossier strengths = lifecycle fixed + curriculum mastered, **never `capabilityProven`** (studentDossier :97). Divergence 1: a tag that is proven but not lifecycle-fixed shows green on the heat map, still ranks red in `rankThemeTargets`, and gets boost 0. Divergence 2: a tag that is lifecycle-fixed with open rows shows red on the heat map but counts as a dossier strength. |
| B3 | Fundamentals | `fundamentalsCatalog.getFundamentalCounts` (:320) counts every row ever (FundamentalsPage, coachApi). `weaknessSpine.aggregateFundamentals` (:446) counts only rows that are due. |
| B4 | Proven-tag set | `loadProvenTags` exists twice: weaknessSignalLoader :79 (memoized) and studentRecord :24 (not memoized). The logic is identical. |
| B5 | Weak-theme threshold | `puzzleThemeTargets` 0.6 / 3 attempts; `tacticalTrainingTarget` 0.75 / 5; `weaknessAnalyzer` 0.5 (strong at 0.75); `badHabitDetector` 0.4 / 5; UI colours 0.5 (StatsPage, AdaptiveSessionSummary). |
| B6 | "Open" rule per source, added together in `mergeByKey` | mistakePuzzle `unsolved`; misconception `isMisconceptionDue`; classifiedTactic `puzzleSuccesses===0`; puzzleMiss ≤30 days. |

The boost paths (`weaknessBoostCp`, `applyWeaknessBoost`, `studentMomentBoost`) all share `boostFor`, so they are not duplicates.

### C. Vocabularies
| Pair | Status |
|---|---|
| `TacticType` (types/index.ts:1701) ↔ `TacticPatternType` (types/tacticTypes.ts:39) | Bridged (tacticVocabulary.ts, exhaustive) |
| Lichess theme ↔ `TacticType`: 6 maps — `LICHESS_THEME_TO_TACTIC`, `THEME_TO_TACTIC` (tacticalProfileService :23, `sacrifice`→`deflection`), `themesForTactic`, danyaTeachingService :1257, `puzzleService.THEME_MAP` :55, `puzzleMisconceptionTag` | **Unbridged and inconsistent** (finding 3) |
| `FundamentalId` (33 ids, principleAttribution) ↔ `MoveFundamentalId` (15 ids, moveFundamentals) | Bridged through `MisconceptionTagId` (`FUNDAMENTAL_TAG` / `MOVE_FUNDAMENTAL_TAG`) |
| `PositionalConceptId` ↔ `ReviewConceptId` | Bridged (conceptVocabulary.ts) |
| `StudentMoveLane` ↔ `FacetTag` | Partially bridged (`REVIEW_TAG_FOR_LANE`, coachFeatureService :103; many lanes map to null) |
| `WeaknessCategory` (legacy) ↔ `MisconceptionBucket` ↔ `analysis:*` cluster ids | Unbridged (weaknessConceptMap.ts covers only part) |

### D. Rating / strength
| # | Duplicate |
|---|---|
| R1 | `currentRating` has 5 writers: OnboardingPage; GameImportCard and ImportPage (each calls `getPrimaryRating`); `gameAnalysisService` :2979 (finds the student by name substring); `strengthCalibrationService` (rewrites it at boot from `getPlayerRatingEstimate`, which finds the student by username). There are 2 readers: `engineStrength.studentPlayingRating` (7 sites) and `getPlayerRating` (only `openingGenerator`, which bypasses the stored value). `liveStrength` is a separate in-session estimate for Discussion Practice. |
| R2 | Default ratings: 400 (`DEFAULT_STUDENT_RATING`), 800 (puzzle), 1200 (endgame), 1200 (`coachActuator.ELO_DEFAULT` :551), 100 (kid). Clamps: 400–2800, 600–2800, 600–2600. |
| R3 | Per-skill ratings: `puzzleRating` (written by AdaptivePuzzlePage, PuzzleTrainerPage, TacticDrillPage, TacticCreatePage, OpeningBlundersPage, importers), `reachState`, `kidRatings`, `endgameRating` (EvalLabQuiz, useAdaptiveEndgameSession). These are read through `studentPuzzleRating` (unified). |

### E. Dexie stores holding the same data twice
1. `mistakePuzzles` and `classifiedTactics`: the same missed move.
2. `puzzleMisses` and `puzzles.attempts/successes`: the same puzzle miss.
3. `misconceptionTags` (counted:false) mirrors both `mistakePuzzles` and `puzzleMisses`.
4. `openingWeakSpots`, `srsOpeningCards` and `flashcards`: opening knowledge three times.
5. `games.annotations` and `moveVerdicts`: move grades.
6. `meta` blobs: `tactical_profile` (dead), the legacy weakness profile, the dossier and `openingProgress` are derived copies.

### Counts
- **19 duplicate groups:** recording 4, readers 6, vocabularies unbridged or partial 3 (3 bridged pairs excluded), rating 3, Dexie 6. A1–A4 and the Dexie list overlap.
- **About 45 extra implementations beyond one per group:** recording 17, readers 15, vocabulary 7, rating 9 (counting R2 defaults and clamps), not counting the Dexie overlap.
- **Dead code:** 2 (`computeTacticalProfile`, `getTacticMotifStats`, which has no callers).
