# A passed pawn against you — stop it

## Principles
1. **Blockade it, best with a knight**, on the square right in front. A stopped passer is just a pawn.
2. **Bring your king in front of it** in the ending.
3. **Put your rook behind it** (Tarrasch); the further it goes, the more the rook sees.
- Exceptions: when your king blockades, the rook is often better attacking from the side (Averbakh); a rook check from the side (Vancura) and the second-rank defence break Tarrasch's rule.

## Deterministic check
- Enemy passed pawn: no student pawn ahead on its file or adjacent files (chess.js).
- Urgency: `toQueen` = squares to promotion; the rule of the square (student king Chebyshev distance to the queening square ≤ toQueen, adjusted for side to move).
- P1: a student knight (or bishop controlling the stop square's colour) reaches the stop square in ≤2 and it is not attacked more than defended there.
- P2: endgame and the king is inside the square / reaches the stop square in ≤ toQueen.
- P3: rooks on, a student rook can reach the pawn's file behind it (between the pawn and its own back rank) in ≤2 moves; skip P3 when P2 holds and the king already blocks (say the side-check line instead).

## Phrasings
1. Their passed pawn has to be stopped: put a knight in front of it.
2. A blocked passer is just a pawn; get a piece on the square ahead.
3. Bring your king over; it's the best blocker in the ending.
4. Put your rook behind that pawn; it gets stronger as the pawn advances.
5. That pawn runs on a free road, so stand something in its way.

## Sources
- Library: Nimzowitsch *My System* ms-17 (the blockade: a piece directly in front); Emanuel Lasker *Common Sense* csc-8 ("best way to stop an adverse passed Pawn with a Rook is to place the Rook behind it"); Steinitz mci-7 (attack hostile pawns in the rear).
- https://en.wikipedia.org/wiki/Tarrasch_rule (incl. the Averbakh exception)
- https://en.wikipedia.org/wiki/Passed_pawn
