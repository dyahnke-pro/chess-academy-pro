# Count the race

## Principle
When both sides attack (pawn storms on opposite wings, passers racing), the side that arrives one move sooner wins: count each side's moves before you commit.

## When it applies / exceptions
Opposite-side castling or both sides with runners. Mirrors planRace's same-kind rule.

## Deterministic check
- Storm: kings castled on opposite wings, both sides' pawns advanced on the enemy king's wing; count pawn moves to contact with the shield. Passer race: pushes to promotion with side to move (see `planRace.ts`).

## Phrasings
1. With kings on opposite sides, the faster attack wins.
2. Count how long each attack takes before you commit.
3. A pawn storm one move too slow is a disaster.
4. Your passer queens first: count it, then push.
5. Their attack arrives first, so slow it down before yours.

## Sources
- concept:att-kingside-storm (Edward Lasker: 'the attack that lands one move sooner wins')
- https://en.wikipedia.org/wiki/Pawn_storm
- https://www.chess.com/blog/Tricks-of-Chess/when-pawns-become-monsters-the-art-of-the-pawn-storm

## Used by
pictureVerdict T STRAT(storm)
