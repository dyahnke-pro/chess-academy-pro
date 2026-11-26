# knightSquareTaken — card

## A. Identity
- `knightSquareTaken(fenBefore, san, mine, costCp)` — `src/services/knightSquareTaken.ts` (58 lines; `HOME` :18 c3→b1, f3→g1, c6→b8, f6→g8).
- Board computer `knightSquareTaken` — `src/services/boardComputers.ts:2645-2664`, kind `principle`, phase NOT_ENDING, role `teach`; lesson via moveThoughtFacts.
- Already mistake-only: returns null below `INACCURACY_CP` (`costCp < INACCURACY_CP`, :32).
- Census: 2 fired / 2 said (lesson).

## B. Facts
### B1. Handed over
`pawnSquare`, `knight` (home square), `roads` (squares it can still come out to), `clause`, `squares`.
### B2. Dropped
- Whether the knight's remaining roads are GOOD (a3/d2 edge/blocking squares vs a centre square) — only listed.
- What the knight on its natural square would have done (c3 hits d5/e4) — the cost.
### B3. Cheap
- The bishop or pawn the alternative road blocks (Nd2 blocks the c1 bishop) — chess.js: does the road square sit on a friendly bishop's diagonal / in front of a pawn.
### B4. Gates
Pawn single push to c3/f3/c6/f6 with the knight still on its home square; cost ≥ inaccuracy; not an ending.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | "takes f6 from their knight, its natural square" | rule ("don't put a pawn on your knight's best square") |
| CONSEQUENCE | yes | roads ("has to come out by a3 or d2" / "no square") | road quality (B2/B3) |
| BETTER MOVE + JOB | no | — | errorWhy best |
| HABIT | no | — | "Before a pawn move in the opening, ask which piece's square it takes." |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| KS-1 | knowledge (development) | S mistake | fires (cost ≥ inaccuracy, student mover) | pawnSquare, knight, roads | "A knight's natural square in the opening is in front of its bishop's pawn (c3/f3, or c6/f6 for Black) — a pawn there leaves it nowhere good. The pawn on c3 took the b1 knight's square." / "Don't block your knight's natural square with a pawn." | "Now it has to come out by a3 or d2." (+ B3: "and d2 blocks your bishop") | errorWhy best ("Nc3 was the move — the knight's own square") | "Before a pawn move in the opening, ask which piece's square it takes." | Learn: "That pawn took your knight's natural square — now it has to come out by the edge." (the pawn's square, which IS the move just played, is not named) | the system plays c3 on purpose (Caro/London structures) — errorWhy cost says it's a mistake anyway | H + C |
| KS-2 | their mistake | O | fires with mine=false | same | "Their pawn on f6 took their own knight's square — the g8 knight has nowhere good to go." | "They're slow to develop." | n/a | | after THEIR mistake | — | H |
| KS-3 | strategize | both | roads empty | — | "A knight with no square out is a piece out of the game." | | | | | — | H |
| KS-REC | record | — | development skill tag | | RED/GREY full; AMBER "That pawn took the knight's square."; GREEN silent | | | | | | holdRate |
n/a: tactical angles (calculate/count) — a development principle; phase: opening only (NOT_ENDING; middlegame rare).

## E. Mistake link
- positionalReason (development / tempo) concession — not a material costReason. Seat S (KS-1) and O (KS-2). Belongs with the principles family; listed in tactics as "trapped piece". 

## F. Build changes
1. knightSquareTaken.ts — add `roadQuality: {square, rim: boolean, blocks: 'bishop'|'pawn'|null}[]` (B3) → KS-1 consequence.
2. Recipe `knight-square-taken`; `clause` deleted.

## G. Proof boards
- Text (lines-0, lesson): "Their …f6 takes f6 from their knight on g8, its natural square, and it has no square to come out to now." (KS-2); lines-2: "Your move blocks c3, the natural square of your knight on b1, so it has to come out by a3 or d2." (KS-1).
- Guard: cost < inaccuracy → null (gate).

## H. Open questions
1. none
