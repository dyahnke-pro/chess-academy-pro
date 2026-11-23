# urgentStrike — act now, the window closes

## A. Identity
- `src/services/urgentStrike.ts:94` `urgentStrike(fen, lines, student)`; `windowClosed` :71. Registry `urgentStrike` `boardComputers.ts:7367-7385`, kind `timing`, claim `urgent:<strike>:<reply>`, both seats, `namesStudentMove: side===student`. Review excluded. Census 39/39 (lesson).

## B. Facts
- B1: `{ side, strike, slow, reply, gainCp, text, squares }` (:24).
- B2 dropped: why the strike is active (capture / pawn into their half / hits a new piece / at the king, :105); the shut reason kind (`shut` string vs `gone`, :133-135).
- B3 cheap: compare with the MOVE PLAYED — if the played move ≠ strike and the played move's after-board no longer allows the strike (same `windowClosed` test on the real reply), it is the mistake; today it compares the engine's slow line, never the played move.
- B4: two lines; best ∈ [−50, 500] no mate (:100); strike active; best quiet non-pawn alternative exists, gap ≥ 50 (`URGENT_GAP_CP` :27); the slow move doesn't touch the strike squares (:119); reply not a retake (:122); strike still legal mid (:124); shut or gap ≥ 100 (:134).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | "Strike while you can: d5 works on this move…" | pre-move; names the student's next move; the slow move is the engine's, not the student's |
| CONSEQUENCE | yes | "they answer cxd4 — your pawn on d4 is gone, and d5 with it" / "That costs you about a point" | |
| BETTER MOVE + JOB | yes | strike | after the move only |
| HABIT | no | | "When a strike works now, ask if it still works next move." |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON | CONSEQUENCE | BETTER | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| US1 | timing | S | urgentStrike on the board before; played ≠ strike; cost ≥ mistake; B3: strike gone after the real reply | strike, why active | "Some chances last one move. The strike was on now, and after their reply it is gone." | shut reason ("their pawn takes your pawn on d4") | "{strike} had to be played at once." | "When something works now, ask whether it will still work next move." | after move (past) | B3 must prove the real board closed it | C |
| US2 | timing (cost only) | S | `gone` branch (gap ≥ 100, strike still legal) | cost | "Their position was about to consolidate; the quiet move gave them the time." | "That cost about {cost}." | strike | US1 | | quiet strike only (:134) | H |
| US3 | their seat | O | strike was theirs and they missed it | | "They had a strike on this move and didn't play it; the chance is gone." | — | n/a | — | Learn: on their mistake | | H |
| US4 | combo + prevent | S | the opponent's strike was on and the student's move didn't stop it | | "When they have a strike next move, stop it before your own plan." | | | | combine with computeMustDefend | | C |
| US5 | record | S | | | RED/GREY US1 · AMBER "That chance lasted one move." · GREEN silent | | | | | | H |
| — | endgame | — | race reads are endgame's (kingRace); n/a here | | | | | | | | |

## E. Mistake link
- costReason `missed` where the best line starts with the strike (any motif) and B3 says it closed; positional "missed break" (`premature`/`mistimed-pawn-break` inverse). Both seats.

## F. Build changes
1. `urgentStrike.ts:94` accept an optional `played: {san, replyUci}` and return `closedByPlayed: boolean` + `why: 'capture'|'pawn-advance'|'hits-piece'|'at-king'`.
2. Registry: Learn read moves to the mistake turn (US1/US3); remove pre-move say (names student's move).
3. Recipes into `mistakeLesson`.

## G. Proof boards
- g:1012441262#20 O `Bh5` best `h6` loss 393, `r2qkr2/ppp1p1bp/2np1np1/6N1/3PP1b1/2P3QP/PP3PP1/RNB1K2R b KQ - 0 10` → "h6 works on this move … you answer Nxh7" → US3 (their miss, 393).
- g:1012441262#16 O `Bg4` best `h6` loss 113 → US2/US3.
- 27 hits, 11 on mistakes. Danya: vc-1671V8LrEwk-9 ("Strike while you can: exd4").
- Guard: the text's "Spend it on Nf5" names the engine's slow move, which on g:1001055178#32 WAS the played move (Nf5) — coincidence, not a rule; B3 is required.

## H. Open questions
- None.
