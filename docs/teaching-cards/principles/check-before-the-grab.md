# Check what they can do first (in-between moves)

## Principle
Before you recapture or grab, look for their in-between move — a check or a bigger threat comes before the expected reply. The same works for you.

## When it applies / exceptions
Either seat.

## Deterministic check
- Answered-by-check: after the student's capture, the opponent has a check that also attacks a student piece (chess.js: for each checking reply, list attacked student pieces with SEE > 0), and the engine line plays it.
- Zwischenzug allowed/missed: the stored line's first move is a check or a capture of higher value instead of the natural recapture on the square just captured on.

## Phrasings
1. A grab is only safe if they have no check first.
2. Before you take back, look for something stronger in between.
3. Their check came first, and it hit your piece too.
4. Recaptures aren't automatic; a check can come first.
5. A bigger threat can come before the recapture.

## Sources
- https://en.wikipedia.org/wiki/Zwischenzug
- https://en.chessbase.com/post/zwischenzug-the-intermediate-move
- https://www.chess.com/article/view/chess-tactics (in-between move)

## Used by
answered-by-check, motif zwischenzug, pictureVerdict T KNOW(threat)
