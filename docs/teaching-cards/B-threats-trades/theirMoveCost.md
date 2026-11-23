# theirMoveCost — what their move gave up

## A. Identity
- File: `src/services/theirMoveCost.ts` (161 lines), `theirMoveCost(fenBefore, san, studentColor)` (66–161); helpers `knightRoute` → `minorRouteToSquare` (35–38), `bishopMobility` (40–55); calls `isOutpost`, `concessionParts`.
- Registry: `boardComputers.ts` `theirCost` (5843–5859), kind `their-cost`, seat `opponent`, one claim per hole (`holeKey`), a `heldForm` (no knight hop) for the hole kind.
- Reach: learn door, review, lesson, chat, tapped, tactics. Census: 78 lines (71 said); held 3 `already-said`, 2 `same-idea`, 2 `beside-mate`. Run: 53 fires (32 on their moves; 21 when called with the seats swapped on the student's move — the computer is seat-symmetric, the registry only calls it for their move).

## B. Facts
- **B1** `TheirMoveCost` (16–23): `kind` hole | bishop-shut | castling | structure, `text`, `heldText?`, `squares` (the hole + the knight + the hop; the bishop + the pawn; king from/to; the pawn).
- **B2 dropped:** the knight route's `via` square is in `squares` but its length ("one jump / two") is the only thing said; `bishopMobility` before/after (101) — the numbers ("from 5 squares to 1") dropped; `concessionParts` returns a LIST and the registry keeps the joined text — the kind of each part (king-cover is filtered out, 156); only the FIRST cost is returned (each branch `return`s) — a move that makes a hole AND shuts a bishop says one.
- **B3 cheap:** the cost the engine put on the move (every caller has the read; not an input) — needed so a cost is said only when it is the mistake; the student-seat call (the same function with the seats swapped) for the student's own concession.
- **B4 gates:** null on the student's own turn (69); hole: a pawn move, a square newly an outpost (85), a student knight within 2 jumps (86); bishop: same colour, behind the pawn, mobility drop ≥ 3 and ≤ 1 left (118); castling: queens on, a non-castling king move with rights (127–133); structure: `concessionParts` minus king cover (156). No cp gate at all — it fires on cost-0 moves (run: g-1012441262 ply 10 …Kxf7 cost 0, the castling row).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | kind + squares | the lesson ("no pawn can ever guard it — a home for a knight") is half-said inside the board line |
| CONSEQUENCE | partly | hole: "your knight can jump in" | for bishop-shut / castling: what follows |
| BETTER MOVE + JOB | no | — | the move that kept it (needs the engine's best) |
| HABIT | no | — | — |

## D. Lesson recipes
Causes: **TC-O** their move cost ≥ floor for them and this computer names a cost (their mistake, said after the student's reply); **TC-S** the same function on the STUDENT's move (seats swapped) when the student's move cost ≥ floor and `positionalReason` did not already name it (capability parity: the concession that teaches theirs explains yours).

| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TC1 | knowledge (outpost) | O | TC-O, kind hole | hole sq, knight | "A pawn move can't be taken back: once no pawn can guard {sq}, it belongs to your knight for good." / "Every pawn push leaves squares behind — their {move} gave up {sq} for ever." | "Your knight on {from} gets there in {n} jumps." | — | — | after the student's reply; if the student's reply started the route, silent | the square is attackable by their minor next move (`isOutpost` false after) | H |
| TC2 | knowledge (outpost, own) | S | TC-S, kind hole | — | "A pawn push leaves a square behind for ever: {sq} is now a home for their knight." | "Their knight on {from} reaches it in {n}." | "{best} kept the pawn back." | "Before a pawn moves, look at the squares it stops guarding." | full; the move is "your pawn move" never by name | positionalReason 'space-conceded' fired (one cause) | C: seat-swapped call |
| TC3 | knowledge (bad bishop) | O / S | kind bishop-shut | bishop, pawn | "A pawn on its bishop's colour shuts the bishop in: the bishop on {b} has {n} squares left." | "It stays bad until the pawns change." | S: "{best} kept the diagonal open." | "Put your pawns on the other colour from your bishop." | full | — | H + C (mobility numbers B2) |
| TC4 | consequence (castling lost) | O / S | kind castling, cost ≥ floor | king | "A king that moves before castling has to find safety by hand, and that costs moves." | "Their rooks stay disconnected." | S: "{best} kept castling." | "Keep the right to castle until you've castled." | full | queens off (already) | H |
| TC5 | consequence (structure) | O / S | kind structure (isolani / passer granted) | pawn | "A pawn with no neighbours has to be guarded by pieces from now on: {pawn}." / "A passed pawn you hand them grows stronger as pieces come off." | — | — | — | full | the split is the end of a trade the engine likes for them (cost < floor) | H |
| TC6 | strategize (when it's worth it) | O | the cost fired but their move cost < floor | — | silent in Learn (not a mistake); Review: "It gives up {sq}, but it {gain}: a concession is fine when it buys something." | | | | Review only | | H + another computer's gain |
| TC7 | record | S | `holdState` on `misplaced-piece` / `space-conceded` / `king-stuck-center` tags | — | RED/GREY full · AMBER one clause · GREEN silent | | | | | | H |

Not applicable: calculate (no line), their plan (a cost is a static concession).

## E. Mistake link
- Opponent: their `positionalReason` concession (misplaced-piece / space-conceded / king-stuck-center) seen from the student's seat — TC1, TC3–TC5 (said after the student's reply, past tense).
- Student (TC-S, after F1): `positionalReason` **space-conceded**, **misplaced-piece** (bishop), **king-stuck-center** (castling) — this computer supplies the SPECIFIC square / bishop the generic note lacks ("A minor piece is still at home…" says no square).

## F. Build changes
1. Expose the student-seat call: rename to `moveCost(fenBefore, san, viewer)` returning `{ seat: 'mover-is-student' | 'mover-is-opponent', … }`; the registry `theirCost` keeps calling it for their move; `errorWhy` calls it for the student's move when `positionalReason` returns a concession tag, to fill the specific square.
2. Return ALL costs (`costs: TheirMoveCost[]`), not the first (each branch returns at 92, 119, 135, 157).
3. Add `mobility: { before, after }` for bishop-shut (B2, 101) and `jumps: 1 | 2` for the hole.
4. Gate the Learn use on the move's cost (≥ floor) in the recipe — the computer itself stays cp-free so Review can teach the concession on a cost-0 move as TC6.

## G. Proof boards (run)
- TC4: g chesscom-1012441262 ply 10 …Kxf7 `r1bqk1nr/ppp1pBbp/2np2p1/8/3PP3/5N2/PPP2PPP/RNBQK2R b KQkq - 0 5` → castling given up — cost 0 (guard: Learn silent, the king took a bishop).
- TC1: g chesscom-1018307238 ply 23 fxe3 (opponent = White) → "costs them e4 … your knight can jump straight in".
- TC2 (student seat, swapped call): g chesscom-1018307238 ply 44 …g5 (student Black) → "costs … f6" — cost 3 (guard: not a mistake, silent).
- TC5: g chesscom-1020779996 ply 57 bxa6 (student, cost 197) → isolated pawn on a6 (the student's own move: a TC-S candidate once F1 lands).
- Census: lines-0.jsonl:21 (bishop-shut said), lines-0.jsonl:648 (hole said with the knight hop — in Learn the hop is the student's next move, held).

## H. Open questions
- TC1 names the knight's route to the hole — in Learn after the student's move, is naming that route (a future move of the student's) allowed when the student did NOT start it?
