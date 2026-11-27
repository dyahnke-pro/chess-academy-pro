# A drawish endgame when you are better — keep winning chances

## Principles
1. **Keep pawns on the board, on both wings.** Each pawn trade brings the draw closer; pawns far apart stretch the defender.
2. **Make a second weakness.** One target can be held; two, far apart, usually can't.
3. **Avoid opposite-coloured bishops and pawnless endings** unless they win by force.
4. **Activate the king first,** then push.
5. **Don't hurry** — technique: improve everything, then break.
- Stalemate (cause `stalemate`): with the win in hand, always leave their king a square.

## Deterministic check
- Better but drawish: endgame, eval in [+80, +250], AND one of: opposite bishops, all pawns on one wing (every pawn within 3 adjacent files), rook ending with pawns on one wing, or ≤2 pawns each.
- P1: a pawn trade is available → advise against it unless the engine top move is that trade.
- P2: count enemy weaknesses (weak-pawn test + enemy passer-stop squares); fires when exactly 1 and a pawn break on the other wing is legal.
- P3: suppress any trade that leaves OCB or no student pawns.
- P4: student king ≥2 steps further from the centre than the enemy king.
- Stalemate: after the candidate, enemy has 0 legal moves and no check → "leave a square".

## Phrasings
1. You're better, so keep the pawns on; every swap helps them draw.
2. One weakness they can hold; make a second on the other side.
3. Avoid opposite bishops; that's where a good ending goes to draw.
4. Bring your king up before you push anything.
5. No hurry: improve every piece, then break through.

## Sources
- Library: Mason aoc-19 (don't reduce to opposite bishops below mating force); Capablanca cf-31 (the defender seeks opposite bishops)
- https://www.chess.com/clubs/forum/view/the-principle-of-2-weaknesses (forum — weaker; backed by:) https://en.wikipedia.org/wiki/Opposite-colored_bishops_endgame (needs two widely separated weaknesses)
- https://www.chess.com/article/view/mastering-opposite-colored-bishops
- https://www.chess.com/blog/danheisman/when-youre-way-ahead (keep pawns)
