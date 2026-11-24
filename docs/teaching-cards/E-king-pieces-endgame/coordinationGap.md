# Card — `coordinationGap` (one army together, the other scattered)

## A. Identity
- `src/services/coordinationGap.ts:44` `coordinationGap(fen, lines, student)`; `army` (:22) counts loose (no own guard) and idle (`pieceWork` < 4) N/B/R/Q. Registry `boardComputers.ts:7537` (kind `judgement`). From move 15.
- Census: 94 fired / 29 said (held already-said 61).

## B. Facts
- **B1** `CoordinationGap` (:18): `side` (the coordinated side), `loose[]`, `idle[]` (the scattered side's), `text`, `squares`.
- **B2 dropped**: the good side's counts (all guarded, ≤1 idle) — proof of the contrast; `lineScore` (:54, ≥80).
- **B3 cheap**: for the student scattered: which loose piece is attacked now (chess.js attackers) = the concrete danger; the student's move that LEFT a piece loose (loose on fenAfter, guarded on fenBefore).
- **B4 gates**: not in check, move ≥15 (:48); both sides ≥3 pieces; good side 0 loose, ≤1 idle; bad side ≥2 loose+idle (:50-52); engine ≥80 for the good side (:54). Rooks on their back rank and minors at home excluded (:29-31).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | "Your pieces work together … Theirs are scattered: the bishop on b7 does next to nothing, and the queen on b6 has no guard." — a description | the rule ("loose pieces drop off") |
| CONSEQUENCE | no | — | the attacked loose piece (B3) |
| BETTER MOVE + JOB | no | — | errorWhy better move (guard or activate) |
| HABIT | no | — | record `missed-opponents-threat` / loose-piece focus |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CG1 | KNOW (loose pieces) | S scattered | student's costly move left a piece loose (B3) and the gap fires for them | piece | "Loose pieces drop off: your {piece} on {sq} has no guard, and one attack wins it." / "Keep every piece guarded or busy; a scattered army loses pieces to simple attacks." | "{attacker} hits it next." | "{best} kept the {piece} guarded." (once past) | "Before every move, check each of your pieces: is it attacked, and is it guarded?" (the focus CLUE wording, fixed) | "A scattered army loses pieces to simple attacks — your {piece} on {sq} has no guard." | errorWhy already names the hanging piece (same claim) | C |
| CG2 | STRAT (idle) | S | gap fires for the student (scattered) AND `positionalReason` `misplaced-piece` names one of `idle` | piece | "A piece that does nothing is a piece you don't have: your {piece} on {sq} is sitting out." | — | errorWhy better move (once past) | pieceWish habit | "Your {piece} on {sq} is sitting out of the game." | the idle piece is the one just moved | H |
| CG3 | STRAT (attack the scattered) | S coordinated, missed | gap fires with the student as `side`, and errorWhy `missed-win` whose target is one of `loose` | loose piece | "When their pieces are scattered, attack the loose one: it can't be defended and moved at once — their {piece} on {sq} had no guard." | — | "{best} hit it." (once past) | "Every move, check: is something of theirs loose?" | "Their {piece} on {sq} was loose." (said only once past — `pastBetterNameable`; else it is the student's find) | target not in `loose` | H |
| — | phase | — | move ≥15 | | | | | | | | |
| — | record | — | RED/GREY full · AMBER "Your {piece} has no guard." · GREEN silent | | | | | | | | |

## E. Mistake link
- Student: `whyItFailed` `abandoned-defender` (the move undefended a piece) / `left-hanging` (E6) → CG1; `positionalReason` `misplaced-piece` → CG2; `costReason` missed (a loose piece of theirs) → CG3.

## F. Build changes
1. `coordinationGap.ts:18` — add `attacked: Square[]` (loose ∧ attacked) and the good side's counts.
2. Move form: `leftLoose(fenBefore, san)` — newly loose pieces after the move.
3. Recipes → `mistakeLesson.ts`; the description text is removed from Learn.

## G. Proof boards
- Student scattered: `lines-0.jsonl#8051` ("Yours are scattered: your bishop on g7 does next to nothing, and your queen on a5 has no guard").
- Their side: `vc-1zfJ7ABoh8k-30` `2kr3r/p2n1ppp/1p1qpn2/PPp4b/8/2NP2PP/2P1NPB1/R2Q1RK1 w`.

## H. Open questions
- None.
