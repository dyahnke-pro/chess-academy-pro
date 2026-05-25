# PLAN — Sicilian Masterclass Program (2026-05-25)

**STATUS: all 4 Sicilian masterclass CORES shipped on main + walkthrough-audited.**
Remaining: punish-gems (CI-blocked — explorer firewalled), per-variation model games
(Najdorf/Sveshnikov/Alapin), and the Dragon's deferred Dragadorf tab (needs CI theory).

David: *"build out all Sicilian openings. one master class for each one
(they are all different openings). be thorough."* Build a full masterclass per
Sicilian, to the LOCKED Vienna keystone standard (`docs/opening-masterclass-playbook.md`).

> Supersedes the abandoned Queen's Gambit plan (QG is being built in another
> session — do NOT build it here). The `_qg-spines.mjs` orphan is removed.

## The set (the 4 Sicilians in `repertoire.json` — G3: the DB is canon, don't invent more)
| Opening id | Color | Vars | Notes |
|---|---|---|---|
| `sicilian-dragon` | black | 8 | Cleanest teaching Sicilian: …g6/Bg7 fianchetto, Yugoslav Attack opposite-side storms, weapon-rich. **Build FIRST.** |
| `sicilian-najdorf` | black | 9 | The pillar; deepest theory (English Attack, …e5/…e6, Poisoned Pawn, Bg5). |
| `sicilian-sveshnikov` | black | 8 | Structurally distinctive (…e5, the d5 hole, …f5 lever). |
| `sicilian-alapin` | black | 8 | Anti-Sicilian (White 2.c3); student = Black. Most tractable, least theory. |

All BLACK-oriented (student plays Black; lessons `orientation: 'black'`, gated by
a black-orientation test like `pircIntegrity`). MODERN openings → no pre-1930s
book corpus; ground on DB moves (G3) + universal principles + consensus
understanding, board-truth-gated (CLAUDE.md modern-opening note).

## Environment (this session)
- **ONLY GitHub reachable** — live explorer / proxy firewalled → gem mining +
  deep-theory extension on a **GitHub Actions runner**.
- **Stockfish** `/usr/games/stockfish` (offline soundness + spine extension).
- **Local masters-db** (`public/data/openings-masters-db.json`, 4-field-FEN keyed,
  frequency-sorted) = spine source; thins at depth → Stockfish-extend.
- **Pro-games cache** `docs/audit-runs/2026-05-19-pro-games-gen/raw-fetched.json`.
- Tab order = amateur frequency (explorer firewalled → masters-db proxy, flagged).

## Proven pipeline (validated on the QG main line before pivot)
1. Walk DB spines from masters-db (steered to canonical lines, every move
   game-counted) → Stockfish-extend to ≥20 plies (balanced evals).
2. Author `scripts/_<sic>-content.json` (two-register beats: `say` full Watch
   + `sayShort` ≤8-word Learn cue; lead-the-eye arrows GREEN / highlights YELLOW).
3. Validate with `scripts/_check-beats.mjs` (mirrors lessonIntegrity /
   narrationAccuracy / narrationGrounding / lessonDepth / wlpp / anchor).
4. Generate `.ts` via `_gen-<sic>.mjs` (adapt `_gen-scotch.mjs`).
5. Wire: registry.ts, variationTabs CURATED, masterclassTabs, OpeningDetailPage.
6. Plans (+ lead-the-eye), gems (CI), model games (pro-cache/CI), manifest, quizzes.
7. Gates green (`ship-check`) + per-opening audits (walkthrough, punish-gems 3-pass,
   leadeye, named-traps). DONE = on `main` + post-deploy audit green (§0.5).

