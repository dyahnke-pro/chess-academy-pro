# Trap/Gem Coverage — quantified findings (2026-06-09)

**Question (David):** is there a concrete, grounded, *quantifiable* way to improve
trap lines — Stockfish high-depth vs amateur lines — or is it as good as it gets?
**Don't propose a fix unless it's truly (quantifiably) better.**

**Status: RESEARCH ONLY. No gems shipped. No content changed.** Candidate list
lives at `/tmp/cov-gems.json` (scratch, this container only — re-runnable).

## Answer: TWO levers tested, one is real.

### Lever 1 — engine DEPTH: NOT worth it (measured)
Re-graded all 296 shipped gems at high depth (positional @28, confirmed @26) vs
the miner's stored depth-18 grade (`scripts/_diag-gem-depth.mjs`):
- mean |Δ| 12–15cp; depth 18 ≈ deep search within engine noise.
- **0 of 205 `confirmed` crushes drop below the soundness floor.** The crushes
  are all real.
- Only effects: ~10% of weakest `positional` gems shuffle a few cp around the
  +0.5 line; 16 `confirmed` are really `positional`-tier at depth (a label
  nuance, still sound). **No unsound trap is exposed by deeper search.**
- Verdict: the material-check + quiet-end playout already do the work; depth 18
  is sufficient. Bumping depth is threshold quibbling, not a real improvement.

### Lever 2 — COVERAGE (lower the frequency floor): REAL, quantified
The miner floors at FREQ_FLOOR=2% / MIN_GAMES=100. David's 2026-06-01 rule
already says that floor misses spicy low-frequency traps. Probed it: re-mined 5
well-populated openings at **0.5% / 30 games** into a scratch file
(`FREQ_FLOOR`/`MIN_GAMES` are now env-overridable; defaults unchanged) and
diffed against the shipped set by `(openingId,lineMoves,inaccuracy,punish)`.

| metric | value |
|---|---|
| probe gems (5 openings) | 55 |
| **TRUE new finds (not shipped)** | **26** |
| └ genuinely sub-2% (what the floor unlocks) | **20** |
| └ ≥2% the fresh run also caught | 6 |
| current gems the fresh run did NOT reproduce (curated/named/seed) | 33 |

The 20 sub-2% new finds are mostly `confirmed` crushes (engine ≥ +1.0): Italian
`Ba5→Re1+` **+6.65**, Vienna `Qd6→Qxg7` **+5.61** / `Ng4→Qxg4` **+4.75**, plus
many +1.2..+3.5. Real engine-verified punishments at 0.5–1.8% frequency that the
2% floor excluded.

**Extrapolation (SUPERSEDED — see full-set result below):** ~20 from 5 openings
naively → ~150–250. That over-shot: the 5 sampled openings (Italian/Vienna/
French) are unusually trap-rich.

### Full-set result (masterclass + 7 gambits + 81 pro-rep, 2026-06-10)
Ran the 0.5% floor across the whole universe (default ~28-opening set + an
explicit scoped run of all gambits + the 60 remaining pro-rep ids; combined +
deduped, diffed vs `punish-gems.json` ∪ `gambit-punish-gems.json`):

| metric | value |
|---|---|
| baseline gems (both stores) | 341 |
| probe gems (deduped, all sources) | 345 across 80 openings |
| **TRUE new finds** | **217** |
| **└ genuinely sub-2% (the floor unlock)** | **124** (95 confirmed, 29 positional) |
| └ by category | **pro-rep 94**, masterclass 19, gambit 11 |

**124 sound hidden sub-2% traps, 95 of them confirmed crushes — concentrated in
pro-rep (94).** This is exactly what the 2026-06-01 "spicy low-frequency traps"
rule anticipated: a tactical player's real lines hide refutable blunders below
the 2% cutoff. Gambits add little (11) — already sharp, well-mined. Top: Scotch/
Vienna/Italian (masterclass); Ruy/French/Caro/Najdorf across Carlsen/Aman/
Caruana/Gotham (pro-rep). Scratch candidate lists: `/tmp/cov-gems-full.json` +
`/tmp/cov-gems-gambit-prorep.json` (this container only).

