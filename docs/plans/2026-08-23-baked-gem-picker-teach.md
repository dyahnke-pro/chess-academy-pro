# PLAN — Baked gem picker in "teach me X" (Learn with Coach)

David 2026-08-23: bake gem teaching into the "teach me X opening" walkthrough as an
**interactive picker detour**, not a spoken aside.

## The behavior (locked with David)
- At a walkthrough position where a punish-gem is available (opponent to move, a slip
  would let the student punish), the walkthrough **pauses** and shows a **picker**:
  the trap(s) + a Continue button. (pause-and-wait, not an optional tile.)
- Tap "see it" → **one tap plays ALL** available gems: for each gem, snap to the base
  position, play the inaccuracy + punish sequence out on the board with narration, a
  **brief digest pause** at the end, then snap back to base. After the last gem, snap
  back and **resume** the normal walkthrough.
- Narration + arrows come from the **opening-tab source** (`gemToPlayableLine`) — gems
  are premade. If NO premade gem exists at a position, construct one with the **finder**
  (`tacticalRead`/`playOutPunish`) — phase 2.

## Architecture
Detour mechanism = clone of `acceptTrap` (`useTeachWalkthrough.ts:1707-1824`): drive the
`trapFen` board override through the sequence, `speakWalkthroughText` awaited per ply,
`setTrapFen(null)` to snap back, parked transition (`deferredTransitionRef`) to resume.

### Files / phases
1. `types/walkthroughTree.ts` — `WalkthroughTreeNode.gems?: BakedGemLine[]` + `BakedGemLine`/`BakedGemStep`. [done]
2. `services/gemCrushLines.ts` — `buildGemDetour(gem)` (slice `gemToPlayableLine` to [inaccuracy..]) + `gemsForPosition(pathSans, studentSide)`. 
3. `services/openingGenerator.ts` — `attachBakedGems(node, pathSans, spliced, studentSide)` at spine + branch + extension nodes; bump `WALKTHROUGH_GEN_REV`. [rev bumped]
4. `hooks/useTeachWalkthrough.ts` — `'gem-picker'` + `'gem-playing'` phases, `pickGem()` detour player, skip live `computeWatchGemAside` when `node.gems`. 
5. `components/Coach/CoachTeachPage.tsx` — gem-picker panel (mirror fork panel).
6. Tests: `buildGemDetour` + `attachBakedGems`; runtime picker if feasible.
7. Phase 2 — finder fallback (runtime engine construction when no premade gem).

## Locked contracts (from runtime map)
- Voice-promise gated; NO fallback timer racing speak. NO auto-advance on the picker (fork rule).
- Every continuation re-checks `isCurrent()` / run token; register `cancelNarrationRef` that clears `trapFen`+arrows.
- Baked gem vs live overlay must not double-teach: live `computeWatchGemAside` skips when `node.gems?.length`.

## Status
- [x] scrapped the first (spoken-aside) approach
- [x] data model (BakedGemLine/BakedGemStep on the node) + generator baking (attachBakedGems)
- [x] runtime picker (`gem-picker`/`gem-playing` phases, playGems/dismissGemPicker, trapFen detour + snap-back + resume)
- [x] UI panel (walkthrough-gem-picker / -see / -skip)
- [x] tests: buildGemDetour/gemsForPosition/attachBakedGems + runtime picker fires/plays/resumes
- [ ] ship-check + push main + 3-instrument audit
- [x] phase 2: finder fallback (runtime engine construction when no premade gem) — DONE
      2026-08-27 (David "do 2"). `gemFinder.findGemsForLine` now falls back to an ENGINE-ONLY
      slip scan when the explorer is silent: `engineOnlySlips` reads the multi-PV fan for the
      opponent's top inaccuracies, and `verifySlip` is held to the STRICTER confirmed tier
      (≥ +1.0 `WEAPON_CP`), never the +0.5 positional edge — the answer to "what legitimizes a
      runtime gem without human frequency": a decisive, engine-verified refutation, or nothing.
      Capped (`MAX_ENGINE_ONLY_POSITIONS = 6`) so the speculative scan stays cheap. 2 tests
      (fires at the confirmed tier; rejects a merely-inferior +0.7 slip).
