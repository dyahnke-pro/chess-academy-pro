# The Swindle Detector — design & build plan (2026-06-10)

**The project (David, 2026-06-10):** build the ALGORITHM that automatically
finds *practical swindles* — opening traps like ChesswithAkeem's — the whole
class the engine-first gem miner is structurally BLIND to. Every trap ships
with its engine-verified refutation. "We win the queen — *unless* they find the
only move, and we'll teach you that too." That honesty is the Chess Academy Pro
standard; a ChessReps clone without it is not the bar.

## The core insight — the gem-depth experiment, inverted

- A **sound gem**: the punishment wins vs the opponent's *best* defense.
  Empirically **depth-stable** — the 296 shipped gems moved a mean |Δ| of just
  12–15cp from depth 18 → 26, and 0/205 confirmed crushes fell below the floor.
- A **swindle**: the punishment wins vs the opponent's *tempting* move, but the
  *best* move (hard to find) escapes. **Depth-UNSTABLE** — the bait's eval
  diverges between what a human sees (shallow) and what's true (deep).

So the detector hunts the exact depth-divergence the soundness sweep filtered
OUT. Same Stockfish machinery, opposite target.

### Ground-truth proof cases (the algo MUST surface these — already hand-verified)
- **Alapin queen-sac** (`…Qa5 …Ne5 9.Nxe5 Bxd1 10.Bb5+`): +4.7 if Black plays
  `…Qxb5`, but **+0.9 if `…Kd8!`**. Tempting bait (grab/trade the queen),
  hard escape (a king walk).
- **Bishop's `5.Qd5` "fork"**: looks like a free piece; **+0.68 vs `…Ng5!`**.
  Tempting bait (let the fork "work"), hard escape (a knight-to-the-rim retreat).

If `mine-swindles.mjs` doesn't catch these, it's not done.

## The algorithm

At every OPPONENT-to-move node along a repertoire line (reuse the gem miner's
walker + explorer proxy + Stockfish):

**Read 1 — the truth / the escape.** Deep eval (depth ~24) → best move `E` and
its eval `evalBest` (from the trapper's perspective, the position is roughly
`-evalBest` for the trapper, i.e. the opponent holds).

**Read 2 — the tempting move `B` (the bait).** The move a *human* plays. Pick by
the max of three signals:
  - **shallow appeal**: best move at **depth 6–8** (what a club player calculates);
  - **naturalness**: a capture / check / recapture / queen-grab / "obvious"
    developer (reuse the miner's distractor-scoring) ranks tempting;
  - **human frequency**: the amateur explorer's most-played move at the target
    rating band (`RATINGS`, now per-skill-band — see Open Qs).

**Read 3 — the divergence + payoff test.** `B` is a trap iff:
  - `B` looks fine shallow: `shallowEval(B) ≥ −0.5` (a human sees no problem), AND
  - `B` is crushed deep: after `B`, the trapper's best reply `P` (the punishment)
    reaches `≥ +1.5` (or wins material) at a quiet-end playout, AND
  - the escape is meaningfully better: `evalAfter(E) − evalAfter(B) ≥ ~1.5` (the
    gap between the only-move and the bait).

**Scoring (rank the traps):**
  - `temptingness` = f(shallow-appeal rank of `B`, naturalness of `B`, human
    frequency of `B`) — how likely they grab the bait.
  - `escapeDifficulty` = is `E` the **only** move holding eval `≥ −1`? is `E`
    low-frequency in the explorer? is `E` a "weird" move-type (king walk /
    backward retreat / quiet in-between)?
  - `payoff` = the punishment eval at the quiet end.
  - **`trapScore` = temptingness × escapeDifficulty × payoff.**

**The honesty layer (NON-NEGOTIABLE — the CAP standard):** every emitted trap
stores BOTH lines —
  - `trapLine`: `B` → `P …` (the payoff, engine-verified),
  - `escapeLine`: `E …` + `evalBest` (the refutation),
  and tier = **`swindle`** (never `confirmed`/"forced win"). Narration must name
  the escape. The Phase-3 `narration-honesty` gate (no "equal/winning/forced"
  claims on a non-winning line) enforces it at build time.

## Why the current miner can't do this (the gap it fills)
The gem miner requires `P` to win vs the opponent's BEST reply (eval at the quiet
end ≥ +0.5, graded after best-play-both-sides). A swindle's `P` does NOT win vs
best play — the opponent has `E`. So every swindle is rejected by the miner's
core gate. The detector flips the gate: it KEEPS the moves where best-play holds
but a *tempting* move loses. Complementary, not redundant:
  - gem miner → engine-sound hidden traps (the 124 sub-2% finds).
  - swindle detector → practical swindles (Akeem's whole catalogue).

## Build plan
1. **`scripts/mine-swindles.mjs`** — fork `mine-punish-gems.mjs`. Keep the
   walker, explorer (`/api/lichess-explorer`), Stockfish resolver, quiet-end
   playout. ADD: the shallow-depth read (depth 6–8), the divergence test, the
   escape-difficulty scorer, the dual-line (trap + escape) output, tier
   `swindle`.
2. **Ground-truth test** — run it on the Alapin + Bishop's Opening; assert it
   surfaces the two known swindles above. This is the unit test for the algo.
3. **Tune the knobs** on the proof cases (shallow depth, the `−0.5`/`+1.5`/`1.5`
   thresholds, the scoring weights) until the known swindles score high and
   noise scores low.
4. **Scan** the masterclass + pro-rep + gambit openings → a ranked swindle
   candidate list (scratch, like the coverage scan). Hand-verify the top N.
5. **Gate + data** — `src/data/swindles.json` (or fold into the gem store with
   `tier:'swindle'`), a `swindles.test.ts` (legality + both-lines-present +
   refutation-eval sanity), and the narration-honesty gate.
6. **Surface** — a "Swindles / Secret Weapons" WLPP rung or section (the
   ChessReps-style trap trainer): Watch the bait+punish, then Practice defending
   the escape from the *other* side (teach both the weapon AND the antidote).

## Open questions (twist-the-knobs — for David)
- **Rating band**: swindles are rating-specific (a 600 falls for a different bait
  than a 1900). Make `RATINGS` per skill-band (the app already calibrates
  beginner/intermediate/expert) and mine a band-matched swindle set? Or one
  mid-band set first?
- **Shallow depth** = the "human horizon": 6? 8? 10? Higher = stronger
  opponent model. Probably band-linked too.
- **Payoff floor** for a swindle: full +1.5, or include "wins the exchange /
  a clean pawn with a big practical edge" (+1.0)?
- **Surface**: standalone trainer section, or a `swindle`-tier rung inside the
  existing opening WLPP?

## Status
- [x] Design (this doc)
- [ ] Prototype `mine-swindles.mjs` + ground-truth test (Alapin + Bishop's)
- [ ] Knob-tune on proof cases
- [ ] Full scan + hand-verify
- [ ] Gate + data + surface
