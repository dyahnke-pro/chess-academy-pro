# theirMoveStructure — what their move did to your structure and squares

## A. Identity
- File: `src/services/structureReads.ts` `theirMoveStructure(fenBefore, san, student)` (143–155): five reads — `recaptureSealed` (pawnJudgement.ts 167–188), `unmovedUnits` (squareJudgement.ts 351–381), `kingCommittedRead` (structureReads 158–165 → splitPosition.kingCommitted), `knightJumpApart` (practicalReads.ts 156–167), `mateThreatCostsYou` (practicalReads.ts 259–268). Each returns a `StructureRead` (`act`, `text`, `squares`, `proof`, `key`, optional `heldForm`, `stakes`).
- Registry: `registry:structureTheirMove` (reach file `structureReads.ts`), kind `judgement`.
- Reach: learn door, review, lesson, chat, tactics (tapped no). Census: 67 lines (52 said): lesson 52 (40 said; held 8 `already-said`, 2 `same-idea`, 2 `refused`), review 15 (12 said; 3 `in-flux`). Run: 58 fires (16 on their moves; 42 with seats swapped on the student's move — the reads are seat-symmetric). The `unmoved-units` read is most of what is said ("Their bishop reaches d5 because your c-pawn hasn't moved: on c6 it would cover that square").

## B. Facts
- **unmovedUnits** (351–381): their knight/bishop lands on the student's 3rd–5th rank (rel 3–5, 357) on a square no student pawn covers, and a student pawn still on its 2nd rank, NOT a king-cover pawn (362–366), could cover it from one or two squares up. Fields: target `x`, the pawn `p`, the cover square `t`. `heldForm` without the pawn.
- **recaptureSealed** (167–188): their pawn capture lands in front of the student's isolated/backward pawn on a file they had no pawn on — their rooks lose the frontal attack.
- **kingCommittedRead**: their king castled to a wing while the student's king is central → the student's pawns on that wing "pry open files".
- **knightJumpApart** (156–167): their move left two of their big pieces a knight's jump from one square a student knight can reach safely (`knightForks`), new since before. Says the pattern, never the square.
- **mateThreatCostsYou** (259–268): their non-check move threatens mate and every defence costs the student material (`secondBlow`).
- **B2 dropped:** unmovedUnits keeps the FIRST pawn that would cover (`return` in the loop, 374) — a second covering pawn is lost; the cost of the student's earlier move that left the hole is not known here; `knightForks` returns the knight square and route — dropped ("never the square", 166); `secondBlow`'s trap detail rendered but the defences enumerated are not exposed.
- **B3 cheap:** whether the student's move AFTER their move used the fact (a knight to the fork square; the covering pawn push) — the student's reply is in hand on every mistake turn.
- **B4 gates:** their move only (146); per-read gates above; no cp gate on any read.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | unmovedUnits / knightJumpApart texts carry a rule ("that is the pattern to scan for") | for unmoved-units the general lesson ("a pawn still at home leaves squares open") is implicit |
| CONSEQUENCE | partly | the square their piece now holds | what it does from there |
| BETTER MOVE + JOB | no | — | (the pawn push that would have covered: the cover square `t` is a FUTURE move of the student's — held) |
| HABIT | partly | knightJumpApart "the pattern to scan for" | — |

## D. Lesson recipes
These reads describe THEIR move. They become mistake lessons when (a) the student's NEXT move missed the chance the read names (**SM-MISS**: knightJumpApart / mateThreatCostsYou ignored), or (b) the read is the CONSEQUENCE of an earlier student mistake (**SM-CAUSE**: the student's pawn left at home was the reason their piece landed — only when the landing cost the student ≥ floor).

| id | read | angle | seat | condition | LESSON stems | CONSEQUENCE | BETTER MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SM1 | knightJumpApart | recognize (fork geometry) | S | SM-MISS: the student's reply did not take the fork and cost ≥ floor | "Two big pieces a knight's jump from one square is a fork waiting: their {targets} were set up for your knight." / "Scan for pieces a knight's jump apart — one square hits both." | "That was a piece won." | "{best} jumped in." | "After their move, look for two of their pieces a knight's jump apart." | full; the fork square is said only once past | the fork square is guarded (already filtered by "safely") | H + C: best = the fork |
| SM2 | mateThreatCostsYou | consequence | S | SM-MISS or the student lost material defending | "A mate threat that costs material to stop is the strongest kind: every answer to {san} gives something up." | "You lose {trap}." | "{best} was the cheapest defence." | "When they threaten mate, find the defence that costs least." | full | mateThreatLever (the student's version) is another card | H |
| SM3 | unmovedUnits | knowledge (holes from unmoved pawns) | S | SM-CAUSE: `unmovedUnits` fired on their move AND `x` is the square of the first blow of the student's `costReason` on the next student move (deterministic: the read's `squares[0]` = the blow's `from`/`to`). Which earlier student move "left the pawn home" is NOT computable — the lesson names the hole, never an earlier move | "A pawn still at home leaves squares open: no pawn of yours covered {x}, and their {piece} sat there." | "From {x} it {hits}." | — | "Ask which squares in front of you no pawn covers." | held form in Learn (never the push) | king-cover pawns excluded (already) | H + C |
| SM4 | recaptureSealed | evaluate (their recapture helped you) | O | their recapture cost them ≥ floor | "Their pawn recapture walled your weak pawn off the file: it can't be hit from the front any more." | — | — | — | Review (their mistake helped the student — said only as their mistake) | — | H |
| SM5 | kingCommitted | strategize (opposite wings) | S | the student's next move ignored the plan and cost ≥ floor | "When the kings are on different wings, the pawns facing their king become attackers: push them to open files." | — | — | — | Review/chat (a plan, rarely a single mistake) | — | H |
| SM6 | record | — | S | — | knightJumpApart → `missed-fork`; mateThreatCostsYou → `missed-mate-threat`; RED/GREY full · AMBER one clause · GREEN silent | | | | | | H |

Not applicable: calculate (each read is one move), phase endgame (none of the five reads is phase-aware — kingCommitted assumes a middlegame; a guard is needed in the ending, F3).

## E. Mistake link
- Student: `costReason` **missed** with motif fork (SM1) or the material loss in a mate defence (SM2); SM3 is the CONSEQUENCE half of an earlier hole the student allowed (`positionalReason` space-conceded / misplaced-piece) — Review only unless the landing is the blow.
- Opponent: SM4.

## F. Build changes
1. Each read returns its `cause` and a `fork`/`mate` payload: `knightJumpApart` adds `forkSquare` and `knightFrom` (held from the voice, needed for BETTER MOVE once past); `mateThreatCostsYou` adds `defences: { san, costs }[]`.
2. `unmovedUnits` (374): return every covering pawn (`covers: {pawn, square}[]`).
3. `kingCommittedRead`: no-op when queens are off (the plan "pry open files" is a middlegame plan).
4. The turn door uses SM1/SM2 only on SM-MISS; the standing unmoved-units line (most of the 40 lesson lines) never speaks in Learn.

## G. Proof boards (run, chess.js only)
- SM1: g chesscom-1012441262 ply 20 …Bh5 (opponent, cost 393) → "Their queen on d8, rook on f8 and bishop on g7 now stand a knight's jump apart" — the student's Ne6 was the fork (the same board readTheirMove RT5 names).
- SM1: g chesscom-1018863294 ply 49 …Rxe5 (cost 317) → rooks c1/e5 and king e1 a jump apart (student Black).
- SM3: g chesscom-1012441262 ply 30 …Na5 → "your b2 pawn is still at home. From b4 it would cover a5".
- Census: lines-0.jsonl:2433 (unmoved-units said), lines-1.jsonl:6275 (knight-jump-apart said), lines-1.jsonl:5028 (held in-flux).

## H. Open questions
- SM3 (a hole their piece used, traced to a pawn the student left home) is a lesson about a move several plies back. Does Learn ever say a lesson about an earlier student move, or only about the move just played?
