# Card — `lateralRookDefence` (a raiding rook that defends sideways)

## A. Identity
- `src/services/lateralRookDefence.ts` `lateralRookDefence(fen, lines, student)` — in the side to move's best line (≥ −30cp), a rook in the enemy half slides along its own rank and newly guards an attacked piece of its side. Kind `defence-idea`. Either seat.
- Census: 5 fired / 5 said.

## B. Facts
- **B1**: `side`, `from` (rook's start), `to`, `guards` (the piece's square), `text`, `squares`.
- **B2 dropped**: the line ply where it happens (`i`); the attacker of the guarded piece (`after.attackers(…, enemy)`, checked non-empty and dropped).
- **B3 cheap**: the mistake trigger — the student's move took material/attacked a piece "loose-looking" that their rook defends sideways in the line (the student miscounted) → the attacker list and the counted defenders.
- **B4 gates**: best line ≥ −30 for the side to move; the side's own move in the line; a rook move along the same rank it started on, in the enemy half; the guarded piece newly covered, attacked by the enemy.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | "An active rook can switch to defence without going home." / "A raiding rook can defend sideways." | — |
| CONSEQUENCE | yes | "so that target is not as loose as it looks" | — |
| BETTER MOVE + JOB | partly | names the rook move (the line's) | — |
| HABIT | no | — | record (miscounted defenders) |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| LR1 | CALC (miscounted defender) | S attacker | THEIR rook defends sideways; the student's costly move went for the target (costReason allowed/`held-by-defender`) | rook, to, target | "Count the sideways defenders too: their rook on {from} slides to {to} and guards {target}, so it isn't as loose as it looks." / "A raiding rook can defend along its rank — check the rank before you call a piece loose." | "The attack on {target} gains nothing." | "{best} …" (once past) | "Before you go for a piece, count every defender, including rooks along a rank." | "Their rook can defend that sideways." | — | C B3 |
| LR2 | KNOW (own) | S defender | student's piece attacked, student's move went home with the rook when the lateral guard existed (cost) | — | "An active rook doesn't need to go home to defend: slide it along the rank." | — | "{best} kept the rook active and guarded {target}." | — | "Your rook could defend from where it was." | — | H |
| — | phase | — | any, mostly rook endings | | | | | | | | |
| — | record | — | RED/GREY full · AMBER "Their rook defends that sideways." · GREEN silent | | | | | | | | |

## E. Mistake link
- Student: `whyItFailed` `held-by-defender` (the capture loses after recaptures) where the defender is the lateral rook → LR1; `positionalReason` `passive-rook` → LR2.

## F. Build changes
1. Add `ply`, `attackers: Square[]` to the result.
2. Recipes LR1/LR2 → `mistakeLesson.ts` (cause `whyItFailed:held-by-defender` with defender = rook on the same rank).

## G. Proof boards
- `lines-0.jsonl#4185` ("The rook on g7 can do two jobs: it swings across to h7 and covers your pawn on h5"); `lines-0.jsonl#4196`.

## H. Open questions
- None.
