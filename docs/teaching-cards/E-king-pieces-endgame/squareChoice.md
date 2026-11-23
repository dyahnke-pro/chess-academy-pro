# Card — `squareChoice` (why that square for the piece)

## A. Identity
- `src/services/weighedMoves.ts:1524` `squareChoice(args)`; helpers `faultsOn` (:1456), `hangsAfter` (:1436), `pawnKick`, `blocksOwn`, `squareIsSound` (:1488), `eyeRead` (the human eye's share per move). Registry `boardComputers.ts:3622` (kind `contrast`). Both seats; Learn passes `namesStudentMoves: false` (the "Why {to}…" stem is dropped there, :1610-1612).
- Census: 255 fired / 234 said (one of the busiest teachers in this family).

## B. Facts
- **B1** `SquareChoice` (:1494): `piece`, `to`, `faults[]` (`SquareFault`: `square`, `kind` `hangs` / `kicked` / `blocks` / `refuted`, `squares`, `text`), `text`, `squares`, `key`.
- **B2 dropped**: `playedCp` (:1550) and each sibling's `read` cost (:1573-1576) — the engine's price of each other square; `eye` share per sibling (:1564) — how tempting each square was; the reason the function returns null when the BETTER move moves the same piece elsewhere (:1559-1560: "has no answer but 'it was not the square'") — exactly the mistake turn.
- **B3 cheap**: the MISTAKE inverse — when `beaten` moves the same piece to another square, run `faultsOn(fenBefore, played, …)` on the PLAYED square (it is already computed as `playedFaults`, :1549) and `squareIsSound(fenBefore, beaten)` on the better square: "the knight went where a pawn kicks it; e5 was safe".
- **B4 gates**: knight or bishop, not a capture (:1544); not when the better move puts this piece elsewhere (:1559) or a read shows another square ≥50cp better (`INACCURACY_CP`, :1561); siblings ≥ `SIBLING_SHARE` of the played square's eye share (:1567); a sibling the engine reads no worse is no fault (:1574); `refuted` only at cost ≥ `TEMPTING_COST_CP`=100 with a named reason (:1576-1581); a kick counts only on a square at least as natural (:1589).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | "Why that square for your bishop? On b5 it would be kicked by their c-pawn." — a contrast with a computed fault, but it explains a GOOD choice | the rule form ("A piece a pawn can kick has to move again") and the mistake form |
| CONSEQUENCE | partly | the fault text (hangs / kicked / blocks / runs into X) | — |
| BETTER MOVE + JOB | no | — | on the mistake inverse: the better square + `squareIsSound` |
| HABIT | no | — | record `misplaced-piece` / `tempo-handed` |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SQ1 | KNOW (kicked) | S mistake inverse | played square has `kicked`, `beaten` same piece elsewhere, cost | piece, pawn | "A piece that a pawn can kick has to move again, and the tempo is theirs: their {pawn}-pawn hits your {piece} there." / "Put a piece where no pawn can chase it." | "They gain a move pushing the pawn." | "{best} put the {piece} on {sq}, where no pawn reaches it." (once past) | "Before you place a piece, check which pawns can kick it there." | "Their {pawn}-pawn can kick your {piece} there." (no square of the student's move) | not the student's move | C inverse |
| SQ2 | KNOW (blocks own) | S inverse | `blocks` on the played square | — | "A piece that blocks your own bishop costs you two pieces' worth of activity." | "Your {bishop} has no diagonal now." | "{best} left the diagonal open." | "Before a move, ask which of your own pieces it gets in the way of." | "That blocks your own {bishop}." | — | C |
| SQ3 | CONSEQ (hangs) | S inverse | `hangs` on the played square | — | "A square is only good if the piece is safe there: count attackers and defenders on it first." | — | "{best} was the safe square." | "Count who attacks and who defends the square before you go there." | "Your {piece} is loose there." | errorWhy already names the hanging piece (subsume — same claim) | C |
| SQ4 | CONSEQ (refuted) | S inverse | `refuted` | — | as SQ3 with the named reply | "{reply} wins {x}." | — | — | — | — | C costReason |
| SQ5 | STRAT (good choice) | S | today's fire | — | Review only: "On b5 it would be kicked by their c-pawn" — the reason the played square was right | | | | silent in Learn (no mistake) | | H |
| SQ6 | seat O | O | their misplacement with cost | — | "Their {piece} went where your {pawn}-pawn kicks it: push it and gain the move." | — | — | — | after their move: "Their {piece} can be kicked by your {pawn}-pawn." (pawn push held? it names the student's move → held form "a pawn of yours can kick it") | namesStudentMove | C |
| — | phase | — | any; queens/kings excluded by the N/B gate | | | | | | | | |
| — | record | — | RED/GREY full · AMBER one clause · GREEN silent | | | | | | | | |

## E. Mistake link
- Student: `positionalReason` `misplaced-piece` (`positionalReason.ts:203-205`, activity gap) and `bestJobReason` "The knight belonged on e5" (:223) → SQ1/SQ2; `whyItFailed` `lost-the-piece` / costReason allowed on the moved piece → SQ3/SQ4 (the errorWhy line leads; SQ is the habit).
- Opponent: SQ6.

## F. Build changes
1. `weighedMoves.ts:1559` — instead of `return null` when `beaten` moves the same piece elsewhere, return `{ mode: 'misplaced', playedFaults: faultsOn(played), better: { to, sound: squareIsSound(fenBefore, beaten) } }` as typed fields (the computation exists, :1549).
2. Expose `playedCp` and each sibling's `cost` (`SquareFault.costCp`).
3. Recipes SQ1–SQ4, SQ6 → `mistakeLesson.ts` (causes `positional:misplaced-piece`, `positional:tempo-handed` when the kick gains their tempo). Today's contrast text stays as Review's good-move reason (SQ5).

## G. Proof boards
- SQ5 (today): `lines-0.jsonl#27` "Why that square for your bishop? On b5 it would be kicked by their c-pawn."; `lines-0.jsonl#90` "On e3 or d2 it would block your dark-squared bishop."
- SQ6 shape: `lines-0.jsonl#72` (their knight: "On h5 it would be kicked by your g-pawn").
- SQ1: owed — needs F.1; candidates are student N/B moves graded mistakes in `g-*.jsonl` where best moves the same piece.

## H. Open questions
- SQ6 names the student's next move (the pawn kick) — held form "a pawn of yours can kick it" OK?
