# PLAN — Gambit tab → full masterclass standard (2026-05-30)

> David's target (his first-message bar, verbatim intent): every gambit-tab
> opening must (1) reach the middlegame on the most-common master line,
> (2) have middlegame plans that pick up where the opening leaves off, covering
> pawn breaks / key squares / structure / center-or-wing attacks, (3) have
> endgame plans where the data supports, (4) have model games matching the
> opening + variation (student-side WINS), (5) carry two-register narration that
> teaches key ideas + squares, NOT move-by-move dictation.
>
> Doctrine: `docs/plans/2026-05-29-masterclass-data-rebuild-doctrine.md` +
> CLAUDE.md §G9.1/§G9.2/§G9.3. This is **Wave 4** of that doctrine (sharp
> gambits) scoped to the Gambit tab. Spine source = masters DB via
> `build-opening-spine.mjs` (Lichess `source=masters`, strong-`lichess`
> fallback). The LLM authors prose ONLY; it never picks a move (G3).

## THE STRUCTURAL BUG THIS FIXES
`GambitsTab.tsx` → `getGambitOpenings()` → `db.openings` filtered `isGambit===true`
→ the 12 thin `gambits.json` entries (ids `gambit-kings-gambit`, `scotch-gambit`,
…). Their Watch falls through to the **legacy `WalkthroughMode`** with ungated
auto-annotations (annotationService maps `gambit-kings-gambit → 'king-s-gambit'`)
because `getLessonScript('gambit-kings-gambit')` is **null** — the curated lessons
are keyed under the CANONICAL ids (`kings-gambit`, …). The tab shows the OLD
pre-masterclass surface; the good builds sit one id away on the Masterclass tab.

## SPINE DATA (STEP 1 done 2026-05-30 — all reach middlegame, show-your-work)
`data/sources/opening-spines/<id>-spine.json` generated for all 12. Every one
`reachedMiddlegame=true` on real master/strong data — zero fabrication cases:

| id (spine file) | through move | plies | branches |
|---|---|---|---|
| kings-gambit | 13 | 25 | 3 |
| evans-gambit | 12 | 23 | 2 |
| scotch-gambit | 20 | 39 | 4 |
| vienna-gambit | 12 | 24 | 2 |
| danish-gambit | 18 | 36 | 3 |
| smith-morra-gambit | 18 | 36 | 5 |
| stafford-gambit | 15 | 30 | 7 |
| marshall-attack | 25 | 49 | 2 |
| englund-gambit | 14 | 28 | 8 |
| budapest-gambit | 17 | 33 | 6 |
| albin-countergambit | 16 | 31 | 5 |
| benko-gambit | 14 | 28 | 4 |

## TWO GROUPS

### Group A — canonical twin EXISTS (mostly built; reconcile + gap-fill)
`kings-gambit` (manifest✓, 2 MG plans, 9 model games, lesson+vars),
`evans-gambit` (✓, 4 plans, 4 games), `benko-gambit` (✓, 4 plans, 4 games),
`budapest-gambit` (✓, 1 plan, 0 games), `albin-countergambit` (✓, 1 plan, 0 games).

**Reconcile mechanism (merge-to-canonical):**
1. Set `isGambit:true` on the 5 canonical `repertoire.json` entries; teach the
   repertoire loader to honor it (so getGambitOpenings returns the canonical
   entry → curated lesson resolves → Watch is the masterclass `LessonPlayer`).
2. Remove the 4 `gambit-*` dupes from `gambits.json` (`gambit-kings-gambit`,
   `gambit-evans-gambit`, `gambit-benko-gambit`, `gambit-budapest-gambit`).
   `albin-countergambit` shares its id with canonical — no separate dupe to
   remove, just ensure isGambit lands on the merged record.
3. Rekey gem narration (`gambitGemNarration.ts`) + gem data + plans/model-games
   from `gambit-*` → canonical ids. Re-verify gems still surface on right tab.
4. Drop the now-dead `annotationService` slug entries for the removed dupes.
5. Bump `BASE_DATA_REVISION` (+ gambit revision) → reconcile deletes the
   orphaned `gambit-*` rows from seeded Dexie (G8).
