# Weak back rank — fix it

## Principles
1. **Make an escape square for the king** (a "luft") when you have a quiet moment.
2. **Keep a rook or queen guarding the back rank** until the king has air.
3. **Don't pull your last back-rank defender away** — count the checks before you move it.
4. **Mirror (their back rank is weak): bring a heavy piece to an open file and look for the check on their back rank.**
- Cost named: the escape-square pawn move slightly weakens the king's cover (lichess/chess.com) — prefer the pawn whose square isn't a hole for their pieces.

## Deterministic check
- Weak: student king on its back rank, all its forward squares occupied by own pawns/pieces or attacked, AND an enemy rook/queen has a path to the back rank (open/half-open file or rank reachable in ≤2) — the same test the back-rank mate detector uses.
- P1: no enemy forcing move pending (`computeMustDefend` empty) and a pawn push in front of the king is legal with the new square not attacked.
- P2: count student pieces guarding the back rank (attack the squares between the enemy entry point and the king); fires at 1.
- P3: the student's move removed a back-rank guard and the engine PV checks on the back rank (cause `abandoned-defender` / `allowed-mate`).

## Phrasings
1. Your king has no air; give it an escape square when you can.
2. Keep a rook on your back rank until your king can breathe.
3. That rook was your last back-rank guard; don't send it away.
4. Their king is boxed in; get a rook to the open file.
5. Before you move a back-rank defender, count their checks.

## Sources
- https://en.wikipedia.org/wiki/Back-rank_checkmate
- https://www.chess.com/article/view/chess-tactics (back rank mate)
- https://chess.com/terms/chess-defense (an h/g pawn advance helps prevent back-rank mate)
- concept:end-rook-7th (the mirror: a rook pins the king to its back rank)
