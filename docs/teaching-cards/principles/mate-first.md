# Mate comes before material

## Principle
A forced mate beats any material, and a mate threat must be answered before anything else. When a king is short of squares, look at every check first.

## When it applies / exceptions
Either seat. Exception (overstatement in the card): a king with no flight square does NOT always die to one check — the check must also be unblockable and the checker uncapturable.

## Deterministic check
- Allowed: the engine PV after the student's move contains `#` for the opponent (mate-in-N, N ≤ 5), or the board is mate-in-1 for the side to move (chess.js: try every legal check, `isCheckmate()`).
- Missed: the student had a mate-in-≤3 in the stored read and played another move.
- 'King short of squares' = the king's legal-move count ≤ 1 with the side not in check.

## Phrasings
1. A forced mate beats any material on the board.
2. Their king had nowhere to go, so the checks came first.
3. When their king is boxed in, look at every check.
4. A mate threat comes before your own plan.
5. Your king had no room, and one check was enough.

## Sources
- concept:tac-double-attack (Edward Lasker: a quiet move threatening mate wins as surely as a sacrifice)
- https://en.wikipedia.org/wiki/Checkmate
- https://www.chess.com/blog/GlennJMiller/how-to-win-at-chess-part-6-find-strong-candidate-moves (checks first in the candidate list)
- Library: Edward Lasker *Chess and Checkers* cc-11/cc-38 (mating nets, checks before material)

## Used by
allowed-mate, missed-mate, king-hunt, motif checkmate, pictureVerdict CALC

## Flag
OVERSTATED: 'A king with no escape square dies to one check' (allowed-mate L1) — needs 'and the check can't be blocked or taken'.
