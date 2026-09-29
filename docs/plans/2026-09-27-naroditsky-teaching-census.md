# What Naroditsky teaches — census of all 430 voiced games (2026-09-27)

14,171 spoken lines read and tagged (22 parallel readers, fixed taxonomy + free NEW codes).
11,435 teach something (2,736 are move narration). A line can carry up to 3 codes, so shares
sum past 100%. Status: C computed today · P partial · M missing. Counts are model
classification — treat ±15% per row; the RANK is the signal.

## BUILD STATUS (2026-09-29, branch `claude/chess-app-review-perf-du6haq`, merged at the end)
He explains EVERY move — no computer below may go quiet because a move is in book or routine.
- ✅ **#4 prevents · #6 two jobs · P "a quiet move's purpose"** → `moveIntent` (engine-proven, both seats; Learn lane `moveIntent`, rank 75). Walked on his game 1PI3xfMiUE4: "Kh1 prepares f4, to hit the pawn on e5", "O-O — so …Qxf2# isn't possible any more".
- ✅ **#1 move order** → `moveOrder` (lane 77): "Be3 first — Nc3 straight away would have run into …Qxd4, and the pawn on d4 would simply have dropped." Heard live on 1rcEbI44WqE. ~0.7 a game on 80 of his speedruns; his own "the key move order — you take on d4 first" is one of its hits.
- ✅ **#5 what THEIR move cost them** → `theirMoveCost` (lane 74): a hole your knight can use, their bishop shut in, castling given up, lasting structural damage. On his games it fires on 10% of their moves and says his exact point twice: "…d6 shuts in their own bishop on f8" ("the passive d6 blocks in the bishop"), "…e6 costs them d6 … your knight via e4" ("e6 opens a square the knight will jump into").
- ✅ **#2 king attack** → `kingAttack` (lane 76), counting with the ONE counter chat's "do I have an attack?" uses (`countKingAttack`, moved to `kingSafety`). Shelter pawn taken, defender removed for good, file ripped open, a piece brought over, or one heading there next: "Qe1 heads for their king — Qg3 next brings the queen to bear" (his: "rerouting the queen to g3"), "Re3 … Rg3 next", "exf7+ takes away one of the pawns in front of their king". 0.6 a game on 80 speedruns; castled kings only for the quiet kinds; never on the mating move.
- ✅ **#8 recapture choice** → `recaptureChoice` (lane 66): "Nxd4, taking back with the knight — the knight lands in the centre on d4; Qxd4 would put the queen on d4, where …c5 hits it". The tempo argument drops when their actual reply IS that move (it hit whatever took back — IMBSR0A9nJs walk).
- ✅ **#10 rule → exception** → `ruleException` (lane 73, only on a move within 20cp of best): the same minor twice in the opening (not a forced retreat), an f/g-pawn in front of your castled king, the queen out early — each spoken only with the board's reason. "…Bc6 moves the same piece twice — usually a waste of time in the opening, but here it hits the pawn on g2" (his: "a bishop to c6 first, because it hits g2"). 10 lines on 80 speedruns, about his rate.
- ✅ **#7 don't panic** → `falseAlarm` (lane 72): their threat was real (`detectNewThreat`), the engine's move left it standing, the student played that move and stays level. "Their move threatens …Bxf2+ … but you don't have to react: Qxd5 comes first, and after …Bxf2+, Kf1 answers it" (his: "a bishop capture on f2 with check — but you move the king to f1"). 4 lines on 80 speedruns, two his own points. The instant "Careful — … it has to move" alert can still precede it — handed to the Learn session (WO md §7).
- ⏭ next, in rank order: #3 practical play · #9 when ahead · #11 fails a job · #12 calculate · #13 endgame technique · #14 push/hold · #15 wishlist.

## Missing (M) — ranked by how often he teaches it
| rank | what | lines | share |
|---|---|---|---|
| 1 | move order — "this first, because…", "don't rush X" | 540 | 4.7% |
| 2 | king attack — open lines, storms, sacs at the king | 518 | 4.5% |
| 3 | practical play — clock, making it hard, human vs engine | 406 | 3.6% |
| 4 | the move PREVENTS something ("f3 so …Ng4 isn't possible") | 382 | 3.3% |
| 5 | what THEIR move cost them structurally | 382 | 3.3% |
| 6 | one move, two jobs | 371 | 3.2% |
| 7 | don't panic / question the knee-jerk | 360 | 3.1% |
| 8 | recapture choice | 272 | 2.4% |
| 9 | when ahead: trade, attack or convert — and the choice | 253 | 2.2% |
| 10 | a rule and its exception | 232 | 2.0% |
| 11 | alternative refuted because it fails a JOB | 177 | 1.5% |
| 12 | how to calculate (count, visualise, blunder-check) | 161 | 1.4% |
| 13 | endgame technique | 140 | 1.2% |
| 14 | push for a win or hold | 44 | 0.4% |
| 15 | the wishlist method | 35 | 0.3% |

## Partial (P)
| what | lines |
|---|---|
| the opening's key idea / typical plan | 1,711 (15% — the single biggest thing he does) |
| overall verdict by one clear comparison | 793 |
| candidates as a question | 669 |
| a plan for one side | 593 |
| trade judgement | 487 |
| a quiet move's constructive purpose | 479 |
| what the opponent's move wants | 470 |
| tempo | 401 |
| the common wrong answer | 397 |
| piece maneuvers | 358 |
| timing ("now is the moment") | 258 |
| what's their next move | 184 |
| prophylaxis | 175 |
| hidden danger | 167 |
| plan against plan | 53 |

## Computed today (C)
tactics 1,085 · structure 796 · lines as proof 785 · principles 704 · verdicts 698 ·
piece quality 635 · refuted alternative 490 · hanging/count 467 · breaks 429 ·
threats 322 · mates 296 · conversion 160 · passers 156 · space 146.

## Beyond the list (reader-invented codes, merged by hand)
| group | ≈lines | note |
|---|---|---|
| opening knowledge — naming, history, popularity, the survey of sidelines | ~340 | naming is computed; popularity is computable from the explorer |
| repertoire advice — which opening to play at your level | ~250 | off-board: a repertoire lane, not a position computer |
| analogy / pattern transfer — "same idea as the Fried Liver" | ~120 | partly the transfer beat |
| questions to the student before the answer | ~93 | |
| self-critique — admits his own miss | ~84 | coach does this for its own moves |
| transposition | 63 | |
| sacrifice for compensation — what the material buys | 58 | |
| recap / post-mortem of the game | 39 | review's recap |
| keep the tension | 37 | |
| zwischenzug | 34 | |
| prefer the simple move | 28 | |
| "that threat isn't scary" | 13 | bluff computer exists |

Raw per-batch outputs: /tmp/claude-0/g60/_out-*.json, /tmp/claude-0/g430/_out-*.json (session scratch).
