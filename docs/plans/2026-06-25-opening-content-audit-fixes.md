# Opening-Tab Content-Fix Plan (grounded)

**Owner:** Claude (David delegated the fixing). **Created:** 2026-06-25.
**Source audit:** `docs/content-audit-opening-tab.md` (123 curated openings; 175 high / 259 med / 148 low raw findings).
**Goal:** make every Opening-tab content section **accurate, relevant, non-redundant** before go-to-market, and add gates so it can't regress.

> Standing rule (David): flag → he confirms; never silent-rewrite chess MOVES. Prose may be re-authored, but **grounded in the data** (G0/G3). When unsure: leave/skip/ask. Empty > generic > invented.

---

## Where the data + tooling lives
- Content JSON: `src/data/repertoire.json` (42 masterclass), `src/data/pro-repertoires.json` (81 pro), `middlegame-plans.json`, `model-games.json`, `common-mistakes.json`, `punish-gems.json`, `chess-concepts.json` (Classic Wisdom + openingDefinitions), `opening-book-pages.json` (From-the-Books).
- Lessons (Watch/Learn beats): `src/data/lessons/*.ts` (`getLessonScript`, `getVariationLessonScript`).
- Audit tooling (rebuildable): `scripts/content-audit/` — `build-packets.ts` (slices per-opening packets to `audit-reports/content-packets/`), `detect-systemic.cjs`, `detect-modelgame-mismatch.cjs`, `revalidate.cjs`, `build-report.cjs`, `tally-journal.cjs`.
- Regenerate everything: `npx tsx scripts/content-audit/build-packets.ts && node scripts/content-audit/detect-systemic.cjs`.

## Grounded findings inventory (current `main`)
| Class | Count | Mechanically confirmed? | Fix type |
|---|---|---|---|
| Duplicate model games (field-for-field) | 0 (was 3 — packet-truncation artifact; full-PGN gate = 0) | yes | n/a — Sveshnikov shared-overview pair moved to Phase 3 |
| Duplicate/mislabeled variation tabs | 2 | yes | remove/differentiate |
| Classic-Wisdom == From-the-Books, conflicting author | 6 | yes | de-dupe + de-attribute (decision) |
| Duplicate middlegame plans (identical line) | 9 | yes | merge / re-derive |
| Student-side-LOSING model games | 3 | yes | replace/remove |
| Model-game overview/theme ≠ the actual game | ~44 (high) | judge-enumerated | correct fields / re-author prose |
| Variation explanation ≠ the line it teaches | ~19 (high) | judge-enumerated | fix prose to match data line |
| Medium / low (rest) | ~407 | mixed | sweep last |

