# WO — Punish-the-inaccuracy gems + weapon-section restructure

The app's thesis (David): the "weapon" section isn't famous named traps — it's
*"here's the common mistake your opponent actually makes, and how you punish
it,"* generated for **every line of every opening**. Named traps become rare
jewels layered on top. Built on the amateur DB (finds the mistake) + masters +
Stockfish (the crush). Prototype miner proven on Caro (commit 3d0614e).

## Phases

### Phase 1 — Mining + engine confirm + data model  ← DONE
- [x] Prototype miner (`scripts/mine-punish-gems.mjs`) — amateur DB finds
      common opponent moves that score ≥EDGE better for the student.
- [x] **Quality bar**: FREQ_FLOOR 0.04 / MIN_GAMES 400 / EDGE 0.06 — only
      big-sample, big-delta inaccuracies surface.
- [x] **Stockfish confirmation of the punish** (`resolveStockfish`, same as
      mastersCoverage Hole-6b): after the played-out punish, the engine must
      show the student clearly better (≥ +35cp). Runs where an engine exists
      (CI / `STOCKFISH_PATH`); in the sandbox gems emit `tier: 'practical'`
      (DB-scored only) and the CI step promotes them to `confirmed`. NEVER
      ship an unconfirmed punish as a "crush".
- [x] **Play the punish OUT** (David: "play the line out until the capture
      line is complete, then let the user try it"): masters top moves, ≥15-
      game floor, ≤8 plies → `playLine` feeds WLPP.
- [x] **Data model**: `src/data/punish-gems.json` — `{ openingId, lineMoves,
      inaccuracy, freqPct, games, practicalScore, mainMove, punish, punishSeq,
      playLine, engineCp, tier, why }`. `why` is FACTUAL/grounded.
- [x] **Gate** (`src/data/punishGems.test.ts`, wired into ship-check): every
      gem's playLine is chess.js-legal + spine DB-anchored (≥6-ply),
      inaccuracy+punish sit on the line in order (positional), `confirmed`
      carries an engineCp, and the WLPP converter's arrows ground on real
      pieces.

### Phase 2 — Weapon-section restructure (UI)  ← DONE
- [x] Weapons section spine = the gems (`src/data/lessons/punishGems.ts`:
      `getPunishGemsForTab` per-variation spine filter, `gemToPlayableLine`
      WLPP converter); named traps demoted below as the rarer jewels.
- [x] Render: emerald gems card on `OpeningDetailPage` — inaccuracy still-
      board + factual why + freq/score + tier badge + full WLPP row (Watch
      the crush played out / Learn voice-guided / Practice silent+hint / Play
      coach-locked). Lead-the-eye ORANGE move-arrows per move.
- [x] Never-empty by self-hide: a tab with no gem hides the card (empty >
      invented). Interactive probe `scripts/probe-punish-gems.mjs` 7/7.

### Phase 3 — Scale + gate  ← DONE
- [x] Miner walks all 4 masterclass openings from canonical seeds (OPENINGS=
      env mines a subset); ≥6-ply spine floor enforced. Sandbox yield: 4
      grounded practical-tier gems across Caro / Ruy / Pirc (Vienna's main
      line has no qualifying inaccuracy — honest empty).
- [x] CI: `.github/workflows/mine-punish-gems.yml` re-mines with a real
      Stockfish, promotes practical→confirmed, gates, and opens a PR with the
      refreshed JSON (manual dispatch + monthly).
- [ ] Rewrite playbook §3 (weapons doctrine) to gems-primary. *(follow-up —
      doctrine prose, not code.)*
- [ ] Per-variation gems (deeper than main-line trunk) + the remaining ~38
      openings + gambits, as their masterclasses get built. *(follow-up —
      run the CI miner per opening as content lands.)*

## Honest caveats (from the prototype)
- Amateur win-rate = PRACTICAL difficulty, not objective eval → Stockfish is
  the objective gate; framing stays "scores better in practice" until confirmed.
- The top reply ≠ a sharp punish; engine confirmation is what earns "crush".
- No engine in the web sandbox → confirmation is a CI step.
