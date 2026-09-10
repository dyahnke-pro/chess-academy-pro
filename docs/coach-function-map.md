# Coach Function Map — the authoritative capability inventory

The complete list of what the coach can DO and ANSWER, extracted from code (not
guessed). The capability-matrix audit (`scripts/audit-coach-capability-matrix.mjs`)
tests against THIS map. When a capability is added/removed, update this map in the
same change. Anchors are `file:symbol` so they stay valid as line numbers drift.

Legend: ✅ verified working (real-bubble/board read on prod) · ⚠️ works but
degrades/needs a seed · ❌ broken (a real defect) · ▫️ not yet re-verified.

---

## A. QUESTION INTENTS — `src/coach/questionIntents.ts` (68 detectors)

Each detector engages a grounded assembler in `groundedAnswer.ts` via
`coachService.ask` → `coachApi`. All PHRASE facts computed in code (G0).

### Live board reads (need a position on the board)
- `isPositionAssessmentQuestion` — "who is winning" ✅
- `isWhoseTurnQuestion` — "whose turn" ✅
- `isLiveColorQuestion` — "which side am I" ✅
- `isAttackAssessmentQuestion` — "am I attacking / do I have an attack"
- `isPlanQuestion` — "what's my plan" ✅
- `isMasterPlayQuestion` — "what do masters play here" ✅
- `isMateQuestion` / `isDrawQuestion` — mate/draw verdicts
- board-aspect reads (see §B): material ✅, development ✅, center, space,
  structure, king-safety, bishop-pair, best/worst-piece, open-files,
  pawn-breaks, key-squares, maneuver, hanging, threats, piece-purpose,
  square-control, last-move, opponent-move ✅

### Moves
- `isBestMoveQuestion` — "what's the best move" ✅
- `isWhyBestMoveQuestion` — "why is that best" ✅
- `isCandidateMoveQuestion` — "is Nd5 good" ✅ (illegal-move aware)
- `isAlternativesQuestion` — "what else can I play"
- `isMoveRatingQuestion` — "was that brilliant / a blunder" (brilliancy.ts)
- `isHintRequest` — "give me a hint" ✅

### Concepts / teaching (corpus + book grounding)
- `isConceptQuestion` — "what's a fork" ✅
- `isFundamentalsQuestion` / `isFundamentalLessonQuestion` — "teach the basics" ✅
- `isTheoryQuestion` — "how to play vs an IQP" ✅
- `isTeachingMethodQuestion` — "how do you teach the Caro-Kann" ✅
- `isFamousGameQuestion` (`famousGameFromText`) — "show me the Opera Game" ✅

### Openings
- `isOpeningProfileQuestion` (`openingProfileKind`) — "how do I play the Sicilian" ✅
- `isOpeningTrapsQuestion` — "traps in the Italian" ✅
- `isNameOpeningQuestion` — "what opening is 1.e4 c6" ✅ (needs moves played)
- `isCounterRepertoireQuestion` — "what vs the London" ✅
- `isRepertoireGapQuestion` (`repertoireGapKind`), `openingExistenceQuery`,
  `isOpeningAccuracyQuestion`

### Self / stats / weakness (need imported games → honest "import" decline) ✅
- `isStatsQuestion`, `isProgressQuestion`, `isImprovementTrendQuestion`,
  `isStrengthsQuestion`, `isMistakesQuestion`/`isGameMistakeQuestion`,
  `isWeaknessBriefingQuestion` ✅ (bare "what should I work on" — verified),
  `weaknessLifecycleKind` (fixed/persistent/pressing), `isMisconceptionsQuestion`,
  `isAccuracyQuestion`, `isConsistencyQuestion`, `isConvertingQuestion`,
  `isColorQuestion`, `isRecordsQuestion`, `isRecordVsQuestion`,
  `isErrorsBySituationQuestion`, `isTransferGapQuestion`, `isSkillRadarQuestion`,
  `isReviewDueQuestion`, `isLastGameQuestion`, `isLastGameMistakeQuestion`

