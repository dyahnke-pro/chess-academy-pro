# Card — `oppositeBishops` (opposite-coloured bishops: attacker's game, or the drawish ending)

## A. Identity
- `src/services/oppositeBishops.ts` — `oppositeBishopsOn(fen)` (the one reader of the shape), `settled` (no bishop capturable), `consequence` (`attack` / `ending` / null), `oppositeBishops(fenBefore, san, student)` (said on the move that settles the shape or takes the heavies off). Registry `boardComputers.ts:~3656` (entry ends `:3667`), kind `opposite-bishops`, either seat.
- Census: 26 fired / 12 said (held already-said 12, in-flux 2).

## B. Facts
- **B1** `OppositeBishopsRead`: `text`, `squares` (both bishops + king-zone squares one bishop hits), `proof`, `seat` (the side whose bishop bears on the other king), `key` (`opposite-bishops:attack` / `:ending`), `claims` (ending carries `ending-opposite-bishops-up/-down`).
- **B2 dropped**: `myHits` / `theirHits` (squares) are in `squares` but not typed; the MATERIAL balance in the ending case — the claims carry "up/down" keys but no pawn count is computed; who traded into it (`mover`).
- **B3 cheap**: `pawnBalance` (sideMaterial pawns) at the ending; `tradeInto` = the move was a capture that left OCB (the decision); for the attack case, `bishopFree` — the student bishop's colour vs the defender's pawns.
- **B4 gates**: exactly one bishop each, opposite colours (`oppositeBishopsOn`); no bishop capturable now (`settled`); a NEW consequence vs fenBefore; knights on → no consequence (null); heavies on → attack, else ending.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | "That is a game for the attacker, not for grinding pawns" / "the most drawish ending there is. A pawn up is often not enough" — real rules with the reason | the mistake framing (who traded into it while ahead/behind) |
| CONSEQUENCE | yes | "attack there" / "a pawn up is often not enough" | — |
| BETTER MOVE + JOB | no | — | errorWhy better move ("Nd5 kept the knights on") |
| HABIT | no | — | record (bad-trade / endgame conversion) |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| OB1 | STRAT (trade into the draw while ahead) | S | `ending`, student's capture made it, `pawnBalance` > 0 for the student, cost (eval dropped toward 0) | pawns | "Opposite-coloured bishops are the most drawish ending there is: a pawn up is often not enough, because each bishop blocks on squares the other can't touch." / "Ahead in material, keep pieces that can win: trading into opposite bishops throws the extra pawn away." | "Their bishop sets up a blockade on {colour} squares." | "{best} kept the knights (or rooks) on." (once past) | "Ahead? Before every trade, ask what's left." | "That traded into opposite bishops — a pawn up is often a draw now." | not ahead (then OB2) | C pawnBalance |
| OB2 | STRAT (defender's resource) | S behind | `ending` reached by THEIR move while the student is behind | — | Review only: the student benefits (no mistake) | | | | silent | | H |
| OB3 | CONSEQ (attack, theirs) | S defender | `attack` with `theirHits` (their bishop on the student's king zone), student's costly move | squares | "With opposite bishops and queens on, the attacker rules a colour your bishop can never guard: cover the {shade} squares around your king with other pieces." | "Their bishop on {sq} hits {hits}." | "{best} covered {sq}." | "With opposite bishops, defend the squares of THEIR bishop's colour." | "Their bishop rules the {shade} squares around your king." | — | H |
| OB4 | STRAT (attack, yours missed) | S attacker | `attack` with `myHits`, costReason missed / slow move | — | "With opposite bishops, attack on your bishop's colour: their bishop can never defend those squares." | — | "{best} aimed at {sq}." | — | "With opposite bishops, the attack is on your bishop's colour — their bishop can never guard those squares." (said only once past, `pastBetterNameable`) | better move still playable | H |
| — | exception | — | knights on → null (gate) | | | | | | | | |
| — | record | — | RED/GREY full · AMBER "Opposite bishops now — a pawn up may not win." · GREEN silent | | | | | | | | |

## E. Mistake link
- Student: the trade cause (readTrade family) or positional drop to ~0 → OB1; `costReason` allowed on their bishop's colour → OB3; missed → OB4.

## F. Build changes
1. Add `pawnBalance` and `tradeInto: boolean` to `OppositeBishopsRead`; `myHits`/`theirHits` as typed fields.
2. Recipes OB1/OB3/OB4 → `mistakeLesson.ts`.
3. OB1's condition is the errorWhy cost on the trade (a graded mistake), not the material-ahead trade alone; with no cost the same lesson is Review only. The current texts are the LESSON stems (keep).

## G. Proof boards
- `lines-0.jsonl#190` (attack, both bishops, no hits); `lines-2.jsonl#7574` (already-said guard).
- OB1 owed: a trade into OCB while ahead in `g-*.jsonl`.

## H. Open questions
- none — OB1's trigger follows the WO: Learn speaks only on a graded mistake (errorWhy's cost), so the engine drop decides; a trade the engine still reads +1 is not a mistake and is Review only (§F3).
