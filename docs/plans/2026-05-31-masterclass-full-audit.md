# Masterclass Tab — Full Linear Audit (2026-05-31)

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
