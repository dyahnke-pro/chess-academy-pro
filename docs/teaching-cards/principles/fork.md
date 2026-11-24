# Forks: one piece, two targets

## Principle
A fork attacks two things at once and only one can be saved. Keep valuable pieces off squares one enemy piece can hit together, and guard the square a knight would fork from.

## When it applies / exceptions
Either seat. Card wording 'two pieces a knight's jump apart are a fork waiting' is loose: they must both be reachable from ONE square a knight can actually get to.

## Deterministic check
- Fork square: a square from which one enemy piece attacks ≥2 student pieces of value ≥ the forker (or the king + any), reachable by that piece in 1 move, and SEE on landing ≥ 0 (or the fork includes check).
- abandoned-fork-square: that square was guarded before the student's move and not after.
- walks-into-fork: the student's move created such a square.

## Phrasings
1. One knight on that square hits two of your pieces.
2. That square needed a guard: their knight forks from there.
3. Keep your big pieces off squares one piece can hit together.
4. A fork hits two things, and you can save only one.
5. Before you move, check which squares their knight can reach.

## Sources
- concept:tac-fork (Edward Lasker)
- https://en.wikipedia.org/wiki/Fork_(chess)
- https://www.chess.com/article/view/chess-tactics

## Used by
abandoned-fork-square, walks-into-fork, motif fork

## Flag
LOOSE: walks-into-fork L1 'a knight's jump apart' — the geometry is a shared knight square, not a knight jump between them.
