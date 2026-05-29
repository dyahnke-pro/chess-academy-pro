# PLAN — GothamChess (Levy Rozman) pro-rep deep build (2026-05-29)

> Prior plan archived → `docs/plans/2026-05-27-weakness-engine-plan.md`.
> Procedure of record: `docs/plans/2026-05-28-pro-rep-deep-build-doctrine.md`
> (read §0 vocabulary lock + §1 no-fabrication first). Reference build:
> Naroditsky Alapin. **Quality bar name = G9.1 deep build** (never the M-word).

David's task: build out GothamChess's pro-rep. Existing 18 entries are a
SHELL — `pro-repertoires.json` rows + trees + 16 model games + 18 plans, but
NO `gothamchess-deep/`, NO `gothamchess-voice/`, NO variation `LessonScript`s,
NO tab-plan routing. The voice/depth layer is the missing ~90%.

## Locked decisions (David, 2026-05-29)
- **D1. (REVISED) Filter PURE trolls only; KEEP his taught New-York-Style systems.**
  The Chessly "E4 New York Style" course revealed the **a3 Sicilian (864g, his
  #1 anti-Sicilian)**, **b3 Sicilian**, and **b3 French** are FEATURED course
  chapters — his signature aggressive repertoire, NOT memes. RE-INCLUDED as real
  openings (need extraction). Still DROPPED: 1.Na3 (373g), bongcloud, pure
  troll speedruns with no course chapter. The pure 1.b3 Larsen as a first move
  is ambiguous — his b3 is taught vs Sicilian/French specifically; a standalone
  1.b3 system only if a course chapter backs it.
- **D2. Modern Defense (1,066g) + Dutch Defense (814g) as Black ADDED** to scope
  (not yet extracted — need OPENINGS-map entries + trees).
- **D3. Build order = most-popular-on-down** (see ranked list).
- **D4. Two-pass build** (doctrine STEP 6, locked 2026-05-29): Pass A ships
  skeletons with `TODO` narration placeholders; Pass B is voice-only, grounded
  in his actual teaching notes. **No narration authored in Pass A.**
- **D5. Player id = `gothamchess`; chess.com username = `GothamChess`.**
  Corpus on disk: 31,994 games / 109 months at `data/sources/gothamchess-chesscom/`.

## Build order + variation blueprint (from his real game data)
Each row: total games / score / the structurally-distinct variations ≥30g
(build ALL that pass doctrine STEP 2 (a)-(d); count is never David's call).

| # | Opening | Side | g | % | Variations to build |
|---|---|---|---|---|---|
| 1 | Caro-Kann | B | 1944 | 63 | Advance/h4 (spine), Two Knights+Réti (Nc3/Nf3 ~600g), Exchange (247g), Advance …c5 sub (124g) |
| 2 | Trompowsky | W | 1823 | 62 | 2…Ne4 (425g), 2…d5 (398g), 2…g6 (239g), 2…c5 (224g), 2…e6 spine (112g) |
| 3 | English | W | 1597 | 62 | 1…e5 (290g), 1…e6 (233g), 1…c5 (182g), 1…c6 (145g), 1…g6/KID (138g), 1…d5 (64g) |
| 4 | French | B | 1596 | 63 | Rubinstein (spine+271g+133g), Advance (138g), Exchange (137g), …b6 (123g) |
| 5 | Scandinavian | B | 1176 | 65 | Classical …Qxd5/…Qa5 (449g), Modern …Nf6 (spine), Bb5+/Nc3 sidelines |
| 6 | Modern | B | 1066 | — | **NOT EXTRACTED** — add to OPENINGS map first |
| 7 | Dutch | B | 814 | — | **NOT EXTRACTED** — add to OPENINGS map first |
| 8 | Vienna | W | 649 | 68 | Vienna Gambit (spine f4), 2…Nc6 Bc4 quiet (243g), 2…Nc6 Bb5 (61g), 2…f5 (57g) |
| 9 | KIA | W | 538 | 72 | setup-based (Nf6/c5/g6/e6) — shallow opening, MUST walk deep into MG (STEP 3.5) |
| 10 | Caro-Advance (White) | W | 423 | 73 | 3…c5 (116g), 3…h6 (50g), Qxd4 (38g) |
| 11 | Pirc | B | 351 | 69 | Austrian Attack (spine f4), Classical Nf3/Nc3 |
| 12 | Closed Sicilian | W | 333 | 68 | …d6, …e6 mains |
| 13 | London | W | 327 | 70 | setup branches (~3-4 tabs) |
| 14 | QGD | B | 113 | 53 | thin + his only sub-60% line — 1 tab, low priority |
| — | Rossolimo (102) / Fantasy Caro (95) / Ponziani (82) / Italian (75) | — | | marginal, buildable last |

**Re-included per D1 revision (need tree extraction + deep-build):**
- **a3 Sicilian** (~864g) — E4 NY ch 5-9; his #1 anti-Sicilian. Ranks ~#6 by volume.
- **b3 Sicilian** — E4 NY ch 10-12.
- **b3 French** — E4 NY ch 13-14B (+ the Milner-Barry, see below).

**DROP (fail ≥30-game threshold, doctrine STEP 1):**
- `pro-gothamchess-stafford-refute` — 1 game.
- `pro-gothamchess-milner-barry` — 14 games IN DATA, but it's a featured E4 NY
  weapon. KEEP as a thin/taught entry (his published gambit) rather than drop —
  build from the few games + course framing, flag if data too sparse.

**Voice corpus:** every in-scope opening has a Chessly course — full
catalog + per-opening chapter mapping in
`data/sources/gothamchess-voice/per-opening/_sources.md`. Course names the
variation; his game data supplies the moves (the marry-method).

## Per-opening procedure (every entry, in order)
Follow the doctrine 16 steps. Per-opening checklist (Pass A):
- [ ] STEP 1 — opening in `extract-opening-tree.mjs` OPENINGS (most already are; Modern+Dutch need adding)
- [ ] STEP 2 — re-extract tree vs FRESH archive; identify all ≥30g distinct variations
- [ ] STEP −1/3 — add gotham variation config to `deep-build-data.mjs` (studentUsername `GothamChess`, his spine), deep-build each variation
- [ ] STEP 4 — wider-corpus plan + endgame counts (fork `*-alapin.mjs` templates; hundreds of games, NOT terminus)
- [ ] STEP 5 — voice corpus URLs → `data/sources/gothamchess-voice/per-opening/<opening>.md` (Pass A gathers URLs; Pass B authors prose)
- [ ] STEP 6/7 — lesson SHELLS (`proGothamChess<Opening>Variations.ts`) with `TODO` say/sayShort, real moves/arrows/highlights/sources; register in `lessons/index.ts`
- [ ] STEP 8 — `pro-repertoires.json` entry (deep spine + all variations + traps + warnings)
- [ ] STEP 9/10 — middlegame + endgame plans (hand-authored annotations, anchored AT/PAST terminus, themes match moves)
- [ ] STEP 11 — common-mistakes (3-5 pitfalls)
- [ ] STEP 1a — mine traps (`mine-gothamchess-<opening>-traps.mjs`); NEVER author
- [ ] STEP 12 — 3-5 model games per variation, real WINS only, hand-authored overviews
- [ ] STEP 12.5 — `proGothamChess<Opening>TabPlans.ts` + register in `OpeningDetailPage.tsx`
- [ ] STEP 13 — `proRepertoireOpeningMap.json` if classical mapping exists
- [ ] STEP 14 — bump `PRO_DATA_REVISION`
- [ ] STEP 15 — ship-check green
- [ ] STEP 16 — push + `audit-pro-gothamchess-<opening>-prod.mjs` (3-instrument)

## Sequencing logic
Most-popular-first (D3) means the highest-traffic surfaces get depth soonest,
and the Caro (his #1, deep clean theory) sets the depth template the rest copy.
Modern+Dutch slot at their volume rank (6,7) but need extraction wiring first.
Batch the deploy per doctrine — push when a coherent chunk (one opening's Pass A)
is ship-check green; don't deploy per-commit (Vercel 100/day cap).

## Next-session pickup
- Pass A in progress, opening #1 = **Caro-Kann**.
- Deep-build config for gotham not yet added (Naroditsky's is hardcoded to his
  username + Advance-c5 spine; Gotham's spine is the h4 Advance — needs its own).
- After Caro Pass A ships + audits, descend the table. Pass B (narration) is a
  SEPARATE effort across all openings once skeletons are live.
