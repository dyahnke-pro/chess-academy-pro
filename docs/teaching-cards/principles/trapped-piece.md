# Trapped pieces

## Principle
A piece with no safe square can be won by just attacking it; check a piece's way back before sending it deep.

## When it applies / exceptions
Either seat.

## Deterministic check
- Trapped: a piece P attacked (or attackable in one move) where every legal move of P lands on a square with SEE < 0 for P and staying loses it; the engine line wins it.

## Phrasings
1. Your bishop went in with no way back.
2. A piece with no safe square is lost once it's attacked.
3. Their queen has no squares left; attack it.
4. Before you send a piece deep, check its way home.
5. Take away its last square, and the piece is yours.

## Sources
- https://www.chess.com/article/view/chess-tactics (trapped piece)
- https://en.wikipedia.org/wiki/Chess_tactic (trapping a piece)
- https://www.chess.com/blog/michechess89/how-to-win-when-you-trap-an-enemy-piece-video

## Used by
motif trapped piece, queenChased rows
