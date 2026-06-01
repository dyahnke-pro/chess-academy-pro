# Samay Raina → Naroditsky/Gotham parity (2026-06-01)

David: *"more data from more databases. on par with Gotham and naraditski."*
Decision (2026-06-01): **data-rebuild ALL mismatched spines to full parity**
(Naroditsky-style data-mirror), then re-author lessons/variations/plans/
models/pitfalls on the corrected lines.

## CORRECTION (2026-06-01) — only the BLACK spines are wrong

Re-verified against the ACTUAL repertoire main pgns (not the stale tree
minPrefix). The WHITE openings ARE data-faithful — earlier "wrong" claims for
caro/french/open-sicilian were a prefix artifact:
- open-sicilian 90 games @10ply · ruy 82 @8ply · caro-white 275 @6ply (main IS
  2.c4) · french-white 154 @6ply (main IS the Exchange) · italian 106 @6ply. ✅

Only the two BLACK spines genuinely mismatch his play → REBUILD those:
- **sicilian-black**: Najdorf …d6 (2 games) → his …Nc6/…e5 Sveshnikov + …a6.
- **open-e5**: Ruy-response …Bb5 (8 games) → his Italian (faces Bc4 66 > Bb5 35).

For the other 6 (white + scandi): spines are fine → the parity work is DEPTH
(plans/tabs/models/pitfalls), NOT a spine rebuild. (Don't fix what isn't broken.)

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

## TURNKEY REBUILD SPECS (data-derived, game counts in parens)

### sicilian-black (rebuild main + ALL variations — current main+vars are
theory-default, 0–3 games each)
- **MAIN — Open Sicilian …Nc6/…e5 (Kalashnikov)** [697g]:
  `e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 e5 Nxc6 bxc6 Nc3 Nf6 Bg5 Bb4` (…h6/…O-O)
- **vs Bc4 (Bowdler, his #1 anti-Sic, 626g):** `e4 c5 Bc4 e6 Nf3 d5 exd5 exd5
  Bb5+ Nc6 O-O Nf6 Re1+ Be7 Nc3 O-O d3`
- **vs Alapin 2.c3 (332g) — …d5 (not …Nf6):** `e4 c5 c3 d5 exd5 Qxd5 d4 Nf6
  Nf3 Bg4 Be2 e6 O-O Be7 h3 Bh5`
- **vs Rossolimo Bb5 (214g) — …Nd4:** `e4 c5 Nf3 Nc6 Bb5 Nd4 Nxd4 cxd4 O-O e5
  c3 Bc5 cxd4 Bxd4 Nc3 Nf6`
- **vs Closed Nc3 (555g):** `e4 c5 Nc3 Nc6 Nf3 e6 d4 cxd4 Nxd4 Bc5 Nxc6 bxc6
  Bd3 d5 exd5 cxd5 O-O`

### open-e5 (rebuild — make Italian the MAIN; he's an …e5 player, 428g total)
- **MAIN — vs Italian Bc4 (66g):** `e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Bc5 …` (Giuoco/
  Two Knights, …Nf6 then …Bc5)
- **vs Ruy Bb5 (35g) — Bird's …Nd4:** `e4 e5 Nf3 Nc6 Bb5 Nd4 Nxd4 exd4 d3 a6
  Bc4 b5 Bb3 Bc5 O-O Nf6`
- **vs Scotch d4 (15g):** `e4 e5 Nf3 Nc6 d4 exd4 Nxd4 …`
- **vs Four Knights Nc3 (18g):** `e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 d6 d4 …`

### MISSING WEAPON — King's Gambit (white vs e5, 824 games — his 2nd-most!)
Consider a NEW opening `pro-samayraina-kings-gambit`: `e4 e5 f4 …` — he plays
it 824 times. Currently absent entirely.

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

## SESSION RESULT (2026-06-01)

DONE (committed + pushed, each atomic + gate-green):
- **sicilian-black REBUILT** — main → …e5 Kalashnikov (697g) + all 4 variations
  → his real responses (Bc4 626g, Alapin …d5 332g, Rossolimo …Nd4 214g, Closed
  555g). Old Najdorf (≈2g) scrapped.
- **open-e5 REBUILT** — main → Italian Pianissimo (he faces Bc4 most); Ruy
  demoted to a variation.
- **King's Gambit ADDED** — his missing 824-game weapon (Bishop's Gambit + KGD
  + Falkbeer), new opening + lessons + entry + tab-plan resolver + index reg.
- **Plans 11→14** — data-grounded main breaks for the 3 rebuilt openings.
- **Model games 24→41** — real-win pulls, ~6/opening (near Naroditsky 49).
- **Pitfalls 10→14** — tactically-verified / textbook-documented only.

HONEST CEILING (the doctrine forbids fabrication):
- Deeper per-variation **plans** can't be data-grounded — his 22k corpus thins
  past the opening (vs Naroditsky's 140k); beyond the main breaks there aren't
  ≥5-game continuations. Endgame plans stay at 3 (clean teachable games only;
  ruy/open-e5/scandi candidates are blitz-scrappy/opponent-blunder → self-hide).
- More **pitfalls/gems** need engine verification — no native Stockfish here;
  route to `mine-punish-gems.yml` CI per doctrine.
- Naroditsky's literal 81 plans / 48 pitfalls / 53 tabs are NOT honestly
  reachable from Samay's smaller corpus without inventing. The data-faithful
  spines (the real defect) + near-parity models ARE done.

PRE-EXISTING, NOT SAMAY: `proRepTabPlanCoverage` red on 4 `pro-caruana-*`
variations (another build's missing resolvers); left untouched.
