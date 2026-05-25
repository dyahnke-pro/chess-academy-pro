# King's Gambit Masterclass — Build Plan

**Started 2026-05-25.** Branch `claude/amazing-cori-ioqeh`. Replicates the
Vienna keystone literally (playbook §0.7). Opening is a White romantic
gambit — the closest sibling to the Vienna, so the template fits near-perfectly.

## Why this opening (the §0.5 pick rationale)
- White, classical → the pre-1930s book corpus actually grounds it (unlike
  modern openings). Higher-quality narration grounding.
- Weapon-rich (Muzio / Allgaier / Kieseritzky / Bishop's Gambit) → ideal for
  the gem weapon section + named-trap arsenal, exactly like the Vienna's pitch.
- Already fully scaffolded in `repertoire.json`: 8 variations w/ PGNs, key
  ideas, overview. **All 8 anchor ≥6 plies in `openings-lichess.json`** (verified
  2026-05-25 — anchors 7–15), so every line is DB-grounded (G3 clean).
- Abundant student-side-winning model games (Anderssen Immortal 1851,
  Spassky–Bronstein 1960, Morphy).

## Tab plan (hand-picked; order = amateur frequency, Main-line pill exempt)
Tabs = the structural families **Black** chooses (what the student faces);
the sacrificial gambits are WHITE weapons → gem section + named-trap lessons,
not tabs (mirrors the Vienna).

| # | Tab | Defining line | Role |
|---|-----|---------------|------|
| pill | **Main line** | KGA Modern 3...d5 (repertoire `pgn`) | showcase |
| 1 | **Classical (3...g5)** | KGA 3.Nf3 g5 4.Bc4 — Black holds the pawn | tab |
| 2 | **Fischer Defense (3...d6)** | KGA 3.Nf3 d6 | tab |
| 3 | **Declined (2...Bc5)** | KGD 2...Bc5 | tab |
| 4 | **Falkbeer (2...d5)** | Falkbeer Counter-Gambit | tab |
| 5 | **Bishop's Gambit (3.Bc4)** | White's 3.Bc4 alternative | tab |

Weapons (gems + named traps): **Muzio**, **Allgaier**, **Kieseritzky** (all
arise in the 3...g5 complex), classified by who plays the punishing move.

> Tab order should be confirmed against the amateur explorer when reachable
> (proxy `chess-academy-pro.vercel.app/api/lichess-explorer?source=lichess`).
> Order above is from known KG amateur frequency; refine if the proxy answers.

## Build steps (Vienna template §0.7) — status
- [x] STEP 0 — scaffold (`scaffold-opening.mjs kings-gambit "King's Gambit" white`) + DB-anchor verify
- [ ] STEP 1a — main lesson `src/data/lessons/kingsGambit.ts` (≥20-ply deepest beat)
- [ ] STEP 1b — variation lessons `kingsGambitVariations.ts` (one per tab, each ≥20 plies)
- [ ] STEP 1c — named-trap lessons `kingsGambitTrapLessons.ts` (Muzio/Allgaier/Kieseritzky)
- [ ] STEP 2 — register in `lessons/registry.ts`
- [ ] STEP 3 — `variationTabs.ts` CURATED['kings-gambit']
- [ ] STEP 4 — `kingsGambitMasterclassTabs.ts` + wire into `OpeningDetailPage`
- [ ] STEP 5 — middlegame plans (one per tab) + `add-leadeye-to-plans.mjs`
- [ ] STEP 6 — punish-gems: mine (CI if proxy blocked) + author `punishGemNarration.ts`
- [ ] STEP 7 — model games (REAL PGNs, White winning) + PROTECTED list
- [ ] STEP 8 — checkpoint quizzes + common mistakes
- [ ] STEP 9 — manifest entry `opening-manifests.json`
- [ ] GATES — ship-check green (lessonIntegrity, narrationAccuracy, lessonDepth,
      wlppNarration, openingManifests, openingWiring, modelGames-orientation,
      punishGems, middlegamePlanner, OpeningDetailPage.wiring)
- [ ] AUDITS — `AUDIT_OPENING=kings-gambit` punish-gems-loop (3-pass), leadeye,
      named-traps, opening-walkthrough
- [ ] DONE — merged to main + post-deploy audit green (playbook §0.5 DoD)

## Decisions log
- 2026-05-25: Picked King's Gambit (rationale above). Tabs = 5 + Main pill;
  gambits routed as weapons not tabs.

## Next-session pickup
Resume at the first unchecked STEP. The Vienna files are the literal template:
`vienna.ts`, `viennaVariations.ts`, `viennaTrapLessons.ts`,
`viennaMasterclassTabs.ts`, plus the Vienna rows in `registry.ts`,
`variationTabs.ts`, `middlegame-plans.json`, `punishGemNarration.ts`,
`model-games.json`, `opening-manifests.json`. Diff against them at each step.
