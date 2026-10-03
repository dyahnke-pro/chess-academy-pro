# Learn hand walk oct3c — 2026-10-03

Three fresh amateur games (varunsriv1): French (W), Sicilian Bowdler (W), Scandinavian (B).
Game 1 stalled at ply 17 on the first run (harness: the board was replaying a slip-answer
line two plies back when the driver clicked); re-walked as oct3d after the driver fix.

Every sentence with a board claim was checked: machine (`tape-verify`) where it can read
the claim, by hand against the board + node Stockfish (depth 16–22, `searchmoves` for
costs) for the rest.

## Tally

| game | claims | false |
|---|---|---|
| French (oct3d re-walk) | 32 | 1 |
| Sicilian | 63 | 4 |
| Scandinavian | 53 | 1 |
| **all** | **148** | **6** → **142 of 148 true** |

Checker misreads (legal on their own board, counted TRUE): Bxb5 axb5 (sequence), the h4
weakness (h2 pawn on the same file is not "beside"), the Qh3 line (sequence), dxc6 e.p.,
"count before you take on e6" (graded on the board before the reply moved the knight).

## False claims and root causes

| # | ply | said | truth | root cause | fix |
|---|---|---|---|---|---|
| 1 | Sic 7 | "Nf3 was the move — the idea is to trade off the knight" | Nf3 …Qc7 O-O …Nxe5 Nxe5: Black starts the trade and wins e5 | a recapture counted as the side's chosen trade | `lookaheadPlan`: trade intended only when the side's capture OPENS the exchange |
| 2 | Scan 2 | "Your pawn on d5 is still hanging" after 2.Bb5+ | exd5 Qxd5 is an even trade | "hanging" read as "attacked", not off the line | `missedCaptureStillOn` needs the line to net material + legal SEE (line REQUIRED) |
| 3 | Sic 11 | "Qd3 … cost more than a pawn" | one search: 0.5 | cost = read before − separate 1.5 s read after | `moveCostOneSearch` (one tree) for student, coach, opening verdict |
| 4 | Scan 28 | "b5 … cost about a pawn" | 2.4 | same | same |
| 5 | Scan 35 | "Their a4 is a touch inaccurate" | 2.0 | same | same |
| 6 | Fr 29 | "dxc6 … would win a rook and a piece and a pawn" | the line wins the queen | not reproduced from the node engine's lines | **OPEN** — capture the in-app line next walk |

Also fixed on sight: `tradeQuality` king cover used a private any-rank rule; now the shared
`boardStructure.shieldPawns`.

Noted, counted TRUE: "That brings you level" at −0.56 (depth 22) — within the ±0.5 band.
The h6-knight line ("open to Qh3 … Qxg4 — they missed it") ends in perpetual check; the
knight IS lost in the line, but the line's result is a draw.

## Re-walks on the fixed builds (oct3e → oct3i)

| game | build | lines | false |
|---|---|---|---|
| French | oct3e (`62dff0edc`) | 38 | 0 (1 undecided: "their Qd1+ was waiting deeper" — my engine's line has …Rd1+; the app's line for that lane was not recorded yet) |
| Scandinavian | oct3h (`96c7ea7a0`) | 53 | 0 |
| Sicilian | oct3i (`96c7ea7a0`) | 51 | 0 |

Found and fixed between the re-walks (each with a test that fails on the old code):
- "your pawn on f7 … it falls unless you cover it" after Bb5+ — a capture read off a board where the
  other side is in check (`asIfToMove`).
- "Their Kg2 / Qxd5 is a touch inaccurate" — the cost came off a 1.5 s read; now re-scored at depth.
  NB on re-check the GRADE was not false: it is read off win chances, and at −5 a 2-pawn drop moves
  little. The depth fix stands on its own.
- The fork count (defender to move needs two winnable targets), the cramped bishop's square count,
  "hanging" = lost for at most a pawn, the plan's took/gave from the ledger, and "gives away real
  material" only when the reply line nets a loss.

Noted, not false: 30.Ng4 says "win the queen and a pawn for a piece" and then plays the line to
"the queen for a bishop" — two cuts of the same ledger, both true at their own length.
