# defenderTradeMade — trading off the piece that holds their position together

## A. Identity
- File: `src/services/keyDefender.ts` (369 lines): `defenderTradeMade(fenBefore, san, costCp, after)` (245–250) → `defenderTradeBy` (209–243) → `keyDefenderAt` (184–190) → `defenderJobs` (124–); standing sibling `keyDefenderPlan(fen, best)` (273–310, registry `keyDefenderPlan` 5593–5601); renderer `keyDefenderLine` (335–369). Constants `SOUND_CP = 50`, `HELPS_CP = 50`, `PLAN_MOVES = 3`, `MIN_SQUARES = 2`, `PATH_AHEAD = 3` (32–41).
- Registry: `boardComputers.ts` `defenderTradeMade` (6720–6735), kind `trade`, either seat.
- Reach (computer-reach): the keyDefender row is not in computer-reach by name; the registry wires lesson/review via moveThoughtFacts. Census: 7 lines (6 said) — "The queen on e3 does a job no other piece of theirs does: it covers the holes on d4 and d3. This trade takes it off. Once it's gone, those holes are yours to use." Run: 1 fire (the student's …Qxe3+, cost 0).

## B. Facts
- **B1** `DefenderTrade` (52–60): `defender {side, piece, square, jobs[]}`, `trader {piece, square}`, `how` takes | offers, `san`, `key`. `DefenderJob` (43–47): man {square, piece} | king {squares} | holes {squares} | passer {pawn, square}.
- **B2 dropped:** the engine's score after (`seatCp(after, mover)`, 248) is a gate only; `jobs` are all returned but the renderer leads with `jobs[0]` for the consequence (348–357).
- **B3 cheap:** the MISSED form — `keyDefenderPlan` on the board before the student's move (engine's best line trades the defender within 3 moves) when the student did not start it; the ALLOWED form — `keyDefenderPlan` on the board after the student's move, for the opponent, where it was absent before (the student's move let them trade the student's key defender).
- **B4 gates:** an equal-value capture with an even legal exchange (219–221) or a move that puts that trade on the board where it was not (227–241); the move cost < 50 (SOUND_CP) and the trader ≥ 50 cp up after (246–248). It only ever fires on a GOOD move.

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | yes | "the piece holding their position together … Once it's gone, …" (Danya's idea) | — |
| CONSEQUENCE | yes | the lead job's consequence ("their bishop on d7 falls", "those holes are yours") | — |
| BETTER MOVE + JOB | n/a for the good move; partly for the missed form (the plan's `sans`) | — | — |
| HABIT | no | — | "find the piece doing a job no other piece does" |

## D. Lesson recipes
`defenderTradeMade` itself fires on sound moves only → **Review/chat only** under mistakes-only. Its lessons attach to mistakes through the two forms in B3.

| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| DT1 | identify (the key defender, missed) | S | MISSED: `keyDefenderPlan` before the student's move found the trade, the student played other, cost ≥ floor | defender, jobs | "Trade off the piece that holds their position together: their {defender} {jobs}, and no other piece does that." / "When one piece does a job nothing else can, it's the piece to trade." | "{after words: the {piece} on {sq} falls / the holes are yours}." | "{plan first move} — the trade was on." | "Look for the one piece of theirs doing a job no other piece does." | full once past | the plan's first move is not the trade (more than one move away — say the plan only in Review) | C (B3) |
| DT2 | prevent (your key defender) | S | ALLOWED: after the student's move, `keyDefenderPlan` for them trades the student's key defender (absent before), cost ≥ floor | your defender, jobs | "Keep the piece that holds your position together: your {defender} {jobs}, and your move let them trade it off." | "Once it goes, {consequence}." | "{best} kept it out of the trade." | "Before you move, ask which of your pieces does a job no other can." | full | — | C |
| DT3 | knowledge (the cog) | both | any | — | "Exchanging the opponent's most important piece often stops the whole position from working." | | | | Review/chat | | H |
| DT4 | opponent seat (their good trade) | O | their `defenderTradeMade` | — | Review only (their good move is not a student mistake; DT2 owns the student's side of it) | | | | | | |
| DT5 | record | S | — | — | RED/GREY full · AMBER "Their {defender} was the piece to trade." · GREEN silent | | | | | | `holdState` on `missed-key-defender` (new) |

Not applicable: calculate (the engine's line is the proof), phase (the passer job covers the ending; no separate stem).

## E. Mistake link
- Student: DT1 = `costReason` **missed** (motif `removing_the_guard` when the job was a man) or `positionalReason` **no-plan** (holes / king jobs) — the computer supplies WHICH piece and WHICH job; DT2 = **allowed** (`removing_the_guard` on the student's side).
- Opponent: DT4.

## F. Build changes
1. Add `defenderTradeMissed(fenBefore, studentSan, bestLine)` and `defenderTradeAllowed(fenBefore, studentSan, lineAfter)` (B3), both built on `keyDefenderPlan` (no new search: the saved lines).
2. Move `keyDefenderLine`'s stems into `mistakeLesson` for DT1/DT2; keep the renderer for Review's good-move credit.
3. `MistakeCause`: `key-defender` with the defender + jobs as payload.

## G. Proof boards
- Good-move fire (Review): g chesscom-1018307238 ply 22 …Qxe3+ (student Black, cost 0) `r1b1k2r/ppppq1pp/5n2/5p2/2P5/2N1Q1P1/PP3PBP/R3K2R b KQkq - 0 11` → defender = White queen e3, job holes d4/d3, how takes (lines-0.jsonl:2333 is the census twin).
- Standing plan (lesson): vc-_X7t6o3o6JM-49 (bishop on e6 stops the passer on e3); vc-3nyxVHwDCTY-56 (knight f3 guards d2); vc-2Mys0GRUgM4-29 held `already-said`.
- No mistake board yet: F1 must run on the saved lines before DT1/DT2 boards exist (the run only exercised the sound-move form).

## H. Open questions
- none.