### Tactics / endgame / phase
- `isTacticsQuestion` — "any tactics here" ✅
- `isTacticsProfileQuestion` — "how are my tactics" ✅
- `isPuzzleStatsQuestion`
- `isEndgameQuestion` — technique/verdict ("how to win K+P") ✅ (deflects if not in an endgame)
- `isEndgamePlayRequest` — "let me practice a rook endgame" → tablebase trainer  ▫️
- `isEndgameWeaknessQuestion` — "what endgame am I weakest at"  ▫️
- `isPhaseQuestion` — "what phase are we in"

### App / self-help
- `isSettingsQuestion` — "how to change the board theme" ✅
- `isAppHelpQuestion` — "what does the tactics tab do" ✅
- `isTimeTroubleQuestion` — "do I get into time trouble" ✅
- `isPlayerGamesQuestion` — "how did Naroditsky beat X"

**Status: 48/48 sampled question lanes answer correctly on prod (real-bubble
read, 2026-09-10).** Earlier "material/development/weakness-brief EMPTY" were
audit-harness artifacts of a body-innerText line-diff; reading the real
`chat-message-assistant` bubble shows all three answer.

## B. BOARD-QUESTION ASPECTS — `src/data/boardQuestionBuckets.ts` `QuestionAspect`
Routed by `boardQuestionRouter.pureBoardAspect` → `answerBoardQuestion`.
material · eval · space · development · my-plan · opponent-plan · my-threats ·
opponent-threats · square-control · square-occupant · square-safety ·
square-weakness · piece-activity · piece-purpose · piece-role · piece-safety ·
best-move · legal-moves · move-comparison · move-consequence · move-eval ·
move-purpose · why-best · passed-pawns · pawn-breaks · structure · king-safety
(mine/theirs) · king-lines · hanging · loose · mate-threat · tactics ·
opening-plans · scoped (catch-all).

## C. POSITIONAL TOPICS — `groundedAnswer.ts` `PositionalTopic` (19)
material · center · development · structure · king · piece · key-squares ·
space · bishop-pair · passed-pawn · best-piece · pressure · targets ·
open-files · pawn-breaks · structure-name · xray · maneuver · endgame-plan.

## D. ACTUATOR TOOLS — `src/coach/tools/**` (24) — the DO-things
- Board: `play_move` ✅ · `take_back_move` ✅ · `reset_board` ✅ ·
  `set_board_position` ❌ (brain-only; no NL route reaches it on Learn — see §F) ·
  `save_position` · `restore_saved_position`
- Navigation: `navigate_to_route` ✅ (broadened 2026-09-10)
- Opening/repertoire: `set_intended_opening` · `favorite_opening` ✅ ·
  `save_opening_to_repertoire` · `start_walkthrough_for_opening` ✅
- Teaching: `quiz_user_for_move` ✅ · `clear_memory`
- Records: `record_blunder` · `record_hint_request`
- Engine/lookups (read-only): `stockfish_eval` · `stockfish_classify_move` ·
  `lichess_opening_lookup` · `lichess_master_games` · `lichess_game_export` ·
  `local_opening_book` · `lookup_player_games` · `lookup_player_opening_moves`

## E. DETERMINISTIC ROUTERS
- `coachAgent.parseCoachIntent` kinds: qa · favorite-opening · explain-position ·
  review-game · continue-middlegame · play-against · puzzle · walkthrough
- `coachSessionRouter.tryRouteIntent` (`RoutedIntent`): play_move ·
  take_back_move · reset_board · navigate_to_route (training-aid drills) ·
  **set_board_position (declared in the type union but `computeRoutedIntent`
  NEVER emits it — dead)**

## F. CoachTeachPage `handleSubmit` ROUTING (the Learn surface)
Order matters. Pre-pass deterministic commands run first:
- favorite command ("favorite the X") ✅
- **navigation** (`navTargets`, broadened 2026-09-10: lead + trailing descriptor
  + synonyms — "go to the tactics trainer" ✅)
- explain-position ("explain this position") → full read ✅
- take_back / reset (via `tryRouteIntent`) ✅
- **NOT handled here: `set_board_position`** — so "set up a middlegame / set up
  the board after <moves>" falls through to opening-capture and fuzzy-matches a
  WRONG opening walkthrough (repeatedly → Philidor). ❌ **REAL BREAK.**
Then: opening capture/resolve → tiers (Tier-0 fuzzy → Tier1 static → Tier2 cache
→ Tier3 gen); stage menu (drill/quiz/findMove/punish/play); walkthrough controls
(start/skip/fork/stop/resume/leaf/continue); trap-chip gem teaching; `/clearcache`;
player-game lookup; else → brain Q&A (grounded).

