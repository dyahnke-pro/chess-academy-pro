# Acceptance score — golden-after-1

**61 of 71 items met.**

| game | met | of | not reached | replay errors |
|---|---|---|---|---|
| dto | 61 | 71 | 0 | — |

| kind | met | of |
|---|---|---|
| beat | 14 | 24 |
| noLeak | 11 | 11 |
| noRepeat | 12 | 12 |
| noStat | 12 | 12 |
| boardTrue | 12 | 12 |

## Misses

- **dto-4-nc3-guards-e4** (MUST COVER, 2...Nf6) — their Nc3 guards e4
  - heard: “It's the Petrov's Defense: Three Knights Game.” ‖ “The knight trains on the pawn on e4 — pressure they have to answer.”
- **dto-10-bg4-pin** (MUST COVER, 5...Bg4) — Bg4 pins the knight on f3 (to the queen)
  - heard: “The bishop eyes the knight on f3.” ‖ “Their bishop is still on c1, so nothing hits your pawn on g7 yet — it doesn't need a guard; development comes first. Make the flexible move first — the pawn move can always come later, but a pawn can never go back.”
- **dto-10-bg4-timing** (MUST COVER, 5...Bg4) — before h3 takes the square away
  - heard: “The bishop eyes the knight on f3.” ‖ “Their bishop is still on c1, so nothing hits your pawn on g7 yet — it doesn't need a guard; development comes first. Make the flexible move first — the pawn move can always come later, but a pawn can never go back.”
- **dto-12-nc6-d4** (MUST COVER, 6...Nc6) — the threat …Nd4 on the pinned f3 knight
  - heard: “You have a pin: your bishop on g4 pins their knight on f3 against their queen on d1. If their knight moves, their queen on d1 is open to your bishop.” ‖ “Their bishop to e3 prepares d4, to hit your bishop on c5 — pieces behind a strong center reach either wing in a move or two. The knight bears down on d4, holding back their d-pawn. Their bishop to e3 unpins their pawn on f2 — and the bishop eyes the bishop on c5.”
- **dto-14-bb6-structure** (MUST COVER, 7...Bb6) — Bb6 avoids the trade on c5 that spoils the pawns / axb6 opens the a-file
  - heard: “Watch out — this loses material if you ignore it: their pawn on h3 hits your bishop on g4, and a guard does not help: the pawn is worth less than your bishop. H-pawn takes g4 wins your bishop for their pawn, even after you take back.” ‖ “Nothing hinges on your next move — pick a sensible one and keep your clock for the hard decisions. Their h3 kicks your bishop off g4, gaining time. It's level, so make chances: one move here creates an imbalance — bishop for knight — and the quiet move keeps it level.”
- **dto-20-bxf3-structure** (MUST COVER, 10...Bxf3) — Bxf3 damages their kingside pawn structure for good
  - heard: “Their g-pawn takes f3 stops your bishop takes e3, which would hit their queen on d2. Anything else, like bishop to g5, gives up about a point. That was the move here — it takes their knight on f3. How do you find a plan? First the forcing scan — checks, captures, threats. Then three things: where is”
- **dto-20-gxf3-gfile** (MUST COVER, 10...Bxf3) — their gxf3 opens the g-file toward your king
  - heard: “Their g-pawn takes f3 stops your bishop takes e3, which would hit their queen on d2. Anything else, like bishop to g5, gives up about a point. That was the move here — it takes their knight on f3. How do you find a plan? First the forcing scan — checks, captures, threats. Then three things: where is”
- **dto-22-decision** (MUST COVER, 11...Nh5) — a real decision point: slow down / weigh the options (engine: Kh8 best by 1.5)
  - heard: “Before your move, checks, captures, threats: nothing of yours could be taken, and nothing of theirs was free. Their weakness was the isolated pawn on h3.” ‖ “Their rook presses down the half-open g-file at your pawn on g7. Your g-pawn can still guard f5; they can never guard f4 the same way, so that square stays a hole for them. Your knight to h5 eyes f4, a square no pawn of theirs can cover.”
- **dto-24-qf6-f3** (MUST COVER, 12...Qf6) — Qf6 hits the f3 pawn
  - heard: “Queen to f6 was a mistake — it let them play knight to d5, which attacks the queen on f6.”
- **dto-24-rg4-ignores** (MUST COVER, 12...Qf6) — their Rg4 leaves f3 / heads for g7 on the g-file
  - heard: “Queen to f6 was a mistake — it let them play knight to d5, which attacks the queen on f6.”
- **dto-26-qxf3-pawn** (MUST COVER, 13...Qxf3) — Qxf3 wins the f3 pawn
  - heard: “Not urgent yet, but see it coming — their rook on g1 and their rook on g4 form a battery on the file, bearing down on your pawn on g7. Remember — a battery stacks two pieces on the same line, multiplying their pressure down it.” ‖ “Their a-rook to g1 is a mistake — it throws away about a point of advantage. Bishop takes b6 was their move — it would trade off the bishop. That tips the game your way — look for the move that keeps it. Their queen on d2 is tied down now: you hit the bishop on e3 twice and it is guarded twice — the”
