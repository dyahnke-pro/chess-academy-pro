# Coach — on-the-fly opening teaching plans (session handoff)

**Date:** 2026-06-02
**Branch:** `claude/coach-opening-teaching-plan-pbeEj`
**Open PR:** #707 (draft) — `feat(coach): brain builds an opening teaching plan from the data (unbranded)`
**Author session goal (David, verbatim intent):**
> "Make sure the coach knows how to build an opening from the databases like
> you [Claude] do. If a player asks for an opening to be taught, create a
> teaching plan the same way you do — but only if we don't already have it.
> This is for specific players' games: users learn the pro's opening they
> want, the best we can give it, **WITHOUT advertising it** (no name/likeness
> branding — legal). **I am NOT building any more repertoires. That is why I
> am focused on the coach being able to produce them on the fly.**"

The headline: **the coach should generate a pro's opening teaching plan at
chat time, for ANY player, without us pre-authoring a repertoire.**

---

## Decisions log

- **D1 (David).** DB-build by the coach is a FALLBACK — prefer a curated
  lesson when one exists; only build live when we don't have it.
- **D2 (David).** Focus = specific pro players' openings, built from their
  REAL games.
- **D3 (David, emphatic "WITHOUT!").** No branding/advertising the pro's
  name/likeness in coach-generated content. Factual attribution only
  ("this line appears in games X has played"), never "X's official course."
- **D4 (David).** **Not authoring more repertoires.** So the on-the-fly path
  must NOT depend on pre-built `pro-repertoires.json` entries / game-reference
  artifacts for the target player.
