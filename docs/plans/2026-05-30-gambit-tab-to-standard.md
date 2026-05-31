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
0. [x] STEP 1 — spines for all 12 (data, reachedMiddlegame=true).
1. [x] Plan doc committed; branch pushed for durability.
1b.[x] STEP 2/3 — 44 per-variation spines, all reach MG (1 thin Stafford dropped).
1c.[x] STEP 4 — middlegame-plan extraction (wide-corpus forward-walk, ≥10% forks).
1d.[x] STEP 5 — endgame extraction (real games walked into endings, ≥15% types + rep game).
2. [x] Group A reconcile — isGambit flag on 5 canonical entries + dupes retired from
       gambits.json + G8 orphan sweep + revision bump. typecheck green, 0 new test
       failures, 1102 satellite gates green. Commit c18b37a. Tab now shows the
       curated King's/Evans/Benko/Budapest/Albin (lessons+gems+model-games), not the
       shallow legacy dupes.
3. [~] Group A gap-fill — endgame plans + missing model games. Each authored from a
       REAL master game walked into the ending, board-verified, gate-green:
       - [x] Benko — `mp-benkogambit-endgame` (Cossin–MVL 2008, R+minor, Nxg3 no-recapture). 29e9255
       - [x] King's — `mp-kings-gambit-endgame` (Berg–Grandelius 2015, R+P two-passers). f225428
       - [x] Evans — `mp-evansgambit-endgame` (Stevic–Rogic 1995, Bxf7+ liquidation). c5987b4
       - [x] Budapest — `mp-budapestgambit-endgame` (Galiana–Anagnostopoulos, two-weaknesses) + 2 model games. c5987b4/19ea416
       - [x] Albin — `mp-albincountergambit-endgame` (Shumiakina–Raetsky, active-king R+P) + 2 model games. c5987b4/19ea416
       **GROUP A COMPLETE** — 5 curated openings on the tab, all with MG plans + endgame plans + model games, gate-green.
       Pattern (per plan): read gambit-endgames/<v>.json rep game → verify line legal +
       capture FENs → author board-true two-register annotations + orange highlights +
       learnCues + sources → bump manifest endgamePlans → run middlegamePlanThemes +
       openingManifests + middlegamePlanner gates.
4. [~] Group B full builds (Scotch/Vienna/Danish/Smith-Morra/Stafford/Marshall/Englund).
       Endgame data surveyed (gambit-endgames/): 6 of 7 have a clean ≥8-ply student-win
       ending; Stafford self-hides (sharp, no clean ending — correct, like King's
       Classical-Declined). ⚠️ BOARD-ACCURACY DISCIPLINE: several rep-game slices do NOT
       cleanly show the student winning (e.g. Scotch `Rxb5` is met by `cxb5`, an even
       trade — NOT a material win). Only author a slice whose board facts genuinely
       demonstrate the student edge; verify every claim with chess.js before writing prose.
       - [x] Marshall — `mp-marshallattack-endgame` (Leko–Kramnik 2007, verified clean). 3e0d3a8
       - [x] Smith-Morra — `mp-smithmorragambit-endgame` (Potapov–Al Sayed, d6 outpost, level R+N). 
       - [x] Vienna — `mp-viennagambit-endgame` (Smolen–Mazur, d6-passer for b7, +39).
       - [x] Scotch — `mp-scotchgambit-endgame` (Popov–Faizrakhmanov, queenside rook pressure, +22). 99e0c9c
       - [x] Danish — SELF-HIDES (slice has Black winning our pawn; no clean student slice — honest).
       - [x] Stafford / Englund — trap-only (sharp; no clean endgame — correct).
       **GROUP B endgame plans DONE** (where the data supports a clean equal-or-better student slice).
       Every plan engine-verified ≥ −30cp at the slice end (David: winning OR equal, never losing).
       - [ ] **THE BIG REMAINING LIFT — LessonScripts (G9.3 Gate A) for all 7.** Without a
             registered LessonScript each Group B Watch still falls to legacy WalkthroughMode.
             Per opening: author main + per-variation LessonScripts on the STEP-2/3 data
             spines TRIMMED to the sound terminus (never author past −1.2). Stafford/Englund
             lessons teach the WINNING trap lines (already re-anchored in gambits.json).
       - [ ] Group B model games (student-side wins) + pitfalls (common-mistakes) per opening.
       - [ ] Rebuild the shallow gambit-plans.json MG plans (currently ~+24 generic) on the
             real wide-corpus forks (≥8 ply, all plans the data shows), anchored at spine terminus.
5. [ ] Gate wiring (depth gate + coverage gate over gambits.json).
6. [ ] `npm run ship-check` green → land on main → 3-instrument audit per id.

## 🔒 SOUNDNESS — "we cannot teach losing positions" (David 2026-05-31, locked)
Engine-verify every TAUGHT position from the STUDENT's POV (`scripts/gambit-soundness-sweep.mjs`,
stockfish depth 18-22, harness sanity-checked: startpos reads +40). **Bar (David):
worse-than −1.2 = must fix; −0.5 to −1.2 = real gambit compensation, keep.**
- **Done — live tab is clean:** Scotch +31 / Vienna +82 / Smith-Morra +77 (sound);
  Danish −78 / Marshall −117 / Benko-accepted ~−1.0 (compensation, kept). Stafford
  and Englund were −220/−214 LOSING from move 4 (verified depth-22, NOT bad data —
  they are objectively unsound trap gambits). Rebuilt as **winning trap weapons**:
  main pgn re-anchored to engine-verified Black-wins lines (Stafford +464 queen-win,
  Englund +384 Qb4+ raid), honest "surprise trap, not a sound system" overview, real
  named traps (Stafford Mate, Englund Qc1#). 58 auto-mined junk trap lines stripped. (30b8ee6)
- **Overwalk SPINES to trim BEFORE authoring Group B lessons** (sound terminus from the
  eval curve — reference data, not yet live): sc__max-lange→m12 (+17), ev__accepted-bc5→m11
  (+174), bu__alekhine-bf4→m11 (−56), ma__bf5-modern→m12 (−32), da__accepted-full→m6 (−64).
  Never author a lesson whose terminus is worse than −1.2 — stop the spine at the sound point.
- **TODO diligence:** run the soundness sweep over the 5 Group A canonical lessons too
  (kings/evans/benko/budapest/albin) — pre-existing masterclass content now on the tab;
  the Philidor-Antoshin incident proves a shipped lesson can teach a secretly-losing line.

## DEPLOY
Large in-progress build → commit to branch `claude/gambit-tab-coverage-kTEkS`
for durability (container is ephemeral); do NOT push half-built masterclass
content to main/prod. Land on `main` only when the whole tab clears ship-check
+ the per-id audits (batch the deploy per the Vercel-cap rule).

## NEXT-SESSION PICKUP
Spines are in `data/sources/opening-spines/`. Start at the first unchecked
sequencing item. Group A reconcile is the fast visible win; Group B is the
long grind. Don't fabricate — every move traces to a spine `counts[]` line.
