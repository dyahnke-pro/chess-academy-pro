# pictureVerdict — the verdict, the tries that fail, the plan that survives (pilot re-cut)

## A. Identity
- `src/services/pictureVerdict.ts`: `pictureVerdictOf(i)` :437 (verdict + but + plan), `pictureVerdict` :487, `picturePlan` :493; `failedTries` :238, `returnsLine` :224, `linksOf` (survivor links guards-taken / hits-replier / adds-attacker), `verdictOf`; renderer `teachingSentence.renderPictureVerdict` :575.
- Registry `pictureVerdict` `boardComputers.ts:3707-3734` (kind `verdict`, claims `picture-verdict:…` + the standing claim, skill `overvalued-attack` when it poses), `picturePlan` sibling; context `pictureConclusionsOf` :363 (reads `temptingOnBoard` + `standingRefutations`). Surfaces PICTURE_SURFACES. Census 781/660 (lesson 642, review 24).

## B. Facts
- B1: `PictureVerdictWord { kind: works-now|hard-to-finish|no-direct-way|tries-worsen|plain, step −3..3, word, works, text, afterStanding, joined }`; `FailedTry { uci, name, look (plan|storm|capture|check|threat|mate-threat|lever|passer|king|attack), target, reply, replyFrom, replyTo, replyTook, by (material|result|returns), text, costCp, eye }`; `PicturePlan { san, uci, plan, named, links[SurvivorLink{kind, moveSan, moveIndex, at, square, tries}], jobs, text, squares }`.
- B2 dropped: the refuter's typed reason (`TemptingRefuted.reason`, the CostReason) is reduced to `text` in `FailedTry`; the piece on `replyFrom` (the refuting piece) is not named; the counterplay ledger (`ledger`) result is a flag (`noCounterplay`).
- B3 cheap: group tries by `replyFrom` (one piece refutes all); attackers vs defenders on `target`; the same try on the previous board (did it fail a move ago?); king exposure after `works` line (pilot "Data still to compute").
- B4: no forced mate in best (:441); a try is direct (`DIRECT_WHY`), refuted by material, result, or returns; a try handing over ≥ 300 (`PIECE_BAR_CP` :57) skipped unless at the plan's target; plan only when a try failed and none works; `works` = best is direct and its line nets ≥ 1.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | no | "You're slightly better, but it is hard to finish them off. fxg5 fails." | a board restatement + a named move — the measured worst stater (660 said); pre-move; `works-now` names the student's move ("The direct way works now: …Qf6") |
| CONSEQUENCE | partly | each try's refuter text | |
| BETTER MOVE + JOB | partly | plan `san` + `jobs` (links) | links are the jobs ("guards the pawn the reply took") — good |
| HABIT | no | | |

