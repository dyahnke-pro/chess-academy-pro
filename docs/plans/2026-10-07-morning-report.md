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
| 06:05 | **Why the swarms were slow, measured:** the workflow runtime runs at most 2 agents at once per workflow on this 4-CPU box. The main swarm was restructured into "shards" — 7 small workflows side by side, ~14 agents at once — with the big digests handed over as files instead of pasted into every prompt. |
| 06:12–07:30 | **Stage 1 of the widened main swarm:** 16 more close readers of the reference coach's notes + 5 comparers (Learn tape, Review tapes, the 52 walk errors, opening teaching, traps). All 21 finished, 0 errors. |
| 07:31 | Stage 2 started: 28 readers found 1,757 distinct teaching acts (300K characters, too much for one designer to read), so one agent condenses them into a single catalogue first. I also caught a silent cap in my own stage script (each comparer cut to 9,000 characters); the full texts are now saved and the cut is logged. |

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
- Committed as ea7ddeaf0.

### Numbers out of the voice (V8) — two commits
- **Review opening lecture** (7b2d0d941): "57% of master games, scoring 46%",
  "(37%)" after every sideline, "rests on 1,234 master games" and "3 captures or
  checks" are all words now ("masters usually play it", "from here it scores
  well for White", "rests on thousands of master games"). The theory phrasing
  prompt used to tell the model to KEEP every number; it now says never turn the
  words back into numbers. The score words come from ONE table
  (explorerTranslate.scoreWords) instead of a second copy in the lecture.
