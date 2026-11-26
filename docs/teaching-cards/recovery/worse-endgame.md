# A worse endgame (rook, minor piece, pawn endings) — hold it

## Principles
1. **Rook endings: keep the rook active** (checks, attacking pawns, cutting off the king); a passive rook loses. Aim for the Philidor set-up a pawn down.
2. **Trade pawns, keep the ending simple to defend;** each pawn gone brings a draw nearer, and with all pawns gone many endings are drawn.
3. **King active, in front of their pawns.** In pawn endings the king's activity decides; take the opposition to stop their king.
4. **Minor-piece endings: put your pawns where they help.** Holding a bishop: pawns on the OTHER colour from it (Capablanca), so it can guard their squares. Facing a lone enemy bishop: pawns on ITS colour, defended, so it can't win a tempo attacking from the other colour (Capablanca cf-12). Seek opposite-coloured bishops when defending.
5. **The "wrong" rook pawn:** king in front of a rook pawn, or a rook pawn with the wrong-coloured bishop, draws.
- Disagreement noted: Capablanca's two rules (pawns opposite your own bishop's colour; against a bishop, pawns on its colour) are about safety from attack and point the same way only when you have no bishop of your own; the check picks rule by what you hold.

## Deterministic check
- Worse: endgame phase, eval in (−500, −100].
- P1: rooks on; student rook mobility ≤5 or its only job is guarding a pawn (guard map) → active-rook line; Philidor available: pawn-down R+P v R, student king on the pawn's queening square or adjacent, rook can reach its 3rd rank (6th for Black) in 1.
- P2: a pawn exchange is legal with SEE ≥ 0.
- P3: student king ≥2 steps further from the centre/the passers than the enemy king → king line; pawn ending with kings on one file, one square apart → opposition line.
- P4: student has one bishop: count own pawns on its colour; enemy has one bishop: count student pawns attackable by it. Speak the matching rule.
- P5: material leaves only a rook pawn (or rook pawn + wrong bishop) and the student king can reach the queening corner first.

## Phrasings
1. In a rook ending a pawn down, keep your rook active and checking.
2. Trade the pawns; every pawn gone brings the draw closer.
3. Your king is the best defender now: bring it in front of their pawns.
4. Take the opposition and their king can't get past.
5. Keep your pawns where their bishop can't reach them.

## Sources
- concept:end-opposition (Capablanca); Library: Capablanca cf-12 (pawn-colour rules, the wrong rook-pawn bishop draw); Edward Lasker cs-4 (rook behind the passed pawn condemns the other rook)
- https://en.wikipedia.org/wiki/Philidor_position
- https://www.chess.com/article/view/the-two-rook-endings-you-must-know (activity over material)
- https://learn.chessbase.com/en/page/how-to-draw-a-pawn-ending
- https://www.chess.com/article/view/what-to-trade-in-endgames
