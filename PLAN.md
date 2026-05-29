# PLAN — Gambit-tab punish-gem mining (2026-05-29)

> Prior weakness-engine plan archived →
> `docs/plans/2026-05-27-weakness-engine.md`.

David: mine traps for **every gambit-tab opening, every variation**. Best
lines (student) vs the AMATEUR explorer (opponent) — find the natural-looking
developing moves the opponent plays that best play refutes. WLPP style; the
line plays out until the full punishment is shown on the board; then
hand-authored full + short narration synced with the verbosity/settings
contract (G5).

## The doctrine (CLAUDE.md PUNISH-GEMS DOCTRINE)

Engine-first, refute with the best move, grade at the quiet end of a
best-play-both-sides playout, tier by material reality, theory-verify before
shipping, narrate two registers with sources. Separate lane: gambit gems live
in `src/data/gambit-punish-gems.json` + `gambitGemNarration.ts`, never touch
the masterclass `punish-gems.json`.

## Environment (this container)

- Stockfish 16 installed via `apt-get install stockfish` -> `/usr/games/stockfish`.
- Explorer proxy `/api/lichess-explorer` returns 200 — mine locally, no CI hop.
- `npm install` needed (fresh clone had no node_modules).

## The 12 gambits

kings-gambit (W, 12 mined / 4 narrated already), evans-gambit (W),
scotch-gambit (W), vienna-gambit (W), danish-gambit (W), smith-morra (W),
stafford (B), marshall-attack (B), englund (B), budapest (B),
albin-countergambit (B), benko (B).

## Phases

- **P1 — Mine all 12** with the engine. [status: running]
- **P2 — Theory-verify each mined gem.** Drop engine over-ratings of normal
  developing moves / main-line theory. Keep only real refutations.
- **P3 — Hand-author narration** in `gambitGemNarration.ts`: `watch[]` (full,
  length-matched, '' through book setup), `learn[]` (<=8-word cue at student
  moves), `sources[]`. Verify each line against its own move + position.
- **P4 — Update the gate.** `gambitGems.test.ts` hardcodes a KG-only surfaced-
  count assertion; generalize to per-opening.
- **P5 — Verify WLPP + verbosity.** Gems route getPunishGemsForTab ->
  gemToPlayableLine -> PlayableLinePlayer (Watch=full, Learn=short, Practice=
  silent, Play=locked). Confirm play-out reaches the punishment on the board.
- **P6 — ship-check + push to main + 3-instrument audit** (G1).

## Decisions log
- 2026-05-29: Separate-lane held — gambit gems never mix with masterclass gems.
- 2026-05-29: Tier bar unchanged — only confirmed + positional surface; a gem
  also needs hand-authored narration to surface.

## Next-session pickup
Mine log `/tmp/mine-gambits.log`. Pre-mine backup `/tmp/gambit-gems-backup.json`.
