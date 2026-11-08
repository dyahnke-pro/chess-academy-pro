# WO-ALL-SECTION-DEPTH — progress (branch `all-depth`)

David 2026-11-08: "Stockfish's best moves fill the main line past the data floor; club games give the variations."

## Step 1 — code (done)
- `gamesCourse.buildGamesCourse`: two REQUIRED options. `variations` (the variations' games, with their source) and `engine` (Stockfish's moves past where the main line's games run out, or null). The main line walks the stored trees, then plays the engine's moves to the middlegame (`playEngineOn`, legal moves only, `engineFrom` marks the first). Variations: every split along the main line (engine plies included), on the stored trees then club games (`deepTree.variationTreeAnswer`). A named line whose own board is thin no longer returns early: the engine carries it and club games give its variations (the Paris Gambit shape). A vetoed main line is demoted to a variation of its games' moves only.
- Wording, one source: `gamesEndLine` ("The games run out after 3.b4. From 3…Bg7 on, the line is the engine's best play for both sides." on the page; "The games run out here. From this move on, …" spoken on the engine's first move in the lesson, `generatedLesson.withGamesEnd`, REQUIRED `gamesEnd` on every generated lesson via `engineFromOnLine`). Variation shares said by source (`SHARE_WHO`: masters / strong online players (2200+) / club players rated 1200–1999) — the old text called strong-online splits "Masters".
- Readers: `clubTree.ts` (`/data/club-tree/<2 hex>.json`, move-order keyed, 256 shards), `engineLine.ts` (`/data/engine-lines/<1 hex>.json`, board keyed, UCI). Both LOOKUP prefixes (never kept on the phone), versioned as directories, own SW caches.
- Tests: `gamesCourse.test.ts` (+7), `generatedLesson.test.ts` (+2).

## Step 2 — engine lines (running)
- 2,001 distinct thin boards (`ALL_DEPTH_TERMINI`), `scripts/all-openings/build-engine-lines.mjs`, depth 15, 2 shards, ~2 s/board. Cap: 24 engine plies / 32 plies in all (offbeat lines often keep a king uncastled under best play).
- DONE: 2,001 boards, 1,915 lines (86 had no room under the cap), 26,545 plies, 251 KB in 16 files (`public/data/engine-lines/`). 1,223 of 1,915 end on a middlegame board; the rest stop at the cap with a king still uncastled under best play. Fixed at the producer on read: 110 capped lines stopped with an exchange half-played (…Bxh5 Bxh5, …Rxh5 to come) — the engine now plays on to finish an exchange (≤ 6 plies); the 110 re-run matched their old prefix exactly (deterministic search) and none ends mid-exchange.

## Step 3 — club index (done)
- `ALL_DEPTH_CLUB_INDEX` builds every page with the page's options over the raw club tree (four months, 1200–1999) and keeps the boards its variations read: 1,533 boards, 149 KB in 256 shards (`public/data/club-tree/`), each row its totals + the four most played + every move at 8%+ (lossless for the walk and the split bar).
- The plan's "Paris Gambit: 6,281 club games" does not hold on disk: 'Nh3 d5 g3 e5 f4' has 5 club games a month (below the tree's 20 floor) and the King's Gambit Paris Gambit none. The Paris Gambit now builds an engine main line with no variation (nothing to split on); the Polish Grigorian (b4 Nc6, 994 club games) is the club-variations case.
- The "engine from here" note is said only on a stretch of the main line (`engineFromOnLine`): a derived line (variation, reply, plan, trap) keeps its board — a fact about a board games reached — but its own moves are games', so the note would lie.
- Tests: `allSectionDepth.real.test.ts` (8, on the shipped files: Paris Gambit + Grigorian fail on the old builder; every engine move legal from its board and no line runs past a middlegame board; every club row legal, 20+ games, most played first).
