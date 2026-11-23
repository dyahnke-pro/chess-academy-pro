# Card — `squareForPiece` (family F)

### A. Identity
- `squareForPiece(fen, lines, student)` — `src/services/squareForPiece.ts:51-95`; `holesLeft` :33, `safeSquares` :21. Reads the ENGINE lines of the side to move (a before-move read).
- Adapter `boardComputers.ts:7694-7710`, kind `structure`; `namesStudentMove: r.side === student` (:7700). Surfaces: lesson, review, play, chat, think, learn (via thought), tactics; **weaknesses: wired** (`moveInsight` `planPosed`, no-plan).
- Census: 11 / 4 said. **Defect:** census said "The plan with g4 leaves a hole on f4." in the lesson (`vc-1zfJ7ABoh8k-12`) — a truncated line that names the student's NEXT move and drops the reason (what it buries).

### B. Facts
- **B1** `SquareForPiece` :19: `side`, `push` (SAN), `hole`, `buried` (enemy minor's square), `text`, `squares`.
- **B2 dropped**: `was`/`now` safe-square counts (:77-78, e.g. 4 → 0) — the proof of "buried" — dropped; `i` (which of the line's moves the push is) reduced to "The plan with"; the line's score gap `top - lineScore(l)` (:62).
- **B3 cheap**: after the student's move (the mistake case): did the student play a push that made the hole WITHOUT burying anything (the bad half — that's inaccessibleHole/holeMade's lesson), or skip the push the engine wanted (the lesson becomes the better move: "g4 was the plan: it gave up f4 but shut in their bishop").
- **B4 gates**: lines within 50 cp of the best (:62); push among the side's first 3 moves of the line (:64-65, i = 0,2,4); quiet pawn push (:66); hole on c–f, pusher's 4th rank+, permanently unguardable (:37-46); an enemy B/N with ≥3 safe squares before and ≤1 after (:77-79).

### C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes (Review) | hole, buried | the counts as proof |
| CONSEQUENCE | partly | buried | "its only square is …" |
| BETTER MOVE + JOB | partly | push (the engine's) | usable only after the student's move ("g4 was the plan") |
| HABIT | no | — | — |

### D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SP1 | counterfactual — the trade S missed | S | read on fenBefore of S's move: push found, S played something else, cost ≥ inaccuracy | push, hole, buried, counts | "A square for a piece is a trade worth making: one pawn move would have given up f4 and buried their bishop on h5." / "Breaking a positional rule is fine when it buys more: a hole on f4 for a bishop with no squares." | "Now the bishop gets out via g6." (if the played move let it out — safe-square count after S's move) | "g4 was the plan: it shut in their bishop on h5." (after the move) | "When a piece of theirs is short of squares, look for the pawn move that takes the last ones." | after the move only | push = S's played move (then no mistake) | H + C |
| SP2 | O's plan | O | side = O, it's their move next (after S's move) | | "Watch for a pawn move that buries a piece: their g5 would shut in your bishop on f4." | | | | Review/chat (a before-move pointer for their idea — Learn says it only as the consequence of S's mistake that allowed it) | | H |
| SP3 | knowledge | either | — | | "Do not weaken a square for nothing — but a square for a buried piece is a bargain." | | | | Review/chat | | H |
| SP4 | record | — | no-plan (moveInsight) RED/GREY full; AMBER one clause; GREEN silent | | | | | | | | |

### E. Mistake link
- SP1: `positionalReason` `no-plan` (`positionalReason.ts:220`, "X was the move the position asked for") — squareForPiece is the WHY for that generic note when the best move is the burying push. Seat S.
- SP2: Review/chat.

### F. Build changes
1. Expose `safeBefore`, `safeAfter` (:77-78) and `lineIndex` on `SquareForPiece`.
2. Learn: stop speaking this before-move read (adapter :7700 sets `namesStudentMove` but the census shows the truncated "The plan with g4 leaves a hole on f4." was SAID in a lesson — the refusal is not holding there; trace which path spoke it). Under this WO Learn reads it only on the board BEFORE the student's move, after the move is played (SP1).
3. `mistakeLesson`: `no-plan` with best = push → SP1.

### G. Proof boards
- `vc-1zfJ7ABoh8k-16` (`r3kb1r/pp1npppp/2p2n2/q6b/8/2N3PP/PPPPNPB1/R1BQ1RK1 w kq -`): "g4 gives up the f4 square for good, but it shuts in their bishop on h5" — SP1 board.
- Defect board: `vc-1zfJ7ABoh8k-12` (the truncated said line).

### H. Open questions
1. Which producer spoke the truncated "The plan with g4 leaves a hole on f4." (said=true, lesson)? Needs a trace in the build.
