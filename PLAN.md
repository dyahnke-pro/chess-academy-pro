# PLAN — Pirc Defence masterclass (David 2026-05-21)

The Ruy masterclass + the "money" weakness-loop build are DONE and
archived at `docs/plans/2026-05-21-ruy-masterclass-and-money.md`. This
plan covers the **second opening**: the Pirc Defence, built to the SAME
structure as the Ruy, following `docs/opening-masterclass-playbook.md`.

## Ground rules (non-negotiable)
- **Student plays BLACK.** The Pirc is Black's defence (`color: black`).
  Every lesson orients **black-at-bottom** (`orientation: 'black'`).
  Key ideas are BLACK's plans; narration speaks from Black's side
  ("your Bg7", "meet White's f4 with …c5").
- **G3 — no invented moves.** Every line comes from
  `openings-lichess.json` or the already-curated `repertoire.json`
  `pirc-defence` entry (8 variations, full DB-grounded pgns + key ideas
  + explanations). chess.js verifies legality. The LLM writes prose only.
- **Hand-pick everything. No algos.** Curator chooses tabs, plans, traps,
  routing. Code only filters by the hand-picked lists.
- **Narration quality is the headline** (David's emphasis). Board-
  accurate (the `narrationAccuracy` gate enforces square-piece claims),
  keystone-focused, plain English, no SAN-as-letters, no first person.

## Data already in place (repertoire.json `pirc-defence`)
- color: black; 4 top-level key ideas; overview (hypermodern story:
  Spassky/Topalov/Anand; let White build the centre, then strike).
- 8 variations, each with a full DB-grounded pgn + explanation + ideas:
  Austrian Attack · Classical System · 150 Attack · Byrne Variation ·
  Lion Variation · Fianchetto System · Czech Defence · Austrian Attack
  with e5 c5. → Variation tabs AUTO-BUILD from these (wiring is opening-
  agnostic; "other openings auto-list all their variations").

## Per-variation checklist (parallel to Ruy)
For each first-class variation: 4 key ideas (have) · overview (have) ·
a DB-grounded middlegame plan `mp-pircdefence-<label>` (TODO, builder
script) · a Black-oriented Watch/Learn beat-lesson (TODO — the work) ·
an endgame ONLY if genuine · real named traps ONLY if genuine.

## Phased build
- **P0 — this plan + archive Ruy plan. status: DONE.**
- **P1 — main-line + first variation beat-lessons. status: DONE.**
  `pircDefence.ts` (PIRC_DEFENCE_LESSON) + `pircVariations.ts` (Austrian,
  Classical, 150). Wired into `index.ts`. `pircIntegrity.test.ts`
  (orientation `black`) + `narrationAccuracy` extended.
- **P2 — remaining variation lessons. status: DONE.** Byrne, Lion,
  Fianchetto, Czech, Austrian-e5-c5. ALL 8 variations + main line now
  have authored, DB-grounded, Black-oriented beat-lessons. Lesson keys
  verified to match repertoire.json variation names exactly (Watch/Learn
  resolve). 49 integrity + 130 narration-accuracy tests green.
- **P3 — middlegame plans. status: DONE for ALL 8 variations.**
  `scripts/add-pirc-middlegame-plans.mjs` builds austrian / classical /
  150 / byrne / lion / fianchetto / czech / austrian-e5 (DB-grounded from
  the gate-verified lesson lines). Routing `pircMasterclassTabs.ts`
  (getPircTabPlanIds, all 8). middlegamePlanner.test extended (33 green:
  every line legal, annotations 1:1, arrows consistent, black-oriented).
- **P4 — traps / endgames. status: DELIBERATELY SPARSE (accurate per
  empty > generic).** The Pirc has few genuine NAMED traps; the old
  auto-mined junk was purged. NOT fabricating to fill the shelf. The one
  genuine motif to author properly later (web-verified, like the Ruy
  traps): the **Ne6 queen-trap** (Bxf7+ Kxf7 Ng5+ … Ne6 forks the queen)
  as a Black WARNING. Endgames: Pirc isn't endgame-defined → none unless
  a genuinely characteristic one surfaces. Book pages: none (corpus is
  pre-1930s; the Pirc postdates it — structural, unavoidable).
- **Model game:** Kasparov–Topalov 1999 (present, 2 criticalMoments).
  CURATION NOTE for David: it's a WHITE brilliancy against the Pirc
  (masterclass is Black-oriented) + thinner than the Ruy's 7 moments —
  his call whether to enrich/swap. Not fabricated around.
- **P5 — audit to 3 clean rounds** (`AUDIT_ONLY_OPENINGS=pirc-defence`):
  in progress.

## Orientation gotcha
`lessonIntegrity.test.ts` asserts `orientation === 'white'` for the RUY
lessons array — do NOT add Pirc lessons there. Pirc gets its own
`pircIntegrity.test.ts` asserting `orientation === 'black'`. The
`narrationAccuracy` grounding check is colour-agnostic — safe to extend.

## Next-session pickup
1. Finish P1 lessons (verify each beat via chess.js; run pirc integrity +
   narration-accuracy tests).
2. Then P2 → P5 in order. Reuse Ruy builders/patterns; never reinvent.
3. Never fabricate moves (G3) — repertoire.json + openings-lichess.json.
