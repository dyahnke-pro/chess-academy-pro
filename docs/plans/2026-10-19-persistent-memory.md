# Persistent memory throughout the app (OS-14)

David 2026-10-19: "fix the memory issue" → "i want persistent memory throughout
the app". The trigger: Learn's adventure book (`branchExplorer`) remembers which
roads you walked only in a page ref — close the app and it forgets.

## What the map found (read-only, 5 surfaces, 2026-10-19)

161 in-memory memories across the app; **94 are facts about the student**, and
most of those die when the app closes. The full table is the appendix below
(file:line, lifetime, what already persists the same fact, what the student
loses). Grouped by what the student experiences:

**A. What you did never reaches your record** (record it)
- Learn writes its game only at game over / End Lesson — kill the app mid-game
  and the game never reaches review, history or mistakes.
- The Openings Play rung: its games and the deviation ply ("you left the line at
  move 7") are shown once and forgotten; Play-rung games never reach history.
- Play games restarted, colour-swapped or abandoned never reach My Mistakes.
- Answers that never reach the record: the opening checkpoint quiz, walkthrough
  quiz/drill misses, Play's quiz, mating-pattern lesson finds, Review free-board
  finds, a puzzle found after "Show the line" counted as unaided.
- Hints are stored unlinked to the game they were asked in.
- Closing mid-session leaves an empty SRS session row; quitting a tag drill
  never updates its spacing.

**B. Where you were** (restore it)
- Chat history on reopen: Learn, Play, Review, the opening coach chat.
- Masterclass Watch restarts at beat 1; endgame lessons at keystone 1; a custom
  lesson at part 1; the opening page forgets the variation tab you chose; the
  book reader forgets its page; a lesson asked for just before the app closed is
  lost.
- Puzzles repeat across sessions (adaptive, Deep Run, theme drill, setup,
  endgame) — each session only excludes what it saw itself.
- Six kid games forget levels and stars (Bishop vs Pawns, Color Wars, King
  March, King Escape, Knight Sweep/Leap Frog/Pair Army, Queen games); Puzzle
  Quest resets to easy.

**C. Your settings** (remember them)
- Play difficulty, chat mute, the opening Play-rung voice toggle, Review's
  engine-lines toggle, walkthrough autoplay speed, the hint dial, the live
  opponent strength measured in a game.

**D. What the coach told you** (needs David's rule — see below)
- Definitions (pin, fork…), opening principles, habit lines ("slow down — checks,
  captures"), "this caught you before", fundamentals explained in full (Learn and
  Review keep separate per-game lists), the Danya behaviour mix, cross-game
  transfer ("you met this idea two games ago"), endgame corpus notes, the
  thinking-lesson book sentence.
- Roads walked and the line chosen at each fork; traps already taught; the
  "play it out yourself?" prompt.

**E. Progress you never see**
- No all-time best streak or medal history (Learn recap, puzzles); the puzzle
  rating trend covers one session.

**Bugs found on the way** (each fixed at its producer, with a test):
- `sessionStatsRef` (Learn) is never incremented — the End Lesson closer always
  reads zeros (dead memory, G8.5).
- `skillRecapRef` is not cleared when a board reset starts a new game, so game 2's
  recap shows game 1's skill changes.
- Mating-pattern lessons write into `teachingLedger` as if they were openings, so
  a second visit opens with "Last time we covered the main line".
- `openingWeakSpots` ids are `${openingId}-${moveIndex}` with no line identity —
  a weak spot can replay the wrong position.
- The hint dial is computed and dropped on Play surfaces.

## The design

1. **ONE store, ONE door.** A single Dexie table `studentMemory` (schema version
   bump + upgrade function, per the standing order), rows `{ id: kind:key, kind,
   key, surface, count, firstAt, lastAt, data }`, read and written through one
   service (`studentMemory.ts`: `remember`, `recall`, `recallKind`, `forget`).
   Existing persisted homes (`teachingLedger`, `coachMemoryStore`,
   `thinkingLessonMemory`, `capabilityEvidence`, `misconceptionTags`) stay where
   they are — the new store holds only what has no home today. No second copy
   of a fact the record already holds.
2. **EVERY MEMORY DECLARES ITS LIFETIME — the gate that keeps it fixed.** A test
   scans components and hooks for `useRef(new Set|Map)` / accumulating refs and
   requires each to be named in one registry with its lifetime
   (`per-board` | `per-game` | `persisted`). A new in-page memory fails the build
   until someone decides whether it outlives the app.
3. **Per-game stays per-game.** Say-once ledgers about THIS board (announced
   plies, plan-told boards, standing facts) are correctly per-game and are not
   persisted.
4. **The record wins.** Anything that is evidence about the student (answers,
   finds, games) goes to the existing record (`capabilityEvidence`,
   `misconceptionTags`, `db.games`), never to the memory store.

## The decision that is David's (group D)

How remembered teaching changes what the coach says. Recommendation:
- First time an idea is explained: in full.
- After that, a one-line reminder ("— a pin, remember"), not the full lecture.
- Back to the full explanation when the record shows a new slip on it (red) or
  after a long gap.
- Never silent on account of having been told: told ≠ proven; only green (the
  record proves the skill) may go quiet.

Roads walked, traps taught and the play-out prompt are not a teaching rule — they
are remembered and the pickers show what is left.

## Ownership

- Session #7: the store + API + lifetime registry gate, and every surface except
  Learn (`CoachTeachPage.tsx`, `useTeachWalkthrough.ts` are the lead's).
- Lead: Learn's wiring (fork log + chosen line, traps taught, play-out prompt,
  chat restore, the mid-game game save) on the same API.
- Group D's speech rule waits for David's answer.

## Status — every non-Learn memory, decided (2026-10-20, session #7)

Each row of the appendix outside Learn (Learn rows 13–31 are the lead's) has
one answer: **persisted** (where), **record** (the evidence reaches the existing
record), **per-game / per-board** (why forgetting is right), **group D**
(waits for David's speech rule), or **new** (a feature that never existed, not
a lost memory — brought to the lead, not guessed).

| # | memory | answer |
|---|---|---|
| 1 | Review askMessages | persisted — `chat-thread` `review:<gameId>` (089b9c1) |
| 2 | Review free-board exploration | record — a found better move is `recordFreeBoardFind` (6419462); the tried moves are per-board |
| 3, 4 | Review turning summary, game theme | per-game — recomputed from the game's saved analysis on every open. Joining games ("your last two games turned on a loose piece") is **new** |
| 5 | Review critical moment found | per-game recompute. Whether a held only-move should add capability evidence beyond the game's own per-ply capture is **open** (it must not count one moment twice) |
| 6 | Review completed / started | **new** — no reader exists, so a stored marker would be built-but-unwired (G8.5) until a "you never finished reviewing" feature is designed |
| 7 | Review engine-lines toggle | persisted — setting `review-engine-lines` |
| 8–10 | Review shot / theory / principle-quiz cards | nothing to keep — all three cards are switched off |
| 11 | Review "explained in full" ledgers | group D |
| 12 | Review slips this game; motif transfer | per-game tally (the cross-game "caught you before" is the weakness spine); cross-game transfer is group D |
| 32, 82 | live opponent strength | persisted — `live-strength` (c9de3a7) |
| 33, 83 | hint dial | persisted — `hint-dial` (c9de3a7) |
| 34 | Play game left mid-way | record (35f59a9) |
| 35 | Play difficulty | persisted — setting `play-difficulty` |
| 36 | clock history | per-game, saved on `db.games` at game end |
| 37 | explore-ahead chat | per-board — it is about one position |
| 38, 40 | Play quiz, hint tier | record — answers and hints (35f59a9); the tier itself is per-board |
| 39 | off-book said | per-game say-once |
| 41, 55 | tactic outcomes (`tacticAlertService.sessionOutcomes`) | per-app-session by design — struggle detection reads the last five attempts *now*; across sessions the record (weakness spine) carries the history |
| 42 | pending walkthrough | persisted — `coachMemoryStore` (schedulePersist) |
| 43 | game chat | persisted — `chat-thread` where the surface names a thread |
| 44 | coach chat mute | persisted — setting `coach-chat-muted` |
| 45, 46, 81 | Openings Play-rung game + report | record (b40512f) |
| 47 | punish cues | per-board |
| 48 | Play-rung voice | persisted — setting `opening-play-voice` |
| 71, 72 | teaching ledger; mating-pattern pollution | persisted; pollution removed (af26c86) |
| 73 | variation tab | persisted — `variation-tab` |
| 74 | checkpoint quiz | persisted — `quiz-progress` (5ae88c9) |
| 75 | masterclass Watch beat | persisted — `watch-beat` |
| 76 | trap / warning lines finished | persisted — `trap-lines-done`, by line name (this change) |
| 77, 79 | drill attempt mid-line; SRS line grades | per-board — only an attempt in progress is lost |
| 78 | SRS session tallies | persisted as it goes; an empty row is dropped (5ae88c9) |
| 80 | walkthrough speed | persisted — setting `walkthrough-speed` |
| 84 | book reader page | persisted — `book-page` |
| — | opening coach chat | persisted — `chat-thread` `opening-chat:<id>` |
| 49, 58, 60 | puzzles seen (adaptive, Deep Run, theme drill) | record — selection prefers puzzles the attempt record says were never tried (194ca6d) |
| 50, 51 | puzzle session, rating trend | persisted — best streak `best`, rating `trend`; the session tallies are a session by design |
| 53, 54 | puzzle habit lines said, recall said | group D |
| 56, 57 | mistake-puzzle say-once | per-board |
| 59 | Deep Run run | per-run by design; a solve moves the puzzle rating (05576a3) |
| 61 | tactic-drill notes seen | group D |
| 62 | setup trainer seen | persisted — `served-puzzles` `setup` |
| 63 | create-page streak | per-visit by design — a streak is a run |
| 64 | tag drill quit mid-way | record — spacing updated (5ae88c9) |
| 65–69 | kid levels, stars, Puzzle Quest level | persisted — `kid-progress`, setting `kid-puzzle-level` (b615e1e) |
| 85, 89 | endgame corpus notes seen; thinking-lesson book line | group D |
| 86 | endgame drill puzzles served | persisted — `served-puzzles` `endgame` |
| 87 | endgame lesson position | resumes at the first unmastered keystone (`resumeKeystoneIndex`, from `endgameProgress`) |
| 88 | mating-pattern finds | record (6419462) |
| 52, 70, 90–92 | already persisted at map time | — |

**Open, brought to the lead:** row 5 (critical-moment credit as evidence), rows
3/4/6 (cross-game review features), and group D for David.

## Appendix — every memory that is about the student (generated from the read-only map, 2026-10-19)

Columns: name · file:line · lifetime · what persists the same fact today · what the student loses when the app closes.

### Post-game review

| memory | where | lifetime | persists via | loss on close |
|---|---|---|---|---|
| askMessages (+ reviewWhy) | src/components/Coach/CoachGameReview.tsx:309 | per-page-visit | partial: typed asks + answers go to coachMemoryStore.conversationHistory (3052, 3158, db.meta, cap 200) but WITHOUT gameId/ply although CoachMessage has both fields (coachMemoryStore.ts:73-74). Why answers and command acks are never persisted. | Reopening the game shows an empty chat. The Why answers are gone for good, and the stored asks cannot be joined back to this game or ply, so the coach cannot say 'you asked about move 14 here last time'. |
| walkExploreSansRef + walkExplorationFen/San (free-board exploration) | src/components/Coach/CoachGameReview.tsx:443 | per-board | none (only the logAppAudit 'review-walk-explored' rows at 1786/1833; no capabilityEvidence, no record) | Finding the better move on the board earns no credit, and repeatedly trying the same losing idea is never remembered. The next review or Learn game cannot say 'last time you tried Nxe5 here'. |
| turningSummary + turningAskedRef | src/components/Coach/CoachGameReview.tsx:1074 | per-game | none (PostHog captureEvent 'review_turning_point_stated' 1557 only; the cached narration on db.games.reviewNarration does not hold the thesis) | The coach cannot link games ('your last two games both turned on the same loose piece'). Each open recomputes the thesis and its 4s hinge read. |
| themeRef + themeSpokenRef | src/components/Coach/CoachGameReview.tsx:2711 | per-game | none (PostHog review_theme_classified/named only) | No memory of which kinds of games this student plays or loses (e.g. a third kingside-attack loss in a row). The theme is reclassified and spoken again on every reopen. |
| criticalReadsRef + criticalMoment + criticalDoneRef | src/components/Coach/CoachGameReview.tsx:1104 | per-game | none for the fan count or the held/found verdict on the credit/note path (spoken at 1248, not recorded). Only the dormant 'ask' pick calls recordPromptedFind → capabilityEvidence (1590). Whether autoAnalyze's reviewed capability capture covers the same ply is not verified here. | 'You found the only move' is spoken and then forgotten, so that evidence never turns a heat-map cell green. Every open re-runs a depth-14 scan of every student ply after a 3s delay (923-925). |
| reviewCompletedRef / reviewStartedRef / narratedPliesRef | src/components/Coach/CoachGameReview.tsx:1474 | per-page-visit | PostHog only (review_started / review_narration / review_completed). Dexie keeps 'opened for review' through misconceptionTags learned/counted (autoAnalyzeGame.ts:560-584) but has no completed or walked-through marker. | The app cannot tell which games the student has already reviewed to the end, so it cannot say 'you never finished reviewing yesterday's loss' or skip games already walked. |
| engineLinesEnabled | src/components/Coach/CoachGameReview.tsx:2320 | per-page-visit | none (not a profile preference) | Every review opens with engine lines hidden, and the student re-taps the toggle each time. |
| shotAttemptsRef + shotHintRungRef | src/components/Coach/CoachGameReview.tsx:1032 | per-game | none (PostHog review_find_shot_result only). Play's hints go to coachMemoryStore.hintRequests; review hints do not. | None today, because the path is dormant (REVIEW_ASKS_QUESTIONS=false). If re-enabled, a hint needed in review never reaches hintRequests or capabilityEvidence. |
| theoryFoundRef + theoryAttemptsRef + theoryShownRef | src/components/Coach/CoachGameReview.tsx:2503 | per-game | departure: bookDeparturePrecompute (db.meta) computes the same fact but review does not read it. The guesses: none. | Departure: none, since it is recomputed and also persisted elsewhere. Guesses: none today (card dormant, THEORY_DEPARTURE_CARD_ENABLED=false). |
| principleQuizRef / principleQuizShownRef / principleQuizState | src/components/Coach/CoachGameReview.tsx:967 | per-game | none (PostHog review_principle_quiz_result only) | None today (PRINCIPLE_QUIZ_ENABLED=false). If re-enabled, the right or wrong answers never reach the record. |
| seenFundamentals / principlesTaught / spokenHabits (buildReviewSegments say-once ledgers) | src/services/coachFeatureService.ts:1321 | per-game | none for 'already explained'. The weakness spine holds failures, loadFadeLevels holds proven skills; neither records 'heard the full explanation'. teachingLedger exists but only for openings and is not read by review. | Every new game's review gives the full-length explanation of a fundamental, principle or habit the student heard in full in yesterday's review. The short form only applies within one game. |
| reviewSlips.slipsThisGame + motifLastSpoken | src/services/coachFeatureService.ts:1331 | per-game | misconceptionTags + weakness spine (autoAnalyzeGameMisconceptions on mount); cross-game 'caught you before … last one against Sam' is read via weakness signals (reviewHeldMemory.test.ts) | none (per-game tally; the cross-game half is persisted) |

### Learn with Coach

| memory | where | lifetime | persists via | loss on close |
|---|---|---|---|---|
| forkLogRef (ForkLog, branchExplorer) | src/components/Coach/CoachTeachPage.tsx:1196 | per-page-visit | none (teachingLedger stores only opening+layer+takeaway, not which variation was chosen) | After reopening, the coach has forgotten which Sicilian/Caro lines they already walked and which they chose: 'You've walked 2 of 3 roads' resets to 0, the picker cannot mark walked lines or keep the line they picked, and 'roads back' is never offered across sessions |
| taughtGemIdsRef | src/components/Coach/CoachTeachPage.tsx:1157 | per-page-visit | none | The trap menu re-offers traps already taught and the 'N traps left' count starts over after every reopen |
| behaviorSchedulerRef (BehaviorScheduler.pass) | src/components/Coach/CoachTeachPage.tsx:1204 | per-page-visit | none | Every reopen restarts the distribution: the same high-weight behaviours lead again, so the student hears the same kinds of teaching first each session instead of the long-run mix |
| playOutPromptedFor | src/components/Coach/CoachTeachPage.tsx:3307 | per-page-visit | none (teachingLedger knows the visit happened) | The same play-out invitation is asked again each visit to an opening they have already finished |
| solvedDrillKeysRef | src/components/Coach/CoachTeachPage.tsx:2874 | per-page-visit | mistakePuzzle SRS grade (gradeMistakePuzzle) pushes the next review date | Mostly none: SRS already defers a solved puzzle; only the explicit exclusion is lost |
| sessionStatsRef | src/components/Coach/CoachTeachPage.tsx:2036 | per-page-visit | misconceptionTags hold the slips themselves | Dead memory (G8.5): the session closer at 13885 always sees zeros and never speaks |
| liveGradesRef | src/components/Coach/CoachTeachPage.tsx:1894 | per-game | db.games via buildLearnGameRecord (12785 game over, 13905 End Lesson) — only at the end; verdicts also via rememberHeardVerdict→moveVerdictStore | If the app is killed mid-game the GameRecord is never written: the half-played Learn game is missing from review/history (evidence rows already written live survive) |
| announcedPliesRef | src/components/Coach/CoachTeachPage.tsx:1870 | per-game | db.games promptedPlies at game end; per-move evidence rows carry prompted live | Same mid-game-kill loss as liveGradesRef; otherwise none |
| learnTally / learnTallyRef | src/components/Coach/CoachTeachPage.tsx:1786 | per-game | capabilityEvidence holds each decision; no all-time streak/medal store | No best-ever streak or medal history: every game's recap stands alone |
| provenConceptsRef | src/components/Coach/CoachTeachPage.tsx:8097 | per-page-visit | conceptRecord db.meta 'concepts_played_v1' + puzzle theme skills | none across sessions; within a visit a concept proven mid-session is still defined until remount |
| drilledMotifsRef | src/components/Coach/CoachTeachPage.tsx:1886 | per-page-visit | mistakePuzzles (loadDrilledMotifs) | none (stale only within a visit) |
| customLessonRef | src/components/Coach/CoachTeachPage.tsx:1470 | per-page-visit | each drill's SRS grade only | Closing mid custom lesson restarts it at part 1 next time |
| messages | src/components/Coach/CoachTeachPage.tsx:1105 | per-page-visit | coachMemoryStore.appendConversationMessage (some sites) + learnTranscript db.meta 'learn-transcript.current' + GameRecord.coachTranscript | Reopening Learn shows an empty chat; prior exchanges are stored but not shown |
| learnMemory.conceptTaught | src/services/learnMemory.ts:135 | per-game | conceptRecord only counts concepts PLAYED/puzzles proven; no 'heard the definition' count | The pin/fork definition is re-taught in every game until proven by play or puzzles, however many times it was heard |
| learnMemory.principleTaught | src/services/learnMemory.ts:137 | per-game | none | The same opening principle is taught again at the first chance in every game |
| learnMemory.motifLastSpoken (MotifLedger, motifLedger.ts) | src/services/learnMemory.ts:140 | per-game | none cross-game (drilledMotifs only covers solved mistake puzzles) | Transfer stops at the game boundary: the coach can never say 'you met this idea two games ago' |
| pathNodes (walkthrough fork picks) | src/hooks/useTeachWalkthrough.ts:873 | per-game | none — the pick is only audit-logged (1818); teachingLedger/markStageComplete record the opening, not the line | Coming back to the opening, the walk defaults to the main line again; the sideline they chose is not remembered, and the comparative bridge (1840) keys on 'visited', not on which branch |
| playedGemIds / playedGemIdsRef | src/hooks/useTeachWalkthrough.ts:991 | per-board | none | Every visit shows all traps as unwatched; 'N more traps' restarts |
| teachingPlanRef | src/hooks/useTeachWalkthrough.ts:925 | per-page-visit | teachingLedger db.meta 'teachingLedger' — only when the leaf is reached | Close before the leaf and the visit is never recorded: no recap next time, same layer replanned |
| quizSelected / drillWrongMove (walkthrough stages) | src/hooks/useTeachWalkthrough.ts:949 | per-board | none — markStageComplete (2556, 2707, 2815) records completion only, right or wrong | Wrong quiz answers and drill misses never reach the record; the coach cannot come back to them |

### Play with Coach

| memory | where | lifetime | persists via | loss on close |
|---|---|---|---|---|
| useDiscussionPractice.liveRef (live opponent strength) | src/hooks/useDiscussionPractice.ts:358 | per-game | none (profile rating moves only via coach-game Elo of finished games; capabilityEvidence holds the underlying per-move rows but not the estimate or gem outcomes) | Every new game, every reopen and every resumed game restarts the opponent at the profile rating, so a strong player is under-matched again each game; whether they sprang or missed a trap is forgotten. |
| useDiscussionPractice hintDial + dialSeededRef | src/hooks/useDiscussionPractice.ts:329 | per-page-visit | none | Hint subtlety the student earned resets to the rating default every visit (Learn reads it; Play surfaces compute it and drop it). |
| CoachGamePage gameState (moves, hintsUsed, takebacksUsed, keyMoments) | src/components/Coach/CoachGamePage.tsx:513 | per-game | coachPlayPersistence db.meta snapshot while active (2155); db.games + autoAnalyzeGameMisconceptions/mistakePuzzles on finish; capabilityEvidence per move via recordGradedMove (3265) | A game restarted, colour-swapped or abandoned mid-way never reaches My Mistakes / misconception tags / mistake puzzles; only capability rows survive. Comments at 262/281 claiming raiseWhyForSlip 'files the record' are false. |
| coachDifficulty (appStore) + seededDifficultyRef | src/components/Coach/CoachGamePage.tsx:466 | per-app-session | coachPlayPersistence snapshot (difficulty) only while a game is active | Reopen the app or open Play after choosing Hard elsewhere and the opponent is back on Medium. |
| clockHistoryRef | src/components/Coach/CoachGamePage.tsx:1975 | per-game | db.games.clockRemainingMs on finish (2068) only; not in the active-game snapshot | A resumed timed game is saved with clock history from the resume point only; time-trouble analysis misses the earlier moves. |
| exploreMessages (explore-ahead chat) | src/components/Coach/CoachGamePage.tsx:1181 | per-board | none (not mirrored to coachMemoryStore.conversationHistory) | What they explored and were told vanishes when the tip closes; later chat cannot refer to it. |
| quizStateRef / quizState | src/components/Coach/CoachGamePage.tsx:340 | per-board | appAudit 'quiz-resolved' row only | Quiz right/wrong never reaches the student model; the coach can re-quiz a move they already got right or wrong. |
| offBookFiredRef | src/components/Coach/CoachGamePage.tsx:1093 | per-game | db.games pgn of finished games only (departure re-derivable); nothing for abandoned games | none for the one-shot warning (per-game by design); the departure of an unfinished game is never recorded. |
| useHintSystem levelRef / bestMoveRef (hint tier per position) | src/hooks/useHintSystem.ts:209 | per-board | coachMemoryStore.hintRequests (db.meta coachMemory.v1), unlinked to the game | none on reopen; review cannot join a hint to its Play game. |
| useCoachTips -> tacticAlertService.sessionOutcomes | src/services/tacticAlertService.ts:622 | per-app-session | none (capabilityEvidence only partly via evaluatePlayerMove's posed fundamentals; puzzleMisses covers puzzles, not gameplay) | Coach forgets 'you missed a fork last time' between sessions; struggle detection starts cold each launch. |
| coachMemoryStore.pendingWalkthrough | src/stores/coachMemoryStore.ts:240 | per-app-session | none | Ask for a lesson, app closes before Learn opens: the request is gone. |
| GameChatPanel messages | src/components/Coach/GameChatPanel.tsx:279 | per-page-visit | coachMemoryStore.conversationHistory (brain copy, 200 cap); coachPlayChat db.meta for the active Play game only | Play-rung chat is gone on exit; Play chat disappears when each game ends, though the brain still remembers it. |
| CoachChatPage voiceMuted | src/components/Coach/CoachChatPage.tsx:93 | per-page-visit | none (appStore.coachVoiceOn is the separate persisted master toggle) | Mute resets every visit to /coach/chat. |
| OpeningPlayMode correctMovesPlayed / firstDeviation / deviatedRef / result (Opening Report) | src/components/Openings/OpeningPlayMode.tsx:275 | per-game | none (misconceptionTags only if the deviation was also an engine-worse slip) | 'You deviated at move 7, correct move was …' is shown once and forgotten; next session the coach cannot target that ply or show progress on the line. |
| OpeningPlayMode moveHistory (the Play-rung game) | src/components/Openings/OpeningPlayMode.tsx:222 | per-game | capabilityEvidence per move + misconceptionTags on slips (evaluatePlayerMove) only | Play-rung games never appear in game history, review or mistake puzzles. |
| OpeningPlayMode punishCue / punishRevealed / punishSpokenRef / gemSpokenRef | src/components/Openings/OpeningPlayMode.tsx:181 | per-board | none for find-vs-reveal; evaluatePlayerMove's prompted flag reflects hints only (812, hintedThisMove) | A punish played after tapping Show the line is recorded as unaided evidence; whether they found traps themselves is never remembered. |
| OpeningPlayMode voiceOn | src/components/Openings/OpeningPlayMode.tsx:107 | per-page-visit | none (independent of appStore.coachVoiceOn) | Voice turns back on every time the Play rung opens. |

### Tactics + puzzles + My Mistakes

| memory | where | lifetime | persists via | loss on close |
|---|---|---|---|---|
| seenIdsRef | src/components/Puzzles/AdaptivePuzzlePage.tsx:120 | per-page-visit | db.puzzles attempts/successes/srsLastReview, written by recordAttempt (puzzleService.ts:731) but never read by findPuzzleInBand (adaptivePuzzleService.ts:325-331) | A puzzle solved yesterday can be served again (the pick is random among the 10 closest, adaptivePuzzleService.ts:366-370). The kid selector already sorts by attempts (puzzleService.ts:885/909), so the two siblings disagree. |
| session (AdaptiveSessionState: themesEncountered, streak, bestStreak, solved/failed) | src/components/Puzzles/AdaptivePuzzlePage.tsx:113 | per-page-visit | Per-puzzle results persist (db.puzzles via recordAttempt 338; capabilityEvidence via PuzzleBoard 580/676; puzzleMisses). bestStreak: none | The summary's best streak and per-theme accuracy are shown once and then lost. There is no all-time puzzle best streak, although Deep Run keeps one (deep_run_best_v1). |
| reachHistory / reachHistoryRef | src/components/Puzzles/AdaptivePuzzlePage.tsx:148 | per-page-visit | profile.puzzleRating (latest value only, 353); no history table | The rating trend covers one session only. Each session's graph starts flat, so the student never sees progress across days. |
| reachRef | src/components/Puzzles/AdaptivePuzzlePage.tsx:129 | persisted | profile.preferences.reachState / masterReachState (persistReach 172-184), written only when offset is 0. Easy/Hard results are in-session only (175) | None for Medium and the pooled tabs. Easy/Hard results never move the ladder, by design. |
| saidHabitsRef (PuzzleBoard) | src/components/Puzzles/PuzzleBoard.tsx:193 | per-page-visit | none. Only the NEED side persists (weakness spine via useStudentRecord / habitNeedFrom) | The same habit line ('slow down… checks, captures') is taught again every session. On Deep Run and the theme drill it repeats every puzzle, because the board remounts. |
| recalledRef (PuzzleBoard) | src/components/Puzzles/PuzzleBoard.tsx:195 | per-page-visit | none | The recall line repeats every session, and every puzzle on Deep Run and the theme drill. |
| sessionOutcomes (module-level) | src/services/tacticAlertService.ts:622 | per-app-session | capabilityEvidence / puzzleMisses / weakness spine hold the same fact, but hasRecentFailure (628-632) reads only this array | The struggle coach's sameTypeFailed (useStruggleDetection.ts:73) forgets that a fork was missed yesterday. MistakePuzzleBoard 793 says this records outcomes 'for cross-session coaching', which is false. |
| saidHabitsRef (MistakePuzzleBoard) | src/components/Puzzles/MistakePuzzleBoard.tsx:184 | per-board | none | The habit line repeats on every position of a 'Practice these' group or tag drill, and every session. |
| recalledRef + recallLineRef (MistakePuzzleBoard) | src/components/Puzzles/MistakePuzzleBoard.tsx:189 | per-board | none | 'This motif caught you before' is said again on every puzzle of the same weakness group. |
| seenRef (Deep Run) | src/components/Puzzles/DeepRunPage.tsx:50 | per-game | db.puzzles attempts (recordAttempt 119), which selection ignores | A new run can re-serve puzzles from earlier runs. |
| run / runRef.targetRating (Deep Run) | src/components/Puzzles/DeepRunPage.tsx:48 | per-game | Best banked only (db.meta deep_run_best_v1: 31, 129, 150, 158). The newUserRating from recordAttempt is discarded (119). | Every run restarts at profile.puzzleRating, and the run's measured edge is thrown away. Deep Run solves never move the student's puzzle rating. |
| seenIdsRef (theme/opening drill) | src/components/Tactics/TacticDrillPage.tsx:90 | per-game | db.puzzles attempts (recordAttempt 246), which getPuzzleForThemeAtRating / ForOpeningAtRating ignore (puzzleService.ts:417, 484) | The pick is random among the top 5 closest, so the same drill puzzles recur across visits. |
| noteIdsSeenRef | src/components/Tactics/TacticDrillPage.tsx:103 | per-page-visit | none | The same written pattern note is shown again on the next visit. |
| sessionRef (SetupAdaptiveSession incl. seenIds, targetRating, streak) | src/components/Tactics/TacticSetupPage.tsx:47 | per-game | profile.puzzleRating (97-100). Seen puzzles: none | Setup puzzles repeat across sessions (pickSetupPuzzle skips only session.seenIds, setupTrainerService.ts:283). |
| consecutiveSolves | src/components/Tactics/TacticCreatePage.tsx:68 | per-page-visit | Context depth persists in db.meta (getContextDepth / updateContextDepth, tacticCreateService.ts:35). The streak does not. | A streak in progress restarts at 0 on the next visit. Depth survives. |
| index / correct / spacedRef (tag drill) | src/components/Puzzles/WeaknessTagDrillPage.tsx:38 | per-game | capabilityEvidence per answer. misconceptionTags via recordTagDrillResult, but only at finishSession (61-66). The puzzles are built per session and never saved (70-73). | Quitting mid-drill means the tag's spacing is never updated, and the drill rebuilds from scratch. |
| levelsCompleted | src/components/Kid/BishopVsPawns.tsx:31 | per-page-visit | none (the file has no progress write) | The completed-level ticks (224) vanish when the kid leaves the game. |
| levelsCompleted + starsEarned | src/components/Kid/ColorWars.tsx:32 | per-page-visit | none | Ticks and stars are gone next visit, unlike PieceSweep / RookMaze, which save via their services. |
| levelsWon / levelIndex (King March, King Escape) | src/components/Kid/KingMarchGame.tsx:22 | per-page-visit | none | These games always restart at level 1 and the star count (357) resets. KnightSweep, LeapFrog and PairArmy likewise have no progress write in their files. |
| QueenVsArmy / QueensGauntlet results | src/components/Kid/QueenGamesHub.tsx:144 | per-page-visit | none | Queen-game wins are never remembered. |
| difficulty / solvedCount / totalAttempted (Puzzle Quest) | src/components/Kid/KidPuzzlePage.tsx:34 | per-page-visit | Attempts persist via recordAttempt (db.puzzles), and selection reads them (puzzleService.ts:909). The chosen level does not persist. | The level resets to 'easy' every visit. |
| rating (piece puzzles) | src/components/Kid/KidPiecePuzzlesPage.tsx:57 | persisted | kidRatingService getKidRating (79) / bumpKidRating (111), db.profiles | none |

### Openings

| memory | where | lifetime | persists via | loss on close |
|---|---|---|---|---|
| teachingLedger (db.meta key 'teachingLedger') | src/services/teachingLedger.ts:22 | persisted | db.meta 'teachingLedger' | none from closing the app. Parity gap: masterclass Watch/Learn progress never feeds the recap, so a student who finished the masterclass is told 'today we start with the main line' in Learn. |
| teachingLedger polluted by mating-pattern lessons (persisted side effect) | src/components/Coach/CoachEndgamePage.tsx:155 | persisted | db.meta 'teachingLedger' | Not a loss but a wrong memory: on a second visit to a mating pattern, the intro can be prefixed with 'Last time we covered the main line. Today we add Qh7#', handing over the find. A pattern name can also surface as the coach's-call 'opening'. |
| selectedTabIndex (variation picker choice) | src/components/Openings/OpeningDetailPage.tsx:337 | per-page-visit | none. db.openings stores rung completion per line index (markRungComplete), not the last-picked line. | Reopening the opening from the list or from home always lands on the main line. The line the student adjusted the picker to is forgotten, so they re-pick it every visit. This matters for 'default to the most popular line, picker adjusts it': the adjustment is not remembered. |
| quizIndex / quizCompleted (checkpoint quiz progress) | src/components/Openings/OpeningDetailPage.tsx:338 | per-page-visit | none (not capabilityEvidence, not misconceptionTags, not db.openings) | The quiz restarts at question 1 on every visit, even after the student finished it. Wrong answers never reach the record, so the coach never knows they missed the concept. |
| beatIndex (masterclass Watch position) | src/components/Openings/LessonPlayer.tsx:62 | per-page-visit | none. Only full completion persists (markRungComplete). Parity gap: thinkingLessonMemory.resume does resume-where-stopped for thinking lessons. | A student who closes the app 12 beats into a 20-beat Watch restarts at beat 1 and re-hears everything. |
| completedLinesRef (trap/warning lines finished) | src/components/Openings/TrainMode.tsx:75 | per-page-visit | none for completion. openingWeakSpots holds failures, keyed wrongly. | After reopening, every trap line reads as never done and 'All Lines Complete' never carries over. Weak-spot drills can show the wrong position or count another line's misses. |
| totalMistakes / hintUsed / startTimeRef (Drill & Practice) | src/components/Openings/PracticeMode.tsx:97 | per-board | db.openings.drillHistory via openingService.recordDrillAttempt; openingWeakSpots per wrong move | Only if the app closes mid-line: the partial attempt is lost. Acceptable. |
| SRS session tallies (cardCorrect/cardWrong/linesPerfected/linesAttempted/lineMistakes) | src/components/Openings/SrsTrainerPage.tsx:156 | per-page-visit | db.sessions via trainingSessionLedger (end only); per-card SM-2 is persisted immediately (recordReview :334) | Closing the app mid-session leaves an open 0-item session row, so the weakness profile and week ring miss that training. The SM-2 grades themselves are safe. |
| lineResultsRef (SRS line-mode per-card right/wrong) | src/components/Openings/SrsTrainerPage.tsx:176 | per-board | srsOpeningCards via srsOpeningService.recordReview (at line end) | A close mid-line drops that line's grades. Minor. |
| autoPlaySpeed (+ evalBar/engineLines/lichess overrides) | src/components/Openings/WalkthroughMode.tsx:147 | per-page-visit | none (Settings hold only the global defaults) | A student who picks 'drill' speed gets 'learn' again next lesson. Preference, low priority. |
| firstDeviation / correctMovesPlayed / deviatedRef / result (WLPP Play rung) | src/components/Openings/OpeningPlayMode.tsx:275 | per-game | none for the deviation ply or the N-of-M score. Only eval-worsening moves reach misconceptionTags/capabilityEvidence through useDiscussionPractice.evaluatePlayerMove (:811), and a bookDepartureWeakness-style record is never written. | 'You deviated at move 7' is shown once and forgotten. The coach can never say 'you left the Marshall at move 7 again'. Repertoire Play-rung departures never become the book-departure signal. |
| liveRef (opponent live strength, via liveSessionRef) | src/hooks/useDiscussionPractice.ts:358 | per-game | capabilityEvidence rows per move (recordMoveEvidence). The live rating itself is not written back to the playing rating. | Per-game by design. The measured strength from opening Play games never feeds studentPlayingRating, so the next game starts again from the boot estimate. |
| hintDial | src/hooks/useDiscussionPractice.ts:329 | per-page-visit | none | Each mount re-seeds from rating. On this surface it is computed and never read (G8.5). |
| messages (opening coach chat) | src/components/Openings/MasterclassCoachChat.tsx:42 | per-page-visit | none (coachMemoryService only via [[REMEMBER]] tags) | Questions asked about an opening are forgotten. The coach cannot recall 'you asked about the Marshall last time'. Low priority. |
| activeIdx / page (book reader position) | src/components/Openings/BookReader.tsx:138 | per-page-visit | none | Reopening the book starts at chapter 1, page 1. Low priority. |
| CORPUS_NOTES_SEEN (module-level) | src/components/Coach/EndgameLessonTab.tsx:435 | per-app-session | none | After relaunch the same endgame teaching notes are shown again from the top, in the same order. |
| useAdaptiveEndgameSession state (playedIds, themesEncountered, sessionRating, streak) | src/hooks/useAdaptiveEndgameSession.ts:107 | per-page-visit | profiles.endgameRating only; endgameProgress records keystone fens, not drill puzzle ids or per-theme accuracy | Next session can re-serve puzzles already solved. The per-theme weakness tracking that steers the boost starts from zero, so a theme they keep missing is not targeted until it is missed again. |
| adaptiveHistory / posIndex (endgame lesson) | src/components/Coach/EndgameLessonTab.tsx:296 | per-page-visit | endgameProgress via recordPlay (:641) per position (mastery + spaced review) | Re-entering a lesson starts at keystone 1 rather than the first unmastered one. Mastery itself is kept. |
| lessonWrongAttempts (mating pattern lesson) | src/components/Coach/CoachEndgamePage.tsx:546 | per-board | profiles.endgameRating, only through Practice More. No endgameProgress row and no capabilityEvidence for mating patterns. | A student who finds the mate (or misses it twice) and taps Back leaves no trace. Pattern mastery is never recorded, so the coach cannot know they already know Anastasia's mate. |
| ThinkingLessonSession.bookRead | src/services/thinkingLessonSession.ts:153 | per-board | none (thinkingLessonMemory keeps seen boards and resume, not heard book lines) | Every lesson of the same habit re-says the identical book sentence after the first example. |
| ThinkingLessonSession.seen / results / choiceResults | src/services/thinkingLessonSession.ts:147 | per-board | thinkingLessonMemory (rememberLessonBoard via deps.remember :201/:300/:332); capabilityEvidence via recordLessonAnswer/recordLessonChoice (thinkingLessonStart.ts:272-281, :506/:326) | none (written per answer) |
| stoppedRef / practiseRef | src/hooks/useThinkingLesson.ts:67 | per-page-visit | thinkingLessonMemory.resume (saveLessonProgress → saveLessonResume) holds the real resume point | none (resume persisted) |
| thinkingLessonMemory (db.meta 'thinking-lesson-memory.v1') | src/services/thinkingLessonMemory.ts:16 | persisted | db.meta 'thinking-lesson-memory.v1' | none |
