# Passed pawns: push yours, blockade theirs

## Principle
A passed pawn must be pushed (with support); theirs must be blockaded — best by a knight on the square in front — and a rook belongs behind a passed pawn, yours or theirs.

## When it applies / exceptions
Exceptions: Purdy (rook in front when the pawn is held before the 5th), Averbakh (king blockading → rook from the side). 'Passed pawns must be pushed' is overstated without the support condition — the cards' own KNOW(passer) row adds it.

## Deterministic check
- See recovery/passer-against.md and recovery/passer-mine.md (passed-pawn test, rule of the square, SEE on the stop square, rook reach behind).

## Phrasings
1. A passed pawn has to be stopped, so block the square in front.
2. Passed pawns want to be pushed, with support.
3. The best blocker of a passed pawn is a knight.
4. Put your rook behind the passed pawn.
5. Push it without support and it's just a lost pawn.

## Sources
- concept:pawn-passed (Capablanca)
- Library: Nimzowitsch ms-16/ms-17 (blockade), Emanuel Lasker csc-8, Steinitz mci-7
- https://en.wikipedia.org/wiki/Tarrasch_rule
- https://en.wikipedia.org/wiki/Passed_pawn

## Used by
passer-handed, readPosition X PREV/PLAN/KNOW(passer), pictureVerdict T KNOW(passer)

## Flag
OVERSTATED without support: 'Passed pawns must be pushed' (readPosition X PLAN passer) — say it with 'with support' / 'while it's safe'.
