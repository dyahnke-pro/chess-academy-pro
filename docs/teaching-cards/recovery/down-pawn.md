# Down a pawn (your mistake) — fight back

## Principles
1. **Middlegame: buy activity with the pawn.** Keep pieces on and active; a passive pawn-down position just loses slowly. Use the files and diagonals the pawn's loss opened.
   - Applies: phase = middlegame, `d ∈ [−1.5, −0.5]`, eval not decided.
2. **Endgame: trade pawns, not necessarily pieces.** Fewer pawns means fewer ways to make a queen; many pawnless or one-pawn endings are draws. Rook endings and opposite-coloured bishops are the classic drawing havens, so trades that lead there help.
   - Applies: phase = endgame (or one trade from it).
   - Exception: never trade into a pawn ending a pawn down unless it is a known draw (the king in front of a rook pawn) — pawn endings are the least forgiving.
3. **Keep the rook active, not tied to a pawn.** In rook endings activity outweighs a pawn; a passive rook guarding loses.

**Sources disagree (named):** on PIECE trades a pawn down. Chess.com "What to Trade in Endgames" and Capablanca (cf-31, trading knights "to remain with Bishops of opposite colours, which gives him the best chance to draw") say trading INTO a known drawish ending is good; the "avoid trades" blogs (Dummies, chess.com 6-strategies) talk about being down a piece in a complicated middlegame. Resolution the check encodes: a pawn down, avoid piece trades in the middlegame unless the trade lands in a rook ending or opposite-coloured bishops.

## Deterministic check
- `d ∈ [−1.5, −0.5]` at the line's quiet end, `eval ∈ (−500, −50]`.
- P1 fires if middlegame AND the student has a piece whose legal-move count rose after the pawn left (a newly open file/diagonal: file of the lost pawn has no student pawn and a student rook/queen can reach it in one move).
- P2 fires if endgame. Sub-flag `ocb` = each side has exactly one bishop, opposite square colours, no other minors; sub-flag `rookEnding` = only rooks + pawns.
- P3 fires if rook ending and the student's rook's only job is guarding a pawn (`computeMustDefend`/the guard map: removing the rook leaves a pawn hanging) while an enemy pawn or the enemy king's rank is reachable.

## Phrasings (≤14 words)
1. A pawn down, so keep your pieces busy and make them prove it.
2. Your pieces have more room now; use it before they consolidate.
3. In the ending, trade pawns: every pawn gone is one less to queen.
4. A pawn down, a rook ending or opposite bishops is your best drawing chance.
5. Keep your rook active; a rook stuck guarding a pawn loses anyway.

## Sources
- concept/library: Capablanca *Chess Fundamentals* cf-31 (opposite bishops "best chance to draw"); Emanuel Lasker / Mason aoc-19 (the winner must not reduce to opposite bishops — the mirror).
- https://www.chess.com/article/view/what-to-trade-in-endgames
- https://www.chess.com/article/view/exchanging-while-defending
- https://en.wikipedia.org/wiki/Opposite-colored_bishops_endgame
- https://www.chess.com/article/view/the-two-rook-endings-you-must-know (rook activity)
