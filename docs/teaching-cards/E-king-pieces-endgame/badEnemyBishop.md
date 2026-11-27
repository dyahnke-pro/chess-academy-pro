# Card — `badEnemyBishop` (their bishop hemmed in by its own pawns)

## A. Identity
- `src/services/reviewTeachingPoints.ts:235` `badEnemyBishop(fen, studentColorWB)` → string | null; uses `bishopHemmedByOwnPawns` (the one bad-bishop ray read). Registry `boardComputers.ts:~4509` `badBishop` (entry ends `:4517`) (kind `badbishop`), `squares: []`, with an imagery line ("A walled-in bishop bites rock."). Theirs only. `theirWorstPiece.ts:31` defers to it.
- Census: 42 fired / 9 said. Held: already-said 18, **unsupported 12**, beside-mate 3.

## B. Facts
- **B1**: sentence only ("their bishop on b7 is a bad piece — hemmed in behind its own pawns on the same colour, with almost nowhere to go").
- **B2 dropped**: `c.square`, `light`, `ownPawnsSameColour` (≥4, :251), the blocking pawns of `bishopHemmedByOwnPawns`.
- **B3 cheap**: `blockers` — their pawns on the bishop's forward rays; `fixedBy` — which of the student's pawns fix them (a student pawn directly in front); the MISTAKE trigger: the student's move (a) traded it / offered it, (b) let a blocker move (a student pawn exchange that unfixes), (c) the student's OWN bishop is the bad one (same read, student colour — missing seat).
- **B4 gates**: move ≥12 (:243); not on its home square (:250); ≥4 own pawns on its colour (:252); forward rays hemmed (:254).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | "hemmed in behind its own pawns on the same colour" + imagery — a definition | rule lead / plan |
| CONSEQUENCE | partly | "almost nowhere to go" | which squares it lacks |
| BETTER MOVE + JOB | no | — | errorWhy better move |
| HABIT | no | — | record (bad-trade / created-pawn-weakness) |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BB1 | STRAT (traded it) | S | read true on fenBefore, the student's costly move took it / offered a trade | bishop sq | "A bad bishop is a gift to the side facing it: trade their good pieces, not the bishop on {sq} stuck behind its pawns." | "Their good pieces are the ones left." | "{best} kept it on the board." | "Before a trade, ask whose piece is worse." | "Their bad bishop was the piece to leave on the board — that trade took it off." | the trade wins material | C trigger (shared with theirWorstPiece TW1 — one claim) |
| BB2 | STRAT (unfixed) | S | student's pawn move unfixed a blocker (blocker can now move) with cost | — | "Keep their pawns fixed on their bishop's colour: a pawn that can move frees the bishop." | — | "{best} kept the pawns fixed." | "Keep their pawns on their bishop's colour." | "That let a pawn in front of their bad bishop move — the bishop breathes again." | no blocker freed | C fixedBy |
| BB3 | KNOW (own bad bishop) | S own | same read for the student's bishop + positional cost | — | "A bishop behind its own pawns on its own colour is a tall pawn: move the pawns off its colour, or trade it." | — | "{best} moved a pawn off the bishop's colour." (once past, only when errorWhy's better move is that pawn move or the bishop trade) | "Put your pawns on the other colour from your bishop." | "A bishop behind its own pawns is a tall pawn — yours on {sq} is shut in." | home square | C mirror |
| BB4 | KNOW (exception) | both | the bad bishop attacks/occupies a hole of its own side (`findWeakSquares` / `campHoles`, chess.js on the same board) — a guard on BB1 (never trade-advice when true) | hole | "A bad bishop can still be a good defender: don't trade it if it holds your weak squares." | | | | | | C (pilot card row) |
| — | phase | — | move ≥12; in endings bad bishop matters more (BB3 rule holds) | | | | | | | | |
| — | record | — | RED/GREY full · AMBER "That was their bad bishop." · GREEN silent | | | | | | | | |

## E. Mistake link
- Student: trade cause (readTrade/bad-trade) → BB1; `positionalReason` `tempo-handed` (frees their bishop, `positionalReason.ts:195`) → BB2; `positionalReason` `misplaced-piece` / `created-pawn-weakness` for the student's own → BB3.

## F. Build changes
1. `reviewTeachingPoints.ts:235` — return `{ square, ownPawnsSameColour, blockers, seat }`; take `who` so both colours are read (BB3).
2. `boardComputers.ts:4514` — `squares: [square, ...blockers]` (fixes 12 unsupported); claim shared with theirWorstPiece.
3. Recipes BB1–BB3 → `mistakeLesson.ts`; the imagery line is Review/lesson only.

## G. Proof boards
- `lines-0.jsonl#233` ("Their bishop on b7 is a bad piece…", held unsupported — F2); `lines-0.jsonl#892` (imagery).

## H. Open questions
- None.
