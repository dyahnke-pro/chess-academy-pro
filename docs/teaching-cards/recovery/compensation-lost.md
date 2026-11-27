# Lost compensation after a sacrifice — what now

## Principles
1. **Keep forcing or cash in.** After a sacrifice, every move must make a threat; once the threats run out, take material back where you can.
2. **Don't go quiet.** A quiet move after a sacrifice gives them time to consolidate and the sacrifice becomes just a loss.
3. **If neither, switch to the down-material plan** (see down-pawn / down-piece): keep pieces, complicate.
4. **Mirror (their sacrifice failed): consolidate** — return material if needed to kill the attack, trade attackers, then win with the extra force.

## Deterministic check
- Sacrifice: student is down ≥1 in the ledger from a capture/move the engine had rated sound at the time (graded sound ply), and the current eval is ≤ −100 with no forced line.
- P1: engine top move is forcing (check/capture/new threat) → "keep forcing"; else if a capture regaining ≥ the deficit has SEE ≥ 0 → "cash in".
- P2: the student's last move was quiet (not forcing) and the eval fell ≥ 100cp → the cause's own lesson.
- P3: neither → route to down-* files by the ledger.
- P4: opponent seat: the engine top move returns material (student gives back) or trades a piece in the student king zone.

## Phrasings
1. After a sacrifice, every move has to threaten something.
2. The attack slowed, so take material back while you can.
3. A quiet move gave them time; the sacrifice is now just a loss.
4. Their attack ran out: trade their attackers and keep the extra piece.
5. Give a little back if it kills the attack for good.

## Sources
- concept:tac-sacrifice (Edward Lasker: a sound sacrifice is calculated to its end)
- https://www.chess.com/blog/Tricks-of-Chess/when-material-doesnt-matter-the-art-of-sacrifice-and-dynamic-compensation (passive play is fatal after a sacrifice)
- https://lichess.org/@/a8086555/blog/is-your-sacrifice-a-blunder/OST9ddK0 (regain or mate within a few moves — blog, weaker)
- Library: Capablanca cf-23 ("win the exchange and then prepare to weather the storm. Then, once it is passed, act quickly with all forces" — the defender's mirror)
- https://en.wikipedia.org/wiki/Compensation_(chess) (compensation is usually short-term)
