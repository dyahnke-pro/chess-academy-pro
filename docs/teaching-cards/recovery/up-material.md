# Up material after their mistake — convert

## Principles
1. **Trade pieces, not pawns.** Each piece swap makes the extra material bigger; the pawns are what will make a queen.
2. **Simplify, don't gamble.** No need for combinations; safety first, then trade down.
3. **Weather their counterplay first.** Answer their threats and secure your king, then use the extra force.
4. **Don't trade into a dead draw:** avoid opposite-coloured bishops alone, and keep pawns on the board.
- Exceptions: if you have a strong attack, keep the attackers on (Heisman); a trade that doubles your pawns is fine when up a whole piece.

## Deterministic check
- `d ≥ +1` at the quiet end (an opponent's mistake: the ledger gain is theirs to lose), eval ≥ +100.
- P1: an even trade (SEE = 0, same-value pieces) is legal this turn or next, and it is not a pawn-for-pawn trade.
- P2: the student king zone is attacked by ≥2 enemy pieces → say P3 first, before P1.
- P4: suppress any trade suggestion if the result would leave only bishops of opposite colours + pawns, or would leave the student with no pawns and `d < +5` (a lone minor can't mate).
- Stalemate guard (cause `stalemate`): in a winning ending, if the enemy king has 0 legal moves and is not in check after the student's candidate, the line "leave their king a square" applies.

## Phrasings
1. You're ahead now, so trade pieces and keep your pawns.
2. Every even trade makes your extra piece count for more.
3. Ahead in material, keep it simple: no risks, just swap down.
4. First stop their threats, then cash in the extra material.
5. Keep the pawns on; they're how the extra piece turns into a win.

## Sources
- https://www.chess.com/blog/danheisman/when-youre-way-ahead ("fair trades of pieces but not necessarily pawns")
- https://www.chess.com/article/view/how-to-convert-chess-advantage
- Library: Nimzowitsch ms-27 (simplification desirable with superiority in material); Mason *Art of Chess* aoc-19 ("make straight for simplicity … only take care not to … reduc[e] to Bishops of opposite colours"); Capablanca cf-23 (win the material, weather the storm, then act with numerical superiority).