## D. Lesson recipes (pilot rows, ids V/T/W/P/L kept)
| id | angle | seat | condition | slots | LESSON | CONSEQUENCE | BETTER | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| T-CF | counterfactual (the played try) | both | the move PLAYED ∈ `but` and cost ≥ mistake | try look, reply | by=material + look capture: "A piece is only free if nothing can take back." by=material, other looks: "An active move that leaves something to take loses more than it gains: their {replier} on {replyFrom} answers it." by=result: "A move can look active and still lose: check what it allows, not just what it attacks." by=returns: "A move that has to be taken back is two moves wasted." | the try's text (reply + result) | plan san + links/jobs | "Before the obvious move, ask what their best reply is." | THE Learn row: after move, the student's played try; never its SAN ("this move") | played uci = try uci | H |
| T-ONE | strategize | both | ≥ 2 tries share `replyFrom` (B3) and the played move is one | replier piece | "When one piece refutes all your tries, that piece is the real target: trade it off or chase it, and the tries start working." | | the link `hits-replier` move | | after move | same square and piece | C |
| T-LOOK | knowledge by look | both | played try look = check / capture / lever / passer / king | look | check: "A check is only good if it gains something." capture: "Every capture changes two things: what you take and what opens." lever: "A break at the wrong time hits a pawn that's defended enough: support it first." passer: "A passed pawn pushed without support is a lost pawn." | | | | after move | per pilot guards | H |
| T-CNT | calculate | both | look plan with target | count | "Count before you attack: you need more attackers than they have defenders." | | link `adds-attacker` | | after move | count from chess.js | C |
| V-HTF | strategize (hard to finish) | S | the student was better, the played move was a failing direct try | | "Being better doesn't mean you can win right away. When nothing works directly, stop forcing and start improving your pieces." | | plan | | after move (only with T-CF) | not when `works` | H |
| V-WRS | strategize (tries worsen) | S | tries-worsen + played ∈ but | | "Sometimes every active move makes your position worse; then the strongest move is a quiet one." | | plan | | after move | | H |
| W-MISS | calculate (works, missed) | S | `works` and the student played another move, cost ≥ mistake | | "When the forcing line wins material and their best defence doesn't change it, play it now." | errorWhy missed | works name (past) | "Every move, look at checks, captures and threats first." | after move | net ≥ 1 after settle | H |
| W-THEIRS | their seat | O | `works` for them and they missed it | | "They had a forcing line here and missed it." | | n/a | | Learn: their mistake | | H |
| P-* | plan rows (guards-taken, hits-replier, adds-attacker, rook lift, order) | both | with T-CF only | link | pilot P rows ("Attack the defender, and what it defends becomes weak.") | | the plan move + link (past) | | after move | link holds at that ply | H |
| L | counterplay alive/dead | both | ledger | | pilot L rows | | | | Review only | | H |
| V-STATE | pre-move verdict | — | today's spoken verdict ("You're slightly better, but it is hard to finish them off. fxg5 fails.") | | n/a in the new Learn — a board statement before the move; Review keeps it beside the tries | | | | delete from Learn | | — |
| REC | record | S | | | RED/GREY full · AMBER "The obvious try fails — check the reply." · GREEN silent | | | | | | H |
| — | endgame | — | pilot "convert with the king and the passer" — ending flag needed (B3) | | | | | | | | C |

## E. Mistake link
- errorWhy: T-CF by=material → `took-guarded`/`left-hanging`/`allowed-capture` (E3/E6/E11); by=result → `unexplained` until the `result-shift` cause (temptingOnBoard F4) exists — Review only until then; by=returns → `tempo-wasted` (emptyCheckAt F4) — Review only until then; W-MISS → `missed-win` (E14); L and V-STATE Review only.
- T-CF teaches costReason `allowed` (by=material, motif from the refuter's reason), the result-shift cause (by=result, see temptingOnBoard TO2), and a tempo cause (by=returns). W-MISS teaches costReason `missed`. Both seats. Skill `overvalued-attack` (the registry's) is the record tag.

## F. Build changes
1. Learn: delete the pre-move `pictureVerdict` speak (V-STATE); keep the conclusions cached for the post-move join (`conclusionsOf` `boardComputers.ts:368`).
2. Mistake turn: join played uci with `but[].uci` → T-CF / T-LOOK / T-ONE; with `works` → W-MISS.
3. `FailedTry`: add `reason: CostReason` (B2), `replierPiece`, and computed `sameReplier: string[]` (B3).
4. `renderPictureVerdict` (`teachingSentence.ts:575`) no longer names `works` pre-move; Review keeps its words.
5. All pilot "Data still to compute" rows → typed fields here or in readPosition (pilot card 2).

## G. Proof boards
- Pure run: 235 boards with a non-plain verdict, 53 on mistake plies (28 S, 25 O).
- g:1001055178#59 S `R1d2` loss 197, `1r6/1pr1qk2/p1p1pb1p/5pp1/5P2/3R1BP1/P1QR1PKP/3R4 w - - 2 30`: hard-to-finish, but = [fxg5 / …hxg5 / result / capture] — the student played R1d2, not the try → W/T rows silent; errorWhy speaks (guard).
- g:1012441262#26 O `…Kg8` loss 103: tries-worsen, but = […Nxe4 / Qe3 / result] — their played move is not the try → silent.
- Danya: vc-_4xbS0Crtic-22 ("You're clearly better, and the direct way works now: …Qf6." — names the move pre-move: V-STATE guard), vc-_WmByfLW-3g-34 ("The active tries only make it worse. …Be6 fails.").

## H. Open questions
- None beyond the pilot's.


## Restored from the pilot grid (David approved these; the re-cut dropped them)
Each row keeps its angle, condition, data, lesson and guard. These join §D and are written to the same voice and recipe rules.

