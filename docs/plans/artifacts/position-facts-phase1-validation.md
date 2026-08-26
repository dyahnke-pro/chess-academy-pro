# Phase 1 (criticality score) — validation record

Durable record of the Phase-1 `position-facts.mjs` calculator, validated
2026-08-26. The full per-ply `PositionFacts` JSON is reproducible (gitignored,
`audit-reports/position-facts/<id>.json`) — regenerate with:

```bash
git show 09120f6:data/video-narration/<id>.json > data/video-narration/<id>.json
SF_DEPTH=18 node scripts/voiced-authoring/position-facts.mjs <id> --json
```

## The score (from `position-facts.mjs`)

`score = 0.42·V + 0.20·O + 0.16·T + 0.12·F + 0.10·L` (×100), floors: loose≥3 → ≥55,
mate-in-air → ≥80. Bands: <20 quiet · 20–45 think · 45–70 key · ≥70 CRITICAL.
- **V** volatility = candidate spread cp1−cp5 / 300 (many ways to go wrong)
- **O** only-move = gap cp1−cp2 / 150 (one move far ahead)
- **T** trap = shallow(d8)-vs-deep disagreement (a hidden point a human misses)
- **F** forcing = best line wins material / seldepth spike
- **L** loose = material en prise now (SEE-lite)

## Validation — 3 games spanning clean → scramble

| game | opening | plies | quiet | think | key | CRIT | blunders (cpLoss) |
|---|---|---|---|---|---|---|---|
| `_zT8aWZh2x0` | King's Indian (Kramnik) | 61 | 18 | 33 | 8 | 2 | Nfd7 −287, Rfe1 −265, dxe6 −102, Rce8 −128 |
| `T6IeD5ldw3s` | blitz (MVL) | 44 | 15 | 24 | 2 | 3 | Nd5 −559, Re5 −498, several ≈ −113 |
| `RainALQWgU8` | English (Nepo scramble) | 32 | 9 | 12 | 6 | 5 | 9 blunders |

Criticality density tracks the game's real sharpness — calm KID mostly quiet,
super-GM blitz scramble densely critical. The thresholds are **not** overfit to
one game.

## The two-signal design (validated, do not lose)

- **Prospective — criticality score:** flags *sharp / only-move / forcing*
  moments (the true "don't rush" moments). Ideal double-hits observed: Kramnik's
  **Rfe1** and MVL's **Re5** were each flagged CRITICAL *and* turned out to be
  the blunder.
- **Retrospective — cpLoss / label:** catches **every** blunder, including
  **calm-position slips** the criticality score correctly does NOT pre-flag
  (Kramnik …Nfd7 −287, MVL Nd5 −559). Crying "critical!" before every
  calm-but-blunderable move would be wolf-crying; those are told after the fact.

Phase 2's threat-out will add a **third, distinct** signal — *must-defend*
(the opponent has a concrete threat you have to meet).
