# Review hand-walk — 3 fresh games, 2026-10-01

Games: 174083521118 (Black, 1-0), 173903420240 (White, 0-1), 173849611894 (Black, ½-½).
Run on `cbb8e715e` (A1 one grade, B3 missed-pattern rule, A2 Review calls Learn's
student-move computer, mid-trade threat fix).

## Claims (games 1 + 3 — game 2's run wedged at ply 62 under a concurrent commit hook; re-walk owed)

| | claims | true | false |
|---|---|---|---|
| machine-checked (tape-verify) | 91 | 91 | 0 |
| hand-checked (the rest) | 134 | 129 | 5 |
| **all** | **225** | **220 (97.8%)** | **5** |

The 8 "FALSE" the machine reported were its own replay errors, every one checked
by hand: "why X was better" lines start from the board BEFORE the move, and
"left alone, their idea runs …" lines are null-move (the same side moves twice).
All 8 lines are legal and their conclusions true (two mates, "two pawns",
"a queen and a bishop for a rook", "a knight for a queen", "they win a pawn").

## Flags (all fixed, each with a test that fails on the old code)

| # | ply | said | truth | fix |
|---|---|---|---|---|
| R1 | g1 16 | "Bf5 — it would walk the bishop round to a4, by way of f5 and c2" | the stop on c2 wins the pawn; the route hid the win | `whyBetter`: a route that collects material says the material |
| R2 | g1 26 | "attack their king stuck on c1 before it ever reaches safety" | White had castled long | ONE stuck-king reader (`enemyKingStuckInCenter`, castled-long aware); nextPlans' copy deleted |
| R3 | g1 38 | "You gave up the bishop, but … the attack rolls straight on" beside "a blunder, 3.3 points" | the grade says the sac failed; the queen on g4 was hanging | no sacrifice rationale on a move graded mistake/blunder (both review paths) |
| R4 | g3 37 | "Be3 was the move — it would walk the rook round to c4" | a bishop move does not walk the rook | a route is the move's own only when it routes the moved piece |
| R5 | g3 42 | "Bxf3 — it stays 2 pawns of material ahead" | gxf3 takes back; level | `moveComparison`: material where each engine line settles |
| R6 | g3 64-70 | "deeper threat brewing … Bxe5+, Qxe5, Qxe5+" four times | true, said four times | both deep-threat passes say a line once |
| R7 | g1 70 | "The game turned at move 35 — about 296.4 points" | a mate score read as pawns | `renderThesis`: "that move decided the game" |
| R8 | g2 45 | "You're now threatening Qxd8+" after Qxc7 | …Rxc7 takes the queen back | `detectNewThreat`: no threat from mid-trade |

Instrument fixes: ACC reads past tense on the board before the move; the
board-truth scanner skips conditionals ("would put"); FUND_RE knows the
defended-pawn stems; THESIS waits for the spoken line.

## Teaching that now reaches Review (new this build)
- B3: "the stronger move was Bg4 — it would set up a pin. Remember — a pin freezes the piece in front…"
- A2: "…fxe5, taking back with the f-pawn: it half-opens the f-file for your rook."
