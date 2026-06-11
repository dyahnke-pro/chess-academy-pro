# App Review — bug triage (2026-06-11, late-night review session)

David stress-tested prod and surfaced a cluster of issues across Weaknesses /
Insights, the Coach, and Game Review. Captured here so we fix them methodically
instead of one-screenshot-at-a-time (which at 3am is how a new bug gets shipped).

## ✅ Fixed + shipped to main tonight
- **Insights: "Endgame errors always 0".** `weaknessAnalyzer` had a *duplicate*
  ply-based `classifyPhase(moveIndex,totalMoves)` ("endgame = last 20 half-moves")
  diverging from the canonical MATERIAL-based `classifyPhase(fen,moveNumber)` the
  rest of the app uses. Deleted it; mistakes now classify off the reconstructed
  FEN. (commit c672d2b) — *existing games need re-analysis to relabel.*
- **Insights: insane CP-loss numbers** (Avg CP loss 5930cp, costliest −30569cp).
  Mate scores (huge sentinel evals) leaked into the cpLoss delta. Clamped cpLoss
  magnitude at 1000cp for stats. (commit 22f3245)

## 🔴 Open — diagnosed, need proper fixes (NOT 3am hacks)

### Coach
1. **Raw `[ACTION:lookup_player_opening_moves {...}]` + stray `\` leaked into the
   chat bubble** (Learn-with-Coach Catalan walkthrough). The action directive
   should be parsed/executed and hidden, never rendered. → coach response
   post-processing isn't stripping un-executed action tags. *Coach-pipeline fix;
   the brain is mid grounding-inversion migration — touch carefully.*
2. **"Show me a Magnus Catalan" → coach says no game.** Root cause:
   `src/data/pro-game-references.json` **does not exist** — the breadth-layer game
   references (STEP 11.5) were never built/committed, so `lookup_player_games`
   reads nothing and returns zero. Meanwhile `model-games.json` has only **1**
   Magnus Catalan game (`mg-carlsen-catalan-slav`). Fix: build + commit
   `pro-game-references.json` for the pros (esp. Carlsen) AND/OR have the coach
   fall back to the model game when the reference lookup is empty.

### Insights / Weaknesses
3. **Tactic Recognition table all 0%** (fork/pin/skewer/… both Puzzle & In-game).
   Source = `classifiedTactics` store (`PatternsTab` → `data.tacticRecognition`).
   Likely not yet populated (analysis was still running 17/167) — VERIFY after a
   full analysis completes before treating as a code bug.
4. **"Errors by phase" donut shows a tiny count** (e.g., 13) for 881 games — it's
   the curated/deduped mistake set, not raw error totals. Confirm that's intended
   vs. confusing copy.

### Game Review
5. **Mistakes not auto-added to puzzles** — David had to click "add your mistakes
   to puzzles" manually at the bottom of the review. The `autoAnalyzeGame`
   pipeline should enroll mistakes into `mistakePuzzles` automatically. → verify
   why the auto path didn't fire on this review.
6. **Dead "2 missed opportunities → Practice" button.** No action on click; should
   route to the missed-opportunity puzzles. → broken onClick / missing route.
7. **"Reviewed — nothing new to drill" copy is misleading** — reads as "you have no
   puzzles to play" when puzzles do exist. Reword.

## Sequencing (suggested)
1. Game-review UX (5,6,7) — concrete, low-risk, high daily value.
2. `pro-game-references.json` build (#2) — a content/data build (STEP 11.5).
3. Coach action-tag strip (#1) — careful, mid-migration.
4. Verify #3 (tactic recognition) after a full analysis pass; fix if still 0%.
