# Learn walk — amateur game 1ZmVtbO3 (Sicilian, Delayed Alapin, 1194 v 1299), White at 1200, 2026-09-27

**~36 of 40 distinct narration lines correct (90%)** — the ply-15 cluster (5 lines) is a CHAT ANSWER (`assemblePositionAssessment`) to the walk's dictation text on that turn, not narration, and is excluded; 37 of 45 (82%) if it is counted. The hardest game of the night: the student's side makes a mistake nearly every move from 27 on, so the verdict lanes all fire at once.

| ply | flag | status |
|---|---|---|
| 37 | Bxc5 Nxc5 recapture called "that sacrifice doesn't land" | FIXED — overvalued-attack excludes a capture on the square the opponent just captured on (no unit test: a synthetic line did not reach the detector, so the test was vacuous and was deleted; verified by re-walk) |
| 15 | bishop pair said twice | the second was the chat answer's balance sheet (instrument); the balance-sheet reason is now keyed `student-bishop-pair` anyway |
| 49 | "Qxc8 was the move" then "you'd love to play Qxc8 — it falls apart" — true about two different moments, contradictory when heard together | OPEN (lane timing) |
| 37 | back-rank sentence twice in one utterance | OPEN |
| 11/15 | "castling is ready" at moves 6 and 8 | the second was the chat answer; the positional read's keys are now also written to the standing memory the phase lane reads |
| 3 | "It's the Modern Variations." — a generic DB label | OPEN |
| 15 | stray "Material is even" + the cluster above | instrument: the dictation turn produced a position-assessment chat reply. OPEN QUESTION: why "play X" routed as a question on that turn — worth checking it is not a real routing bug |
