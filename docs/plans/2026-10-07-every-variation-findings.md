# Every variation and tabia — checked on hard facts (2026-10-07)

David: "every variation and tabia needs to be checked." Instrument:
`scripts/audit-every-variation.mjs` (no sampling; writes
`audit-reports/every-variation.json`). It reads every line the app teaches —
43 masterclass openings, 86 pro repertoires, the anti-lines and the gambits —
and every middlegame/endgame plan.

## What it checks

| check | source of truth |
|---|---|
| legal | chess.js replays every move |
| real (masterclass) | each move is in the masters DB wherever the position is COMMON (≥50 master games); a thin position is not theory either way |
| real (pro) | each move is in the player's own game tree (`data/sources/<player>-trees`) |
| real (anti / gambit) | the position after 6 plies is a named Lichess position or a masters position — matched by POSITION, so a transposed move order counts |
| branches | a variation shares at least its first move with the main line (system openings meet different replies on move 2 on purpose) |
| middlegame | the same `reachesMiddlegame` metric the depth gate uses |
| sound (`--engine`) | the student is not worse than −1.0 at the end (gambit showcases are allowed and must be judged by hand) |
| plans | the plan names a live opening; its playable lines are legal from its own FEN. Plan↔line continuity is the pawn-skeleton gate's job (`middlegamePlanContinuity.test.ts`, 3 known open cases) — one definition, not two |

## Result (no engine)

864 lines, 578 plans. **0 illegal moves, 0 orphan plans, 0 illegal plan lines.**

The first run flagged 45 "cold" variations, 181 "disconnected" plans, 31
orphan plans and 33 ungrounded anti-lines. Almost all of that was the SCRIPT:
system openings legitimately branch on move 2, the orphans were plans for the
anti-lines and gambits it hadn't loaded, the continuity check duplicated an
existing gate with a stricter (wrong) definition, and the Lichess file is a
naming table, so a mainstream line in a different move order failed a
move-by-move match. Each was corrected in the script, never by editing data.

### Real defects (to fix with the opening swarm's findings)

1. **Philidor, Exchange Variation — 7…Nbd7.** Masters reached that position
   in 871 games and never played Nbd7 (they play Re8, 629). Rebuild the tail
   on the data spine, then re-author its narration (G3, data-rebuild doctrine).
2. **Benko, "Modern 5.f3 System" — the line does not match its name.** It
   plays 5.bxa6 … 7.f3 (0 master games in 1,066) instead of the real 5.f3.
   Rebuild as the actual 5.f3 line from the masters DB and re-author.
### Checked and cleared

- **Anti-Hippo (4 lines)** — flagged because 1.e3 e5 2.d3 d5 3.b3 Bd6 is in
  neither static DB. The amateur explorer has it: 5,214 games at ply 6, and
  White's moves are its top replies (Bb2 3,624; Nd2; Bg2 83 of 105; Ne2 539).
  Grounded in real games at the student's level, so kept. The script reads
  only the static DBs; an amateur-explorer pass belongs in the engine run.

### Known backlog (already tracked, not new)

- **9 short lines** (stop before the middlegame): all are in the depth gate's
  shrinking baseline — Naroditsky Caro-Kann Exchange + Advance, Rossolimo
  e6, Fantasy Caro (main + 2), and 3 anti-lines. Extend from the player's
  trees.

### Need a ruling, not a fix

- **4 King's Indian Attack variations** start on a different first move from
  the main line (vs French / Caro / Fischer / e5 wedge). They are reached by
  transposition; the main line itself starts 1.e4. Fine to keep; the tab
  should not imply they branch from the main line's moves.
- **31 pro lines go past the player's own games** (e.g. all 4 GothamChess
  London lines: no tree data matches). Per the instructional-content
  doctrine a TAUGHT line is valid, but it must be labelled "taught, not from
  their own games" — the data has no field for that today.

## Next

- Engine soundness run (`--engine`) — paused while the push checks ran
  (CPU contention timed out two heavy content gates). Restart when the
  machine is quiet.
- Make the script a ship-check gate once the defects above are fixed, with
  the honest backlog as a shrinking baseline.