## How to pull the lever (the RIGHT way — not a naive re-mine)
1. **Additive only.** The fresh 0.5% run failed to reproduce 33 current gems
   (hand-curated/named traps the bot won't regenerate). A wholesale re-mine
   would LOSE those. The miner already MERGES (scoped `OPENINGS=` runs keep
   other openings' gems), so run the low floor as a **candidate generator** and
   merge — never replace.
2. **Hand/Google-verify before shipping (G, 2026-06-01).** The probe output is
   engine-sound but owes the theory cross-check + both-register narration
   authoring before any gem surfaces (`isSurfaceableGem`). Candidate list ≠
   ship list.
3. **Keep the 2% default for the auto-miner; add a curated low-floor pass.**
   Lowering the global default would flood positional noise; the value is in a
   *reviewed* low-floor candidate sweep per opening.

## Tooling added (research scratch, on branch)
- `scripts/_diag-gem-depth.mjs` — depth re-grade experiment.
- `scripts/mine-punish-gems.mjs` — `FREQ_FLOOR`/`MIN_GAMES` now env-overridable
  (defaults 0.02 / 100 unchanged).

## Next
- Full 0.5% coverage scan across ALL masterclass + pro-rep openings → total
  candidate count (running).
- Then David decides whether to greenlight the per-opening curated low-floor
  sweep (hand-verify + author narration for the new finds).

## Hand-curated candidate #1 — Alapin queen-sac swindle (the proof case)

From a ChesswithAkeem ChessReps video ("A Secret Weapon to Beat the Sicilian",
2026-06-10) — a hand-made practical swindle in the Alapin. Engine-verified
below; NOT shipped (recorded as the first hand-curated trap candidate). It is
EXACTLY the class the bot-miner structurally cannot find — proof that
hand-curation and the coverage scan are complementary.

**Line (all chess.js-legal, student = White):**
```
1.e4 c5 2.c3 d5 3.exd5 Qxd5 4.d4 cxd4 5.cxd4 Nc6 6.Nf3 Bg4 7.Nc3 Qa5 8.d5 Ne5
   (8.d5 hits the c6-knight; …Ne5 looks safe because the Bg4 pins Nf3 to the Qd1)
9.Nxe5!  Bxd1  10.Bb5+!
   • TRAP (Black blocks/trades the queen): 10…Qxb5 11.Nxb5 …Rc8 12.Kxd1
        → White +4.7 (up two minor pieces). "Game over in style."
   • REFUTATION (best): 10…Kd8! 11.Nxf7+ Kc8 12.Kxd1 → only +0.9 (Black escapes).
```

**Why the engine-first miner can't find it (the lesson):**
- It is NOT a forced win — the sac is objectively only +0.9 vs best defense
  (`10…Kd8`); the engine's actual #1 at move 9 is the quiet `Qb3` (+2.3).
- It needs Black to err TWICE (the `…Ne5` walk-in AND the `…Qxb5` block instead
  of `…Kd8`). The miner scans SINGLE inaccuracies with a forced winning
  refutation graded at the quiet end — a multi-move practical swindle that's
  only +0.9 against best play never clears its bar. So it's invisible to the
  scan but a devastating club-level weapon.
- This is the `practical`-tier class the gem doctrine deliberately drops from
  auto-mining — and precisely why the 2026-06-01 "find traps by hand, no more
  bots" rule exists. The 124 coverage finds are engine-sound hidden traps; this
  is the *other* category (practical swindles) that only hand-curation surfaces.

**App coverage:** NOT present. The 3 existing Alapin gems are a different line
(`…Qxd5 4.d4 Nf6 5.Nf3 e6 6.Na3 Nc6 7.Be3` → Nb5). This whole `Nc3 / Bg4-pin /
Nxe5` family is absent from the Alapin lessons + gems.

**If shipped (future, with David's greenlight):** author as a `trap`-class weapon
with HONEST narration — "wins two pieces IF Black blocks with the queen; the
only-move `…Kd8` escapes to ~−0.9, so it's a practical swindle, not a forced
win." Both registers, sources cite the ChessReps video + the engine line. The
`narration-honesty` gate (Phase 3) would enforce the "not a forced win" framing.
