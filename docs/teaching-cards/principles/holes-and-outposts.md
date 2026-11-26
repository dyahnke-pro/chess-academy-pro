# Holes and outposts

## Principle
A square no pawn can ever attack is a hole; a knight there, backed by a pawn, can't be evicted and dominates. Pawn moves make holes, so push with thought. Trade off an enemy outpost knight, or undermine its pawn.

## When it applies / exceptions
Overstated in the card: 'a knight on a square no pawn can attack is worth as much as a rook in some positions' — sources say strong/'worth more than its name', none give a rook-equivalence; drop the comparison.

## Deterministic check
- The one hole test (`noPawnCanChallenge`); outpost = hole in the enemy half occupied/reachable in ≤2 by a knight, defended by an own pawn (see recovery/outpost-conceded.md).

## Phrasings
1. A square no pawn can attack is a perfect home for a knight.
2. Every pawn move leaves squares it can never guard again.
3. Their knight can never be chased from there; trade it off.
4. Put your knight on the hole, backed by a pawn.
5. That pawn push left a hole in front of your king.

## Sources
- concept:pos-weak-squares (Edward Lasker)
- https://en.wikipedia.org/wiki/Outpost_(chess)
- https://www.chess.com/terms/outpost-chess
- Library: Nimzowitsch ms-12 (an outpost provokes weaknesses)

## Used by
readPosition G KNOW(outpost), X PLAN(complex), recovery outpost-conceded

## Flag
OVERSTATED: readPosition G KNOW(outpost) 'worth as much as a rook'.
