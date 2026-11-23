# Card — `harmlessWeakPawns` (family F)

### A. Identity
- `harmlessWeakPawns(fen, student, best)` — `src/services/harmlessWeakPawns.ts:31-69`; `HARMLESS_FLOOR_CP = 50` :21. Adapter `boardComputers.ts:7214-7234`, kind `structure`, phase ANY. Surfaces: lesson, review, play-read, chat, think, learn (via thought), tactics-read; weaknesses: not.
- Census: 23 / 10 said; already-said 10.

### B. Facts
- **B1** `HarmlessWeakPawns` :23-28: `side`, `pawns` [{square, why doubled|isolated|backward, guard, guardPiece}], `text`, `squares`.
- **B2 dropped**: the engine score for the side (`seatCp`, :36) — the proof that the structure costs nothing — is used as a gate and dropped; the pawns that failed (`canBeAimedAt` true, :48) — the ones that DO matter — are dropped.
- **B3 cheap**: the inverse — a doubled/isolated pawn the opponent CAN aim at and only one guard holds (a target); whether the guarding piece is tied (it's the only guard → it can't leave: `tied` reading as in positionalRead :548).
- **B4 gates**: engine read present (:34); side not worse than −50 (:36); non-rim unless doubled (:47); not aimable in one quiet move (:48); a non-pawn non-king guard (:49); ≥2 doubled pawns held (:56).

### C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes (exception lesson) | pawns, guard | — |
| CONSEQUENCE | n/a | it's an exception: "costs you nothing" | — |
| BETTER MOVE + JOB | n/a | — | — |
| HABIT | n/a | — | — |

### D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| HW1 | exception | either | fires | pawns, guard | "A weak pawn only matters if the opponent can get at it: your doubled g-pawns are guarded and nothing of theirs can reach them." / "Piece placement beats pawn structure: the bishop on e6 holds both g-pawns." | — | — | — | Review/chat only; and a **guard row** — silences `pawn-weakened` recipes on these pawns | side worse than −50 | H |
| HW2 | knowledge — the guard is tied | S | B3: one guard, it's the only one | guard | "A piece that has to guard a pawn can't do anything else: the queen on g6 is tied to g7." | | | | Review; or consequence clause when S's move overloaded that guard (join whyItFailed `abandoned-defender`) | | C |
| HW3 | strategize — O side | O | side = O | | "Don't chase their doubled pawns: they're guarded and you can't reach them — play elsewhere." | | | | Review/chat | | H |
- Not applying: record/habit (no mistake ever attaches — it says a move was NOT a mistake).

### E. Mistake link
- None directly (Review/chat only). Role: GUARD in `mistakeLesson` for `pawn-weakened` (concessionBeat) on the same pawns — when HW1 holds, the "you weakened your pawns" lesson is false on this board. HW2 joins `abandoned-defender` (whyItFailed) as consequence.

### F. Build changes
1. Expose `evalForSide: number` (:36) so the guard decision is typed.
2. Register HW1 in the recipe table as a guard on `pawn-weakened` by pawn square.
3. Expose the excluded aimable pawns (:48) as `targets: Square[]` for frozenTarget/pictureTarget joins.

### G. Proof boards
- `vc--4hTQEnwa7s-30` (`2kr4/ppp2pp1/2n1b1q1/3pb3/P3p1pr/BP4P1/R1PPPPBK/1N1Q1R2 w`): "Your doubled pawns on g7 and g4 … queen on g6 and bishop on e6 guard them".
- Guard (must not fire): any board where the side is worse than −0.5.

### H. Open questions
- none.
