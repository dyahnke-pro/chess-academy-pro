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

## CORRECTION (David 2026-06-10) — what's actually new, honestly

The first prototype over-engineered it. Two corrections, both David's:

1. **NO escape-difficulty filter.** Dropping a trap because humans *can* refute it
   is wrong — "if 10% of opponents don't refute, that's 10% more games won," and
   the punish line exists to teach how to punish the error. The refutation is
   **recorded and taught alongside**, never used to filter.
2. **The detection is NOT new** — it's the same punish-gem condition (a common
   opponent move that Stockfish punishes). The genuinely-new piece is the
   **WALK**: branch on the *trapper's* aggressive/sac/gambit tries (`Ng5`, the
   `Bxf7`/`Nxf7` sacs, `b4`, early `Qd5`), the lines the sound-spine gem-walk
   never visits — that's why the old miner misses this whole class.

So: punish-miner condition + trapper-aggression walk + all-ratings + refutation-
taught-not-filtered. Not a clever new detector.

### Rating model (David 2026-06-10)
- **Floor = the `1000` bucket**, not `0`. The `0` bucket is *everyone under 1000*
  — it lumps in 400-level random moves (noise, not principled mistakes).
- BUT add `0` back for **discovery** with a **cross-band noise filter**: a trap
  ships only if the bait *also* appears in the `1000+` bands. A real natural
  mistake plays across all levels; a random 400-move lives only in the `0`
  bucket → dropped. Belt-and-suspenders with a move-naturalness check.
- `DISCOVER='0,1000,…,2000'` (surfaces low-end falls), `VALIDATE='1000,…,2000'`
  (coherent-play floor). Per-bait games floor (`MIN_BAIT=20`) kills thin noise.

## VALIDATED (v5, 2026-06-10)
Ran over Bishop's + Alapin: **7 real traps, all cross-band ✓, zero `0-only`
noise leaked.** Each carries bait + fall-rate + punishment + refutation:
- Bishop's `…Bg5 …Bxf6 gxf6?` +1.2 (**1,144 games**) → `Qh5`; `…Bxf2+?` +3.5 → `Kxf2 Qxf6+`; +2 more.
- Alapin `…d5 exd5 Qa5+?` +3.1 (**5,615 games**) → `Nc3 Nb4 Bb5+`; +2 more.
- The cross-band filter validated itself: `Qa5+` was mis-tagged `[unnatural]` by
  the naturalness regex but **kept by the cross-band rule** (5,615 games at
  1000+) — the empirical filter caught what the heuristic missed.

Speed fix: shallow scan (depth 14) to spot the +1.2 blunder, deep confirm
(depth 20) on hits — the depth-22-everywhere version was just slow, not broken.

## Status
- [x] Design (this doc)
- [x] Prototype + ground-truth (Bishop's + Alapin) — 7 traps validated
- [x] Corrected per David (no escape gate; trapper-aggression walk; 1000-floor +
      cross-band 0-filter; refutation taught not filtered)
- [~] Production scan over the 16 tactical openings (`SET=tactical`) — RUNNING
- [ ] Hand-verify the production candidates
- [ ] Gate + data (`swindles.json` or `tier:'swindle'`) + surface (trap trainer)


## REFINEMENTS (David 2026-06-10, second pass)

- **NAME = "Traps" with a gem icon** (David's original title) — NOT "Swindles" /
  "Secret Weapons". The surface is just **Traps** 💎.
- **Same bucket as the existing gems** (David: "too many similar buckets — is it
  a trap or not?"). A trap is structurally identical to a punish-gem; merge into
  the existing store, add one `refutation` field. The detector is a new *finder*,
  not a new content type.
- **The BAIT is YOUR move, the ERROR is THEIRS** (David's structural fix). Correct
  model: **bait** (your luring move — the last move of the line) → **error** (the
  opponent's common wrong reply = the gem's `inaccuracy` field) → **punish** (you
  win) → **refutation** (their only save). My first labels had bait/error swapped.
- **ORIENTATION is hard-asserted** — `checkNode` returns null if it's the
  student's move to play, so the detector can NEVER find a trap *for the opponent*
  (where the student is the one who errs). Only opponent-to-move nodes are checked.
- **PUNISH RUNS TO THE END** (David: "don't stop 2-3 moves before checkmate").
  `playToConclusion` walks engine-best for both sides until **mate** (`#`) or a
  **quiet, decisively-won** position. `punishToMate` flags forced mates.
- **Fried Liver finding:** the app has the Two Knights/Fried Liver as a *lesson*
  (`twoKnightsDefence.ts`, `italianGameTrapLessons.ts`) but the `Ng5→Nxe4→Bxf7+`
  trap is NOT in the drillable trap-gem set (the only Italian gem is a different
  `…d4 Nxd4 Bxf7+` line). So the detector found a real gap on the most famous
  trap in chess — earns its keep.
