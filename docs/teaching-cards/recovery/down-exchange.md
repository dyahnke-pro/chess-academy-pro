# Down the exchange (rook for a minor) — fight back

## Principles
1. **Make the minor piece the best piece on the board.** Put it on a square their rooks can't touch; a well-placed knight or bishop with a pawn can hold a rook.
2. **Keep the rooks locked out.** Close files and cover the entry squares so their extra rook has nothing to do.
3. **Collect a pawn for it.** One pawn is often enough compensation, two almost always.
- Applies: `d ≈ −2` with the student holding a minor the opponent's rook replaced (ledger: student lost R, opponent lost N/B).
- Exception: in a pure rook-vs-minor ending with open files, the rook usually wins; then head for fortress ideas (pawns on one side, king in front).

## Deterministic check
- Ledger: student has one rook fewer and one minor more than the opponent (`R_s − R_o = −1`, `minor_s − minor_o = +1`).
- P1: the student's minor has a square it can reach in ≤2 moves that no enemy pawn can ever attack (the hole test `noPawnCanChallenge`) and is central (files c–f, ranks 3–6 from its side).
- P2: count open/half-open files toward the student camp: a file with no student pawn where an enemy rook can reach the student's 1st/2nd rank. Fires if ≤1 such file (it can still be shut).
- P3: an enemy pawn is attacked ≥ defended (exchange ledger SEE ≥ 0) or reachable by the minor in 2 moves.

## Phrasings
1. You've given up the exchange, so make your knight the best piece here.
2. Their rook needs open files; keep them shut and it has nothing.
3. Plant your minor piece where no pawn can chase it.
4. Win a pawn back and the exchange hardly counts.
5. Cover the squares their rook wants to enter, and it stays idle.

## Sources
- https://en.wikipedia.org/wiki/The_exchange_(chess) (one pawn may suffice, two almost always)
- https://www.chess.com/blog/backrankbrawler/the-unintentional-exchange-sacrifice (maximise the minor's activity)
- https://www.chess.com/article/view/exchange-of-quality (restricted enemy rook, damaged structure as compensation)
- Library: Capablanca cf-23 (the side up the exchange must "weather the storm", then use numerical superiority — so the down side's chance is the storm: activity now).
