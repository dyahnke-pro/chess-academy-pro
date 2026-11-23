# computeMoveFacets — Review's per-move facet basket (its own 'loose' and 'eval' lines)

## A. Identity
- `src/services/reviewFullData.ts:295` `computeMoveFacets(ctx, outVerdictReason)` → `ReviewFacet[]`. It is mostly an AGGREGATOR (calls `readBoard` for ~40 registry reads: plyFacts, moveInfluence, tradeJudged, boardTactics, positionalVerdict, contrast, timing, heldResource, bluff, principle…). Its OWN sentences: the eval-bar line (`'eval'`, :~738/:770) and the loose-piece line (`'loose'`, :~848 via `hangingLine`). Read by `coachFeatureService.ts` (Review). Census 85 fired / 16 said (50 held in-flux).

## B. Facts
- B1 own lines: eval — "The eval bar moves 1.2 your way — material changed hands …" / "A positional swing of 0.9 …: … the lines it opened and what it gave up"; loose — `hangingLine` ("Their bishop on c5 is hanging. Nothing guards it, so you can take it.") with `lostGuard` (a defender lost vs never had one).
- B2 dropped: `materialExplains`, `d`, `fired` (:723-760) — the reasons are facet TAGS ('does', 'delta', 'tactic'), not facts; `lostDefender` vs `newlyHit` split (:~838) only picks wording.
- B3 cheap: n/a — every fact here comes from another computer.
- B4: eval line on a good/book/null classification only, |d| ≥ 30 with material, ≥ 80 (`EVAL_FACET_MIN_CP` :285) positional with a fired reason; loose: minor or rook, newly loose vs the board before, winnable (`exchangeStakes`), not attacked by the mover.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | no | | eval/loose are board statements |
| CONSEQUENCE | partly | loose line ("They have to move it or guard it") | |
| BETTER MOVE + JOB | no | | |
| HABIT | no | | |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON | CONSEQUENCE | BETTER | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| MF1 | consequence (piece left loose, lost guard) | both | mistake turn; loose line with `lostGuard` for the mover's piece | piece, sq | — (cause leads: whyItFailed abandoned-defender) | "That left your {piece} on {sq} with no guard." | | | CONSEQUENCE slot (subsumed by blunderCheck/contrast when they fire — one claim `loose:<sq>`) | `loose:<sq>` claim once | H |
| MF2 | eval line | — | today | | n/a — "the eval bar moves" is machinery talk (voice rule 1: lead with the piece) and is only computed on GOOD moves (classification gate) | | | | delete from spoken text | | — |
| MF3 | aggregator | — | — | | n/a — its other facets belong to their own computers' cards | | | | | | — |

## E. Mistake link
- Only MF1 (`abandoned-defender`), via the one `loose:<sq>` claim shared with contrastMoves / computeBoardDelta / blunderCheck.

## F. Build changes
1. Delete the eval-bar sentences (reviewFullData.ts :~738, :~770): they describe the engine, not the board.
2. The loose line is one producer (`hangingLine`); on the mistake turn it is the CONSEQUENCE clause under claim `loose:<sq>`.
3. No new computer — computeMoveFacets stays Review's basket; Learn reads the registry reads directly.

## G. Proof boards
- computer-map-raw samples: "Your rook on h2 is hanging: nothing guards it. They can take it." / "Their bishop on e3 is hanging: nothing guards it. They have to move it or guard it."
- Not run in the scratch (needs a full Review ctx).

## H. Open questions
- None.
