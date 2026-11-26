# Their knight planted on a hole / outpost — deal with it

## Principles
1. **Trade it off** — with a knight, or a bishop of the hole's colour.
2. **Attack the pawn that supports it;** without its pawn, the knight can be chased.
3. **Don't make new holes chasing it** — hasty pawn moves leave more weaknesses than the knight did.
4. **Mirror (they left a hole): plant your knight there**, backed by a pawn.

## Deterministic check
- Outpost: an enemy knight (or bishop) on a square in the student half that no student pawn can ever attack (`noPawnCanChallenge` — the one hole test), defended by an enemy pawn.
- P1: a student knight reaches a square attacking it in ≤2, or a student bishop of the square's colour exists and attacks it in ≤1, with SEE ≥ 0 for the trade.
- P2: the supporting enemy pawn can be attacked by a student pawn push or piece in 1, SEE ≥ 0.
- P3: speak whenever the only "chasing" pawn move would create a new hole (the hole test before vs after).
- P4: a student knight reaches an enemy-half hole defended by a student pawn in ≤2.

## Phrasings
1. Their knight sits where no pawn can chase it; trade it off.
2. Your bishop is the same colour as that hole; swap it for the knight.
3. Hit the pawn holding up their knight, then chase it.
4. Don't loosen your pawns chasing it; that only makes more holes.
5. They've left a hole; put your knight there and keep it.

## Sources
- concept:pos-weak-squares (Edward Lasker: holes made by pawn moves, a knight there "never leave[s]")
- concept:pawn-backward (occupy the hole before a backward pawn)
- https://en.wikipedia.org/wiki/Outpost_(chess) (hardest to remove when only an opposite-colour bishop exists)
- https://www.chess.com/blog/vitualis/strategy-knight-outposts (attack the supporting pawn; don't panic-react)
