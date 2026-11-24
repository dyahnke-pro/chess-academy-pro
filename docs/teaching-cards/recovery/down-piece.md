# Down a piece — fight back (David's approved idea)

## Principles
1. **Don't trade pieces.** Every trade makes their extra piece count for more.
2. **Make it complicated.** Keep tension, keep threats; simple positions are won by the side with more.
3. **Go after their king** — only when the queens are on and your pieces can reach it.
4. **Take their pawns, keep yours.** If it reaches an ending, pawns are the only thing that can still matter (a piece with no pawns often cannot mate).
- Exceptions: trading is right when it removes their attackers from YOUR king, or forces perpetual / a fortress.

## Deterministic check
- `d ≤ −2.5` at the quiet end, eval in (−500, −200] (decided → see the queen-lost file's "practical chances" line, or silence).
- P1/P2: always, unless a trade available this turn removes an enemy piece that is attacking the student king zone (then P1 is suppressed).
- P3: queens on (both), and ≥2 student pieces attack squares in the enemy king zone or can in one move, AND the enemy king zone has ≥1 square attacked by the student and not by enemy pawns. Else say P2 only.
- P4: endgame, OR the opponent has ≤3 pawns.

## Phrasings
1. You're a piece down, so keep the pieces on the board.
2. Don't trade: every swap makes their extra piece bigger.
3. Make it messy; the simple position is theirs.
4. Queens are still on, so turn your pieces toward their king.
5. Trade their pawns off; a lone extra piece can't always win.

## Sources
- https://www.chess.com/blog/attilaturzo/6-strategies-to-save-bad-positions
- https://www.dummies.com/article/home-auto-hobbies/games/board-games/chess/examining-the-material-element-in-chess-200397/ (avoid trades when behind, keep queens if their king is exposed)
- https://www.chess.com/blog/danheisman/when-youre-way-ahead (the mirror rule: the side ahead trades pieces)
- Library: Nimzowitsch *My System* ms-27 ("Simplification is desirable if we have superiority in material" — so the side behind avoids it).
