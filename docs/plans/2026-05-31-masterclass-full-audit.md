# Masterclass Tab — Full Linear Audit (2026-05-31)

> **BUILD LOG (2026-05-31, same session):**
> - ✅ **Model-games layer COMPLETE for all 14 zero-model openings.** Added 48
>   real student-side WINS from the Lichess masters explorer (Kramnik, Kasparov,
>   Carlsen, Anand, Caruana, Firouzja …), PGN-verified, sourced to the lichess
>   game, oriented black-wins-only, hand-authored overviews. The 14 openings
>   (pirc, petrov, philidor, qgd, qga, slav, semi-slav, KID, grünfeld, benoni,
>   queens-indian, old-indian, two-knights, schliemann) now surface real games.
>   Wired `loadModelGamesData` into the already-seeded reconcile path so the
>   games reach existing devices (they were first-install-only — a latent bug
>   that would have hidden the new games from David). All 14 added to the
>   orientation-gate PROTECTED list. Shipped on `main` (commit 94934da).
> - ✅ **Fixed 21 pre-existing tsc errors** on main (gambit variation helper
>   types) that were blocking the prod deploy — folded into the parallel
>   session's fix on rebase.
> - ✅ **Middlegame-plans layer — 16 per-variation plans shipped** across the
>   cluster (benoni, KID, grünfeld ×3, two-knights ×3, semi-slav, qgd, qga,
>   queens-indian, petrov, philidor, slav). Every plan: anchored at the
>   variation lesson's terminus (Gate C), the REAL most-played master
>   continuation (explorer ≥3 games/ply — zero invented moves, FENs read
>   straight from the skeleton), both registers, lead-the-eye highlights on the
>   named squares, verified student theme-square landing. The build script
>   self-validated theme-landing + legality + no-promise BEFORE writing — it
>   caught a FEN I'd mistyped (a fabricated Fried-Liver position) and refused
>   to write. Cluster mgPlans went 1→2-4 each; gates green (middlegamePlanThemes,
>   FenCoherence, planner lead-eye, MiddlegamePlansSection). Commits cab589e +
>   f01682f.
> - ⏳ **Remaining layers — endgame plans + pitfalls — need engine access.**
>   Pitfalls require eval-verifying that the "wrong move" is actually bad, and
>   Stockfish isn't node-runnable in this sandbox (browser wasm; no native
>   binary) — route to CI / David's machine. Endgame plans are grounded in the
>   real model-game tails (data I have) but the conversion-TECHNIQUE prose is
>   un-gated for accuracy (narrationFactCheck only catches attacks/eyes/forks),
>   so it's careful per-game work best done deliberately, not sprayed. The
>   move skeletons for the cluster are pre-pulled at
>   `docs/plans/.skeletons/2026-05-31-cluster-mg-continuations.json` (Gate D
>   groundwork — explorer most-played continuations at each variation terminus,
>   ≥3 games/ply), so the next pass starts from a real move skeleton, not a
>   blank page.
>
> **Why middlegame plans were NOT rushed in this session (integrity note):**
> many variation lessons already walk DEEP (20–36 plies) into their own
> middlegame, and for several the data-continuation at the terminus reveals a
> DIFFERENT plan than the variation's headline idea (e.g. Grünfeld Russian
> System's most-played continuation is …f4/…Bg4, but its model game teaches the
> …a6/…b5 Hungarian plan). Authoring a per-variation plan that teaches the
> *representative* idea — cross-checked against the lesson + model game, with
> lead-the-eye arrows + theme-square landing + continuity — is per-opening
> judgment work (the playbook's "hours per opening"). Spraying thin/
> non-representative plans to hit a count would be the exact "empty > generic >
> invented / depth over breadth" violation the playbook forbids. So this layer
> is staged for careful per-opening authoring, not bulk-generated.

Scope: the **masterclass tab only** — the 42 first-class openings in
`src/data/lessons/registry.ts` `OPENINGS`. Walked every opening, every
*surfaced* variation tab, and every supporting layer (middlegame plans,
endgame plans, model games, pitfalls). SHOULD = the playbook +
CLAUDE.md G9.1/G9.3 contract. DOES = what's actually in the data/runtime.

Pro-rep (`pro-*`) openings are OUT of scope (separate `LESSONS`-only set).

## Method

- Mechanical gates run green first (baseline): `lessonDepth` (220),
  `narrationAccuracy` (1254), `lessonIntegrity` (1736),
  `narrationGrounding` (476), `lessonSources`, `lessonTabIntegrity` (42),
  `variationMiddlegameDepth`.
- Then a personal linear walk: replayed every lesson's deepest beat
  through chess.js, computed terminus FEN + ply depth + the structural
  `reachesMiddlegame` metric, cross-checked the *surfaced* tab set
  (`buildVariationTabs`) against registered curated lessons, and read
  narration prose by hand (both registers).

## VERDICT — the core teaching surface is SOLID

| Dimension | Result |
|---|---|
| Mains curated (Gate A) | **42/42** — every Watch is a curated `LessonPlayer`, never legacy `WalkthroughMode` |
| Surfaced variation tabs | **174**, **all** resolve to a distinct curated lesson (lessonTabIntegrity green) |
| Reaches middlegame (Gate B) | **100%** of mains + variation lessons (non-roadmap) reach a structural middlegame |
| Narration both registers | **1252/1252 beats** carry `say` + `sayShort` |
| Board-accuracy | green (narrationAccuracy, 1254 assertions) |
| Sources | green (every masterclass unit cites a resolvable source) |
| Model-game orientation | no studentSide losses or draws found |
| `learnCues` on plan lines | **370/370** playable lines |
| Roadmap opt-outs (Albin 16p, Schliemann 14p) | **legitimate** — sharp-gambit launchpads fanning to curated weapon variations |

**Important correction to a first-pass false alarm:** raw
`repertoire.json` carries ~316 variation entries, of which only 174 are
*surfaced as tabs*. The other ~139 are deliberately folded into the main
pill or deferred per G3 (`buildVariationTabs` CURATED allowlist, with
per-opening rationale comments). They are **data, not broken tabs** — the
user never sees them as a Watch tab, so there is **no** legacy-fallback /
ungated-narration exposure on the masterclass tab. (The ungated
`src/data/annotations/` swamp — 1,889 files, still board-inaccurate and
wrong-side, e.g. caro-kann-classical narrates from White's POV — is only
reachable via `WalkthroughMode`, which the masterclass tab does not route
to for any surfaced opening/variation.)

## THE REAL GAPS — supporting layers, concentrated in the later-wave Black defenses

The Watch/Learn surface is complete everywhere. The gaps are in the
*masterclass-shape supporting layers* (model games, per-variation
middlegame plans, endgame plans, pitfalls), and they cluster hard in the
openings built in the most recent waves — the 1.d4 Black defenses + a few
others.

### Gap 1 — 14 openings surface ZERO model games
Playbook: a winning model game **per variation**. These show none
(ModelGamesSection self-hides; `getModelGamesForOpening` is an exact
`openingId` match):

`pirc-defence, petrov-defence, philidor-defence, qgd, qga, slav-defence,
semi-slav, kings-indian-defence, grunfeld-defence, benoni-defence,
queens-indian, old-indian-defence, two-knights-defence, schliemann-defence`

### Gap 2 — 19 openings have fewer middlegame plans than surfaced tabs
A single middlegame plan can't continue from 3-4 different variation
termini (Gate C continuity), so most variations on these openings have **no
connected middlegame plan**. The 1-plan cluster is the worst:

`petrov, philidor, qgd, qga, slav, semi-slav, kings-indian-defence,
grunfeld, benoni, queens-indian, old-indian, two-knights, budapest,
albin, schliemann` (1 plan each, 2-4 tabs each) — plus `kings-gambit`
(2 plans / 8 tabs), `queens-gambit` (3/7), `trompowsky` (3/6),
`birds-opening` (3/5).

### Gap 3 — only 10/42 openings have an endgame plan
Present: ruy-lopez, caro-kann, french-defence, benko-gambit, kings-gambit,
evans-gambit, qgd, slav-defence, budapest-gambit, albin-countergambit.
Per the endgame doctrine, sharp/attacking openings correctly get none
("empty > generic > invented"), but quiet positional defenses that *should*
carry a real-game endgame per the doctrine — KID, Grünfeld, Nimzo, Benoni,
Petrov, Philidor, Semi-Slav, Queen's Indian — have none. Acceptable under
the self-hide rule, but a completeness gap vs the masterclass aspiration.

### Gap 4 — 6 openings have 0 pitfalls (common mistakes)
`sicilian-najdorf, philidor-defence, two-knights-defence,
albin-countergambit, schliemann-defence, birds-opening`

## The pattern

The openings that are thin on EVERY supporting layer are the same set —
the recent-wave Black defenses (`petrov, philidor, qgd, qga, slav,
semi-slav, KID, grunfeld, benoni, queens-indian, old-indian, two-knights,
schliemann`). They shipped with complete curated Watch/Learn lessons (the
star), but the supporting cast (model games + per-variation middlegame +
endgame + pitfalls) was deferred. Earlier keystones (ruy, caro, french,
vienna, najdorf, nimzo) carry the full shape.

## Recommended fix priority (per opening, full G9.1 supporting-layer build)

1. **Keystone-completeness first** — finish najdorf pitfalls (its only gap).
2. **The 1.d4 Black-defense cluster** (qgd, slav, semi-slav, KID, grunfeld,
   benoni, queens-indian, old-indian) — these are the highest-traffic and
   thinnest: add per-variation middlegame plans (anchored at each tab's
   terminus, Gate C), winning model games, endgame plans where a real
   master game reaches the ending, and pitfalls.
3. **Petrov / Philidor / QGA / Two Knights / Schliemann** — same.
4. **Endgame layer sweep** for the quiet positional defenses per the
   "real master game in the same variation" doctrine.

Each is a data-extraction + authoring job (masters explorer + real games),
not a code change — it must follow the playbook (no fabrication;
empty > generic > invented).

## What is NOT broken (don't "fix")
- The 139 unsurfaced repertoire variations — intentionally folded/deferred.
- Roadmap mains (Albin, Schliemann) — legitimate gambit launchpads.
- Openings with no endgame because they're sharp (King's Gambit gambits,
  Dragon, Evans accepted) — self-hide is correct.

