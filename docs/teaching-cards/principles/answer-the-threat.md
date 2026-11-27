# Read their last move: answer threats first

## Principle
After every opponent move ask what it attacks; a threat doesn't go away by itself — answer it or make a bigger one. A threat they didn't carry out is still on the board.

## When it applies / exceptions
Either seat. 'Make a bigger one' only when the counter-threat's value ≥ the threatened loss (zwischenzug rule).

## Deterministic check
- `computeMustDefend` on the board after their move is non-empty; the student's move leaves it non-empty and the opponent's best reply executes it (ignored-threat). still-hanging: the same threat existed on the previous student move and the opponent did not take it.

## Phrasings
1. Their last move attacked your bishop; that comes first.
2. A threat doesn't go away by itself.
3. After every move of theirs, ask what it attacks.
4. They didn't take it last move, but it's still hanging.
5. Answer the threat, or make a bigger one.

## Sources
- https://en.wikipedia.org/wiki/Prophylaxis_(chess)
- https://lichess.org/@/mullerrj/blog/checks-captures--threats-what-is-it-and-why-is-it-important/d8AEWh7V (what are they attacking next)
- concept:tac-pin (break free before the second wave)

## Used by
ignored-threat, still-hanging, allowed-threat, pictureVerdict W seat O, L PREV
