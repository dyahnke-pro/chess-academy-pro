# CARD — `principleLine` (the rule behind a move)

## A. Identity
`src/services/moveFundamentals.ts:1735` `principleLine(fenBefore, san, mover, taughtIds, stemKey, namesPlayedMove)` → `{id, text, squares, first, names, headsMove, follow?}`; uses `principleToTeach`, `principleOnceLine`, `reasonFor`, `reasonHolds`, `middlegameKey`, `openingWindowOpen`. Census 160/153 (Review only), kinds `rule` 154, `passer` 6.

## B. Facts
- **B1** "g6 follows a rule worth keeping: fianchetto the bishop to g7. A bishop shut in behind its own pawns is a spectator." — the RULE + its REASON: already the approved lesson shape.
- **B2 dropped:** the id's opening/middlegame split; `REPEAT_TEACHES`.
- **B3 cheap:** today it fires on CLEAN moves only (a capture, a forced reply → null, `:1757-1758`). For a mistake it is the negative: the rule the played move BROKE — `principleContrastLine` (own card) is that; principleLine supplies the rule text and reason.
- **B4 gates:** no captures; not a forced reply; opening window decides opening vs middlegame stem; say-once by id.

## C. Readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | **yes** (rule + reason) | text | on good moves |
| CONSEQUENCE | yes | reason clause | — |
| BETTER MOVE + JOB | n/a | — | (principleContrastLine) |
| HABIT | partly | the rule as habit | — |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PL1 | knowledge (rule) | S mistake | via principleContrastLine (the rule the better move kept) | rule id | the `reasonFor` text of the fundamental (F1–F9 of computeMoveFundamentals) | | | the rule as a habit | same | once a game per rule (say-once) | H |
| PL2 | good move | S | clean move follows rule | | silent in Learn (no mistake) | | | | silent | | H |

## E. Mistake link
Positional causes, through principleContrastLine and the fundamental delta.

## F. Build changes
1. Learn mistakes-only: principleLine never speaks alone in Learn; its rule/reason text is the LESSON source for the positional recipes (one rule table, `reasonFor`).
2. Its say-once ledger ids are shared with `mistakeLesson` so a rule taught on a mistake is not re-taught in Review the same game.

## G. Proof boards
- Census: "O-O follows a rule worth keeping: castle your king to safety and bring the rook toward the center. A king left in the middle gets caught the moment the center opens." (`lines-2.jsonl:4922`).

## H. Open questions
None.
