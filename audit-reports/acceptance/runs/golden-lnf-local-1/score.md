# Acceptance score — golden-lnf-local-1

**54 of 71 items met.**

| game | met | of | not reached | replay errors |
|---|---|---|---|---|
| dto | 54 | 71 | 0 | — |

| kind | met | of |
|---|---|---|
| beat | 7 | 24 |
| noLeak | 11 | 11 |
| noRepeat | 12 | 12 |
| noStat | 12 | 12 |
| boardTrue | 12 | 12 |

## Misses

- **dto-4-nf6-e4** (MUST COVER, 2...Nf6) — Nf6 attacks the e4 pawn
  - heard: “It's the Petrov's Defense: Three Knights Game.”
- **dto-4-nc3-guards-e4** (MUST COVER, 2...Nf6) — their Nc3 guards e4
  - heard: “It's the Petrov's Defense: Three Knights Game.”
- **dto-8-d6-e5** (MUST COVER, 4...d6) — d6 defends the e5 pawn
  - heard: “They have a pawn break available on d4 — that is where their play comes from.”
- **dto-10-bg4-timing** (MUST COVER, 5...Bg4) — before h3 takes the square away
  - heard: “With bishop to g4, your bishop on g4 pins their knight on f3 against their queen on d1. Remember — a pin freezes the piece in front: it can't move without exposing the more valuable piece behind it, so it can be piled on.”
- **dto-12-nc6-d4** (MUST COVER, 6...Nc6) — the threat …Nd4 on the pinned f3 knight
  - heard: (nothing)
- **dto-12-be3-d4-c5** (MUST COVER, 6...Nc6) — their Be3 covers d4 / challenges your c5 bishop
  - heard: (nothing)
- **dto-14-bb6-structure** (MUST COVER, 7...Bb6) — Bb6 avoids the trade on c5 that spoils the pawns / axb6 opens the a-file
  - heard: “Watch out — this loses material if you ignore it: their pawn on h3 hits your bishop on g4, and a guard does not help: the pawn is worth less than your bishop. H-pawn takes g4 wins your bishop for their pawn, even after you take back.”
- **dto-16-bh5-pin** (MUST COVER, 8...Bh5) — Bh5 keeps the pin on f3
  - heard: (nothing)
- **dto-16-kh2-gfile** (MUST COVER, 8...Bh5) — their Kh2 prepares g4 / the rook to g1 (the g-file)
  - heard: (nothing)
- **dto-18-oo-safe** (MUST COVER, 9...O-O) — castling: the king is safe
  - heard: “Both kings on the kingside: no pawn race — pushing the pawns in front of your own king only weakens it, so the fight is in the centre and on the other wing.”
- **dto-18-qd2-gfile** (MUST COVER, 9...O-O) — their Qd2 idea: recapture on f3 with the g-pawn and use the g-file
  - heard: “Both kings on the kingside: no pawn race — pushing the pawns in front of your own king only weakens it, so the fight is in the centre and on the other wing.”
- **dto-20-bxf3-structure** (MUST COVER, 10...Bxf3) — Bxf3 damages their kingside pawn structure for good
  - heard: “Your g-pawn can still guard f5; they can never guard f4 the same way, so that square stays a hole for them.”
- **dto-20-gxf3-gfile** (MUST COVER, 10...Bxf3) — their gxf3 opens the g-file toward your king
  - heard: “Your g-pawn can still guard f5; they can never guard f4 the same way, so that square stays a hole for them.”
- **dto-22-rg1-g7** (MUST COVER, 11...Nh5) — their Rg1 aims down the g-file at g7 / your king
  - heard: “Route the knight from h5 to f4 — a square no pawn can ever chase it from.”
- **dto-22-decision** (MUST COVER, 11...Nh5) — a real decision point: slow down / weigh the options (engine: Kh8 best by 1.5)
  - heard: “Route the knight from h5 to f4 — a square no pawn can ever chase it from.”
- **dto-24-qf6-f3** (MUST COVER, 12...Qf6) — Qf6 hits the f3 pawn
  - heard: “Your knight on h5 is a knight on the rim — it wants f4: f4 is a strong outpost — no pawn can chase the knight off, and the e-pawn backs it up.”
- **dto-24-rg4-ignores** (MUST COVER, 12...Qf6) — their Rg4 leaves f3 / heads for g7 on the g-file
  - heard: “Your knight on h5 is a knight on the rim — it wants f4: f4 is a strong outpost — no pawn can chase the knight off, and the e-pawn backs it up.”
- **dto-26-qxf3-pawn** (MUST COVER, 13...Qxf3) — Qxf3 wins the f3 pawn
  - heard: “Not urgent yet, but see it coming — their rook on g1 and their rook on g4 form a battery on the file, bearing down on your pawn on g7. Remember — a battery stacks two pieces on the same line, multiplying their pressure down it.”
