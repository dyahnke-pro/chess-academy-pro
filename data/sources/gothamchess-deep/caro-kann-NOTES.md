# GothamChess Caro-Kann — STEP 4 data fingerprint (2026-05-29)

Source: 31,994-game chess.com archive. Plan/endgame counts run across the
WIDER corpus (full prefix match, not terminus games) per doctrine STEP 4.
Player as BLACK. These counts gate how many plans/endgames to author —
build what the data shows, no fabrication.

Root: 1,944 Caro games, 63.2%.

## Variations to build (≥30g, structurally distinct)
| Variation | Games | Terminus | MG plan clusters (≥10% @ ply12) | Endgame types (≥10%) |
|---|---|---|---|---|
| Advance …Bf5 (main, h4 spine) | 268 | move 9 | (see deep JSON) | — |
| Two Knights + Réti (Nc3/Nf3, MERGE) | 602 | move 11 | e6 (22%), Nf6 (11%) | — |
| Exchange (3.exd5) | 241 | move 8 | Bg7 (19%), Nh6 (15%), g6 (11%), Be6 (10%) | — |
| Advance …c5 (Botvinnik-Carls) | 124 | move 7 | e6 (17%), Ne7 (15%), Bg4 (10%), Nc6 (10%) | — |
| Classical (3.Nc3 dxe4) | 103 | move 10 | Bd6 (31% dominant) | — |
| Panov (4.c4) | 74 | move 9 | (see deep JSON) | R+min+P (30%) |
| Fantasy (3.f3) | 70 | move 8 | Nd7 (24%) | R+min+P (31%), Q+P (17%) |
| d3 sideline (2.d3) | 71 | move 7 | (see deep JSON) | R+min+P (20%), Q+P (16%) |
| ~~Modern transposition (2…g6)~~ | 8 | — | DROP (<30g) |

Notes:
- Two Knights (2.Nc3) and Réti (2.Nf3) transpose to the identical
  …Bg4xf3 structure (same continuation in the data) → ONE merged tab,
  not two near-duplicates (structural-distinctness rule).
- Endgame counts: most variations carry a real R+minor+P endgame (20-31%)
  + a Q+P endgame (15-23%) → author those where ≥10%. Many games also
  stay middlegame (Q+pieces 30-40%) — that's expected, not a gap.
- MG plan clusters above are the ≥10% candidates; full per-ply choice
  data + the model-game PGNs are in `caro-kann-<variation>.json`.

## Best-opponent model-game candidates (from tree bestUrls)
- vs GMHikaruOnTwitch 3032 — Caro Exchange (Gotham WIN as Black)
- vs SatoruGojoUltra 3293, fastestmindalive 2997 — Réti/Two Knights
  (verify result = Black win before using; model games = wins only)

## Authoring status
- [x] STEP 1-4 data layer complete (tree + deep-build + plan/endgame counts)
- [ ] STEP 5 voice corpus URLs
- [ ] STEP 6-7 lesson skeletons (TODO narration) + register
- [ ] STEP 8 pro-repertoires.json rebuild (8 tabs)
- [ ] STEP 9-10 middlegame + endgame plans (hand-authored, anchored past terminus)
- [ ] STEP 1a/11/12 trap mining + pitfalls + model games (wins only)
- [ ] STEP 12.5-16 tab routing, revision bump, ship-check, audit
