# Coach answers the GENERIC thing, not the SPECIFIC thing asked (David 2026-07-10)

Two reproducible failures from David's live testing. Same disease: the coach
resolves a specific ask to the generic grounded answer and loses the specificity.

## Bug 1 — "How does GothamChess play this line?" → coach couldn't answer
Root cause: `src/coach/sources/playerGames.ts::loadPlayerGamesForLive` selects
reference games by **opening only** (proOpeningId or detected opening name). The
**player named in the question is never parsed or filtered on**. So a "how does
<player> play this" ask can't scope to that player — it injects whatever games
match the current opening (all pros), or nothing.

Data IS present: `pro-repertoires.json` has `gothamchess` (Italian, London,
Stafford), and `public/data/pro-game-references.json` carries his refs.

### Fix
- Parse a player NAME from the ask; resolve to a `playerId` via the pro roster
  (`PLAYER_NAMES` reverse map) + an alias table (Gotham/Levy→gothamchess,
  Danya→naroditsky, Hikaru→hikaru, Magnus→carlsen, …).
- Thread the resolved `playerId` into `loadPlayerGamesForLive`; when set, filter
  matches to that player.
- If the named player has NO games in this line → honest "I don't have
  <Player>'s games in this line" (empty > wrong pro > invented). NEVER show a
  different pro's games for a named-player ask.
- `isPlayerGamesQuestion` already matches `how does <name> play`; the gap is
  purely the player-scoping in the source + a name→id resolver.

## Bug 2 — "Is Qf3 ok to play?" → coach just says "Nf3 is best"
Root cause: there is NO assembler that evaluates a **named candidate** move.
`assembleMoveEvalAnswer` only ever names the engine's BEST move. Any move
question (incl. one naming a specific move) resolves to "the best move is X".
Also `questionIntents` line 170 `is <SAN> (best|sound|good|…)` folds a named
move into the best-move intent, and "ok/okay/fine/alright/playable" aren't even
in its word list.

David's mandate (verbatim): *"Coach needs to evaluate the other moves against
database and stockfish."*

### Fix — `assembleCandidateMoveAnswer` (G0: all computed)
Detect "is Qf3 ok / can I play Qf3 / what about Qf3 / is Qf3 good|sound|playable|
a mistake|a blunder", extract the candidate SAN, then:
1. **Legality** (chess.js) — illegal → "Qf3 isn't legal here" (name why if easy).
2. **Is it the best?** candidate === bestMove → "Yes — Qf3 IS the best move" + the
   grounded why (`explainBestMoveGrounded`).
3. **Else Stockfish-evaluate the candidate**: eval the position AFTER Qf3, cp-loss
   vs best (reuse `stockfish_classify_move` / a post-move analyze). Tier the
   verdict off cp-loss: ≤~30cp "perfectly playable / equal", ≤~90 "playable but
   slightly worse", ≤~200 "an inaccuracy", >200 "a mistake/blunder — <concrete
   consequence>". Name the geometry cost via `describeMoveGeometry` where clean.
4. **Database frequency**: if masters/amateur explorer has the candidate, cite it
   ("masters play it ~8%") — grounds "is it a real move" independently of eval.
5. Voice a verdict ABOUT Qf3 (compared to best), never a bare "Nf3 is best".

Runtime plumbing: when the candidate intent fires, the pipeline applies the SAN,
Stockfish-evals the resulting FEN (the eval-bar cache often already holds child
positions), and passes {candidateSan, candidateEvalCp, bestEvalCp, bestMoveSan,
dbFreq} to the assembler. Zero LLM chess decisions — voiced via `voiceFacts`.

## Sequencing
1. Bug 2 first (David's explicit mandate; cleaner, more general — every "is X ok"
   question). New `assembleCandidateMoveAnswer` + `isCandidateMoveQuestion` +
   SAN extraction + runtime candidate-eval + dispatch branch BEFORE bestMove +
   tests.
2. Bug 1 — player-name resolver + player-scoped `loadPlayerGamesForLive` + honest
   empty + tests.
3. ship-check, push to main, pull audit-stream / `coach_answer` to verify the
   grounded verdicts fire (the new full-conversation capture makes this checkable).

## Non-negotiables carried in
G0/G3 (LLM decides zero chess — candidate eval + DB freq are computed), empty >
generic > invented (named-player miss = honest empty), voiceFacts chokepoint.
