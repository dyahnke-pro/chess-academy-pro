# trickSidestepped — card (over `forkTrickFor`)

## A. Identity
- `trickSidestepped(fenBefore, san, moverWB, trickOwner)` — `src/services/forkTrick.ts` (end); the trick itself `forkTrickFor(fen, by)` / `findTrick` / `forkAfter` (same file).
- Board computer `trickSidestepped` — `src/services/boardComputers.ts:5907-5918`, kind `stopped`; also read by `positionFacts.ts:1103-1110` (the "stopped here" block, both seats).
- Census: 17 fired / 14 said (lesson 8, chat 5, review 2, learn 2).

## B. Facts
### B1. Handed over
`TrickSidestep` {trick: ForkTrick {capture, recapture, fork, forkSquare, victims[], hitsKing}, text, squares [forkSquare, moved-to], line {fen, sans}}.
### B2. Dropped
- `given` (the material the capture gives first, `cap.piece − cap.captured`) — the size of the bait.
- "every recapture loses to a fork" (`every` loop) — the proof that the trick is forced.
- WHICH feature the sidestep changed (moved a victim, guarded the fork square, made the recapture unnecessary) — not computed; only "sidesteps".
### B3. Cheap
- The miss: the opponent's trick existed after the student's move (`forkTrickFor(fenAfterSmove, them)` non-null) AND they played it → the student walked into it (mistake).
- The student's own trick missed: `forkTrickFor(fenBefore, student)` non-null, played other, cost ≥ inaccuracy.
- How the sidestep works: diff the trick's components after the move (victim moved / fork square now attacked / capture square now defended).
### B4. Gates
Sidestep move is quiet; the foe had a trick on the flipped board before (capture that gives material, check-free, every recapture → a quiet fork, landing safe, winning ≥ what was given); none after the move.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | "sidesteps their fork trick" | the trick's rule ("give a piece, then fork to win it back") |
| CONSEQUENCE | yes | the line + victims | — |
| BETTER MOVE + JOB | partly | san + "sidesteps" | for the miss: the sidestep (B3) as the better move's job |
| HABIT | no | — | spotCue fork `general` / "after a capture, look for the fork the recapture allows" |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| FT-1 | prevent (walked into their trick) | S mistake | forkTrickFor(fenAfter S move, them) non-null, O played it, errorWhy cost ≥ mistake | capture, recapture, fork, victims | "A capture that gives material can be the start of a fork: they give a piece, you take back, and the fork wins it back with interest. Their rook took on b3, and after the recapture the knight forks your rooks from c2." | "They get the piece back and more." | errorWhy best — if it is a sidestep: "Rac1 was the move — it took the rook off the fork." (B3 how) | "After their capture, check where your recapture leaves your pieces." | after | trick absent before S's move AND S's move didn't create it → still say (S failed to sidestep) | C |
| FT-2 | own plan (missed own trick) | S | forkTrickFor(fenBefore, S) non-null, S played other, cost ≥ inaccuracy | capture, fork | "Sometimes you give material to set up a fork: take on h4, and after the recapture the knight check forks king and rook." | "You'd win the piece back and more." | "Rxh4 was the move — the capture that sets up the fork." (once past) | spotCue fork `check` | after, past-only | — | C |
| FT-3 | prevent (sidestepped, positive) | S | today's fire, mover = S | — | "Your rook move took the fork trick away." | | | | Review / praise | — | H |
| FT-4 | their defence | O | today's fire, mover = O | — | "Their quiet move dodged your fork trick — the knight no longer has c2." | | | | Review (not a mistake) | — | H |
| FT-5 | calculate | both | — | B2 every | "Check every recapture: if each one walks into the fork, the trick works." | | | | Review | — | B2 |
| FT-REC | record | — | `missed-their-fork` / `missed-your-fork` | | RED/GREY full; AMBER "The capture sets up a fork."; GREEN silent | | | | | | holdRate |
n/a: phase (any), strategize.

## E. Mistake link
- costReason `allowed` motif `fork` where their line opens with a capture giving material → FT-1 (detectTacticType names it `fork` via firstLandedTactic; `deflection` setup via detectTacticLine).
- costReason `missed` motif `fork` (own trick) → FT-2.

## F. Build changes
1. forkTrick.ts — expose `given` and the full `recaptures` list with the fork for each (B2).
2. Add `sidestepHow(fenBefore, san, trick): 'victim-moved' | 'square-covered' | 'capture-defended' | 'other'` (B3) → FT-1/FT-3 job word.
3. FT-1 caller: on the student's move, `forkTrickFor(fenAfter, them)`; if their reply = trick.capture → recipe `walked-into-fork-trick` beside errorWhy.
4. FT-2: `forkTrickFor(fenBefore, student)` in the missed-cause recipe.

## G. Proof boards
- Text (lines-0): "Rac1 sidesteps your fork trick: Rxb3, axb3, Nc2 would hit their two rooks and win the piece back." (FT-4); "g3 sidesteps their fork trick: Rxh4, Rxh4, Bg3 would hit your two rooks …" (FT-3); lines-2: "Kd7 also defuses your fork trick — Rxh4, gxh4, Nd6+ would have forked their king and rook." (FT-4 + FT-2 shape for the side that had it).
- Guard: a capture that already wins material (given ≤ 0) → not a trick.

## H. Open questions
1. none
