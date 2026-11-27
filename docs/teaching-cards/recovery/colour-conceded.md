# A bishop of one colour traded off (colour conceded) — repair (David's approved turn)

## Principles
1. **Put your pawns on the lost bishop's colour.** Pawns become the missing bishop: they guard those squares.
2. **Cover the holes with a knight or the queen** — the pieces that work on both colours.
3. **Trade off their bishop of that colour** if you can; then the weakness has no one to use it.
4. **Mirror (they gave up the colour): aim knight and queen at those squares and plant pieces there.**
- Exception (endgame): Capablanca's rule — keep your pawns on the opposite colour of YOUR remaining bishop; with the matching bishop gone, that is the same advice. In an opposite-bishop defence, the weaker side may put pawns on its own bishop's colour to build a fortress (Wikipedia) — that case is a defend-for-draw exception, not the repair.

## Deterministic check
- Concession: student has 0 bishops on colour C, opponent has ≥1 bishop on colour C (square colour of the bishop's square).
- Targets: student pawns or key squares on colour C in the student half that are attacked by the enemy bishop's diagonals (chess.js attacks after removing pawns? no — real attacks).
- P1: a student pawn exists that can legally reach a square of colour C in ≤2 pushes, where that square is a hole (no student pawn guards it) — name it as a plan ("pawns on dark squares"), never as a move.
- P2: a student knight reaches the hole in ≤2 moves (knight BFS), or the queen in 1.
- P3: a student piece can trade the enemy C-bishop (attacks it with SEE ≥ 0, or a student minor can occupy its diagonal with support).

## Phrasings
1. Without that bishop, put your pawns on the dark squares to guard them.
2. Your pawns must do the bishop's job now: put them on its colour.
3. Bring a knight to the hole; it can cover any colour.
4. Their bishop rules those squares now; trade it off if you can.
5. They've given up the light squares; send your knight to live there.

## Sources
- Library: Capablanca *Chess Fundamentals* cf-12 ("When the opponent has a Bishop, keep your Pawns on squares of the same colour as your opponent's Bishop … whenever you have a Bishop … keep your Pawns on squares of the opposite colour"); Nimzowitsch ms-70 (a bishop's principal weakness is the defencelessness of the other colour).
- https://www.chessprogramming.org/Color_Weakness
- https://www.chess.com/article/view/the-weak-dark-square-complex (queen + knight exploit it)
- https://exeterchessclub.org.uk/node/838 (weakness comes from trading the bishop / pawns on its colour)
- https://en.wikipedia.org/wiki/Opposite-colored_bishops_endgame (the fortress exception)
