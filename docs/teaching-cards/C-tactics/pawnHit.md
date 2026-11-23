# pawnHit — card

## A. Identity
- `pawnHit(fenAfter, mv)` — `src/services/trappedPiece.ts:85-111` (+ `trappedAt`, `lineTakesPiece`).
- Board computer `trapChance` (`computer: 'pawnHit'`) — `src/services/boardComputers.ts:3066-3085`, kind `latent-chance`, **`namesStudentMove: true`**, fires on the ENGINE's first move (line[0]) when it is a pawn move that traps a piece and the line takes it. LIVE_READ.
- Other callers: groundedAnswer, defenderInTime, planChoice, missions/developAndCastle.
- Census: 2 fired / 2 said (learn 1, chat 1): "a5 traps their bishop on b4 — it has no safe square to run to: you play a5 and, three moves later, you play Rxe6 — you win a pawn back."

## B. Facts
### B1. Handed over
`{ square, type, trapped }` — the most valuable N/B/R/Q a pawn's capture squares hit after the push, and whether `trappedAt` says it has no safe square. The board computer adds the proof line (`moverLineProof`).
### B2. Dropped
- The safety check on the pushed pawn (takes < 0 / recapture available, :88-95) — "the pawn is defended, so taking it doesn't help" is computed and not said.
- The proof's win is often not the trapped piece itself (census: "you win a pawn back") — the line takes the piece later (`lineTakesPiece`) but the words say the line's settle, which may contradict "traps their bishop".
### B3. Cheap
- Whether the trapped piece's owner could have prevented it a move earlier (their last move put it there) → their mistake.
- Student seat: a pawn push of THEIRS trapping the student's piece (call with the opponent's best move on the board after the student's move).
### B4. Gates
Pawn move; the pushed pawn not simply lost (SEE check + the pawn recapture test); target N/B/R/Q on a capture square; board computer: line[0] is that pawn move, `trapped` true, and `lineTakesPiece` true. Names the move (before-move in Learn — banned under the WO; the pointer/`heldForm` path is absent here).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | "traps … no safe square to run to" | rule: "a pawn is the cheapest attacker — a piece with no retreat loses to one" |
| CONSEQUENCE | partly | proof short | the trapped piece falling, consistently with the line |
| BETTER MOVE + JOB | yes (once past) | `mv.san` + "traps their bishop" | — |
| HABIT | no | — | spotCue trapped-piece |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PH-1 | own chance missed | S | best = the trapping pawn push, S played other, cost ≥ inaccuracy | square, type | "A pawn is the cheapest attacker: hit a piece that has no retreat with one and it's lost. Their bishop on b4 had nowhere to go." | "The bishop would have been trapped." | "a5 was the move — it trapped the bishop on b4." (once past) | "When their piece sits deep with few squares, look for the pawn that can hit it." | after, past-only | line doesn't take it | H |
| PH-2 | prevent (S's piece walked into it) | S mistake | S's move put a piece on a square where their pawn push traps it (B3), errorWhy cost ≥ mistake | own piece, pawn | "Before you post a piece deep, check the pawn moves that hit it. Your bishop on b4 has no way back once a5 comes." | "It's trapped." | errorWhy best | "Before you post a piece, check every pawn that can kick it — and where it goes then." | after | — | C |
| PH-3 | knowledge | both | trapped | — | "A piece needs a retreat square. Bishops on the rim and knights in the corner run out of them first." | | | | Review | — | H |
| PH-REC | record | — | `missed-your-trapped-piece` / `missed-their-trap` | | RED/GREY full; AMBER "One pawn push traps that bishop."; GREEN silent | | | | | | holdRate |
n/a: phase (middlegame mostly; not computed), plan.

## E. Mistake link
- costReason `missed` motif `trapped_piece` with best = pawn push → PH-1.
- costReason `allowed` motif `trapped_piece` with their reply a pawn push → PH-2.

## F. Build changes
1. boardComputers.ts:3077-3080 — the proof must be cut where the line takes the trapped piece (use `lineTakesPiece` index) so the consequence names that piece, not a later "pawn back".
2. PH-2 caller: run `pawnHit` on the opponent's best reply after the student's move (seat flip) → recipe `walked-into-pawn-trap`.
3. Remove before-move speech in Learn (names the move); recipe `trap-by-pawn` with BETTER-MOVE after the move.
4. Expose the pushed-pawn safety result (B2).

## G. Proof boards
- Text (lines-0, learn): "a5 traps their bishop on b4 — it has no safe square to run to: you play a5 and, three moves later, you play Rxe6 — you win a pawn back." (PH-1; F1 defect: consequence names a pawn, not the bishop).
- Guard: the pushed pawn is simply taken (SEE ≥ 0, no pawn recapture) → null.

## H. Open questions
1. none
