# The coach answers questions: the one plan

## The problem, in four lines
- One student question can go five different ways: the door, Learn's private routers, the buttons, the model reader, and Kids. Precedence is set in three places that disagree: coachApi.ts:3972-6530, coachService.ts:1277-1880, and chatTurn.ts:50.
- Chat answers come from about 85 chat-only copies in groundedAnswer.ts. Learn's teaching computers (threat and prevention, plan, deliberation, traps, the record) are almost never reached. No answer goes through `coachDecider` (D1), none follows the thinking chain (F0c), and none writes to the record.
- Wrong lane, worst cases: "can I play Nf3?" plays the move (coachSessionRouter.ts:897). "How do I play against the Sicilian?" returns a win/loss record (questionIntents.ts:2489). "What should I watch out for?" returns a list of trap names (:1927). "Tell me about X" is dead code (:107).
- The "exhaustive" audit never checks which lane answered and never checks that the answer teaches (audit-coach-all-questions-prod.mjs:153-159; questionMatrix.audit.test.ts:52-57).

## Architecture: one door, six stages, one memory
This uses the same computers, the same chain, the same decider and the same memory as Learn and Review. A question is the student telling the decider which parts of the thinking chain they want.

```
askCoach(turn) → 1 READ → 2 CLASSIFY → 3 COMPUTE → 4 DECIDE → 5 VOICE+DRAW → 6 RECORD
```

1. **READ.** Code only, one normaliser (`normalizeAsk.ts`).
   - Handles sound-alikes (night/nite → knight), spoken digits ("f three"), spoken moves ("bishop takes f7 check" → Bxf7+), typos by edit distance, and local piece letters (Spanish C = knight, German S = knight).
   - Never deletes words that carry meaning ("tell me", "even", "then").
   - Ties a bare square to the piece the student named, which fixes the a8 → a8=Q bug at questionIntents.ts:572.
   - Keeps the student's own words and the language they used.
   - The model never rewrites the question. Delete the rewrite to a fixed question (chatTurn.ts:234-342, dispatchCoachTurn.ts:175).
2. **CLASSIFY.** One table: `QUESTION_TABLE: Record<QuestionKind, {detect, precedence, scope: board|record|knowledge|opening|action, seat, tense, focus}>`.
   - It replaces both flag builders, FAST_PATH_LANES/LANE_FIRES, intentFired, personalGameDataQuestion, the Learn pre-flight lists and INTENT_KEYS. Every other list derives from it, so a new question type will not compile until it has a precedence.
   - **Precedence comes from the words, not a blanket "board beats record" rule.** That blanket rule would break "do I miss forks?" (attack 3).
     - "here / this position / my knight" → board.
     - "do I / my games / usually" → record.
   - **The question-or-command check lives INSIDE `computeRoutedIntent`.** That one function serves Play, the mic, Learn and Review, which all bypass the door's guard (attack 1). It has three outcomes:
     - a question;
     - a command to play your own move, only when the command verb is the first word that carries meaning;
     - a dictated opponent move, on Learn only.
     Any "if", "can", "should" or question word anywhere makes it a question. Review gets no move-playing commands at all.
   - **Seat and tense come from pronoun and verb.** "Why did THEY play Nd4" means find their past move. "What if they play X" means a null-move board. This stops the coach grading the opponent's move as yours (attack 2).
   - A multi-part question is split here, every part kept: board, record and opening parts alike.
   - **Follow-ups** ("why tho", "huh", "and then?", "what about Nf3") attach to the last fact the coach said. They are resolved before any detector runs.
   - If the board doesn't match the question, the student gets the `clarify` sentence that chatTurn.ts:404-494 already computes.
   - The model reader is only a last-resort classifier. It may return spans of the student's words. It is never awaited in front of the code path (6 s today, chatTurnParser.ts:160).
