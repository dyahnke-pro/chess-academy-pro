# CARD — `computeMoveFundamentals` (which fundamental a move serves)

## A. Identity
`src/services/moveFundamentals.ts:350` `computeMoveFundamentals(fenBefore, san, mover)` → `MoveFundamental[]` (`:116`: `id: MoveFundamentalId, weight, led, selfContained, imperative, pointer, squares, forcing?, names?`); `reasonFor(lead)` (`:1533`, not exported — the rule's "why it matters"), `reasonHolds`, `IS_OPENING_PRINCIPLE`, `REPEAT_TEACHES`, `FUNDAMENTAL_IDEA` (`ideaKind.ts:40`). Ids (grep): remove-guard, attack-defender, center, development, development-complete, keep-working, king-activity, king-safety, luft, open-diagonal, open-file, outpost, passed-pawn, pile-on-pin, prepare-break, promotion, prophylaxis, queen-off-file, rook-behind-pawn, space, tempo. Census 1649 offered / 651 said (lesson 1438, review 211), verdict "P/S ('stakes out the center')"; 777 dropped already-said.

## B. Facts
- **B1** each fundamental with four renderings (led / selfContained / imperative / pointer) and its weight.
- **B2 dropped:** the rule's REASON (`reasonFor`) only rides with `principleLine`; the `imperative` (a lesson form that names no move!) is used only by the ranked briefing and pointers; `weight` vs other ids dropped at the composer.
- **B3 cheap:** the DIFFERENCE between the better move's fundamentals and the played move's = what the mistake gave up. Pure run on David's 109 costly moves: best-not-played most common: center 14, tempo 10, open-file 9, outpost 6, development 5, keep-working 5, space 4, passed-pawn 4, king-safety 3, open-diagonal 3.
- **B4 gates:** empty when the piece hangs on its square (recapture-safety guard); `openingWindowOpen` (`:329`) decides opening ids.

## C. Readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | **partly** | `imperative` + `reasonFor` ("A piece left at home cannot join the fight, and whoever has more pieces out wins the fights when the center opens") | used on good moves only |
| CONSEQUENCE | partly | reasonFor | — |
| BETTER MOVE + JOB | yes | `led` on bestSan | — |
| HABIT | no | `pointer` close | — |

## D. Lesson recipes (keyed on the fundamental the BETTER move had and the played move lacked)
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| F1 | development | S mistake | delta has development / development-complete, opening, positional cause | | "A piece left at home can't fight: whoever has more pieces out wins when the centre opens." (`reasonFor`) | | `led` on best | "Count your pieces at home." | same | `reasonHolds` | H |
| F2 | king-safety / luft | S mistake | delta king-safety/luft | | "Castle before the centre opens." / "Give your king a square before it needs one." | | | | same | | H |
| F3 | center / space | S mistake | delta center/space AND positional `space-conceded` | | "Pieces behind a strong centre reach either wing in a move." | | | | same | never on a material cause | H |
| F4 | open-file / rook-behind-pawn / queen-off-file | S mistake | delta, positional `passive-rook` | | "Rooks belong on open files." / "Rooks go behind passed pawns." | | | | same | | H |
| F5 | outpost | S mistake | delta outpost | | "A knight on a square no pawn can hit is worth a rook in some positions." | | | | same | | H |
| F6 | remove-guard / attack-defender / pile-on-pin | S mistake | delta, errorWhy missed-win | | "Take away the guard, and what it guarded falls." / "Pile up on a pinned piece: it can't run." | | | "Ask what each of their pieces is guarding." | same | | H |
| F7 | passed-pawn / promotion | S mistake | delta, endgame | | "Passed pawns must be pushed." | | | | same | endgame | H |
| F8 | tempo | S mistake | delta tempo | | (pieceTempo T1) | | | | | | — |
| F9 | keep-working | S | delta keep-working | | "Keep your pieces doing a job: a piece that stops guarding gives them a target." | | | | same | | H |
| F10 | prophylaxis | S | delta prophylaxis | | (findProphylaxis P1) | | | | | | — |
| F11 | both seats | O mistake | their fundamental miss | | Review only (their positional slip is not the student's lesson unless it creates a chance) | | | | silent in Learn | | H |
| F12 | king-activity (endgame) | S mistake | delta king-activity, endgame phase, positional `passive-king-endgame` | king | "In the endgame the king is a fighting piece: bring it toward the centre and the pawns." | | `led` on best ("Kf2 heads for the centre") | "When the queens come off, ask: where is my king going?" | same | endgame only (`phaseOfFen`) | H |
| F13 | open-diagonal | S mistake | delta open-diagonal (a pawn move that frees a home bishop), opening, positional `neglected-development`/`misplaced-piece` | bishop | "A bishop behind its own pawns is a tall pawn: open its diagonal before you need it." | | "d3 opened the c1 bishop's diagonal." | "Ask whether each bishop can see out." | same | the freed bishop must be on its home square | H |
| F14 | prepare-break | S mistake | delta prepare-break | | (breakPrep BP1 owns the lesson; this id only selects it) | | | | | | — |

## E. Mistake link
errorWhy `positional` (all tags) — the delta picks the lesson when the cost is the position (52% of live costly moves on David's record had no material cause).

## F. Build changes
1. Add `fundamentalDelta(fen, playedSan, bestSan): MoveFundamental[]` (best minus played, sorted by weight) — input to the positional recipe.
2. `reasonFor` exported per id (it is the LESSON stem source; keep the rotated stems in `mistakeLesson`, not here).
3. Learn: delete good-move fundamental lines ("They go Bg2, which develops into the game", 1,438 lesson lines).

## G. Proof boards
- Pure run deltas on David's 109 (see B3). Example F1: chesscom-1013773584 ply 10 …Qf6 (O) `rnbqkbnr/ppp2pp1/3p3p/8/3PPp1P/5N2/PPP3P1/RNBQKB1R b KQkq - 0 5` → best Nf6 development (principleContrastLine said "Nf6 was the opening move here: develop into the game…").
- F2: chesscom-1012441262 ply 9 Bxf7+ → best O-O king-safety (but cause took-guarded leads — guard: positional delta is second).

## H. Open questions
1. When a material cause exists, is the fundamental delta ever said as a second clause (e.g. Bxf7+: lost the bishop AND didn't castle)?
