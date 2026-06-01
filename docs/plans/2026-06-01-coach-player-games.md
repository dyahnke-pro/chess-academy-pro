# PLAN — Coach full access to player games (game-reference layer)

> Started 2026-06-01. Request (David): "update memory for coach with
> recent tournament games (past two years); make sure all repertoire
> builds are saving game data for references; coach should have full
> access to player games for teaching and walkthroughs."
>
> Decisions (David, 2026-06-01):
> - **Source = BOTH** — real OTB tournament games where they exist
>   (classical players), refreshed chess.com corpus otherwise (streamers).
> - **Scope this session = mechanism + pilot ONE player (Naroditsky),
>   then roll out.**
> - **Coach access = bundled bounded reference (offline/fast) + a
>   lookup tool over it; live deep-corpus fetch is a rollout follow-up.**
>   (Size confirmed shippable: ~70–220 KB/player stripped; full raw
>   corpus ~500 MB/player stays out of the bundle.)

## The gap (mapped 2026-06-01)

- Pipeline (`scripts/pro-repertoire/*`) fetches the player's chess.com
  corpus into **gitignored** `data/sources/<player>-chesscom/` and
  throws it away after the build. The `-trees/` and `-deep/` artifacts
  ARE committed (carry real per-variation model-game PGNs), but nothing
  loads them at runtime.
- The coach's only per-player game grounding is `src/data/model-games.json`
  (~352 games, capped to **2 games / 25-ply preview** per call via
  `src/coach/sources/modelGames.ts`). There is **no** per-player game
  corpus the coach can reference for "how does Naroditsky actually play
  this line."
- `model-games.json` has **no Dexie reconciliation** (loaded once; edits
  don't reach seeded devices) — a pre-existing bug we fix here.
- No OTB / tournament source exists at all (chess.com online only).

## Architecture

### Data artifact (committed, bounded)
`src/data/pro-game-references.json` — flat array, mirrors model-games
shape for easy Dexie keying. Per game:
`{ id, playerId, openingId, proOpeningId, variation, white, black,
result, studentSide, opponentRating, date, source ("chess.com"|"otb"|
"lichess"), url, eco, plyCount, pgn (stripped SAN, moves only) }`.
Bounded: top N games per (player, variation). Stripped PGN keeps it small.

### Pipeline (so EVERY future build saves references)
1. `fetch-chesscom.mjs` — add `--since YYYY-MM` / `--years N` date filter
   (default unchanged) so "past two years" is one flag.
2. `fetch-otb-games.mjs` — NEW. Pulls real OTB tournament PGNs (lichess
   broadcasts + game-export proxy; accepts a TWIC/PGN URL) into the same
   JSONL shape with `source:"otb"`. Used on rollout for classical players.
3. `build-game-references.mjs <player>` — NEW. Reads committed
   `-trees/` + `-deep/` (+ any fresh chess.com/OTB games), emits the
   bounded per-player slice into `pro-game-references.json` (merge +
   dedup + studentSide tag + source tag). **This is the "save game data
   for references" step every build runs.**

### Runtime
- Dexie **v29**: `proGameReferences: 'id, playerId, openingId, proOpeningId, variation'`.
- `dataLoader.ts`: `PRO_GAME_REF_REVISION` + `loadProGameReferences()` +
  `reconcileProGameReferences()` (bulkPut + G8 orphan delete). ALSO add
  `MODEL_GAMES_REVISION` + orphan-aware model-games reconcile (fix the gap).
- `proGameReferenceService.ts`: query by opening / proOpening / player.

### Coach access
- `src/coach/sources/playerGames.ts` → `loadPlayerGamesForLive(...)`.
  Reads the shipped reference synchronously (like modelGames.ts), returns
  a bounded set (≤4 games, ≤~40 plies, opponent/rating/result/source),
  never a student loss. New `LivePlayerGamesContext` type +
  `LiveState.playerGames` + envelope `formatPlayerGamesSubBlock`. Wired
  into `coachService.ask` (gated on opening signal).
- `lookup_player_games` cerebellum tool — deterministic read over the
  reference, surfaces MORE than the auto-inject (all games for the
  opening). Live chess.com/OTB fetch = rollout follow-up.

### Gates / audits
- `proGameReferences.test.ts` (chess.js-legal PGNs, bounded counts,
  studentSide never losing, resolvable source, unique ids).
- `playerGames.test.ts` (source loader).
- `audit-coach-player-games.mjs` (envelope carries the block on a pro
  opening; tool registered) → add to matrix + AUDIT_INDEX.

### Doctrine
CLAUDE.md G9.2: add STEP "build + commit game references"; golden rule
"every repertoire build persists its game references." Bump revisions.

## Phases
- [x] P1 — pipeline: chesscom `--since`/`--years`, `fetch-otb-games.mjs` (lichess broadcast + pgn-url), `build-game-references.mjs`
- [x] P2 — produced `pro-game-references.json` for Naroditsky (480 wins, 473 KB)
- [x] P3 — Dexie v29 (`proGameReferences`) + dataLoader load/prune (+ model-games orphan-prune fix) + `proGameReferenceService`
- [x] P4 — coach grounding source (`playerGames.ts`) + `LivePlayerGamesContext` + envelope block + wired into `coachService.ask`
- [x] P5 — `lookup_player_games` cerebellum tool + registry (toolbelt 23→24)
- [x] P6 — tests (proGameReferences/playerGames/lookupPlayerGames, envelope+db count) + `audit-coach-player-games.mjs` + matrix/index
- [ ] P7 — ship-check → push to main → 3-instrument audit (in progress)
- [x] P8 — doctrine update: CLAUDE.md STEP 11.5 + golden rule #11 + STEP 15 gate list + matrix
- [ ] ROLLOUT — remaining players (gotham/hikaru/imrosen committed trees/deep → run `build-game-references.mjs <id>`; classical players need OTB fetch + `--years 2` chess.com refresh)

## Next-session pickup
Pilot proves the mechanism end-to-end on Naroditsky. Rollout = run
`build-game-references.mjs <player>` per pro (after a `--years 2`
chess.com refresh and, for classical players, an `fetch-otb-games.mjs`
pull), append to the JSON, bump `PRO_GAME_REF_REVISION`, re-audit.
