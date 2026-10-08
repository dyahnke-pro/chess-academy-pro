# The 30 designs, digested (full texts: designs.md)

## design:1 (student-first: what the student hears, move by move)
Built from what the student hears at 6.h3 in the Scandinavian: CHANGED → KNOWLEDGE → TEMPTING fails → answer → HABIT, each arrowed as it is said. Brief keeps roles 1 and 4.
Fact: `ChessFact`, widened from `VoiceFact` (voicePackage.ts:95). Fields: claimKey (kind+squares+seat), kind, seat, role, moves/line, stakes, verb, recordTag. Carries no prose.
Modules: engineRead, facts/*, moveGrade, decide, chain, ledger, render, marks, surfaceMode, record.
Chain: CHANGED, TEMPTING, REMOVE, LINE, HABIT. Decider: `decide` (coachDecider.ts:297) plus `selectFacts`.
Memory: one ledger per game and per student.
Engine: key is FEN4 + depth reached + MultiPV.
Arrows: `admitArrows` (arrowDoor.ts:187), one arrow per spoken segment.
Surfaces: every `SURFACE_CONTRACT` field gets a reader.
Deletes: decideTurn, the playCommentary ladder, Review pre-gates (coachFeatureService.ts:1487-1727), the dead cascade (:2532-3395), 5 resolvers, side graders.
Phases: P0 slip fix → P1 fact+engine → P2 chain on Learn → P3 Review → P4 ledger+marks → P5 grade+record → P6 other surfaces. Traps from P2.
Tests: string reasoners banned; one-ledger gate; one-engine gate; grade parity; 6.h3 tape contract.
UNIQUE: P0 = signed SEE at CoachTeachPage.tsx:8294 + `identityFor` family fallback (openingIdentity.ts:51) + pass `history` into Learn's read (CoachTeachPage.tsx:9692).
UNIQUE: required `recordTag` on every fact.
UNIQUE: tape contract that every spoken unit carries an F01 verb.

## design:2 (data model: the one fact type)
Diagnosis: there are 5 fact shapes. The decider takes `string[]` and holds squares and stakes in side maps keyed by sentence text (coachDecider.ts:134-155).
Fact: branded `Fact` in src/coach/fact.ts, built only by `makeFact`. Fields: id, kind, role, verb, seat, fen, squares{mark}, moves{vouchedBy}, lines{replyNamed}, stakes (required), links{so/but/first/then}, evidence{tag|na} (required), terms, read (ReadKey), typed payload. No text.
Tables: `Record<FactKind,{roles,verb,layer,capability|na,renderer}>` absorbs FACT_ROLE (reviewFacetRank.ts:267).
Chain: engine → producers → decide → composeChain → render → marks → ledger+record. Decider merges facts by id or by square set. A fact with no role and no verb is cut.
Memory: gameLedger + student Dexie store.
Engine: engineRead feeds the singleton (stockfishEngine.ts:1381) and the pool (gameAnalysisService.ts:708).
Arrows: `factMarks` → admitArrows, one ply at a time. Deletes `MAX_GREEN_ARROWS_PER_PLY`.
Phases: P0 type + adapters with a temporary `legacyText`, engine key fix, native pin-broken-with-tempo fact → P1 arrows → P2 ledger → P3 engine → P4 composer → P5 doors fold in, ~114 chat assemblers → P6 renderers own text → P7 one grader.
Tests: branded type; exhaustive table; statement-scan gate; seat test; dual-use test.
UNIQUE: `links` edges carried in the data, plus `evidence` as `{tag}|{na: reason}`.
UNIQUE: `read: ReadKey` stamp on every fact.
UNIQUE: flags first-person text at inaccuracyCall.ts:729-735 and opponentGap.ts:87-88 (V1).

## design:3 (the one composer)
Fact: `CoachFact` (src/services/coachFact.ts) with id, kind, role, seat, fen, squares, lines, stakes, links{so,but,first}, vocab, posed{question,answerSan}.
Roles: name, changed, goal, reason, obstacle, remove, tempting, line, their, habit, knowledge. `ROLE: Record<FactKind,ChainRole>` replaces FACT_ROLE and DNA_BEAT (learnTurnDoor.ts:122).
Chain: `thinkingChain.compose(selected, mode, ledger)`. Order: changed → tempting + line → remove → line → their → habit. A goal or obstacle opens the chain when there is no CHANGED fact. Links become words. Wording rotates on ply + claim hash. A fact with no role, link or stakes is refused.
Decider: decide over CoachFact[]: importance+need (posture-aware) → subsume by id → floor → stakes → compose.
Memory: GameLedger (with state hash) + TermLedger in Dexie.
Engine: one read.
Arrows: `marksFor(thought)`, drawn from where each piece will be.
Surfaces: Review withholds the tempting move and line until a tap; Learn names the move at deciding moments; Play on ask; Kids notation-free.
Mapping: changed=theirMoveChanged (moveInsight :573); obstacle=detectNewThreat + computeMustDefend with signed SEE; tempting=deliberation/refutedAlternative; goal=structurePlan; thesis=teachingSelector; habit=methodBeat; knowledge=conceptEngine; name=openingIdentity.
Phases: P0 adapters → P1 compose on the read-position tap (positionReadComposer.ts:130), then Learn walk read (:9692) → P2 ledger+engine → P3 arrows → P4 Review (reviewFullData.ts:242) → P5 Learn live turns → P6 others → P7 TermLedger.
Tests: chainLinks.test, noProseArrows, oneLedger, deleted-module gate, no Math.random.
UNIQUE: lowest-risk first proof on the 190-line tap-only `positionReadComposer`.
UNIQUE: "their" role (the opponent's tendency) and a `posed` field.

## design:4 (the deciding computer: consequence D11 + record)
Diagnosis: stakes count only material or mate (factStakes.ts:27-33). Unstaked facts rank last (reviewFacetRank.ts:352-365). SEE is floored at 0 (positionReadingService.ts:212-215), so 6.h3 goes silent.
Fact: `CoachFact`{claimId, kind, role, seat, squares, moves, consequence, recordTag, render key}.
Consequence: `consequence.ts` replaces factStakes. Fields: kind (material, mate, square, structure, tempo, king, castling), points, plies, `usable`, `lasts`, `costs` (signed legalSeeGain :242 + exchangeLedger.proofCut :314). `Record<FactKind,ConsequenceRule>`. A drawback that is not usable scores 0 and is kept, not spoken.
Record: one `StudentRecord.read(tag)` → red/green/grey. capabilityProven (capabilityEvidence.ts:265) is the only green rule. Deletes the 4 rules that lower by absence. Spine holes get a capabilityTag.
Decider: `decide(moment, facts, record, mode)`: veto → subsume by claimId, then Jaccard → value = consequence×0.8^plies + record raise (replaces momentBoost/holeByFact) → importance+need (walk never closes on importance) → roles in F18 order → method → askDecider (red streak) → D9 row.
Memory: GameLedger reopens on a consequence or squares change; TermLedger.
Phases: P0 signed SEE + "cheaper attacker" consequence through today's stakes map (6.h3, 22.Qe4) → P1 CoachFact with a logged string shim → P2 Learn walk; fix queue-on-next-move drops (CoachTeachPage.tsx:10155) → P3 Review → P4 record + ledgers → P5 chain+arrows → P6 the rest.
Tests: exhaustive tables; ban `lifecycle==='fixed'` in lowering; D3 walk unit test.
UNIQUE: `Consequence` with `usable` and `lasts`.
UNIQUE: open question on the `GREEN_QUIET_BELOW` 1.5-pawn quiet (coachDecider.ts:129).

## design:5 (one memory per game)
Fact: `CoachFact`{claimId (made only by `claimOf`), kind, role, seat, squares, line, stakes, **stateKey**, render}. stateKey is a digest of attacker/defender count, stake and pinned value.
Chain: composeChain grown from depthClauses. Decider: decide extended with a ledger step and role assignment.
Memory: `GameLedger` (services/gameLedger.ts, a leaf).
- gameId minted once; `newGame()` is the only reset.
- `said: Map<ClaimId,{ply,stateKey,squares,depth}>`.
- `pending` slot replaces gemPending/heldMove/slipAnswer (learnMemory.ts:57-70).
- `credited`, `motifFirst` (motifLedger.ts:31), slipsThisGame, promises.
- Verdicts: new → full; same state → quiet `said-already`; changed state → reopen as a refrain with squares re-highlighted.
`StudentLedger`: Dexie v40, additive.
Engine/arrows/surfaces: standard. Play and Kids rows; Play silence moved into the table (CoachGamePage.tsx:281).
Risk: today's resets key on four different signals (learnMemory.ts:273, standingFactMemory.ts:57, useLiveCoach.ts:166, coachFeatureService.ts:1487). Old sets write through first, then are deleted. voicePackage `sayKey` (:408) stays as a backup until the gate lands.
Deletes: standingFactMemory, 28 Review sets, saidRef (:162), the fullmove reset (coachGameEngine.ts:430-437), saidHabitsRef ×2, spokenKeys (:304).
Phases: ledger in Learn → facts in Learn → Review on ledger → all in-game surfaces share it → chain + engine.
Tests: branded ClaimId; gate on `*said*` Sets and ply/fullmove resets; refrain test with attacker count 2→3.
UNIQUE: three-depth refrain (full → fact → refrain), rebuilt from standingRefrains.ts:236.
UNIQUE: `credited` ideas the student found ("the same fork you found on move 9"), plus the one `pending` slot.
UNIQUE: cross-game "you played this here last time" (B6).

## design:6 (one engine read per position)
Engine: src/services/engine/ `readPosition(fen, {minDepth, minLines, budgetMs, priority})` → `PositionRead{key via evalCacheKey (positionEvalCache.ts:48), lines with signed cp/mate and wdl, depthReached, multiPv, source}`.
- Monotonic: a stored read answers only if depth and lines both suffice.
- LRU over Dexie.
- `EngineBackend.search` for the singleton (MultiPV set and restored per search, not persisted at stockfishEngine.ts:2091) and the pool (needs WDL, full PV, signed mate; today MultiPV 1 at gameAnalysisService.ts:772, PV cut at :485, mate null at :948).
- The opponent's getBestMove (:1789) stays outside on purpose.
Derived once per read: one grade, one criticality gap (replaces 5 including criticalityScan.ts:103 and criticalMoment.ts:164), one "decided" gate, `computePvLine` reads stored lines.
Fact: CoachFact with a required `readRef`. Computers take `(read, board, record)` and cannot call the engine.
Chain/decider/ledger/arrows: standard. Deliberation gate removed (positionFacts.ts:463).
Surfaces: `Record<Surface,{…, enginePriority}>`. Priority changes depth and speed, never truth.
Bugs named: a budget-stopped read is cached at the requested depth (stockfishEngine.ts:1613, 2285); cache B ignores depth; leaked MultiPV makes the gap Infinity (criticalityScan.ts:122-125), giving false only-move calls.
Deletes: stockfishFenCache, stockfishCache, public setMultiPv, queueAnalysis (:1892), 3 scorers → 1, engine calls from 48 files.
Phases: P0 correct reads → P1 one door → P2 grade+criticality → P3 facts → P4 the rest, with prefetch.
Tests: engineDoor.gate, readMonotonic, multiPvIsolation, oneTruth.
UNIQUE: monotonic read store. UNIQUE: enginePriority per surface. UNIQUE: prefetch removes the ~7s Review start; MultiPV 3 as the standard everywhere.

## design:7 (arrows and highlights by construction)
Diagnosis: renderers return strings. 5 resolvers read prose back (learnBoardTeaching.ts:435, narrationArrows.ts:180, arrowEngine.ts:515, coachMoveExtractor.ts:55, coachFeatureService.ts:611). Learn's late queue text-matches facts (CoachTeachPage.tsx:11198). `squaresInText` (narrationSegments.ts:84). decide returns `spoken:string[]` (:224).
Fact: CoachFact{claimId, role, seat, stakes, clauses: Clause[]}. Clause = {words: SpokenWords, marks}. Mark = move | linePly{fenAt, order} | square{meaning} | ray{from,through,to} | region.
Renderers (render.ts): piece/square/move/line/seatWord return {words, marks}. `SpokenWords` is branded. `line()` replays with chess.js, giving per-ply `fenAt`.
Chain: composeThought → `Thought = Clause[]`. Decider returns facts and subsumes on marks.
Memory: ledger stores marks so a refrain re-highlights; first use of a term gets an explaining clause plus a ray.
Board: player.ts `speakThought` reveals marks per clause, with a new `BoardArrow.order` (types/index.ts:1321). Clears at the end of the thought. A refused mark silences its clause's marks and is logged.
Surfaces: a withheld fact's marks stay hidden until the student answers.
Deletes: resolvers, VoiceChatMic.extractArrows, squaresInText, MAX_GREEN_ARROWS_PER_PLY (openingGenerator.ts:1296), MAX_CANDIDATE_ARROWS (arrowEngine.ts:433), unfilled leadEyeArrows (:7972), 34 `arrows: []` lanes.
Phases: P0 required squares/lines on VoiceFact, late queue uses fact marks, arrow-coverage audit row → P1 clause-timed reveal, delete caps → P2 renderers → P3 decide → P4 highlight door, rays, dashed TEMPTING mark → P5 engine + contract.
Tests: `SpokenWords` type-only; property test; line test (N moves → N ordered arrows).
UNIQUE: Mark taxonomy with `ray` and `region` (square of the pawn, opposition squares).
UNIQUE: dashed TEMPTING arrow.
UNIQUE: arrow-coverage row asserted in both standing audits.

## design:8 (surfaces as mode settings)
Pipeline: board → computers → facts → decider → composer → renderer. Computers never see the mode row, so a tab changes how the coach speaks, never what is true.
Fact: `ThoughtFact` (src/coach/brain/fact.ts) extends VoiceFact. Adds a required role (incl. Changed, Knowledge), verb, seat, stakes, recordTag. `makeClaim` makes the branded claimId.
Engine: BoardRead.
Decider: decide replaces `posture` (:301) with `surface: CoachSurface`. It absorbs decideTurn, playCommentary, voicePackage order and the Review pre-gates.
Composer: DNA_BEAT generalised into `Record<Role,order>`. Renderer returns {words, marks}.
Memory: GameLedger + StudentLedger (one R4 reader + terms).
Contract row: {tense, posture, speaks, withholds, asks, corpus, render, recording}.
- Learn: walk, always, asks only per F05, no corpus.
- Review: retrospective, withholds the turning move.
- Play: interrupt, on-request.
- Chat: corpus yes.
- Lessons: the note leads.
- Openings Learn rung: voice says the move only. Practice: silent.
- Tactics: refutes wrong tries, withholds the solution.
- Kid: kidSafe.
- `recording` always on.
Fixes Play's no-op raiseSlipPrompt. Review gets depthClauses. applyBriefVoiceCap (voiceService.ts:1446) is replaced by a Brief choice in the decider.
Deletes: PLAY_VOLUNTEERS_COACHING (CoachGamePage.tsx:281), useCoachTips volunteering, 6 register enums, decideTurn etc.
Phases: P0 `decide(…, surface)`, live contract with a Play row, flag deleted, no change in output → P1 facts+ledger+read → P2 composer on Learn; fix history (:9692 vs positionFacts.ts:1009) and the deliberation gate → P3 Review → P4 others → P5 StudentLedger.
Tests: no posture literals; mode-blind computers gate (F2); same-board parity of claim ids across every row; `on-request` Utterance needs a request token.
UNIQUE: parity test across all rows. UNIQUE: mode-blind gate. UNIQUE: request-token type for Play. UNIQUE: flags stale comment surfaceContract.ts:18-21.

## design:9 (migration with least risk to paying users)
Risk model: users get code only via OTA or App Store. Phones' Dexie data cannot be renamed (R6), backfills must not freeze (R7), voice must not go quieter (V11). So every phase: add → shadow → switch → delete. A store is never deleted in the release that stops writing to it.
Modules: fact.ts (grows from VoiceFact :95), engineRead, moveGrade (extends saveVerdict :55, additive), chain.ts, decider (folds 9 doors), gameLedger + studentLedger, contract + one arrow adapter, typed renderers.
Surfaces table: Learn speaks every ply; Review asks before telling; Play on ask; Tactics refutation spoken; Openings per rung; Kids plain words.
Phases:
- P0 root fixes: signed SEE (positionReadingService.ts:212 vs :242; CoachTeachPage.tsx:8294); identityFor fallback (272 hidden entries); useCoachTips off on Play.
- P1 engineRead with both caches in shadow, disagreements logged.
- P2 Fact + arrows, threat lane first (detectNewThreat + computeMustDefend); each lane port deletes its resolver in the same commit.
- P3 ledger dual-write, covering the takeDefinition double (:7752).
- P4 one grader; backfill via backfillSchedule.ts.
- P5 chain+decider on Learn; learnTurnDoor retired after a hand walk.
- P6 Review: cascade, 4 turning-point pickers and 5 recaps go.
- P7 record: one reader, remove the mergeByKey double count (:859), one theme Record.
- P8 trap library + gem steerer. P9 Kids.
Tests: string-returning computers on a shrink-only allowlist; every `voiceService.speak*` through decide; `cpLoss >=` only in moveGrade; shadow diff (spoken plies ≥ old, claim accuracy 100%).
UNIQUE: shadow-switch-delete discipline tied to OTA risk.
UNIQUE: argues gems come late (P8) so they aren't built twice; the opposite of designs 10 and 12.

## design:10 (trap library F04 → voice)
Fact: CoachFact with `lineUci` type-required for LINE and TEMPTING, plus recordTag. Engine: `positionRead`; trap computers stop doing their own reads.
Library: trapLibrary.ts + trap-library.json.
- Row: {id, name, motif, seat, spineKey, setup?, slipSan, punishUci, proof{mate|piece, cutPly}, conditions[], freqByBand, status trap|pattern|slip}.
- Built from punish-gems, gambit gems, 16 *TrapLessons, repertoire trap lines, 2 classification JSONs.
- `trap` only if proofCut shows ≥3 points of settled material or mate. Replaces TRAP_BAR_CP=300 (punishGems.ts:66); 20 of 69 weapons win less than a piece.
- Index stays keyed by position (gemCrushLines.ts:116-139): 25 Bishop's Opening gems are reachable by transposition.
Computers: trapSet (new, after the student's move; learnBoardTeaching.ts:541 is null today), trapAhead (TEMPTING + REASON + safe alternative, replacing "Careful here…" :573), trapSprung, trapWalkedIn/Avoided (Review), patternConditions (pin breaks with tempo, in isRealPin pinGeometry.ts:135).
Steerer: `trapSteer` replaces slipsAllowed (coachGameEngine.ts:239-249). Grey and red traps planted once per game from the band's own moves. Book move (CoachTeachPage.tsx:7644-7651) yields to it. Hard = 0 planted.
Record: `trap:<id>` via capabilityEvidence; trapDecision (trapLearning.ts:48) is the one reader. Replaces 3 tags. Planted slips stay out of strength.
Deletes: openingTrapDetector + positionTrapScan (hand counts to the LLM, :124), gemFinder bar (:50), detectEnginePunish as a bar, 5 Jobava weapon lessons, "Can you find it?" (gemCrushLines.ts:801).
Phases: P0 steer + names + mechanism, proven by a muted audit hearing a gem → P1 library build, Légal/Shilling setup, Bishop's + Jobava → P2 record parity, V6 → P3 facts → P4 composer, S12 → P5 duplicates.
UNIQUE: `setup` bait moves and `status` trap/pattern/slip. UNIQUE: trapSteer with no rating parameter (type test). UNIQUE: test that planted slips never move strength.

## design:11 (opening teaching to the hilt V19/F02)
Note: this design couldn't read RULEBOOK; its rule IDs are inferred.
Fact: CoachFact{id, role (incl. KNOWLEDGE), kind, seat, squares, moves, lineUci, stakes, verb, source}.
Lens: `openingOracle.read(history, seat, band)` → BookFacts:
- identity on its defining ply (`defining`, openingIdentity.ts:20, has no reader today) + the opening's bargain;
- theory status; band-level moves from the amateur explorer;
- the usual next reply said as a warning;
- departure{ply, who, played, usual, usualJob, playedAllows};
- traps ahead, set and sidestepped (gem index), with name, mechanism, condition;
- authored lesson beats for this position and seat (compare-4 G8).
Replaces the 7 book judgments (bookDeparture.ts:49, theoryDeparture.ts:73 each with MIN_BOOK_GAMES=20, theoryDeviationScan, isBookLine, lecture departurePly, principleAttribution, buildOpeningMoveDetail).
`openingMoveJob`: guards / makes room / keeps line / allows. principleLine goes null after first use (moveFundamentals.ts:1291-1295), silencing 7 of 9 owed plies.
Chain: candidates at the student's level; opening gate removed (positionFacts.ts:463,480). Decider: chat joins too.
Surfaces (as written): Learn interrupt, Review walk, Openings walk, Play on ask.
Record: per-line strength, gem found/missed, "avoided trap" green.
Phases: P0 signed SEE, identityFor fallback (627/1,577 empty), MultiPV key → P1 wrap opening computers → P2 oracle; delete buildOpeningMoveDetail's own-play-DB line (F0d) → P3 move job, usual-reply warning, bargain/retreat menu, forkTrickFor both ways, pin-with-check incl. safe landing (5…Qxg5), gem steerer → P4-P7.
Tests: only the oracle imports explorer caches; Learn/Review departure parity; every repertoire book ply has a job fact.
UNIQUE: openingOracle merging the 7 judgments. UNIQUE: openingMoveJob. UNIQUE: usual-reply warning, bargain and retreat menu.

## design:12 (progression F03 decided by the record)
Fact: Fact{claimId, kind, role, seat, squares, lineUci, stakes, tags[], trapId?}. Exhaustive `Record<FactKind,Role>` replaces FACT_ROLE and LEARN_LANES.
Engine: one cache (A and B merged).
Trap library: F04 bar via proofCut (exchangeLedger.ts:314). Row: TrapId, setup, slip, punish, conditions, name, seat.
Record: red/green/grey per tag AND per TrapId, from capabilityProven, the spine and trapDecision.
Progression (lens): per student, per opening family, continuous `trapWeight` 0..1. Inputs:
- per-trap states;
- share of decisive games decided by a library trap in the first ~15 moves, either direction;
- how often the student's opponents fall for the traps the student sets.
Empty record → 1. No rating anywhere. Relapse raises it again.
Decider: value = stakes × progression weight for the fact family (trap/opening vs plan/thinking) × red holes. The dial changes order, never volume.
Chain adds the "what they keep doing wrong" step; deliberation on in the opening.
Behaviour: early, every opening move gets its job and trap both ways, and the coach plays the slip at the student's level. Later, plans lead; traps still speak where red or grey. Per opening: strong Italian, trap-heavy Caro.
Why no gem is heard: slipsAllowed is rating-gated (coachGameEngine.ts:239-249, :441); book moves come first (CoachTeachPage.tsx:7644-7651); one TRAP_TAG (trapLearning.ts:23), Learn-only.
Deletes: rating gate, isBeginnerMode self-report (ratingBands.ts:87), BEGINNER_ALWAYS (:316), trap systems #3-7, Jobava lessons.
Phases: library + per-trap record + steer (David hears a gem) → dial into decide, `trapWeight` in the D9 row → facts for opening/trap computers → compose/ledger/marks → Review/chat/Tactics → engine → Kids.
Tests: progression.noRating scan; behaviour sim; trapRecordParity.
UNIQUE: continuous per-family trapWeight measured from decided games. UNIQUE: opponents-fall-rate input. UNIQUE: B6 question on how many plies counts as "decided by a trap".

## design:13 (questions only for long-standing weaknesses F05)
Modules (src/coach/brain/): Fact, engineRead, collectFacts (computePositionFacts :1050 becomes a pure collector), composeChain, decide (reads contractFor :67, zero readers today), gameLedger, studentStanding (summariseEvidence + capabilityProven + spine provenance weaknessSpine.ts:79), askGate, marks.
Today: ≥11 places decide when to ask. Breakers: gem "Can you find it?" (gemCrushLines.ts:737), Review "Find the move" (CoachGameReview.tsx:1455), buildHoldChallenge (:84), findRewindTarget (:39).
Gate: `askGate(fact, standing, surface): Ask|null`. Ask{why: StandingProvenance (required), prompt, expect, channel 'board', tries 1}.
- Long-standing: broken in ≥3 distinct games over ≥14 days and not proven. Thresholds to be measured like capabilityGreen.measure.
- Never reads openCount (mergeByKey double counts, :859) or lifecycle 'fixed' (boostFor :150).
- Asks only when the board poses it this ply; once per tag per game.
- Cold start always null; rating never an input.
- Answers recorded `prompted:true` (:175) into 'know' (:83); never green.
Per surface (`Record<CoachSurface,AskPolicy>`): Learn asks and the student answers by playing a move, board never stops; Review "find it" only for long-standing cause tags; Play and chat never; Tactics exempt; Kids same gate.
Deletes: gem CALLOUTS (:736-740), principleQuiz/guidedFindTheMove/blunderRewind as separate askers, questionsAnswered (:99), the "never names the move" register (criticalMoment.ts:285).
Phases: Fact+ledger → standing+askGate on gem and Review (smallest) → engine → chain+decide → marks → grader + trap library.
Tests: askGate statement gate; cold-start fuzz; one slip in 5 stores counts once; prompted never green; D9 `asked{tag,games,spanDays}`, zero asks on a fresh device.
UNIQUE: required `why` provenance spoken with no number. UNIQUE: distinct-games + time-span rule. UNIQUE: S4 vs F05 conflict raised for David.

## design:14 (praise for improvement V6)
Fact: CoachFact{kind, role, claim, moves, squares, stakes, seat, verb, evidenceIds[]}. New IMPROVEMENT role reframes F18 step 1 ("this time you saw it…").
Verdict: gradeMove extended to G1-G6 and saved once; Great and Brilliant computed only there.
Record: capabilityProven is the only green. Evidence rows gain optional posedSquares and bestSan (:139-178) so praise can be arrowed.
`improvement.ts` (pure): game-start snapshot + this move's rows + verdict → PraiseFact|null. Kinds:
- dodged: red tag held unprompted;
- applied: generalises drilledTransferLine (learnBoardTeaching.ts:734-747);
- habit: count of posed questions all held;
- grade: Great or Brilliant;
- milestone: useProvenWatcher diff (:15-35).
Guards: unprompted only, never grey, ≥ PROVEN_MIN_IMPORTANCE (:222).
Decider: praise ranks like any fact; D4 folds praise into the move's own point on the same squares.
Memory: learnMemory promoted to GameMemory. Praise once per tag per game; milestone once ever.
Surfaces: Learn live; Review at the ply + recap; Play banked to Review; Tactics unaided red solve; Openings trap sidestepped (trapLearning.ts:57); Kids milestones; chat "am I improving?".
File map: learnReward's comment (:12-13) deleted; CoachTeachPage.tsx:1751-1756 is the milestone source; heatMap.newlyGreen (:88); teachingEffectService (:23-65) is recap context only; gem held row (computerRoles.ts:47).
Deletes: praise row of voicePackage.DNA_REFUSE (:279-282), extra green rules (studentDossier.ts:97, duplicate loadProvenTags), side graders.
Phases: P0 dodged + milestone in Learn → P1 one verdict → P2 facts → P3 memory+engine → P4 other surfaces + evidence from Play/imports → P5 Kids/chat.
UNIQUE: IMPROVEMENT role and the 5-kind praise computer. UNIQUE: praise type-gated (needs evidenceIds + squares). UNIQUE: noAbsencePraise gate.

## design:15 (terms taught in context V18)
Fact: CoachFact with required `terms: TermId[]` and capabilityTag.
Terms (lens): coach/brain/terms.ts `TERMS: Record<TermId,TermDef{define(fact,fen) → words+marks, motifTag}>`. Absorbs TACTIC_INVARIANT (conceptEngine.ts:124), MATCHUP_PRINCIPLE (:147), technique definitions (:183), chat glossary (groundedAnswer.ts:4024), FUNDAMENTALS (:4064), principle prose.
- A definition must be true on its board. The pin "can't move" (:126) is false when the piece leaves with check, so define reads `breaksWithTempo` and checks a safe landing (5…Qxg5).
Chain: the F18 order; a definition attaches to the fact that first uses the term. Decider: as others.
Memory: gameLedger replaces learnMemory (clears conceptTaught :277), the takeDefinition double (7752-7758), Review sets. Plus a Dexie `taughtLog` {id, first, last, count, gameId} for idea SRS too.
Term gate `termState`:
- new → full definition with marks;
- taught → bare word;
- understood (green via unprompted held) → bare word;
- relapsed → the short form once that game (conceptEngine.ts:50).
Fresh student: every definition.
Arrows: definitions carry geometry; a pin draws an x-ray ray (the door lacks that role today).
Surfaces: contract real; Play row replaces PLAY_VOLUNTEERS_COACHING.
Deletes: takeDefinition, reviewFullData.ts:566-570, tacticAlertService.ts:141, projectedLineVoice.ts:98, principlesTaught/conceptTaught/saidExplainers sets.
Phases: P0 terms + taughtLog + termGate (touches no decider) → P1 engine + ledger → P2 facts (explainBestMoveGrounded, betterMoveReason, moveWhy first) → P3 chain → P4 Review → P5 arrows incl. x-ray → P6 understood/relapsed states → P7 contract modes.
Tests: exhaustive maps from TacticPatternType, MatchupClass and PositionalConceptId to TermId; ban `tacticInvariant(` and `Remember —` outside terms.ts; two-game persistence test; termTruth on the first-gem board.
UNIQUE: 4-state term gate with relapse. UNIQUE: board-true `define` with the tempo exception. UNIQUE: per-language templates noted (S13).

## design:16 (never silent, narration setting picks points)
Modules: `Fact` {claimId, kind, role, verb, seat, squares, moves, line, stakes, tier thought|clause|floor}; `ROLE: Record<FactKind,Role>`; `engineRead` keyed on (FEN4, depth reached, MultiPV), which replaces cache A, cache B and the pool's own reads; `decide`; `compose` in F18 order (seeds thinkAloud.ts:226, deliberation, methodBeat); `ledger`; `marks` → `admitArrows`; `SURFACE_CONTRACT` (surfaceContract.ts:30) is the only place surfaces differ. Brief is off today (`NARRATION_BRIEF_CAP_ENABLED=false`, voiceService.ts:292), and if switched on it would clip by position (learnTurnDoor.ts:433).
Deletes: decideTurn, buildPlayCommentary, the second selectTeaching, cascade coachFeatureService.ts:2532-3395, pre-gates :1487-1727, 5 prose resolvers, say-once refs, newest-move-wins drop (CoachTeachPage.tsx:10145-10190).
Phases: P0 Fact + floorClause + NonEmpty + Brief selection as a wrapper over today's decide; P1 claimId, ledger, pacing; P2 engineRead; P3 threat/opening/why-better facts, then compose; P4 Review; P5 marks; P6 other modes.
Tests: `decide(walk)` returns `NonEmpty<Fact>`; speak takes only a Thought; `applyBriefVoiceCap` imported only by the tripwire; two moves 300ms apart both get a clause; audit asserts `silentWalkPlies===0`, `briefTrips===0`.
UNIQUE: `floorClause` is a move-point fact at floor tier, built from narrateContinuationMove (continuationMoveNarration.ts:75) plus the move's job (moveFundamentals.ts:393). It speaks only when nothing stronger covers the ply.
UNIQUE: pacing compresses instead of dropping. Move N is cut back to its lead clause, its unsaid facts go back to the ledger, and a "what changed" fact can carry them into N+1.
UNIQUE: Silent still runs decide and writes the record, with the facts marked "unsaid".
UNIQUE: `applyBriefVoiceCap` becomes a tripwire. Any truncation counts as a defect.

## design:17 (deleting ~217 duplicates safely)
Modules: `ChessFact` extends VoiceFact (voicePackage.ts:95) with kind, role, claimId, seat, stakes (factStakes.ts:27) and capabilityTag. One `Record<FactKind,Role>` replaces FACT_ROLE (reviewFacetRank.ts:267) and LEARN_LANES. `engineRead` replaces the `fen::depth` key (stockfishCache.ts:33) and the pool reads through it (gameAnalysisService.ts:921). `moveRecord` is one grader: gradeMove:122 plus classifyCpLoss, stored in moveVerdicts. `collectFacts` = computePositionFacts (:451), and Review's facets move onto it. `decide` (:297) absorbs decideTurn, voicePackage, playCommentary, teachingSelector and the Review pre-gates. `thinkChain.compose` uses typed renderers. gameLedger plus a studentLedger in Dexie. `factMarks` feeds admitArrows. The contract gains play, openings, tactics and endgame. `recordCapabilityEvidence` is the one writer.
One computer per group: findHangingBySee with SEE signed (floored at positionReadingService.ts:212), one threat fact, pinGeometry, describeStructure, settledBalance, one book oracle, one trade verdict, one turning-point picker.
Phases: P0 parity harness, ban list, dead-code delete; P1 threats/hanging; P2 engineRead; P3 grader; P4 required fields + ledger; P5 decider/composer; P6 marks; P7 record; P8 renderers/kids.
UNIQUE: parity harness (`oneCoachParity.test.ts`) runs old and new over real positions and compares by claimId. A dropped claim must be listed as a proven-false claim with its board (D10). Only then are callers switched.
UNIQUE: a banned-symbol list that can only grow.
UNIQUE: gates for "only engineRead may import analyzePosition/pool" and "no piece-name literal outside render/".
UNIQUE: the new computers (pin-with-check, desperado, trap checker) are kept out of scope as B6 items.

## design:18 (tests that block a second computer)
Modules: `CoachFact` {id, kind, role, seat, verb, squares, moves, line, stakes, recordTag, fen, readId}. Four exhaustive tables over FactKind: ROLE, VERB, RECORD_TAG ({none, why} allowed) and RENDER. `registry.ts`: `REGISTRY: Record<Question, Computer>` across 15 census groups plus grade and isTrap. The winners include findHangingBySee (not floored, :212-215), describeStructure (boardStructure.ts:269), exchangeLedger.proofCut, gradeMove, and deliberation as the TEMPTING source. Also: a branded `EngineRead`, decide (:297), `compose` returning a branded `Thought` {sentences, marks}, gameLedger plus studentLedger (Dexie, R6), one arrow adapter, a contract for every surface {tense, posture, withholds, speaks, notesAllowed, kidSafe, asks}, recordEvidence and studentRecord.read.
Phases: P0 lands gates 1-7 at ceilings set to today's counts (the duplicates stop growing that day), plus the floored-SEE fix; P1 facts, ledger and arrows on Learn; P2 engineRead; P3 compose with opening deliberation; P4 Review; P5 other surfaces; P6 record, with ceilings ratcheted to 0.
UNIQUE: source-scan ceilings that only go down, modelled on arrowDoor.gate and oneLineReader.gate. Name-pattern scan ceiling 47; say-once Set ceiling 70.
UNIQUE: `voiceService.speak*` accepts only a `Thought`. A legacy-shim ceiling holds today's 107+20 calls.
UNIQUE: a `registry.gate` fails any exported function that returns a CoachFact for a Question it does not own.
UNIQUE: a widened `coachSurfacesAgree` runs about 30 positions through every mode and asserts the same ClaimId set minus each mode's withholds. The design calls this the only gate that catches a well-named copy that disagrees.
UNIQUE: a VERB table on every kind is the check for teaching vs description; a vocabulary round-trip test; `oneStudentRating` extended to a single writer.

## design:19 (phone performance: compute all, never late)
Modules: `engineRead` store {FEN4, depth reached, MultiPV}, shared by the singleton and the pool (acquirePvEngines, gameAnalysisService.ts:921), and saved to Dexie. It fixes three bugs: a budget-stopped search cached under the depth asked for (stockfishEngine.ts:1569 → stockfishCache.ts:62-67), MultiPV leaking between searches, and stockfishFenCache.ts:22 ignoring depth. Fact has no prose. Also: the roles table, composeChain, decide, a SaidLedger plus a StudentTermLedger, typed renderers returning {text, marks} with a template per language, arrows timed through narrationSegments with the 4-arrow cap removed (openingGenerator.ts:1296), and one contract row per surface.
Deletes: stockfishFenCache, queueAnalysis (:1816), evaluateMove (:2026), learnTurnDoor, voicePackage ranking, the playCommentary ladder, the cascade, the resolvers, rankFacets, buildThreatCheckQuestion.
Phases: P0 engine key, MultiPV reset, cache merge (invisible); P1 Fact + ledger on Learn; P2 precompute, with time-to-first-word on every audit row; P3 composer; P4 arrows; P5 other surfaces; P6 grader + record.
Tests: only engineRead imports stockfishEngine; a depth-8 budget read never answers a depth-14 ask; a 1-line read never answers a 3-line ask.
UNIQUE: three cost tiers. Tier 0 is chess.js only, about 30ms per ply on an iPhone (signed SEE, pins, book, structure, computeMustDefend). Tier 1 is one shared depth-12 MultiPV-3 read. Tier 2 is deep (PV playouts, criticalityScan) and runs only when a moment may speak, or in the background.
UNIQUE: speculative precompute. While the reply animates, Learn reads the student's next position; the ponder (useEnginePonder.ts) covers likely replies (engine top 3 plus level-play). Review batch-computes every ply at game end, replacing the 7s timeout (coachFeatureService.ts:3764).
UNIQUE: one live worker on the phone (useEnginePonder.ts:24-28). The pool runs only when Learn/Play is not live, with its size capped on iOS.
UNIQUE: test that every ply can speak from Tier 0 alone. Moving facts into a Web Worker waits for measured over-budget numbers.

## design:20 (student record: one writer, one reader, one vocabulary)
Modules: `CoachFact` with `skill: SkillId` as the hinge (the fact that teaches a pin names the same id that records a missed one) and `posed?{importance, bestUci}`. Today fork, gem and threat collapse to missed-tactic (computerRoles.ts:47-49). `skillVocabulary.ts`: SkillId = MisconceptionTagId (misconceptionTags.ts:278) plus per-motif, trap and term ids. Every outside vocabulary maps in through an exhaustive Record, replacing 8 theme maps (broken round trip: tacticClassifierService.ts:56 vs weaknessSpine.ts:352-353). It is a superset, so no rename (R6). Writer `studentRecord.record` extends CapabilityEvidenceRecord (:139) with an eventKey and posed squares. Reader `read(skill)` returns red/green/grey, streak, provenance, ideaDue, termTaught; green only from capabilityProven (:265).
Deletes: tacticalProfileService, isTacticWeakness, computeWeaknessProfile, getMistakeInsights, the "mastered/fixed" green rules, coachMemoryService `[[REMEMBER:]]` (:101, breaks F3), the result-based Elo chain (playerRatingService.ts:80-117) and the 7 currentRating writers.
Phases: P0 vocabulary + delete absence-lowering + join spine rows (the dead heat-map Practice button, HeatMapPanel.tsx:81, starts working); P1 one writer (drop the opts.reviewed gate at autoAnalyzeGame.ts:423 and the blunder skip at :284); P2 one reader with backfill; P3 the record speaks; P4 strength.
UNIQUE: `eventKey=gameId:ply:skill`, so an event seen by Learn, the sweep and Review is counted once. mistakePuzzles and similar stores stop counting as evidence, which ends the mergeByKey double count (weaknessSpine.ts:868-869).
UNIQUE: delete boostFor's lowering by absence (weaknessSignal.ts:150, :163), which contradicts its own comment at :153; property test `absenceNeverLowers`.
UNIQUE: wake teachingEffectService.ts:23-45, which computes "is it declining" but only logs it, to drive praise (V6). The term ledger persists (today learnMemory.ts:275 wipes it per game).
UNIQUE: persist liveStrength per skill and per opening (today reset at useDiscussionPractice.ts:357); delete FirstRunStrength. Also: `noLlmRecord` and `oneGreen` gates; the trap tag stops filing under missed-opponents-threat (trapLearning.ts:23).

## design:21 (think-aloud with level-real tempting choices)
Modules: `Fact` extends DepthClause (thinkAloud.ts:191) and has no prose. Roles: CHANGED, GOAL, REASON, OBSTACLE, REMOVE-IT, TEMPTING, LINE, THEIR-HABIT, HABIT, KNOWLEDGE. Also: `positionRead` engine; gradeMove as the only grader, writing to moveVerdicts; `thinkChain.ts`, which absorbs depthClauses, deliberation, theirMoveChanged, threatAnswer, liveMethodBeat (methodBeat.ts:296) and DNA_BEAT (:122); decide (:297) returning a chain; gameLedger + studentLedger; `factToClaims`; the contract actually read (Review holds TEMPTING and LINE until a board tap). Brief = the first two roles as whole sentences.
Deletes: classifyEvalSwing, detectGreatMove, gradeGuess, DNA_BEAT, buildPriorityFirst, voicePackage rank, the cascade, segmentNamedArrows (:611), the 5 resolvers, MAX_GREEN_ARROWS_PER_PLY.
Phases: P0 cache key + signed count for the cheaper-attacker lane (CoachTeachPage.tsx:8294); P1 sourcer + composer on the student's own move, lifting deliberation's fullmove<10 gate (positionFacts.ts:463,480), proved on Scandinavian 6.h3; P2 decider takes chains; P3 Review; P4 ledgers; P5 other surfaces; P6 trap library + pin-breaks-with-tempo.
UNIQUE: candidate sourcer `thinkCandidates.ts` builds a ranked TemptingSet from (1) the student's own past move at this FEN, (2) what players at their level play here (amateurPlayCache.ts:37, at measured per-opening strength), (3) the trap library's slip, (4) every check and capture, (5) the engine runner-up (deliberation.ts:144, with DEFAULT_MAX=3 at :55 removed).
UNIQUE: each candidate is refuted by its own line cut with proofCut (exchangeLedger :314) and labelled with why it fails. A candidate with no proven refutation is not said. It absorbs refutedAlternativeCore (:159, :87).
UNIQUE: "fell for it / avoided it" evidence per candidate goes to capabilityEvidence, so dodging a tempting move turns green and earns praise.
UNIQUE: test `temptingProven` (every TEMPTING has a non-empty proof cut).

## design:22 (consequence as a first-class fact)
Modules: `ChessFact` with a REQUIRED `Consequence {usable: proven|notUsable, how: reach|pv|exchange|none, stakesCp, plies, lasts}`, so an unproven drawback does not compile. A judge `brain/consequence.ts` answers D11's four questions: can they use it, does it cost (signed exchange count, positionReadingService.ts:234, not :212/:149), does it last, does this student need it. Also: engineRead; `grade.ts` built on gradeMove, adding Best/Excellent/Great/Miss; decide ordered by consequence, with red items moved up; chain; memory; marks plus a highlight door; the contract with Play and Kids added.
Deletes: decideTurn (:319), voicePackage RANK, the playCommentary ladder, the pre-gates, 5 graders, the cascade, rankFacets, components/Play/*, the 5 resolvers, 15 memories.
Phases: P0 the types + the judge on one question (a cheaper piece attacks a defended piece), wired into Learn :8294 and Review's threat callout; P1 engineRead; P2 grader; P3 decide/chain on Learn + opening deliberation + ledger; P4 Review (delete 4 turning-point pickers); P5 marks; P6 surfaces; P7 record.
UNIQUE: every move yields a two-sided delta, what it gained and what it gave up (guard lifted, square left, castling, tempo), grown from moveInsight.ts:523/573 and theirMoveCost.ts:60. A drawback speaks only when usable is proven.
UNIQUE: the ledger re-opens a fact when the judge says its stakes changed.
UNIQUE: test that a backward pawn nothing can reach stays silent; `flooredSeeBan` gate.
UNIQUE: applies D11 to itself. P3 runs the old door in shadow and compares decision rows before cutover. The judge runs cheap checks every move and reads the engine only when the decider may use it.

## design:23 (knowledge/nuggets as rankable facts)
Modules: `CoachFact` {claim, kind, role (+KNOWLEDGE), verb, seat, fen, squares, lines, stakes, recordTag required (`MisconceptionTagId|'na'`), nugget?}. FactBundle.facts is strings today (coachDecider.ts:134), with side maps keyed by text (:139, :155). New `nuggets.ts`: `Record<NuggetId, Nugget>` {condition(fen,host), invariant (moved from TACTIC_INVARIANT, conceptEngine.ts:124-136), term, failsWhen, habit, recordTag, a fire FEN and a no-fire FEN}. Also: chain, decide, GameLedger, KnowledgeLedger, EngineRead, factToClaims (a nugget draws its own geometry: pin ray, pawn square, attackers/defenders), the contract with a "may library notes speak" field.
Deletes: the resolvers, rankFacets (:434), buildThreatCheckQuestion, computeTacticalProfile, the cascade, about 12 tactic definition tables and 8 principle tables folded into the registry, Review's 28 Sets.
Phases: P0 the type + nuggets 1-3 + KnowledgeLedger through today's decide (6.h3 "a guard doesn't help when the attacker is cheaper", on both surfaces); P1 decide on facts + ledger + arrows; P2 chain + opening facts; P3 engine; P4 contract modes; P5 the trap library as nuggets with an engine-verified failsWhen.
UNIQUE: a nugget never speaks alone. It attaches to a host fact as its so/because link and takes the host's stakes, so it can never outrank the danger that earns it. `ComputedConcept.bare` (conceptEngine.ts:64) is banned on live surfaces.
UNIQUE: the record sets the depth: grey = invariant + definition; red = invariant + habit; green = the bare term or nothing (capabilityProven :265).
UNIQUE: the KnowledgeLedger lives on capabilityEvidence rows with origin 'reading' (:69), adding rows and renaming nothing. It ends the per-game conceptTaught wipe (learnMemory.ts:270-277), which is why the pin definition repeated word for word.
UNIQUE: first nugget list: cheaper attacker (signedLegalSeeFor :242; countMethod.ts:29 silent below 2v2), pin broken with tempo (isRealPin has no check exit, pinGeometry.ts:135-165), early queen hit with tempo, square of the pawn (endgameTechnique.ts:180), king on the diagonal (no computer yet).
UNIQUE: negative-control FENs per nugget; the first gem's FEN must return failsWhen; F0d test that phrase tables contain no player names.

## design:24 (Review keeps its identity, shares everything)
Thesis: Review differs only through four contract settings: looking back, walk every move, hold the answer until the student answers on the board, and tell the game's story. Today Review has 4 turning-point pickers (CoachGameReview.tsx:783, :1454), about 28 Sets, a string facet bag (reviewFullData.ts:242) and a prose arrow scraper (coachFeatureService.ts:611).
Modules: `fact.ts` widens VoiceFact (roles include PRAISE, THESIS). `read.ts` `readPosition` merges computePositionFacts (:451) and computeMoveFacets. `gameRead.ts` is the shared whole-game layer: one turning-point picker (turningPoints.ts:211 merged), one thesis that knows the result (today it says "the open file decided it" in a game the student lost), causalChain, the opponent's recurring slips, the last chance. Also: engineRead, where the pool (gameAnalysisService.ts:708) feeds the walk; decide (which deletes the second need gate at :2320-2340); chain via `Record<Role,…>`; ledgers; adapter. The contract gains posture, ask, story, corpus and delivery; the Review row is given in full.
Deletes: the cascade, 3 of 4 pickers, 4 recap producers, 28 Sets, segmentNamedArrows, the Review cards (rewind, quiz, guided find), rankFacets, the reason-less better-move fallback (:536), and the own-moves-only fundamentals (:1046).
Phases: P0 engine key + signed exchange; P1 only the turning-point reveal on the chain; P2 the whole walk; P3 Learn; P4 gameRead thesis/recap; P5 other surfaces.
UNIQUE: strangle Review from the inside. coachFeatureService is 5,429 lines and is not rewritten; each adapter ships behind a mode-parity test (same FEN in review and teach mode gives the same claim ids).
UNIQUE: a withholding test (no turning-move SAN spoken before the board-answer event) and a register test (past-tense renderer never picks a present key).
UNIQUE: the habit fits the cause (today hard-coded at turningPoints.ts:173). The opponent's slip is spoken as the student's chance, graded Miss when unpunished.
UNIQUE: surface files may import only brain/*.

## design:25 (master-game references, rare and meaningful)
Base: Fact with `precedent?`, chain, decide, a game ledger (about 20 owners), a student ledger that also holds precedents, engine key + MultiPV, adapter, contract Record. Today: pickStoryGame matches the opening name only and speaks a generic line (reviewStoryGame.ts:134-146, :170); modelGameClause (reviewOpeningTheory.ts:546-557); openingIdentity's famous-game list is cut at 2 (:143-144, a cap breach); the 2,209 pro games have no position index (proGameReferenceService.ts:15-46); two StructureSignature types (structureSignature.ts:17, boardStructure.ts:289).
Deletes: pickStoryGame text, modelGameClause, the famous cut, one StructureSignature, the unused proGameReference exports and the Dexie copy, the "your bread-and-butter" line in buildOpeningMoveDetail.
Phases: P0 K1 index + Learn opening facts / Review lecture through decide; P1 Fact/ledger; P2 K2 gem precedents (measure the hit rate first, since pros' blitz is the likely source); P3 chain everywhere; P4 K3/K4 only after a measurement shows median ≤1 per game; P5 walk the cited game on tap.
UNIQUE: offline `build-precedent-index.mjs` → lazily fetched `precedent-index.json` over model-games (642) and pro refs (2,209). Keys: K1 exact FEN4+move, K2 slip-and-punish from the trap library, K3 tactic+structure+castling, K4 pawn break in a matching structure. Won games only (types/index.ts:390-391).
UNIQUE: `findPrecedent(host)` matches only on the host's claim. A precedent is a field, never a Fact, so it is rare by construction rather than by a cap, with an idea-level say-once.
UNIQUE: one clause credits only the game; tapping walks it with arrows from its real moves.
UNIQUE: tests `oneGameCitation.gate` (no player names or "he teaches" outside the renderer), `precedentTruth`, `precedentRarity.measure`, and a type rule that a precedent needs `host: ClaimId`.

## design:26 (the reference coach's teaching acts → one computer each)
Modules: `TeachFact` {act, role (+PRAISE), verb, seat, claimId, squares, lines, stakes, changed?}, joining VoiceFact and DepthClause; typed renderers. `acts.ts`: `ACTS: Record<TeachingAct, Computer>` over the teach-brief catalogue:
A opening → `openingRead` (openingAnnouncement:54, openingIdentity:85 with family fallback, one book oracle replacing bookDeparture:49/theoryDeparture:73 and 4 others, refutedAlternativeCore:159);
B traps → `trapLibrary` (gemCrushLines:564, forkTrick:81, plus a new pin-broken-with-tempo by isRealPin:135);
C weighing → `weigh` (deliberation:144, refutedAlternative:81, depthClauses:226);
D their move → `theirMove` (moveInsight:573, opponentIntent:55, theirMoveCost:60, falseAlarm:37, plus one threat fact with signed SEE);
E prevention → moveIntent:124; F geometry → countMethod:17, loosePieces:35; H one trade verdict; I one plan fact (structurePlan + deriveNextPlans + mastersPlanRead); J endgameConceptFor; K methodBeat; Review story → teachingSelector:347 + turningPoints:211.
Also: chain (6 steps, including "what the opponent keeps doing wrong"), decide, ledgers, engine, factToClaims, contract, one writer.
Phases: P0 signed exchange in Learn's alert + TeachFact adapter; P1 ledger + arrows on Learn (100% / 0 target); P2 chain through positionFacts:1009 with opening deliberation, and `history` passed so the opponent-habit fact can fire; P3 Review; P4 engine; P5 openingRead, trapLibrary, gem steerer, pin-tempo, accepted when David hears the first gem; P6 the rest + record.
UNIQUE: each teaching act gets one owning computer in an exhaustive `ACTS` Record, so a new act fails to compile.
UNIQUE: the StudentLedger stores the student's own move here last time (F18 step 2), and the ledger lets a refrain re-highlight the square it refers back to.
UNIQUE: `admitArrows` accepts only TeachFact-derived claims at the type level.

## design:27 (minimal first slice tonight)
Modules: `CoachFact` (id, kind, role, verb, seat, squares, lines, stakes, fen). VoiceFact becomes rendered output, not producer input. `thinkChain.compose(facts, register)`; decide with FactBundle.facts as CoachFact[], dropping the squares side map (:140); gameLedger that first absorbs learnMemory (:52) and standingFactMemory; `positionRead(fen4, depth, multiPv)`; factMarks; the contract gains play and posture.
Phases with deletes: P0 the slice, deleting nothing; P1 depthClauses/deliberation/refutedAlternative onto CoachFact, Review gets the chain, opening deliberation (delete the cascade); P2 one grader (delete 4 side graders); P3 engine (delete stockfishFenCache and leaking MultiPV); P4 ledger, lead table becomes role order (delete decideTurn, the playCommentary ladder, about 14 owners, rankFacets); P5 fact arrows (delete the resolvers and MAX_GREEN_ARROWS); P6 one reader (delete weaknessAnalyzer, tacticalProfileService); P7 chat/Kids.
Tests: compile gates; Learn/Review same claim-id set on one FEN; ban the floored `legalSeeGainFor` on threat-answer paths; ledger re-opens only when stakes change; a coverage emit per spoken line.
UNIQUE: the first slice is exactly one fact kind, "their pawn hits your defended piece". Producer `threatByCheaper(fen, seat)` uses signedCaptureRead (positionReadingService.ts:207). Wording comes from thinkingSafetyStep.ts:53 with the seat word added; REMOVE-IT from moveFundamentals.ts:393; HABIT from methodBeat.ts:142.
UNIQUE: Learn's live turn and Review's threat callout (coachFeatureService.ts:2913) call the same producer → compose → decide → ledger → factMarks, passing only their register. A miss writes red and an unaided answer writes green via recordCapabilityEvidence (:466).
UNIQUE: risk-first means the slice adds a path beside the old ones and deletes nothing tonight. The gem was judged too big because it needs the steerer and trap library (B6).
UNIQUE: a 6.h3 regression test (fact emitted, h3→g4 arrow, red row) that must fail on today's code.

## design:28 (adversarial-first, hardest to break)
Modules: `CoachFact` with every field required: claimId, role over a `Record<Role,…>` (+CHANGED), seat student|opponent|none, marks {moves, squares, lines}, stakes, verbs (non-empty), evidenceTag (null must give a reason), engineRef. VoiceFact and ClauseItem (positionFacts.ts:347) become aliases, then are removed. Modules: engineRead; `computers/*` behind one Computer interface (signedLegalSeeFor :236 only); ledger; decide (absorbs decideTurn incl DNA_BEAT, playCommentary, voicePackage, teachingSelector pre-gates, Review pre-gates); `compose.ts` as the only fact-to-sentence function, with Brief = top-ranked links; `render/*`; marks + highlight door; `surfaceMode.ts` Record {tense, posture, withholds, speaks, renderMode}, where Play `on-ask` replaces the constant at CoachGamePage.tsx:281; `record/one.ts`; `traps/library.ts`, which replaces 8 trap systems.
Phases: P0 signed exchange on the threat lane, engineRead, and the `slipsAllowed` gate (coachGameEngine.ts:247) relaxed to read the record instead of an Elo of 1000; P1 facts in shadow mode, with an audit row comparing them to today's lanes; P2 Learn plies 1-15 with the trap library + pin-with-check, accepted when David hears the Bg4 gem; P3 all of Learn; P4 Review; P5 other surfaces; P6 grader/record.
UNIQUE: construction gate. A fact can only be built by `makeFact()`, which requires non-empty marks whenever the words name a move or square, and rejects marks parsed back out of the words.
UNIQUE: a seat-flip test (the same position from the other seat yields no "you" claims about the other side).
UNIQUE: an end-to-end gem acceptance test: the slip on the board → TEMPTING+LINE → arrows → record red/green.
UNIQUE: a "what breaks it" section: prose-wrapping adapters, shadow mode hiding a lost fact (a vanished fact fails the run), surfaces speaking on their own (import gate). Also notes which cites were not spot-checked (CoachTeachPage.tsx:7645, :8487).

## design:29 (simplest possible)
Idea: build nothing new where something works. Promote one existing module per layer and delete the copies. Chain: Board → Read → Computers → Decide → Compose → Render(surface) → {Voice, Arrows, Record}.
Modules: stockfishCache as the only cache (key changed, pool through it at gameAnalysisService.ts:708); VoiceFact extended with required role (+CHANGED, NUGGET), claimId, seat, lines, stakes, verb; existing pure functions return Fact[]; computePositionFacts (:451) is the one caller on every surface, and Learn's 50 lanes become computers; decide (:297) unchanged in steps but returning Fact[]; `composeChain` (new, about 200 lines) with typed renderers; SURFACE_CONTRACT gains play, tactics, openings, kid, a posture field (replacing 6 literals) and notation; one GameLedger + StudentLedger; factToClaims as the only admitArrows input; record via recordCapabilityEvidence (:466) + moveVerdictStore.saveVerdict, with capabilityProven as the only reader.
Deletes: 8 deciders, about 14 memories, 4 resolvers, the second cache, about 40 piece tables, 5 SAN renderers, 17 list joins, 5 graders, the cascade, components/Play, rankFacets etc.
Phases: P1 tracer bullet on Learn for 6.h3 (signed count at :8294 → :242), one fact family through every layer; P2 all of Learn, opening first (family fallback, the bargain, a per-move job, traps as TEMPTING+LINE, hand-written lesson beats read by position, deliberation before move 10); P3 engine alone; P4 Review (one stake-ranked reason replacing whyBetter/betterMoveReason/rescue); P5 chat (groundedAnswer assemblers become computers, routers collapse onto dispatchCoachTurn); P6 grader + record.
UNIQUE: no new layer. Every box is an existing module promoted to sole owner.
UNIQUE: wording rotates on claimId + ply (F6, V12).
UNIQUE: tests that ban "I", "we" and numbers in rendered output, and ban `speak(` outside the renderer.
UNIQUE: any WALKTHROUGH_GEN_REV bump happens exactly once, in P2.

## design:30 (audit instruments for the hand walk)
Core: when the fact carries role, squares, moves, seat and readKey all the way to the voice, the walk checks structure instead of scraping prose. Today tape-verify.mjs settles about 40% of sentences.
Modules: `ChessFact` {claimId, kind, role, seat, fen, squares, moves, line, stakes, verb, source, readKey}, grown from VoiceFact (which loses them at decide()). engineRead fixes stockfishCache.ts:2 and the pool's own reads (gameAnalysisService.ts:566, 772); every fact stamps its readKey. Computers: one threat fact, one stake-ranked reason list (explainBestMoveGrounded + betterMoveReason + deliberation), gradeMove. Also: chain, decide, ledger, `render.ts` as the only place a string is born (on sanToSpeech), factMarks + highlight door, the contract read in full.
Deletes: the cascade, rankFacets, buildThreatCheckQuestion, contractFor's dead twin paths, computeTacticalProfile, the resolvers, MAX_GREEN_ARROWS (openingGenerator.ts:1296), the G8 graders, stockfishFenCache.
Phases: P0 instruments only, giving a baseline on today's tapes; P1 Fact + engineRead + threats end to end (fixes :212); P2 chain on Learn; P3 Review; P4 ledgers; P5 surfaces; P6 Kids. The new computers are B6.
UNIQUE: instruments ship first. A `coach-thought` row widens CoachDecisionRow (coachDecisionEvents.ts:29) to hold the facts spoken, the facts held quiet with the reason, and the marks with their claimIds.
UNIQUE: an independent fact verifier (tape-verify.mjs, claim-verify.mjs; gate that scripts/scoreboard imports nothing from src/) checks 100% of facts. A sentence with no fact behind it is itself a finding.
UNIQUE: an arrow ledger (named-arrowed 100%, wordless 0, line completeness = arrows ÷ line plies spoken) and a teaching meter (description-only lines and missing reason links are defects).
UNIQUE: two readKeys on one FEN with different best moves = a D7 flag; same claimId twice without "changed" = a repeat; seat mismatch = a V16 flag.
UNIQUE: a fixed walk set (learn5, rev-g1/g2, the 52 errors) matched by position, not ply, driven by hand-driver.mjs. The full walk contract lists 100% true, 0 repeats, 0 seat flips, 0 description-only lines, and every ply spoken.
