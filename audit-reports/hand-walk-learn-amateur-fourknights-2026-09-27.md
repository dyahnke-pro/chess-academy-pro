# Learn walk — amateur game G9hZ0VpT (Four Knights Italian, 1518 v 1517), Black at 1500, 2026-09-27

**~42 of 45 distinct lines correct (93%).** Every real blunder in this amateur game was caught with a correct refutation ("b6 was a mistake — it let them in with Qb4", "there's a forced mate here — mate in 12, starting with Nf4").

| ply | flag | fix |
|---|---|---|
| 22, 26 | "isolated pawn on h6" twice, from the behaviour lane and the positional read | the behaviour's isolated-pawn line carries the positional read's file key |
| 6 | "Nf6 unpins your pawn on f7" — a pawn in front of a defended knight is no pin | a relative pin needs the rear piece to be the king, worth more than the pinner, or undefended |
| 42 | "a minority attack on the kingside — f3 makes contact" | kept: 2 v 3 on that wing is a minority attack by definition |

Tests: `reviewMoveTeaching.unpin.test.ts` (with the Bg5-pin control).
