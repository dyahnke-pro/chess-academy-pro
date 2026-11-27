# A bad bishop (own pawns on its colour) — repair

## Principles
1. **Move your pawns off its colour** where you can; free the diagonals.
2. **Trade it off** — for their good bishop or a knight.
3. **Get it outside the pawn chain** to an open diagonal.
4. **Mirror (their bishop is bad): fix their pawns on its colour, keep your knight, trade your good bishop for theirs.**
- Caveat: a "bad" bishop that defends key pawns can be a good defender (chess.com "How Bad is a Bad Bishop?"); don't trade it if it is the only guard of a weak point.

## Deterministic check
- Bad: ≥3 own pawns on the bishop's colour, ≥2 of them fixed (enemy pawn directly in front) or in its own half's centre, and bishop mobility ≤4.
- P1: an own pawn on the bishop's colour has a safe push to the other colour (SEE ≥ 0).
- P2: an enemy bishop of the same colour or a knight can be challenged (student bishop reaches a square attacking it, supported, in ≤2).
- P3: bishop BFS ≤3 moves to a square outside its pawn chain with mobility ≥6.
- Guard: skip P2 if the bishop is the sole defender of a pawn (guard map).

## Phrasings
1. Your bishop is blocked by your own pawns; put them on the other colour.
2. That bishop bites on its own pawns; trade it off.
3. Walk your bishop outside the pawn chain where it can breathe.
4. Their bishop is shut in; keep their pawns fixed on its colour.
5. A bishop behind its own pawns is a tall pawn; free it or swap.

## Sources
- Library: Capablanca cf-12 ("keep your Pawns on squares of the opposite colour to that of your own Bishop … the value of the Bishop is diminished")
- concept:end-bishop-vs-knight (Edward Lasker: "a bishop hemmed by its own pawns becomes a tall pawn")
- https://www.chess.com/terms/bad-bishop
- https://www.chess.com/article/view/how-bad-is-a-bad-bishop
