# Novel Openings — rare moves Stockfish rates sound

> **Full machine-readable data log:** [`docs/novel-openings-2026-06-16-data.json`](./novel-openings-2026-06-16-data.json)
> — every labeled candidate with FEN, full PGN, ECO, evals, frequencies, and the scan trace.
> Source script: `scripts/find-novel-openings.mjs` · regenerate: `node scripts/find-novel-openings.mjs 4000 8000`.

_Generated 2026-06-16T00:01:13.073Z · Stockfish 18 (depth ~30 verify) × Lichess masters/strong-amateur explorer._

## Method
For ~63 opening tabiyas (both colors): Stockfish MultiPV-6 nominates the engine's
top moves at each branch; each is cross-referenced against real human play-frequency
in the Lichess masters DB. A candidate = an engine **near-best** move (≤0.30 cp drop)
that is **sound** for the side but **rarely played** (<5%; ★ = <1%). Every finalist is
**re-verified at ~depth 30** from the armed side's view *after the opponent's best reply* —
so the eval is what the side actually gets, not engine first-glance optimism.

- **White floor:** must keep the edge (eval ≥ 0.00).
- **Black floor:** a rare surprise conceding ≤0.45 is still sound/playable — Black rarely
  equalizes *fully* against best play, so these are "surprise weapons that stay sound,"
  not free equality.
- **No invention:** every move comes from the explorer + chess.js. The engine + the DB do
  all the judging.

## WHITE weapons (57, strongest → weakest)
| # | Eval | Line | Move | Played | Opening |
|---|---|---|---|---|---|
| 1 | +0.64 | e4 d6 d4 Nf6 Nc3 g6 | **Bf4** | 1.11% | Pirc Defense |
| 2 | +0.50 | e4 d6 d4 Nf6 Nc3 g6 | **Be2** | 3.27% | Pirc Defense |
| 3 | +0.47 | d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 | **Nge2** | 2.33% | King's Indian Defense: Normal Variation |
| 4 | +0.45 | e4 g6 | **c3** ★ | 0.03% | Modern Defense |
| 5 | +0.44 | d4 f5 | **Bf4** | 1.56% | Dutch Defense |
| 6 | +0.41 | d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 | **h4** ★ | 0.03% | King's Indian Defense: Normal Variation |
| 7 | +0.41 | e4 g6 | **Nc3** | 2.48% | Modern Defense |
| 8 | +0.41 | d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 | **Bd3** | 3.38% | King's Indian Defense: Normal Variation |
| 9 | +0.41 | e4 c6 | **c4** | 4.01% | Caro-Kann Defense |
| 10 | +0.39 | e4 e6 | **Nc3** ★ | 0.69% | French Defense |
| 11 | +0.37 | d4 Nf6 c4 g6 | **h4** ★ | 0.38% | Indian Defense: West Indian Defense |
| 12 | +0.37 | e4 g6 | **Nf3** ★ | 0.76% | Modern Defense |
| 13 | +0.36 | d4 Nf6 c4 g6 Nc3 Bg7 | **Bg5** ★ | 0.86% | King's Indian Defense |
| 14 | +0.35 | e4 g6 | **Bc4** ★ | 0.16% | Modern Defense |
| 15 | +0.34 | d4 Nf6 c4 g6 Nc3 Bg7 | **h4** ★ | 0.02% | King's Indian Defense |
| 16 | +0.34 | e4 c6 | **Nf3** | 4.95% | Caro-Kann Defense |
| 17 | +0.31 | e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 | **Nb3** ★ | 0.79% | Sicilian Defense: Najdorf Variation |
| 18 | +0.31 | e4 c5 Nf3 d6 | **Bc4** | 1.09% | Sicilian Defense: Modern Variations |
| 19 | +0.30 | e4 g6 | **h4** ★ | 0.49% | Modern Defense |
| 20 | +0.27 | e4 c5 Nf3 d6 | **Nc3** | 1.85% | Sicilian Defense: Modern Variations |
| 21 | +0.27 | d4 d5 c4 c6 | **e3** | 3.24% | Slav Defense |
| 22 | +0.26 | e4 c6 | **c3** ★ | 0.04% | Caro-Kann Defense |
| 23 | +0.26 | d4 Nf6 c4 g6 | **d5** ★ | 0.09% | Indian Defense: West Indian Defense |
| 24 | +0.26 | c4 c5 | **e3** ★ | 0.2% | English Opening: Symmetrical Variation |
| 25 | +0.26 | e4 c6 d4 d5 | **f3** | 3% | Caro-Kann Defense |
| 26 | +0.25 | d4 Nf6 c4 g6 | **Bf4** ★ | 0% | Indian Defense: West Indian Defense |
| 27 | +0.24 | e4 c5 Nf3 e6 | **a3** ★ | 0.01% | Sicilian Defense: French Variation |
| 28 | +0.24 | e4 e5 Nf3 Nc6 Bc4 Bc5 | **a4** ★ | 0.09% | Italian Game: Giuoco Piano |
| 29 | +0.24 | d4 d5 c4 e6 | **cxd5** ★ | 0.93% | Queen's Gambit Declined |
| 30 | +0.23 | e4 e5 | **Nc3** | 2.59% | King's Pawn Game |
| 31 | +0.21 | e4 e5 Nf3 Nc6 Bc4 Bc5 | **h3** ★ | 0% | Italian Game: Giuoco Piano |
| 32 | +0.21 | e4 c5 Nf3 e6 | **Be2** ★ | 0.18% | Sicilian Defense: French Variation |
| 33 | +0.21 | d4 Nf6 c4 g6 | **f3** | 2.8% | Indian Defense: West Indian Defense |
| 34 | +0.19 | d4 Nf6 c4 g6 Nc3 d5 | **Qa4+** ★ | 0.11% | Grünfeld Defense |
| 35 | +0.19 | e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 | **a4** | 1.7% | Sicilian Defense: Najdorf Variation |
| 36 | +0.18 | e4 e6 | **Nf3** | 1.64% | French Defense |
| 37 | +0.18 | d4 d5 c4 c6 Nf3 Nf6 Nc3 e6 | **g3** | 4.12% | Semi-Slav Defense |
| 38 | +0.17 | e4 c5 Nf3 Nc6 | **c3** | 2.73% | Sicilian Defense: Old Sicilian |
| 39 | +0.16 | c4 c5 | **e4** ★ | 0.08% | English Opening: Symmetrical Variation |
| 40 | +0.15 | d4 d5 c4 c6 Nf3 Nf6 Nc3 e6 | **Qd3** ★ | 0.84% | Semi-Slav Defense |
| 41 | +0.14 | d4 d5 c4 e6 | **e3** ★ | 0.17% | Queen's Gambit Declined |
| 42 | +0.14 | e4 c5 | **Ne2** ★ | 0.48% | Sicilian Defense |
| 43 | +0.13 | d4 d5 c4 c6 | **Qc2** ★ | 0.07% | Slav Defense |
| 44 | +0.12 | e4 e5 Nf3 Nc6 Bc4 Bc5 | **Nc3** | 1.55% | Italian Game: Giuoco Piano |
| 45 | +0.11 | d4 d5 c4 e6 | **g3** | 1.06% | Queen's Gambit Declined |
| 46 | +0.10 | d4 d5 c4 dxc4 | **Qa4+** ★ | 0.34% | Queen's Gambit Accepted |
| 47 | +0.10 | e4 c5 | **d4** ★ | 0.56% | Sicilian Defense |
| 48 | +0.08 | e4 e5 Nf3 Nc6 Bb5 a6 | **Bc4** ★ | 0.04% | Ruy Lopez: Morphy Defense |
| 49 | +0.08 | d4 Nf6 c4 g6 Nc3 d5 | **Qb3** | 1.27% | Grünfeld Defense |
| 50 | +0.07 | e4 e6 | **c3** ★ | 0.02% | French Defense |
| 51 | +0.07 | d4 Nf6 c4 e6 | **e3** ★ | 0.03% | Indian Defense: Normal Variation |
| 52 | +0.07 | e4 c5 Nf3 Nc6 | **Bc4** ★ | 0.32% | Sicilian Defense: Old Sicilian |
| 53 | +0.06 | d4 d5 c4 c6 Nf3 Nf6 Nc3 e6 | **Qb3** | 1.33% | Semi-Slav Defense |
| 54 | +0.06 | d4 d5 c4 c6 Nf3 Nf6 Nc3 e6 | **cxd5** | 4.42% | Semi-Slav Defense |
| 55 | +0.05 | d4 Nf6 c4 e6 | **a3** ★ | 0.15% | Indian Defense: Normal Variation |
| 56 | +0.03 | e4 c5 Nf3 Nc6 | **h3** ★ | 0.01% | Sicilian Defense: Old Sicilian |
| 57 | +0.03 | d4 d5 c4 c6 | **Qb3** ★ | 0.01% | Slav Defense |

