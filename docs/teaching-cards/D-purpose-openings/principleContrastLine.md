# CARD — `principleContrastLine` (the rule the better move kept)

## A. Identity
`src/services/moveFundamentals.ts:1809` `principleContrastLine(fenBefore, san, bestSan, mover, taughtIds, stemKey)` → `{id, text, squares, first, names: null}`. Census 10/10 (Review), kind `rule`.

## B. Facts
- **B1** "The opening rule in this spot is to castle your king to safety and bring the rook toward the center, with O-O. A king left in the middle gets caught the moment the center opens." / "The opening move here was Bd2 — it completes your development".
- **B2 dropped:** the lead fundamental's id/weight (in `id` only); `played` fundamentals list (`:1820`) — the played move had NO opening principle (that is the condition).
- **B3 cheap:** none needed — it already is the mistake lesson shape (rule + reason + better move). Cheap extra: allow it on a costly move even when the played move had SOME principle (a weaker one) — use the fundamental delta.
- **B4 gates:** bestSan ≠ played; opening window open (`:1816`); not a forced reply; played move applies no opening principle (`:1821`); full rule once (`taught`) else short "The opening move here was X — it …".

## C. Readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | **yes** | `imperative` + `reasonFor` | — |
| CONSEQUENCE | yes | reason | — |
| BETTER MOVE + JOB | **yes** | best + `led` | names the better move: only once past |
| HABIT | partly | | — |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PC-1 | knowledge (opening rule) | S mistake | errorWhy positional cause in the opening AND principleContrastLine non-null | rule | "In the opening, [rule imperative]. [reason]." (rotated, `:1832-1835`) | | "[best] did it." | "Before each opening move, ask: does it develop, castle or fight for the centre?" | the rule without the move while it is still playable; with the move once past | opening window; not when a material cause exists | H |
| PC-2 | both seats | O mistake | their opening rule broken | | Review only | | | | silent | | H |

## E. Mistake link
errorWhy `positional` with tags `neglected-development`, `king-stuck-center`, `space-conceded`, `no-plan` in the opening (S seat). On David's 109 costly moves it fired on 10 (e.g. Bxf7+ → O-O rule; …Qf6 → Nf6 develop rule).

## F. Build changes
1. Allow it with a fundamental delta (played had a weaker principle) — `played.length` test (`:1821`) → compare weights.
2. Learn: its Learn variant holds the better move while `pastBetterNameable` is false (the rule alone).
3. Moves into `mistakeLesson` as the positional/opening recipe; the computer stops rendering two stems itself (recipes own the words).

## G. Proof boards (pure run, David's games)
- chesscom-1012441262 ply 9 Bxf7+ `r1bqk1nr/ppp1ppbp/2np2p1/8/2BPP3/5N2/PPP2PPP/RNBQK2R w KQkq - 2 5` → "The opening rule in this spot is to castle your king to safety and bring the rook toward the center, with O-O. A king left in the middle gets caught the moment the center opens." (guard: the material cause took-guarded leads; this is second clause at most).
- chesscom-1013773584 ply 10 …Qf6 `rnbqkbnr/ppp2pp1/3p3p/8/3PPp1P/5N2/PPP3P1/RNBQKB1R b KQkq - 0 5` → "Nf6 was the opening move here: develop into the game, fighting for the center on e4, attacking the pawn there. A piece left at home cannot join the fight…".
- Guard (middlegame at move 22): chesscom-1020779996 ply 43 b4 → "The opening move here was Bd2" (H1 of buildReviewMoveTeachingFact).

## H. Open questions
1. Opening window by board (minor at home) vs by move number for "the opening rule" wording at move 20+?
