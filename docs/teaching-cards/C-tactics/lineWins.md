# lineWins — card

## A. Identity
- `lineWins(fen, lineUci, side, firstSan, prior, seconds, opts)` — `src/services/lineCalc.ts:37-122` (`LineWin` :20) (ledger `heardProofCut`, trust `lineTrust`, words `materialWords`/`gainAfterLine`); arrows `lineArrows`.
- Board computers: `lineWinsAt` (boardComputers.ts:4618-4632, Review walk, `squares: []`) and `winsLine` (:4823-4840, the student's played best move's line).
- Census: 20 fired / 20 said, all Review.

## B. Facts
### B1. Handed over (`LineWin`)
`net` (pawns, ledger, prior capture subtracted), `what` ("a queen and a pawn for a bishop"), `afterLine`, `sans`, `plies` (from, to, color, fen, san).
### B2. Dropped
- The ledger's `studentWon` / `opponentWon` arrays (`took`/`gave`, :101-102, piece letters) and `made` (`studentPromoted`, :111) are folded into `what` — the typed material list is lost to recipes (needed for "you give a bishop and get the queen").
- The MOTIF of the line — never classified here; `detectTacticType` on the same line is one call away.
- `proof.plies` (where the line's material settles) vs the longer engine line — the settle point is the consequence moment.
- The prior-capture correction (`priorTook`, :104-110) — "they had taken a knight first, so the line only gets it back" is a teaching fact (recapture vs win) dropped.
### B3. Cheap
- `detectTacticType(fen, lineUci[0], lineUci)` → motif word for the LESSON slot.
- First move kind (check / capture / quiet) from `plies[0].san` → "it starts with a check".
### B4. Gates
≥ 2 plies by default (`minPlies`, lineCalc.ts:76); ledger net ≥ 1 pawn after the prior capture (:109); not mate (mateLine owns that); ≥ 2 plies; first move must equal `firstSan`; `lineTrust(...).name` (the naming rule: near / agreed / forcing-agreed); `winsLine` only when the played move = best.
Wording defect: census "That wins a new rook: you play R1g4+ and, two moves later, you play h8=R" — under-promotion said as "a new rook" (promotedIn path) — the line is a promotion to rook; words should say "a pawn promoted to a rook".

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | no | — | the motif (B3) and the rule "a forcing line is counted to its end" |
| CONSEQUENCE | yes | `what` + `sans` | it IS the consequence/proof; key moves only (voice rule 4: never a score sheet) |
| BETTER MOVE + JOB | partly | `sans[0]` | when S missed it: the first move as "the move", once past |
| HABIT | no | — | spotCue `after-forcing-line` ("At the end of every trade … look again") |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| LW-1 | calculate (S missed a winning line) | S | errorWhy kind `missed`, best line → lineWins non-null | motif (B3), what, key moves | "Checks and captures first: a forcing line can win material outright. Here a check on c8 won a queen and a pawn for a bishop." / "Count a forcing line to the end before you dismiss it. It ends a queen up." | `what` | "Qc8+ was the move — the check that starts it." (once past) | "Every move, look at checks, captures and threats first." | after, key moves only, past-only | line untrusted; mate (mateLine) | H + B3 |
| LW-2 | consequence (S allowed their line) | O | costReason `allowed`, the reply line → lineWins(side=O) | what, moves | "A move that lets them start a forcing line is a mistake even if nothing hangs now. Their check on f7 starts a line that wins your queen." | `what` | errorWhy best | "Before you move, check their checks and captures." | after | — | H + B3 |
| LW-3 | knowledge (sacrifice) | both | ledger gave ≥1 piece and net ≥ 1 | studentWon/opponentWon (B2) | "Giving material is fine when the line gets more back: a bishop for a queen and a pawn." | | | | → deepCombination card | net < 1 | B2 |
| LW-4 | exception (recapture, not a win) | both | priorTook set and net after correction ≥ 1 | B2 | "Taking back what they took isn't winning: the line gets the knight back and a pawn more." | | | | Review | net < 1 → null (gate) | B2 |
| LW-5 | knowledge (under-promotion) | both | promoted ≠ q | — | "Promote to the piece that wins: sometimes a rook, not a queen, because the queen would be stalemate or lost." | | | | Review | — | H (promotedIn) |
| LW-REC | record | — | motif tag hold rate (yours/theirs) | | RED/GREY full; AMBER "The forcing line wins a queen."; GREEN silent | | | | | | holdRate |
n/a: phase (any), plan/strategize (lines are tactical), prevent (LW-2 covers).

## E. Mistake link
- The CONSEQUENCE slot of every material costReason (`allowed` and `missed`, any motif) — this is errorWhy's "line played out" step.
- Own lessons: LW-1 (missed, S), LW-2 (allowed, O).

## F. Build changes
1. lineCalc.ts:20-30 `LineWin` — add `took`, `gave` (typed piece lists, :101-102), `made` (:111), `settlePly` (= proof.plies), `priorTook` → recipes LW-3/LW-4.
2. Add `motif: TacticType` (detectTacticType on the shown line) → LW-1/LW-2 LESSON.
3. Fix the under-promotion words ("a new rook") in `materialWords`/`gainAfterLine` for `made` ≠ q.
4. boardComputers.ts:4622 — the sentence "That wins X: you play …" becomes the CONSEQUENCE field of the recipe; spoken with key moves only (rule 4).
5. `lineWinsAt` `squares: []` → pass the capture squares of the line so support links it.

## G. Proof boards
- Text (lines-0, review): "That wins a queen and a pawn for a bishop: you play Bxf7+, they answer Kxf7 and you play Qxd8." (LW-1/LW-3); "That wins a pawn: you play cxb4, they answer Kb5 and you play a3." (quiet end — rule 4 key moves); "That wins a new rook: … h8=R" (F3 defect).
- No voiced board (Review on games only).

## H. Open questions
1. none
