# A weak pawn of yours (isolated, backward, doubled, fixed) — repair

## Principles
1. **Keep your pieces active, not chained to the pawn.** A weakness hurts most when it ties pieces down; use the open files it gives you.
2. **Trade the pieces that attack it** (for an isolated pawn: avoid trades while you have play, but once it is only a target, swap its attackers); fewer attackers, fewer threats.
3. **Push it and trade it off** when the push is safe; a weak pawn that disappears is no longer weak.
4. **Guard the square in front** (backward / isolated): the danger is their piece sitting there.
5. **Mirror (their weak pawn): blockade it with a knight, then pile up on it; the endgame is where it falls.**
- Disagreement (named): sources split on piece trades with an isolated pawn. The pawn's OWNER should avoid trades (its value is the active pieces); the DEFENDER should seek them (Wikipedia IQP, chess.com IQP article, concept:pawn-isolated). The check takes the seat into account: owner → P1 (keep pieces, stay active), opponent → P5 (trade, blockade).
- Doubled pawns are often fine (Edward Lasker concept:pawn-doubled: weak only when also isolated); the check speaks only when they are isolated doubled or attacked.

## Deterministic check
- Classify from chess.js pawns: isolated = no own pawn on adjacent files; doubled = two on a file; backward = no own pawn on adjacent files at or behind its rank AND its stop square attacked by an enemy pawn; fixed = an enemy pawn directly in front.
- "Weak" only if attacked by ≥1 enemy piece or on a half-open file an enemy rook/queen can reach (the target test) — else silent.
- P1: an own piece is the pawn's only defender (guard map).
- P3: the push square is not attacked more than defended (SEE on the stop square ≥ 0) and the push contacts an enemy pawn.
- P4: the stop square is a hole an enemy knight can reach in ≤2.
- P5: opponent's pawn passes the same tests; a student knight reaches its stop square in ≤2.

## Phrasings
1. That pawn is weak now; keep your pieces active rather than guarding it.
2. Swap off the pieces aiming at your weak pawn.
3. If the pawn can advance safely, push it and trade it off.
4. Watch the square in front of it; that's where their knight wants to sit.
5. Their pawn is weak: block it with a knight, then pile up on it.

## Sources
- concept:pawn-isolated (Capablanca), concept:pawn-backward (Edward Lasker), concept:pawn-doubled (Edward Lasker)
- https://en.wikipedia.org/wiki/Isolated_pawn
- https://www.chess.com/article/view/the-art-and-science-of-the-isolated-d-pawn
- https://exeterchessclub.org.uk/node/804 (weak pawns: pieces tied down, square in front)
- https://en.wikipedia.org/wiki/Doubled_pawns
