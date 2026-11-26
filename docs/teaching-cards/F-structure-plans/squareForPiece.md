# Card — `squareForPiece` (family F)

### A. Identity
- `squareForPiece(fen, lines, student)` — `src/services/squareForPiece.ts:56-95`; `holesLeft` :38, `safeSquares` :27. Reads the ENGINE lines of the side to move (a before-move read).
- Adapter `boardComputers.ts:7694-7710`, kind `structure`; `namesStudentMove: r.side === student` (:7700). Surfaces: lesson, review, play, chat, think, learn (via thought), tactics; **weaknesses: wired** (`moveInsight` `planPosed`, no-plan).
- Census: 11 / 4 said. **Defect:** census said "The plan with g4 leaves a hole on f4." in the lesson (`vc-1zfJ7ABoh8k-12`) — a truncated line that names the student's NEXT move and drops the reason (what it buries).

### B. Facts
- **B1** `SquareForPiece` :24: `side`, `push` (SAN), `hole`, `buried` (enemy minor's square), `text`, `squares`.
- **B2 dropped**: `was`/`now` safe-square counts (:74-75, e.g. 4 → 0) — the proof of "buried" — dropped; `i` (which of the line's moves the push is) reduced to "The plan with" (:80); the line's score gap `top - lineScore(l)` (:64).
- **B3 cheap**: after the student's move (the mistake case): did the student play a push that made the hole WITHOUT burying anything (the bad half — that's inaccessibleHole/holeMade's lesson), or skip the push the engine wanted (the lesson becomes the better move: "g4 was the plan: it gave up f4 but shut in their bishop").
- **B4 gates**: lines within 50 cp of the best (:64); push among the side's first 3 moves of the line (:65-66, i = 0,2,4 of a 5-ply playout); quiet pawn push (:68); hole on c–f, pusher's 4th rank+, permanently unguardable (`holesLeft` :38-54); an enemy B/N with ≥3 safe squares before and ≤1 after (:74-76).

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
- Cause names (errorWhy §D): SP1 → **E15 positional** `no-plan` (or `mistimed-pawn-break` when the push is a lever); SP2 Review/chat.
- SP1: `positionalReason` `no-plan` (`positionalReason.ts:220`, "X was the move the position asked for") — squareForPiece is the WHY for that generic note when the best move is the burying push. Seat S.
- SP2: Review/chat.

### F. Build changes
1. Expose `safeBefore`, `safeAfter` (:74-75) and `lineIndex` on `SquareForPiece`.
2. The truncated census line is THIS computer: the second rotated stem (:84) is "`${lead} leaves a hole on ${holes[0]}. In return … buried …`" with `lead = 'The plan with g4'` (:80, i > 0); the reason lives in the SECOND sentence and a per-sentence keep downstream kept only the first. Fix at the producer: one sentence carries both halves ("g4 gives up f4 for good but shuts in their bishop on h5"), so no sentence cut can drop the reason. The adapter (`boardComputers.ts:7700`) marks the student's push `namesStudentMove: true`, which Learn refuses; the census line came from the lesson surface, which does not. Under this WO Learn reads it only on the board BEFORE the student's move, after the move is played (SP1).
3. `mistakeLesson`: `no-plan` with best = push → SP1.

### G. Proof boards
- `vc-1zfJ7ABoh8k-16` (`r3kb1r/pp1npppp/2p2n2/q6b/8/2N3PP/PPPPNPB1/R1BQ1RK1 w kq -`): "g4 gives up the f4 square for good, but it shuts in their bishop on h5" — SP1 board.
- Defect board: `vc-1zfJ7ABoh8k-12` (the truncated said line).

### H. Open questions
- none (the truncated line's producer is traced in §F2 — a build question, not a behaviour one).
