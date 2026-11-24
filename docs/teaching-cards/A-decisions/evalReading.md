# evalReading — the standing when the move changed it

## A. Identity
- `src/services/reviewMoveBriefing.ts:186` `evalReading(fenAfter, povBeforeCp, povAfterCp, swingCp, studentWB, lastMove, lines)`; reasons from `verdictWithReasons` (`verdictWithReasons.ts:305`, `ReasonKind` :41: material, king-shelter, king-centre, king-attack, activity, initiative, passer, bishop-pair, space, minor, weak-pawn, guarded-pawn); renderer `renderStanding` (`teachingSentence.ts:615`); sibling `standingRead` (board read, no move).
- Registry `standingRead` `boardComputers.ts:6483-6499`, kind `eval`, weight 45, claim `standing:<signedBand>`. Census 732/75 (601 held already-said — one standing claim).

## B. Facts
- B1: one string: "You're clearly worse — you're down a pawn, your isolated pawn on c5 is attacked once and nothing guards it." / "Roughly balanced."
- B2 dropped: the `VerdictWithReasons` object (`clauses`, `level`, `squares`, each reason's `kind` and `weight`) — only the rendered text leaves (:166-170); `swing` (:187); before/after bands.
- B3 cheap: the reasons on the board BEFORE the move (same `verdictWithReasons` on fenBefore) → the reason that is NEW after the move is the consequence of the move; a reason present on both boards is a restatement.
- B4: band changed (`signedBand`) or |swing| ≥ 40 (:189); reasons only those fitting the favoured side (:331-335).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | no | | an eval is not a lesson |
| CONSEQUENCE | partly | the new standing + its reason | the reason must be the one the MOVE created (B3), else it restates the board |
| BETTER MOVE + JOB | no | | |
| HABIT | no | | |

## D. Lesson recipes (CONSEQUENCE slot supplier)
| id | angle | seat | condition | slots | LESSON | CONSEQUENCE | BETTER | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ER1 | consequence (new reason) | both | mistake turn; band dropped; a reason kind new after the move (B3) | reason kind | — (cause's lesson leads) | "That leaves you {band}: {new reason}." e.g. "That leaves you clearly worse: their king is safe and yours is still in the centre." | | | after move, CONSEQUENCE slot | the reason must be new; no bare band ("Roughly balanced." never said) | C |
| ER2 | evaluate (result) | both | band crosses a result line (win→edge, edge→level) | bands | "Being better is not the same as winning. After this one you're only {b}." (band words, never numbers) | | | | | | H (bands) |
| ER3 | knowledge (eval ≠ promise) | both | — | | "The evaluation is a summary of what each side can do, not a promise." | | | | Review only (generic) | never in Learn alone | H |
| ER4 | restatement | both | reason present before and after | | n/a — silent (the student watched it) | | | | silent | | C |
| — | all other angles | — | n/a — a standing reader supplies consequence only | | | | | | | | |

## E. Mistake link
- CONSEQUENCE-slot supplier only (ER1/ER2 ride any errorWhy cause, mainly `positional` E15); ER3 Review only; ER4 silent.
- The CONSEQUENCE slot for every cause whose effect is positional (positionalReason kinds; result-shift); material causes already carry their consequence (ledger), so ER1 adds only non-material reasons (king-centre, passer, initiative…).

## F. Build changes
1. `reviewMoveBriefing.ts:186` return `{ band, side, reasons: VerdictReason[], newReasons: ReasonKind[] }` (B2+B3) — text stays for Review.
2. Recipe table's CONSEQUENCE uses `newReasons[0]`; a bare band is never spoken in Learn.
3. One standing claim (`standing:<band>`) already exists — keep.

## G. Proof boards
- Pure run, 125 mistake boards: 125 readings. g:1001055178#41 S `Kh1` loss 113 → "You're clearly worse — you're down a pawn, your isolated pawn on c5 is attacked once and nothing guards it." (c5 loose is NEW after Kh1 per contrastMoves → ER1 reason). g:1001055178#48 O `…Rdc8` loss 131 → "Roughly balanced." (bare band → ER4 silent).
- Danya vc-_WmByfLW-3g-16 ("You're slightly better — their knight on b8 hasn't moved and their bishop on g7 has one safe square, you're up a pawn.").

## H. Open questions
- None.
