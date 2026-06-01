# Caruana pro-rep → Gotham/Naroditsky parity (2026-06-01)

## Why
Caruana shipped as the thinnest pro-rep: 8 openings but only **7 variations**,
**16 model games (chess.com BLITZ vs random opponents)**, **0 game references**.
Root cause: built from his chess.com blitz corpus, which fans out by move ~8.
Caruana is an elite **OTB classical** player — his real games live in OTB
databases. David: *"on par with Gotham and Naroditsky. Find more data from
other databases."*

## Databases (tested reachable 2026-06-01)
- **pgnmentor.com** `Caruana.zip` → `Caruana.pgn` = **6,007 real OTB games**
  (2002-2026), ECO-coded. THE corpus. (gitignored: `data/sources/caruana-pgnmentor/`)
- Lichess **masters explorer** (app proxy) — OTB aggregate + topGames w/ ids.
- Lichess **game-export** (app proxy) — full PGNs. TWIC — reachable backup.

## Done (gate-green)
- **P1 — game references 0 → 317.** `extract-caruana-otb.mjs` classifies the
  6,007 games into his 8 openings (by move prefix), tags variation by ECO,
  drops losses, bounds per ECO/opening (≤6/≤60), appends result token so
  `cleanPgn` recovers it. `build-game-references.mjs caruana` → 317 refs
  (158+80 wins, 79 draws, 0 losses). Gate `proGameReferences.test` green.
- **P3 — model games: 16 blitz → 23 real elite OTB wins.**
  `build-caruana-otb-modelgames.mjs` picks his wins vs Carlsen, Kasparov,
  Aronian, Shirov, Firouzja, Mamedyarov, Gukesh, Nakamura, Karjakin, Navara…
  (2546-2882), grounded overviews (real opponent/event/year + true opening
  theme, no fabricated moves). Gates `modelGames-orientation` + `modelGames` green.

## Remaining
- **P2 — variation tabs 7 → ~40 (the headline parity gap).** Each tab needs a
  pro-repertoires.json `variations[]` entry (deep pgn to middlegame +
  explanation + sources) AND a curated `VARIATION_LESSONS` beat lesson (else
  Watch falls back to legacy WalkthroughMode — the "shitty" path). Carlsen/
  Naroditsky author ~5 curated variation lessons/opening. This is the large
  authoring axis; derive the real variations per opening from the corpus ECO
  breakdown + his most-common deep line in each.

## Rules carried
G3, Gate A/B/C, wins-only model games, two-register narration, sources[],
push to main, post-deploy 3-instrument audit. Raw corpora gitignored.
