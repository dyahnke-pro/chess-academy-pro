# counterThreat — danger levels: answer a threat with a bigger one

## A. Identity
- File: `src/services/counterThreat.ts` (97 lines): `counterThreat(fenBefore, san)` (36–79), `counterThreatLine(c, byStudent)` (81–97).
- Registry: `boardComputers.ts` `counterThreat` (5068–5091), kind `must-defend`, seat = the mover; the student's own counter-threat is credited only when its cost is < `COUNTER_THREAT_HELD_CP` (60, line 1734); stakes for theirs = `threatStakes` on the hit piece; proof = the punishing line. Learn lane `dangerLevels` (learnTurnDoor 566, lead 96, always).
- Reach: learn door (+ lesson via the bundle), chat via tapped/play ask; review **no** (Review reads the left piece as loose and the hit as a threat through its own facets). Census: 9 lines, 8 said (lesson). Run: 6 fires (3 each seat), 1 student move cost ≥ 100 (g-1020632112 ply 16 …Ng5, cost 124).

## B. Facts
- **B1** `CounterThreat` (16–24): `left {piece, square}` (the mover's piece still attacked), `hit {piece, square, by}` (the bigger enemy piece newly attacked, and the attacker's square), `line {fen, sans:[take, back]} | null` (the other side takes the piece left; the mover takes the bigger one), `squares`.
- **B2 dropped:** the full list of threatened pieces (`threatened`, 40) and of hit pieces (sorted, `[0]` kept, 54); the SEE net of each (`computeMustDefend` values) — "worth more" is decided on piece type only (`CAPTURE_VALUE`, 53), not on what the exchange nets; whether the bigger threat is a CHECK or comes with tempo; whether the opponent has a third option (a counter-counter) — not checked.
- **B3 cheap:** whether the other side has an answer that saves the bigger piece AND takes the left one (a zwischenzug: move the big piece with a capture / check) — one scan of the replies on `fenAfter` that move `hit.square` and capture or check; the net of the line (`settledNetForLine` on `line.sans`).
- **B4 gates:** the left piece must be ≥ 3 points, not the king (40); still attacked after the move, and not the piece that moved (47); the hit piece is newly en prise (SEE) and worth more by type (52–54); the line is built only when a capture of the left piece exists (63–68). Student credit only under 60 cp (registry 5076).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | `counterThreatLine`: "Answer a threat with a threat to something worth more." | already the approved shape |
| CONSEQUENCE | yes | `line` ("Bxg5 wins a bishop, but Nxg4 costs you your queen") | — |
| BETTER MOVE + JOB | partly | for their counter-threat: the right answer (save the bigger piece) is not named | the saving move |
| HABIT | no | — | "before you take, ask what they attack" |

## D. Lesson recipes
Causes: **CTH-GRAB** (S): their move was a counter-threat and the student took the piece left (the line's first move) and cost ≥ floor; **CTH-FAIL** (S): the student's own counter-threat cost ≥ floor (the bigger threat had an answer); **CTH-MISS** (S): the student's piece was attacked, a counter-threat existed (the engine's best is a counter-threat) and the student retreated / lost ≥ floor.

| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CTH1 | consequence (the grab) | S | CTH-GRAB | left, hit | "The bigger threat comes first: they left their {left} on {sq} because they were hitting your {hit} on {hsq}." / "When they leave a piece en prise, look at what they attack first." | "Taking the {left} costs you your {hit}." | "{best} saved the {hit} first." | "Before you take, ask what their last move attacks." | full; the student's capture is "your capture", never by name | the student's capture also saved the hit piece (a capture with tempo) | H (line) + C: student's move = line.sans[0] |
| CTH2 | knowledge (danger levels) | S | CTH-MISS | left, hit (the best move's) | "Answer a threat with a threat to something worth more: you didn't have to retreat — {best} hit their {hit}." | "Your retreat gave them time." | "{best} — the bigger threat comes first." | "When a piece is attacked, look for a bigger threat before you retreat." | full (once past) | the best move is a plain retreat | C: run counterThreat on (fenBefore, best) |
| CTH3 | calculate (the counter-counter) | S | CTH-FAIL | — | "A bigger threat only works if they can't save the big piece with a threat of their own: {reply} moved it and hit back." | "You lost the {left} after all." | "{best} — {job}." | "Check their checks and captures before you leave a piece hanging." | full | — | C: B3 zwischenzug scan |
| CTH4 | opponent seat (credit theirs, as their mistake) | O | their counter-threat cost them ≥ floor | — | "A counter-threat fails when the threatened side can answer with tempo: their {left} was lost for nothing." | — | — | — | Review | — | C |
| CTH5 | record | S | — | — | RED/GREY full · AMBER "The bigger threat comes first." · GREEN silent | | | | | | `holdState` on `missed-counter-threat` (new tag, F3) |

Not applicable: plan, phase, structure angles (a one-move tactic).

## E. Mistake link
- Student: CTH1 = `costReason` **allowed** where the blow takes `hit` after the student captured `left` (motif `hanging_piece` / null) — today no `MistakeCause` names "you took the bait"; CTH2 = `costReason` **missed** (best move was a counter-threat); CTH3 = `whyItFailed` **answered-by-tactic** on the student's counter-threat.
- Opponent: CTH4 (Review).

## F. Build changes
1. `counterThreat.ts` 52–54: decide "worth more" on the SEE net of the hit (`computeMustDefend` value), not piece type — a queen attacked but guarded enough by a cheaper piece's exchange is still worth less than the left piece in some lines (keep the type rule as a tie-break).
2. Add `zwischenzug: string | null` (B3: a reply that saves `hit` with a capture or check) → CTH3 and a guard for CTH1.
3. Add the tag `missed-counter-threat` and route CTH1/CTH2 through `mistakeLesson`; keep `counterThreatLine`'s idea sentence as the CTH lesson stem (it is already the approved voice; move it into the recipe table).
4. `boardComputers.ts` 5076: the student's costly counter-threat (cost ≥ 60) is dropped today — under mistakes-only it is CTH3's trigger, not a silence.

## G. Proof boards (run)
- Their counter-threat: g chesscom-1005776142 ply 47 Nc4 (opponent; student Black) → left bishop b4, hit queen b6, line axb4 Nxb6 — the CTH1 board (cost of the student's next move decides it).
- CTH3 (the student's counter-threat that cost): g chesscom-1020632112 ply 16 …Ng5 (cost 124) `r1b1k2r/pppp1Npp/2n5/4p3/2B1n2q/4KQ2/PPPP2PP/RNB4R b kq - 3 8` → left rook h8, hit queen f3, line Nxh8 Nxf3.
- Student credit (cost < 60): g chesscom-1036689856 ply 20 …Bxf3 (cost 0) → left knight f4, hit rook h1 (Learn silent — not a mistake).
- Census: lines-0.jsonl:733, lines-0.jsonl:8172 (the "Bxg5 wins a bishop, but Nxg4 costs you your queen" proofs).

## H. Open questions
- A correct counter-threat by the student is credited today ("You left your knight on d4 and went after their rook"). Under mistakes-only this praise goes — confirm.