## BLACK weapons (15, strongest → weakest)
_All sit slightly negative — that's honest: vs best play Black starts a touch worse. These
hold soundness while dodging mainline theory._

| # | Eval | Line | Move | Played | Opening |
|---|---|---|---|---|---|
| 1 | -0.19 | d4 Nf6 c4 e6 Nc3 Bb4 e3 | **d5** | 2.48% | Nimzo-Indian Defense: Rubinstein System |
| 2 | -0.21 | Nf3 d5 g3 | **e6** | 1.36% | King's Indian Attack |
| 3 | -0.29 | Nf3 d5 g3 | **Bf5** ★ | 0.48% | King's Indian Attack |
| 4 | -0.32 | Nf3 | **c6** ★ | 0.12% | Zukertort Opening |
| 5 | -0.32 | Nf3 | **e6** | 1.47% | Zukertort Opening |
| 6 | -0.33 | c4 | **d6** ★ | 0.67% | English Opening |
| 7 | -0.34 | d4 Nf6 c4 e6 Nf3 | **a6** ★ | 0.58% | Indian Defense: Anti-Nimzo-Indian |
| 8 | -0.34 | e4 e6 d4 d5 e5 | **Bd7** ★ | 0.8% | French Defense: Advance Variation |
| 9 | -0.35 | d4 Nf6 c4 | **c6** ★ | 0.97% | Indian Defense: Normal Variation |
| 10 | -0.36 | d4 | **c6** ★ | 0.16% | Queen's Pawn Game |
| 11 | -0.36 | d4 d5 c4 dxc4 Nf3 Nf6 e3 | **c5** | 1.87% | Queen's Gambit Accepted: Normal Variation |
| 12 | -0.36 | e4 c5 Nf3 | **g6** | 2.05% | Sicilian Defense |
| 13 | -0.42 | d4 d5 c4 c6 Nf3 Nf6 Nc3 | **g6** | 1.87% | Slav Defense: Three Knights Variation |
| 14 | -0.44 | d4 | **e6** | 4.05% | Queen's Pawn Game |
| 15 | -0.45 | Nf3 d5 g3 Nf6 Bg2 | **Nc6** ★ | 0.56% | King's Indian Attack |
