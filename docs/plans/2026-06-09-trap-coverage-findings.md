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

**Extrapolation:** ~20 sound hidden traps from 5 openings → **~150–250** across
the full masterclass + pro-rep set (rough, needs the full scan to confirm).

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
