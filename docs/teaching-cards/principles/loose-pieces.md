# Loose pieces drop off

## Principle
An unguarded piece is a target: check what is loose, yours and theirs, every move; take theirs before anything else (unless a bigger threat is on).

## When it applies / exceptions
Either seat. Exception: a loose piece that is 'poisoned' (taking it allows mate or a bigger loss) — the capture check runs SEE + the engine read.

## Deterministic check
- Loose = a piece with 0 defenders (guard map) attacked by ≥1 enemy piece, or attackable next move.
- Missed-win: the engine best move captures it and the line's quiet end keeps the gain (≥ 100cp).
- Allowed: the opponent's best reply captures a 0-defender piece of the student.

## Phrasings
1. An unguarded piece is a target.
2. Your knight had no guard, and they just took it.
3. Their piece was loose, so take it first.
4. Every move, look for what's loose on both sides.
5. Where your piece lands, something must cover it.

## Sources
- https://www.chess.com/article/view/chess-tactics (hanging piece)
- https://www.chess.com/article/view/beware-of-undefended-pieces
- concept:tac-fork (Edward Lasker: keep valuables off fatal squares)
- https://lichess.org/@/mullerrj/blog/checks-captures--threats-what-is-it-and-why-is-it-important/d8AEWh7V (spot pieces with no defenders)

## Used by
left-hanging, allowed-capture, missed-win, motif hanging piece, pictureVerdict W HABIT, readPosition G CALC
