# Rooks on open files and the seventh rank

## Principle
Rooks belong on open files; double them and head for the seventh rank, where a rook eats pawns and shuts the king in. A file only helps if there's an entry square.

## When it applies / exceptions
Either seat.

## Deterministic check
- Open file = no pawns; half-open = no own pawn. Entry square = a square on the file in the enemy 6th–8th ranks (from your side) not attacked by enemy pieces. Seventh: a rook on the 7th (2nd) with enemy pawns or the king on that rank/the 8th.

## Phrasings
1. Rooks belong on open files.
2. Double your rooks on the file to win it.
3. A rook on the seventh eats pawns and pins the king back.
4. The file is only useful if your rook has a way in.
5. A pawn trade opens a file; whoever's rook gets there first owns it.

## Sources
- concept:pos-open-file, concept:end-rook-7th (Edward Lasker)
- Library: Nimzowitsch ms-7 (file operations aim at the 7th/8th), Edward Lasker cc-38
- https://chessmood.com/blog/open-files-how-to-exploit-them
- https://www.chess.com/article/view/open-files3

## Used by
readPosition G KNOW(seventh), PLAN(heavy piece to file), X PLAN(file), L CONSEQ(file)