Confirmed examples: Vienna "Falkbeer" tab = verbatim Frankenstein-Dracula dup (and "Falkbeer" isn't a Vienna line); Sveshnikov dup games + Overview "drew every game" vs a `0-1` game; Pirc overview "Adams beats Kotronias" (game is Leko–Adams); Alapin one record names White as `mg-adams`/"Adams"/"Deep Blue"; Najdorf two plans identical title+FEN+line; Ruy CW/FTB = same 784-char synthesized passage credited to Capablanca vs Edw. Lasker.

---

## DECISIONS LOG (forks — proceeding on the REC default unless David objects)
1. **Classic-Wisdom / From-the-Books synthesized passages.** They are app-written "modern retellings," not real Gutenberg quotes, and the same text sits in both files under different historical authors. **REC:** (a) restrict From-the-Books to GENUINE public-domain excerpts — pull the synthesized passages out of `opening-book-pages.json` (section self-hides if no real excerpt); (b) keep the retelling in Classic Wisdom but stop crediting a specific historical author/work (label as the app's distilled summary). Scan ALL openings for the same pattern, not just the 6 that collide.
2. **Vienna "Falkbeer Variation" tab.** Mislabeled Frankenstein-Dracula duplicate; the real Falkbeer is a King's Gambit line. **REC:** remove the tab (Vienna → 7 real variations). A genuine 8th Vienna variation is a separate content BUILD, not a fix.
3. **Model-game overview mismatches.** **REC:** correct mis-joined factual fields (players/result/variation) first; where the overview prose is simply about the wrong game, re-author it grounded in the ACTUAL game (LLM prose, real facts).
4. **Duplicate plans.** **REC:** merge to ONE when the opening's game data supports only one distinct plan at that position (Najdorf); re-derive a genuinely distinct second line from the data only when the data clearly shows a second pattern.

---

## PHASES (each phase = one batched deploy to `main`; gates + ship-check before push; post-deploy audit per G1)

### Phase 0 — Verification harness + regression gates  `[DONE 2026-06-25]`
Shipped: `src/data/contentConsistency.ts` (shared detectors) + `contentConsistency.test.ts` (gate) + `contentConsistency.baseline.json` (20 violations: 0 dup games, 2 dup tabs, 9 dup plans, 6 CW/FTB, 3 student-losing). Wired into `scripts/ship-check.mjs`. Baseline can only shrink. Original spec below.
Promote the detectors into a permanent gate `src/data/contentConsistency.test.ts` that FAILS on:
- duplicate model games (same white|black|result|year|openingSan, different id)
- duplicate variation tabs (identical first-beat `say` OR identical `sanLine` within an opening)
- duplicate plan lines (identical replayed `lineSan` within an opening)
- Classic-Wisdom text == From-the-Books text with different author
- student-side-losing model game (by `studentSide` tag OR opening `color`)
- model-game overview naming a surname absent from white/black (allowlisted backlog that can only SHRINK, like the other baselines)

Starts RED = the backlog; each fix turns rows green. Add to the ship-check content-gate list. **This phase makes every later fix provable and prevents re-introduction.**

### Phase 1 — RE-SCOPED: collapsed-distinct content (NOT mechanical dedup)  `[grounding done — needs work + 1 decision]`
Grounding (2026-06-25) showed none of the "dedup" items are safe deletions; blind-deleting would create new bugs:
- **9 "duplicate plans" → distinct plans collapsed onto one line.** Each pair has DIFFERENT titles/breaks/maneuvers (QGD …c5 vs …e5; KID trade-down vs …c5 lock; French Rubinstein vs Tarrasch …b5 gambit; etc.) but identical playable lines — a side effect of the recent plan-rebuild anchoring both to the same terminus. FIX = re-derive EACH plan's line to demonstrate its OWN declared break, grounded in the opening's data, re-passing `middlegamePlanThemes` + `narrationAccuracy`. NOT a deletion. (6 openings, ~9 pairs.)
- **Hikaru closed-sicilian "Grand Prix f4+f5" vs "vs …g6":** same — two distinct named variations sharing one line; re-derive, don't delete.
- **✅ DONE 2026-06-25 — Vienna F-D tabs (David: full autonomy).** Renamed the mislabeled "Falkbeer Variation" (F-D main line, matches the lesson) → "Frankenstein-Dracula"; dropped the mis-wired …Be7-subline tab; lowered the manifest floor honestly 8→7; removed the stale lesson key + factcheck entry. `duplicateVariationTabs` now = 1 (only the Hikaru pair left). Original note:
- **🟡 (superseded) DECISION — Vienna F-D tabs.** `repertoire.json` has BOTH "Falkbeer Variation" (PGN = F-D MAIN line, **matches** the FRANKENSTEIN_DRACULA lesson) and "Frankenstein-Dracula" (PGN = quieter …Be7 subline, **mismatches** that same main-line lesson). Plus `narrationFactCheck.test.ts` references the Falkbeer name. **REC:** rename "Falkbeer Variation" → "Frankenstein-Dracula" (its main-line PGN matches the lesson), drop the mis-wired …Be7-subline tab, remove the `::Falkbeer Variation` lesson key → 7 correctly-named tabs, no dup, no pgn/lesson mismatch. Confirm before I touch it (it deletes the …Be7 subline).
- When done: bump revisions (G8), prune the corresponding `contentConsistency.baseline.json` keys.

### Phase 2 — Classic-Wisdom / From-the-Books (Decision 1)  `[DONE 2026-06-25 — David: "de-attribute, keep prose"]`
Root cause confirmed: `rewrite-book-voice.mjs` recast the mined text into a modern teaching voice but KEPT the historical author/title/gutenbergId citation — so both sections presented app-written retellings as real public-domain quotes (same passage even credited to two different authors across the two sections). Fix shipped: de-attributed all 19 From-the-Books pages + 16 Classic-Wisdom opening passages to a single honest credit (`author: "Chess Academy"`, `gutenbergId: 0`), preserved the prose + the top-level book bibliography. UI (ClassicWisdomSection + BookReader) renders "A modern retelling, distilled from the classical masters" and suppresses the Gutenberg link for the sentinel. `classicWisdomBookClash` → 0; baseline pruned. Reads from JSON directly (no Dexie reconcile). Gates green (chessConceptService/coachesLibrary/middlegameBookLessons/groundedAnswer/contentConsistency).
- Follow-up flagged: the chess-concepts CONCEPT passages (coach-grounding library, a different surface) carry the same rewritten-but-attributed prose — de-attribute in a later pass if David wants the coach to stop citing historical authors for retold ideas.

### Phase 3 — Model-game integrity (the big class)  `[pending]`
- Fix the 3 student-side-losing games (replace with a real student-side win, fix a mistagged result/colour, or remove junk like the Alapin Deep Blue/Adams record).
- Enumerate the ~44 overview/theme mismatches (judge findings + tightened player-name detector); per record, correct fields or re-author overview grounded in the real game. Sub-batch by opening.
- Gate overview-stray-surname rows → green.

### Phase 4 — Variation explanation ≠ line (~19)  `[pending]`
- Per case, fix the explanation prose to match the data-derived line (moves canonical, prose editable). Vienna Stanley/Gambit, Italian Ba3, Pirc Qa5, etc.

### Phase 4b — Pre-existing narrationFactCheck drift (discovered 2026-06-25)  `[pending]`
7 board-FALSE attack claims drifted onto `main` from other sessions (narrationFactCheck is NOT in ship-check, so it went unguarded). Each fix is determinate (chess.js facts captured); reword to be board-true AND unambiguous-subject, then ADD narrationFactCheck to ship-check GATE_TESTS so it can't drift again:
1. `italianGameVariations.ts` Greco-Attack `gc2`: "Qb3! — hits d5 and eyes f7" → drop "eyes f7" (diagonal blocked at d5).
2. `fourKnightsGameVariations.ts` Belgrade `bg1`: "Nd5 forks the f6-knight…" → Nd5 hits ONLY f6 (one piece) — not a fork; reword to "hits/attacks".
3. `pircVariations.ts` najdorf-bishop beat: "…eyes c3" — Nc6 does NOT attack c3 (attacks d4/e5/b4/a5); name the real squares.
4. `semiSlavVariations.ts` `bo4`: "…Qa6 steps off the fork" — Qa6 attacks only a4; drop "fork".
5. `oldIndianDefenceVariations.ts` `ou3`: "…Re8 eyes e4" parsed against the a5-queen — disambiguate ("the e8-rook eyes e4").
6. `italian` `gn3` (Main Line w/ Nc3): "…hits the bishop with …d5; White retreats it to d3" — reword so the attack subject is the d5-pawn on the c4-bishop, not Bd3.
7. `middlegame-plans.json` `mp-scotchgame-steinitz` move 2: "Nb5 jabs at c7 and the a7-fork" — Nb5 forks nothing here; drop "fork"/correct.
(NB: the exact phrase "hits the bishop with" also appears in `proAmanRuyLopezVariations.ts` — locate the ITALIAN gn3 beat specifically, don't edit the Ruy one.)

### Phase 5 — Medium/low sweep + final re-audit  `[pending]`
- Work the remaining medium/low by opening.
- Re-run the full grounded audit (or at least the gates) → backlog at 0 / baselines shrunk.
- `npm run ship-check` green; 3-instrument prod audit on `/openings/*` surfaces touched (G1).

---

## Sequencing logic
Gates first (provable + regression-proof) → safe data dedup (fast wins, zero judgment) → decision-gated CW/FTB → the big model-game class → variation prose → sweep. Data-only edits batch into a few deploys (Deployment Policy: deploy at completion, not per commit). Every runtime-data change bumps its reconcile revision (G8) and gets a post-deploy audit-stream pull (G2).

## Next-session pickup
1. `npx tsx scripts/content-audit/build-packets.ts` then `node scripts/content-audit/detect-systemic.cjs` + `detect-modelgame-mismatch.cjs` to re-derive the live backlog.
2. Check this file's phase status markers; resume the first `[pending]` phase.
3. Full findings detail: `docs/content-audit-opening-tab.md` (Tier 1 confirmed + Tier 2 high). Raw re-validated JSON regenerates via `revalidate.cjs` + `build-report.cjs`.
4. The judge run journal (582 findings, all severities) lives in the workflow transcript dir; `tally-journal.cjs <journal>` re-aggregates it.
