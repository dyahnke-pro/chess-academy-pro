# Card — `strategicReason` (family F)

### A. Identity
- `strategicReason(fenBefore, moveSan, mover)` — `src/services/moveFundamentals.ts:1518-1529`; `PRINCIPLE_REASON` (the one reason table, `Record<MoveFundamental['id'], string|null>`) :1467-1491 (21 ids, 10 of them `null`); `reasonFor` :1533; `reasonHolds` :1572 (tempo only); `strategicPlanPointer` :1496, `planHere` :1508; `REASON_NAMES_SIDES` :1543.
- Adapter `boardComputers.ts:~2988-3006` (the call at :2995): reads it on the ENGINE BEST move (`bestSan`) for the student to move, `planHere(strategicWhyImperative, strategicReason)`, held form `strategicPlanPointer` (points `no-plan`), kind `fundamental`, LIVE_READ, `namesStudentMove: true`.
- Census: 271 / 246 said — chat 214, **learn 32 said** ("The plan here: …" before the move).

### B. Facts
- **B1** a string: the leading fundamental's reason, true on this board, or null.
- **B2 dropped**: the `lead` fundamental object (:1526: `id`, `pointer`, `imperative`, squares) — only its reason text survives this function (the adapter separately calls `strategicWhyImperative`/`strategicSquares`); the other fundamentals of the move (`leadingFundamentals(...)[1..]`).
- **B3 cheap**: run it on the PLAYED move too → the played move's fundamental vs the best move's — "your move developed, the better move broke" — and on the move that was the student's mistake to name the principle it broke (`renderFundamentalVerdict` exists for that in another family).
- **B4 gates**: not a forced reply (:1523); a leading fundamental exists; `reasonFor` non-null (10 of 21 ids have `null`, :1477-1488); tempo reason only while the kicked side has a home minor (:1572-1577). Adapter: the idea must name a square/file/castle (`boardComputers.ts:~2992`).

### C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | PRINCIPLE_REASON (general rule) | 10 ids have no reason (attack-defender, keep-working, prepare-break, development-complete, rook-behind-pawn, queen-off-file, king-activity, promotion, passed-pawn, luft) |
| CONSEQUENCE | partly | the reason clause carries it ("gets caught the moment the center opens") | — |
| BETTER MOVE + JOB | yes (the job of the best move) | imperative + reason on bestSan | only after the move |
| HABIT | no | — | — |

### D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SR1 | the better move's job (every positional mistake) | S | S's move cost ≥ inaccuracy; strategicReason(fenBefore, bestSan) non-null | lead.id → PRINCIPLE_REASON | (the LESSON is the rule) "A piece left at home can't join the fight." / "A bishop shut in behind its own pawns is a spectator." / "A king left in the middle gets caught the moment the centre opens." | (inside the reason) | "Nd2 was the move: it brought the last knight out." (imperative, past tense) | "In the opening, ask which piece isn't out yet." (per id) | after the move | the played move has the SAME lead fundamental (then the cost is elsewhere) | H + C (played move's lead) |
| SR2 | contrast | S | lead(played) ≠ lead(best), both non-null | | "In the opening a piece move usually beats a pawn move: the position wanted the knight out." (the played move's lead named by its fundamental, never by its SAN) | | SR1 BM | | after | | C |
| SR3 | O seat | O | their move cost ≥ inaccuracy; reason on their best | | "A move that leaves a piece at home hands the other side the lead in development." | | (Review: their better move) | | after their mistake | | C |
| SR4 | record | — | the fundamental's tag RED/GREY full; AMBER BM clause only; GREEN silent | | | | | | | | |
- Not applying: endgame-specific (king-activity has no reason — fill it, F2).

### E. Mistake link
- Cause names (errorWhy §D): SR1 is the BETTER-MOVE slot of **E15 positional** for every tag; SR2 is an E15 LESSON variant; SR3 their side. SR1 never fills the slot for a material cause (E3/E6/E10/E11 — guard).
- SR1 is the BETTER-MOVE + JOB slot for every `positionalReason` tag whose best move has a fundamental (`neglected-development`, `king-stuck-center`, `passive-rook`, `misplaced-piece`, `space-conceded`, `mistimed-pawn-break`, `no-plan`) — the generic "X was the move the position asked for" (:220) gets its WHY here.

### F. Build changes
1. Return `{ id, reason, imperative, squares }` (the `lead`) instead of a string.
2. Fill the null reasons in `PRINCIPLE_REASON` (:1477-1488) for the ids that teach in endgames/plans (king-activity, passed-pawn, promotion, rook-behind-pawn, luft, prepare-break; attack-defender, keep-working, development-complete, queen-off-file too) — each sourced from the concept corpus (`chess-concepts.json`, Capablanca/Lasker), in the human voice, read on the tape like every other line. Until filled, a positional mistake whose best move leads with one of these ids has no BETTER-MOVE job and stays silent on that slot.
3. Learn: the LIVE_READ "The plan here: …" before the move (32 said in Learn) is a pointer at the next move — deleted from Learn; SR1 runs after the move.
4. `mistakeLesson`: every positional tag → BM slot via SR1.

### G. Proof boards
- `vc-_WmByfLW-3g-24` (`rn1q1rk1/3bppbp/5np1/p2P4/1p1P1N2/1B3N2/PP3PPP/R1BQ1RK1 w`) "The plan here: take the half-open e-file … a rook needs an open file to reach their camp."
- `vc-_X7t6o3o6JM-54` "move the rook away from their king on e7 before it is taken for nothing" — not a positional reason (a hanging rook) — **guard**: SR1 must not be the BM for a material cause (costReason owns it).

### H. Open questions
- none (the missing reasons are a sourcing job, answered in F2).
