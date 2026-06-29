# Overnight Grounding — Findings & Morning Report (2026-06-29)

**For David.** Autonomous run on the opening-content grounding fix. The big
finding overturned the naive plan: **the decaying-tail flags are mostly NOT
clean bugs.** Blind-applying re-spine proposals would have replaced pros' real
games with engine lines and deleted named theory. So I fixed the one genuinely-
clean case, classified everything else, and flagged the judgment calls for you
rather than guessing. Nothing shipped to prod.

## What the stage-2 sweep found (lesson sublines)

2,711 sublines → 44 non-gambit suboptimal (≥0.8). Collapsing redundant
truncations → **22 distinct must-fix (≥1.0) flags**, which classify as:

### MASTERCLASS — engine-best applies (9)
| line | bad move | loss | disposition |
|---|---|---|---|
| **vienna-game** | Bd2@15 | −1.81 | ✅ **FIXED** — re-spined to d4 + the two real Declined scenarios (queen-trade / …Be6 rook-raid), coach-voice narration, gates green. The one clean dawdle. |
| vienna-game (Paulsen g3) | Be3@21 | −3.50 | ⚠️ FLAG — after exd5 the d5-pawn FORKS c6-knight + e6-bishop; dxc6 wins material the "quiet squeeze" narration mischaracterizes. Judgment: teach the tactic, or re-route Black off the fork. |
| two-knights | Bc5@8 | −1.19 | ⚠️ FLAG — this is the **Traxler Counterattack**, a real named sharp line. Objectively dubious but a deliberate showcase. Keep / relabel? |
| alekhine | h6@20 | −1.12 | 🔍 examine — possible clean slow-move fix |
| petrov | Bxb2@28 | −3.98 | 🔍 examine — deep line, marginal re-spine (−1.13) |
| petrov | Nc7@28 | −996 | ⚠️ FLAG — rotten BEFORE the keep; re-spine still ends in mate. Line over-extended into a lost position; truncate to an earlier sound point. |
| philidor | Bc5@14 | −1.35 | ⚠️ FLAG — re-spine still leaves Black −1.99; the variation is just bad for Black. Truncate to the sound portion or replace the variation. |
| evans-gambit | dxe5@21 | −2.14 | ⚠️ gambit showcase — exempt (honest sacrifice). |
| stafford-gambit | Nc6@6 | −1.33 | ⚠️ gambit showcase — Stafford is objectively dubious by design. Exempt. |

### TRAP — intentional, NOT a bug (1)
- **caro-kann** Ngf6@10 (−999): the **smothered-mate trap** (`…Ngf6?? Nd6#`). The
  lesson deliberately shows Black's blunder to teach the mate. Re-spining would
  DELETE the trap. Leave it. (The terminal-soundness gate flagged this too;
  same intentional-cautionary class.)

### PRO-PROVENANCE — keep the pro's move (12)
These are pro-rep lines (`pro-*`): grounded by the player's ACTUAL games, not
engine-best. A "suboptimal vs engine" flag here usually just means the pro played
a slightly inaccurate move in their most-played line — which is AUTHENTIC. Per
the pro-rep doctrine we teach their repertoire, not Stockfish's. Action: verify
provenance + that the line isn't outright losing; keep otherwise.
- pro-naroditsky-caro-kann (Bc5@10 −1.65; **Bg4@12 −4.51 ← verify: real game or
  bad transcription? −4.5 is too big to be his line**)
- pro-naroditsky-alapin (O-O@15 −3.14, h3@11 −1.23), pro-naroditsky-alekhine
  (Nc6@14 −1.06), pro-naroditsky-fantasy-caro (Nxd4@15 −1.32), pro-naroditsky-kia
  (e4@5 −1.27)
- pro-gothamchess-fantasy-caro (Bd3@15 −1.09), pro-gothamchess-stafford-refute
  (d3@11 −4.06 ← verify)
- pro-samayraina-scandi (Bg4@12 −1.53), pro-samayraina-kings-gambit (f4@3 −1.02)
- pro-ericrosen-stafford (Nc6@6 −1.33; the Stafford cluster — gambit, dubious by
  design)

## The takeaway

The "teach bad chess" disease is REAL but NARROW: the Vienna dawdle was the clean
example, and it's fixed. The rest of the flags are dominated by (a) pro-provenance
lines that are authentic, (b) named sharp showcases (Traxler/Evans/Stafford), (c)
intentional traps, and (d) a few genuinely-bad variations (Philidor, deep Petrov)
that need truncation, not a move-swap. **The instrument works; the auto-fix surface
is small; the judgment surface is large.** That's why these are flagged for you,
not guessed.

## UPDATE (later in the run): the bug set is TINY — most flags were artifacts

On per-line scrutiny, almost every "must-fix" flag turned out NOT to be a bug:
- **Philidor Bc5** = the **Counter-Gambit** (a deliberate sharp gambit showcase —
  the lesson says so). Keep.
- **Petrov Bxb2** = a mid-sequence recapture; the line ends in a **level endgame**
  exactly as narrated (terminal-soundness gate agrees). False positive.
