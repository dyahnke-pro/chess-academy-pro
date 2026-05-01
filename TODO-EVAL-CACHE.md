# TODO — Pre-computed Eval Cache (parked)

**Status**: parked. Picked up briefly, reverted to focus on teaching surface polish first.
**Resume when**: teaching surface is stable and we want to attack lag / Lichess 401 fragility / Stockfish wall-time.

## What this is

A build-time JSON cache (`src/data/eval-cache.json`) holding Stockfish evals + Lichess masters frequencies for every position in the user's repertoire. Sub-millisecond lookup via a new `local_eval_book` tool, available globally to the brain (not just the teach surface). Falls through to the live `stockfish_eval` / `lichess_master_games` tools on miss.

Net effect when finished: most lesson positions return engine + master data instantly instead of paying the 500-2000ms tool call.

## Coverage budget

| Source | File | Count | Approx positions after walk |
|---|---|---|---|
| Main repertoires | `src/data/repertoire.json` | 40 openings + variations + trap/warning lines | ~2,000 |
| Pro-player repertoires | `src/data/pro-repertoires.json` | 80 openings × 14 players | ~2,000 |
| Gambits | `src/data/gambits.json` | ~60 | ~600 |
| Middlegame plans | `src/data/middlegame-plans.json` | ~100 critical FENs | 100 |
| **Total unique (after FEN dedup)** | — | — | **~4,500-5,500** |

Per-entry size: ~1.5KB (top-5 PV lines + top-10 master moves + opening name + ECO).
Total bundle hit: ~6-8MB raw / ~2-3MB gzipped. Acceptable for a PWA that gets cached on first install.

## Architecture (sketched in the parked branch)

### New files
- `src/data/eval-cache.json` — `{ version, stockfishDepth: 30, builtAt, entries: { [normalizedFen]: EvalCacheEntry } }`
- `src/services/evalCacheService.ts` — `getEvalCache(fen)`, `normalizeFenForCache(fen)`, `getCacheMetadata()`
- `src/coach/tools/cerebellum/localEvalBook.ts` — new `local_eval_book` tool, returns `{ hit, eval, bestMove, topLines, masterMoves, openingName, eco }` on hit; `{ hit: false }` on miss
- `scripts/build-eval-cache.ts` — build-time script (skeleton only; not yet implemented)

### Edits
- `src/coach/tools/registry.ts` — register `localEvalBookTool` in `COACH_TOOLS` (so it's in the toolbelt for ALL surfaces)
- `src/coach/sources/identity.ts` — OPERATOR rule #1 + #5 updated: "call `local_eval_book` first, fall through to `stockfish_eval` / `lichess_master_games` on miss"

### FEN normalization
Strip halfmove + fullmove fields (parts 5-6) before keying. Two paths to the same position dedupe to one cache entry. Castling rights and en-passant ARE kept — they materially change legal moves.

## Build script (Wave 2 — not yet written)

`scripts/build-eval-cache.ts`:

1. Walk every PGN in `repertoire.json` + `pro-repertoires.json` + `gambits.json` (main line + every variation + trap lines + warning lines), at every ply, extracting unique normalized FENs.
2. Add the `criticalPositionFen` from each `middlegame-plans.json` entry.
3. Dedup by FEN — expect ~4,500-5,500 unique.
4. For each FEN:
   - Fetch Lichess masters: `https://explorer.lichess.ovh/masters?fen=<FEN>` with our UA. Throttle to ~5 req/sec to stay polite. ~17 min total.
   - Run Stockfish at depth **30** (user requested deeper). Local Wasm is ~5-10s per position → **7-14 hours of compute**, OR run Lichess cloud-eval (`/api/lichess-cloud-eval`) at depth ~25 → **1.5-4 hours**.
   - Either parallelize via worker pool (target 6-8 concurrent) or run unattended overnight.
5. Write `src/data/eval-cache.json`. Vite bundles it.
6. Spot-check a sample of entries against live tool calls to verify the cache matches reality.

## Time estimate to ship end-to-end

- Wave 1 finish (build script + tests + verify hooks): ~2 hours dev
- Wave 2 compute (depth 30 Stockfish via worker pool): ~2-4 hours unattended
- Wave 2 Lichess fetch: ~17 min
- Verification + commit: ~1 hour

**Total: 1-2 days dev time + an unattended compute window.**

## Questions to resolve when picking it back up

1. **Depth 30 wall-time** — is the 2-4 hour unattended Stockfish run acceptable, or use Lichess cloud-eval (faster but depth ~25)?
2. **Cache invalidation** — do we ever update the cache, or is it deploy-time-only? (Probably deploy-time-only; chess theory doesn't change.)
3. **Bundle size** — 2-3MB gzipped is OK for PWA. If it pushes total bundle past a target, we could split per-color or per-ECO.
4. **Brain prompt** — once the cache is populated, OPERATOR rule should be tighter ("ALWAYS call local_eval_book first; only fall through on miss"). The text is sketched in the reverted identity.ts edits.
