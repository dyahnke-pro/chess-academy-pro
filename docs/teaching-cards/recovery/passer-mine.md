# A passed pawn of yours (after their mistake, or yours to use) — convert

## Principles
1. **Passed pawns must be pushed** — while it is safe; every step forces them to spend more on it.
2. **Rook behind it**, then the king beside it.
3. **Use it as a decoy:** while they chase it, strike on the other side.
- Exceptions: don't push it to a square where it is lost (a supported pawn on the 5th–6th beats a loose one on the 7th); Purdy: if it is held up before the 5th rank, the rook can be better in front.

## Deterministic check
- Student passed pawn (no enemy pawn ahead on its or adjacent files).
- P1: the stop square is safe: SEE(stop square) ≥ 0 for the pawn (attacked ≤ defended), not into a fork of its defender.
- P2: student rook reaches the file behind the pawn in ≤2 moves; endgame and student king ≤2 steps from the pawn's next square.
- P3: the enemy king/blockader is the nearest defender of an enemy pawn group elsewhere (that group's only guard per the guard map).
- Never speak on a board where `passedPawnPush` would name the move before it is played (the open-bug note): the phrasing is a plan, not a move.

## Phrasings
1. You have a passed pawn now; a passed pawn wants to be pushed.
2. Get your rook behind your passer and walk it up.
3. Let the passer tie them down, then hit the other side.
4. Push it only where it's guarded; a loose passer just gets eaten.
5. Your king should walk beside the pawn and clear its way.

## Sources
- concept:pawn-passed (Capablanca: "a passed pawn must be pushed"; the chasing king lets you strike elsewhere)
- Library: Steinitz mci-7 (rook behind passed pawns), Edward Lasker *Chess Strategy* cs-3 (rook behind an advanced pawn)
- https://en.wikipedia.org/wiki/Tarrasch_rule (incl. Purdy's refinement)
- https://en.chessbase.com/post/the-rook-belongs-behind-the-passed-pawn
