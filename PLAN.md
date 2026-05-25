# PLAN — Build out the remaining BLACK opening masterclasses (2026-05-25)

> Prior Sicilian plan archived → `docs/plans/2026-05-25-sicilian-masterclass.md`.

David: "Build out the rest of the black openings. Start with replacing what is
in the main-40 opening tab. Then add other good black openings missing. FOLLOW
THE RULES — NO EXCEPTIONS. Only OK to leave undone is the model game if none
can be found."

Standard = the **Vienna keystone** (playbook §0.7) — replicate file-by-file.
Moves come from the existing `repertoire.json` curated pgn lines (already
DB-anchored, ≥20 plies in most variations); the LLM writes PROSE only (G3).
Gates are the safety net; never invent moves. Push straight to `main`.

## Target set — 13 black openings in the main-40 (convert → masterclass)

Declaring the manifest moves each OUT of "Most Common" → "Masterclasses"
(§0.7 STEP-9). All 13 already have repertoire records (keyIdeas×4 + 7-8
variations with explanations + pgn).

| # | id | corpus source | status |
|---|----|------|--------|
| 1 | petrov-defence | book:petrov-defence | DONE (4 tabs) |
| 2 | philidor-defence | book:philidor-defence | DONE (4 tabs; dropped d3 hybrid — DB-anchor 4p) |
| 3 | qgd | book:qgd | DONE (4 tabs) |
| 4 | qga | wiki+concepts | DONE (3 tabs) |
| 5 | slav-defence | wiki+concepts | pending (depth caveat: many vars <20p) |
| 6 | semi-slav | wiki+concepts | pending |
| 7 | kings-indian-defence | wiki+concepts | pending |
| 8 | grunfeld-defence | wiki+concepts | pending |
| 9 | benoni-defence | wiki+concepts | pending |
| 10 | queens-indian | wiki+concepts | pending |
| 11 | budapest-gambit | wiki+concepts | pending |
| 12 | old-indian-defence | book:old-indian-defence | pending |
| 13 | two-knights-defence | book:two-knights-defence | pending |

### Per-opening notes (done)
- Each: main lesson + variation tabs (≥20p, two registers, sources, lead-the-eye
  grounded), 1 theme-demonstrating middlegame plan (mp-<idnodash>-main with
  learnCues+sources+leadeye), manifest (modelGames floor 0 — see below), full
  wiring (registry+index+variationTabs+masterclassTabs+chain).
- **Removed pre-existing auto-gen junk** per opening: stub plans w/o playableLines,
  orphan plans w/o cues/sources, and WRONG-ORIENTATION model games (White wins /
  draws vs the Black opening — e.g. Philidor Opera Game). Model games omitted
  (floor 0) where no real Black WIN exists (David's carve-out).
- **add-leadeye-to-plans.mjs allowlist** extended to petrov/philidor/qgd/qga.
- Per-tab middlegame plans (beyond -main) are a deepening item — those tabs'
  plan sections gracefully self-hide for now (no empty shells).

## Per-opening recipe (Vienna §0.7)
1. `lessons/<camel>.ts` — main `<CONST>_LESSON` (≥20-ply deepest beat,
   orientation black, two registers say + sayShort≤8w, sources[], lead-the-eye:
   GREEN vision arrow + YELLOW highlight on EVERY named square — grounding gate
   is sealed-empty so no bare named squares).
2. `lessons/<camel>Variations.ts` — one LessonScript per tab, key
   `"<id>::<Exact Variation Name>"`, ≥20p each.
3. `registry.ts` — 2 imports + 1 OPENINGS line.
4. `variationTabs.ts` — `CURATED['<id>']` (every §0.1-valid variation).
5. `services/<camel>MasterclassTabs.ts` + OpeningDetailPage chain branch.
6. `middlegame-plans.json` — one plan per tab `mp-<idnodash>-<tab>`; run
   `scripts/add-leadeye-to-plans.mjs`.
7. punish-gems — only if weapon-rich + mineable (network). Else skip.
8. model-games.json — REAL student-side WINS only; else omit (David's carve-out).
9. checkpoint-quizzes.json + common-mistakes.json keyed '<id>' (Pitfalls need
   shortNarration ≤8w + sources — commonMistakeNarration gate).
10. opening-manifests.json — honest floors (modelGames floor = actual found).

## Gates (ship-check) — all green before push
lessonIntegrity, narrationAccuracy, narrationGrounding (SEALED — no bare named
squares), lessonDepth (≥20p, SEALED), lessonTabIntegrity, wlppNarration
(every say has ≤8w sayShort), lessonSources (every lesson resolvable source),
openingManifests, modelGames-orientation, punishGems, middlegamePlanner,
middlegamePlanThemes, commonMistakeNarration, OpeningDetailPage.wiring,
openingWiring.

## Decisions log
- 2026-05-25: model games — source from local pro-game cache
  (`docs/audit-runs/2026-05-19-pro-games-gen/raw-fetched.json`) where a real
  student-side WIN exists; else omit + floor 0 (David's carve-out).
- 2026-05-25: gems — skip unless an opening is genuinely weapon-rich AND
  mineable; explorer is firewalled in-sandbox → CI only. Empty > generic.

## Sequencing / next-session pickup
- Build COMPLETE openings one at a time; each fully gate-passing before moving on.
- Petrov first as the gate-passing exemplar, then scale the pattern.
- Commit+push to main in batches (ephemeral container).
- Post-deploy audit (G1) localhost matrix after pushes; route openings-store
  WRITE persistence + audio quality to David (sandbox can't verify).
