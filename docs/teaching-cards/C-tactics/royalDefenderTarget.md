# royalDefenderTarget — card

## A. Identity
- `royalDefenderTarget(fen, studentColorWB)` — `src/services/reviewTeachingPoints.ts:190-212` (M6, "king and queen are the worst defenders").
- Board computer `royal` — `src/services/boardComputers.ts:4471-4486`, kind `royal`, **`squares: []`**, claims `royal:<board>`.
- Census: 212 fired / 76 said; held `unsupported` 64, `already-said` 64, beside-mate 7.

## B. Facts
### B1. Handed over
A STRING only ("their bishop on g5 is guarded only by the queen — and the king and queen are the worst defenders …").
### B2. Dropped
- The target square `sq`, piece type, defender squares, which royal(s) — all computed (:197-209) and flattened into prose. The board computer then passes `squares: []` (boardComputers.ts:4475) — so the support step (`supportedFacts`, FACT_ROLE) cannot link it to a teaching point → **64 lines held as `unsupported`**: a computed teaching fact silenced by a dropped field. ROOT CAUSE of the "Q (unsupported)" row in the map.
- Attacker squares (it requires ≥1 attacker, :196).
### B3. Cheap
- Whether hitting the royal guard is possible NOW: a student move that attacks the queen/king-guard (checks the king / attacks the queen) while the target stays attacked → the actual tactic (deflection). chess.js: for each student move, `after.attackers(guardSq, student)` new and target still attacked.
- SEE on the target (a queen guard on a bishop attacked by a pawn already loses — then it's simply hanging).
### B4. Gates
Enemy non-pawn non-king piece attacked by the student, ≥1 defender, ALL defenders K/Q. Returns only the FIRST such piece (loop returns on first hit — a G4.5-style single answer, not a cap on facts but drops others).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | the principle clause | squares (B2) so it can be supported |
| CONSEQUENCE | partly | "the moment you hit the guard the piece drops" | whether a move hits the guard now (B3) |
| BETTER MOVE + JOB | no | — | "Rd1 was the move — it hit the queen, and the bishop on g5 lost its guard" (B3) |
| HABIT | no | — | spotCue free-piece `false-guard` / removing-the-guard |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| RD-1 | knowledge (S's chance missed) | S | royal target on fenBefore, best move hits the royal guard (B3), S played other, cost ≥ inaccuracy | target, guard | "The king and queen are the worst defenders: hit them and they must leave. Their bishop on g5 was held only by the queen." / "A piece guarded only by the queen is half loose — attack the queen and it's gone." | "One check or queen attack and the bishop drops." | "Qd2 was the move — it hit the queen and won the bishop." | spotCue removing-the-guard | after, past-only | no move hits the guard (B3) → Review only | B2 + C |
| RD-2 | prevent (own) | O→S | run with the opponent as "student": S's piece guarded only by S's queen/king after S's move, and O's best hits that guard; errorWhy cost ≥ mistake | own target, guard | "Don't let your queen be a piece's only guard: when it's attacked it has to leave. Your rook on c7 hung on the queen." | "Their check on the queen took the rook." | errorWhy best ("Rc8 gave it a real guard") | "Give every piece a guard that can stay." | after | — | C |
| RD-3 | knowledge (king guard) | both | guard = king | — | "A piece only the king protects falls to the first check." | | | | Review | — | H |
| RD-REC | record | — | `missed-your-deflection` / `missed-your-guard-removal` | | RED/GREY full; AMBER "Their bishop leans on the queen alone."; GREEN silent | | | | | | holdRate |
n/a: phase, plan, strategize (tactical). Combination: overload (detectTactics DT-O1) when the royal guard holds two pieces.

## E. Mistake link
- costReason `missed` motif `deflection` / `removing_the_guard` (detectTacticType) with target = royal-guarded piece → RD-1 (S).
- costReason `allowed` same motifs, own piece → RD-2 (O).
- Without B3 the lesson attaches to NO mistake turn → Review only today.

## F. Build changes
1. reviewTeachingPoints.ts:190 — return a typed `RoyalTarget[] {target, piece, guards:[{sq,type}], attackers}` (ALL of them, not the first) instead of a string; skip target type `q` (an attacked queen moves — its guard is irrelevant, census "Their queen on d8 is guarded only by the king").
2. boardComputers.ts:4475 — `squares: [target, ...guards]` → stops the 64 `unsupported` holds.
3. Add `hitsRoyalGuard(fen, rt, mover): {san, from, to} | null` (B3) → RD-1 BETTER-MOVE.
4. Seat parameter: allow reading the STUDENT's pieces (RD-2) by calling with the opponent colour.
5. Words → recipe `royal-guard`.

## G. Proof boards
- Text (lines-0, held unsupported): "Their bishop on g5 is guarded only by the queen …", "Their rook on c7 is guarded only by the queen …", "Their queen on d8 is guarded only by the king …".
- Voiced: vc-_4xbS0Crtic-12 co-fires (`royalDefenderTarget (teachingMove)`) beside secondAttacker.
- Guard: queen guarded only by the king — attacked queen is the real fact (it moves; the guard is irrelevant) → RD should skip piece type `q` as target (today it fires: "Their queen on d8 is guarded only by the king"). Build edit 1 adds that exclusion.

- **Pure-function run (chess.js only, scratch vitest, deleted after):** `royalDefenderTarget(after vc-_JQ-AH3OYQ4-15, 'w')` → null and `attackerDefenderCount` → [] on the same board (quiet guard board).

## H. Open questions
1. none
