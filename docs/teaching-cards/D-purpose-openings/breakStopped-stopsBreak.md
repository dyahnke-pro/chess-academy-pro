# CARD — `breakStopped` / `stopsBreak` (taking their break away)

## A. Identity
- `breakStopped(fenBefore, san)` — `src/services/breakTiming.ts:192` → `BreakStop` (`:175`); renderer `breakStoppedLine :236`. Reads `pawnBreak` (`pawnBreak.ts:130`), `stackedAttackers`, `legalSeeGainFor`. Census label `breakStopped` 74/54 (lesson 54, review 20).
- `stopsBreak(fenBefore, san, breakSan, mine)` — `src/services/moveStops.ts:198` → `MoveStop` kind `break`; the masters' break from `mastersPlanRead` (`boardComputers.ts:6408`). Census 7/6.
- Two computers, one idea (a break taken away). They disagree on the source of "their break": `breakStopped` = any pawn break `pawnBreak` reads on the board; `stopsBreak` = the masters' break only.

## B. Facts
- **B1** BreakStop `{stop, brk {san,from,to}, how: 'illegal'|'drops-pawn', squares, key}`; MoveStop `{kind:'break', san, would ("would now lose a pawn"/"can't be played now"), clause, squares}`.
- **B2 dropped:** `pawnBreak(...)` result — WHAT the break was for (its `text`: strikes which pawn, opens which file) is computed (`:212`, as a truthy check only) and thrown away; the attacker:defender count on the break square (`count(…)` `:209`) dropped; for 'drops-pawn' which piece wins it.
- **B3 cheap / the one-ply flaw:** both read `drops-pawn` as `legalSeeGainFor(...) >= 1` one ply after the push (`breakTiming.ts:223`, `moveStops.ts:206`) — the same one-move check as `moveIntent.stopReason` (see moveJob card B3). The push may still work by a line (a pawn sac that opens a file) or fail by a line (not on its square). Fix: when an engine read after the stop lists the break (`reads.after` MultiPV / `everyAfter` pv), read its line through `costReason`. Also cheap: the reverse — **breakAllowed**: the student's move made THEIR break work (lost before, safe after) — a mistake cause; and **breakMissed**: the better move WAS the student's own break (`breakDueNow`, `breakTiming.ts:160`, read with the better move's uci) — the B2 row's data.ts:~165`) → errorWhy positional `mistimed-pawn-break`.
- **B4 gates:** check after the move → null (`:196`); only breaks the move touched (`:207-210`); break must be worth something and safe before (`:212-217`).

## C. Readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | no | — | — |
| CONSEQUENCE | partly | `how` | what the break would have done is dropped (B2) |
| BETTER MOVE + JOB | yes (run on bestSan) | `stop` | — |
| HABIT | no | — | — |

## D. Lesson recipes
| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER-MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | prevent | S mistake | `breakAllowed(fen, played)` and errorWhy cause allowed-* via that break | brk, its aim | "Every structure has a pawn break that decides the play: know theirs, and keep it from working." / "Their break …d5 needed one more guard on d5 — your move gave it." | "…d5 now hits e4 and opens the centre with your king still in it." | "c4 kept d5 covered twice." | "Every move, ask which break they want, and is it ready?" | same | the break must be in their engine line within 3 moves | C |
| B2 | own plan (timing) | S mistake | errorWhy positional tag `mistimed-pawn-break` and best = a break (`breakDueNow`) | brk, aim | "A pawn break works only when it's timed. When your pieces support the square, strike before they cover it." | "Now …c6 covers d5 and the break is gone." | "d5 was the break, hitting the knight." | "Each move, ask: is my break ready now?" | same, break named only past | `pastBetterNameable` | H (breakDueNow) |
| B3 | count | S/O | `how='drops-pawn'`, count | attackers, defenders | "A break needs more support than the square has guards: count them before you push." | | | "Count attackers and defenders on the break square." | same | count from `stackedAttackers` | C (type it) |
| B4 | knowledge (illegal) | O/S | `how='illegal'`, stop on brk.to | | "A pawn on the break square blocks the break for good: get there first." | | | | Review only | | H |
| B5 | both seats | O mistake | their move let the student's break in | | pointer → H1 | | | | held | never name the student's break | C |
| B6 | phase: endgame | S | ending | | "In the endgame a pawn break is how you make a passed pawn." | | | | | ending | C |

Doesn't apply: knowledge (named structure break) is readPosition's; their plan (good move) → Review/chat only.

## E. Mistake link
`positional` tag `mistimed-pawn-break` (B2), `allowed-threat`/`allowed-capture` when the break is the punishment (B1), both seats.

## F. Build changes
1. `breakTiming.ts:175` `BreakStop` — add `aim: PawnBreak | null` (the dropped `pawnBreak` result) and `count: {mine, theirs}`.
2. `breakTiming.ts` — add `breakAllowed(fenBefore, san)` (reverse of `breakStopped`).
3. Replace the one-ply `drops-pawn` with the engine line when one exists (B3), both in `breakStopped` and `stopsBreak`.
4. Merge the two sources: `stopsBreak` becomes `breakStopped` filtered to the masters' break (one computer; the census shows both saying "takes the …f4 break away" / "stops d4, their break in master games").
5. Delete Learn's good-move "…a6 takes the a6 break away from them" lines (not a mistake).
6. (moved from §H) One break source: `breakStopped` reads every board break (`pawnBreak`) and marks the masters' break when `MastersPlanRead` names the same `brk` (G3: the DB picks WHICH break, the board proves the stop); `stopsBreak` is deleted as a speaking computer (F4). No behaviour choice is left — the lesson is the same either way.

## G. Proof boards
- Pure run: chesscom-1012441262 ply 15 c3 (S, cost 100) `r1bqk2r/ppp1p1bp/2np1np1/6N1/3PP3/5Q2/PPP2PPP/RNB1K2R w KQ - 4 8` → best d5, and `breakStopped(best)` = their …d5 break, `how: 'illegal'` (checker re-ran it 2026-11-23, chess.js only: confirmed; `moveStops(d5)` on the same board = kick …h6 stopped) (B2 shape: the better move took their break away); chesscom-1013773584 ply 20 …f6 (O) `rn2kbnr/pp1bqpp1/2pp3p/8/3PPB1P/2NB1N2/PPP3P1/R2QK2R b KQkq - 3 10` → best Nf6 stops their d5.
- Census: "…Nxd2 stops their b4 break before it comes. The pawn would just be lost there now." (`lines-1.jsonl:6926`); "Qxe3 takes the …f4 break away from you." (`lines-0.jsonl:2324`, O seat — the student's break taken: B2 shape if it cost).
- stopsBreak: "You go Nc6, which stops d4, their break in master games from here: it would now lose a pawn." (`lines-1.jsonl:6745`).

## H. Open questions
1. B5 pointer at the student's break.
(Former H2, "one break source or two", is a build question — answered in §F6.)
