# heldResource — keep the pin back until it bites

## A. Identity
- `src/services/holdResource.ts`: `heldResource(fenBefore, san, bestSan, cpLoss)` :129 (kept, past) and `holdIdea(fen, student, bestSan)` :150 (prospective); line finder `heldResourceLine` :67; text `heldText` :167.
- Registry `heldResource` `boardComputers.ts:1870-1884`, kind `timing`, claim `once:hold:<move>`, student move only, proof = legal line. Also `orderTeaching.ts`. Census 6/6 (lesson).

## B. Facts
- B1: `{ text, sans:[their knight dev, bishop pin], threat:[capture, pawn recapture], fen, resource, squares, check }` (:20-36).
- B2 dropped: none of note — the doubled-pawn file, the king behind the pin are inside the line but not typed.
- B3 cheap: the INVERSE (the mistake): the student SPENT the pin/check early (played the bishop move when the knight was still home) and it was parried; detect: played = a bishop check/pin from move ≤ 15 that `holdIdea` on the board before would have flagged, and cost ≥ mistake.
- B4: `cpLoss < 30` and played = best (:130-132) — only a GOOD move; move ≤ 15 (:134); they can't win material first (:75); the bishop square is safe (:95); every recapture doubles pawns (:110).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | "Keeping the bishop check back is right: once their knight comes to c6, the bishop pins it…" | praise of a good move; mistakes-only Learn never says it |
| CONSEQUENCE | yes | "taking it would leave them doubled pawns" | — |
| BETTER MOVE + JOB | n/a | — | (inverse needs it) |
| HABIT | no | — | "Save a pin until it lands on a piece." |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON | CONSEQUENCE | BETTER | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| HR1 | timing (kept) | S | today's fire | knight sq | "A pin is strongest when there is a piece to pin. Keep the bishop back until their knight comes to {sq}." | "then the capture doubles their pawns" | — | — | Review/lesson only | | H |
| HR2 | timing (spent early, inverse) | S | B3 inverse fires | bishop move | "A check with nothing to pin is easily parried. The bishop came out before their knight was on {sq}, so it bit on nothing." | "It gets kicked and you lose the time." | "{best} — the bishop stays home until the knight comes out." | "Save a pin for the piece it will pin." | after move | the early bishop move must be the cost (errorWhy positional / tempo) | C |
| HR3 | their seat | O | they spent it early | | "Their early bishop check pins nothing; you can block with a developing move." | — | n/a | — | Learn: on their mistake only | | C |
| HR4 | record | S | | | RED/GREY HR2 · AMBER "Save the pin for a piece." · GREEN silent | | | | | | H |
| — | endgame, calc, prevent | — | n/a (opening-only line) | | | | | | | | |

## E. Mistake link
- Today: none (fires only on cpLoss < 30). HR2 would teach principle `tempo-handed` / `early-queen-sortie`-like piece sorties; cause `tempo-wasted`.

## F. Build changes
1. `holdResource.ts`: export `spentEarly(fenBefore, san, cpLoss)` = the move played is the bishop move that `holdIdea(fenBefore, …)` says to save; cost ≥ 100.
2. Register HR2/HR3 under cause `tempo-wasted`.
3. HR1 stays a Review/lesson praise line.

## G. Proof boards
- g:1002984876#5 S `d4` loss 15 (HR1: Bb5+ saved until …Nc6). g:1013773584#11 S `Nc3` loss 9 (HR1).
- Danya: vc-_X7t6o3o6JM-9 / -11.
- Guard: both hits are clean moves → Learn silent.

## H. Open questions
- None.
