# practicalChance — worse, so make them find it

## A. Identity
- `src/services/practicalChance.ts:160` `practicalChance(fenBefore, san, reads)`; `movesToWin` :97; line `practicalChanceLine` :224. Registry `practicalChance` `boardComputers.ts:6743-6771`, kind `move-job`, claim `practical:<from><to>`, both seats. Census 28/27.

## B. Facts
- B1: `{ side, san, from, to, only, trap, deep, bestLine, key }`.
- B2 dropped: `top` (their edge), `second` (:180), the trap's `cp`.
- B3 cheap: the payoff — the next move (the reply actually played) vs `only`/`trap`: if the opponent played the trap capture or missed the only move, the problem worked; if the student was the one facing it (opponent seat), the student's reply is the mistake turn.
- B4: mover worse ≥ 100 (`WORSE_CP` :42), move sound < 50 (:44); their best keeps ≥ 100 (:46); only = second ≤ 30 and ≥ 100 worse (:48-50, needs 3 lines :59); trap = natural grab that gives it back; deep = 4–6 own moves to win (:52-55).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | "When you're worse, set them problems." | on a good move (sound) — never a mistake by construction |
| CONSEQUENCE | yes | only / trap / deep | |
| BETTER MOVE + JOB | n/a | | |
| HABIT | partly | "Look at every forcing reply before you pick one." (opponent seat) | |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON | CONSEQUENCE | BETTER | HABIT | Learn | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PC1 | their problem, student fails | S (reply) | practicalChance fired for the opponent's move AND the student's reply was the trap or not the only move AND cost ≥ mistake | trap/only | "When the worse side sets a problem, the obvious answer is often the wrong one. The capture that looked free gave the edge back." / "Only one reply kept your edge; the rest let them back in." | errorWhy | "{only} kept it." | "When they're worse and still active, look at every forcing reply before you pick one." | after the student's reply | B3 join required | C |
| PC2 | student worse, sets problem | S | today, student seat | | Review/lesson praise | | | | silent in Learn | | H |
| PC3 | opponent falls for the student's problem | O | student's practicalChance, opponent erred | | "Your problem worked: they took the bait." | | | | Learn: on their mistake (punish held) | | C |
| PC4 | deep | S | deep ≥ 4, the student then erred in the long line | | "A long winning line is where mistakes happen: their defence made you calculate {n} moves." | | | "Slow down and calculate when the win is long." | | | C |
| PC5 | record | S | | | RED/GREY full · AMBER one clause · GREEN silent | | | | | | H |
| — | endgame, plan | — | n/a | | | | | | | | |

## E. Mistake link
- The student's reply mistake after a problem-posing move: errorWhy `allowed`/`missed` any motif; PC1 frames it. practicalChance itself never fires on a mistake (sound < 50).

## F. Build changes
1. Expose `top`, `second` (B2).
2. Mistake-turn join: the previous opponent move's practicalChance read rides into the student's mistake turn (PC1/PC4); registry row stays for Review.
3. Habit id `forcing-replies` (record-gated) shared with methodBeat look-again.

## G. Proof boards
- g:1012441262#22 O `…Qd7` loss 0: only `Nxg7+` keeps White's edge, trap `Nxf8` gives it back → the student (White) answered with the only move `Nxg7+` (ply 23) — the guard case: PC1 stays silent when the student finds it.
- g:1012441262#13 S `Qf3` loss 43: trap `…Bxd4` for them → PC2/PC3.
- 17 hits, 0 on mistakes (by design). Danya vc-1tbpB-Qrqds-21.

## H. Open questions
- None.
