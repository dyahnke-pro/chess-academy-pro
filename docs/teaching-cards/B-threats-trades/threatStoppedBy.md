# threatStoppedBy (+ playItAnyway) — the quiet move that stopped your threat

## A. Identity
- File: `src/services/opponentMovePurpose.ts` (158 lines): `threatStoppedBy(studentFenBefore, studentFenAfter, replySan, studentWB)` (58–119), `stillWorks` (37–56), `playItAnyway(stop, fenNow, topLines, studentWB)` (121–158).
- Registry: `boardComputers.ts` `threatStoppedBy` (5866–5880) and `playItAnyway` (5888–5900), seat `opponent`.
- Reach: learn door, review, lesson, chat, tapped, tactics. Census: 49 lines (43 said): lesson 31, review 18. Run: 13 fires (7 on a student threat stopped by their reply, 6 swapped seats), 3 where the stopper was an opponent move that cost them ≥ 100.

## B. Facts
- **B1** `StoppedThreat` (31–35): `threat` (the full `DetectedThreat` of the student's move), `reply` (their SAN), `text` ("Their …Qd7 has a point: it stops your Nxd8, which was winning material."). `PlayItAnyway`: `text`, `san`, `line` (4 plies of the engine's line), `squares`.
- **B2 dropped:** HOW the reply stopped it — `stillWorks` (37–56) returns a boolean, the four mechanisms (the move is now illegal, the mate no longer mates, the capture no longer nets, the fork victims left) are not returned; the text names the threat "by its kind" (95–103) and drops the victim squares on purpose (board-truth, the victim moved).
- **B3 cheap:** the mechanism (B2) as an enum — each `stillWorks` branch knows it; `describeThreatPrevention(studentFenAfter, threat, replySan, student)` already returns the prevention job in words (escape / hit-guard / add-defender / step-off / rules-out).
- **B4 gates:** null if the student's move created no new threat (64); a take-back reply is not a stop (77–87); null if the threat still works after the reply (88). `playItAnyway`: not for mate (127), the student to move (130), the same move within 30 cp of best (137), a line ≥ 2 plies (144).

## C. Sentence readiness
| slot | today | field | missing |
|---|---|---|---|
| LESSON | partly | "has a point: it stops your X" | the general lesson ("every move has a point — a quiet move is often a defence") is in the stem only |
| CONSEQUENCE | partly | threat kind | what the threat would have won if not stopped (`detail`, dropped on purpose — keep as stakes) |
| BETTER MOVE + JOB | partly (playItAnyway) | `line` | — |
| HABIT | no | — | — |

## D. Lesson recipes
This computer explains a THEIR move that is GOOD (it stops the student's threat). It becomes a mistake lesson when: **TS-IGN** the student's NEXT move ignored that the threat is gone and played as if it still worked (cost ≥ floor — e.g. went for the capture that now loses); **TS-ANYWAY** `playItAnyway` fired and the student did NOT play the threat that still works (cost ≥ floor, `costReason` missed); **TS-O** their stopping move itself cost them ≥ floor (the stop was the wrong defence — the run's 3 cases).

| id | angle | seat | condition | slots | LESSON stems | CONSEQUENCE | BETTER MOVE | HABIT | Learn variant | guard | data |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TS1 | recognize (every move has a point) | S | TS-IGN | their reply, the threat kind | "Every move has a point, even a quiet one: their {reply} took the sting out of {what}." / "When they make a quiet move after your threat, check whether the threat still works." | "The {capture} now loses material." | "{best} — {job}." | "After their quiet move, ask: what did it stop?" | full; "your threat", never the move name if it is the move just played | the student's move is a different good idea (cost < floor) | H + C: mechanism |
| TS2 | evaluate (test the prevention) | S | TS-ANYWAY | san, line | "Test their prevention before you believe it: {san} still works." / "A defence that only looks like it stops your idea doesn't — check the line." | "{line}." | "{san} — {line's point}." | "When they stop your threat, play it out in your head once more." | full (once past) | the line costs > 30 cp (already) | H |
| TS3 | opponent seat (the stop that cost) | O | TS-O | their stopping move | "Stopping one threat can create another: their {reply} stopped {what}, but it {cost reason}." | — | — | — | after the student's reply; Review full | — | H + costReason for their move |
| TS4 | knowledge (mechanisms) | both | any fire | mechanism | "There are four ways to stop a threat: move the target, guard it, block the line, or take away the square — their {reply} {mechanism}." | — | — | — | Review/chat only (not a mistake) | — | C (F1) |
| TS5 | record | S | — | — | RED/GREY full · AMBER one clause · GREEN silent, keyed to `missed-tactic` (TS2) | | | | | | H |

Not applicable: plan, phase, structure angles.

## E. Mistake link
- Student: TS2 = `costReason` **missed** (the threat move was still best); TS1 = `whyItFailed` **held-by-defender** / **answered-by-tactic** on the student's follow-up that assumed the threat was alive.
- Opponent: TS3 = their **allowed** while stopping.

## F. Build changes
1. `stillWorks` (37): return `'illegal' | 'no-longer-mates' | 'no-longer-nets' | 'victims-left' | null` instead of a boolean; `StoppedThreat` gains `mechanism` (TS1, TS4).
2. `StoppedThreat` gains `wasWorth` (the threat's `rank`/net before the reply — the consequence that was prevented).
3. Learn: the "Their …Qd7 has a point" line today speaks on every stop (a good move of theirs, no mistake) — under mistakes-only it speaks only in TS1–TS3; delete the standing Learn speak.

## G. Proof boards (run)
- Stop: g chesscom-1012441262 ply 21 Ne6 (student) then …Qd7 → "it stops your Nxd8, which was winning material".
- Stop of a fork: g chesscom-1018307238 ply 38 …Ne3 (student Black, threat Nc2 forking a1/e1) then Rac1 → "it stops your fork with Nc2".
- TS-O candidate: g chesscom-1020632112 ply 13 Ke3 (opponent cost 151) then …Qh4 (the swapped-seat row: their threat Nxd8 stopped by the student's …Qh4).
- Mate stop: g chesscom-1042725180 ply 68 …Re1 (student, cost 147) then Rxe1 → "it stops the mate with Qxg1" — the student's mate threat met by a capture that wins (TS-IGN shape: the student's move lost).

## H. Open questions
- none beyond the Learn floor shared with the other cards.
