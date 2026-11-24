# Card — `buildMiddlegameOrientation` (family F)

### A. Identity
- `buildMiddlegameOrientation(fen, studentColorWB, moveSan?, seat)` — `src/services/reviewStrategicOrientation.ts:186-275`; uses `describeStructure`, `pawnCountsByWing`, `majorityWing`, `oppositeWingsRace` (planRace), `stormArrows`. Returns `PlanBeat` (text parts + arrow pairs).
- Adapter `boardComputers.ts:2018-2030`, silent when `enemyKingStuckInCenter`; kind `plan-middlegame`; `reviewFacetSurfaces()`, weaknesses `WEAK_PLAN_CHANCE`. Census: 13 / 8 said (review).

### B. Facts
- **B1** `PlanBeat`: text (joined parts), arrows (`PlanPair[]`).
- **B2 dropped**: `counts` per wing (:214), `studentWing`/`enemyWing` (:216-217), `oppositeCastling` flag (:228-230), the WRONG-WAY push check (`pawnMove && fileWing(destFile) === myKingWing`, :240-244) is only a clause appended to text.
- **B3 cheap**: the wrong-way push IS a mistake detector — expose it typed; also "S pushed a pawn on the enemy's majority wing / away from own majority".
- **B4 gates**: not the opening (`phaseOfFen`, :209); opposite-castling race only in a middlegame with pawns to race (`oppositeWingsRace` non-null); seat filter (student move carries the student's plan).

### C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | race line ("won by throwing your pawns at their king … before they do the same to you"), majority line | — |
| CONSEQUENCE | partly | wrong-way clause ("opening lines in front of your OWN king") | — |
| BETTER MOVE + JOB | no | — | engine best |
| HABIT | no | — | — |

### D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| MO1 | strategize — wrong-way storm | S | opposite castling; S's pawn move on S's own king wing (B2 check); cost ≥ inaccuracy | wings | "With the kings on opposite wings, pawns go toward their king, not yours: a pawn moved in front of your own king opens lines for them." / "In a race between storms, a pawn moved on your own king's wing is a move for them." | | engine best (a storm push on the enemy wing) | "With opposite castling, ask which king each pawn move helps." | after the move | queens off; a one-step luft (h3/g3, h6/g6) with no enemy piece or pawn on that wing to open it; the regex at :240 also matches pawn CAPTURES — a capture toward the centre is not a storm | C (expose B2) |
| MO2 | own majority | S | S majority wing and S's move pushed elsewhere, cost ≥ inaccuracy (no-plan) | | "A pawn majority is a passed pawn waiting to be made: yours is on the queenside, and every move spent elsewhere puts it off." | | engine best | | after | not middlegame | H |
| MO3 | their majority | O | enemy majority | | "Their plan is to push the kingside majority." | | | | Review | | H |
| MO5 | both seats — their wrong-way push | O | the MO1 check run with seat O on their pawn move, their cost ≥ mistake | wings | "In a race of storms, a pawn pushed in front of your own king is a gift: theirs now opens the g-file toward their own king." | | — | — | Review/chat only (the punishment is the student's next move) | MO1 guards | C (F1, seat flipped) |
| MO4 | record | — | RED/GREY full; AMBER one clause; GREEN silent | | | | | | | | |

### E. Mistake link
- Cause names (errorWhy §D): MO1 → **E15 positional** `weakened-king-safety` (concession `file-opened`), or **E13 king-hunt** / **E10 allowed-tactic** when the storm lands in the window; MO2 → E15 `no-plan` (silent today, errorWhy H3) or `passed-pawn-neglected`; MO3/MO5 Review/chat only.
- MO1: `weakened-king-safety` (concession `file-opened`) / costReason `allowed` when the storm lands. MO2: `no-plan`.

### F. Build changes
1. Expose `wrongWay: { pawn, wing }` (:240-244) and the wing counts on the beat.
2. Perspective rule: "Your opponent's plan is to push on the queenside" → "Their plan …" (CLAUDE.md "they/their" for the opponent; the census line uses "your opponent's").
3. `mistakeLesson`: MO1 under `weakened-king-safety` with opposite castling.

### G. Proof boards
- Review lines (census): "Your plan is to advance your queenside pawn majority and make it count."; "Your opponent's plan is to push on the kingside, where they hold the majority." (perspective defect, F2).
- Guard: opening phase; their king stuck in the centre (adapter).

### H. Open questions
- none.
