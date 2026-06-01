# Samay Raina → Naroditsky/Gotham parity (2026-06-01)

David: *"more data from more databases. on par with Gotham and naraditski."*
Decision (2026-06-01): **data-rebuild ALL mismatched spines to full parity**
(Naroditsky-style data-mirror), then re-author lessons/variations/plans/
models/pitfalls on the corrected lines.

## Root cause — NOT a data problem

His 22k chess.com games are plenty (sicilian 5,754 · open-sic 1,463 · ruy/e5
2,435 · etc.). lichess adds only ~259 (pulled, marginal). The real defect:
**the original build picked THEORY-DEFAULT main lines, not his most-played
ones** — a G9.1 violation. Data-faithful modal spines (from
`scripts/pro-repertoire/samay-modal-line.mjs`):

| Opening (id) | Repertoire NOW (wrong) | His DATA modal line | action |
|---|---|---|---|
| caro-white | 2.d4 3.Nc3 (2 games) | **2.c4** `e4 c6 c4 d5 exd5 cxd5 cxd5 Qxd5 Nc3 Qd8 Nf3 Nf6 d4 Bg4 Be2 e6` | REBUILD |
| french-white | 3.Nc3 (3 games) | **3.exd5 Exchange+c4** `e4 e6 d4 d5 exd5 exd5 c4 Nf6 Nc3 Bb4 Nf3 O-O Bd3` | REBUILD |
| sicilian-black | Najdorf …d6 (~2 games) | **…Nc6/…e5 Sveshnikov** `e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 e5 Nxc6 bxc6 Nc3 Nf6 Bg5 Bb4` | REBUILD |
| open-sicilian | anti-Najdorf | faces **…Nc6 Sveshnikov** most (Nb5 d6 N1c3 a6 Na3 b5 Nd5) | REBUILD main |
| open-e5 | (check) | faces **Italian Bc4** most `Nf3 Nc6 Bc4 Nf6 d3 …Bc5` Pianissimo | REBUILD/verify |
| ruy (white e5) | Closed Ruy …d6 | Closed Ruy …O-O/…d5 (Marshall) — **AND f4 King's Gambit = 824 games, a MISSING weapon** | extend + add KG |
| scandi | …Qd8 modern | …Qd8 modern | ✅ keep (close) |
| italian (white, Pianissimo d3) | — | likely faithful — verify | verify |

NB King's Gambit (f4) is his 2nd-most White vs e5 (824) — a whole opening
missing from his repertoire; consider adding as a new opening.

## Parity targets (per-layer, vs Naroditsky 81 plans/53 tabs/49 models)

tabs 20→~40 · model games 24→~45 · **middlegame plans 8→~45** · pitfalls
10→~30 · game refs 116 (done) · gems 25 confirmed (done).

## Pipeline (per opening, atomic commit, gate-green)

1. derive data spine (`samay-modal-line.mjs <color> <seed…>`), extend to a
   middlegame terminus while ≥~5 games stay on path
2. identify real variations from the branch table (the moves opponents throw)
3. rebuild `pro-repertoires.json` entry (pgn, variations, eco, overview,
   keyIdeas, sources)
4. re-author LESSON main+variations (`proSamayRaina<O>.ts` / `…Variations.ts`)
   — two registers, arrows/highlights, sources, board-verified
5. middlegame plans from `samay-middlegame-patterns.mjs` (≥10% clusters)
6. model games (`pick-model-games.mjs`, MIN_OPP_RATING=1600) — real wins
7. pitfalls (engine-verify eval-dependent ones via CI)
8. bump `PRO_DATA_REVISION`; gates: proRepLessonCoverage, variationMiddlegame
   Depth, proRepNarrationVoice, proRepNarrationAccuracy, middlegamePlanThemes,
   modelGames(-orientation), pro-repertoires(-orientation), commonMistake; +
   `npm run ship-check`

## Tooling built this session
- `scripts/pro-repertoire/fetch-lichess.mjs` — lichess corpus → chesscom shape
- `scripts/pro-repertoire/samay-modal-line.mjs` — data-faithful spine + branch table
- `scripts/pro-repertoire/samay-middlegame-patterns.mjs` — middlegame plan clusters
- `scripts/pro-repertoire/samay-middlegame-patterns.mjs` + `pick-samay-endgame-game.mjs`

## Status / order
P1 data ✅ · P2 spines captured ✅ · P3 rebuild per opening — IN PROGRESS.
Order (worst first): caro-white → french-white → sicilian-black → open-sicilian
→ open-e5 → ruy(+King's Gambit) → italian(verify) → scandi(keep).
Each opening committed atomically; repertoire never left in a broken state
(un-rebuilt openings keep their current working lines until their turn).