- **The rest of the computed speech** (f00cf6a39): the endgame recap ("6 moves
  at 92 percent" → "near-perfect technique", the costliest move named by its
  move, not "move 3"), the eval-lab outro, the subline "why" lines, the chat's
  trap-scan block (it handed the model "played 12,345 times… losing by -3.5
  points" — a double negative too), and one hard no-numbers rule in the chat
  instructions.
- **Still to do:** the hand-written lesson beats and plan/pitfall/model-game
  narration carry ~410 spoken percentages and game counts ("his 92% pick").
  The old CLAUDE.md pro-rep rule said "stats stay"; V8's note applies words
  everywhere, so V8 wins and that pass is queued (each sentence rewritten by
  hand, gates run).

### Learn's wrong statements, fixed at the computer
From the swarm's Learn-tape comparison (section 3):
- **"Bc5 keeps you clearly on top" to a Black student at White +2.9**
  (62b835de5). The verdict code was right; the engine READ it was handed had
  its sign flipped. The engine is one shared worker with no search ids, and the
  coach's own move search went straight to it while another read was open, so
  that read took the other search's lines. Now a read only keeps lines that are
  moves for its own side to move, the coach's search waits its turn, and every
  crossing is logged. The engine tests had the bug baked in (a "d2d4" bestmove
  for a Black-to-move board, asserted as correct); fixed with real moves, plus
  4 new tests.
- **The pawn threat nobody warned about** (6.h3 hitting the g4 bishop, lost
  in both games; 9.g5 hitting f6). The "you can just take the attacker" check
  used an exchange count that never goes below zero, so Bxh3 gxh3 (a bishop for
  a pawn) counted as an answer and the warning stayed silent. Now the count is
  signed and the capture must be legal. Two comparers found this
  independently.
- **"That was a blunder from me", "I let you off there", "I'm lining up a
  fork", "That took my last defender"**: V1/V2 say the coach never says "I";
  the opponent is "they" even when the coach moves its pieces. Every
  first-person line in Learn's live voice is "they" now, and the chat
  instruction that told the model to say "I / my" is changed (CLAUDE.md's old
  exception deleted).
- **"e5 wins the pinned knight" when ...h6 breaks the pin with tempo** (your
  example). The pin-pressure computer now refuses a pile-on when the pinned
  side can kick the pinner with a pawn. Its own tests had cemented the false
  claim on a French-shaped board; they now use a board where nothing can kick
  the bishop, and the old board is the "no win" case.
- **"The capture isn't going anywhere — the material will keep"** said when
  the target could simply walk away, and twice in a row. It now checks the
  capture still wins after the engine's move and their best reply, and it is
  said once a game.

## 3. Swarm results

### Main swarm, stage 1 — how the reference coach teaches, and where we fall short
**28 readers** (12 coarse + 16 close second readings of the voiced notes)
catalogued **1,757 distinct teaching acts**. **5 comparers** held our tapes up
against them. Full texts: `docs/plans/swarm-inputs/digests/compare-1..5.md`.

What the comparers found, in plain words:
- **Learn tape.** Both games were decided by the same slip (…Nc6 leaving the
  g4 bishop to the h3 pawn) and Learn never warned — fixed (section 2). The
  opening is NAMED but never TAUGHT: in 83 decision rows the opening lanes
  (identity, idea, trap-ahead, gem) were offered 0 times, although the
  identity sentence is computed every game. The "habit that finds it next
  time" closed 0 of 49 moves. Learn says about 12 words a move where the
  reference coach says about 46, and at a fast pace queued lines are dropped
  when the next move lands.
- **Review tapes.** No computer reads a threat that CAN be answered (one needs
  a 3-point win, another only sees undefended pieces), so 6.h3 / 9.g5 / 15.c3
  got nothing. The turning point named the wrong cause ("check it is still
  defended") when the bishop was attacked BEFORE the move — the right cause
  ("their threat first") already exists elsewhere. Leaving book says what was
  played, never why the book move was better.
- **The 52 walk errors.** 20 gaps explain all 52. In about half, the fact was
  already computed and the speaking surface never read it. 13 of the reference
  coach's acts have no computer at all.
- **Openings.** About 70% of lesson plies sit inside multi-move beats, so most
  moves never get their own explanation; a "what this move does in this
  opening" computer is missing.
- **Traps.** We have 10 separate trap systems with 10 definitions of "trap".
  The hand-written Jobava "Weapon" lessons win nothing; one claims an "exf6"
  that can't be played and one names a player with ratings. 20 of the 69
  trap-bar gems end their stored line with less than a piece of material
  (engine +3.0 and "wins a piece" disagree on those). The Bishop's Opening
  already has 62 mined gems reachable by position (25 at the old weapon tier).

Also found by the close readers: the pin-pressure defect (fixed); in the notes
themselves, 5% are first person, a few name players, 159 note texts repeat
(343 extra copies) and one note is 1,443 words.

_(stages 2–4 — design, attack, judges, the plan, lone-survivor ideas and the
missing-computers list — land below)_

## 4. Decisions for David

_(new design questions only — never guessed)_

0. **A raw video transcript was committed to this branch** (my miss, 01:50 UTC:
   `docs/plans/swarm-inputs/-4hTQEnwa7s.en.vtt`, an input for the swarm).
   Transcripts are reference only and never committed. It is untracked now and
   the path is ignored, but it is still in the branch's history. A **squash
   merge** of this branch keeps it out of main entirely; a normal merge would
   carry it. Squash, or should I rewrite the branch history instead?

2. **The drawback of your OWN good move.** In 7 notes the reference coach
   names the downside of his own good move and then says why it can't hurt
   yet. D11 says skip a drawback the opponent can't use. Saying it with the
   reason it doesn't matter teaches the evaluation itself. Keep D11 strict, or
   allow "drawback + why it's fine" on the student's good moves?
3. **The Review lecture's caps vs "Review says too much".** It names only the
   top 2 alternatives at each branch and plays out at most 4 lines. G4.5 bans
   caps (use a value bar instead); your 2026-09-15 note says Review says too
   much in book moves. A bar (say, alternatives played in ≥ 5% of master
   games) could name more or fewer than 2. Bar, or keep the 2?

1. **Taught lines outside a pro's own games** — 31 pro lines go past the
   player's games (e.g. all 4 GothamChess London lines). The doctrine allows
   taught lines but says to label them; the data has no field for it. Add a
   `taught: true` flag shown in the UI, or something else?
