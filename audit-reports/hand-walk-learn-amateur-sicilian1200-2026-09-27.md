# Learn walk — amateur game 1ZmVtbO3 (Sicilian, Delayed Alapin, 1194 v 1299), White at 1200, 2026-09-27

**~37 of 45 distinct lines correct (82%).** The hardest game of the night: the student's side makes a mistake nearly every move from 27 on, so the verdict lanes all fire at once.

| ply | flag | status |
|---|---|---|
| 37 | Bxc5 Nxc5 recapture called "that sacrifice doesn't land" | FIXED — overvalued-attack excludes a capture on the square the opponent just captured on (no unit test: a synthetic line did not reach the detector, so the test was vacuous and was deleted; verified by re-walk) |
| 15 | bishop pair said twice (balance sheet + move point) | balance-sheet reason now keyed `student-bishop-pair`; a guard on the move point would have silenced it everywhere (the instant pass writes the key first) and was reverted — OPEN |
| 49 | "Qxc8 was the move" then "you'd love to play Qxc8 — it falls apart" — true about two different moments, contradictory when heard together | OPEN (lane timing) |
| 37 | back-rank sentence twice in one utterance | OPEN |
| 11/15 | "castling is ready" at moves 6 and 8 | OPEN |
| 3 | "It's the Modern Variations." — a generic DB label | OPEN |
| 15 | stray "Material is even" | instrument (arrives on a dictation turn) |
