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
