# Caruana FULL G9.1 build (2026-06-01)

Fabiano Caruana — 8 openings, every supporting layer built to depth.
6517-game chess.com corpus.

## Final layers (all gate-green, prod-audited 42/0)
| Opening | vars | plans | endg | models | pitfalls | gems |
|---|---|---|---|---|---|---|
| Ruy Lopez | 1 | 1 | – | 2 | 1 | 7 |
| Nimzo-Indian | 1 | 1 | – | 2 | – | – |
| Najdorf | – | 1 | 1 | 2 | 2 | – |
| Taimanov | 1 | 1 | – | 2 | 1 | – |
| Italian | 1 | 1 | – | 2 | 1 | 2 |
| French | 1 | 1 | – | 2 | – | – |
| Caro-Kann | 1 | 1 | – | 2 | 1 | – |
| KID | 1 | 1 | – | 2 | – | – |
| **TOTAL** | 7 | **8** | **1** | **16** | **6** | **9** |

## Gate C continuity (David's directive)
Every middlegame plan's `criticalPositionFen` is its opening's real-game
middlegame terminus — the plan starts EXACTLY where the lesson main-line
reaches the middlegame, and its moves are the real continuation from his
winning games (G3). The data drove the terminus: Caruana's online games
fan out by ~move 8-9, so each plan anchors at the deepest densely-played
middlegame, not an over-extended line.

## Data-honest omissions (empty > generic > invented)
- **Endgames: 1** (Najdorf knight-vs-bishop conversion, his win vs
  KChor05). Other openings' model games stay middlegame-decisive or reach
  no clean recurring ending — the section self-hides.
- **Pitfalls: 6 across 5 openings.** Nimzo/French/KID are solid systems
  with no engine-verified single-move trap (same honest pattern as
  Hikaru's solid systems). Each pitfall Stockfish-confirmed
  (studentEval=-rawEval, correct move clearly better).
- **Gems: 9 (Ruy 7, Italian 2).** Mined from opponent side-tries his
  curated lines skip (EXTRA_WALK seeds). The Black openings yielded 0 —
  White's tries against the Najdorf/Taimanov/French/Caro/KID are mostly
  sound.

## Verification
- 13 pro-rep content-gate files green (6952 tests): coverage, depth,
  accuracy, voice, sources, models, orientation, plan-themes,
  plan-accuracy, common-mistakes, gems, planner.
- ship-check READY TO PUSH.
- Post-deploy 3-instrument prod audit: 42 pass / 0 fail. Gate A 0/8
  legacy, Gate B 0/8 short, gems surface (Ruy 7 tiles), TTS fires on all
  8, audit-stream captured coach-narration-spoken:8, 0 app errors.
