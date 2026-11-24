# The pawns in front of the king are its shield

## Principle
Keep the pawns before a castled king unmoved and whole; every advance is a crack. A king without cover can be chased across the board. Castle on the side where those pawns are still home.

## When it applies / exceptions
Middlegame, queens on. Exception: a pawn storm is fine when the kings are on opposite wings (your king lives elsewhere).

## Deterministic check
- Shield: the 3 pawns on the king's file and adjacent files, ranks 2–3 from its side. king-hunt cause: ≥2 shield pawns gone/advanced and the opponent's PV gives ≥3 checks in 6 plies.
- Castling side: count home shield pawns on each wing (castlingWing).

## Phrasings
1. The pawns in front of your king are its shield.
2. Every pawn you push in front of your king is a crack.
3. Your king's cover is gone, and the checks keep coming.
4. Castle on the side where the pawns are still home.
5. Their king's shelter is broken; that's where to aim.

## Sources
- concept:pos-king-safety (Edward Lasker)
- Library: Edward Lasker cc-62 (a moved g-pawn creates a dangerous weakness), cs-5
- https://lichess.org/@/Puli1234/blog/mastering-king-safety-practical-tips-for-every-phase-of-the-game/KHBJdA6J
- https://en.wikipedia.org/wiki/Pawn_storm (opposite-castling exception)

## Used by
king-hunt, readPosition K IDENT, recovery king-exposed
