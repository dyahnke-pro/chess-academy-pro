# King exposed / cover gone / facing a mating attack — fight back

## Principles
1. **Trade off their attackers — the queen first.** Without the queen most attacks fizzle.
2. **Bring defenders home, and don't open more lines** near your king (no further pawn pushes in front of it).
3. **Hit back in the centre or at their king.** A flank attack is best met by a counter in the centre; a counterattack can be the only defence.
4. **Mirror (their king exposed after their mistake): keep the queens on and aim everything at it.**
- Exception: a queen trade that loses material or wrecks your pawns is not a relief.

## Deterministic check
- Exposure: student king zone has ≥2 squares attacked by enemy pieces and not covered by a student pawn, OR the shield (the 3 pawns in front of a castled king) has ≥2 gone/advanced past rank 3 from its side, OR the king is on its back rank file d/e with an open d/e file and queens on.
- Mating attack: engine PV contains a mate for the opponent, or ≥3 enemy pieces attack the king zone.
- P1: a legal trade of the enemy queen (or a piece in the king zone) with SEE ≥ 0.
- P2: a student minor/rook is ≥4 king-steps from its king and has a route of ≤2 moves into the king zone.
- P3: the enemy attack is a wing pawn storm (enemy pawns advanced on the student king's wing) AND a student pawn break in the centre is legal (a pawn capture or push on files c–f contacting an enemy pawn).
- P4 fires on the opponent's mistake with the zones swapped, and only with queens on.

## Phrasings
1. Your king is open now, so trade their queen if you can.
2. Bring a piece back to guard the king, and push no more pawns there.
3. Their attackers do the damage; swap them off one by one.
4. When they attack on the wing, strike back in the centre.
5. Their king is bare now: keep the queens on and aim at it.

## Sources
- concept:pos-king-safety (Edward Lasker, *Chess Strategy*): don't push the shield pawns; "where his shelter is broken, there you aim".
- https://www.uscfsales.com/blogs/chess-strategies/trade-chess-queens (trade queens with a weak king; don't if it costs material)
- https://chessmood.com/blog/how-to-defend-in-chess-8-must-know-defensive-ideas (counterattack, trade attackers)
- Library: Capablanca cf-31 (the defender "simplifies, hoping to lighten White's attack"); Edward Lasker cc-62 (moving the g-pawn creates a dangerous weakness).
- https://en.wikipedia.org/wiki/Initiative_(chess) (regain it by counterattack)
