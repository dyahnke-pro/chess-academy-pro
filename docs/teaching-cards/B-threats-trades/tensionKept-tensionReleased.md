# tensionKept / tensionReleased — keep the tension; taking first frees their piece

## A. Identity
- File: `src/services/tensionRelease.ts` (256 lines): `tensionKept(fen, lines, student)` (195–219, before the move), `tensionReleased(fenBefore, playedSan, lines, playedCp, reply, student)` (232–251, after the move), `gainsOf` (115–165, what their recapture gains), `isTensionCapture` (68–76), `recaptureFor` (78–98), `bestQuiet` (168–177). Constants `KEEP_GAP_CP = 30`, `RELEASE_GAP_CP = 50` (49–51).
- Registry: `boardComputers.ts` `tensionKept` (7861) and `tensionReleased` (7880), kind `trade-idea`; `moveThoughtFacts` 708 / 715 (weight 60 / 54); `reviewFullData` 1460.
- Reach: lesson, review, learn via the thought. Census: tensionKept 8 lesson (5 said; 2 `already-said`, 1 `same-idea`), tensionReleased 12 (7 said, 5 held `in-flux`). Run: tensionReleased 3 (2 on student moves; g-1012441262 ply 33 Nxh5 cost 115, g-1013773584 ply 37 Nxg4 cost 51), tensionKept 6.

## B. Facts
- **B1** `TensionRead` (37–47): `capture`, `recapture`, `best` (the quiet best move), `gapCp` (how much worse the capture is), `gains[]` (`TensionGain {kind develops | opens-file | frees-piece | takes-centre | isolates-pawn, text, squares}`), `text`, `squares`.
- **B2 dropped:** `tensionKept` keeps the capture with most gains (213) — the other tension captures and their gains are dropped; `pieceScope` before/after numbers behind "frees" (150–151).
- **B3 cheap:** the job of the quiet best (`best`) — what it does that the capture didn't (a developing move, a guard) — from the move itself (`moveIntent` / the piece developed).
- **B4 gates:** a tension capture = pawn×pawn or an equal piece the opponent can recapture (68–76); tensionKept: null if the side to move has a piece hit by a cheaper attacker (201 — a threat first), the engine's top move must be quiet (174), the capture ≥ 30 cp worse (209); tensionReleased: the played capture ≥ 50 cp worse than the quiet best (244), the recapture must gain something (`gains` non-empty, 182).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | "released the tension too early" / "Keep the tension." | the general rule ("the side that takes first often helps the other develop") is implied |
| CONSEQUENCE | yes | `gains` ("that opens the h-file for their rook on h8") | — |
| BETTER MOVE + JOB | partly | `best` ("Nf3 kept it") | its job |
| HABIT | no | — | — |

## D. Lesson recipes
`tensionReleased` IS a mistake cause already (**TR-EARLY**: the student's tension capture cost ≥ 50 against the quiet best and their recapture gains). `tensionKept` is a pre-move read → its Learn use is deleted; its data feeds Review.

| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TR1 | strategize (keep the tension) | S | TR-EARLY | recapture, gains | "Keep the tension: the side that takes first often helps the other side develop." / "Taking first released the tension too early — their recapture {gains}." | "{gains}." | "{best} kept it, {job}." | "When pawns or pieces face each other, ask who the trade helps before you take." | full; the capture is "taking first", never its SAN ("Taking on g4" names the move just played — use "Taking first") | the capture wins material (not a tension capture — already) | H |
| TR2 | consequence (file) | S | TR-EARLY, gain opens-file | file, rook | "A pawn that takes back sideways opens a file: here the {file}-file for their rook on {sq}." | | | | full | — | H |
| TR3 | consequence (development) | S | TR-EARLY, gain develops | piece | "Trading in the opening can hand them a free developing move: their {piece} comes out with the recapture." | | | | full | — | H |
| TR4 | consequence (isolated pawn) | S | TR-EARLY, gain isolates-pawn | pawn | "The exchange left your pawn on {sq} with no neighbours." | | | | full | — | H |
| TR5 | opponent seat | O | their tension capture released early (cost ≥ 50 for them) | — | "They took first and helped you: your recapture {gains}." | | | | after the student's reply (their mistake) | the student's recapture was not the gaining one (then it is the student's mistake too) | H |
| TR6 | timing (the threat first) | S | tensionKept's 201 gate fired (a piece hit by a cheaper attacker) | — | owned by `computeMustDefend` MD3 (answer the threat first) | | | | | | |
| TR7 | record | S | — | — | RED/GREY full · AMBER "That released the tension too early." · GREEN silent | | | | | | `holdState` on `released-tension` (new) |

Not applicable: calculate (the engine's gap is the proof), endgame (tension is a middlegame/opening idea; no ending guard exists — a pawn exchange in an ending that creates a passer is a different lesson, F3).

## E. Mistake link
- Student: TR-EARLY is its own cause (no `positionalReason` tag covers it; the nearest is `tempo-handed` "frees their piece on …" from positionalReason 195 — the SAME claim, two computers: F2).
- Opponent: TR5.

## F. Build changes
1. Delete `tensionKept` from Learn (pre-move); keep it for Review ("Keep the tension. If you take on c3…").
2. One cause: `positionalReason`'s `tempo-handed` ("{move} frees {their piece} …", positionalReason 195) and `tensionReleased`'s frees-piece gain say the same thing on a tension capture — let `errorWhy` prefer `tensionReleased` (it names the recapture and the gain) when the played move is a tension capture.
3. `TensionRead`: add `bestJob` (B3) and `otherCaptures` (B2) for Review.
4. Endgame guard: no lesson when queens are off and the exchange creates a passed pawn (the release can be right there).
5. Renderer wording in Learn: "Taking first …", never "Taking on {sq}" (the square of the move just played).

## G. Proof boards (run)
- TR1: g chesscom-1012441262 ply 33 Nxh5 (student White, cost 115) `r4rk1/ppp3Np/3p1npB/nq1Pp2b/4P3/2P1Q2P/PP1N1PP1/R3K2R w KQ - 3 17` → recapture Nxh5, frees their rook on f8, best Ne6.
- TR2: g chesscom-1013773584 ply 37 Nxg4 (student, cost 51) → hxg4 opens the h-file for their rook on h8, best Nf3 (census lines-0.jsonl:5212 is this line said).
- TR5: g chesscom-1018307238 ply 31 exf5 (opponent, cost 105) → the student's …Bxf5 develops the c8 bishop and frees the e8 rook.
- Guard (tensionKept pre-move, deleted from Learn): lines-1.jsonl:5747.

## H. Open questions
- none.
