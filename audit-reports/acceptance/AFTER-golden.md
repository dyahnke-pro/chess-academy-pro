# Acceptance BEFORE → AFTER (golden)

BEFORE: golden-before-1,golden-before-2,golden-before-3 · AFTER: golden-after-1,golden-after-2,golden-after-3

**Total: 57 / 58 / 57 → 61 / 61 / 61 of 71.** Moved up 4, down 1; 1 items were already unstable across the BEFORE runs.

| key | BEFORE (avg) | AFTER (avg) | of |
|---|---|---|---|
| beat | 10.3 | 14 | 24 |
| noLeak | 11 | 11 | 11 |
| noRepeat | 12 | 12 | 12 |
| noStat | 12 | 12 | 12 |
| boardTrue | 12 | 12 | 12 |

| game | BEFORE (avg) | AFTER (avg) | of |
|---|---|---|---|
| dto | 57.3 | 61 | 71 |

## Moved

- ⬇ **dto-10-bg4-pin** (MUST COVER, 5...Bg4) — Bg4 pins the knight on f3 (to the queen)
  - BEFORE met/met/met → AFTER missed/missed/missed
  - BEFORE heard: “With bishop to g4, your bishop on g4 pins their knight on f3 against their queen on d1.”
- ⬆ **dto-16-bh5-pin** (MUST COVER, 8...Bh5) — Bh5 keeps the pin on f3
  - BEFORE missed/missed/missed → AFTER met/met/met
  - now heard: “With bishop to h5, your bishop on h5 keeps the pin on their knight on f3 against their queen on d1.”
- ⬆ **dto-16-kh2-gfile** (MUST COVER, 8...Bh5) — their Kh2 prepares g4 / the rook to g1 (the g-file)
  - BEFORE missed/missed/missed → AFTER met/met/met
  - now heard: “Their king to h2 steps off g1 so the rook can come to g1.”
- ⬆ **dto-18-qd2-gfile** (MUST COVER, 9...O-O) — their Qd2 idea: recapture on f3 with the g-pawn and use the g-file
  - BEFORE missed/missed/missed → AFTER met/met/met
  - now heard: “Their queen to d2 stops guarding the knight on f3: after a trade there, they take back with the g-pawn and open the g-file toward your king.”
- ⬆ **dto-22-rg1-g7** (MUST COVER, 11...Nh5) — their Rg1 aims down the g-file at g7 / your king
  - BEFORE missed/missed/missed → AFTER met/met/met
  - now heard: “Their rook presses down the half-open g-file at your pawn on g7.”

## Unstable in BEFORE (not counted)

- dto-12-be3-d4-c5: BEFORE missed/met/missed → AFTER met/met/met
