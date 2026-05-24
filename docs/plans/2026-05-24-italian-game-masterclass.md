# PLAN — Italian Game Masterclass (Vienna template, playbook §0.7)

Branch: `claude/italian-game-masterclass-umuFc`. Build the `italian-game`
masterclass to the LOCKED Vienna keystone standard.

## Environment constraints (this session)
- **Network: only GitHub reachable.** The Lichess explorer + the prod
  `/api/lichess-explorer` proxy are BOTH blocked (`Host not in allowlist`).
- Consequences, both SANCTIONED by the playbook (self-hide → page stays complete):
  - **Punish-gems (STEP 6): DEFERRED.** `mine-punish-gems.mjs` needs the
    explorer proxy. Gems self-hide when absent. → Run on CI or by David.
    Weapon coverage this session comes from hand-authored **named traps**
    (count toward manifest `weapons`, no mining needed).
  - **Model games (STEP 7): DEFERRED.** Need REAL sourced PGNs; the explorer
    is blocked. `ModelGamesSection` self-hides. → Flag to David. manifest
    `modelGames` floor = 0.
- Stockfish IS installed (`apt-get`) but unused without the explorer feed.

## Content picks (§0.5 autonomous, grounded in local sources)
Student side = **white**. Sources: `repertoire.json` italian-game variations
(authored PGNs + keyIdeas), `openings-lichess.json` (G3 anchor), chess.js
(legality), concept corpus (ideas/principles).

**Main line (pill)** = Giuoco Piano main line, the `repertoire.json` pgn
(Bd2/Greco c3-d4 structure, 36 plies).

**Variation tabs** (ordered by reasoned amateur prevalence — explorer freq
could NOT be queried; ordering flagged for David to verify on prod):
1. **Modern** — "Giuoco Pianissimo: Modern d3 System" (20p).
2. **Two Knights** — "Italian: Two Knights with d4" (24p).
3. **Evans Gambit** — "Evans Gambit Accepted: Main Line" (19p → +1 via DB).
4. **Møller** — "Italian: Modern Moller Attack" (31p).

**Named traps** (real, named, chess.js-forced, DB-anchored):
- **Légal's Mate** — WEAPON. appliesTo main.
- **Fried Liver Attack** — WEAPON. appliesTo two knights.
- **Blackburne Shilling Gambit** — WARNING. appliesTo main.

## Build steps (Vienna §0.7 recipe) — STATUS
- [x] 1a main lesson `src/data/lessons/italianGame.ts` (15 beats, 36p)
- [x] 1b variation lessons `italianGameVariations.ts` (Modern/Two Knights/Evans/Møller, all ≥20p)
- [x] 1c named traps `italianGameTrapLessons.ts` (Légal weapon, Fried Liver weapon, Blackburne warning)
- [x] 2 register `lessons/registry.ts` + `lessons/index.ts` (runtime map)
- [x] 3 `variationTabs.ts` CURATED['italian-game']
- [x] 4 `italianMasterclassTabs.ts` + OpeningDetailPage chains (plan + trap)
- [x] 5 middlegame plans (5) + add-leadeye-to-plans.mjs
- [ ] 6 punish-gems — DEFERRED (network: explorer proxy blocked)
- [ ] 7 model games — DEFERRED (network: real PGNs blocked)
- [x] 8 checkpoint quizzes + common mistakes — pre-existing entries cover italian-game
- [x] 9 manifest entry (variations 8, plans 5, weapons 2, warnings 1, keyIdeas 4)

Authoring toolkit (kept): `scripts/_italian-content.json` (source of truth for
the lessons), `scripts/_gen-italian.mjs` + `scripts/_gen-italian-plans.mjs`
(generators), `scripts/_check-beats.mjs` (pre-vitest validator).

## RESULT: `npm run ship-check` → READY TO PUSH (typecheck ✓ / lint 0 errors /
all ⭐ content gates ✓). Also touched `middlegamePlanner.ts` (subject match
prefers a teachable plan on ties) + `openingManifests.test.ts` /
`middlegamePlanner.test.ts` mappings to include italian-game.

## Gates → `npm run ship-check`
lessonIntegrity, narrationAccuracy, narrationGrounding, lessonDepth,
lessonTabIntegrity, wlppNarration, openingManifests, modelGames-orientation,
punishGems, middlegamePlanner, OpeningDetailPage.wiring, openingWiring.
Then `AUDIT_OPENING=italian-game node scripts/audit-opening-walkthrough.mjs`.

## Authoring rules (from the gate suite)
- Beat moves legal; spine anchors ≥6p in DB; deepest variation beat ≥20p.
- Hyphenated "<sq>-<piece>" claims true at some frame of the beat's moves.
- Every `say` beat needs `sayShort` ≤8 words (em-dash not counted).
- Arrows from a non-pawn with a CLEAR sight-line to `to` at the beat's final
  position; `to` named in narration. Highlights: square named in narration.
- Orientation white. No interface refs / no praise / position teaches.
