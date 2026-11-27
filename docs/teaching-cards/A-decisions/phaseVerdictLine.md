# phaseVerdictLine — taking stock at a phase change

## A. Identity
- `src/services/reviewPositionalAssessment.ts:301` `phaseVerdictLine(fen, student, studentPovCp, phase, heard, lastMove)`; keys `phaseVerdictKeys` :360, say-once `phaseStockKey` :297. Reads `assessPositionalEdge` (via `freshAssessment` :367).
- Registry `phaseVerdict` `boardComputers.ts:2005-2017`, kind `stock`, claim `phase:<phase>`, LIVE_READ + review. Census 14/14 (review).

## B. Facts
- B1: one string: "Taking stock as the middlegame begins: you're clearly worse, because they're up a piece. … On their side, … It isn't enough."
- B2 dropped: the assessment object (verdict, reasons, counter, keys) behind the sentence.
- B3 cheap: n/a — it is a phase event, not a move fact.
- B4: once per phase per game (`heard` has `phase-stock:<phase>`); verdict and ≥ 1 fresh reason.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | no | | a balance sheet |
| CONSEQUENCE | no | | |
| BETTER MOVE + JOB | no | | |
| HABIT | no | | |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON | CONSEQUENCE | BETTER | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PV1 | strategize at a phase change | both | phase event | assets | "At the start of a middlegame, the plan comes from the assets: {assets} say {plan}." | | | | not a mistake turn → silent in the new Learn; Review keeps it | | H |
| PV2 | mistake on the phase boundary | both | the move that changed the phase was a mistake | | n/a — the cause's lesson speaks; the balance sheet would be a restatement | | | | silent | | — |
| — | every other angle | — | n/a — no move or mistake fact | | | | | | | | |

## E. Mistake link
- None — "Review/chat only".

## F. Build changes
1. Learn: remove the `phaseVerdict` read from Learn's live composer (LIVE_READ) — it is not a mistake turn.
2. Return the assessment typed for Review's PV1 (the plan join is family F's).

## G. Proof boards
- Review lines: "Taking stock as the middlegame begins: it's level. Your king is tucked away and theirs is still in the centre." (computer-map-raw sample).
- Not run in the scratch (phase events come from the walk).

## H. Open questions
- None.
