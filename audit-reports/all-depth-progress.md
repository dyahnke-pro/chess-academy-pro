# WO-ALL-SECTION-DEPTH — progress (branch `all-depth`)

David 2026-11-08: "Stockfish's best moves fill the main line past the data floor; club games give the variations."

## Step 1 — code (done)
- `gamesCourse.buildGamesCourse`: two REQUIRED options. `variations` (the variations' games, with their source) and `engine` (Stockfish's moves past where the main line's games run out, or null). The main line walks the stored trees, then plays the engine's moves to the middlegame (`playEngineOn`, legal moves only, `engineFrom` marks the first). Variations: every split along the main line (engine plies included), on the stored trees then club games (`deepTree.variationTreeAnswer`). A named line whose own board is thin no longer returns early: the engine carries it and club games give its variations (the Paris Gambit shape). A vetoed main line is demoted to a variation of its games' moves only.
- Wording, one source: `gamesEndLine` ("The games run out after 3.b4. From 3…Bg7 on, the line is the engine's best play for both sides." on the page; "The games run out here. From this move on, …" spoken on the engine's first move in the lesson, `generatedLesson.withGamesEnd`, REQUIRED `gamesEnd` on every generated lesson via `engineFromOnLine`). Variation shares said by source (`SHARE_WHO`: masters / strong online players (2200+) / club players rated 1200–1999) — the old text called strong-online splits "Masters".
- Readers: `clubTree.ts` (`/data/club-tree/<2 hex>.json`, move-order keyed, 256 shards), `engineLine.ts` (`/data/engine-lines/<1 hex>.json`, board keyed, UCI). Both LOOKUP prefixes (never kept on the phone), versioned as directories, own SW caches.
- Tests: `gamesCourse.test.ts` (+7), `generatedLesson.test.ts` (+2).

## Step 2 — engine lines (running)
- 2,001 distinct thin boards (`ALL_DEPTH_TERMINI`), `scripts/all-openings/build-engine-lines.mjs`, depth 15, 2 shards, ~2 s/board. Cap: 24 engine plies / 32 plies in all (offbeat lines often keep a king uncastled under best play).
