# Keep your best piece; fix or trade your worst

## Principle
Your weakest piece decides how well the army plays: improve it, or trade it for one of their good pieces; don't trade your best piece for one of their worse ones; keep their bad piece bad. A bad bishop (own pawns on its colour) is a tall pawn — move the pawns off its colour.

## When it applies / exceptions
Exception: a bad bishop that guards your weak squares is a good defender — don't trade it.

## Deterministic check
- Piece quality: mobility + targets attacked (`findPieceQuality`); best = highest, worst = lowest. Trade check: a capture/trade that swaps the student's best piece for an enemy piece of lower quality → lesson. Bad bishop: see recovery/bad-bishop.md.

## Phrasings
1. Your worst piece decides how well your whole army plays.
2. Don't trade your best piece for one of their bad ones.
3. Trade their good piece, keep their bad one.
4. A bishop behind its own pawns is a tall pawn.
5. Move your pawns off the bishop's colour to free it.

## Sources
- concept:end-bishop-vs-knight (Edward Lasker: a hemmed bishop is a tall pawn)
- Library: Capablanca cf-12 (pawns opposite your bishop's colour)
- https://www.chess.com/terms/bad-bishop (trade the bad bishop for a good piece)
- https://www.chess.com/blog/NMChesstoImpress/dont-know-what-to-do-improve-the-worst-piece

## Used by
readPosition G STRAT/seat O/combo, B rows, recovery bad-bishop/stranded-piece

## Flag
THIN: 'Your weakest piece decides how well your whole army plays' (readPosition B RECOG) is a coaching maxim; sources support 'improve the worst piece', and Turzo (chess.com) disputes that it's always first.