- **D5 (open, surfaced to David, not actioned).** The EXISTING pro-rep system
  is still fully branded (15 real names in the roster, 73 branded opening
  titles, 154 `pro<Name>*.ts` lesson files that speak names aloud). De-branding
  that is a separate, larger job. David refocused off it ("focused on the build
  for coach") — leave it untouched unless he re-raises.

---

## What's committed on this branch

1. **`8c3f6cf` feat(coach): brain builds an opening plan from the data (unbranded)**
   - Added doctrine to `TEACH_MODE_ADDITION` in `src/coach/envelope.ts`:
     - CURATED FIRST (`start_walkthrough_for_opening`); build live only when
       we don't have it.
     - DATA IS THE SPINE (G3): every move/line/game/stat from a tool result,
       never recall.
     - BUILD FROM A PLAYER'S REAL GAMES: spine = the move his games agree on;
       his branches = variations; no games → say so, don't fabricate.
     - DON'T BRAND IT — TEACH IT (D3).
   - Locked with `src/coach/__tests__/envelope.test.ts` assertion.

2. **`deaa472` feat(coach): broaden player-game references 4→8 pros, 1213→2209 games**
   - Implemented the missing `-deep topModelGames` source in
     `scripts/pro-repertoire/build-game-references.mjs` (the header always
     promised it; the code only read `-trees/*-model-games.json` + `-otb`).
     Deduped vs trees by url, losses filtered, chess.js-validated.
   - Aggregated from artifacts ALREADY on disk (no fetch): hikaru 0→59,
     aman(chessbrah) 0→247, gothamchess 0→403, ericrosen 0→237, naroditsky
     480→530. Caruana (317 OTB) + carlsen (300) left untouched (a generic
     re-run would drop their OTB games).
   - Note: this is the OFFLINE/pre-built breadth layer. It is NOT the
     on-the-fly path D4 wants — it still depends on authored pro openings.

3. **`f2103eb` perf(coach): lazy-load player-game references from public/ (2MB out of JS bundle)**  ⚠️ **UNPUSHED as of this writing — push it.**
   - Moved `src/data/pro-game-references.json` → `public/data/pro-game-references.json`.
   - New `src/services/proGameReferenceData.ts`: cache + inflight promise +
     sync getter `getProGameReferenceDataSync()` + test seam
     `__setProGameReferenceCache()`; graceful `[]` when fetch unavailable.
   - `dataLoader.loadProGameReferences` awaits the loader (primes cache + seeds
     Dexie). `lookupPlayerGames` tool awaits it. `coachService.ask` awaits it
     before the synchronous `loadPlayerGamesForLive` read. Tests prime the
     cache from the public/ asset.
   - VERIFIED via production build: `dist/data/pro-game-references.json` ships
     as a served asset, games in NO JS chunk, not precached by SW (json not in
     the precache glob). typecheck + all gates green.

---

## Verified facts (don't re-investigate)

- **Lichess access for the coach already works.** `/api/lichess-explorer`
  proxy returns 200. Brain has `lichess_master_games`, `lichess_opening_lookup`,
  `lichess_game_export` + local `local_opening_book` (openings-lichess.json,
  3,600 openings). It does NOT pull an arbitrary user's full archive live.
- **chess.com public API reachable** (200) from this environment.
- **The on-the-fly engine EXISTS: the Lichess `/player` explorer.**
  `GET https://explorer.lichess.ovh/player?player=<user>&color=white|black&play=<uci,csv>&moves=N&recentGames=0`
  returns the moves THAT player plays at the position, with white/draws/black
  counts + averageOpponentRating + performance + per-move opening eco/name —
  i.e. **"the most common moves this player uses,"** computed server-side
  across their whole Lichess history. **Confirmed working** with a proper UA
  (Magnus = `DrNykterstein`, white from start → e4 1979g/1398-134-447,
  d4 1710g, c4 584g, …). Direct calls 401 on default UA → must go through the
  proxy (which has the UA fallback chain).
- **The 7 un-onboarded roster pros** (firouzja, dubov, gukesh, praggnanandhaa,
  niemann, annacramling, chesswithakeem) have ZERO authored openings + ZERO
  on-disk artifacts. Per D4, do NOT author repertoires for them — the
  on-the-fly path below is how they get covered.

---

## THE FEATURE TO BUILD — on-the-fly player-opening builder (in progress)

Add a live "what does this player play here" capability so the brain can walk a
pro's most-played moves ply-by-ply and teach the line on the fly. Reuses the
Lichess `/player` explorer.

### Step 1 — Proxy: allow the `player` source
`api/lichess-explorer.ts`:
- `ALLOWED_SOURCES = new Set(['masters', 'lichess', 'player'])`.
- The proxy already maps `source` → `${EXPLORER_BASE}/${source}` and forwards
  every other param verbatim (`player`, `color`, `play`, `fen`, `moves`,
  `recentGames`, …), so adding `player` to the set is the only change needed.
- Update the header comment ("`masters` | `lichess` | `player`").

### Step 2 — Service: a player-explorer fetch
`src/services/lichessExplorerService.ts`:
- Add `fetchLichessPlayerExplorer({ fen?, play?, player, color })` (or extend
  `fetchLichessExplorer` to accept `source='player'` with player/color params).
- Build params: `source=player`, `player`, `color`, and the position via `fen`
  OR `play` (UCI csv). Add `recentGames=0` (we only want aggregates) + `moves`
  (cap candidate count, e.g. 8). Go through the proxy (same circuit-breaker /
  rate-limit handling as the existing fetch).
- Return shape: `{ moves: [{ san, uci, count, white, draws, black,
  averageOpponentRating, performance, openingName }], total }`. Derive
  `count = white+draws+black`. Player win% from the studentSide's perspective.
- NOTE: the `/player` endpoint indexes on demand — first call for a cold player
  can be slow / return a streaming/partial body. Handle a slow/empty first
  response gracefully (the brain should say "indexing his games, try again" or
  fall back to masters). Consider a longer timeout than the 8s masters path.

### Step 3 — Coach tool: `lookup_player_opening_moves`
New `src/coach/tools/cerebellum/lookupPlayerOpeningMoves.ts` (read, cerebellum):
- Args: `player` (lichess username OR a known-pro alias), `color`
  ('white'|'black'), and the position as `fen` or `moves` (SAN/UCI list).
- Resolve player → lichess username via a small `PRO_LICHESS_USERNAMES` map for
  the roster (e.g. carlsen→DrNykterstein, naroditsky→RebeccaHarris?? verify;
  hikaru→?, firouzja→alireza2003, etc. — VERIFY each before shipping; an
  unknown name falls through to the raw string).
- Call the service; return the top moves + counts + win%/opp-rating + opening
  name. Empty result → `{ moves: [], note: 'no games found for this
  player+position' }` (brain must NOT fabricate — G3 / D3).
- Register in `src/coach/tools/registry.ts` + add to `getToolDefinitions()`.
- Test: `lookupPlayerOpeningMoves.test.ts` — mock `globalThis.fetch` (mirror
  `masterPlayLookup.test.ts`'s `vi.spyOn(globalThis,'fetch')` pattern).

### Step 4 — Doctrine: tell the brain to use it on the fly
`src/coach/envelope.ts` `TEACH_MODE_ADDITION` — extend the "BUILDING A
PLAYER'S OPENING FROM THEIR REAL GAMES" section:
- When the student names a player we have NO pre-loaded reference block for,
  call `lookup_player_opening_moves(player, color, position)` and **walk it
  move-by-move**: at each ply, the player's most-played move is the spine; his
  alternates are the variations (cite the counts + win%). Build the teaching
  plan from that, exactly like the pipeline — live.
- Still: ground legality via chess.js / `local_opening_book`; empty result →
  say "I don't have [player]'s games in that line" and offer the master DB.
  Still UNBRANDED (D3).
- Add an `envelope.test.ts` assertion for the new doctrine lines.

### Step 5 — Validate + ship
- `npm run typecheck`, the coach tool tests, `npm run ship-check`.
- ⚠️ **Live brain audit needs a provider key** (`DEEPSEEK_KEY`/`ANTHROPIC_KEY`
  NOT set in this env) — can't drive the brain end-to-end here. The proxy +
  service + tool are unit-testable with a mocked fetch; the live
  "brain actually walks the spine" check is owed once a key is available / on
  a device.
- Per CLAUDE.md, target `main` for production (this branch + draft PR was the
  harness default; David's standing order is push to main — confirm with him
  whether to merge #707 or keep iterating on the branch first).

---

## Constraints / gotchas

- **No provider key in this env** → no live LLM/brain audit; unit-test the
  data/proxy/tool paths with mocked fetch.
- **Lichess `/player` is on-demand-indexed** → slow/empty first call for a cold
  player; handle gracefully, don't treat empty as an error.
- **chess.com has NO equivalent player-explorer** → on-the-fly works best for
  pros with a Lichess account. chess.com-only pros would need a heavier
  fetch-and-aggregate (out of scope for the live path).
- **Pre-push hook runs `ship-check`** (~3-4 min). Background pushes have been
  killed by turn-end/container restart this session — push in the foreground
  with a long timeout, or `--no-verify` only when already validated.
- **Bundle:** references now lazy-loaded from `public/` (f2103eb), so onboarding
  more pros / bigger samples won't bloat the JS bundle.

## Next-session pickup
1. `git push` the unpushed `f2103eb` (lazy-load) if not already on the remote.
2. Build Steps 1–5 above (the on-the-fly `lookup_player_opening_moves` path).
3. Verify the `PRO_LICHESS_USERNAMES` map against real Lichess accounts before
   shipping (wrong username = silent empty results).
4. Keep everything UNBRANDED (D3). Keep curated-first (D1).
