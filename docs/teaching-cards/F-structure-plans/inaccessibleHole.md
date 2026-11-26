# Card — `inaccessibleHole` (family F)

### A. Identity
- `inaccessibleHole(fenBefore, san, student)` — `src/services/inaccessibleHole.ts:97-158`; `reach` (BFS through safe empty squares) :62-94, `INACCESSIBLE_MOVES = 4` :33. **Sibling producer of the same claim:** `holeAccess(fenBefore, san, now)` (`moveInsight.ts:1371-1420`, knights only, kind `hole-access`) says BOTH the near case ("their knight on c6 gets there in three — that square is theirs now") and the far case ("needs five moves … an eternity").
- Adapter `boardComputers.ts:7327-7344`, kind `structure`, `NOT_ENDING`. Surfaces: lesson, review, play-read, chat, think, learn (via thought), tactics-read; weaknesses: not ("made on purpose").
- Census: 86 / 67 said (T); unsupported 15.

### B. Facts
- **B1** `InaccessibleHole` :35-43: `hole`, `moves` (fewest moves for an enemy minor; null = no road now), `stops` [{pawn, to}] (enemy pushes the pawn move now covers), `text`, `squares`.
- **B2 dropped — the important one**: when the nearest minor is CLOSER than 4 moves (`best < INACCESSIBLE_MOVES`, :130) the computer `continue`s — it has just proven the student's pawn move made a hole an enemy knight/bishop reaches in `best` moves, i.e. the **outpost-conceded mistake with its piece and its count**, and throws it away. The minor's square and type are not even kept (`p.square`, :123-126). NOTE: `holeAccess` (moveInsight.ts:1408-1410) already returns this near case for KNIGHTS — `from`, `moves`, `hits` — so the fact is not lost app-wide, only here (and for bishops).
- **B3 cheap**: the route (BFS parent pointers in `reach`) — "via e5"; whether the enemy minor would be safe on the hole (`standsSafe`); what it hits from there.
- **B4 gates**: a non-capturing pawn move (:102); hole on a neighbouring file of the pawn's old file, mover's 3rd-5th rank (:106-108), c-f files only (:110); not enemy-occupied (:112), not a pawn on it (:116); weakened BY this move (`noPawnCanChallenge` before false, after true, :117); the side has a minor and reach ≥ 4 or null (:130). `holeAccess` differs: ranks 4-5 only, any file, captures allowed, knights only, re-reads the knight on the board it is spoken on (`now`).

### C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes (the exception lesson) | hole, moves, stops | — |
| CONSEQUENCE | yes | stops ("in return it stops …") | — |
| BETTER MOVE + JOB | n/a for the exception (it is not a mistake); for B2 (the near minor) no | — | engine best |
| HABIT | no | — | — |

### D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| IH1 | exception — the hole doesn't matter | either | fires (reach ≥ 4) | hole, moves, stops | "A weak square only matters if their pieces can get to it: f3 is five moves from any knight or bishop of theirs." / "Don't be afraid of a hole nobody can reach — and this push stops their e-pawn reaching e5." | stops | — | — | Review/chat only — this is a GOOD move; also the **guard** that silences outpost-conceded recipes on this board | the push costs ≥ mistake (then the cost is elsewhere) | H |
| IH2 | consequence — S's pawn move made a reachable hole (B2) | S | hole weakened by S's move, enemy minor reaches it in < 4 safe moves, cost ≥ inaccuracy | hole, piece, moves | "A pawn can never move back, so the square it stops guarding is weak for good: d5 is a home for their knight now." / "Every pawn move leaves a square behind: their knight on f6 reaches d5 in two." | what it hits from the hole (B3) | "Keeping the c-pawn home kept d5 guarded." (engine best) | "Before a pawn move, ask which square it stops guarding — and can their knight get there?" | after | minor not safe on the hole | C (B2) |
| IH3 | O seat — their hole | O | IH2 on O's move | | "A pawn can't move back to guard what it left: e5 has no pawn of theirs to cover it for the rest of the game." | | | | after their mistake (cost ≥ inaccuracy); Learn lesson only — the knight's route is the student's next move, held | | C |
| IH4 | record | — | IH2: `created-pawn-weakness` RED/GREY full; AMBER "That left d5 for their knight."; GREEN silent | | | | | | | | |

### E. Mistake link
- Cause names (errorWhy §D): IH2 → **E15 positional** concession `outpost-conceded`; IH3 the same on their move (O seat); IH1 is the guard row on E15 for that hole.
- IH2/IH3 explain `positionalReason` concession `outpost-conceded` (→ `created-pawn-weakness`, `positionalReason.ts:41`) with the reaching piece and count. Seat S / O.
- IH1 is a **guard row** for the recipe table: when it fires on the same hole, the outpost-conceded lesson must not be said.

### F. Build changes
1. ONE producer for "the hole a pawn move made and who reaches it": `holeAccess` (moveInsight.ts:1371) and `inaccessibleHole` say the same far-case claim twice today. Answer (how-to, decided here): keep the BFS `reach` (:62, safe squares, knights AND bishops) and `stops` in `inaccessibleHole.ts`, return `{ hole, reach: { piece, from, moves, route } | null, stops }` for EVERY weakened hole (drop the `continue` at :130), and make `holeAccess` read it (keeping its `now` re-read and `hits`). The far case (moves ≥ 4) is then one row (IH1), the near case (< 4) the IH2 trigger. Bishops gain the near case knights have today.
2. Keep `from`/type of the nearest minor (:123-126) and the BFS route (parent pointers in `reach`). `holeAccess`'s prose names the move just played ("your e-pawn push left d5 weak", :1400) — Learn words come from IH2's recipe, never that text.
3. `mistakeLesson`: `outpost-conceded` → IH2/IH3; IH1 registered as the guard on the same hole.

### G. Proof boards
- IH1 fires: `vc--FRuDd_oXz4-25` (`r1b2rk1/p1p1qppp/1p1p2n1/3Pp2n/2P1P3/3BBNPP/P1P2P1K/R2Q1R2 b`) "weak square on f3 … no knight or bishop of theirs can reach it yet"; `vc-_WmByfLW-3g-34` (stops your d-pawn reaching d5); `vc-0ipLPOAN_m8-36` (c6, five moves away).
- IH2 boards: to be found in the build by running the patched function over boards-?.jsonl (none proven here).

### H. Open questions
- none (the holeAccess/holeMade merge is a build question, answered in §F1).
