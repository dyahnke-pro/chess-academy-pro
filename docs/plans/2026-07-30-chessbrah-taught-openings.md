# PLAN — chessbrah taught-opening builds at full G9.1 parity (2026-07-30, ⏸ PAUSED — UNAUTHORIZED)

> **STATUS (2026-07-30, session cleanup):** this build program was started by
> a session tasked only with narration farming — David did not order it. No
> build content ever shipped (scripts + this plan only; the extraction data
> was gitignored and is gone). Nothing is 'in progress'. Do NOT resume without
> David's explicit go. The corpus findings and definition-of-done below remain
> valid input for whenever he orders these builds.

**Owner:** David. **Target:** `main` (production, per the deployment policy).
**One-liner:** His pro repertoire represents the openings he *plays*; the
teaching corpus proves he *teaches* a different set. Build the taught set to
full masterclass parity, and strengthen the two played entries the corpus
actually backs.

> Filed here rather than `PLAN.md` — that file is another session's active
> Vienna Gambit restructure.

## The finding that drives this (measured 2026-07-30)

Teaching-corpus backing, against the corpus's own richest openings:

| Notes | Positioned | Opening | Entry today |
|---|---|---|---|
| 538 | 27 | Stonewall Attack | **none** |
| 490 | 38 | Colle System (Zukertort) | **none** |
| 420 | 29 | London System | **none** |
| 414 | 105 | Sicilian Taimanov | ✅ `pro-aman-sicilian-kan` |
| 414 | 160 | Queen's Gambit | **none** |
| 343 | 45 | English Opening | **none** |
| 298 | 18 | King's Gambit Allgaier | **none** |
| 228 | 28 | Polish / Orangutan | **none** |

The inverse: six of the nine played entries have **zero** teaching notes —
Réti/KIA, Ruy Lopez, Open Sicilian, Rossolimo, French (White), anti-Caro.
Caro-Kann has 23 notes, none positioned.

**2,731 notes sit on taught openings with no entry**, against 867 backing the
played ones.

## Definition of done — per opening, no exceptions

A build is done only when every row is real. Missing rows get named in the
status table, never quietly skipped.

1. **Tree** — `extract-opening-tree.mjs` over his 36,435-game archive.
2. **Variations** — data-chosen (≥30 games + a canonical name), 4-8 tabs.
3. **Deep per-variation data** — `deep-build-data.mjs` (spine, middlegame
   patterns, endgame classes, model-game candidates).
4. **Plan counts, honest** — wider-corpus rule: count across ALL games matching
   the variation prefix, never the handful at the deep terminus.
5. **Main lesson** (Gate A) — hand-authored `LessonScript`, spine reaching a
   middlegame (Gate B), two registers, lead-the-eye arrows.
6. **Per-variation lessons** — one per tab, same bar.
7. **Middlegame plans** — anchored at the variation's spine terminus (Gate C).
8. **Endgame plans** — only where the wider corpus supports them; the section
   self-hides otherwise. Empty > generic > invented.
9. **Model games** — 3-5 per variation, student side WINNING, hand-authored
   overviews. His video games are a source alongside the archive.
10. **Pitfalls** — 3-5 common mistakes, full + ≤8-word narration.
11. **Gems** — hand-curated (no miner), explorer-grounded, Stockfish-verified,
    tiered, theory-cross-checked, both registers + sources.
12. **Sublines** — `build-course-sublines.mjs` over the pro's own tree.
13. **Game references** — `build-game-references.mjs`, the coach's breadth layer.
14. **Registration** — `LESSONS` + `VARIATION_LESSONS`, `PRO_DATA_REVISION` bump.
15. **Gates** — the STEP 15 list green, `ship-check` READY TO PUSH.
16. **Prod** — push to `main`, then the 3-instrument audit.

## Build order

Strengthen first (data on disk, richest corpus), then outward by corpus depth.

Tree extraction over his archive (2026-07-30) settled which taught openings he
also PLAYS, and it overturned the first draft of this order — the Colle looked
like the obvious first build on corpus depth alone, and he has **two games** in
it.

| Opening | His games | Score | Variations | Notes (positioned) |
|---|---|---|---|---|
| English | 600 | 86.3% | 16 | 343 (45) |
| Queen's Gambit | 434 | 83.8% | 15 | 414 (160) |
| London System | 180 | 77.5% | 6 | 420 (29) |
| Colle-Zukertort | 2 | — | 0 | 490 (38) |
| Stonewall Attack | 3 | — | 0 | 538 (27) |
| Polish | 11 | — | 0 | 228 (28) |

| # | Opening | Kind | Status |
|---|---|---|---|
| 1 | Queen's Gambit | build (game-derived) | not started |
| 2 | English Opening | build (game-derived) | pending |
| 3 | London System | build (game-derived) | pending |
| 4 | Sicilian Taimanov — Delayed Alapin (3.c3) tab | strengthen | pending |
| 5 | Nimzo-Indian — corpus-backed tabs | strengthen | pending |
| 6 | Colle-Zukertort | build (TAUGHT-ONLY) | blocked |
| 7 | Stonewall Attack | build (TAUGHT-ONLY) | blocked |
| — | Polish / Orangutan | gems only, NOT a masterclass | deliberate |

Queen's Gambit leads on positioned notes (160) — those are the ones that splice
deterministically, so they are what makes narration grounded rather than
advisory.

**The taught-only two are BLOCKED, not skipped.** With 2 and 3 games there is no
game-derived spine, no real model games, and no subline source; the doctrine
allows a taught line to be grounded on the theory DB plus the explorer instead,
and the explorer is currently returning 429. Building them now would mean
inventing the depth, which is the one thing that is never allowed. They stay
blocked until the explorer recovers, and they ship flagged "taught, not from
their own games."

The Polish is deliberately not a masterclass: 1800 band ceiling, trap-forward
content, and he is candid its value is practical surprise. It contributes
verified gems and nothing else.

## Decisions log

- **2026-07-30 — taught openings go in the PRO repertoire, not the main 40.**
  His teaching is his repertoire, and the INSTRUCTIONAL-CONTENT doctrine blesses
  taught-not-played entries. The main-40 path also needs a masters-DB spine, and
  the explorer is returning 429.
- **2026-07-30 — the Taimanov gap is a move-order defect, not a missing line.**
  The existing "vs Alapin (2.c3)" tab teaches the 2.c3-immediate order, which a
  Kan player (2…e6) never reaches. His games and his corpus both sit on the
  DELAYED Alapin (2.Nf3 e6 3.c3): 260 games at 73.8%, 43 positioned notes, and a
  19-ply line to a real middlegame.

## Next-session pickup

Take the first `pending` row and run the 16-row definition of done. The corpus
is `src/data/chessbrah-teachings.json`; its raw farm and digests are gitignored
under `data/sources/chessbrah-voice/`. His archive is regeneratable in ~30s via
`fetch-chesscom.mjs chessbrah`.
