# Gambit Tab → Masterclass Standard (SEPARATE LANE)

**Decision (David, 2026-05-27):** Build all **12 gambit-tab openings**
(`gambits.json`, `isGambit:true`) to masterclass standard, **fully SEPARATE
from the masterclass line.** Keep them in the gambit tab; do NOT move them; do
NOT entangle them with the masterclass content the parallel session owns.

This plan is the coordination boundary + the build recipe. A parallel session
is actively building **masterclass structures** (registry, manifests,
`punish-gems.json`, `middlegame-plans.json`, two-knights, queens-gambit, the
miner gate). This lane must not collide.

## The separation contract (non-negotiable)

1. **Key ALL gambit content under the gambit-tab ids** — never the masterclass
   ids. e.g. `gambit-evans-gambit` (NOT `evans-gambit`), `scotch-gambit` (NOT
   `scotch-game`), `vienna-gambit` (NOT `vienna-game`), `gambit-budapest-gambit`
   (NOT `budapest-gambit`).
2. **Home gambit data in NEW gambit-scoped files**, never the masterclass ones:
   - `src/data/gambit-punish-gems.json` (NOT `punish-gems.json`)
   - `src/data/gambit-plans.json` (NOT `middlegame-plans.json`)
   - `src/data/gambit-model-games.json`, `src/data/gambit-common-mistakes.json`
   - `src/data/lessons/gambits/` + a `gambitLessonRegistry.ts` SEPARATE from
     `lessons/registry.ts` (so `ALL_LESSONS` / `FIRST_CLASS_OPENING_IDS` /
     `opening-manifests.json` are untouched → gambits never leak into the
     Masterclasses tab; they stay `isGambit` in the gambit tab).
3. **Do NOT touch** (the parallel session's files): `punish-gems.json`,
   `middlegame-plans.json`, `opening-manifests.json`, `repertoire.json`,
   `lessons/registry.ts`, `lessons/index.ts`, the masterclass `*Tabs.ts`.
4. **Only sanctioned shared touches:** (a) `OpeningDetailPage.tsx` — ONE
   additive `if (opening.isGambit)` branch that resolves content from the
   gambit-scoped files; (b) `scripts/mine-punish-gems.mjs` — read-only use of
   the tool (seed under gambit ids); (c) `dataLoader.ts` — one loader for the
   gambit data files; (d) docs. Keep each additive + isolated to minimise
   conflict; rebase often.

## ID fix

`albin-countergambit` is BOTH a gambit-tab id AND a masterclass id (collision).
Give the gambit-tab entry a unique id `gambit-albin-countergambit` in
`gambits.json` (+ bump `BASE_DATA_REVISION` so seeded devices reconcile). All
other 11 ids are already distinct.

## The 12 openings (from the 2026-05-26 audit)

White: King's, Evans, Scotch, Vienna, Danish, Smith-Morra.
Black: Stafford, Marshall, Englund, Budapest, Albin, Benko.

Tiers (drives effort, NOT content reuse — everything is authored fresh under
gambit ids):
- **Has gambits.json content already** (overview, 4 key ideas, 3–5 variations
  w/ explanations, trap/warning tiles): all 12. Sources present on 6 (King's,
  Evans, Scotch, Vienna, Marshall, Benko), absent on 6 (Danish, Smith-Morra,
  Stafford, Englund, Budapest, Albin).
- The WHITE attacking gambits (King's, Evans, Scotch, Vienna, Danish,
  Smith-Morra) suit engine-extension + gem mining well (best-play = the attack).
  The positional/practical ones (Benko, Blumenfeld-style) need the AMATEUR DB
  for honest plan grounding (the engine under-rates their comp).

## Per-opening build (gambit-scoped adaptation of the Vienna recipe)

For each gambit id, author and home in the gambit-scoped files:
1. **Main beat-lesson** (WLPP, two registers: `say` full + `sayShort` cue),
   `orientation` = the gambit's color. DB-anchored spine (≥6 plies, G3) +
   Stockfish/amateur extension to the plan payoff. Lead-the-eye arrows.
2. **Variation lessons** — one per real, faced, distinct sub-line (no count cap;
   §0.5 criteria). Keyed `<gambit-id>::<Variation Name>`.
3. **Deep middlegame plan(s)** — real line into the gambit's characteristic
   structure, two-register narration, lead-the-eye (`add-leadeye` algorithm).
4. **Punish-gems** — mine under the gambit id (seed from `gambits.json` pgn),
   token path + the masters-baseline gate. **Per-gem Google/theory verify +
   hand-authored watch/learn before it surfaces — never bulk-ship.**
5. **Named traps** — real, hand-authored beat-lessons, weapon/warning by who
   punishes. (Lasker Trap → Albin; Kieninger Trap → Budapest; etc.)
6. **Common mistakes / pitfalls** — WLPP antidote lines, two registers.
7. **Model games** — REAL student-side WINS (local pro-game cache
   `docs/audit-runs/2026-05-19-pro-games-gen/raw-fetched.json` + curate scripts,
   or token export), hand-authored overview. Win only; empty > losing/draw.
8. **Sources** on every authored narration unit (book corpus / reputable URL).

## Wiring

`OpeningDetailPage.tsx`: a single `gambitContentResolver(opening.id)` that, when
`opening.isGambit`, returns `{ lesson, variationLessons, plans, gems, traps,
mistakes, modelGames }` from the gambit-scoped sources — mirroring the
masterclass resolver's SHAPE so the existing WLPP players / sections render
unchanged. Sections self-hide on empty (inherited). No manifest entry → stays in
the gambit tab only.

## Gates (gambit-scoped)

New gambit test suite mirroring the masterclass gates over the gambit files:
legality, two-register coverage, narration board-truth, lead-the-eye grounding,
DB-anchor, model-game orientation (win-only), gem tier/legality, sources. Add to
`ship-check`. Do NOT extend the masterclass gates' arrays (keep separate).

## Mining (under gambit ids)

Seed the miner from `gambits.json` pgn (color → studentChar). Run:
`LICHESS=<token> NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
OPENINGS=<gambit-id> node scripts/mine-punish-gems.mjs` — but write to
`gambit-punish-gems.json` (add a `--out` / `GEM_OUT` option so the miner doesn't
touch the masterclass `punish-gems.json`). Gate is necessary-not-sufficient;
per-gem verify mandatory.

## Build order

1. ID fix (`gambit-albin-countergambit`) + the gambit-scoped data files +
   loader + the `OpeningDetailPage` gambit resolver + the gate harness (the
   plumbing — once, opening-agnostic).
2. **Template opening end-to-end: King's Gambit** (`gambit-kings-gambit`) — the
   gambit-tab "keystone" (white, tactical, rich gems/traps, book-groundable).
   Prove every section + gate + audit.
3. Then the rest, white attacking gambits first (Evans, Scotch, Vienna, Danish,
   Smith-Morra), then black (Benko, Budapest, Albin, Stafford, Englund,
   Marshall). All validated lines, no count caps.

## Deploy / done

Push to `main` (gambit data + the additive wiring) batched at completion of each
opening; gates green via `ship-check`; per-opening interactive audit. Rebase on
`origin/main` before each push (parallel session active). Done = on `main` +
audited (G1) + audit-stream pulled (G2).

## Next-session pickup

Start at Build-order step 1 (plumbing) if not done; else the next opening in the
order. Token for mining is in chat history (rotate per David). Coordinate file
touches with the masterclass-structures session via `main` rebases.
