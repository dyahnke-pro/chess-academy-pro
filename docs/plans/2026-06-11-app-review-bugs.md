# App Review — bug triage (2026-06-11, late-night review session)

David stress-tested prod and surfaced a cluster of issues across Weaknesses /
Insights, the Coach, and Game Review. Captured here so we fix them methodically
instead of one-screenshot-at-a-time (which at 3am is how a new bug gets shipped).

## ✅ Fixed + shipped to main tonight
- **Coach: chat text now matches the spoken narration.** The coach split its
  output — the `[VOICE:]` marker was spoken while the chat bubble showed the
  long teaching essay (so the student heard a summary, read an essay; felt like
  a 2nd LLM call wrote the text — it never was). Both Teach + Game-Review
  surfaces now DISPLAY the exact `[VOICE:]` content the voice speaks (fallback:
  the spoken first sentence). Long prose still drives board arrows only.
  (commit 16e2df6)
- **Coach: raw `[ACTION:...]` tag leak fixed (#1).** `sanitizeCoachText`'s
  single-bracket strip used `[^\]]*`, which stopped at a `]` INSIDE the JSON
  args (a moves array) and leaked the tail. Added a brace-aware `JSON_MARKUP_RE`
  + held the in-flight tag back during streaming; routed CoachChatPage's local
  strippers through the shared `stripCoachMarkup`. Regression tests added.
- **Coach: "Show me a Magnus Catalan" → "no game" fixed (#2).** REAL root
  cause (David: "magnus has played the catalan!! we have several"): the games
  ARE in `pro-game-references.json` — Carlsen has **7 Catalan wins** — but the
  build buckets every game by the player's REPERTOIRE TREE, so they're tagged
  `openingId: "queens-pawn"` with the actual opening in
  `variationLabel: "Catalan g3"`. A lookup by `openingId/Name="catalan"` only
  checked `openingId`, so it missed them. Fix: both the `lookup_player_games`
  tool AND the auto-injected `playerGames` envelope source now match the
  opening stem against `variationLabel`/`variation` too (excluding `"vs …"`
  labels = the player FACING it, not wielding it). Plus a model-games fallback
  for openings with truly zero references. Regression tests added. (The
  cleaner long-term fix is to relabel `openingId` honestly in
  `build-game-references.mjs` — logged as follow-up.)
- **Game Review: dead "N missed opportunities → Practice" button fixed (#6).**
  `ReviewSummaryCard`'s `onNavigateToMistakes` prop was never passed by
  `CoachGameReview`, so the onClick was `undefined`. Wired it to
  `/tactics/mistakes` (My Mistakes drill surface).
- **Game Review: mistakes now auto-enroll into puzzles on review (#5).** The
  bulk `analyzeGames` pipeline generates mistake puzzles inline per game, but a
  single-game REVIEW never did — so a game opened from the picker dropped its
  mistakes and David had to tap "add my mistakes to puzzles" by hand. Added a
  background, idempotent `generateMistakePuzzlesFromGame` call on review mount
  (per-game meta guard; self-analyzes with Stockfish when annotations missing).
- **Game Review: misleading "nothing new to drill" copy reworded (#7)** →
  "No new mistakes — already in your weaknesses".

## ✅ Fixed earlier tonight
- **Insights: "Endgame errors always 0".** `weaknessAnalyzer` had a *duplicate*
  ply-based `classifyPhase(moveIndex,totalMoves)` ("endgame = last 20 half-moves")
  diverging from the canonical MATERIAL-based `classifyPhase(fen,moveNumber)` the
  rest of the app uses. Deleted it; mistakes now classify off the reconstructed
  FEN. (commit c672d2b) — *existing games need re-analysis to relabel.*
- **Insights: insane CP-loss numbers** (Avg CP loss 5930cp, costliest −30569cp).
  Mate scores (huge sentinel evals) leaked into the cpLoss delta. Clamped cpLoss
  magnitude at 1000cp for stats. (commit 22f3245)

## 🔴 Open — remaining

### Insights / Weaknesses
3. **Tactic Recognition table all 0%** — VERIFIED WIRED CORRECTLY, not a code
   bug. `tacticTransferGap()` derives the puzzle column from `mistakePuzzles`
   first-try accuracy (0% until the student SOLVES some) and the in-game column
   from brilliant/great-tagged finds via `scanFoundTacticsByType()` (0% when
   there are no such finds — a very high bar). So "all 0%" reflects real data:
   missed tactics captured, none solved-as-puzzle yet, few/no brilliant finds.
   Re-check after a full analysis + a puzzle-solving session. *Possible future
   UX: the "In-game recognition" denominator (brilliant/great only) is harsh and
   reads as "you recognize 0%" — consider a softer recognition signal. Design
   change, not a bug — leave for David's call.*
4. **"Errors by phase" donut shows a tiny count** (e.g., 13) for 881 games — it's
   the curated/deduped mistake set, not raw error totals. Confirm that's intended
   vs. confusing copy. *(Copy/clarity — not yet touched.)*

All other items (#1, #2, #5, #6, #7) fixed — see the shipped list above.
