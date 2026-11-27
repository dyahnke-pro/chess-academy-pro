# Down the queen (or a queen for little) — fight back

## Principles
1. **Look for checks first: a perpetual can still save it.** A king that can be checked forever is a draw.
2. **Build a fortress.** With pieces and pawns linked and no entry squares, the queen can't break in.
3. **Keep every piece defended.** A queen wins by forking loose pieces; leave none loose.
- Applies only while the game is not resignation-level: eval > −900. Past that, Learn says nothing (honest: no recovery to teach).

## Deterministic check
- Ledger: `Q_s − Q_o = −1` and `d ≤ −5`.
- P1: the student has a piece that gives check in one move AND the enemy king has ≤2 flight squares (chess.js legal-move count of the king after that check), queen/rook present for the student. Engine PV with repeated position = perpetual confirmed.
- P2: student pawns all mutually protected or on one wing, and no enemy piece can reach the student's back two ranks in one move.
- P3: count student pieces with 0 defenders (guard map). Fires when ≥1.

## Phrasings
1. Without your queen, look for checks; a king checked forever is a draw.
2. Keep your pieces guarding each other; a queen feeds on loose ones.
3. Lock the doors: no square for their queen to get in.
4. Down the queen, the fight is for a fortress, not a win.
5. Every loose piece is a fork waiting; tie them together.

## Sources
- https://en.wikipedia.org/wiki/Fortress_(chess)
- https://en.wikipedia.org/wiki/Swindle_(chess)
- https://en.wikipedia.org/wiki/Perpetual_check (and Library: Edward Lasker *Chess and Checkers* cc-11, perpetual check as the saving resource "without which White would be lost")
- Only ONE web source treats a fortress specifically as the queen-down plan (Wikipedia Fortress); the perpetual idea has two. Flag: P2 rests mainly on Wikipedia + *The Complete Chess Swindler* listing.
