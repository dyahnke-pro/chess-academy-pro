# CARD — `openingTheoryFacts` (main move, alternatives, reply, score)

## A. Identity
`src/services/openingTheory.ts:85` `openingTheoryFacts(fenBefore, san, mine)` → `TheoryFact[]` (`:36`: `kind: 'book-standing'|'book-alternatives'|'book-reply'|'book-score'`, clause, sentence, squares, names); `readBoard :50` (masters' table, `masterMovesCachedSync`), `aimOf :71` (= `moveJob` clause). Thresholds `THEORY_MIN_GAMES 40`, `MAIN_SHARE 15`, `ALT_SHARE 10`, `RARE_SHARE 5`, `SCORE_EDGE .05`, `SCORE_MIN_GAMES 100` (`:20-32`). Census 823 offered / 579 said (Learn only), kinds book-reply 270, book-alternatives 250, book-standing 177, two-jobs 126. Verdict "S (popularity, no idea)" — the largest stating producer in this family.

## B. Facts
- **B1** standing ("It's the main move here — masters almost always play it"), alternatives with aims ("Masters also play b3 here, which covers c4…"), reply ("Masters almost always answer with …Nf6"), score.
- **B2 dropped:** `pct`, `games`, `score` numbers (words only), the alternative's aim reasons when deduped (`aimKey`).
- **B3 cheap:** the one MISTAKE shape here is **the student left the masters' moves and it cost** ("leaves the masters' moves — X is the main move", `:109`) — that is `openingSlip`'s job (its own card) with the why. Everything else is a description of a good move.
- **B4 gates:** as the constants above.

## C. Readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | no | — | popularity is not a lesson (CLAUDE.md "A REASON, NOT A STATISTIC") |
| CONSEQUENCE | no | — | — |
| BETTER MOVE + JOB | partly | book-standing "X is the main move" + `aimOf` | the job (from moveJob) is the only teaching part |
| HABIT | no | — | — |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| OT1 | theory (left book, cost) | S mistake | book-standing "leaves the masters' moves"/"sideline" AND cost ≥ mistake | main move + aim | → openingSlip OS rows (the why is the board's, not the share) | | "Nf6 was the main move — it develops and hits e4." (aimOf) | | same, after the move | never the share as the reason | H |
| OT2 | good book move | S/O | main/alternative/reply/score on a non-mistake | | silent in Learn mistakes-only; Review's Theory button keeps it (CLAUDE.md §OPENING THEORY) | | | | silent | | H |
| OT3 | both seats | O mistake | their sideline cost | | → theirOpeningVerdict | | | | | | — |

## E. Mistake link
Only through `openingSlip` / `theirOpeningVerdict` (book departure that cost). Popularity lines attach to no mistake → Review/Theory button only.

## F. Build changes
1. Learn mistakes-only: openingTheoryFacts says nothing in Learn (579 Learn lines today, all on non-mistakes); CLAUDE.md "keep in Learn for now" (David 2026-11-06) is superseded by WO-LEARN-MISTAKES-ONLY — **owner call H1** before deleting.
2. Its `aimOf` (moveJob clause of the book move) is the BETTER-move job source for openingSlip; keep that export.

## G. Proof boards
- Census: "Their e5 is one of the main moves here, beside …c5." (`boards-0.jsonl:1820`); "Masters also play b3 here, which covers c4, where the pawn to c4 would hit your bishop on d3." (`lines-0.jsonl:575`); "They go Nc6, which is a sideline — masters rarely play it, and …c5 is the main move." (`boards-1.jsonl:2758`).

## H. Open questions
1. CLAUDE.md keeps theory lanes in Learn "for now"; the mistakes-only goal removes them. Remove all Learn theory lines, or keep only the departure-with-cost (OT1)?
