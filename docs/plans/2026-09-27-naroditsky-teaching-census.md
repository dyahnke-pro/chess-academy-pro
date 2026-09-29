# What Naroditsky teaches — census of all 430 voiced games (2026-09-27)

14,171 spoken lines read and tagged (22 parallel readers, fixed taxonomy + free NEW codes).
11,435 teach something (2,736 are move narration). A line can carry up to 3 codes, so shares
sum past 100%. Status: C computed today · P partial · M missing. Counts are model
classification — treat ±15% per row; the RANK is the signal.

## BUILD STATUS (2026-09-29, branch `claude/chess-app-review-perf-du6haq`, merged at the end)
He explains EVERY move — no computer below may go quiet because a move is in book or routine.
- ✅ **#4 prevents · #6 two jobs · P "a quiet move's purpose"** → `moveIntent` (engine-proven, both seats; Learn lane `moveIntent`, rank 75). Walked on his game 1PI3xfMiUE4: "Kh1 prepares f4, to hit the pawn on e5", "O-O — so …Qxf2# isn't possible any more".
- 🔵 **#1 move order** → building (`moveOrder`: "X first — Y right now runs into R", proven by playing the follow-up first).
- ⏭ next, in rank order: #5 what THEIR move cost them · #2 king attack · #8 recapture choice · #10 rule→exception · #7 don't panic.

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
