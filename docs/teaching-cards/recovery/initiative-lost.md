# Initiative or tempo lost — regroup

## Principles
1. **First stop their threat, then ask what they want next** (prophylaxis), and take that away.
2. **Defend with a move that also improves a piece** — never a pure waiting move; useless "safety" moves hand them more time.
3. **Look for the counterattack once they run out of forcing moves.** The side without the initiative wins it back by counterattack.
4. **Mirror (they wasted a tempo): use it at once** — develop, press a weakness, open the file; the initiative passes on one idle move.

## Deterministic check
- Lost: the opponent's best line (engine PV, 4 plies) contains ≥2 forcing moves (check, capture, or a move creating a new threat by `computeMustDefend`) and the student's eval fell ≥ 80cp from the previous student move, with no material change.
- P1: `computeMustDefend` on the current board is non-empty → name the threat's target.
- P2: among the moves that meet the threat (engine top-3 within 50cp), one also raises that piece's mobility or develops a back-rank minor → speak P2 (as a plan).
- P3: engine PV after the defence has a student check/capture/threat within 2 student moves.
- P4: opponent's move is `tempo-wasted` (cause row) → mirror.

## Phrasings
1. They have the initiative now; first deal with what they're threatening.
2. Ask what they want next, and take it away.
3. Defend with a move that improves a piece, not a waiting move.
4. Once their threats run dry, hit back.
5. They gave you a free move; use it before they catch up.

## Sources
- concept:pos-initiative (Capablanca: "one idle move and it passes to him"), concept:pos-tempo (Capablanca)
- https://en.wikipedia.org/wiki/Initiative_(chess) (regain by counterattack; superfluous prophylactic moves lose time)
- https://en.wikipedia.org/wiki/Prophylaxis_(chess)
- https://www.chess.com/article/view/prophylaxis-in-chess
