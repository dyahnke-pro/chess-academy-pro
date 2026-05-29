# PLAN — Masterclass DATA-REBUILD (2026-05-29)

> Doctrine: `docs/plans/2026-05-29-masterclass-data-rebuild-doctrine.md` (READ FIRST).
> Prior plans archived in docs/plans/. Gambit punish-gems shipped (separate, done).

## What this is
Rebuild all 42 masterclass openings so every lesson spine is **chosen by the
data** (most-played-while-common from the masters/Lichess explorer), not
authored by hand — the pro-rep deep-build doctrine applied to the masterclass
set. Only change vs pro-rep: spine source = masters DB instead of one player's
games. Proven on the Italian pilot (old lesson died move 18 / 1 game; data
line move 20 / 97 games).

## Engine + tools (committed)
- `scripts/build-opening-spine.mjs <id> "<seed>"` — data spine + per-ply counts
  + branch points. Floors COMMON=60 / LOWFLOOR=8 / MIDGAME_PLY=20.
- `scripts/diagnose-lesson-tails.mjs` — ranks lessons by tail overhang (the
  "which lessons are over-extended" report).

## Nonnegotiables (David)
- Every opening REACHES the middlegame (spine mandatory-extends along
  most-played, never to 0). `lessonDepth` gate → "reachedMiddlegame via data".
- Narrations change (re-authored on the data spine). Middlegame ideas change.
- TRAPS stay the same (data unchanged; re-verify they still SURFACE per tab).
- No cut corners. No invented moves. Show-your-work (every move traceable to a
  script's stdout). Traps mined not authored. Narration fact-checked.

## Rollout status (waves in the doctrine §SCOPE)
- [x] Method proven (Italian pilot) + spine engine + diagnostic + doctrine
- [ ] lessonDepth gate → reachedMiddlegame
- [ ] Wave 0: italian-game full rebuild (the template)
- [ ] Wave 1: caro-kann, ruy-lopez, french-defence, scotch-game, vienna-game,
      four-knights-game, petrov-defence, two-knights-defence,
      scandinavian-defence, philidor-defence
- [ ] Wave 2: najdorf, dragon, sveshnikov, alapin, nimzo-indian, KID, grunfeld,
      queens-indian, qgd, qga, slav, semi-slav, catalan
- [ ] Wave 3: london, KIA, reti, english, trompowsky, birds, dutch, benoni,
      old-indian, alekhine, pirc, queens-gambit
- [ ] Wave 4 (sharp gambits): kings-gambit, evans, benko, budapest, albin,
      schliemann

## Per-opening done = doctrine §PER-OPENING DEFINITION OF DONE.
