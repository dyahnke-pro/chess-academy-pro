# Hand walk — /coach/endgame (2026-10-01)

Walked by hand on localhost (muted hand-page driver), every tab, flags first,
fixes after. David: "We need a good sweep of that page … It's pretty jacked up."

| # | Where | Flag |
|---|---|---|
| E1 | Mating → Piece Mates | Labelled "Recognition only — practice corpus coming soon"; they are playable. Named patterns with a playable lesson (Damiano's, …) also say "Recognition only". |
| E2 | Rook / Queen / Two-Rook / B+N mate | A single curated line forces one-answer mode ("Not the move") — the code's own comment says basic mates have no single correct technique and should be free play. |
| E3 | Mating intro voice | Method said twice: the authored intro, then the computed rule saying the same. |
| E4 | Rook mate | "Rh1 keeps an edge" — a move that still forces mate called "an edge" (strict mode). |
| E5 | Damiano's Mate | "A pawn or bishop **pins** the king to a square" — misuses pin. |
| E6 | Damiano's Mate | "bring the queen to h8" — the mate is on h7 (supported by the g6 pawn). |
| E7 | Mating, solved | "Line completed. The geometry is the same…" — nothing spoken, nothing about WHY it is mate. |
| E8 | Principles / Drawn | "7,188 drill puzzles" on four unrelated principles — the general endgame pool presented as principle-specific. |
| E9 | Two Weaknesses | "Once both sides have weaknesses" — means both flanks; reads as both players. |
| E10 | Two Weaknesses | The line (Kd3 Kd7 Ke3 Kc6 Kd4 Kb6 Ke4 Kc6) never attacks a6 and never plays g4-g5 — does not show the narrated plan; "White wins" is unverified (`auditSkip`). |
| E11 | Key Squares rule | "For a rook pawn, there are no key squares — the pawn only draws" — false. |
| E12 | Triangulation | "three of your moves and one of your opponent's" — the defender spends two. |
| E13 | Key Squares rule | "two ranks ahead" only holds up to the 4th rank. |
| E14 | Key Squares why | "from any of them the white king controls e7 **and e8**" — no 6th-rank king covers e8. |
| E15 | Philidor (Rook + Drawn tabs) | Rook drops back "when the pawn reaches the 5th" — it is the 6th (the defender's 3rd rank). |
| E16 | Vančura | "the SIDE of the 3rd rank (from the pawn's POV), pawn distance away" — garbled. |
| E17 | Stalemate Stalking | "If the opponent doesn't give you a check or capture, it's stalemate" — wrong definition. |
| E18 | Perpetual Check | "Repeat the sequence three times" — it is the same position three times. |
| E20 | Q vs R Fortress | The keystone is a plain Q vs R **win** (tablebase) — no fortress shown in Drawing Patterns. |
| E21 | Philidor keystone | Attacking king already on the 6th, defending rook not on its 3rd rank, student plays the attacker — not a Philidor set-up. |
| E22 | Stalemate Stalking keystone | Already stalemate on the board — shows the result, not the plan. |

Verified true on the walk: key-square keystone (Kd6 / Kf6 / e5 all win, tablebase);
wrong tries refuted on curated mates ("Qh6? Then …gxh6 — they come out the queen up").
