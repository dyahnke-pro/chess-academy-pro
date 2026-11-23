# poisonedPiece — card

## A. Identity
- `poisonedPiece(fenBefore, san)` — `src/services/poisonedPiece.ts` (`checkMate` ≤ 2-move checking mate, `poisonedOn`); words `poisonedPieceLine`.
- Board computer `poisonedPiece` — `src/services/boardComputers.ts:~7100-7142`, kind `move-job`; a second branch uses `everyTakeLoses` (the reply-fan: every capture loses, mate OR material) for a piece just moved there.
- Census: 4 fired / 4 said (review 1, lesson 3); 1 voiced board.

## B. Facts
### B1. Handed over (`PoisonedPiece`)
`square`, `piece`, `capture` (their capture SAN), `mate` (the checking mate line after it).
### B2. Dropped
- `poisonedOn` requires EVERY capture of the piece to allow mate (`if (!mate) return null` in the loop) — "whichever way you take it" is the proof and is not said.
- The SEE gain (≥ 1) — the bait's apparent value.
- The new-ness test (poisoned now, not before — `sqBefore`) — "your move made it poisoned" vs "it already was".
### B3. Cheap
- The defender's mistake: the student TOOK a poisoned piece (S's capture landed on the poisoned square and the reply line mates) — whyItFailed/costReason mate.
### B4. Gates
Move gives no check, not game over; mover's non-pawn non-king piece; SEE for them ≥ 1; every capture → checking mate within 2 mover moves; newly poisoned.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | "looks loose, but it can't be taken" | rule ("a free piece next to your king is bait") |
| CONSEQUENCE | yes | mate line ("After Rxf6, Qxh3+ Kg1 Qxg2 is mate") | key moves only |
| BETTER MOVE + JOB | n/a / errorWhy | — | when S took it: errorWhy best |
| HABIT | no | — | spotCue free-piece `loose` ("ask why they left it") + "before you grab, check your king" |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PO-1 | evaluate (S took the bait) | S mistake | S's move captured on a square where poisonedOn held (fenBefore as their offer), costReason allowed mate | piece, mate | "A free piece near your king can be bait. Taking the bishop on f6 opened the way for a mate on g2." / "Before you grab, check your own king: their bishop was poisoned." | "It's mate in two." | errorWhy best | "When a piece is free, ask why they left it — and look at your king first." | after | mate not forced (gate) | C (B3) |
| PO-2 | knowledge (S's poisoned piece) | S | mine, fires | piece, mate | "A piece can stay en prise when taking it walks into mate. Your bishop on f6 was safe — taking it was mate." | | | | Review / praise path | — | H |
| PO-3 | their bait (O offers, S avoided) | O | mine=false | — | "Their knight on f8 is poisoned: taking it runs into a back-rank mate." | | | | Review | — | H |
| PO-4 | calculate | both | B2 every-capture | — | "Check every way to take: if each one walks into mate, the piece is poisoned." | | | | Review | — | B2 |
| PO-REC | record | — | `missed-their-mate` | | RED/GREY full; AMBER "That bishop was bait — mate follows."; GREEN silent | | | | | | holdRate |
n/a: phase (any), plan, strategize.

## E. Mistake link
- costReason `allowed` with mate (the student took a poisoned piece) → PO-1. errorWhy's mate branch (`allowedMate`) gives the consequence; this card gives the lesson ("it was bait").
- The `everyTakeLoses` branch (material, not mate) → patternFails PF-2 lesson.

## F. Build changes
1. poisonedPiece.ts — expose `allCaptures: {capture, mate}[]` (B2) and `seeBait`.
2. PO-1 caller: on S's capture, `poisonedOn(fenBeforeSmove-as-their-offer, mv.to, S)` → recipe `took-poisoned-piece` beside errorWhy allowedMate.
3. Words → recipe; delete `poisonedPieceLine`.

## G. Proof boards
- Voiced: vc-_X7t6o3o6JM-30 `2r2r1k/pp2Npb1/4bnp1/2n1N2p/5BPP/4PP2/PPPq4/1K1R1B1R w - - 1 16` ("Taking their rook on c8 walks into mate. If Nxc8, then Qxd1 is mate." — PO-3).
- Text (lines-0): "Your bishop on f6 is poisoned. Rxf6 runs into Qxh3+ Kg1 Qxg2, and it's mate." (PO-2).
- Guard: one capture avoids mate → null.

## H. Open questions
1. none
