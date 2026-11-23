# Card — `inaccessibleHole` (family F)

### A. Identity
- `inaccessibleHole(fenBefore, san, student)` — `src/services/inaccessibleHole.ts:94-158`; `reach` (BFS through safe empty squares) :62, `INACCESSIBLE_MOVES = 4` :30.
- Adapter `boardComputers.ts:7327-7344`, kind `structure`, `NOT_ENDING`. Surfaces: lesson, review, play-read, chat, think, learn (via thought), tactics-read; weaknesses: not ("made on purpose").
- Census: 86 / 67 said (T); unsupported 15.

### B. Facts
- **B1** `InaccessibleHole` :32-40: `hole`, `moves` (fewest moves for an enemy minor; null = no road now), `stops` [{pawn, to}] (enemy pushes the pawn move now covers), `text`, `squares`.
- **B2 dropped — the important one**: when the nearest minor is CLOSER than 4 moves (`best < INACCESSIBLE_MOVES`, :129) the computer `continue`s — it has just proven the student's pawn move made a hole an enemy knight/bishop reaches in `best` moves, i.e. the **outpost-conceded mistake with its piece and its count**, and throws it away. The minor's square and type are not even kept (`p.square`, :124).
- **B3 cheap**: the route (BFS parent pointers in `reach`) — "via e5"; whether the enemy minor would be safe on the hole (`standsSafe`); what it hits from there.
- **B4 gates**: a non-capturing pawn move (:99); hole on a neighbouring file, mover's 3rd-5th rank (:104-106), c-f files only (:108); not enemy-occupied, not a pawn on it (:110-115); weakened BY this move (`noPawnCanChallenge` before false, after true, :116); the side has a minor (:129); reach ≥ 4 or null.

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
| IH3 | O seat — their hole | O | IH2 on O's move | | "Their pawn move left e5 with no pawn to guard it: your knight gets there in two." | | | | after their mistake (if cost ≥ inaccuracy) | | C |
| IH4 | record | — | IH2: `created-pawn-weakness` RED/GREY full; AMBER "That left d5 for their knight."; GREEN silent | | | | | | | | |

### E. Mistake link
- IH2/IH3 explain `positionalReason` concession `outpost-conceded` (→ `created-pawn-weakness`, `positionalReason.ts:41`) with the reaching piece and count. Seat S / O.
- IH1 is a **guard row** for the recipe table: when it fires on the same hole, the outpost-conceded lesson must not be said.

### F. Build changes
1. `inaccessibleHole.ts:129` — instead of `continue`, return (or emit as a sibling result) `{ hole, reachable: { piece, from, moves, route } }` when `best < INACCESSIBLE_MOVES`. Name it `holeMade(fenBefore, san)`; IH2 trigger. Check overlap with the existing `holeAccess` computer (family owner of "their knight gets there in two") — merge into ONE producer rather than two (H1).
2. Keep `from`/type of the nearest minor (:124) and the BFS route.
3. `mistakeLesson`: `outpost-conceded` → IH2/IH3; IH1 registered as the guard on the same hole.

### G. Proof boards
- IH1 fires: `vc--FRuDd_oXz4-25` (`r1b2rk1/p1p1qppp/1p1p2n1/3Pp2n/2P1P3/3BBNPP/P1P2P1K/R2Q1R2 b`) "weak square on f3 … no knight or bishop of theirs can reach it yet"; `vc-_WmByfLW-3g-34` (stops your d-pawn reaching d5); `vc-0ipLPOAN_m8-36` (c6, five moves away).
- IH2 boards: to be found in the build by running the patched function over boards-?.jsonl (none proven here).

### H. Open questions
1. `holeAccess` vs `holeMade`: one computer for "the hole and who reaches it" — which family owns it?