6. Gap-fill to standard: verify each spine reaches MG (re-anchor pgn to the
   STEP-1 data spine if the current pgn is shorter), add endgame plans where
   the wider corpus supports (≥10% reach an endgame type), add model games for
   Budapest + Albin (student-side wins), ensure MG-plan `criticalPositionFen`
   = spine terminus (G9.3 Gate C).

### Group B — NO twin (full build under the existing clean tab id)
`scotch-gambit`, `vienna-gambit`, `danish-gambit`, `smith-morra-gambit`,
`stafford-gambit`, `marshall-attack`, `englund-gambit`. Ids are already clean
(no redundant prefix) → build in place:
- Register a hand-authored `LessonScript` (main + variation lessons) keyed to
  the tab id (getLessonScript resolves) — G9.3 Gate A.
- Add the id to `opening-manifests.json` (brings it under the gates).
- `repertoire.json`/`gambits.json` `pgn` + each `variations[].pgn` = the STEP-1
  data spines (re-run spine builder seeded at each branch for variation tabs).
- Middlegame plans anchored at spine terminus (Gate C), N = wider-corpus count
  (≥10% at a key MG ply), covering breaks/squares/structure/attacks.
- Endgame plans where ≥10% of the variation corpus reaches an endgame type;
  ground each in a REAL master game walked to its ending (endgame-layer rule).
- Model games per variation, student-side WINS only, hand-authored overview.
- Pitfalls (common-mistakes) WLPP two-register.
- Narration: two registers per beat (`say` + `sayShort` ≤8w), lead-the-eye
  arrows/highlights, sources[] on every unit, NO move-number prefixes, NO
  move-by-move dictation. Board-accuracy gated (narrationAccuracy).

## MIDDLEGAME PLAN RULES (David 2026-05-30, locked)
- **Every middlegame plan's playable line is ≥ 8 plies long.** No 4-6 ply
  stubs. The plan must walk far enough to actually demonstrate the
  break/maneuver/structure it teaches. (Sits inside the doctrine's "6-12-move
  playableLine" band; the hard floor is 8 plies.)
- **Build ALL plans the wider-corpus data supports — if more than one plan
  exists, add them.** Per the WIDER-CORPUS rule (G9.1 STEP 5): each move
  cluster at ≥10% frequency at a key middlegame ply across the FULL variation
  corpus (hundreds of games, NOT the 3-4 terminus games) = ONE plan. Count
  honestly with `count-plans.mjs`; build that many; never ship 1 when the data
  shows 2-3, never fabricate one the data doesn't show.
- Each plan anchored at the spine terminus (G9.3 Gate C — picks up where the
  opening leaves off) and covers, per the data: pawn breaks, key squares,
  the pawn structure, and the center-or-wing attack the line generates.

## GATE / PARITY WIRING (do once, early)
- Add `gambits.json` openings to the `variationMiddlegameDepth` gate scope (it
  currently walks pro-repertoires only) so "reaches MG" can't silently rot.
- Add a gambit-tab lesson-coverage gate (every tab opening → getLessonScript
  non-null), mirroring `proRepLessonCoverage` (G9.3 Gate A).

## SEQUENCING
0. [x] STEP 1 — spines for all 12 (data, reachedMiddlegame=true).  ← DONE
1. [ ] Plan doc committed; branch pushed for durability.
2. [ ] Group A reconcile (lights up 5 already-built gambits on the tab).
3. [ ] Group A gap-fill (endgame plans, Budapest/Albin model games, Gate C).
4. [ ] Group B full builds, one opening at a time (worst-shortfall first).
5. [ ] Gate wiring (depth gate + coverage gate over gambits.json).
6. [ ] `npm run ship-check` green → land on main → 3-instrument audit per id.

## DEPLOY
Large in-progress build → commit to branch `claude/gambit-tab-coverage-kTEkS`
for durability (container is ephemeral); do NOT push half-built masterclass
content to main/prod. Land on `main` only when the whole tab clears ship-check
+ the per-id audits (batch the deploy per the Vercel-cap rule).

## NEXT-SESSION PICKUP
Spines are in `data/sources/opening-spines/`. Start at the first unchecked
sequencing item. Group A reconcile is the fast visible win; Group B is the
long grind. Don't fabricate — every move traces to a spine `counts[]` line.
