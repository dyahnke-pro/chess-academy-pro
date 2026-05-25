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

## Variations (tabs) — hand-picked, all DB-anchored
Advance · Winawer · Classical · Tarrasch · Exchange · Burn · Fort Knox ·
Advance: Milner-Barry Gambit. Tab order TBD by amateur-explorer frequency
(Classical is the "Main line" showcase pill; the rest sort by frequency).

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
