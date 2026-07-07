# Anti-openings → masterclass parity (24 openings) — 2026-07-07

**Owner decision (David 2026-07-07): FULL DEPTH, ALL 24, starting now.**
The Counter-Weapons tab (`/openings` → Counter) now surfaces the 24 White
anti-opening repertoires. They currently render via the bare repertoire
treatment — variations + sublines only, **no curated lesson (Watch falls to the
legacy hallucination-prone `WalkthroughMode`), no gems, no plans, no model
games, no pitfalls, no overview/keyIdeas.** This plan takes every one to the
same bar as the Masterclasses tab, per the LOCKED G9.1/G9.2/G9.3 doctrine.

Multi-session build. This doc is the durable tracker — update the status table +
tick the per-opening checklist as work lands. Do NOT let it rot.

## The bar (what "match the opening tab" means — §G9.1/§G9.3)
Each opening ends with ALL of:
- **Gate A** — a registered hand-authored `LessonScript` (main line) so Watch
  uses `LessonPlayer`, NEVER `WalkthroughMode`. Per-variation lessons too.
- **Gate B** — main `pgn` + every variation `pgn` REACH a middlegame (the
  current 4–7 ply spines MUST be extended from the masters DB).
- **Gate C** — each middlegame-plan `criticalPositionFen` continues the opening
  spine's terminus (one continuous line).
- **Gate D** — build ORDER: extend spine → anchor plans → THEN narrate.
- Two registers per beat (`say` full + `sayShort` ≤8w), board-verified
  (narrationAccuracy), lead-the-eye arrows/highlights, `sources[]` resolvable.
- Weapons: hand-curated + Stockfish-verified punish-gems / named traps (bots
  retired 2026-06-01 — hand-find, engine-verify).
- Middlegame plans from wider-corpus data (≥10% frequency).
- Model games: real, **White-winning** (student side), hand-authored overview.
- Pitfalls (common-mistakes) 3–5 per opening.
- Overview + 4 keyIdeas, grounded (translation-not-invention).
- Naroditsky house voice (the app's single narration register).

## Spine source (the ONE architectural difference)
Anti-openings are White repertoires vs a named defense. Spine = the masters
explorer / `public/data/openings-masters-db.json` most-played continuation from
the repertoire's identifying prefix (same as the masterclass rebuild doctrine —
`scripts/build-opening-spine.mjs <id> "<seed>"`), walked to a middlegame. Every
move DB-anchored + chess.js-legal (G3).

## Per-opening pipeline (adapts §G9.2)
1. Extend the main spine + each variation to a middlegame (build-opening-spine).
2. Identify the real variation tabs from the data branches.
3. Overview + 4 keyIdeas (grounded; cite sources).
4. Author the main `LessonScript` (`src/data/lessons/anti<Name>.ts`).
5. Per-variation lessons (`anti<Name>Variations.ts`), keyed `${id}::${varName}`.
6. Register both in `src/data/lessons/index.ts`.
7. Middlegame plans (`middlegame-plans.json`) anchored at the spine terminus.
8. Model games (`model-games.json`) — real White wins, hand overview.
9. Pitfalls (`common-mistakes.json`) 3–5.
10. Weapons: hand-find gems, Stockfish-verify, narrate (or named traps).
11. Update `anti-openings.json` entry (overview/keyIdeas/traps/variations pgns
    extended).
12. Bump the anti-openings revision in `dataLoader.ts`; reconciler deletes
    orphans (G8).
13. Gates: the §G9.2 STEP-15 vitest list + `npm run ship-check` → READY TO PUSH.
14. Ship to main (batched), 3-instrument prod audit for `/openings/<id>`.

## Priority order (highest-traffic defenses first)
1. `anti-sicilian-rossolimo` (Bb5 vs Sicilian) ← STARTING
2. `anti-caro-fantasy` (3.f3 vs Caro — subline already repaired)
3. `anti-french-advance` (3.e5 vs French)
4. `anti-pirc-austrian` (Austrian Attack)
5. `anti-modern-150` (150 Attack vs the Modern)
6. `anti-scandinavian`
7. `anti-alekhine-modern`
8. `anti-benoni-push` · `anti-alapin-black` · then the remaining Black anti-lines
   (`anti-london-black`, `anti-catalan-black`, `anti-smith-morra-black`,
   `anti-grand-prix-black`, `anti-kings-gambit-black`, `anti-colle-black`,
   `anti-trompowsky-black`, `anti-budapest`, `anti-qgd-exchange`,
   `anti-qid-fianchetto`, `anti-nimzo-qc2`, `anti-grunfeld-exchange`,
   `anti-kid-saemisch`, `anti-dutch-staunton`, `anti-englund`).

## Status table (tick as they land)
| # | opening | spine | lesson | gems | plans | models | pitfalls | shipped |
|---|---------|-------|--------|------|-------|--------|----------|---------|
| 1 | anti-sicilian-rossolimo | ✅ main+3var | ✅ main (gate-green) | | | | | main lesson |
| 2 | anti-caro-fantasy | | | | | | | |
| 3–24 | (rest per priority) | | | | | | | |

**Opening #1 progress (anti-sicilian-rossolimo):** main-line Watch `LessonScript`
authored (`antiSicilianRossolimo.ts`, 6 beats to move 15) + registered — Watch
now uses `LessonPlayer` (Gate A) on the DB-grounded middlegame-reaching spine
(Gate B). Passes lessonIntegrity + narrationAccuracy + lessonSources + lessonDepth
+ wlppNarration. STILL TODO for #1: per-variation lessons (e6/d6/Nf6 tabs),
gems, middlegame plans, model games (White wins), pitfalls, overview/keyIdeas,
extend the variation pgns in anti-openings.json.

## Already shipped this session (context)
- 20 fabricated sublines re-extended + false narration removed (main `f6ae844`).
- Academy opening-courses removed; Counter-Weapons tab added; wisdom/book
  de-dup; `/academy` = books/library (main `f6ae844`, `bebc00c`).

## Next-session pickup
Start at the first opening without all boxes ticked. Follow the per-opening
pipeline. Read `docs/opening-masterclass-playbook.md` +
`docs/pro-rep-efficient-build-recipe.md` first. Data first — never author from
memory. Empty > generic > invented. Anti-opening data lives in
`anti-openings.json` + `course-sublines.json`; spine extends from the masters DB.
