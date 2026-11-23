# WO-LEARN-MISTAKES-ONLY (David 2026-11-23)

Branch `learn-mistakes-only` (worktree /home/user/urg-me). Never main until David says.

## The goal

Learn speaks ONLY after the student has played, ONLY on a mistake by either side, and ONLY as the lesson sentence:
LESSON (board example inside) → CONSEQUENCE → BETTER MOVE + JOB (once past) → HABIT (record RED/GREY).
No board restatement. Learn never names the student's next move or the move they just played. Silence otherwise.
Approved voice: "Trading off your dark-squared bishop hands them the dark squares, and d4 is the first target. Before you trade a bishop, ask which colour you're giving away."

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
2. The recipe table: `mistakeLesson.ts`, `Record<MistakeCause, LessonRecipe>` from the cards' §D rows; missing slot → silent + logged.
3. Sensitivity: the cards' §F threshold changes, each proven on its miss board and its guard board.
4. The composer: lesson → consequence → better move → habit; the board-restatement step removed.
5. Learn's voice gate: mistake turns only, after the move; delete the before-move focus question and the pointers (CLAUDE.md sections replaced).
6. The tape: every Learn line on David's 16 games (`audit-reports/learn-mistakes-only-tape.md`), read line by line; tests; ship-check; branch push; David decides preview / main.

## Data (saved, no new runs)
- `audit-reports/teaching-census-data/`: lines-*.jsonl (16 games, every offered/said line), boards-?.jsonl (952 positions), g-*.jsonl (David's 12 games with engine reads), compare.json (Danya concepts vs ours), computer-map-raw.json.
- `audit-reports/danya-havecheck/` (224 boards with his ideas placed), `/home/user/danya-full/` (18,368 ideas), `src/test/fixtures/` (decision baseline, replay games), `audit-reports/.fixtures/danya-bench/` (7,477 engine reads), `audit-reports/.fixtures/data-drop-david.json`.
