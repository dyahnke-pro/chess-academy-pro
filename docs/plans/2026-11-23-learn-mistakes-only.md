# WO-LEARN-MISTAKES-ONLY (David 2026-11-23)

Branch `learn-mistakes-only` (worktree /home/user/urg-me). Never main until David says.

## The goal

Learn speaks ONLY after the student has played, ONLY on a mistake by either side, and ONLY as the lesson sentence:
LESSON (board example inside) → CONSEQUENCE → BETTER MOVE + JOB (once past) → HABIT (record RED/GREY).
No board restatement. Learn never names the student's next move or the move they just played. Silence otherwise.
Approved voice: "Trading off your dark-squared bishop hands them the dark squares, and d4 is the first target. Before you trade a bishop, ask which colour you're giving away."

## Rule for every sentence the build writes: say it several ways (David 2026-11-24)
Every recipe slot (LESSON, CONSEQUENCE, BETTER MOVE, HABIT) holds **at least 5 phrasings of the same idea**, rotated with `rotateStem` keyed on the board, never `Math.random`, so a game never repeats itself. The idea and the facts stay the same; only the words change. A gate (`mistakeLesson.test.ts`) fails any recipe slot with fewer than 5 phrasings and any two phrasings that are word-for-word the same once squares and pieces are blanked. The only exceptions are the ones already locked: the focus clue and the mission lines stay fixed.

## The opponent's mistake is said by the record (David 2026-11-24)
When the coach (the opponent) makes a mistake, Learn speaks it only if the student needs the hint. The heat map decides on the skill that finds it (the cause's record tag on the student's side: punishing a loose piece, a fork, a pin…):
- RED or GREY: the full lesson.
- AMBER: one short clause.
- GREEN: silent.

It is said after the student's reply, and it never names the student's move. The same hold-rate read (`holdRate`) is used for the habit slot.

