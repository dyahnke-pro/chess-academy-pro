# Learn hand walk — Carlsen–Topalov, Sinquefield 2015 (fresh game), Black at 1500

Every spoken line graded against the board (engine-checked where a claim needed it).
Logs: `hand-walk-learn-carlsen-topalov-2026-09-27.log` (before), `…-rewalk-2026-09-27.log` (after).

| | before | after |
|---|---|---|
| lines correct | 45 / 65 = **69%** | 53 / 56 = **95%** |
| moves with nothing wrong | 13 / 30 | 25 / 30 |
| missed key teaching | 2 (…g5 gambit, f7 threat) | 1 (f7 threat) |

## Fixed (root causes)
| flag | cause | fix |
|---|---|---|
| repeats ×9 | say-once keys named the SQUARE, so a rook sliding g8→g6 / a passer running h2→h5 was new each step | idea keys (`goodPieceIdeaKey`, passer by file, `file-<f>` alias) shared by positional read, behaviours, balance sheet |
| bishop pair twice | behaviour lane didn't know the move point said it | `student-bishop-pair` key written on the move that wins it |
| development ×3 in one move | three producers | one key `student-development` across positional read, behaviour, piece-value read |
| "it has to move" (…dxc5 answers) | "free to take" needed zero defenders | the student can take it in a trade that loses nothing (signed SEE ≥ 0) |
| "get castled" ×2 unreachable | only checked the right exists | `castleRoute`: ≥2 blockers → no advice; 1 → "move your bishop on c8, then castle long" |
| "you win the knight" vs "…exf6 falls apart" | static count on a piece that just landed | `opponentLastTo` — the sibling of `studentLastTo`; the engine lanes judge it |
| "something to win here" (…Rxg5 loses to d4) | undefended ≠ free | states the fact and the check; the engine lane names the move |
| "queen on d1 does the most work" | unmoved queen compared to the other unmoved queen | home-square pieces never "most work" unless a heavy piece on a pawn-free file |
| "nothing takes it back safely" after Na3 | computed before the reply, spoken after | re-verified on the board it is spoken on |
| phantom skewer | step detector counted any bigger-in-front line | front piece must be forced to move, back piece worth taking |
| "the king to c7 does the same job" | hedge named only the alternative | every hedge stem names both moves |
| seatless "a pawn break is available on d5" | wording | "You have a pawn break on d5" |
| …g5 gambit unexplained | no lane for an accepted offer | "g5 was a gambit — they took the pawn, and in return the g-file is open for your rook" |

## Re-walk 3 (same game, after the fixes above)
31 of 32 distinct lines correct (97%). SAN/spoken pairs and "Check." echoes counted once.

| flag | verdict | fix |
|---|---|---|
| f7 not warned after Qxh5 | the f7 pin claimed the turn, was dropped as a repeat, nothing replaced it | king-pawn check runs again whenever the threat lane ends empty |
| "their passed pawn on h2" at 18 and 21 | positional read and structure plan kept separate memories | `StructurePlanFact.ideaKey` = the positional key; each lane checks the other |
| "your h6 piece" | blockade named the square only | names the piece: "your bishop on h6" |
| …Rg7 "buried bishop" | NOT a defect: engine says Rg6 (best) also drops h7; the bishop is the difference | none |
| "up 1 point of material" | did not recur in walk 3 | watch |