## Phased plan (per opening; build sequentially)
- **DRAGON** … _CORE COMPLETE on main + audit-green (lessons + plans + model game)._
  - ✅ P1 lessons (main pill + 6 variation tabs), ✅ P2 wiring, ✅ P3 plans (7, lead-the-eye),
    ✅ P5 model game (Dubov Black win, 2 criticalMoments). Walkthrough audit: 7 distinct tabs,
    model-game present, 0 page errors.
  - ⏳ **P4 gems — CI-BLOCKED** (explorer firewalled in-sandbox; `curl` confirmed "Host not in
    allowlist"). Seed added to `mine-punish-gems.mjs`; run `mine-punish-gems` workflow_dispatch
    with `openings=sicilian-dragon` → PR → pull + hand-author `punishGemNarration.ts`.
  - ⏸ **Dragadorf tab deferred** — needs sound theory deeper than the local masters-db (naive
    line −1.5 for Black). Source via CI explorer, then add the 7th variation tab.
- **NAJDORF** … _LESSONS + PLANS COMPLETE on main + audit-green (9 distinct tabs, 0 errors)._
  - ⏳ model game + gems (CI) still to come.
- **SVESHNIKOV** … _P0 spines walked; distinctness decision locked._
  - All 8 repertoire entries walked to ≥20 plies. BUT five (Main 9.Nd5, Chelyabinsk c4,
    Novosibirsk, 11.c4, Rb8) share the SAME 20-ply prefix and diverge only at plies 21-24 —
    sub-plans of one line, not distinct openings.
  - **Distinct tab set (playbook §0.5c — shared-structure sub-lines fold in):** Main 9.Nd5
    (c3) pill + **9.Bxf6** (doubled f-pawns, distinct structure), **Chelyabinsk c4** (the bind;
    absorbs 11.c4), **Anti-Sveshnikov 6.Nf3** (quiet retreat), **Kalashnikov** (sister move
    order). Novosibirsk (…Bg5 timing) and …Rb8 fold into the main line + its plans. This is
    distinctness-folding, NOT dropping sound lines — manifest variations floor stays 8.
  - _(old DRAGON P0 detail retained below for reference)_
  - All 8 tabs reach ≥20 plies (masters-anchored + Stockfish-extend):
    - Yugoslav Main (pill) 22 · Soltis 24 · Chinese Dragon 22 · Classical 22 · Dragadorf 20 (all deeply masters-anchored)
    - Levenfish / Accelerated / Anti-Dragon Bg5 → Stockfish-extended tail.
  - **Spine fixes (done):** Levenfish re-steered to Black's `6...Nbd7` antidote → equal (`…Qc7 …Bg7 …O-O …Nc5`, eval ≈0). Accelerated = Maroczy Bind (White ~+0.5, honest; teach Black's …f5/…b5/…a5 counterplay).
  - **🚩 DRAGADORF DEFERRED** — the naive `…a6 …b5` then `h4` line evals **−1.5 for Black** at depth 16 and the masters-db is too thin to walk the sound move order. NOT shipping an unsound "Black is great" line. Source the real theory via CI explorer (deeper) before adding this tab. Until then the Dragon ships with the main pill + **6 vetted variation tabs**: Soltis, Chinese Dragon, Classical, Levenfish, Accelerated, Anti-Dragon Bg5.
- NAJDORF … pending
- SVESHNIKOV … pending
- ALAPIN … pending

(Each opening = P0 spines → P1 lessons → P2 wire → P3 plans → P4 gems(CI) →
P5 model games → P6 manifest/quizzes → P7 gates+audits → land on main.)

## Decisions log
- 2026-05-25 — Program = 4 Sicilians (the repertoire set). Build order: Dragon →
  Najdorf → Sveshnikov → Alapin (cleanest-teaching first, anti-Sicilian last).
- 2026-05-25 — QG abandoned (owned by another session); QG planning docs retired.
- 2026-05-25 — **ALL FOUR ARE BLACK (David).** Student is a Black Sicilian player;
  every lesson `orientation: 'black'`, taught from Black's side. The Alapin stays
  in the set but as "how BLACK meets White's 2.c3" (the anti-Sicilian chapter) —
  NOT a White opening. Build one fully at a time, stay focused.

## Next-session pickup
Start the Dragon: walk its spines (`1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6`
→ Yugoslav Attack `6.Be3 Bg7 7.f3 O-O 8.Qd2 Nc6 9.Bc4 …` and the Classical/other
tabs) from masters-db + Stockfish-extend, BLACK-oriented. Then author
`_dragon-content.json`. Reuse the QG/Scotch pipeline scripts.