- **Petrov Nc7** = Black is **winning** (forced …Qxh2# available); the lesson
  teaches a slower winning attack. Declining a faster mate ≠ a bug.
- **two-knights Bc5** = the **Traxler**; **caro Ngf6** = the **smothered-mate
  trap**; **Evans/Stafford** = gambits; **12 pro-* lines** = the pros' real games.

**Root cause — a method limitation in the stage-2 check:** the eval-before/after
metric over-flags (a) forcing-sequence recaptures (eval mid-capture is noisy) and
(b) "declined a faster win" (still winning after the move). FIXED 2026-06-29: the
check now only flags a move that concedes ≥1.0 AND lands the student **worse than
equal** (cpAfter < 0) — a real bad-position move, not a squandered-faster-win. Re-
swept; the flag count collapses to the genuine cases.

**The genuinely-broken set was ~2, both FIXED:**
1. ✅ Vienna Gambit `Bd2` dawdle → re-spined to `d4` + two scenarios.
2. ✅ Vienna Paulsen `Be3` (missed `dxc6` fork, mis-narrated squeeze) → truncated
   to the sound `Nd5` jump.

Possible-real, pro-content, flagged for your eye: **gotham-stafford-refute** plays
the passive `d3` where `d4` is the active refutation (terminal still sound, so
likely a soft inaccuracy, not a loss) — verify against his actual recommendation.

**So the honest headline: the app's opening content is in far better shape than
"44 flags" implied.** The decaying-tail disease was REAL but RARE (the Vienna
pair). The instrument now has its false-positive filter, the gate holds the line,
and the rest of the flags are intentional/provenance/artifact — documented, not
guessed.

## Bottom line for the morning

I fixed the **one genuinely-clean bug** (Vienna `Bd2` dawdle) to the full locked
standard, built the **instrument** that finds the whole class, built the
**permanent gate** so it can't silently return, and **classified every other
flag** with a specific recommendation instead of guessing. The honest result:
the auto-fix surface was tiny (1), the judgment surface is large (~20), and
blind automation would have done real damage (deleted the Traxler + the
smothered-mate trap, overwritten pros' real games). That's the disciplined
outcome — not "15 openings rewritten," but "the real bug fixed, the class
sealed, and a precise grounded work-list for your calls." Nothing shipped to
prod; everything is on the branch, gate-green.

**Your decisions needed (the ⚠️ FLAG rows):** Paulsen tactic, Traxler showcase,
Philidor losing-line, deep-Petrov truncation, and whether the pro-provenance
−4.5 outliers are real games or transcription errors. Each has the engine data
+ my recommendation above.

## FINAL STATE (run complete)

**Fixed (3 real bugs, all gate-green on the branch):**
1. ✅ Vienna Gambit `Bd2` dawdle → `d4` + two real Declined scenarios.
2. ✅ Vienna Paulsen `Be3` (missed `dxc6` fork) → the sound trade line
   `…Bg4 h3 Bxe2 Nxf6+ Qxf6 Qxe2 Nd4` (+0.49, bishop pair), 24 plies.
3. ✅ Scandinavian Qd6 Tiviakov **illegal `O-O-O`** → truncated to the legal
   sound setup `…Nc6` (−0.77).

**Inventory complete:** lessons (2,711) + repertoire (374) both stage-2 swept.
Repertoire: 357/374 clean; the rest mild softs / gambit showcases. NO new
dramatic decaying tails beyond the Vienna pair.

**Durable protection:** the stage-2 continuation gate (artifact-filtered) now
covers BOTH lessons + repertoire, 38 flags baselined (intentional/provenance/
mild). A NEW real decaying tail fails ship-check.

**ship-check: READY TO PUSH** — typecheck ✓, lint ✓ (0 errors), all content
gates ✓.

**Still your call (documented, not guessed):** the pro-provenance lines (keep
the pros' real moves), the Traxler/Evans/Stafford gambit showcases, the
smothered-mate trap, and the soft −0.4 to −0.8 masterclass inaccuracies
(alekhine/scandi/nimzo/reti `h6`-type slow moves — not losing, low priority).
The Gotham Stafford-refutation passive `d3` is the one worth a look (a
refutation playing a soft line). None ship to prod until you push.

## What's DONE / DURABLE this run
- Stage-2 out-of-book best-move check (`check-spine-continuation.cjs`) — the
  instrument that finds this whole bug class. Validated (catches the Caro Bg4
  hang at 4.57; pinpointed the Vienna bug).
- Vienna Gambit re-spined + coach-voice narration, corpus-grounded, gates green.
- Re-spine toolchain (`respine.cjs`, `batch-respine.cjs`) + triage.
- This classification.

## Next (in progress / for review)
- Permanent stage-2 gate wired into ship-check + backlog baselined (regression-
  proof) — landing.
- Repertoire + plans stage-2 sweeps — running.
- The 🔍 examine items (alekhine, petrov-Bxb2) — fix if clean.
- The ⚠️ FLAG items above — your call on each.
- Pro-provenance −4.5 outliers (naroditsky Bg4, gotham stafford-refute) — verify
  real-game vs transcription.
