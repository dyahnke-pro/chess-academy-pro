# Develop fast and with purpose

## Principle
Bring every piece out before attacking, each piece once, to a square it can't be chased from; minor pieces before the queen and rooks; castle early. Ahead in development, open the position; behind, keep it closed and catch up; punish undeveloped pieces fast.

## When it applies / exceptions
Opening only. Exceptions: moving twice to win something; the queen may come out when it gains something concrete (Edward Lasker cc-54: the rule exists because the queen gets chased). 'Knights before bishops' is a heuristic (Capablanca, Edward Lasker) — not a law (chess.com's list doesn't include it).

## Deterministic check
- Development count = minors off their home squares + castled; lead = difference ≥ 2.
- Lead + a central pawn exchange legal → 'open it'. Behind + the student's move opens a central file → the lesson.
- Piece moved twice (pieceMovedAgain) with other minors home and no threat made.
- Queen out early: queen moved before move 6 with ≥2 minors home and the opponent's PV attacks it with development.

## Phrasings
1. A piece still at home can't fight.
2. Ahead in development, open the position before they catch up.
3. Behind in development, keep it closed and get your pieces out.
4. Moving the same piece twice hands them a free move.
5. Your queen came out early and got chased, costing you time.

## Sources
- concept:pos-development (Edward Lasker)
- Library: Capablanca cf-5/cf-31 (a knight before the bishops), Edward Lasker cc-54 (why the queen shouldn't come out too soon), cs-6
- https://www.chess.com/article/the-principles-of-the-opening
- https://www.chess.com/article/view/lead-in-development

## Used by
readPosition D rows, pictureVerdict combo, tempo-wasted

## Flag
HEURISTIC, not law: 'Knights before bishops' (readPosition D KNOW). Sources say 'a shade better', never a rule.
