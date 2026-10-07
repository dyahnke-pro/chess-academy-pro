# Morning report — overnight build, 2026-10-07 (DRAFT, filled as work lands)

Branch: `claude/reads-rotation`. **Nothing has gone to main** (B7: main waits
until David has read this). Rulebook: `RULEBOOK.md` + the checklist artifact.

## 1. What happened overnight, in order

| time (UTC) | what |
|---|---|
| 03:35 | Main one-brain swarm launched (map → teach → compare → design → attack → judge) |
| 04:07 | Answers swarm finished; plan in `2026-10-07-answers-swarm-plan.md` |
| 04:12 | **Main swarm died** (aborted, no error from my side) after 37 min, 30 agents finished. Not noticed until 05:00, because a workflow writes its output only at the end. Resumed 05:01 from the same run ID (finished agents reused). A liveness watch now reports any swarm that goes quiet for 10 minutes. |
| 04:14–04:56 | Answers plan P0 built (below) |
| 04:22 | Content-accuracy + orphans swarm launched |
| 04:24 | Every-opening swarm launched (125 auditors) |
| 04:28 | Every-variation script: all 864 lines + 578 plans checked |
| 04:4x | First branch push failed: two heavy data tests timed out because my engine run was competing for CPU. Both pass alone (11/11). Engine run paused, push retried. |
| 05:0x | Second push failed the context gate: I changed coach files without regenerating their surface maps. Regenerated, read, committed (d58defc8d). My miss: the 1-second map check now runs before every push. |
| 05:22 | **Opening swarm paused.** Throughput is ~2–3 agents per swarm at ~15–20 min each; 125 auditors would take over a day and starve the main swarm, which everything else builds on. 3 openings done and cached; resumes from cache once the main swarm reaches its judge phase. The content swarm's 7 openings units cover the same ground at a coarser level meanwhile. |

## 2. Built and committed (branch)

### Answers plan — P0 (safety + the instrument): DONE
1. **"Can I play Nf3?" no longer plays the move.** A move is played only on a
   command whose first meaningful word is a command verb; any question mark
   makes it a question. The check lives inside `computeRoutedIntent`, the one
   function Play, the mic, Learn and Review share. (92c04bcd6; 9 tests fail on
   the old code)
2. **"How do I play against the Sicilian?"** is a how-to question, not a
   win/loss record. (866843ed3)
3. **"Tell me about X"** reaches the opening-identity lane instead of being
   stripped as filler. (026599240)
4. **A bare back-rank square** ("is a8 a good square for my rook?") is a
   promotion only when the words say so; one named piece claims the square.
   (33b28b920)
5. **The audit now checks WHICH LANE answered.** The brain computed the
   serving lane every turn and dropped it before the log; now it's logged, and
   the all-questions audit holds every question — the matrix, the 4 rows it
   never asked, and the 157 structural probes — to the lane that must answer
   it. Contracts that rewarded "I'd play" and percentages are gone; a lane
   with no contract fails instead of passing on length. "Why is that best?"
   got its own lane name (it shared "best-move", so nothing could tell them
   apart). Negative control: the audit fails on a blank app. (9b2d606ae)

Not run on prod yet (nothing is on main). It runs after the merge.

### Every variation and tabia — checked
See `2026-10-07-every-variation-findings.md`. 864 lines, 578 plans:
0 illegal moves, 0 orphan plans. Real defects: **Philidor Exchange 7…Nbd7**
(masters never played it in 871 games) and **Benko "Modern 5.f3"** (plays
7.f3, 0 master games, instead of the real 5.f3; it had been waved through the
masters gate as "drift"). Both rebuilds batch with the opening swarm's
findings. Engine soundness pass still to run.

### The gem cut (F04, which you confirmed): traps vs known mistakes
- **Traps** = a natural move that loses at least a piece or gets mated by force
  (engine ≥ +3.0 at the quiet end of the line). **69 of 389 gems** (54 mined +
  15 gambit) across 36 openings. Only these show as weapons, in the trap menu,
  as the opponent's deliberate slip on Easy, as trap-ahead warnings, and as the
  walkthrough's trap detours.
- **The other 320 are NOT deleted.** An engine-verified slip worth half a pawn
  or more stays a **known mistake**: Review still says "f3 is a known mistake
  here — it loses to exf3, winning a pawn", the Watch aside and Learn's punish
  callout still teach it — but none of them calls it a trap or a crush any more
  ("punishes it with", not "crushes with"). That's F04's "small edges belong in
  opening principles".
- **Playing the Caro-Kann as Black, there are no real traps left** — none of
  the 22 Caro gems Black punishes wins a piece. Playing AGAINST the Caro, 4 of
  16 remain (the Advance and anti-Caro lines). The Vienna keeps 10, the Italian 4, the Scotch 3.
- Fixed on the way, same "reason, not stats" rule: the trap warning ("…and 12%
  of club players play it") and the review lecture's trap line now say how
  often in words. The mate gem's text read "the engine has White winning
  (+1000.0)"; it says "it's checkmate" now, and the miner's template is fixed.
- Found, not yet fixed: **the Review theory lecture still speaks percentages
  throughout** ("55% of master games", "White scores 55% here", "(45%)") — the
  earlier numbers-leak fix missed this file. Next commit.

## 3. Swarm results

_(filled when each swarm lands: step-by-step outcome, lone-survivor ideas,
missing computers, content findings, orphans removed)_

## 4. Decisions for David

_(new design questions only — never guessed)_

1. **Taught lines outside a pro's own games** — 31 pro lines go past the
   player's games (e.g. all 4 GothamChess London lines). The doctrine allows
   taught lines but says to label them; the data has no field for it. Add a
   `taught: true` flag shown in the UI, or something else?