3. **COMPUTE.** One composer per family. Each returns typed facts (`VoiceFact`, reused; no new `TeachingFact`). Each fact carries {role, stakes, seat, moves, lines, squares, the FEN it was computed on}.
   - **POSITION:** computePositionFacts, composePositionRead, characterOf, settledLeadFor.
   - **THREAT / PREVENT:** detectNewThreat, describeThreatRecognition, describeThreatPrevention, threatAnswer, threatStoppedBy, opponentIntent.
   - **MOVE:** gradeMove, the deliberation candidates, buildRejectedTempting, refutedAlternative, whyBestMove, computePvLine, methodBeat.
   - **PLAN:** deriveNextPlans, structurePlan, planRace, mastersPlanRead.
   - **OPENING (priority, F02):** openingIdentity, theoryDeparture, moveFundamentals, principleAttribution, trapAheadAt, findLivePunishment, modelGameClause, middlegamePlanner.
   - **SELF:** a new `profileAnswer.ts` built on loadStudentRecord + heatMap + capabilityProven. Red, green and grey per tag. Red tags are taught (the fundamental, a position from your own game, the habit, the drill).
   - **KNOWLEDGE:** endgameConceptFor and the endgame lessons, which run BEFORE the concept lane. The concept corpus is spoken word for word.
   - **One engine read per position (D7).** The cache key is fen + depth + multipv, stored at the depth actually REACHED. A question never waits on a read that its own hold is blocking (attack C, commit 4ca502e67).
4. **DECIDE.** `coachDecider.decide(facts, {posture: 'answer', focus})`. This is a new third posture.
   - The fact the student asked about always lands in `spoken`. It skips the need, proven, unsupported, said-already and nextMoveAdvice gates (attacks A, B). Those gates may still trim the extras around it.
   - The order is: **answer the literal question first**, then the thinking chain (goal → reason → obstacle → tempting move and why it fails → line → habit). Every role joins the next with a connective chosen in rotation (because / but / so first), keyed on game+ply.
   - Brief keeps the top facts; Full keeps everything. No caps: remove `.slice(0,3)`, `reads>=2` and `threats[0]`.
   - Withholding comes from `SURFACE_CONTRACT`, which is read at last. Extend it with `solution-until-try`, puzzle and practice members.
5. **VOICE + DRAW.** `voiceFacts` speaks the computed text word for word (preferRaw).
   - **Spoken text: digits, % and cp are refused until a formatter turns them into words.** Otherwise preferRaw would speak today's stat templates as they are (attack "robotic", V8).
   - **Translation uses templates, not a live model call.** Each fact kind gets per-language templates with fill-in slots (piece words, squares, seat pronoun). That leaves no free text for the model to bend (attack D).
   - **Arrows come from each sentence's own geometry,** through `arrowDoor`. Lines are drawn ply by ply (the `spokenLineArrows` walk). Add an `xray` role for pins. If a sentence is dropped, its marks are dropped with it. If the door refuses a fact's claim, its sentence is dropped. A plain present-tense sentence is graded on the current position only. Highlights get their own door (attack "arrows").
   - The answer stamps its FEN. If the board has changed since, the answer is asked again or shown with no marks.
   - Every lane streams, so voice-on answers are actually spoken.
6. **RECORD + MEMORY.**
   - One `GameMemory` per game key (D6). It is written by the decider on every surface: Learn narration, Review walk, chat. It replaces the `conversations` Map (dispatchCoachTurn.ts:56), Learn's private say-once refs, and `lastServedIntent`.
   - A proposed losing move or a hint asked is written to the record as `prompted`. That never counts as green. Each asked tag gives NEED a raise-only increase. One `coach-decision` row is written per answer (D9).

**Kids stays outside.** `askCoach` takes `surface: Exclude<CoachSurface,'kid'>`. `getKidLlmResponse` is split off from `getCoachChatResponse`. The kid door uses its own table, writes no record, draws no arrows, and voices with `kidSafe`. Gate: kidIsolation.gate.test.ts.