---

## ENDGAME — verified working (prod 2026-09-10)
- "practice a king and pawn endgame" → **drops a real endgame drill ON the Learn
  board** (32→12 pieces, "Pawn endings drill — Black to move") ✅ via
  `trainingAidRouter` pawn-endings branch.
- "set up an endgame" → "Train endgames →" CTA to endgame training ✅.
- Endgame technique Qs (`isEndgameQuestion`) answer; deflect when not in an
  endgame ("32 pieces still on the board") — correct.

## KNOWN REAL BREAKS / GAPS (as of 2026-09-10)
1. **"set up / practice a MIDDLEGAME" does not actuate** — `trainingAidRouter`
   has an endgame branch (`/\bend\s?games?\b/ && framed` → drop a drill on the
   board) but **NO middlegame branch**. So "set up a middlegame" is treated as a
   question ("Material is even — 39 points"), and "set up a middlegame to
   practice" fuzzy-matches a random opening walkthrough (Stafford Gambit). The
   endgame pattern is the template: "practice a <phase>" should drop a real
   position on the board. Middlegame positions exist (`middlegame-plans.json`
   `criticalPositionFen`). → add a middlegame branch mirroring endgame. David:
   "you can also ask coach to set up a middlegame — it SHOULD be able to do that."
2. **`set_board_position` unreachable on Learn** — "set up the board after
   <moves>" / a raw FEN never actuates (the actuator is brain-only and
   `computeRoutedIntent` never emits the kind); the opening-capture tier grabs
   the move sequence and fuzzy-matches a WRONG opening (Philidor). Lower priority
   than #1 (arbitrary-FEN setup is a rarer ask), but the confidently-wrong
   Philidor walkthrough is the same fuzzy-junk class as the nav/confidence-floor
   fixes.

## FUTURE (deferred until after the audit — David 2026-09-10)
- **Set up a board from a PHOTO** — accept a photo/screenshot of a board,
  reconstruct the FEN (recognizer produces candidates, chess.js validates —
  G0/G3, low-confidence squares flagged not guessed), set it via
  `set_board_position`. Real feature with a recognition dependency; design first.

## HAND-VERIFIED ON PROD 2026-09-10 (drove it myself, read the real bubble/board)
- Actions: play_move ✅, take_back ✅, reset ✅, navigate ✅, start_walkthrough ✅,
  quiz ✅, **set up a middlegame ✅ (new fix — "Middlegame drill… play on the board", 32→23)**,
  practice endgame ✅ (32→12 drill), **pro-plays-opening ✅** ("how does Danya
  play the Alapin" / "how does Levy play the Vienna" → the pro's REAL game walked
  on the board via the `middlegame-plan-inline` view).
- Questions: every sampled lane answers (real-bubble read) — board reads,
  concepts, theory, openings, master-play, self/stats (honest "import" decline),
  app/settings, endgame technique.
- SEED NOTE (harness): on /coach/teach the first "play X for me" makes the coach
  take a side and play it; further "play X" only QUEUES the coach's reply and
  waits for the STUDENT to move (board click). So chaining "play X" seeds only
  move 1 — a rich-middlegame seed needs board-square clicks. Read LANES are alive
  regardless; board-TRUTH on a deep middlegame needs the click-seed.
- SOFT SPOT (not a hard break): "who is better developed?" returns the eval
  ("0.3") rather than a development-specific count. Answers, but generic.

## FIXED 2026-09-10
- `navigate_to_route` narrowness ("tactics trainer" → best-move default) — commit
  43a54e4: nav intent = shared lead + trailing descriptor + synonyms.
- **"set up / practice a middlegame"** had no route (endgame did) — commit c4ef579:
  `trainingAidRouter` middlegame branch + `coachDrillService` middlegame aid →
  drops a real middlegame-tagged puzzle on the board. Verified on prod.
- **"how <pro> plays <opening>"** (present tense, no "does") fell to fuzzy
  opening-capture → WRONG opening (Catalan → Smith-Morra) — commit be307d8:
  present-tense named-player arm in `PLAYER_GAMES_QUESTION_RE`.
