# Time is a piece: tempo and initiative

## Principle
Every move should add something; a move they can ignore, a check that changes nothing, or a piece that has to retreat hands them a tempo. The side making threats holds the initiative and keeps it only by pressing.

## When it applies / exceptions
Either seat. Exception: moving a piece twice is fine when it wins something or forces a reply.

## Deterministic check
- tempo-wasted: the student's move creates no new threat (`computeMustDefend` empty for them), is not a capture, and the engine's best reply is a developing/improving move; OR a check answered by a king move that improves their king; OR the moved piece is chased home within 2 plies (board after 4 plies equals before).
- allowed-threat: the opponent's best reply attacks a student piece and develops (gains tempo).

## Phrasings
1. That check changed nothing and gave them a free move.
2. In the opening, time is a piece too.
3. Your knight gets chased back, and they gain the time.
4. If they can ignore your move, it was a move given away.
5. They make the threats now; answer, then win the move back.

## Sources
- concept:pos-tempo (Capablanca)
- concept:pos-initiative (Capablanca)
- concept:pos-development (Edward Lasker: move each man once)
- https://en.wikipedia.org/wiki/Initiative_(chess)

## Used by
tempo-wasted, allowed-threat, pictureVerdict T KNOW(check), T CONSEQ(tempo), readPosition D CONSEQ/exception

## Flag
THIN on 'a check is only good if it gains something' — supported as a tempo idea (pos-tempo) but no source states it as a rule; keep as a tempo consequence.
