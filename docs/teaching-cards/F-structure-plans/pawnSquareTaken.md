# Card — `pawnSquareTaken` (family F)

### A. Identity
- `pawnSquareTaken(fenBefore, san, cpLoss)` — `src/services/planRace.ts:746-761`; `pawnSquareRaces` :694-727, `readyIn`, `pawnSquareRaceRead` (before-move form, :731-744), `pawnSquareRaceProof` :764.
- Adapter `boardComputers.ts:1915-1930`, kind `plan-race`, student move only (`sideToMove(fenBefore) === student`), `reviewFacetSurfaces()`, weaknesses `WEAK_PLAYED_JUDGED`. Census: 18 / 16 said.

### B. Facts
- **B1** `{ text, squares: [square], race: PawnSquareRace {square, yourPush, theirPush, yourSupport, yourReady, theirReady} }`.
- **B2 dropped**: nothing — the race is returned whole; the text drops `theirReady` and the support move.
- **B3 cheap**: THE MISSED RACE (the mistake) — `pawnSquareRaces(fenBefore, student)` had a race the student was ahead in, the student played something else (cpLoss ≥ inaccuracy), and on the board after THEIR reply their pawn stands on the square (or `theirReady` now ≤ yours).
- **B4 gates**: the move is a quiet push to c–f, rank 4–5, cpLoss < 30 (:748); a race where the student is ready now (`yourReady === 0`) and the push is the race's (:751); races only where the student is not behind, no tie before move 6 (:715-719).

### C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | "the first one there keeps it" (in the before-move read); taken: "the square is yours" | — |
| CONSEQUENCE | yes | "their e-pawn can never reach it" | — |
| BETTER MOVE + JOB | n/a for the taken read (good move); for B3 the race's push | yourPush/yourSupport | after |
| HABIT | no | — | — |

### D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PST1 | missed race | S | B3 | square, their pawn | "When both of you want a pawn on the same square, the first one there keeps it — and e5 was yours to take." / "A central square two pawns are racing for belongs to whoever pushes first." | "Their pawn takes e5 now and your knight loses its square." (if a piece of S used it) | "e5 was the push, safe on that move." / with support: "Nf3 first made e5 safe." | "In the opening, look for the square both pawns want." | after | S's move was the support move (then it's the plan) | C (B3) |
| PST2 | won race (credit) | S | fires | | (existing) | | | | Review only | | H |
| PST3 | record | — | RED/GREY full; AMBER one clause; GREEN silent | | | | | | | | |

### E. Mistake link
- PST1: `space-conceded` (`positionalReason.ts:189`) / `mistimed-pawn-break` when the best move was the push. Seat S.

### F. Build changes
1. New `pawnSquareLost(fenBefore, san, theirReply)` (B3) in planRace.ts — the mistake trigger.
2. `mistakeLesson`: `space-conceded` + a lost square race → PST1.
3. The credit line stays Review-only (Learn speaks only on mistakes).

### G. Proof boards
- `vc-0npOMfkAlVU-12` (`rnbqkb1r/1p3ppp/p2p1n2/4p3/3NP3/2N5/PPP1BPPP/R1BQK2R w KQkq -`), `vc-358seoKegqA-11`, `vc-2Mys0GRUgM4-13` — taken races (PST2).
- Guard: cpLoss ≥ 30 for the taken read.

### H. Open questions
- none.
