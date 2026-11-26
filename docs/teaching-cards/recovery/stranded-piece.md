# A stranded / misplaced piece — bring it back

## Principles
1. **Improve your worst piece.** The piece doing nothing comes back toward the centre.
2. **Knights belong in the centre;** on the rim it controls half as much and arrives late.
3. **Mirror (their piece is stranded): keep it out** — take away its way back, play on the other wing.
- Caveat (chess.com, Turzo): improving the worst piece is not always first — a threat or a break can matter more; the check speaks only when nothing forcing is on the board.

## Deterministic check
- Stranded: a student piece with mobility ≤2 (legal moves), OR a knight on the a/h file or 1st/8th rank, OR a piece ≥5 king-steps from every other student piece.
- No forcing priority: `computeMustDefend` empty and no student check/capture in the engine top move.
- P1/P2: a route of ≤3 moves (piece BFS over legal-move graph, ignoring captures) to a central square (c3–f6 box) that is not attacked by an enemy pawn.
- P3: enemy piece passes the stranded test and its route back has a single entry square the student can attack.

## Phrasings
1. Your knight on the edge is out of play; bring it toward the centre.
2. Find your worst piece and give it a job.
3. A knight on the rim sees half the board; walk it home.
4. That bishop is doing nothing; reroute it to an open diagonal.
5. Their knight is stranded; keep its way back shut.

## Sources
- concept:pos-center (Capablanca: "a knight on the rim is dim")
- https://www.chess.com/article/view/is-a-knight-on-the-rim-always-grim
- https://www.chess.com/blog/attilaturzo/why-improve-your-worst-piece-is-often-not-enough
- https://www.chess.com/blog/NMChesstoImpress/dont-know-what-to-do-improve-the-worst-piece
