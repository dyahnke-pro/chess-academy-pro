# When winning, leave their king a square

## Principle
A king with no legal move that is not in check is stalemate — a draw. When far ahead, check their king's squares before every quiet move.

## When it applies / exceptions
Winning side only.

## Deterministic check
- After the candidate, the enemy has 0 legal moves and is not in check (chess.js `isStalemate()`); the student is ≥ +3 in the ledger.

## Phrasings
1. Leave their king a square, or it's stalemate.
2. Way ahead, check their king's moves before every quiet move.
3. No moves and no check is a draw, not a win.
4. Their king had nowhere to go, and that threw the win away.
5. Give the king room, then mate it.

## Sources
- https://en.wikipedia.org/wiki/Stalemate
- Library: Edward Lasker *Chess and Checkers* cc-9 (stalemate is a draw; the weaker side's saving trick), cs-4 (Black stalemated to draw)

## Used by
stalemate
