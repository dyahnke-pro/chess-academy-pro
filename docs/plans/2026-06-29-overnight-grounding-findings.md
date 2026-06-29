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
