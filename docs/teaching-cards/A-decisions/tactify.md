# tactify — among equal moves, the one that asks a question

## A. Identity
- `src/services/tactify.ts:48` `tactify(fen, lines, student)`; helper `problemsOf` :24. Registry `tactify` `boardComputers.ts:7594-7612`, kind `method`, claim `tactify:<move>`, both seats, `namesStudentMove: side===student`. Review excluded (needs the fan). Census 34/31 (lesson).

## B. Facts
- B1: `{ side, move, problems[] (words), text, squares[from,to] }` (:22).
- B2 dropped: `top` score (:56), the best move and its problem count `bestCount` (:61), the rival scores within 40.
- B3 cheap: whether the move PLAYED was the quiet best that posed nothing while a problem-posing equal existed (the "mistake" is practical, not by cp — usually no cp loss); whether the opponent's reply to the posed problem was a mistake (look at the next game move's cost) — that is when the lesson pays off.
- B4: not in check, move ≥ 12 (:51); |top| ≤ 150 (:56); best quiet (:59); rival within 40 cp (:64), quiet, not a king (:66); more problems than the best (:68).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | "pick the one that asks them questions" | fires BEFORE the move and names the student's move (namesStudentMove: true) — banned in new Learn |
| CONSEQUENCE | partly | "now they have to calculate" | |
| BETTER MOVE + JOB | partly | move + problems | |
| HABIT | no | | "When moves are equal, pick the one that makes them think." |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON | CONSEQUENCE | BETTER | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TF1 | strategize (practical) | S | before the student's move tactify fired; student played a move with fewer problems; cost < 40 | problems | — (not a mistake) | | | | silent in Learn (no mistake); Review: "{move} was as good and asked a question: it {problems}." | never on a cost ≥ mistake (that is errorWhy's) | H |
| TF2 | their seat → payoff | O | tactify fired for them and the student's reply was a mistake | problems | "Even equal positions hide traps: their move hit your {target}, and the answer had to be exact." | errorWhy cause of the student's reply | best reply | "When their move hits something, ask what it really threatens before you answer." | after the student's mistake; lesson attaches to that mistake | the student's reply must be the mistake (cost ≥ 100) | C (look-ahead one ply) |
| TF3 | own seat → payoff | S | tactify move played by student and the opponent then erred | | Review only (praise) | | | | | | C |
| TF4 | record | — | | | RED/GREY TF2 full · AMBER one clause · GREEN silent | | | | | | H |
| — | endgame, calc, phase-opening | — | n/a — move ≥ 12, level only | | | | | | | | |

## E. Mistake link
- TF1/TF3: Review only (no mistake).
- Only through TF2: the student's mistake answering a problem-posing move (any errorWhy cause). tactify itself is never a mistake.

## F. Build changes
1. Expose `bestCount`, `top` (B2).
2. Registry: drop the pre-move Learn read (names the student's move); keep chat/lesson.
3. New join in the mistake turn: "previous opponent move had a tactify read" → TF2 recipe row, keyed on the student's errorWhy cause.

## G. Proof boards
- g:1001055178#24 O (they could play …Qd6 hitting the loose knight on a3); g:1001055178#38 O (…b5 hits the loose pawn on c4); g:1001055178#39 S (h4 at the king on g8).
- 12 hits, 1 with loss ≥ 100. Danya: vc-_X7t6o3o6JM-33, vc-_zT8aWZh2x0-59.

## H. Open questions
- None. (Whether TF1 speaks in Learn is answered by the WO: Learn is mistakes-only, so TF1 is Review only.)
