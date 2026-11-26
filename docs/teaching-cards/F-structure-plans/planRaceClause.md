# Card — `planRaceClause` (family F)

### A. Identity
- `planRaceClause(fen, student, register)` — `src/services/planRace.ts:399-~515`; detector `detectPlanRace` :323 (kinds `passer-race` | `storm-race` | `file-collision`), `stepsToPromote` :16, proof `planRaceProof` :517. Siblings in the same file: `pawnSquareRaces`/`pawnSquareRaceRead`/`pawnSquareTaken` (own card), `oppositeWingsRace`, `fileClaimed`.
- Adapter `raceOfPlans` `boardComputers.ts:5826-5845` — **always calls with register `'review'`** (:5828) (past tense) on every surface, incl. lesson/learn; kind `plan-race`. Census: 155 / 23 said; already-said 129. Map: Q (strong teacher held quiet).

### B. Facts
- **B1** a string. The race object (`PasserRace` {yourPawn, theirPawn, yourPushes, theirPushes, youMoveFirst, youQueenFirst, queensOn, firstQueenCovers}; storm {yourPawn, theirPawn, pushes, youFirst, wings}; file {file, yoursNow, theirsNow}) is computed by `detectPlanRace` and DROPPED by this function's string return.
- **B2 dropped**: every count above.
- **B3 cheap**: the race verdict before vs after the student's move — the move that LOST the race (youQueenFirst true → false, or a file both wanted now theirs: `yoursNow`→false). That is the mistake trigger.
- **B4 gates**: only same-kind races (passer vs passer, storm vs storm, the same open file) (:24-38 doc); queens-on softens the passer lesson; never a verdict without "if nobody interferes".

### C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | the race lesson ("you get there first once the queens come off — that race is your reason to trade") | register is wrong on live surfaces (past tense in a lesson: "Both sides had a runner…") |
| CONSEQUENCE | yes | counts | — |
| BETTER MOVE + JOB | no | — | engine best when the race flipped |
| HABIT | no | — | — |

### D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PR1 | calculate — the move lost a passer race | S | passer-race youQueenFirst true before, false after S's move; cost ≥ inaccuracy | pawns, pushes | "In a pawn race, count the pushes and whose move it is: yours was two from queening and theirs five, and one spare tempo hands the race over." / "When both sides have a runner, every tempo decides it." | "They queen first now." | engine best (the push or the stop) | "When both sides have a passed pawn, count the pushes before every move." | after | queens on (then the race is a reason to trade, not a march) | C (B3) |
| PR2 | strategize — trade into the won race | S | race youQueenFirst, queensOn, S declined a queen trade the engine wanted | | "When your passer wins the race, the queens are in its way: trade them and the race is yours." | | engine best (queen trade) | | after | | C |
| PR3 | file collision lost | S | file-collision yoursNow true before, theirsNow after S's move | file | "When you both want the open file, the first rook there owns it." | "Their rook takes the c-file and comes in." | "Rc1 first claimed it." | "Ask which open file you both want, and who gets there first." | after | | C |
| PR4 | storm race | S | storm-race youFirst → false on S's move | | "With kings on opposite wings it's a race: the side whose storm arrives first wins, so don't spend a move on defence unless you must." | | engine best | | after | | C |
| PR5 | record | — | RED/GREY full; AMBER one clause; GREEN silent | | | | | | | | |

### E. Mistake link
- Cause names (errorWhy §D): PR1 → **E11 allowed-capture / E10 allowed-tactic (promotion motif)** when their pawn queens inside the window, else **E15 positional** `passed-pawn-neglected`; PR2 → E15; PR3 → E15 `passive-rook`; PR4 → E15 `weakened-king-safety` or **E13 king-hunt** when their storm lands.
- PR1/PR2: `passed-pawn-neglected` / costReason `allowed` (their promotion inside the window). PR3: `passive-rook` (`positionalReason.ts:186`). PR4: `weakened-king-safety` / no-plan. Seat S (and the O version: their move that lost the race is a chance for S — Review).

### F. Build changes
1. Return the race object typed (B1/B2) beside the string.
2. Adapter `boardComputers.ts:5828`: register must follow the surface — `'live'` for Learn/lesson/play, `'review'` for Review (today always `'review'`, so the lesson said "Both sides had a runner …" in the past tense on a live board).
3. New `raceFlipped(fenBefore, fenAfter, student)` (B3) — the mistake trigger.
4. `mistakeLesson`: PR1-PR4 by race kind.

### G. Proof boards
- `vc-_ZmPtTJHfNI-66` (`6k1/4Q3/p2P2pp/8/1ppq4/7P/2P2PPK/8 w`) passer race d6 two vs a6 five, queens on (said in the past tense on a lesson board — the F2 defect).
- `vc-_WmByfLW-3g-34` file collision "only their rook could take it"; `vc--4hTQEnwa7s-34` storm race.
- Guard: different plan kinds never race.

### H. Open questions
- none.
