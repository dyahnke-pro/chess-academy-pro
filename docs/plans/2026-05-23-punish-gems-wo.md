# WO — Punish-the-inaccuracy gems + weapon-section restructure

The app's thesis (David): the "weapon" section isn't famous named traps — it's
*"here's the common mistake your opponent actually makes, and how you punish
it,"* generated for **every line of every opening**. Named traps become rare
jewels layered on top. Built on the amateur DB (finds the mistake) + masters +
Stockfish (the crush). Prototype miner proven on Caro (commit 3d0614e).

## Phases

### Phase 1 — Mining + engine confirm + data model  ← IN PROGRESS
- [x] Prototype miner (`scripts/mine-punish-gems.mjs`) — amateur DB finds
      common opponent moves that score ≥EDGE better for the student.
- [ ] **Quality bar**: tune FREQ_FLOOR / MIN_GAMES / EDGE so only meaningful
      inaccuracies surface (the big-sample, big-delta ones).
- [ ] **Stockfish confirmation of the punish** (`resolveStockfish`, same as
      mastersCoverage Hole-6b): after `[inaccuracy][punish]`, the engine must
      show the student clearly better (≥ +THRESHOLD cp). Runs where an engine
      exists (CI / `STOCKFISH_PATH`); in the sandbox, candidates are emitted
      `tier: 'practical'` (DB-scored only) and a CI step promotes them to
      `tier: 'confirmed'`. NEVER ship an unconfirmed punish as a "crush".
- [ ] **Data model**: `src/data/punish-gems.json` — per gem: `{ openingId,
      lineMoves, inaccuracy, freqPct, games, practicalScore, punish,
      engineCp?, tier, why }`. `why` is FACTUAL/grounded (freq + score +
      engine), never invented prose.
- [ ] **Gate**: a test — every gem's line is chess.js-legal + DB-anchored
      (≥6-ply), punish is legal, `confirmed` tier has an engineCp.

### Phase 2 — Weapon-section restructure (UI)
- [ ] Weapons section spine = the gems (per line / per variation tab); named
      traps demoted to the highlighted overlay (playbook §3 rewrite).
- [ ] Render: the inaccuracy position + "opponents play X here (N% / score) —
      punish with Y." WLPP where it makes sense (Watch the punish; Play it).
- [ ] Never-empty: every line has ≥1 gem (every position has a common bad try).

### Phase 3 — Scale + gate
- [ ] Run the miner across all 4 masterclass openings (then the 40).
- [ ] CI: engine-confirm step promotes practical→confirmed; gate on it.
- [ ] Rewrite playbook §3 (weapons doctrine) to gems-primary.

## Honest caveats (from the prototype)
- Amateur win-rate = PRACTICAL difficulty, not objective eval → Stockfish is
  the objective gate; framing stays "scores better in practice" until confirmed.
- The top reply ≠ a sharp punish; engine confirmation is what earns "crush".
- No engine in the web sandbox → confirmation is a CI step.
