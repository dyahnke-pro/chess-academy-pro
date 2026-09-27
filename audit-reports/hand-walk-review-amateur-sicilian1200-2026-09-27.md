# Review walk — 1200 Sicilian (1ZmVtbO3), White's seat, 2026-09-27

51 narrated plies. **~46 of 51 clean (90%).** Every flagged move names its better move; many carry the punishing line.

| ply | flag | root cause | fix |
|---|---|---|---|
| 31 | "Qxe4 — it would take your knight on e4" (it was theirs) | the reason describes the board BEFORE the move; the global seating pass read the board after 16.Nxe4, where a White knight stood on e4 | the reason is seated on `fenBefore` first; tested with a negative control |
| 36 | "Here's how you take advantage: Qxc5 — you win a bishop" after …Bxc5 | a recapture presented as a win | a proof that opens by taking back on the square just captured on is not voiced |
| 55 | "a move earlier, Qxa8 would have won your queen" — garbled timing clause | — | OPEN |
| 33 | "your bishop takes on d4 and then gets trapped" — it escaped to c5 | poisoned-pawn attribution | OPEN (check the detector's "trapped" test) |