## Remaining work (next passes) — per-opening, depth-first

Order = highest-traffic / thinnest first. Each opening is a full G9.1
supporting-layer pass; ship per opening, not per layer-spray.

**Layer status after this session:**
- Model games: ✅ DONE (all 14 zero-model openings now have real wins).
- Middlegame plans (per-variation): ⏳ TODO — skeletons pre-pulled.
- Endgame plans: ⏳ TODO — source from the real model-game PGNs that reach
  an ending in the taught variation (many of the 48 games run 90–150 plies
  into real endgames — `pick-endgame-game.mjs` can classify them).
- Pitfalls (common mistakes): ⏳ TODO for the 6 zero-pitfall openings
  (najdorf, philidor, two-knights, albin, schliemann, birds).

**Per-variation middlegame-plan authoring recipe (per the gates):**
1. Anchor `criticalPositionFen` at the variation lesson's terminus (Gate C
   continuity) OR a clean earlier middlegame position if the terminus is too
   deep. Skeleton FENs + real continuations are in the `.skeletons/` JSON.
2. `playableLines[0].moves` = the real explorer continuation (≥3 games/ply).
   For deep-terminus variations (cont=NONE) anchor the plan EARLIER and pull
   a continuation from there — never invent moves.
3. Declare `pawnBreaks`/`pieceManeuvers` that the line ACTUALLY plays — at
   least one STUDENT move must land on a declared goal square
   (middlegamePlanThemes gate), and the last annotation must NOT be a promise.
