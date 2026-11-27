# A trade changes the pawns too

## Principle
Before a trade look at the pawns it leaves behind: a recapture can leave a pawn isolated, backward or fixed where their pieces can reach it, and a broken pawn shell before the king invites attack.

## When it applies / exceptions
Either seat.

## Deterministic check
- Structure diff (`boardStructure.newPawnWeaknesses`): the trade's line ends with a new isolated/backward/fixed student pawn that passes the target test (an enemy piece can attack it in ≤2 moves).

## Phrasings
1. That trade left your pawn on its own.
2. After a trade, look at what's left of your pawns.
3. Count the weak pawns after the trade, not just the material.
4. The swap gave them a pawn to aim at all game.
5. Every trade leaves a pawn structure behind; check yours.

## Sources
- concept:pawn-chain (Edward Lasker: 'beware the trade that tears a hole in the pawns sheltering your king')
- https://exeterchessclub.org.uk/node/804 (weak pawns)
- https://en.wikipedia.org/wiki/Isolated_pawn

## Used by
traded-into-target, readPosition L CONSEQ(isolated)
