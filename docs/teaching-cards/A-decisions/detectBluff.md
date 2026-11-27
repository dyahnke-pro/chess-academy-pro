# detectBluff — the scary move that wins nothing

## A. Identity
- `src/services/bluffDetector.ts`: `detectBluff(fenBefore, san, bestReplySan)` :38; `bluffClause(b, opening)` :121.
- Registry `bluff` `boardComputers.ts:6070-6090`; kind `bluff`; claim `bluff:<square>`; reads the OPPONENT's move only (`turn === student` → null, :6072); seat `opponent`.
- Surfaces: lesson, review, play, chat, think, learn (via thought), tactics. Census 28/27 across learn/lesson/chat/review.

## B. Facts
- B1: `{ piece, square, targets: [{piece, square}] }` (:23-29), targets sorted by value.
- B2 dropped: the reasons each target is safe (`standsSafe`, :64) — guard count; that it is NOT a pin (:68) and NOT a guard-removal (:73); that the engine's reply does not react (:84-89).
- B3 cheap: the student's actual reply — did they move a target piece / guard it anyway (wasted tempo) → the mistake side; the engine reply (bestReplySan) — the useful move they could play instead (Review only); whether the bluffing piece is now itself exposed (attackers on `square`).
- B4: not a capture, no check (:43); N/B/R/Q (:44); lands in the other half (:49); not winnable itself (:54); every target safe incl. pawns (:64); no pin behind (:68); no guard removal (:73); `detectNewThreat` null (:79); engine reply does not take it or move a target (:84-89).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | "looks aggressive … but it wins nothing — no need to react" | it is said BEFORE the student moves (pre-move = banned in new Learn); lesson must move to the student's reaction |
| CONSEQUENCE | partly | "keep developing / improving" | when the student did react: "you spent a move answering nothing" |
| BETTER MOVE + JOB | no | — | engine reply (bestReplySan) is in the input, dropped |
| HABIT | partly | "keep improving your pieces" | "ask what it actually threatens before you react" |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON | CONSEQUENCE | BETTER | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BL1 | recognize + prevent (over-reaction) | S | prior opponent move was a bluff AND student's move moves/guards a target AND cost ≥ mistake | bluff piece, target | "A piece that attacks something it can't win is not a threat. Their {piece} on {sq} hit your {target}, but it was safe where it stood." / "Don't answer an attack that wins nothing: your {target} was guarded enough." | "Moving it spent your move for nothing." | "{best} used the move" (grade) | "Before you react to an attack, ask what it really wins." | after the student's move | the reaction must be what cost (errorWhy cause none/positional) | C (reaction read) |
| BL2 | their seat (their mistake) | O | bluff move itself cost them ≥ mistake | | "A move that only looks aggressive often leaves something behind. Their {piece} wandered in and {what it left}." | errorWhy allowed cause | the punish is the student's next move → held | — | Learn: lesson + "there is something to take" only on RED/GREY (pointer rule) | | H + errorWhy |
| BL3 | phase: opening | S | BL1 fires AND move ≤ 10 | bluff piece | "In the opening a piece that hits something guarded is just developing. Your {target} was guarded, so the answer was to keep developing." | BL1 | BL1 | BL1 | same | BL1's guard | H |
| BL4 | record | S | | | RED/GREY full · AMBER "That attack won nothing — no need to react." · GREEN silent | | | | | | H |
| — | endgame, plan, calc line | — | n/a — the detector reads one move's hits | | | | | | | | |
| — | exception | — | a pin or guard removal is not a bluff (already excluded :68/:73) | | | | | | | | |

## E. Mistake link
- BL1/BL3: no errorWhy cause covers a tempo spent answering nothing → `unexplained` (E20, silent) until F3 adds `tempo-wasted`; Review/chat only until then.
- BL2: errorWhy O-seat `allowed-capture` / `allowed-tactic` / `left-hanging` (E11/E10/E6o) on their bluff move — attaches today.
- Student mistake: a tempo spent on a non-threat — no `errorWhy` cause kind (needs `positional:tempo-wasted`, shared with emptyCheckAt).
- Opponent mistake: costReason `allowed` on their bluff move (BL2).

## F. Build changes
1. Keep `detectBluff` pure; add `reactedToBluff(prev: Bluff, fenBefore, studentSan): boolean` (moved a target, or added a guard to one) in `bluffDetector.ts`.
2. Registry: a second read on the STUDENT's move that looks back one ply (the ctx at `boardComputers.ts:1162` has no previous move: add `theirLast: { fenBefore, san } | null`, the shape `moveJobRead` already takes at `:1178`) → BL1. Remove the pre-move Learn say (new Learn speaks only after the move).
3. Add cause `tempo-wasted` (shared with emptyCheckAt, principle `tempo-handed`).
4. Sentence to `mistakeLesson`; `bluffClause` kept for Review/chat.

## G. Proof boards
- g:1002984876#18 O `Bb4` loss 309, `r2k3r/pppnbppp/5n2/4p1B1/4P1b1/2N2N2/PPP1BPPP/2KR3R b - - 5 9` → target knight c3; their move was a blunder → BL2.
- g:1013773584#22 O `Bg4` loss 29 → bluff on f3 knight, no mistake → silent in new Learn (guard).
- Danya: vc-_Y-iXy9b4Ew-17 ("Their bishop on g5 looks aggressive … no need to react").
- 6 hits in 12 games (4 O, 2 S).

## H. Open questions
- BL1 requires "did the student react?" — should a cheap reaction (cost < mistake) still be taught once?
