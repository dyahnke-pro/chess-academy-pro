# Castle before the centre opens; king active in the ending

## Principle
In the middlegame a king in the centre is in the way of every line that opens: castle before the centre opens, by hand if you can't castle. In the endgame the rule flips: the king is a strong piece, bring it to the centre.

## When it applies / exceptions
Middlegame vs endgame by phase. Exception: with the queens off, a king in the centre is often fine. Overstatement in the card: 'the further the king is from the centre, the safer' — a king in the corner can be mated on the back rank; say 'tucked behind its pawns'.

## Deterministic check
- Uncastled S king on d/e file past move ~10, queens on, a central file (d/e) half-open or a central pawn break legal for the opponent.
- Endgame (phase reader): king distance to the centre (d4/d5/e4/e5) and to the passers; the king further than the enemy king.

## Phrasings
1. Castle before the centre opens, not after.
2. A king in the middle is in the way when lines open.
3. Their king is still in the centre: open lines toward it.
4. In the endgame the king is a fighter: bring it to the centre.
5. Queens off, a king in the centre is fine.

## Sources
- concept:pos-king-safety, concept:pos-development (Edward Lasker)
- concept:end-opposition (Capablanca: the king duel in pawn endings)
- https://www.chess.com/article/the-principles-of-the-opening (castle early)
- https://www.chess.com/article/view/the-bishops-show-king-activity (king to the centre in endings)
- https://www.chess.com/article/view/lead-in-development (open lines on a king in the centre)

## Used by
readPosition K rows, pictureVerdict combo king-in-centre, phase endgame rows

## Flag
OVERSTATED: readPosition K KNOW 'The further the king is from the centre, the safer it is in the middlegame.'
