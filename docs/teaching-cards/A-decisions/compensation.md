# compensation / gambitIdea — what pays for the material

## A. Identity
- `src/services/compensation.ts`: `compensation(fenAfter, student, studentCp, line)` :49; shared reason list `compensationReasons(board, comp, student, minLead)` :103.
- `src/services/gambitIdea.ts`: `gambitIdea(fenBefore, san, after, studentWB, costCp)` :66.
- Registry `compensation` `boardComputers.ts:3791-3810` (kind `compensation`, claim `compensation:<who>:<down>`, seat by who) and `gambitOffer` :6468-6482 (kind `compensation`, weight 80, tag = capture square). Census: compensation 32/21, gambitIdea 11/11.

## B. Facts
- B1 compensation: `{ who, down, band, reasons[], squares[], text }` (:19-29). gambitIdea: `{ clause, verdict, sound, sans, captureSquare, squares }` (:29-41).
- B2 dropped: compensation — `compCp` (:82), the raw vs quiet balance (:63-65), `ini` side (:76); gambitIdea — `cp` of the acceptance line (:258), `down` (:239), the ledger (:245).
- B3 cheap: whether compensation PERSISTS — the same `compensationReasons` on the board at the end of the engine line (play `line` 6 plies) → "the lead is temporary"; which reason is the largest contributor (development lead count vs king in centre).
- B4: compensation — line's next move quiet (:56); down ≥ 1 by both counts (:65-70); compensated side ≥ −50 (:68); ≥ 1 board reason or the initiative (:81). gambitIdea — cost < BLUNDER_CP (:199); not in check (:207); acceptance line captures, settles down ≥ 1 (:240-242); not lost past −150 (:262); sound = cp ≥ −50 and cost < 60 (:263).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | "You're a pawn down, but it is about level: you have the initiative." | it is a verdict + reason (board statement); no general rule |
| CONSEQUENCE | partly (gambit) | verdict "It does not pay: it costs about a point." | what to do with it |
| BETTER MOVE + JOB | no | — | |
| HABIT | no | — | "Material given must buy time: use it at once." |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON | CONSEQUENCE | BETTER | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CP1 | evaluate + strategize | S | gambitIdea `sound=false`, student mover, cost ≥ mistake | given, reasons | "A gambit pays only if what you get back is worth more than the material. Here {given} bought {reasons}, and that is not enough." | verdict words | "{best} kept the material" (grade) | "Before you give material, name what you get for it." | after move | cost < blunder (:199) — a blunder is errorWhy's | H |
| CP2 | strategize (use it) | S | compensation for student, then the student's move is slow (cost ≥ mistake) and B3 says the reason vanished | reason | "Compensation is a lead in time. Use it straight away, or it goes: your {reason} is gone after this move." | "You're just a pawn down now." | best | "When you're down material for activity, every move must use the activity." | after move | B3 must show the reason gone | C |
| CP3 | their seat | O | their gambit that doesn't pay | | "Material given is only worth it while the lead it buys lasts. Their pawn bought {reasons}, and that runs out." | "You stay a pawn up." | n/a | — | Learn: only if their move was a mistake; never "take it" (the student's next move) and never "the engine says" (authority is not a reason) | | H |
| CP4 | their seat (defend) | S | `compensation(fenAfter)` for the opponent includes reason kind `king-centre` (F1) AND the student's king is still on its home square after the move AND cost ≥ mistake AND the best move castles | reason | "When they've given material for an attack on your king, the king comes first. Your king on {ksq} is still where their pieces aim." | — | "{best} castled out of it." (past only — castling is often still legal next move: `pastBetterNameable`) | "When they've paid material for an attack, deal with their trump before your own plan." | after move | reason = king-centre; held while castling is still the best next move | C (reason key, F1) |
| CP5 | record | S | | | RED/GREY full · AMBER one clause · GREEN silent | | | | | | H |
| — | endgame | — | an advanced passer as compensation: covered by the passer reason | | | | | | | | |
| — | calculate | — | gambit line is given (sans), recipe can say "if they take, you develop" — inside CP1 | | | | | | | | |

## E. Mistake link
- errorWhy: CP1 attaches to `allowed-capture`/`unexplained` turns where the move gave material (gambitIdea fires below blunder only); CP2 needs a new cause `compensation-lost` (Review/chat only until it exists); CP4 rides `king-hunt` (E13) or `positional` tag `king-stuck-center` (E15); CP3 on the O-seat cause of their move.
- Student: an unsound sacrifice (costReason `missed`/none + material given) → CP1; a slow move that drops compensation → positionalReason none today (needs cause `compensation-lost`). Opponent: CP3.

## F. Build changes
1. Type the reasons: `compensationReasons` returns `{ kind: 'development'|'king-centre'|'bishop-pair'|'passer'|'initiative', words, squares }[]` instead of strings (:103-118).
2. gambitIdea: expose `cp`, `down` (B2).
3. New `compensationHolds(fen, line, comp)` (B3) for CP2.
4. Recipes to `mistakeLesson`; compensation's own `text` stays as Review's standing line only.

## G. Proof boards
- g:1013773584#3 S `f4` loss 99 (King's Gambit offer): "offers a pawn: if they play exf4 and you answer Nf3, you're a piece ahead in development. It does not pay: it costs about a point." → CP1 at the inaccuracy edge.
- g:1015773958#32 S `Nxe4` loss 126: "gives a knight for two pawns … their king is still in the middle. It does not pay" → CP1.
- g:1020632112#10 S `Bxf2+` loss 0 → sound (Traxler-type) → silent in Learn (guard).
- compensation: g:1020779996#57 S `bxa6` loss 197 → "They're a pawn down, but they're winning: their passed pawn on c3 and the initiative" → CP4 shape (their trump ignored).

## H. Open questions
- f4 at 99 cp (King's Gambit) — a well-known opening is "not paying" by the engine. Should Learn ever say that about a named gambit the student chose on purpose?
