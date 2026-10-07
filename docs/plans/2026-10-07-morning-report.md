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

## 3. Swarm results

_(filled when each swarm lands: step-by-step outcome, lone-survivor ideas,
missing computers, content findings, orphans removed)_

## 4. Decisions for David

_(new design questions only — never guessed)_

1. **Taught lines outside a pro's own games** — 31 pro lines go past the
   player's games (e.g. all 4 GothamChess London lines). The doctrine allows
   taught lines but says to label them; the data has no field for it. Add a
   `taught: true` flag shown in the UI, or something else?
