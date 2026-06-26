# Opening-Tab Content-Fix — Precise Game Plan (2026-06-26)

Re-derived MECHANICALLY against current `main` (not the stale judge findings — ~20 items already fixed). Supersedes the status sections of `2026-06-25-opening-content-audit-fixes.md` (that doc keeps the rules/recipes + decisions log; THIS is the live worklist).

Regenerate this state any time:
```
npx tsx scripts/content-audit/build-packets.ts
node scripts/content-audit/detect-systemic.cjs           # dup games/tabs/plans, CW/FtB
node scripts/content-audit/detect-lesson-pgn.cjs         # lesson != pgn (by diverge ply)
node scripts/content-audit/detect-line-material.cjs      # line soundness (student down material)
node scripts/content-audit/detect-modelgame-mismatch.cjs # student-side-losing games
node -e 'console.log(require("./src/data/contentConsistency.baseline.json"))'  # gated backlog
```

## ✍️ VOICE — write like a coach sitting next to the student (David 2026-06-26)
Every variation `explanation` (and any prose I author) is written in the COACH-NEXT-TO-YOU voice — second-person / “we” / “you”, pointing at the board, warm and direct (the pro-rep style: “we play d4…, with us as White”) — NOT dry encyclopedic third-person (“White grabs the centre”). Keep every move/claim accurate to the line; just say it like a coach in the chair beside them. The 22 I rewrote this effort were revoiced (commit f15186f); apply this to ALL remaining Phase B/D prose.

## CURRENT VERIFIED STATE
| Class | Count | Mechanical? | Notes |
|---|---|---|---|
| **Gated backlog** (contentConsistency baseline) | **9** | yes | 1 dup variation tab (hikaru) + 8 dup plan-lines |
| **lesson ≠ pgn — early-diverge (≤6 ply)** | **10** | yes | real different-line candidates (verify not near-transposition) |
| lesson ≠ pgn — late-diverge (>6 ply) | 48 | yes | mostly last-beat sub-branches — SPOT-CHECK only, mostly leave |
| **Line soundness** | CLEAN | yes | 13 material-down lines = gambits/sharp theory; Italian was the lone bug (fixed) |
| **Model-game overview accuracy** | ~44 | NO (noisy) | judge list; per-item verify vs the real game |
| **Variation-explanation prose** (line-fine) | ~45 med | NO | judge list; reword to the line, per-item |

Done so far this effort (gate baseline 20→9): consistency+factcheck gates, 3 student-losing games removed, 35 book de-attributions, Vienna tab, Najdorf plan merge, 7 narration beats, ~15 variation explanations, 5 line-alignments (scandi×2/alekhine/two-knights/italian-soundness).

---

## PHASES (ordered by value × tractability)

### Phase A — lesson≠pgn EARLY-diverge (10)  `[DONE 2026-06-26]`
Aligned 7 genuine different-line variations to their beats: english Mikenas; london Jobava + vs-KID; caro Two Knights; vienna Paulsen; kings-gambit Declined; pro-naroditsky-kia d5-mainline. **2 benign** (naroditsky-kia g6-Modern, fantasy-caro Modern-g6 = transposition-then-extension, card is a fine opening terminus — left). **1 DEFERRED:** pro-naroditsky-kia "d4 KID transposition" — its beats play g3-first while the name+explanation say "d4 instead of g3"; aligning would contradict the tab intent → needs a decision on whether the beats or the name/explanation is right. Original note:
The 10 (from `_lesson-pgn.json`, divergePly ≤6):
`english::Mikenas Attack` · `london::Jobava London` · `london::London vs King's Indian` · `caro-kann::Two Knights Variation` · `vienna::Paulsen Attack` · `kings-gambit::King's Gambit Declined` · `pro-naroditsky-kia::{d4 KID transposition, d5 KIA mainline, g6 Modern setup}` · `pro-naroditsky-fantasy-caro::Modern setup with g6`
**Recipe (PROVEN):** per variation — (1) confirm it's a genuine different line, not a near-transposition (compare beats finalFen vs card finalFen by hand); (2) align card `pgn` → the beats' final `moves` (beats are the gated Watch content the student sees); (3) rewrite the `explanation` to the new line; (4) run the 6-gate set: `variationMiddlegameDepth narrationAccuracy lessonTabIntegrity repertoire-orientation modelGames-orientation contentConsistency`. ⚠️ caro-kann is a flagship — extra care.

### Phase B — Variation-explanation prose, line-fine (~45 med)  `[determinate, per-item]`
Explanation names a move/square not in the line (the line is correct). **Recipe:** read `sanLine`, reword the explanation to describe the ACTUAL moves; gate `proRepertoireSources + contentConsistency`. Pull the list: `_findings-revalidated.json` filter section startsWith "variations", severity medium, minus already-fixed. Determinate; safe; batchable per opening.

