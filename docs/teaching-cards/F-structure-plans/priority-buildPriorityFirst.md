# Card — `priority` (`buildPriorityFirst`) (family F)

### A. Identity
- `buildPriorityFirst({fen, studentColor, bestUci})` — `src/services/playCommentary.ts:461-548`; returns `{facts, hint: HintPackage {ask, anchor, detail, stakes, resolve}, targetSquare, spoken, arrow}`; `resolve(m)` (:530-535) is the AFTER-the-move answer ("You found it …" / "The priority was their pawn on c3, which is isolated …").
- Adapter `priorityFirst` `boardComputers.ts:2687-~2705` (input :623), kind `priority`, `namesStudentMove: true`, held form `packageForRegister(…, 'obvious')`, surfaces lesson/**learn: LEARN**/review/play/chat/tactics/think; weaknesses: not ("an opportunity").
- Census: 55 / 46 said; lesson lines "What's the priority here? … Aim at it: Qf6 does." (names the move before it is played).

### B. Facts
- **B1** `targetSquare`, `hint` (ask/anchor/detail/stakes/resolve), `arrow` (the best move), `spoken`.
- **B2 dropped**: `isolated` vs backward is kept in words only (:514); the SEE check `legalSeeGainFor(probe, moved.to, them)` (:500); `nextMoves` (what else the piece hits).
- **B3 defect**: `resolve`'s found-it test compares SAN strings (`m.san … === moved.san`, :532) — the coordinates rule (CLAUDE.md G4.5.2: the same move renders `Nxd4` or `Nexd4`) says compare from/to; a string compare can file a FIND as a miss. Its miss form also never checks whether the student's own move hits the target from another square (the card's PF1 guard) — that check must be added, it is not computed today.
- **B3 cheap**: nothing new — `resolve` already computes the miss: the student's move ≠ best and the pawn is still there → "The priority was their pawn on c3…". Add the cost (saved read) to decide whether it is a mistake turn.
- **B4 gates**: student to move (:475); a weak (isolated/backward, not doubled) enemy pawn (:484-487); best move quiet (no capture/check, :491), not a promotion (:499), not en prise (:500), not a perpetual-shaped piece (:509); the moved piece attacks a weak pawn (:510-512).

### C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | anchor + stakes ("No pawn beside it can defend it … every piece aimed at c3 keeps working for free") | — |
| CONSEQUENCE | yes | stakes | — |
| BETTER MOVE + JOB | yes | detail ("Aim at it: Qf6 does") — must be AFTER the move | — |
| HABIT | partly | `ask` ("What's the priority here?") is a habit question | record tie |

### D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PF1 | missed priority | S | `resolve` returns the miss form (S ≠ best, pawn still there); cost ≥ inaccuracy | target, flaw | "A pawn no pawn can ever defend is the first thing to aim at: their pawn on c3 is isolated." / "A backward pawn is a target, and every piece aimed at it keeps working for free." | stakes | "Qf6 aimed at it." (detail, past) | "Before a quiet move, ask: what's the priority here?" | after the move | S's move still attacks the target from elsewhere (then not a miss) | H |
| PF2 | found it (credit) | S | resolve "You found it" | | | | | | Review only | | H |
| PF3 | their priority | O | the same read for O on the board after S's move (O to move), S's move created the weak pawn | | "A pawn no pawn can defend becomes their first target: d4 is that pawn now." | | | | after S's mistake | | C (run for O) |
| PF4 | record | — | `missed-weak-target` RED/GREY full; AMBER one clause; GREEN silent | | | | | | | | |

### E. Mistake link
- Cause names (errorWhy §D): PF1 → **E14 missed-win** when the better move wins the pawn, else **E15 positional** (record tag `missed-weak-target`, routed by the recipe table — positionalReason never emits it); PF3 → E15 concession `pawn-weakened`.
- PF1: the same skill pictureTarget files (`missed-weak-target`) — two producers of one cause: merge (F2). positionalReason `no-plan`.
- PF3: `created-pawn-weakness`.

### F. Build changes
1. Learn: delete the before-move spoken package (`spoken = packageForRegister(hint, 'moderate')`, :546 — "What's the priority here? … Aim at it: Qf6 does.") from Learn; keep `resolve`'s miss form as PF1.
2. ONE producer for "the weak pawn you should have aimed at": `buildPriorityFirst` and `pictureTarget` (`missed-weak-target`) answer the same cause — the recipe table keys one row, the two computers supply one fact (claim `priority:<sq>` = `target:<sq>`).
3. Run it for the opponent's seat too (PF3).
4. `playCommentary.ts:532` — match the found move by from/to squares, not SAN; add the "student's move also attacks the target" check to the miss branch (:533-534) so PF1's guard is computed, not assumed.

### G. Proof boards
- `vc--9fPYlSEkJ0-26` (`2rq1rk1/pp4pp/1b2pp2/1P1pn3/5Bn1/N1P3PN/P3PP1P/R2Q1RK1 w`) "Their pawn on c3 is backward … Aim at it: Rc8 does."
- `vc-_Y-iXy9b4Ew-40` "Their pawn on a3 is isolated."
- Note: on `vc-_4xbS0Crtic-22` the census says "Aim at it: Qf6 does" while the board's queen already stands on f6 — the voiced board id is the note's position, the read ran on the board before the move. Verify the board/ply pairing in the build's tape.

### H. Open questions
- none.
