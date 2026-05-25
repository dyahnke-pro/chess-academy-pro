# PLAN — French Defence masterclass (Vienna template)

**Branch:** `claude/serene-gauss-2ILEq` · **Started:** 2026-05-25 · **Pick:** French Defence (`french-defence`)

## Why this opening
Top-tier Black answer to 1.e4 that David will actually face; CLASSICAL so the
pre-1930s book corpus genuinely covers it (`opening-book-pages.json` already has
a `french-defence` entry + concept hits → real grounding, not faked); 8
structurally-distinct curated variations already in `repertoire.json`;
complements the two existing Black builds (Caro-Kann, Pirc) without duplicating.

## Ground sources locked
- Main line + all 8 variation PGNs are in `repertoire.json` and **chess.js-legal**
  (verified 2026-05-25). Narration is prose-only over these real lines (G3).
- Book grounding: `opening-book-pages.json → pages → french-defence`.

## Variations (tabs) — ALL validated (David 2026-05-25: "add all validated variation"; no cap)
10 first-class, each DB-anchored + chess.js-legal + amateur-faced ≥3% at its fork:
Advance · Winawer · Classical · Tarrasch · Exchange · Burn · Fort Knox ·
Advance: Milner-Barry Gambit · **McCutcheon** (added) · **Rubinstein** (added).
- McCutcheon (Bb4 vs 4.Bg5 = 12% of that fork) + Rubinstein (dxe4 vs 3.Nc3 = 27%)
  added to `repertoire.json`, masters-extended to 22 plies via the live explorer.
- EXCLUDED as sub-cliff sidelines (not padding, §0 ethos #3): St. George, Wing
  Gambit, KIA (2.d3), Franco-Sicilian, 3...c5, Chigorin, the assorted gambits.
- Steinitz (3.Nc3 Nf6 4.e5) IS the repertoire main line = the "Main line" pill.
  Alekhine-Chatard folds into Classical (shared structure, §0.5(c)).
- Amateur freq (1600-2000) for tab order: White's 3rd → Exchange 32% / Advance
  30% / Nc3 21% / Tarrasch 10%. After 3.Nc3 → Nf6 33% / Rubinstein 27% / Winawer 21%.

## Environment note (this sandbox)
ALL endpoints reachable: masters explorer ✓, amateur explorer ✓, game-export ✓.
So gem mining (STEP 6) and model-game sourcing (STEP 7) can run locally here —
not blocked. `BASE_DATA_REVISION` bumped to `2026-05-25-french-variations`.

## Phased plan (Vienna §0.7 STEPs)
- [ ] **STEP 1** — author lessons. Main (`frenchDefence.ts`) + 8 variation
      lessons (`frenchDefenceVariations.ts`), two registers (`say`/`sayShort`),
      lead-the-eye arrows/highlights, orientation `black`.
- [ ] **STEP 2** — register in `registry.ts` (3 imports + 1 OPENINGS line).
- [ ] **STEP 3** — `variationTabs.ts` `CURATED['french-defence']`.
- [ ] **STEP 4** — `frenchDefenceMasterclassTabs.ts` `getFrenchDefenceTabPlanIds`
      + wire into `OpeningDetailPage.tsx`.
- [ ] **STEP 5** — middlegame plans (one per tab) in `middlegame-plans.json`
      (`mp-frenchdefence-<tab>`), then `add-leadeye-to-plans.mjs`.
- [ ] **STEP 6** — punish-gems. Mining needs the amateur explorer → likely
      firewall-blocked in sandbox → **CI runner** (`mine-punish-gems.yml`).
      Then hand-author `punishGemNarration.ts`. *(staged — needs CI)*
- [ ] **STEP 7** — model games (per variation, Black WINNING). Source real PGNs
      from the local pro-games cache or David; add to `model-games.json` +
      PROTECTED list. *(staged — needs sourcing)*
- [ ] **STEP 8** — checkpoint quizzes + common mistakes keyed `french-defence`.
- [ ] **STEP 9** — `opening-manifests.json` floors. (Moves French out of
      "Most Common" into Masterclasses automatically.)

## Gates (must be green before done)
lessonIntegrity, narrationAccuracy, narrationGrounding, lessonDepth,
lessonTabIntegrity, wlppNarration, openingManifests, modelGames-orientation,
punishGems, middlegamePlanner, OpeningDetailPage.wiring, openingWiring.
Then per-opening audits + the interactive loop.

## Definition of done (playbook §0.5)
Not done until it lands on `main` AND the post-deploy audit runs green there.
Web session develops on the branch + draft PR; David merges.

## Decisions log
- 2026-05-25: picked French Defence (rationale above). Autonomous per §0.5.

## Next-session pickup
Resume at the first unchecked STEP. Lessons are the spine — once registered
(STEP 2) the page lights up; plans/gems/models layer on.
