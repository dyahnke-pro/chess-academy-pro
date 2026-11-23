# harmlessPin — card

## A. Identity
- `harmlessPin(fenBefore, san, line)` — `src/services/harmlessPin.ts` (`pinsFrom`, `pinStands`, `pawnGuard`, main fn); words `harmlessPinLine(h, pinnerIsStudent, fenAfter)` (rotated 3 stems).
- Board computer `harmlessPin` — `src/services/boardComputers.ts:3811-3830`, kind `defence-idea`; surfaces lesson (moveThoughtFacts), review, play-ask, chat-via-thought, Learn via thought.
- Census: 8 fired / 8 said (review 3, lesson 5); 2 voiced boards.

## B. Facts
### B1. Handed over (`HarmlessPin`)
`pinner` {square, piece}, `pinned` {square, piece}, `target` {square, k|q}, `guard` (the pawn guarding the pinned piece), `end` {how: castles|blocks|kicks|steps, san, square}, `pinnerColor`, `key`.
### B2. Dropped
- `theirMoves` count (how many pinned-side moves until the pin ends — ≤2) — the "two checks" proof is not said as a count.
- The `kick` candidate when a pawn hits the pinner but the line does not use it — the alternative way out.
- That the pinning move was NOT a capture and not a check (gate) = "a pin that costs them nothing to meet".
### B3. Cheap
- Tempo cost for the pinner: after `end.how='kicks'`, does the pinner have to retreat (its moves from `end` board all backwards / it trades itself)? → "the bishop loses a move".
- The student's OVERREACTION: when the opponent made the harmless pin and the student's actual reply ≠ `end.san` and errorWhy cost ≥ inaccuracy (e.g. h3/g4 weakening, giving up a piece) — compare played reply to the engine's end move.
### B4. Gates
- The move makes a NEW pin (not standing before), no capture, no check; pinned not a pawn; target K or Q; pinned guarded by a pawn of its side; the engine line ends the pin within 2 of the pinned side's moves without a capture, or a pawn kick ends it.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | `harmlessPinLine` ("Rate it in two checks: guarded by a pawn, and X ends it") | leads with the pin restatement; reorder to the rule |
| CONSEQUENCE | partly | `end` | "and the bishop has to go back" (B3 tempo) |
| BETTER MOVE + JOB | partly | `end.san` (the pinned side's answer) | for the pinner's own move: what the better move did instead (errorWhy) |
| HABIT | yes | "rate a pin in two checks" | — |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| HP-1 | evaluate (own pin) | S pinned, S's move cost ≥ inaccuracy | pinnerColor = S | pinner, guard, end | "A pin only matters if it can't be shaken off. Your bishop on g5 pins the knight, but a pawn guards it and h6 ends it." / "Rate a pin in two checks: is the pinned piece guarded, and can they break it next move? Here both are yes." | "So the bishop just gets kicked and loses a move." (B3) | errorWhy best + job | "Before you pin, ask: is the piece guarded, and can they break the pin next move?" | after | cost < inaccuracy → silent (a harmless pin is often still fine) | H + C |
| HP-2 | evaluate (their pin, overreaction) | O pinned S; S's reply ≠ end.san, cost ≥ inaccuracy | B3 | guard, end | "Not every pin is a threat. Their bishop on g4 pins your knight, but a pawn guards it and castling ends it — there was nothing to fix." | "The move you spent on it weakened your king instead." (only if the played reply's cost is the weakness — errorWhy) | "O-O was the move — castling ends the pin." (end.san, once past) | same habit | after | the pin was NOT harmless on the played line (line differs) | C |
| HP-3 | knowledge | both | end.how | how | castles: "Castling breaks a pin to the king." blocks: "A piece in between ends a pin." kicks: "A pawn on the pinner ends it — and gains a move." steps: "Moving the queen off the line ends a pin to the queen." | | | | Review | — | H |
| HP-4 | calculate | both | theirMoves | B2 | "One move and the pin is gone: count how long a pin lasts before you build on it." | | | | Review | — | B2 |
| HP-REC | record | — | `missed-their-pin` hold (as the evaluate side) | | RED/GREY full; AMBER "That pin is harmless — a pawn guards the knight."; GREEN silent | | | | | | holdRate |
n/a: phase (opening-middlegame typical, no phase computed); combination with pinPressureConcept: a pin that is harmless has no pile-on by definition (pawn guard) — no conflict.

## E. Mistake link
- Student's pinning move graded inaccuracy+ (positionalReason tempo / errorWhy no material) → HP-1, seat S.
- Student's reply to a harmless pin graded inaccuracy+ → HP-2, seat O (not wired today — needs B3).
- Not a costReason material cause; Review/Learn on the mistake turn only.

## F. Build changes
1. harmlessPin.ts main fn — expose `theirMoves` and the unused `kick` (B2).
2. Add `pinnerLosesTempo(endBoard, pinner)` (chess.js: legal moves of the pinner after the kick that are safe and none advances) → HP-1 consequence.
3. New caller: on the student's reply to an opponent move, `harmlessPin(fenBeforeTheirMove, theirSan, lineAfter)` non-null AND student played ≠ `end.san` AND errorWhy cost ≥ inaccuracy → recipe HP-2. Today only the pinner's move is read.
4. Words move to `mistakeLesson` recipe `pin-harmless`; `harmlessPinLine` deleted (renderer leads with board restatement).

## G. Proof boards
- HP-1: vc-_JQ-AH3OYQ4-15 `rn1q1rk1/pbpp1ppp/1p2pn2/6B1/3PP3/P1NB4/1PP2PPP/R2QK2R b KQ - 2 8` (student White just played Bg5 — "the pin won't last: guarded by g7, h6 kicks").
- HP-2 shape: vc-1rcEbI44WqE-52 `1nkr1r2/1pp1b1pp/2b1p3/2P1N3/3P4/4BB1P/P4KP1/1R2R3 w - - 1 27` (their Rf8 pins Bf3; g2 guards, Kg3 steps off).
- Guard: pin where pinned piece is unguarded → null (pawnGuard).

- **Pure-function run (chess.js only, scratch vitest, deleted after):** `harmlessPin(before vc-_JQ-AH3OYQ4-15, 'Bg5', [])` → null (needs the engine line — `line.length < 1` gate); the saved said line came with its engine line.

## H. Open questions
1. HP-1: playing a harmless pin is often the book move (Bg5 in many openings). Say HP-1 only when errorWhy grades the move inaccuracy or worse — confirm that a book pin is never taught as "harmless".
