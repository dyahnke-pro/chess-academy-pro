# threatPurpose — the threat's real point behind the obvious one

## A. Identity
- File: `src/services/threatPurpose.ts` (202 lines): `threatPurpose(line, student)` (43–71), `apparentTarget` (21–38), `piecesWonByMover` (117–160), `DECISIVE_LINE_CP = 250` (41); siblings `lineBuilds` (77–109, used by `coachFeatureService` 5799), `lineRestatesClaim` (194–202).
- Registry: `boardComputers.ts` `threatPurpose` (4398–4420), kind `threat`, seat = the line's first mover, proof = the whole line (`lineProofFromUci`), claim `purpose:<uci>`.
- Reach: learn door, review, lesson, chat, tapped, tactics. Census: 44 lines, all lesson, all said ("Their Rh5 looks aimed at your pawn on h6, but its real point is your pawn on f7.").

## B. Facts
- **B1** a sentence only: `"{Their|Your} {firstSan} looks aimed at {the apparent target}, but its real point is {mate | trading queens into an ending they win | the piece won}."`
- **B2 dropped:** `apparent` `{piece, square}` and `won` `{piece, square}` (52, 63) — both computed and turned into words; the mate/queen-trade/material branch chosen (57–65) is not a field; the line's length; `lineBuilds`' rank and the thing built (positional real points) live in another function.
- **B3 cheap:** expose `{ apparent, real: { kind: 'mate' | 'queen-trade' | 'material', piece?, square? }, plies }` — every value already exists; and, on a mistake turn, whether the student's move DEFENDED the apparent target (the student's move added a guard to `apparent.square` or moved it) — one chess.js `attackers()` diff.
- **B4 gates:** the line ≥ 3 plies (44); an apparent target exists (53); a different, at-least-as-valuable piece won (64), kept (not taken straight back, 154), not walked into (155), and taken by the piece that moved first (124–150). Note `apparentTarget`: when the line's first move is a capture, the apparent target IS the captured piece (27) — TP1's "defended the apparent target" can then never be true, so captures never fire TP1; the caller passes only lines verified decisive for the mover (≥ 250 cp, `DECISIVE_LINE_CP`).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | "looks aimed at … but its real point is …" | the general rule is not said |
| CONSEQUENCE | yes | the real point | — |
| BETTER MOVE + JOB | no | — | the move that met the real point |
| HABIT | no | — | — |

## D. Lesson recipes
Causes: **TP-DECOY** (S): the student's move answered the APPARENT target and the decisive line (their real point) followed — student cost ≥ floor; **TP-O** (O): the student's threat's real point (their seat: they defended the apparent target and lost the real one).

| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TP1 | identify (real target) | S | TP-DECOY, real = material | apparent, real | "The obvious target isn't always the real one: their {first} looked aimed at your {apparent}, but the line wins your {real} on {sq}." / "Defend what the line wins, not what the move touches first." | "The {real} falls." | "{best} covered {real sq}." | "When they make a threat, play their line out to the end before you defend." | full; the student's move is "your defence" | the student's move did not defend the apparent target (then TP1 isn't the reason — use costReason) | C (B3 defended diff) |
| TP2 | identify (mate) | S | TP-DECOY, real = mate | apparent | "A threat to a piece can hide a mate: their {first} hit your {apparent}, but the real point was mate." | "Mate follows." | "{best} covered the mating square." | "When they threaten a piece, ask whether the line ends in mate." | full | — | H |
| TP3 | strategize (trade into a won ending) | S | TP-DECOY, real = queen trade | — | "Trading queens is a weapon when the ending is won: their {first} was heading for a queen trade they win." | "The ending is lost for you." | "{best} kept the queens on." | "Before you allow a queen trade, look at the ending it leaves." | full | the ending is not decisive (caller's 250 cp bar) | H |
| TP4 | opponent seat | O | TP-O: their move defended the apparent target of the student's threat and lost | — | "They defended the wrong thing: your {first} looked aimed at {apparent}, but the line won {real}." | — | — | — | after the student's reply; Review full | — | H |
| TP5 | knowledge (combination) | both | real ≠ apparent | — | "Good threats come in pairs: hit one thing so they can't save the other." | | | | Review only | | H |
| TP6 | record | S | — | — | RED/GREY full · AMBER "The real point was {real}." · GREEN silent | | | | | | `holdState` on `missed-real-threat` (new) |

Not applicable: phase / structure angles (it reads a tactical line); `lineBuilds` (the positional real point) is its own lesson set — "a quiet line that builds a passer / outpost" — and belongs to the line card that calls it.

## E. Mistake link
- Student: `costReason` **allowed** where the blow is the `real` capture or mate and the student's move had defended `apparent` (TP1–TP3). Today `errorWhy` names the blow but not the decoy.
- Opponent: TP4.

## F. Build changes
1. `threatPurpose.ts` 43: return data — `{ apparent, real, plies, firstSan }` — and move the sentence to `mistakeLesson` (the computer keeps a `renderThreatPurpose` only for Review).
2. Add `defendedApparent(fenBeforeStudentMove, studentSan, apparent): boolean` (B3) so TP1 fires only when the student fell for the decoy.
3. `MistakeCause`: add `decoy-defended` (TP-DECOY) beside the costReason motif.

## G. Proof boards
- Census lines (lesson, said): lines-0.jsonl:8829 "Their Rh5 looks aimed at your pawn on h6, but its real point is your pawn on f7." (TP1 shape); lines-0.jsonl:8259 (TP3, queen trade); lines-0.jsonl:5862 "Your Rxh4 … real point is mate" (student seat — the capture IS the apparent target: guard against calling a capture's own victim a decoy, F2 keeps it Review-only).
- Guard: a line whose won piece is taken straight back (154) — never said.

## H. Open questions
- none.