### Phase C — Collapsed plan re-derivations (8 pairs) + hikaru tab  `[DONE 2026-06-26 — GATE ZEROED]`
Resolved by MERGE: every pair shared the identical FEN+line and differed only by an undemonstrated break label (the line teaches the shared maneuver, e.g. …Re7/…Rae8), so re-deriving a 2nd sound line would be inventing. Kept the better-titled survivor of each pair, deleted the 8 redundant plans + the hikaru "vs …g6" dup tab (+ its GP_G6 lesson const/key). No manifest floors on these pro openings. **contentConsistency baseline is now ALL ZEROS (20→0).** Original note:
The 8 dup-plan pairs (from baseline `duplicatePlanLines`):
`pro-gothamchess-caro-advance-white` (h4-pin == bf5-c4break) · `pro-gothamchess-french-defense` (rubinstein == tarrasch-b5gambit) · `pro-gothamchess-qgd` (classical == carlsbad-e5) · `pro-naroditsky-alekhine` (twoknights-equality == twoknights-trade) · `pro-naroditsky-kia` (kid-transposition == pirc-nh4) · `pro-naroditsky-kia` (reti-attack == reti-nc4) · `pro-naroditsky-kid` (classical-kingside == classical-c5) · `pro-naroditsky-rossolimo` (nc6-maroczy == nc6-b4push); + tab `pro-hikaru-closed-sicilian` (Grand Prix f4+f5 == vs …g6).
**Recipe:** per pair — the two plans declare DIFFERENT breaks/maneuvers but replay the same line (collapsed by the plan-rebuild). Re-derive EACH plan's `playableLines[0].moves` from the opening's data (deep-build / masters explorer) so the line actually demonstrates ITS declared break (middlegamePlanThemes gate); if the data supports only ONE distinct plan there, MERGE (like Najdorf) + lower the manifest floor honestly. Then prune the baseline key. **Hardest** (needs per-opening data + the themes gate); the engine is WASM-only here so soundness leans on the gates. Pro-rep openings → use the `scripts/pro-repertoire/deep-build-data.mjs` outputs if present.

### Phase D — Model-game overview accuracy (~44)  `[per-item, needs verification]`
Overview describes the wrong game/player/result (e.g. Pirc "Adams beats Kotronias" — game is Leko–Adams). NOT cleanly mechanical (opening-name noise). **Recipe:** per game in the judge list — verify the overview against the record's own `white`/`black`/`result`/`pgn`; correct the factual fields OR re-author the overview prose grounded in the actual game (LLM prose, real facts). The Sveshnikov shared-overview-on-two-games is in here.

### Phase E — lesson≠pgn LATE-diverge spot-check (48)  `[low priority]`
Mostly last-beat sub-branches (the lesson walks the card line, the final beat shows a deviation/tactical point — intentional). Spot-check a sample; only fix where the WHOLE lesson teaches a different line. Don't mass-edit.

### Phase F — First-beat SILENT WALK-IN (no more jumping into deep positions)  `[player fix DONE 2026-06-26 · narrations TODO]`
**David 2026-06-26 (screenshot IMG_4288):** *"Some openings start after several moves have already been played. Can you go through and add in the moves one by one to show how to reach these positions instead of just jumping into them?"* → then chose **option A**: a SILENT walk-through of the pieces (no narration) so the user watches the moves played out on the board, THEN the lesson narrates. *"maybe we can add custom narrations after to make it feel unique … the narrations should reflect the uniqueness of the variation."*

**SWEEP (full, all 684 registered lessons via `getAllLessonScripts()`):**
| | count | avg first-beat plies |
|---|---|---|
| Lessons opening >2 plies deep (jump-in) | **655 / 684 (96%)** | — |
| ↳ main-line lessons | **106** (of 130 mains) | 5.5 |
| ↳ subline/variation lessons | **549** | 8.5 |
| Main lessons opening >4 plies (*several* moves in) | **70** | — |
| Deepest jump-ins | Sveshnikov Chelyabinsk 21 plies · Breyer/Chigorin/Zaitsev 18 · Caro Classical Capablanca 19 | |

