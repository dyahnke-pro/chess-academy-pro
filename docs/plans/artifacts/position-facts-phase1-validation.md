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

## Phase 2 — threat calculated-out (validated 2026-08-26)

**Threat = two parts** (David: "not just immediate but down the road a bit too"):
- **immediate** = SEE on the flipped position (`looseMaterial(flipSide(fen))`) —
  what hangs to the opponent's *next* move, no search. Catches the common
  must-defend the forcing gate misses (attack now, take next).
- **calculated-out** = give the opponent the move, search at `SF_THREAT_DEPTH`
  (14), scan all MultiPV lines for the biggest **settled** material net
  (`lineNet`, no forcing gate); `latentLandsAt` = the ply the piece falls (`@N`).
- `threat.net = max(immediate, calcNet)`.

**Folded ADDITIVELY, never as a weight-budget competitor.** The first attempt
reallocated 20% of the weight onto `Tr`, which deflated *every* Phase-1 score
where threat fired 0 (Rfe1 CRITICAL 74 → key 56). Fixed: keep the Phase-1
sharpness `base` (unchanged weights), then `score = min(100, base + 25·Tr)` +
a must-defend floor (`threatNet≥3 → ≥50`). A threat-free game keeps its exact
Phase-1 scores; a real threat only ever *raises*.

**Validated:**
- **Kramnik (clean):** keystones intact (Bxf3 72, Bxg7 71, Kxg7 CRITICAL,
  Rfe1 CRITICAL 70). Threat fired on **real** hanging-queen must-defends —
  ply 45 `Qd2` (White Q on d4 en prise to …Qxd4, undefended → THREAT+9@1, Kramnik
  saves it, cpLoss 4) and ply 57 (…Nxd4 wins Q-for-N, +6). Board-verified, not
  false positives.
- **Nepo (scramble):** 14 threat firings (was 2 with the forcing-only gate);
  the blundered-into must-defend moments (cxb4, b5, c5, f3) escalate key→CRITICAL
  with latent depth (@1 immediate … @7 down-the-road).

**Refutation branches:** after a mistake/blunder, the opponent's punishing PV is
captured (why it failed, played out) — e.g. …Nfd7's refutation is
`Bxg7 Kxg7 b4 …`. Every candidate now carries a short PV ("if b4, then Ne5 bxc5…").

**Caveat (do not lose):** the immediate-SEE is 1-ply (defended? subtract one
recapture), not a full SEE swap-off — adequate for the offline must-defend
heuristic; the live side would use `positionalRead`'s richer SEE.

## Phases 3–6 — validated (2026-08-26)

- **Phase 3** (perturbation + move-reason): supporter leave-one-out on the
  delta-best piece surfaces board-true dependencies (KID `knightf6←bishopg7`);
  move-reasons land right (Kxg7 only-move, Qd2 defends-threat, f4 walked-into-tactic).
- **Phase 4** (positional vector + structure→plan): mechanical features + phase;
  rank-guarded structure killed the false d6-IQP "strength" (10→2, both real d5
  isolani).
- **Phase 5** (`render-briefing.mjs`): general's-hierarchy briefing, no cap,
  teach-both + say-once. Qd2(45) renders "Incoming: they threaten the queen →
  Qd2 meets the threat."
- **Phase 6** (Kramnik re-cut): crux beats sharpened with exact facts; gate 0/0/0.
  **Honesty catch:** the ply-45 +9 threat is a MUTUAL queen attack (trade tension),
  NOT a one-sided hang — kept "sidestepping the trade", refused the overstatement
  (engine-fused rule 6).
