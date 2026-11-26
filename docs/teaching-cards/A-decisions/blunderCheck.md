# blunderCheck — CCT for them before you let go

## A. Identity
- `src/services/safetyHabits.ts`: `blunderCheck(fenBefore, san, reply, cpLoss, again)` :29; sentence `BLUNDER_CHECK_QUESTION` :69, `blunderCheckAnswer` :73, `blunderCheckAgain` :77 (3 rotated callbacks). Sibling `slipHabit` :132 (the habit reader `methodBeat`/`correctionHabit` use).
- Registry `blunderCheck` `boardComputers.ts:4887-4909`; kind `rule`; claim `method:blunder-check` (full once a game, then `:<ply>` callbacks); stakes = points of the piece taken, plies 1; seat `student`.
- Called from Learn `learnBoardTeaching.ts:251` (student's move, `faultCp` from `moverFault` :209) and Review bundle. Census: 10 said / 11, review only (one subsumed by kneeJerk).

## B. Facts
- B1: one string: the question + "Here the answer was {…Bxg5, taking your knight on g5 | their check, Bh5+}".
- B2 dropped: `r.captured`, `r.to`, `r.color` (:46-54) — the piece and square lost (the registry re-derives them for stakes only, :4893-4897); the `trade` decision (:49); whether the answer was a capture or a check (two branches, flattened into text).
- B3 cheap: WHY the piece became takeable — `whyItFailed` kinds from the error computer on the same move (`abandoned-defender`, `lost-the-piece`, `walks-into-fork`) — or `slipHabit`'s `guardLeft` (:138); the defender count before vs after on `r.to` (chess.js) → "your move took away its last guard".
- B4: `cpLoss >= 150` (`BLUNDER_CHECK_CP` :24; Learn passes `faultCp`, 0 when not a graded fault); reply legal; reply captures non-king and SEE after the move > 0 and not a like-for-like retake (:46-54) OR reply gives check (:60).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | the question | it is a habit stated first; no general lesson with this board's example |
| CONSEQUENCE | yes | "the answer was …Bxg5, taking your knight on g5" | — |
| BETTER MOVE + JOB | no | — | from errorWhy |
| HABIT | yes | BLUNDER_CHECK_QUESTION | record gate; here it is the LEAD, the template wants it LAST |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON | CONSEQUENCE | BETTER | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BC1 | consequence (left en prise) | S | capture branch | piece, sq, reply piece | "A piece left where it can be taken for free is simply lost. Your {piece} on {sq} had no answer to their {reply piece}." / "Every move changes what is guarded: after this one your {piece} on {sq} could simply be taken." | "They win the {piece}." | errorWhy better + job | "Blunder check before you let go: what checks, captures and threats do they have once it lands?" | after move; habit LAST | not a like-for-like trade (:49) | H |
| BC2 | identify (guard removed) | S | capture branch + B3 `guardLeft` or defender count dropped to 0 | guard piece | "Before a piece moves, ask what it is guarding. Your {mover} was the last guard of the {piece} on {sq}." | BC1 | — | "Ask what a piece guards before it moves." (`slipHabit` 'what-it-guarded') | | guard really left (count before >0, after 0) | C |
| BC3 | knowledge (check first) | S | check branch | check san | "Checks come first in their reply, so they come first in your blunder check. Here their check was the start of it." | the line after the check (errorWhy) | — | BC1 | | check must start the losing line (errorWhy agrees) | H + C |
| BC4 | their seat | O | same gates, opponent mover | | "They let go of a piece without checking your captures: one of theirs is loose." (piece and square held until the student has moved — focus clue rule) | "You win the {piece}." | the capture is the student's next move → Learn holds it | — | Learn: never name the capture; "a piece of theirs is loose" (focus clue rule) | today wording hard-codes "your" (:54) — the pure run on g:1012441262#44 (O) produced "taking your knight on e4", wrong seat | C (seat param) |
| BC5 | record | S | | | RED/GREY BC1–BC3 full · AMBER callback stem (:78-80) · GREEN silent | | | | | | H |
| — | plan, strategize, phase | — | n/a — a blunder check is phase-free; no plan fact | | | | | | | | |

## E. Mistake link
- errorWhy causes: `left-hanging` (E6) BC1, `abandoned-defender` (E7) BC2, `answered-by-check` (E5) / `allowed-mate` (E1) BC3, `left-hanging` O-seat (E6o) BC4. All attach to a mistake turn (cost ≥ 150).
- `whyItFailed`: `lost-the-piece`, `abandoned-defender`, `walks-into-fork` (check/capture reply), `answered-by-tactic` (BC3); costReason `allowed`, `blowPlies` 1. Student today; opponent via BC4.

## F. Build changes
1. `safetyHabits.ts:29` return `{ answer: 'capture'|'check', reply, piece, square, trade:false }` typed; sentence → `mistakeLesson` (BC1–BC4) with the habit LAST.
2. Add `mover` param (REQUIRED); fix the hard-coded "your" (:54/:60). Registry `boardComputers.ts:4890` passes it; seat no longer fixed `'student'` (:4902).
3. Join with errorWhy's `whyItFailed.kind` (one cause) so BC2 reads `guardLeft` instead of re-deriving; one claim `method:blunder-check` shared with `slipHabit`.
4. Threshold: keep 150 for the full lesson; below it the grade's own cause speaks (no change).

## G. Proof boards
- g:1012441262#9 S `Bxf7+` → "…Kxf7, taking your bishop on f7" (loss 288). g:1020779996#63 S `Rxg2` → "…Bxg2, taking your rook" (217).
- g:1001055178#66 O `Qe8` loss 2000 → check branch "their check, Bh5+" — but it is THEIR move, so the student is the checker: proves the seat bug (BC4).
- 31 hits on 12 games (9 S, 22 O). Guard: Ruy-style Bxc6 dxc6 trades are skipped by :49.

## H. Open questions
- BC4 in Learn: may the coach tell the student a piece of theirs is free right after their move (a pointer at the student's next move)? CLAUDE.md carve-out 4 says only on RED/GREY skill — confirm that applies here.
