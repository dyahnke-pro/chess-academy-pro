# CARD — `openingEquivalence` (which opening you are in now)

## A. Identity
`src/services/openingEquivalence.ts:163` `openingEquivalence(history, student)` → `OpeningEquivalence | null` (memo, `computeEquivalence`); offline index `openingPositions`. Census 52/31 (Learn), kind `equivalence`.

## B. Facts
- **B1** "Your d5 transposes into the Queen's Gambit Declined." / "Take back your Bc4 and their …Nc6 and this is the Philidor Defense…" / "Turn the board around and it is the King's Indian Attack…".
- **B2 dropped:** none relevant.
- **B3 cheap:** none for mistakes — a transposition is knowledge, not a mistake cause. The one mistake link: a transposition INTO a line where the student's move order is a known slip (knownSlip / openingSlip own it).
- **B4 gates:** opening phase; not inside the board's own named family; index loaded.

## C. Readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | n/a | — | not a mistake lesson |
| CONSEQUENCE | n/a | — | — |
| BETTER MOVE + JOB | n/a | — | — |
| HABIT | n/a | — | — |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| EQ1 | knowledge (transposition) | S/O | any | | "Different move orders reach the same position: knowing which opening you're in tells you its plans." | | | | silent in Learn mistakes-only; Review Theory button | not a mistake | H |

All other angles: n/a — a transposition attaches to no mistake cause.

## E. Mistake link
None — Review/chat only.

## F. Build changes
1. Learn mistakes-only: no line (31 Learn lines today). Keep for Review's Theory button.

## G. Proof boards
- Census: `boards-2.jsonl:72` (vc-_sp6jBv0EWA-4) "Your d5 transposes into the Queen's Gambit Declined."; `boards-1.jsonl:2862` reversed-colours case.

## H. Open questions
1. Same as openingTheoryFacts H1 (theory in Learn).
