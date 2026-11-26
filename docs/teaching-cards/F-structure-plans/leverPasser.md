# Card — `leverPasser` (family F)

### A. Identity
- `leverPasser(fen, lines, student)` — `src/services/leverPasser.ts:40-73` (`passedPawns` :21 — a private copy of the passed-pawn read). Reads the ENGINE's best line (saved read), chess.js only.
- Adapter `boardComputers.ts:7515-7532`, kind `structure`; `namesStudentMove: r.side === student` (:7522) — so the student's own lever is REFUSED in Learn (census: 25 refused).
- Surfaces: lesson, review, play-read, chat, think, learn (via thought), tactics-read; weaknesses: not.
- Census: 41 / 7 said; not-said: refused 25, unsupported 7.

### B. Facts
- **B1** `LeverPasser` :17: `side`, `lever` (SAN), `passer` (square of the new passed pawn), `ply` (index of the board in the line where the passer first appears, `j` :69 — not the lever's index), `text`, `squares`.
- **B2 dropped**: `i` — whether the lever is the side-to-move's first move or the OTHER side's lever inside the line (:47-51: "their threat: the best line has to allow it") — `side` is set to the LEVER's mover (:52, :69), so whether it is the first move or a reply inside the line is lost; the line score `lineScore(ls[0], side)` (:45); the trades in between (`moves[i..j]`); whether the passer is OUTSIDE (far from the kings) — not computed.
- **B3 cheap**: outside passer (passer file vs both kings' files — distance ≥ 3 → "outside"); distance to promotion at line end; whether the side's previous move ALLOWED the enemy lever (run `leverPasser` on the board before the student's move with the saved read: lever not in the best line then, present after → the student's move allowed it); the move that stops the lever (engine best at the before-board).
- **B4 gates**: best line for the side to move ≥ −30 cp (:45); line played 10 moves (:46); lever within the first 6 moves of the line (:49), a pawn move of the side to move first, or of the other side later (:51), touching an enemy pawn (:54-56); a NEW passer (file not passed before) on the lever's file or the next (:61), still passed at the line's end (:63).

### C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | lever, passer file | general rule; outside-passer knowledge |
| CONSEQUENCE | partly | passer | distance to queen; the king deflected |
| BETTER MOVE + JOB | no | — | the move that stops / plays the lever (engine read) |
| HABIT | no | — | skill `passed-pawn-neglected` exists, not tied |

### D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| LP1 | prevent — S allowed their lever | O | B3: after S's move O's best line has a lever→passer, before it did not; S cost ≥ mistake | lever (O's — may be named, it is theirs), passer file | "When pawns face each other on a wing, a lever can turn into a passed pawn: their a3 now gives them one on the a-file." / "One pawn trade on the queenside and they have a passed a-pawn." | "A passed pawn that far from your king costs you a piece or the game." (outside, B3) | "…b4 kept the queenside closed." (engine best) | "When the pawns face each other, ask which push makes a passed pawn — for them too." | after | their lever line < −30 for them | C (B3) |
| LP2 | missed own lever | S | S's best move was the lever (engine best starts with it), S played other, cost ≥ mistake | passer file | "In the endgame a pawn break is how you create a passed pawn: one trade on the kingside leaves a passed g-pawn." | — | "h5 was the lever: the trades left you a passed g-pawn." (named only once past) | "In an ending, look for the pawn trade that leaves you a passed pawn." | after (better move named — it's past) | — | H |
| LP3 | knowledge — outside passer | either | B3 outside | | "An outside passed pawn wins endgames: it pulls their king away while yours eats the other wing." | | | | Review/chat or as LP1/LP2 consequence | not outside | C |
| LP4 | phase | — | middlegame vs ending | | middlegame: "A lever that makes a passer is a long-term trump." | | | | Review | | H |
| LP6 | both seats — their missed lever | O | LP2 check on THEIR move (their best was the lever, they played other, their cost ≥ mistake) | | "In an ending a pawn trade that makes a passed pawn is worth more than a piece move." | | | | Review/chat only | — | H |
| LP5 | record | — | `passed-pawn-neglected` RED/GREY full; AMBER "There was a passed pawn to be made."; GREEN silent | | | | | | | | |
- Not applying: "calculate" (the line is the engine's — said only in short form per the proof rule, never recited).

### E. Mistake link
- Cause names (errorWhy §D): LP2 → **E15 positional** `passed-pawn-neglected` (or **E14 missed-win** when the passer wins material inside the window); LP1 → new cause `allowed-passer`, nearest today **E12 allowed-threat**; LP3/LP4 ride; LP6 Review/chat.
- LP2: `positionalReason` `passed-pawn-neglected` (`positionalReason.ts:172` "The better move makes a passed pawn") — S seat.
- LP1: S's move allowed O's lever — costReason `allowed` with no material in the window; today no positional cause names it → new cause `allowed-passer`.

### F. Build changes
1. `leverPasser.ts:17` — add `inside: boolean` (the lever is the OTHER side's, B2 `i>0`), `outside: boolean`, `toQueen: number`.
2. New `allowedLever(fenBefore, san, readsBefore, readsAfter, student)` — lever present in the after-read only. Enables LP1.
3. Adapter `boardComputers.ts:7522` — `namesStudentMove` true refuses the line in Learn even AFTER the move; the recipe LP2 (better move once past) should be allowed: switch the Learn gate to "is this still the student's to find?" (`pastBetterNameable`, CLAUDE.md carve-out 3) instead of refusing outright.
4. Replace the private `passedPawns` (:21-38) with the one pawn read (`boardStructure.pawnsOf` / `isPassedPawnAt`, boardStructure.ts:405/:411) — a second definition of "passed" can drift from the one the structure readers use.
5. `mistakeLesson`: `passed-pawn-neglected` → LP2; new `allowed-passer` → LP1.

### G. Proof boards
- `vc-_X7t6o3o6JM-34` (`3r1r1k/pp2Npb1/4bnp1/2n1N3/3R1BpP/4PP2/PPP5/1K3B1R w`) "h5 is the lever … passed pawn on the g-file" (refused in lesson — LP2 board).
- `vc-0ipLPOAN_m8-45` their a3 → a-file passer (LP1 board, seat O).
- Guard: line score < −30 for the side (:45); passer not alive at the line's end.

### H. Open questions
1. LP1 for an *inaccuracy* (the lever is often 10 moves deep — the engine line is long): require mistake strength?
