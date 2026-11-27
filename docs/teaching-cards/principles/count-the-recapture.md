# Count who takes back

## Principle
A piece is only free if nothing can take it back, and a target falls only when its attackers outnumber its defenders (counting values, cheapest first).

## When it applies / exceptions
Either seat. Overstatement in the cards: 'A threat on a guarded piece isn't a threat' is FALSE when the attacker is worth less than the target (a pawn attacking a guarded knight still wins it). 'A guarded piece isn't a gift, it's a trade' holds only when the capturer is worth no more than the target.

## Deterministic check
- Static exchange evaluation on the target square (the app's exchange ledger / SEE): free = SEE ≥ value of target with no recapture; trade = SEE ≈ 0; losing = SEE < 0.
- Count: attackers vs defenders including x-ray batteries (pieces behind on the same line).
- 'Isn't a threat' is said ONLY when SEE for the attacker ≤ 0 AND the attacker's value ≥ the target's.

## Phrasings
1. A piece is only free if nothing can take it back.
2. Count who takes back before you capture.
3. One more attacker than defender, and the piece falls.
4. It was guarded, so the capture was just a trade.
5. Aiming at a guarded piece wins nothing unless your attacker is cheaper.

## Sources
- concept:pawn-backward (Edward Lasker: 'defended only so many times before the attackers outnumber the guards')
- concept:tac-pin (pile attackers on the pinned piece)
- https://www.chess.com/article/view/chess-tactics (hanging piece = undefended)
- https://www.chessprogramming.org/Static_Exchange_Evaluation

## Used by
took-guarded, eyed-guarded, pictureVerdict T CONSEQ/CALC(target), readPosition G CALC, S CALC, L CONSEQ(wins pawn)

## Flag
WRONG as written: eyed-guarded L1 'A threat on a guarded piece isn't a threat' — needs the value condition.