**Play stays silent.** The door answers only what the student asks. `PLAY_VOLUNTEERS_COACHING=false` moves into the contract (`speaks`), not into a page constant.

## Phases, in order
Each phase starts with its failing tests. Each phase ends with a hand walk (by hand, no bots: flag the whole walk first, fix afterwards).

**P0: Safety and the instrument.** The student notices that "can I play Nf3?" stops playing the move.
- Add the question/command check in `computeRoutedIntent`.
- Fix the a8=Q bug, "tell me" and "even".
- Make the prod audit assert the served lane against an expected lane (the data already sits in the chat-turn rows, all-questions:429-453). Add the 4 skipped rows and STRUCTURAL_PROBES. Remove empty ACCEPTs and any ACCEPT that rewards breaking a voice rule ("i'd play", %).
- Tests: `questionRoute.test.ts` (every matrix phrasing → the exact lane, plus attack-1's probe list); arbiter tests.
- Walk: on Play, Learn, mic and Review, ask 10 "can I / should I / what if" questions. Zero moves played.

**P1: One table plus one normaliser.** The student notices that misrouted questions start getting answered: record-vs, colour, watch-out, holes, how good is my position, where do I stand, how does white continue, what do they do now, their threat.
- Files: new `src/coach/ask/{normalizeAsk,questionTable,followUp}.ts`.
- `questionIntents.ts` keeps the detector bodies only.
- Delete `buildQuestionGrounding`, coachService.ts:1277-1880, FAST_PATH_LANES/LANE_FIRES, the three hand-copied lists, the rewrite to a fixed question, and Learn's `shadowReadTurn` (CoachTeachPage.tsx:3269).
- Serve `clarify`.
- Walk: the misroute list from the attacks, plus a mic transcript run.

**P2: Every surface through the door, one memory.** The student notices that follow-ups work ("why tho", "the other knight"), and that chat no longer repeats what Learn just said.
- Route Learn (CoachTeachPage.tsx:6757 and its ~30 routers), Review (CoachGameReview.tsx:2952), the puzzle chat (MistakePuzzleBoard.tsx:729), the mic (real surface, not 'game-chat') and the Why/Hint/Read buttons through the door.
- Build `GameMemory`.
- Delete the stale memory pieces listed above, plus the TEMP DEBUG audit (coachApi.ts:3723).

**P3: Board and move families through the decider.** The student notices answers that teach: the threat plus how to stop it, the plan with reasons, "why not Bxf7+" with its punishing line, and "was that good" with a reason.
- Delete the chat-only duplicates: assembleThreatAnswer, the PV-list assemblePlanAnswer, assemblePositionAssessment, raw material counts, 3 of 4 hanging definitions, 3 of 4 king readers, 3 of 4 worst-piece rankers, the hand-written pawn classifier, sacrificeOffer, and the private cp bars.
- Merge move-rating and retrospective into one move verdict.
- Pass bestLine and cpAfter into `studentMoveAnswerLines` (learnBoardTeaching.ts:753).
- One hint with escalating tiers, read by every surface.
- Write chat verdicts into `moveVerdictStore`, so chat agrees with Learn and Review.

**P4: The opening family (F02).** The student notices that "Tell me about / is it sound / main line / how to play against / traps / idea of this move / punish that" all teach, with arrows.
- Depends on F04's one trap library (see the decision list).

**P5: Self and knowledge families.** The student notices that "what am I good at / what did I fix" is answered from proof, red tags are taught, and no numbers are spoken.
- Retire weaknessLifecycle's "fixed", the gameInsights strength strings, skillRadar and the badHabits fallback as answer sources.
- Endgame lessons go ahead of concept. Concepts become demonstrations on a constructed board.

**P6: Arrow and voice cleanup.** The student notices every move the coach names has an arrow and every arrow has words.
- Delete applyCandidateArrows' prose pass, coachMoveExtractor, VoiceChatMic.extractArrows, rankCandidatesAtFen, `MAX_CANDIDATE_*=3` and the tests that lock it in, the `[BOARD: arrow]` prompts (envelope.ts:58, CoachTeachPage.tsx:6741/2096, CoachGameReview.tsx:195), claimValidator and its feeders, Layer B's banter block, and the post-hoc strippers.
- Gate: named moves arrowed 100%, arrows without words 0.

**P7: Model leftovers out.**
- Delete the free LLM lane (coachApi.ts:6734); an unmatched question gets the position read or a clarify.
- Delete the model grader in Analysis Practice (positionReadingGrader.ts:67 → the deterministic key).
- Delete the model fallback for Learn's stages (openingGenerator.ts:4055).

## Questions we cannot answer today: each needs a NEW computer (bring to David, B6)
- **NEW** One trap library (F04). Needed for "is there a trap here", "am I walking into one", and "traps in X" taught by mechanism.
- **NEW** Square of the pawn. Needed for "can my king catch it".
- **NEW** Pawn-race detector and lane. planRace exists, but nothing routes to it.
- **NEW** Attacker/defender counting with SEE that excludes pinned pieces and counts x-rays, and teaches the counting habit.
- **NEW** Rules computer, built on chess.js demos: castling conditions, en passant, stalemate, threefold repetition, the 50-move rule.
- **NEW** Piece geometry ("what squares does a knight cover").
- **NEW** Concept-on-a-board composer: a corpus definition plus a computed demo position plus a comparison of two concepts (pin vs skewer).
- **NEW** Soundness at runtime ("is the King's Gambit sound"). Today it exists only as scripts/soundness-sweep.mjs.
- **NEW** Transposition explainer.
- **NEW** "Why did I lose": the game's turning point plus the causal chain, scoped to the game on screen.
- **NEW** Flank decision ("kingside or queenside").
- **NEW** Game index by opening for "show me a famous game in X", plus narration that teaches through a pro's walked game (today it is silent, CoachTeachPage.tsx:4381).
- **NEW** "How do I compare to players at my level" (gem band data exists but is unused).
- **NEW** Proposed losing move. Does it count as a broken read (red) or only a raise in NEED? David decides. Until then it only raises NEED.

## Decisions David must make
1. **S10 vs the arrow door on refutation lines** (arrowDoor.ts:35-37). Proposal: draw refutations as a `line` role coloured by side, and never a bare green arrow on the bad move.
2. **The F04 trap library.** This blocks P4.
3. **The translation-template budget.** Which languages get templates first.

## Risks
- **Speed on iPhone.** The asm engine runs one search at a time. A full thinking chain costs about 11 searches through refutedAlternative+computePvLine (pvPlayback.ts:539-627), which is 18-60 s and past the 12 s watchdog. Mitigation: the literal answer streams first from the single read; extras arrive later; the cache stores the depth actually reached; computeLeansOn is gated on the answer posture; computePositionFacts is memoised per FEN; the record read is memoised (capabilityEvidence.ts:650 loads the whole table today).
- **Cutting over the precedence table changes many answers at once.** Mitigation: P0's lane-exact audit first, and one table row per commit.
- **Read-only answers become report-shaped.** Mitigation: the V8 digit gate, the formatter rewrite, connectives in rotation, and the answer-first ordering. All are asserted in tests.
- **Kids leaking through the new door.** Guarded by the type plus the kidIsolation gate.
- **Learn's routers carry live side effects** (say-once, dictation). Moving them out must keep those side effects (G8.5 rule 4).
- **Persisted data.** Ask rows add an `EvidenceOrigin`. That needs a Dexie bump plus an upgrade, and no renames.

Inputs: /home/user/wt-work/RULEBOOK.md, /home/user/wt-work/docs/plans/2026-10-07-duplicate-census.md, /home/user/wt-work/docs/plans/swarm-inputs/questions.md. Related plans: /home/user/wt-work/docs/plans/2026-09-29-ONE-CHAT.md, 2026-10-01-unify-the-coach.md.