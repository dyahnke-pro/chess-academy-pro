# CARD — `breakPrep` (the move that gets a break ready)

## A. Identity
`src/services/breakTiming.ts:55` `breakPrep(fenBefore, san, lineAfter)` → `BreakPrep` (`:37`); renderer `breakPrepLine :138`; sibling `breakDueNow :160`. Census `breakPrep` 8/8 (lesson 5, review 3), kind `move-job`.

## B. Facts
- **B1** `{prep, brk, between, reason: 'clears-square'|'guards-square'|'rook-on-file', file, squares, key}`.
- **B2 dropped:** `pawnBreak(fenHere, m.san)` (`:82`) — what the break DOES is computed then thrown away; `lostBefore` (`:88-94`) and the SEE numbers; `prepTouches`.
- **B3 cheap:** the mistake inversion — the student **broke without preparing**: the played move IS a break (`isPawnBreak`), its square was lost (SEE ≥ 1) and the better move is a `breakPrep` for the same break (run `breakPrep(fen, bestSan, bestLine.slice(1))` → same `brk`) → "prepare first". Also `breakDueNow` vs played.
- **B4 gates:** no capture/check prep (`:59`); a break move itself returns null (`:61`); line walked 4 plies, ≤1 own non-pawn move between (`:67-83`); a capture in between kills it (`:74`).

## C. Readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | `breakPrepLine` WHY table ("Played now, d4 would just drop the pawn on d4. After this move d4 is guarded, so the break works.") | general lesson missing; stated on a good move |
| CONSEQUENCE | partly | `reason` | the break's aim dropped |
| BETTER MOVE + JOB | yes | prep + brk | only once past |
| HABIT | no | — | — |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BP1 | own plan / calculate | S mistake | played = premature break, square lost (errorWhy left-hanging / allowed-capture on brk.to), better = `breakPrep` for the same break | brk.to | "A pawn break pushed before it's supported is a lost pawn. Prepare it first, so the pawn lands guarded." / "Break when the square is covered, not before." | "The pawn on d4 just falls." | "c3 first, and then d4 comes supported." | "Before a break, count who guards the landing square." | same; prep named only past | same break square both | C (B3) |
| BP2 | clears-square | S mistake | better = prep with reason clears-square | | "A piece standing on your break square is in the pawn's way: move it first." | | "Bf5 cleared h5 for the pawn." | — | same | | H |
| BP3 | rook-on-file | S mistake | better = rook-on-file prep | file | "Put the rook on the file before you open it, so the file is yours." | | "Rd1 first, then the break opens the d-file for it." | "Ask who gets the file the break opens." | same | | H |
| BP4 | timing (theirs) | O mistake | their premature break | | pointer (the student wins the pawn) → H1 | | | | held | | C |
| BP5 | phase | endgame | ending | | "In the endgame, prepare the break with the king first." | | | | | | C |

## E. Mistake link
`left-hanging` / `allowed-capture` on a pawn break square (BP1), `positional mistimed-pawn-break` (via breakDueNow), both seats.

## F. Build changes
1. `BreakPrep` (`:37`) — add `aim: PawnBreak` (B2).
2. Add the inversion `prematureBreak(fen, playedSan, bestSan, bestLine)` (B3) as an input to errorWhy's cause (`cause.prematureBreak`).
3. BP1–BP3 recipes into `mistakeLesson` keyed `left-hanging|allowed-capture` + `prematureBreak`.
4. Learn: the good-move "This gets the d4 break ready" line leaves Learn.

## G. Proof boards
- Census: "This gets the …e5 break ready. Played now, …e5 would just drop the pawn on e5. After this move e5 is guarded, so the break works." (`boards-2.jsonl:667`, b=vc--9fPYlSEkJ0-10); clears-square: `boards-0.jsonl:2539` (vc-1zfJ7ABoh8k-40, …h5).
- Pure run on David's costly moves: `breakPrep(best)` fired once — chesscom-1042725180 ply 68 Re1 (S) `4r2k/3n2bp/p2P4/1p4p1/8/P6P/Q5P1/1R3qBK b - - 2 34`, best Qf5 prepares …g4 (an endgame, check BP5).
- A BP1 board (premature break, lost pawn) is to be searched in the 952 boards in the build; none found in the 109.

## H. Open questions
1. Should BP1 also speak when the premature break was not lost but simply met (an inaccuracy)?