| angle | condition | data | the lesson | guard |
|---|---|---|---|---|
| STRAT (O seat) | hard-to-finish, O better | H | When they're better but can't break through, your job is to give them nothing to aim at: keep every piece guarded and wait. | not when their direct try works |
| STRAT + L dead | hard-to-finish, no counterplay | H | When your opponent has nothing to do, time is on your side: improve slowly and let them run out of good moves. | not when counterplay is alive |
| PREV + L alive | better, counterplay alive | H | Before you press for more, stop their one source of play. A won position is lost by ignoring the counterattack. | — |
| PLAN | no-direct-way, level | H | In a level position with no direct way in, the game is won by the better plan, not the better shot. | — |
| CALC | works-now | H (net) | When you're better, look for the direct shot first. If the forcing line wins material, play it before they fix it. | net must be ≥ a pawn after the line settles |
| STRAT (timing) | works-now, didn't work a move earlier | C: same try on the previous board's saved read | Chances come and go. The shot that didn't work a move ago works now because something changed: notice what changed. | previous read must show it failing |
| phase: endgame | step ≥1, ending | H | In the endgame, an advantage you can't convert is just a draw. Convert with the king and the passer, not with tricks. | ending detected |
| combo: + bad piece | no-direct-way, S has a bad piece | H | When nothing direct works, fix your worst piece first. | — |
| exception | works-now but costs king safety | C: king-exposure read after the line | The direct win is right even though it looks risky: the forcing line leaves them no time to hit back. | line ends with S king safe |
| record | — | — | RED/GREY: full lesson · AMBER: "Better, but nothing direct works — improve first." · GREEN: silent | — |
| RECOG | eye high | H (eye) | The move that jumps out first is often the one your opponent is ready for. | eye ≥ top 3 |
| IDENT | always | C: piece on replyFrom (chess.js) | Find the piece that answers your idea: that is the piece doing their defending. | — |
| KNOW (capture) | look = capture | H | Every capture changes the board in two ways: what you take, and what opens. Check both. | — |
| KNOW (threat) | look = threat | H | A threat is only strong if they can't answer it with a bigger threat. | reply creates a threat ≥ yours |
| KNOW (lever) | look = lever | H | A pawn break is a good idea at the wrong time if the pawn it hits is defended enough. Add support first, then break. | target defended ≥ attacked |
| KNOW (king, ending) | look = king | H | In the endgame the king walk is strong only when it can't be cut off. Check which ranks and files their rook controls. | ending |
| STRAT (storm) | look = storm | H | A pawn storm only works if it's faster than their answer. Count how long each side's attack takes. | — |
| PLAN (prepares) | a link answers this try | H (links) | When the direct try fails, ask what one quiet move would make it work, and play that first. | link exists |
| seat O | the try is theirs | H | When their natural move fails, expect them to find the quieter one. Watch for it. | — |
| timing: Learn before move | S to move, try is S's | H | Learn: "The obvious capture here doesn't work — ask what they take back with." (no move named) | never name the try's square to the student before the move |
| timing: Review | after the move | H | Review names the try, the reply and the lesson in full. | — |
| counterfactual | S played the try | H (cost) | This is the move you played: the reply was there, and it cost you [n]. Next time, check the reply first. | S's move = the try |
| record | — | — | AMBER: "The obvious try fails — check the reply." GREEN: silent | — |
| CONSEQ | works | H | Material won by force is the clearest advantage in chess: once you have it, trade pieces and convert. | — |
| HABIT | works, S missed it | H (S played other) | You had a winning shot here. Every move, look at checks, captures and threats first: that's how you find it. | S's move ≠ W |
| seat O | works for them | H | They have a forcing line here. When you see one for them, stop it before your own plan. | — |
| timing: Learn before move | S to move | H | Learn: "There's a direct way to win material here." (move held) | never name W before the move unless asked |
| PLAN (steps) | board plan steps | H | A plan is a few steps in order: name them, then play the first one. | — |
| STRAT (order) | link at later move | H | Order matters: the first move makes the second one work. | moveIndex > 0 |
| timing: Learn | S to move | H | Learn: "The direct way fails — which of your pieces would make it work?" | move held |
| PREV | alive | H | Find their one source of play and take it away before anything else. | — |
| STRAT | dead | H | With no counterplay to fear, you can take your time. | — |
