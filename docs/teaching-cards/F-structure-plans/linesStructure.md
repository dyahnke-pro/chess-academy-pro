# Card — `linesStructure` (family F)

### A. Identity
- `linesStructure(fen, student, lines, namesMoves)` — `src/services/structureReads.ts:184-195`: two sub-reads — `fightingLine` (`planJudgement.ts:275-300`: "It's level, so make chances: X creates the imbalance, … Y keeps it quiet") and `placementFutureLine` (`planJudgement.ts:168-~215`: "Your bishop on a3 looks dead for now, but your pawn … brings it to life"); held forms drop the moves when `namesMoves` is false.
- Adapter `registry:structureLines` (`boardComputers.ts:~3265-3275`), kind `judgement`. Census: 14 / 9 said (lesson).

### B. Facts
- **B1** `StructureRead[]` {act 'fighting-line'|'placement-future-line', text, squares, proof, key, heldForm}.
- **B2 dropped**: fightingLine's `labels` (the imbalance kinds: bishop for knight, doubled pawns for them) are only text; the eval gap between the fighting and the quiet line; placementFutureLine's pawn move that frees the bishop.
- **B3 cheap**: after the move — the student played the QUIET line in a level position when a fighting line kept equal chances (a judgement, not a mistake: cost ≈ 0) → Review/chat. Or the student played a fighting move whose imbalance favours THEM (cost ≥ inaccuracy) → "you created an imbalance that favours them".
- **B4 gates**: level position, a fighting move and a quiet move among the MultiPV lines within the gate (planJudgement.ts:275-297); placement: the best line's pawn move frees a dead bishop.

### C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | "It's level, so make chances" / "looks dead for now, but …" | — |
| CONSEQUENCE | partly | labels | — |
| BETTER MOVE + JOB | partly | the moves (held in Learn) | before-move: names the student's next move ("Nf6 keeps it quiet") |
| HABIT | no | — | — |

### D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| LS1 | strategize — imbalance | S | level; S played quiet; fighting line exists | labels | "When the position is level, make chances: an imbalance — bishop for knight, doubled pawns for them — gives you something to play for." | | (Review) "e5 created the imbalance." | | Review/chat only (not a mistake) | cost ≥ inaccuracy → it's a mistake, use another card | H |
| LS2 | knowledge — the dead bishop | S | placementFutureLine | | "A bishop that looks dead comes to life when the pawn in front of it moves." | | | | Review/chat; or BM job for a `misplaced-piece` mistake when the best line is that pawn move | | H |
| LS3 | record | — | n/a (no mistake cause) | | | | | | | | |

### E. Mistake link
- Review/chat only for LS1. LS2 can be the job of the better move for `misplaced-piece` (bad bishop) — joins readPosition's join `RP-J1`.

### F. Build changes
1. Learn: these are before-move reads ("Nf6 keeps it quiet" was said in a lesson before the move — census `vc--9fPYlSEkJ0-3`); remove from Learn's before-move path; Review/chat keep them.
2. Expose `labels` and the line gap typed.

### G. Proof boards
- `vc--9fPYlSEkJ0-3` (`rnbqkbnr/ppp1pppp/8/3p4/3P4/6P1/PPP1PP1P/RNBQKBNR b KQkq -`) "It's level, so make chances: c5 creates the imbalance, doubled pawns for them. Nf6 keeps it quiet."
- `vc-3dnTa3IoD9g-6` "Bxc6 creates the imbalance, bishop for knight and doubled pawns for them. O-O keeps it quiet."

### H. Open questions
1. Is LS1 ever a Learn line (after a quiet move in a level position)? Under "mistakes only" — no.
