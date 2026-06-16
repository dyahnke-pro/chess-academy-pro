# Learn coach — position trap scan in the grounded handoff (2026-06-16)

## Problem (David, 2026-06-16)
On `/coach/teach` (Learn), asking "is there a trap in this position?" spun up
a minute-long OPENING trap-lesson build ("Putting together the Ruy Lopez:
Noah's Ark Trap lesson…") instead of SEARCHING the current board. David wants
"the same trap mining tool we used in our opening tab" — the
`detectTrapInPosition` scanner already live in `/coach/play` (CoachGamePage) —
wired into Learn's GROUNDED HANDOFF so the coach answers from the live FEN.

## Design (agreed with David)
- It rides in the **grounded handoff** (G0): code computes the trap; the LLM
  only voices it. Same package as `buildTacticsLiveContext` /
  `explainBestMoveGrounded`.
- **Additive only** — no edits to the locked walkthrough trap state machine
  (`pendingTrap`/`trapFen`/`acceptTrap`/`skipTrap` in `useTeachWalkthrough`).
- Two complementary detectors in Learn's handoff:
  - `buildTacticsLiveContext` — live engine tactics (forks/pins/hanging). EXISTS.
  - `detectTrapInPosition` — popular-but-losing move (≥40 Lichess games, ≤−200cp)
    + refutation. NET-NEW to Learn (the gap).
- Caveat: trap scan needs Lichess explorer coverage; off-book → null (correctly
  silent, G3). `buildTacticsLiveContext` carries live tactics everywhere else.

## Build (the SAME tool, shared — not a fork)
1. NEW `src/services/positionTrapScan.ts` — extract `evaluateExplorerCandidates`
   (was private in CoachGamePage) + a higher-level `scanPositionForTrap({ fen,
   mover, explorer?, engineBestSan?, legalSan?, topN? }) → TrapSignal | null`.
   Optional pre-fetched `explorer` so Play doesn't double-fetch.
2. `src/coach/types.ts` — add `trapSignal?: TrapSignal` to `LiveState` (type-only
   import of TrapSignal from openingTrapDetector).
3. `src/coach/envelope.ts` — render `state.trapSignal` via `formatTrapForPrompt`
   in a sub-block right after the tactics block (G3 framing).
4. `src/components/Coach/CoachTeachPage.tsx` — in `handleSubmit`'s ask path
   (before building `liveState` ~2557), when the ask is trap/tactics-shaped,
   `await scanPositionForTrap({ fen, mover: fenTurn, engineBestSan, legalSan })`
   and set `liveState.trapSignal`. Gated on a regex so normal asks don't pay the
   cloud-eval cost.
5. `src/components/Coach/CoachGamePage.tsx` — refactor to import
   `evaluateExplorerCandidates`/`scanPositionForTrap` from the shared module
   (delete the local copy) so Play + Learn use the literal same tool.
6. Tests: `positionTrapScan.test.ts`; keep `openingTrapDetector.test.ts` green;
   envelope render assertion for `trapSignal`.

## Risk
- LOW. Additive to the grounded handoff; zero edits to walkthrough trap state.
- Latency gated behind trap/tactics question regex (no cloud-eval on every ask).

## Status
- [x] shared module + tests (`positionTrapScan.ts` + `.test.ts`, 6 tests)
- [x] LiveState field + envelope render (+ envelope test)
- [x] CoachTeachPage wiring (gated on trap/tactics question regex)
- [x] CoachGamePage refactor to shared scanner (deleted local dup)
- [x] envelope prompt carve-out: position-trap Q ≠ opening-lesson request
      (the routing half — stops the "Putting together…" misfire)
- [ ] ship-check + prod audit