**Root cause:** `LessonPlayer.tsx` — the per-beat animation effect plays only the NEW moves vs the previous beat (longest-common-prefix), but `prevIdxRef` inited to `0`, so for beat 0 `prevMoves === curMoves` → common prefix = whole line → the **snap branch** fired and the board jumped straight to the deep position. The non-obvious part the LIVE audit caught (the unit test alone missed it): the effect **re-runs for beat 0** — React **StrictMode double-invokes** it on mount (setup→cleanup→setup) in dev, a parent re-render or a resume re-fires it — and `prevIdxRef` advanced to `0` on the FIRST run, so EVERY re-run snapped even after the `-1` init fix. (Two secondary bugs: `displayFen` inited to `fens[0]` = the deep position → would flash it; and the runtime's first `applyStep` bumped `applyNonce`, forcing one such re-run.)

**FIX (player-level, one change covers ALL 655 — `[DONE 2026-06-26]`):**
- `prevIdxRef` init `-1` → beat 0's `prevMoves` is `[]`, so its opening plays out one move at a time from the empty board.
- **`firstWalkDoneRef` (the load-bearing fix):** while the first beat's walk hasn't finished, the effect FORCES `prevMoves = []` on every run for beat 0 — so a StrictMode/parent/resume re-run rebuilds from the start instead of snapping. Flipped true when the walk's last move lands; a later resume/nav-back then correctly snaps.
- `displayFen` init = the START position (not `fens[0]`) → no flash of the deep position before the build.
- `applyStep` skips the `applyNonce` bump on its FIRST call → trims one redundant re-run (belt-and-suspenders alongside `firstWalkDoneRef`).
- First-beat narration is **SEQUENCED AFTER the silent walk**: in the player's `speak`, when `appliedIdxRef.current === 0`, it `await`s the board-animation promise, THEN schedules the lead-the-eye reveals + speaks — so the coach talks about the ARRIVAL position, never over a half-built board. Other beats keep narrating in parallel with their 1-2 new moves.
- First-beat step cadence `500ms/ply` (brisk; no voice pacing it) vs `1300ms` for teaching beats. A 10-ply main ≈ 5s, an 18-ply subline ≈ 9s, then the lesson begins.
- Tests: `LessonPlayer.test.tsx` renders under `<StrictMode>` (reproduces the double-invoke) and asserts beat 0 starts at the START position, passes THROUGH the intermediate move positions, and arrives at the deep FEN (never snaps).
- **Live verification:** `scripts/audit-lesson-walkin.mjs` drives prod/localhost, opens each opening's Watch, and samples "pieces off their home square" fast over the first ~6s. A snap = high & constant from frame 0; a build = climbs from 0. Result: sicilian-dragon `0→6 (7 distinct)`, caro-kann `0→4`, ruy-lopez `0→2` — all PASS (gradual move-by-move climb). (Prod Chromium is blocked from the sandbox — `ERR_CONNECTION_CLOSED` — so the live run is on the localhost dev bundle; the prod DEPLOY itself was verified by the bundle-hash advance + a production-env audit-stream pull.)
- Caveat (flag): with VOICE OFF + autoplay, the runtime's no-narration auto-advance (800ms) can outrun a long silent build — pre-existing behavior in `useStrictNarration`, rare path (Watch is voice-on by default). Not addressed here; note for a later hook-level fix if it matters.

**TODO — per-variation custom first-beat narration `[pending]`:** The first beat's `say`/`sayShort` now plays at the arrival position after the walk-in. Author UNIQUE first-beat narration per variation so the walk-in feels tailored ("the Breyer — the knight reroutes Nb8-d7 to refeed the centre" vs a generic "here's the starting position"). Scope: the 130 main lessons (106 that walk in) + 549 sublines — prioritize the masterclass set + the deepest/most-played sublines first. Each must stay board-accurate at the arrival FEN (narrationAccuracy gate) and carry both registers (full `say` + ≤8-word `sayShort`) with `sources[]`. This is the "make it feel unique" layer on top of the now-correct walk-in.

---

## SEQUENCING
A (structural, recipe proven, high value) → B (determinate prose, safe, batchable) → C (zeros the GATE; data-heavy, do deliberately) → D (verification-heavy) → E (spot-check, low priority).
Deploy batched per the policy; every line/data change runs its gate set + bumps reconcile revisions (loaders G8-sweep so seeded devices update). Push to `main`.

## DEFINITION OF DONE
- contentConsistency baseline = all zeros (gate hard-passes).
- lesson≠pgn early-diverge = 0; late-diverge spot-checked.
- Every variation explanation matches its line; every model-game overview matches its game.
- Plans each demonstrate their own break (middlegamePlanThemes).
- Then: `npm run ship-check` green + the G1 3-instrument prod audit on `/openings/*`.

## RESUME POINTER
Detectors + packets in `scripts/content-audit/` + `audit-reports/content-packets/`. Worklists: `_lesson-pgn.json`, `_findings-revalidated.json`, baseline. Recipes + decisions: `2026-06-25-opening-content-audit-fixes.md`.
