# Learn walks — four amateur games at 800–1000, both seats, endgame-heavy (2026-09-27)

Real lichess games replayed on /coach/teach with the coach's moves dictated. Every
fix below is fenced on its real game position (`replayFence.<game>.test.ts`, real
Stockfish lines) and negative-controlled by reverting it.

| game | seat | clean |
|---|---|---|
| Damiano u2HWiU93 (1000) | White | ~65/74 (88%) |
| Bowdler K6K9k4lK (1000) | Black | ~63/69 (91%) |
| McConnell 3iFMOLY6 (1000) | White | ~58/63 (92%) |
| Colle MdVCIY3J (~800) | White | ~35/40 (87%) |

| flag | root cause | fix |
|---|---|---|
| "King's-Indian closed centre" in a Damiano | structure named by an opening | named "Closed centre" by the chain |
| "Bh6 was cleaner" then "Bh6? That drops the knight" | a static loose piece called a drop with the eval ≈ best | a drop must cost ≥ 150cp on the engine |
| "Bh6 lands on the h6 outpost" beside "your bishop on h6 is attacked and nothing's defending it" | outpost ignored hanging | no outpost where the piece hangs |
| "let them in with Kg6 / Neg6 / e5" | fallback named any first reply | only a capture or a check can "let them in"; a lost mate names itself |
| "You're a queen up" with no queens | edge wording ignored the board | a piece is named only when it is the real extra one |
| "rook against a minor piece" vs a king and a pawn | classes compared pieces only | new class `pieces-vs-pawns` |
| coach "blunder … gives away real material" walking into mate | cost fixed | names mate when it allowed one |
| "Nc6 completes your development … and develops into the game" | two development claims | completion subsumes development |
| "yours on g8 should be walking in — Kh8" | passive-king had no direction | the better king move must head to the centre |
| "Kf8 was the move — the idea is to park a piece on d4" | a king move borrowed another piece's plan | a king move gets no borrowed plan reason |
| "C5 gives you something" | sentence-cap on a pawn SAN | a stem that opens with the move keeps its case |
| "it outclasses their minor" vs a lone rook | dominance with no enemy minor | dominance needs an enemy minor |
| "O-O was the move — it would win a rook" (both queens traded in the line) | plan summed ONE side's captures | material is the board balance at the line's last quiet point |
| "Stopped calculating early again — Nxe2+ was waiting deeper" | whose move unsaid | "their Nxe2+" |
| "defend it or move it" (it unnamed) | HOW text | "defend a loose piece or move it" |
| bare "That let them win a pawn." | no move named | "…, starting with bxc4" |
| "cxd4 was the move — it would win a pawn" right after …cxd4 | recapture read as a win | a pawn capture's reason is "take the pawn on d4" |

Open: the curated "The London" beat fires on the shared 1.d4 d5 2.Nf3 Nf6 position before any London move (Colle ply 3) — needs a scoping rule for beats that name a system.
