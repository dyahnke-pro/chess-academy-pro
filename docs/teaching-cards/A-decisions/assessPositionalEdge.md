# assessPositionalEdge — the verdict word and the itemised assets

## A. Identity
- `src/services/reviewPositionalAssessment.ts:88` `assessPositionalEdge(fen, studentWB, studentPovCp, lastMove)` → `PositionalAssessment { verdict, reasons, reasonKeys, reasonSquares, counter, counterKeys }`; asset list `assetsFor` (:156: material, king tucked vs centre, frozen piece, bishop pair, open file, isolated, doubled, passer, development lead); the one ladder `verdictBand` :79; renderer `positionalVerdictLine` :380.
- Registry `positionalVerdict` `boardComputers.ts:2058-2074` (Review facet) and `takeStock` :4702-4716 (≥ 2 reasons). Census 876 fired / 0 said (708 held `unsupported`, 117 `in-flux`).

## B. Facts
- B1: verdict word + reason strings + keys (`<side>-iso-<file>`, `file-<f>`, `<side>-bishop-pair`, …) + squares; counter (the other side's assets).
- B2 dropped: the keys are typed but the KIND is inside a string key; weights none.
- B3 cheap: assets before vs after the move (same function on fenBefore) → the asset the move CREATED or GAVE UP (e.g. `file-d` gained, `bishop-pair` lost) — that diff is a consequence.
- B4: verdict from the eval band; reasons from the favoured side (:111-119); quiet "balanced" with no reason skipped in the opening (registry :2062).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | no | | a list of assets |
| CONSEQUENCE | partly | reasons | only as the DIFF before/after (B3) |
| BETTER MOVE + JOB | no | | |
| HABIT | no | | |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON | CONSEQUENCE | BETTER | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| AE1 | consequence (asset given up) | both | mistake; an asset key of the mover present before and gone after (B3), e.g. bishop pair, open file | asset | — (cause leads) | "And it gives up {asset}." | | | CONSEQUENCE slot | key diff, not presence | C |
| AE2 | consequence (asset handed over) | both | an asset key for the OTHER side appears after | asset | | "It hands them {asset}: {reason}." | | | | | C |
| AE3 | knowledge per asset | both | AE1/AE2 key kind | kind | bishop-pair: "Two bishops are strongest in an open position." iso: "An isolated pawn needs a piece to guard it." file: "Rooks belong on open files." passer: "Passed pawns must be pushed — or blockaded." | | | | lesson only with AE1/AE2 | | H |
| AE4 | stock list | — | today | | n/a in Learn (board statement) · Review keeps `takeStock` | | | | silent | | — |
| — | other angles | — | n/a | | | | | | | | |

## E. Mistake link
- CONSEQUENCE-slot supplier for errorWhy `positional` (E15) turns only; AE3 knowledge rides AE1/AE2; AE4 Review only.
- positionalReason `pawn-weakened` (iso/doubled keys), `file-opened` (file key), `piece-offside` (frozen piece); a "bishop pair given up" cause (shared with tradeJudgement, family B).

## F. Build changes
1. Return typed `assets: { kind, side, squares }[]` (from the keys) instead of only strings.
2. New `assetDiff(fenBefore, fenAfter, student)` (B3) — the CONSEQUENCE feed for AE1/AE2.
3. Registry rows stay Review-only; no Learn surface for the list.

## G. Proof boards
- Pure run: 109 mistake boards with ≥ 1 reason. g:1001055178#46 O `…f5` loss 174 → ["they're up two pawns", "your pawn on a2 is isolated", "their passed pawn on c6"] — standing state, not caused by …f5 → AE4 silent (guard). g:1001055178#48 O `…Rdc8` loss 131 → "balanced", ["you own the open d-file"] — the d-file was given up by …Rdc8 → AE2 candidate (verify the diff at build).

## H. Open questions
- None.
