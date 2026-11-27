# Pins

## Principle
A pinned piece can't move without exposing something bigger behind it, so it can't really defend; pile attackers on it. When pinned, break it early: block, chase the pinner, or counter-attack.

## When it applies / exceptions
Either seat. Only bishops, rooks and queens pin; absolute when the king is behind (the pinned piece can't legally move).

## Deterministic check
- Pin: a student/enemy line piece, a front piece, and behind it a piece of higher value or the king on the same line (chess.js rays), the front piece unable to leave the ray without the back piece being attacked by the pinner with SEE > 0.
- Guard (the `findPins` lesson): if the front piece can leave WITH a capture or check that nets ≥ 0, it is not a working pin.
- Pile on: the number of student attackers on the pinned piece can rise next move.

## Phrasings
1. A pinned piece can't move, so it can't defend either.
2. Your knight is pinned to the queen; break the pin before they pile on.
3. Pile another attacker on the pinned piece.
4. Behind that piece is something bigger, so it has to stay.
5. When you're pinned, chase the pinning piece or block the line.

## Sources
- concept:tac-pin (Edward Lasker)
- https://en.wikipedia.org/wiki/Pin_(chess)
- https://www.chess.com/article/view/chess-tactics

## Used by
motif pin, readPosition G CONSEQ (target pinned)