## The REPAIR slot: how to live with a loss that can't be undone (David 2026-11-24)
When a mistake leaves something permanent (a bishop traded off, a pawn left weak, a passer let loose, the king's cover pushed), the turn also says how to adapt. The order is LESSON → CONSEQUENCE → BETTER MOVE (past) → REPAIR → HABIT.

REPAIR is said as a second PRINCIPLE (the one that overcomes the loss) with this board inside it, e.g. "When you've lost a bishop, your pawns become it: put them on its colour." It is computed from the board, never written freehand. Each repair rule has a deterministic check that it is possible here:
- colour conceded: put your pawns on the lost bishop's colour, cover the holes with a knight, trade off their good bishop. The check: which pawns can still reach that colour, and which knight can reach the hole.
- weak pawn: keep pieces near it, trade the pieces that attack it, or push it and trade it off.
- passer let loose: blockade it with a knight, bring the king, or put a rook behind it.
- king cover gone: keep defenders near the king, trade off their attackers (queens first), don't open more lines.
- misplaced piece: bring it back toward the centre.

Learn says the repair as a plan, never as a move ("your pawns on the dark squares", never "c3"). Review may name the move. Each repair has 5 rotated phrasings. With no computable repair the slot is silent.

## Say it short, like a person (David 2026-11-24)
Use the fewest words that carry the idea: never 10 words when 5 will do. Each slot is one short sentence that names the piece and the square, with no throat-clearing ("Now,", "the idea is that", "what this means is"). The words get shorter; the facts don't. The gate (`mistakeLesson.test.ts`) fails any stem over 14 words, and any stem that repeats a word already said in the same turn's slots (piece and square names excepted). This limit is on the phrasing written into the recipe, never on how many facts are said.

## Learn names no move at all: principles instead (David 2026-11-24)
In Learn the BETTER MOVE slot becomes a principle that says what the better move did, never the move itself ("Retreat the bishop to keep it", never "Bc1 kept it"). The REPAIR slot is a principle too ("Put your pawns on dark squares"), never a move. This replaces carve-out 3 (the better move named once past) for Learn; CLAUDE.md is updated in the same build. Review and chat still name the move.

## Order — the computer job comes first

### Phase 1 — the cards (the build spec) ← NOW
One card per teaching computer, template `docs/teaching-cards/CARD-TEMPLATE.md`, 192 rows of `docs/teaching-cards/computer-teaching-map.md` plus the error computer (`inaccuracyCall.errorWhy`). Each card: facts handed over / dropped / cheaply computable, gates; slot readiness for the sentence type; EVERY lesson its facts support (full angle grid, approved voice); which mistakes it explains; exact build edits; proof boards; open questions.
- 6 agents at once, one per family; cards saved one by one to `docs/teaching-cards/<family>/<computer>.md`.
- Saved data only (no new engine runs). A computer's own pure function may be run on a saved board (chess.js, no engine) to prove a row.
- Second pass: one checker per family against the template and the code — missed angles, wrong lines, unbuildable rows.
- I review every card; David reads the result.
Pilots: `docs/teaching-cards/pilot-cards.md` (pictureVerdict, readPosition — re-cut into the template by their family agents).

### Phase 2 — the build (from the cards; separate go)
1. Facts: every computer exposes its dropped "why" as typed fields (cards §B2/§F); `errorWhy` exports its cause (`MistakeCause`, exhaustive: costReason kind+motif, whyItFailed kinds incl. walks-into-fork, positionalReason kinds, mate).
2. The recipe table: `mistakeLesson.ts`, `Record<MistakeCause, LessonRecipe>` from the cards' §D rows, ≥5 rotated phrasings per slot; missing slot → silent + logged.
3. Sensitivity: the cards' §F threshold changes, each proven on its miss board and its guard board.
4. The composer: lesson → consequence → better move → habit; the board-restatement step removed.
5. Learn's voice gate: mistake turns only, after the move; delete the before-move focus question and the pointers (CLAUDE.md sections replaced).
6. The tape: every Learn line on David's 16 games (`audit-reports/learn-mistakes-only-tape.md`), read line by line; tests; ship-check; branch push; David decides preview / main.

### Live bugs the cards found (fix in Phase 2, each with a test that fails on the old code)
- [ ] A sound sacrifice is called "you left a piece loose again" in Learn and the lessons: `habitsOf`/`opponentHabits` get an empty sound-ply set outside Review (`thinkAloud.ts` 345/352, `boardBundle.ts` 469–470, `moveThoughtFacts.ts` 583–584). Feed the game's graded sound plies.
- [ ] `emptyCheckLine` (`emptyCheck.ts:50`) puts the reply SAN in every stem; on the opponent's move that is the student's next move.
- [ ] The mistake path drops the set-up motif: `costReason.ts:227` calls `detectTacticType`, the record calls `detectTacticLine` (set-up + landing). Read the full line, one door.
- [ ] Praise on costly moves: `exchangeIdeas` (Nxh5 115, Bxf8 268, Qd4+ 372), `recaptureChoice` (Rxg2 217), `fileTradeAt` (Rf1 80, gate at 100), `contrastMoves` (27 mistakes, …f5 174). Every praise form gated at `INACCURACY_CP`, unknown cost refused.
- [ ] `whyItFailed` declares `walks-into-fork` but never returns it.
- [ ] `computeMustDefend` reports pieces in a trade in progress as hanging (Bxf6, Bxf8); guard inside the computer.
- [ ] False board lines: "Bxf3 would take off your knight on f3" with the queen on f3 (`tradeRelievesCramp`, g 1012441262 ply 16); a queen-trade recapture called a grab (`wronglyExpected`, g 1002984876 ply 12).
- [ ] No-stat breaks: `readConversion` "You're up 5 points"; `positionalReason` notes name the move just played (31 of 87).
- [ ] Known slips / gems leak into Learn (41 lines) through the registry `slipsOnLine`; opening pages only.
- [ ] `itineraryAt` fires on captures with the stock "patience" sentence.
- [ ] Seat bugs: `describeSacBreaksKingShield` always "You give up"; `blunderCheck` hard-codes "your"; `kingAttack` always "your"; `planRaceClause` past tense on a live board; "Your opponent's plan" (`buildMiddlegameOrientation`).
- [ ] Wording defects: "their both rooks" (latentFork); under-promotion "a new rook" (lineWins); mate in one listed as a "safe check" (noSafeChecks); cut-off "The plan with g4 leaves a hole on f4" (squareForPiece).
- [ ] Duplicates to merge (G8.5): two `queenSafeSquares`; three pinned-guard readers; `obligationLifts` twin; `moveAllows` registry lane vs errorWhy's read; `buildPriorityFirst` + `pictureTarget` both filing missed-weak-target; `describeStructure` (648 fired, 0 said) deleted.
- [ ] Squares not handed to the decider (dropped as unsupported): `royalDefenderTarget` (64), `enemyKingStuckInCenter` (14 of 284 said), `rookOnSeventh`, `badEnemyBishop`, `endgameVerdict`, `pieceWish`.
- [ ] Wrong skill filed: "your piece gets kicked, you lose time" tied to `tempo-handed` (which means "your move frees their piece", `positionalReason.ts:195`) in squareChoice, outOfReach, itineraryAt, queenChased → `misplaced-piece` + errorWhy `allowed-threat`.
- [ ] `positionalReason.ts:222` tags any king move as `passive-king-endgame` with no phase check (a middlegame king step files the wrong skill).
- [ ] Missing record tags the cards lean on: no `back-rank`, no `queen-out-early`; `passive-rook` reads files only (no seventh rank, no rook behind the passer).
- [ ] passedPawnPush says "push it" but passes `namesStudentMove: false` (`boardComputers.ts:5751`) and reads only the first passer (:5745); structurePlanFact `passer-mine` (`nextPlans.ts:1014`) says "push it" before the move.
- [ ] buildPriorityFirst `resolve` judges "you found it" by SAN string (`playCommentary.ts:532`) — coordinates rule (G4.5.2); its miss branch never checks whether the student's move also hit the target.
- [ ] Duplicate diffs: describeStructure / centreDuo / frozenTarget each plan their own before/after compare — extend `boardStructure.newPawnWeaknesses` (:387); `holeAccess` (`moveInsight.ts:1371`) and inaccessibleHole make the same claim twice → one producer.

### New mistake causes (merged into errorWhy's one list)
ignored-threat · tempo-wasted · colour-conceded · traded-into-target · passer-handed · compensation-lost · stalemate · technique-broken (+ walks-into-fork made live). Final list goes to David with the lesson wording.

## Data (saved, no new runs)
- `audit-reports/teaching-census-data/`: lines-*.jsonl (16 games, every offered/said line), boards-?.jsonl (952 positions), g-*.jsonl (David's 12 games with engine reads), compare.json (Danya concepts vs ours), computer-map-raw.json.
- `audit-reports/danya-havecheck/` (224 boards with his ideas placed), `/home/user/danya-full/` (18,368 ideas), `src/test/fixtures/` (decision baseline, replay games), `audit-reports/.fixtures/danya-bench/` (7,477 engine reads), `audit-reports/.fixtures/data-drop-david.json`.