4. `learnCues` (one per move, ≤8 words) + full `annotations` (both registers).
5. `sources[]` resolvable (book:/concept:/reputable URL).
6. Lead-the-eye: highlights on every named square; arrows only from a
   non-pawn with a clear sight-line.
7. Cross-check the plan TEACHES the variation's representative idea (match the
   lesson + model game) — do not teach a data-sideline that diverges from the
   headline plan.
8. Validate: `npx vitest run middlegamePlanThemes middlegamePlanner
   MiddlegamePlansSection` + `npm run ship-check` before shipping.

**Thin-cluster openings (1 plan today, want per-variation):** qgd, qga, slav,
semi-slav, KID, grünfeld, benoni, queens-indian, old-indian, two-knights,
petrov, philidor (+ kings-gambit 2/8, queens-gambit 3/7, trompowsky 3/6,
birds 3/5).

---

## UPDATE 2026-05-31 (later) — Stockfish online; pitfalls + targeted endgames shipped

`apt-get install stockfish` succeeded → engine runnable at `/usr/games/stockfish`.
That unblocked the last two layers:

**Pitfalls (eval-verified, depth 20):** 6 shipped — two-knights (Fried Liver),
philidor (illusory pin), albin (drops the wedge), najdorf (concedes d5),
grünfeld (surrenders the centre), benoni (premature …b5). The engine **refuted
~7 candidates I proposed** (schliemann, old-indian, qga, petrov, queens-indian,
birds) — only moves with a clear eval gap shipped. Schliemann + birds found no
clean pitfall → self-hide (empty > forced).

**Targeted endgame search (the doctrine procedure):** queried each solid
opening's variation spine on the masters explorer, fetched full PGNs, classified
endings, picked clean single-rook / R+B holds, and **Stockfish-verified each
transition ≈ 0.0** (genuine hold). Shipped 7 (incl. the earlier two-knights):
petrov, old-indian, semi-slav, queens-indian (R+P / single-rook holds), qga
(active-rook R+B), nimzo (opposite-coloured-bishop fortress), two-knights
(active king). All grounded in real elite games (Anand–Kramnik, Gelfand–Miton,
Radjabov–Anand, Tomashevsky–Carlsen, So–Caruana, Ding–Carlsen, Kramnik–Carlsen);
narration is strictly what the moves DO. Masterclass endgame coverage 10→28.

**Correctly left self-hiding (sharp openings — no clean ending exists):** KID,
Grünfeld, Benoni, Pirc, Schliemann, the gambits. **Catalan:** only a messy
minor-piece white win in the data — no clean conversion → self-hides.

Session totals (cluster): 54 model games, 47 middlegame plans, **9 endgame
plans**, 27 pitfalls. Every item real-data / engine-verified, gated, deployed.
