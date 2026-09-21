# OUTLINE — closing the loop, every item, done vs not

> **THIS IS THE ANSWER TO "where do we stand?"** When David asks where the
> outline stands, PRINT THIS FILE'S SHAPE — every work order and every roadblock
> item, one line each, with a marker. Not a prose summary, not a subset, not the
> row count of the last audit.
>
> **It is the INDEX, never the record.** `PLAN.md` holds the reasoning, the
> measurements and the corrections; this file holds one line per item so the
> whole board is readable in thirty seconds. A line here that contradicts
> `PLAN.md` is a bug in this file — PLAN wins, and you fix the line.
>
> **UPDATE IT IN THE SAME COMMIT AS THE WORK.** A status board that lags is
> worse than none: it reports finished work as open and open work as finished,
> and the next session picks up the wrong thing. Gate:
> `src/test/outlineCoverage.test.ts` fails the build when a numbered roadblock
> item or bucket in `PLAN.md` has no line here.

**Legend:** ✅ done and proven · 🔴 open, a real defect · 🟠 open, needs a
measurement or David's call · 🟡 open, low rank · ⛔ owned by another session

---

## 1. WO-CLOSEOUT-01 — code first, one push, one audit
- ✅ 1. Section-14 detectors built (`calculation-depth`, `left-book-early`, `no-plan`) — gated, but see E-10: zero real-game fires
- ✅ 2. Critical moment T1 (review scans flagged plies, the register decides) + T3 (Learn hands announced plies to the sweep, `prompted:true`)
- ✅ 3. Learn's half on a prod tape — `audit-second-game-memory-prod` rows E0/E1
- ✅ 4. D11 — `[delta]` squares already coupled (the PLAN entry was stale)
- ✅ 5. Hygiene — watermark hook, timeouts-vs-assertions, lint crash named, test-type ceiling 296→236, `BuildVersionWidget` regex, `formatTacticsSubBlock(tactics, boardFen)` required, multilingual row poll
- ✅ 6. Measurements — boot 15 files / 26.4 MB raw / 6.1 MB gzip; corpus reach 24/24 both tiers; corpus gates evened
- ✅ `tactics-context-stale` count READ off the listener: **0 stale of 145 captured events** (prod, muted, audit-concept-gameplay G5a/G5b). The zero is now a MEASUREMENT — G5a proves 145 events were captured, so it is not absence-of-capture
- 🔴 **47-game rerun — the corpus is not just absent, it is UNREPRODUCIBLE, and the test that needs it SKIPS silently** (diagnosed 2026-09-20). `fundamentalsPipeline.realGame.test.ts` gates its measurement half on `describe.skipIf(!existsSync('data/sources/wo4-corpus/annotated-d12.json'))`. That file is gitignored research data, it is on no machine here, and **there is no script in the repo that produces it** — grep finds zero producers for `wo4-corpus` or `annotated-d12`. So the WO-4 numbers (the `learned` gate, the attribution gap) rest on a corpus nobody can rebuild, which means they can never be re-measured or audited — and the run reports `3 passed | 1 skipped`, a line that reads as green at a glance. Same disease as every other finding tonight: an instrument that reports nothing is indistinguishable from one that found nothing. TO FIX, in order: write the producer (47 amateur games + Stockfish at d12 and d18, hours of CPU — schedule it, do not squeeze it beside other work), and make the skip LOUD so a missing corpus says so where someone reads it rather than hiding in a vitest tally
- **Audits:** loop 6/6 ✅ · Learn 8/8 ✅ · fundamentals-tab 19/19 ✅ · second-game 12/12 ✅

## 2. WO-LOOP-01 — prove the one-line definition on prod
- ✅ Phases 0–4, **6/6 on prod** (run 5, bundle `index-BggLa4Jm`; re-proven run 6 with an exact same-ply control)
- ✅ The five defects the instrument found, each gated: the review path never recorded · a game paired with itself · four seat resolvers ignoring the declared seat · the uncapped-facet path · GM games have nothing to record
- 🟠 OWED-1 the `other` attribution gap — MEASURED on real users: the 150cp floor rejects **99 of 367** unnamed slips (27%) that carry a real engine eval, purely for being too cheap. Precision is carried by the PV SHAPE, not the cost, so lowering to ~100 is safer than it looks — **David's call**, recommendation: lower it (PLAN)
- ✅ OWED-2 Learn's half on a prod tape
- 🔴 OWED-3 **GREEN** — the coach going quiet when you improve. Not started; needs held evidence over days

## 3. The critical moment — one computer, two registers
- ✅ Built 2026-09-19 (`criticalMoment.ts`, both registers, the stake banded off the eval)
- ✅ T1 `ask`/`note` reachable on review · ✅ T2 Learn verified on prod · ✅ T3 Learn's `prompted` wire
- 🔴 T4 `prompted` is a record, not a lever — the personal tolerance from press/no-press
- 🔴 T5 the door on live play (`interrupt` posture still grades by gap; deliberately unchanged)
- 🔴 T6 two numbers never measured on a device — Learn statement volume; `scanCriticalMoments` on a phone

## 4. Bucket D — the student cannot get what they asked for
- ✅ All of it: D1–D13 and D-LANG (Thai plus 19 other writing systems), the transcript translation door, verified on prod

## 5. Bucket A — the loop cannot close
- ✅ CLOSED: #77 click-to-move, grey teaches and feeds the ranker, one computer both directions, the endgame zero was false, provenance, the `prompted` flag; item 6 deleted as a wrong bullet
- ✅ A-adjacent: the guessed seat, the walk budget constant

## 6. Bucket B — the instruments are not believable
- ✅ 7c dead-testid gate
- ✅ 8 (#70) the review audit's verdict is reproducible — determinism seam, CLOSED for the review audit
- ⛔ 9 (#21) **the wedge behind the engine storm** — the storm is fixed; the page's main thread still pins 100% and the walk never leaves ply 0. Another session's files. Blocks the standing review re-run
- ✅ 10 (#61) **CLOSED, both halves** — visibility (`tsconfig.tests.json` exists and ship-check reads it) and runtime (296 → 236 → **0**, ceiling now a hard gate). Every fix at the TYPE, never a cast
- ✅ 11 (#58) the GothamChess pro-rep audit — four instrument layers, none of them the product
- ✅ 11a–11d ship-check hygiene
- ✅ **DONE — `note-anchors.json` regenerated; the generator was blind to six corpora** (2026-09-20). `scripts/derive-note-anchors.mjs` hand-wrote a corpus list that the 2026-09-19 split invalidated — it pointed at `src/data/chessbrah-teachings.json`, which had moved to `public/`, so the next real run would have thrown ENOENT. `noteAnchorDerivation.test` carried the SAME copy and died on ENOENT before a single assertion ran: a gate that could not run at all, which is why nobody noticed. Both now DERIVE from `corpora.json`, and the test resolves by CORPUS rather than by filename so a relocation cannot blind it again. The hand-written list named 4 corpora; the registry has 10 — gothamchess, hikaru, imrosen, magnuscarlsen, voiced and danya-floating were never scanned. Regenerated: **1031 → 1118 anchors, 0 lost, 0 CHANGED, 87 purely added**, so no existing selection moves and 87 notes become reachable that never were. 25/25 across `noteAnchorDerivation`, `noteAnchorIntegrity` and `noteSelectionDeterminism`
- 🟡 **THE TWO GATES DISAGREE ABOUT THE SAME EXPRESSION — consequence CLOSED, cause a named hypothesis** (found 2026-09-20 clearing 11e). `tsc -p tsconfig.tests.json` demanded a cast where `npm run lint` called that same cast an ERROR (`no-unnecessary-type-assertion`; lint runs `--report-unused-disable-directives`, so it is an error not a warning). PROVEN on one expression: without the cast tsc reported **3** errors and eslint was clean; with it, the reverse. **The consequence is now closed** — 11e reached 0 using only TYPE changes (typed mocks, generic parameters, `?? ''` defaults, factories), so neither gate has an assertion to object to and no work is blocked on resolving this. **It is NOT a config difference**, which retires the obvious suspect: read side by side, `tsconfig.tests.json` (app + `include:["src"]` + `exclude:[]`) and `tsconfig.eslint.json` (app + `include:["src", tests]` + `exclude:[]`) resolve to the SAME file set with the SAME compilerOptions for every test file. **Leading hypothesis: both tools are right and there is no bug.** `no-unnecessary-type-assertion` judges an assertion AT ITS OWN EXPRESSION — it fires when the asserted type equals the type already there — whereas the cast was removing THREE errors, i.e. it was load-bearing DOWNSTREAM (widening a literal so a later spread or call checks). A cast that is a no-op where it is written and decisive where it is read satisfies both verdicts at once. CONFIRMING EXPERIMENT, for whoever wants certainty: reconstruct one such expression, check whether tsc's 3 errors are at the cast's own line or downstream of it — downstream confirms the hypothesis and this closes as a non-defect; same-line means the two programs genuinely differ and the tsconfigs are not the place to look
- ✅ **DONE — 11e the test-type-error ceiling: 236 → 0** (2026-09-20). It is now a HARD GATE in ship-check, not a ratchet over a backlog. Almost none of the 236 were "the test is wrong": they were fixtures restating a type they do not own and rotting when it moved — phantom union members (`sourceMode: 'review'`, a status of `'learning'`, `OpeningVariation.annotations` which has never been a field), locally shrunken copies of a real interface (two private `{ spoken?; kind?: string }` beside the real `BakedNote`), and literals for types that have since grown ten fields. Fixed at the root with FACTORIES (`buildMoveResult`, `buildMoveAnnotation`, `buildAnalysisLine`, `buildSidePlan`) and the real types, never casts — a cast goes quiet and rots again on the next field. ~450 affected tests pass, `npm run lint` 0 errors. Two finds fell out of it: the hand-rolled-voiceService-mock ceiling was RED on `main` (65 vs 63), and half of the perspective-voice gate was DEAD — it read `.beats` off a `RegisteredLesson`, which has none, so the we/our/us ban had never been checked against a single lesson beat
- ✅ 11g **every algo decision is observable** (David 2026-09-20: "I want audit tools on all algo based builds") — the one deciding door `coachDecider.decide()` emitted NOTHING on any path, so the weighting could only be judged by reading prose. Now one row per decision through a leaf event module, forwarded to the audit log; the Learn and review audits hold contracts on the DISTRIBUTION (silences name their gate; the live commentary path judged under `interrupt`; no `walk` row closed by importance — the 46-ply-to-6 bug as one number). Both halves gated: `coachDecisionEmits` (EMIT) + `algoAuditContract` (ASSERT)
- ✅ 11h **the need score's per-term breakdown** — `computeNeed`'s five terms were a weighted sum nobody could separate, so a term contributing nothing looked identical to one working. Now named and emitted, aggregated per burst; the review audit holds the contract a distribution can hold and prose cannot: `capability` is the only LOWERING term, so a positive total is a sign inversion that would make proving a capability make the coach LOUDER while every sentence still read fine
- ✅ 11i **subsumption is visible** — `quietCount` could not tell a subsumption widening from a floor raise, and the [loser, winner] pairs were computed by `factSelector` and discarded at the door. Now on the decision row (mechanism counts + pairs), with the contract that every collapse names what ate it. This is the knob G4.5.1 says to tighten instead of raising the bar — David's "the pins and the batteries was a bit much" is now a number
- ✅ 11j **the strength estimator and the green bar** — the rating is a four-rung confidence chain whose OUTPUT was visible and whose SOURCE never was, so a chain always falling through to the default looked exactly like one working; the heat map's PROVEN count was inferable only from how quiet a tape got. Both now emit (`player-rating-estimated`, `capability-heat-map`) with contracts in the calibration and green audits
- ✅ 11k **the explorer band is closed WITHOUT an emission, on purpose** — a total pure function of one number, already swept 600–3000 for containment by `ratingBands.test.ts`, which proves the property for every rating that can ever be passed. Telemetry would only report the bands users happened to hit. Where a property can be proven by a test, prove it
- ✅ 11m **a per-decision emission cost the coach its narration — shipped, caught by the new instrument within the hour, fixed** (2026-09-21). MEASURED across three prod bundles on ONE real game (`FmzJvAqh`): pre-change 79 spoken lines / 5 narration rows green → my build **12 lines / all 5 red** → fixed build **81 lines / all 5 green**. Cause: `coach-decision` fired once per call of the deciding door (54 entries on one review) onto the narration-listener sidecar, which takes ONE POST PER EVENT — the exact reason `coach-need-scores` was already aggregated, reasoning I simply failed to carry across. Aggregated now, per-row fidelity kept inside the burst. Side effect worth noting: the fixed build captures **108** decision rows where the broken one captured 54, so the saturated pipe was silently dropping half its own telemetry
- 🟡 11n `NEED owed-plies-narrated` sits one ply off a 10-of-12 threshold (9/12) and is NOISE, not a regression — the BROKEN bundle scored 10/12 while narrating 12 lines, the fixed one scores 9/12 while narrating 81, so the relationship runs the wrong way for it to be caused. Wants a pinned baseline rather than a chase
- ✅ 11l **ANSWERED — the live-commentary path DOES fire on Learn; it needs a game long enough to warm the engine cache** (measured 2026-09-21). The zero-interrupt reading came from the Learn audit's OWN early exit — it breaks the moment the concept is voiced, ~5 plies in, long before `useLiveCoach`/`usePhaseNarration` can see a cached analysis. With `AUDIT_CONCEPT_PLAY_ON=1` the same ask plays 37 plies and the mix is **interrupt=3, walk=36**. Rare by DESIGN, not broken: the interrupt posture's contract is that silence is the default and the coach earns the word.
- ✅ 11l-bonus **G4.5.15 is now empirically confirmed in BOTH directions from one run**: of 39 rows, the 3 silent ones are exactly the 3 `interrupt` rows and all 3 closed on `importance`, while **0 of 36 `walk` rows did**. Interrupt gates on importance; walk never does — previously assertable only one way.
- ✅ 0 the walk slowdown — 800s-and-stalled back to a 550s baseline after the detach fix
- ✅ 0a the usage funnel measured on PostHog (62 real native users) — and two of my own claims retracted in it: the import control was post-treatment, "44 did nothing" was too narrow an event list
- 🟠 0b **the Dashboard-bars redesign is UNGRADED and probably ungradeable today** — only 11 of 18 post-ship users ever took an OTA bundle, and requiring an equal observation window leaves n=5. The 82%-vs-78% pair is not evidence in either direction; do not cite it. The one real finding needs no window: **zero users have ever opened the Kids Mode row the redesign added**, including the 11 who provably received it (non-vacuity proved — the same route cut returns 25 other routes)
- ✅ the cross-session audit LOCK is a real mutex now (`scripts/audit-lib/audit-lock.mjs`) — owner file, staleness by pid liveness with a `ps` check against recycling, steals only a proven-dead lock and says so, treats an ownerless dir as held, keeps the anchored pgrep guard beside it; a deadline aborts loudly and never proceeds, and a mismatched release reports CONTAMINATED
- ✅ this board is GATED at last (`src/test/outlineCoverage.test.ts`) — the header had promised that gate since it was written and **the file did not exist**; open PLAN items and buckets now must have a line here, with a negative control so the gate is proven able to fire

## 7. Bucket C — the student hears something wrong or repeated
- ✅ 11f the read-position seat · 12 queen-takes · 13 stems rotated not rolled · 14 re-announced moves · 16 (#59, a dead selector) · 17 the chat plan lane · 18 the fresh-game reset (n=4, proven on prod)
- 🟠 15 (#22) **voiced register — the board's three numbers were that gate's own BASELINES, and 1,146 was the PRE-FIX count (`voicedCorpusRegister` records 1145 → 34 on 2026-09-19 via `degender.mjs`). My "they do not reconcile" was WRONG and is withdrawn.** What was genuinely ungated: the same defect in the FOUR files that gate never scanned — **202, now gated shrink-only** (middlegame-plans 165). The two gates partition; no overlap
- 🟡 19 open questions, not yet defects: #23 mistake-puzzle narration · #19 chat input after the player-games lane · #35 caching `voiceFacts` · #36 the Alapin tape's remaining prose · #69 a pinned need-coverage baseline · #42 the corpus study · #33 removal candidates

## 8. Bucket E — payload + delivery
- ✅ A new service worker may never take over a running page
- ✅ No un-positioned phrases in the boot payload (32.8 → 24.3 MB)
- ✅ 354 notes that described the video, not the board, are gone
- ✅ Post-deploy audits on live prod — SW 9/9, Learn 8/8, review 22/24
- ✅ 9. The fundamental-aware spine reader
- 🟠 0a. The two fundamentals reds, n=2 — the "all five flagged plies return `[]`" diagnosis does NOT reproduce off-audit: on a real game 6 of 7 flagged plies get a fundamental (PLAN). Re-measure against the review audit's own game; likely section-14-shaped (E-10), not coverage
- 🟠 0b. Review audit — **the driver RAISES the turning-point card and then destroys it** (diagnosed 2026-09-21; this line REPLACES a wrong one — see below). The recap phase clicks Forward up to 20 times to reach the closing. When the walk parks SHORT of the end the card has not been raised yet, so the driver's 45s wait honestly reports `present=false`; then one of those clicks lands on `moves.length`, the card raises and SPEAKS its ask, and the next click dismisses it — `handleWalkForward` dismisses by design and `turningAskedRef` stops it returning. Created and destroyed a second apart, after the driver had given up waiting. FIXED: `resolveCards()` runs every iteration of that loop, plus a reserved answering round after it, so the fix no longer depends on WHEN the card appears relative to the phases. 🔴 **DELETED, NOT ANNOTATED: the previous version of this line said "one latch produced four reds". That is wrong about this run.** The latch bug (`turningHandled` set on ENTRY rather than on success) is real on reading the code and is fixed, but the card was never raised DURING the walk on the pinned game, so the latch was never in play. A peer independently concluded "the card was never raised at all", which was also wrong — its ask was in the captured narration the whole time, one row from the failure, and the THESIS row printing the SAME sentence for "never appeared" and "never answered" is what let both readings stand for an hour. That message now distinguishes them. 🔴 **STILL OPEN and upstream of all of it: the walk parked at ply 67/69 for 350 seconds with NO card blocking it.** Not the latch, not the ordering, not FUNDLEAD — a third thing, and the one that starts the chain ✅ **AND THE PLY-67 PARK IS SOLVED — it was a PRODUCT bug, not an audit one** (2026-09-21). `handleWalkForward` returned `void`, so every early return in it was indistinguishable at the call site from "I advanced" — and the next auto-advance is only ever scheduled when the PLY CHANGES, so one silently consumed forward stopped the walk PERMANENTLY while `isAutoPlaying` stayed true and the button went on reading "playing". A real student sees a review that has died with no indication; the audit's poll never pressed play because it only presses on `data-state="paused"`. Two live paths did it: `if (questionPlan.has(atPly)) return` yielded the forward to a card that opens LATER IN THE SAME FUNCTION (so the card never opened on that step), and `if (principleQuizStateRef.current) return` sat under the comment "device quiz (hidden) — never opens", which is FALSE — `setPrincipleQuizState(quiz)` is called from `finishFaucetResume` and the card renders. A wrong comment is worse than none: it tells every reader not to look. **FIXED AT THE TYPE, not with a watcher.** `ForwardOutcome = {advanced:true} | {advanced:false; stop: ForwardStop}` plus `AUTO_ADVANCE_ON_STOP: Record<ForwardStop, 'reschedule'|'pause'>` — a new stop reason FAILS TO COMPILE until someone decides what auto-play does about it (proven: adding a synthetic reason gives TS2741, then reverted). A stop is now a real transition, so the button tells the truth. Enumerating the blocking overlays was considered FIRST and rejected as a watcher — it fixes the six we know and not the seventh. Gate: `useReviewPlayback.test.ts` "a forward that did NOT advance turns auto-play OFF", negative-controlled by reverting the pause transition and watching it fail. The audit also gained handlers for the five blocking overlays its table was missing (`review-principle-quiz`, `discussion-practice-panel`, `review-find-shot-reveal`, `review-cameo-playback`, `review-theory-playback`) — convenience now, not the load-bearing part ✅ **THE ORDERING FIX IS VERIFIED GREEN ON PROD** (2026-09-21, a peer's run on the deployed bundle): `[turning] card present; 2 candidate chip(s)` → `attempt 1: confirm=true reveal=true`, and BOTH THESIS rows went red→green (`thesis lines=1 legacy=0`, `ask@70 thesis@71`). Raised-then-destroyed is gone. Note `present=false` still prints at the walk-end wait and that is now CORRECT — the card genuinely does not exist yet at that moment; the recap stepping raises it and the loop now answers it there. RECAP `end reached=false` is still red and is correctly attributed: that is the ply-67 park, whose fix (ForwardOutcome) is still local at the time of that run ✅✅ **CLOSED — 43/9 → 48/2 on prod** (2026-09-21, one deploy carrying BOTH sessions' fixes, proven by grepping the live chunk rather than by its hash). `RECAP fundamentals-aggregate` is GREEN — *"The pattern: one of your four flagged moves stopped calculating too early"* — so the walk reaches the end and **the ply-67 park is closed**. `DRIVER answered-the-turning-point-card` PASSES: *answered in 1 round(s); reveal spoken*. Both THESIS rows green. Two rows remain: FUNDLEAD (0/4 flagged plies lead with a fundamental — another session's thread) and `CRIT spoken-names-count-and-stake`, which was the AUDIT being wrong, not the coach — see below
- ✅ **CRIT spoken-names-count-and-stake was MIS-SPECIFIED — a moment the question plan owns is SUPPOSED to be quiet in that register** (2026-09-21). `handleWalkForward` suppresses the critical beat when `questionPlan` already stops at that ply ("that card owns the moment — speaking the critical reveal first would hand it the answer"), so the row was asserting a contract the product deliberately does not hold — the same class as the retired R2 and the RECAP regex that pinned a phrasing which had stopped shipping. PROVEN on the run: the moment was selected at ply 68 with `played=Ke6`, and the turning-point reveal spoke *"The game turned at move 34, king to e6"* — the owner speaking, in its own register. **But the excuse is granted only on EVIDENCE**, because an unconditional yield to a sibling that never claims it is a real defect and the student gets nothing (measured on the same run at ply 64: *"the punishment Bd7+ is immediate — another fundamental owns it"*, and no other fundamental fired). So the row now has THREE outcomes, never two: spoken here (pass), CLAIMED elsewhere (pass, naming the line that claimed it), or SILENT (fail — the yield went nowhere). Matching is by SAN **and** by its spoken form, since the coach says "king to e6" and never spells SAN aloud
- ✅✅ **DONE — 2 / E2: the two-deploy service-worker check RAN AND PASSED 5/5 on prod** (2026-09-21, `scripts/audit-sw-two-deploy-prod.mjs`, report `audit-reports/sw-two-deploy-2026-09-21T07-24-57-069Z`). A live session was held on `index-CL9P6Cc6.js`, a real deploy landed underneath it, and: the new worker did NOT take over (`controllerChanged=false`, loads=2 against 2 driven navigations), **no hashed asset failed across two driven lazy navigations**, and the held session still worked (alive, 0 new page errors). That is the class that hit David's iPhone — `stockfish-error`, `lichess-error TypeError: Load failed`, no `app-boot` on reopen — proven survivable under a genuine deploy, which no single-deploy audit could reach.
  🔴 **AND IT DISPROVED THE PREMISE I HAD WRITTEN TEN MINUTES EARLIER — that line is DELETED, not annotated.** I claimed the check "must ride a deploy that changes the BUNDLE" because a docs/scripts/test push would emit a byte-identical chunk. **FALSE, measured:** the deploy under test was `0863ced7c..0adb4c90a` — three commits touching only `OUTLINE.md`, `PLAN.md`, two `scripts/*.mjs` and one `.test.ts`, with `git diff --name-only | grep ^src/ | grep -v .test.` returning **NONE** — and BOTH artifacts moved anyway: entry `CL9P6Cc6` → `BGt0uyLR`, `sw.js` md5 `5d5bc0fc…` → `75c244b2…`. **So EVERY deploy offers every live session a new service worker, docs-only included.** The handover risk is far broader than bundled changes, which also means this check can ride any push at all — and that the hold gate is load-bearing on pushes nobody thinks of as risky. The page in this run shows exactly that: `waiting:true, asked:true` — a new worker WAS offered and the page asked it to take over once quiet, and still nothing broke
- 🟡 **`readingGate` in `CoachGameReview.tsx` looks like DEAD STATE** (noticed 2026-09-21 while mapping `handleWalkForward`'s exits). `setReadingGate` is never called with a value, so the guard can never fire and `ReviewReadingChallenge` — which has its own test file — can never mount. Its own comment says "(defensive)", which is the tell. NOT deleted: the locked rule is verify-it-is-actually-dead-first and when-unsure-skip-or-ask, and I verified enough to suspect it and not enough to remove a user-facing surface. Deliberately declined as a way to manufacture a bundle change for item 2 — letting the instrument drive the product is backwards
- ✅ 3. The 8.2 MB entry chunk is a NON-ISSUE — closed by measurement 2026-09-20, no device needed. **ZERO** WASM/OOM/crash events on native in 60 days, and the zero is non-vacuous (same cut returns 14 other error types: `stockfish_variant` 873/94 devices, `ota_download_failed` 133/53, `tts_failure` 19/9). The OOM that motivated this item happened in an AUDIT browser under a mid-run deploy at 124 spawned threads, and in the memory-starved sandbox — neither is a real device, and its cause was THREAD COUNT, not bundle size. Download is irrelevant on native (`webDir:'dist'`, the bundle ships inside the app; 2.3 MB gzipped on web). Do not spend a night shrinking this. Only live engine signal: `stockfish_variant_fallback`, 3 events / 2 devices — watch, do not act
- ✅ 4. The 1,282 archived anchored danya notes STAY ARCHIVED (2026-09-20) — and the two reasons offered for calling them garbage both FAIL on measurement: **100% carry a `lineSan`** (median 10 plies; no `fen` field, but the line IS the anchor) and **0 of 1,282 are audience/parasocial talk** (1,275 board talk, 7 general chess principles; detector proven non-vacuous against 'subscribe', 'welcome back to the speedrun', 'shout out to my patreon'). They stay out for a DIFFERENT reason: the play surfaces take exact-position narration solely from the board-truth-verified voiced corpus, and ~3.8% of farmed position-keyed notes are mis-anchored — fluent prose about a different board, which reading cannot catch. 🔴 The one number that would reopen it, never run: how many of the 1,282 survive board verification against their own line Re-confirmed by David 2026-09-20: voiced is the sole exact-position source and coverage grows by growing the voiced corpus — not an open call, and asking again was the defect.
- 🟡 5. 57,204 un-positioned notes — a memory decision, never a boot one; never prune without measuring both ways
- 🟡 6. A cold first teaching reply draws on less corpus — watch it in the Learn audit
- ✅ 7. The corpus gates are even · ✅ 8. `BuildVersionWidget.test`
- ⛔ 10. **Section-14 detectors fire on nothing real** — theirs. The instrument half landed (`2d9f151`: each detector now names WHICH GATE it failed, so the 23% bucket is measurable); still never attributed on a real game

## 8b. Move grading — one currency, chess.com's (David 2026-09-20)

- ✅ **Review already matched** — `classifyCpLoss` has banded in EXPECTED POINTS
  (5/10/20 win% = chess.com's 0.05/0.10/0.20) since the accuracy work. The rot was
  everything DOWNSTREAM of it, which is why "match chess.com" turned out to be a
  sweep and not a build.
- ✅ **The drill queue** had its own `classifyCpLoss` on raw 100/300 — one move could
  be an "inaccuracy" on screen and a "mistake" in the drill it produced.
- ✅ **Imported games** (`gameImportUtils`) banded centipawns — the student's whole
  record labelled in a different currency from review AND from the site it came from.
- ✅ **Live play** (`moveRating.classifyMoveFull`) held preMoveEval/postMoveEval/
  playerColor and dropped all three at the call boundary.
- ✅ **`capabilityEvidence`** retyped `MISTAKE_CP = 100` locally — a second definition
  of "mistake" no change to the first could reach.
- ✅ Band computed ONCE in `accuracyService.bandForWinPctLost`; gated by
  `chessComBands.test.ts` (states the published table; proves the SAME 300cp is an
  inaccuracy at +9.00 and a blunder at +0.50).
- 🟠 **Behaviour change to watch:** the drill queue now SKIPS a move whose win% loss is
  under an inaccuracy. Puzzle counts can legitimately drop — that is not a regression.
- Deliberately NOT changed: `backwardLook`, `callInaccuracy`'s speaking floor. Those
  answer "is this worth SAYING" — pedagogy, a different decision from what a move is
  CALLED. Conflating the two is what caused this.

## 9. Carried over — the stale-tactics checklist (pickup §7)
- ✅ The whole `fen`-required sweep, both ref races, the gates, ship-check crash-as-green
- ✅ **ship-check crash-as-green, second half** — the guard read the child's stdout, which
  only catches a death it lives long enough to narrate; an OOM-killed/timed-out process
  prints nothing and still scored "0 errors". Now reads `spawnSync` status/signal/error
  first, extracted to `scripts/ship-check-lib/crashed.mjs`, tested (10, mutation-checked:
  the old logic fails 4), and gated in GATE_TESTS.
- ✅ `formatTacticsSubBlock` now takes the board fen as a required parameter
- ✅ `npm run ship-check` **printed READY TO PUSH** (2026-09-20, 348.6s, 11 commits on the tree): typecheck ✓, prod build ✓, lint 0 errors, content gates ✓, changed-file tests ✓. The one blocker was a redundant `String()` in a new measurement — `npm run lint` runs with `--report-unused-disable-directives`, which makes that an ERROR
- ✅ Read the `tactics-context-stale` count off the listener — 0 of 145 captured events, prod, non-vacuity proven
- ✅ `GameChatPanel.test` — MEASURED 2026-09-20: 16/16 green on a synced tree. The "red on untouched main" claim was stale and is deleted, not annotated
- ✅ Swept: ONE `crashed(out)` detector backs vitest, lint, tsc and the Playwright summarizer — the regex had already been hand-written twice, which is the drift the rot rule names

---

## THE OTHER SESSION'S BOARD — ⛔ THEIRS, DO NOT PICK UP (their report, 2026-09-20)

- ✅ All their work on `main` and live, bundle `index-BjQZ6ReX`. Nothing running or pending.
- ⛔ **The ~250 s regression** — the new insight sweep was AWAITED inside the function the review walk waits on. Detached and gated; their re-measure against the fixed bundle is the confirmation and is still owed.
- ⛔ **The wider critical fan**, a second slowdown candidate, unresolved until that deterministic re-measure.
- ✅ Three real bugs fixed on the way: the review path recorded nothing into the student model · four seat resolvers where only one read the declared seat · three fresh-game doors in Learn clearing different subsets of memory.

## WHERE IT STANDS IN ONE LINE

The loop is CLOSED and proven on prod in the RED direction, in both registers:
the coach learned the student in game A and said something different in game B.
What is left is the **ceiling** (the `other` attribution gap — another session),
the **wedge** (#21 — another session), and **GREEN** (the coach going quiet when
you improve). Green is the half of the main concept nobody owns: the mechanism
is built and has never once been shown to fire. See below.

## UNOWNED RIGHT NOW — and the ONLY one that is the main concept

**GREEN — the coach going quiet when you get better.** The heat map has three
states and the app can act on two. Measured 2026-09-20, not recalled:

| half | state |
|---|---|
| RECORD a hold (`capabilityEvidence`, both halves computed) | ✅ built, 8 modules |
| RECORD a miss | ✅ built, 21 modules — **the parity gap is 21 vs 8** |
| the PROFILE (`getCapabilityProfile`, prompted rows skipped) | ✅ built |
| a term that can LOWER need (`needScore.capabilityTerm`, held ≥ 3 + zero broken) | ✅ built, ONE production reader |
| **does real play ever reach held ≥ 3 with zero broken?** | ✅ **MEASURED 2026-09-20: YES, 6 of 6 game-seats, off ONE game each** |
| is the bar set right, i.e. does a proven tag SURVIVE later games? | ✅ **measured and re-set** — `posedImportance >= 80` is the knee (15 real games, 198 held rows): 2 proven, 0 later failed. The old effective bar of 65 gave 2 tags / 17 failure events |
| can a student who FIXES a weakness ever go green again? | ✅ **YES — fixed and gated.** `capabilityProven` reads `heldStreak`/`streakGames`, not lifetime `broken`; a break RESETS the streak rather than closing the door. Gate: capabilityEvidence.test 'GREEN IS RECOVERABLE'. Verified 2026-09-20: no production code gates green on lifetime broken (`broken > 0` survives only to classify RED) |
| **has a student's Nth game ever gone quiet because of games 1..N-1?** | 🔴 **NEVER SHOWN** |

🔴 **The "21 vs 8 parity gap" I read off `docs/STATE.md` is a GREP RATIO, not a
hole — measured 2026-09-20, corrected here rather than left standing.** The two
lists overlap and count readers as writers; the hold side is wired at every live
surface. There is no recording half left to build. What is unproven is
everything to the RIGHT of the record.

🔴 **AND THE FIRST NUMBER FLIPPED THE RISK.** The worry was that green could
never fire. It fires easily: every game-seat measured proved at least one
capability from a SINGLE game (`passive-king-endgame 7h/0b` — the board asked
seven times and quiet accurate moves answered). The RED guard works correctly
(one break holds a tag red however many holds it has, e.g. `passive-rook
6h/3b`). So the defect risk is not a wire that cannot fire, it is a BAR SET TOO
LOW — the coach going quiet about something the student never demonstrated,
which is absent-≠-mastered pointing the other way. `HELD_FOR_PROVEN = 3` is the number under test, and the
sequence measurement answered it: ONE STUDENT, FIVE GAMES IN ORDER,
`neglected-development` proven after game 1, still proven through game 4,
BROKEN in game 5 — so the coach would have gone quiet about it for four games
and then watched them do it again. One flip in five games, on the tag that
proved fastest.

✅ **FIXED — the defect this paragraph describes is closed (verified 2026-09-20).**
`capabilityProven` now reads a RECENT STREAK (`heldStreak` / `streakGames`) and
no production code gates green on a lifetime `broken` any more; the one
surviving `broken > 0` classifies RED, which is correct. Gate:
`capabilityEvidence.test` → "GREEN IS RECOVERABLE — a student who fixes it can
go green again" (33 capability tests green). The original finding, kept because
the reasoning is why the rule has its present shape:

🔴 **THE OPPOSITE DEFECT, found by the same run: GREEN WAS UNRECOVERABLE.**
`getCapabilityProfile` counts LIFETIME broken and `capabilityTerm` requires
`broken === 0`, so one break ever bars a tag from green permanently, however
many holds follow. The heat map exists to say "you have GOTTEN BETTER" and as
built it structurally cannot.

✅ **THE BAR IS NOW MEASURED, NOT CHOSEN (2026-09-20).** The first fix below
was the right SHAPE and the wrong VARIABLE, and the numbers said so: swapping
three lifetime holds for a 3-streak across 2 games moved flips 1 → 2, and a
full sweep found **2 flips at every count threshold from 3 to 6 holds and 2 to
3 games** — the count knob does not control the failure at all. What does is
`posedImportance`, already stamped on every row by `capabilitiesPosed` and read
by nothing. Over 15 real amateur games (198 held rows, real engine grades):

| difficulty floor | capabilities proven | proven then FAILED |
|---|---|---|
| 65 (≈ the old effective bar) | 4 | 2 tags, 17 events |
| 74–78 | 3 | 1 tag, 4 events |
| **80 (shipped — the knee, and a plateau with 82/84)** | **2** | **0** |
| 86+ | 1 | 0 |

So GREEN now requires a clean streak of **2**, spanning **2 distinct games**,
at **posedImportance ≥ 80**. The count is 2 rather than 3 because the sweep
showed it inert — it only ever created false negatives. An easy hold is not
evidence AND not a failure: it is skipped without resetting the streak. The
shipped bar is asserted on the real rows (`2 proven, 0 flipped over 13 games`),
and `summariseEvidence` / `capabilityProven` take the thresholds as optional
parameters purely so the calibration sweeps the REAL rule — baking the floor in
made the sweep report zero flips at every level, an instrument green for free.

Earlier, and still true: `capabilityProven` is now the ONE
definition of green, read by both consumers (it was written twice —
`needScore.capabilityTerm` and `studentMomentBoost.isUnproven` — which is the
duplicated-judgement the rot rule bans). Proven = a RECENT clean streak
(`heldStreak`) spanning at least TWO DISTINCT GAMES (`streakGames`), instead of
three lifetime holds with a lifetime-zero break count. A break now RESETS the
streak rather than closing the door, so a student who fixes a weakness can be
told so. Gates: six streak cases in `capabilityEvidence.test.ts` (one game is
not proven however long; two games are; a break ends it; green is recoverable;
a prompted row is neither; grey is never proven) and two new contracts in
`capabilityRead.test.ts`.

🔴 **AND THE HOLE THAT MADE THE BAR MOOT — `/coach/play` RECORDED NOTHING.**
`recordMoveEvidence` had exactly ONE call site, inside `evaluatePlayerMove`,
which `CoachGamePage` correctly stopped calling on 2026-06-04 (it ran a second
Stockfish pair and a second classifier that disagreed with the blunder
interceptor). The positive half was a side effect of that call and went with
it — so the surface where students play whole games against the coach
contributed ZERO holds, while mounting the hook with `capabilityOrigin:
'play'`, which makes it read as wired. ✅ Fixed by a `recordGradedMove` door
that takes the cpLoss the surface ALREADY computed, so the removed second
analysis cannot come back, and passes `gameState.gameId` — which is also the
game identity the new bar counts. Gates: three hook cases +
`playRecordsCapability.test.ts` (blames by statement, and asserts
`evaluatePlayerMove` stays gone).
Reports: `audit-reports/capability-green.json`,
`audit-reports/capability-green-sequence.json`.

🔴 **PROD RUN 1 REPORTED A GREEN THAT WAS NOISE, AND ITS NEGATIVE CONTROL
CAUGHT IT.** Three devices on one real amateur game (`PF8pYEpN`): control 2932
words, green 2464 (−468, "quieter"), prompted 2506→2320 — but the PROMPTED arm
must change NOTHING, since the profile skips prompted rows, and it moved more
than green did. A failing negative control invalidates the positive result; it
does not caveat it. Run 2 added a SECOND UNSEEDED CONTROL to measure the
instrument against itself: noise floor **117 words within a run**, while the
same unseeded config varied **592 words between runs**. Against that floor,
green moved **16 words**. Verdict: RUN UNUSABLE, printed by the audit itself.

🔴 **THE REASON IS THE SURFACE, NOT THE WIRE.** Review is `'walk'` posture, and
the locked rule (G4.5.15) is that on `walk` importance must NEVER decide
whether a ply speaks — every ply is a beat. So a term that LOWERS need cannot
make review quieter; it can only reorder. Green's quieting is only observable
on an `'interrupt'` posture surface (Play, live Learn), where silence is the
default and the coach must earn the interruption. **Retarget the instrument
there; the review arm proves nothing either way and should not be re-run.**

**POST-PUSH AUDITS, 2026-09-20 (bundle `index-DQWQNSty`, all four sequential, muted):**
- ✅ **loop (red) 6/6** — recorded, paired, B narrated differently, names A's opponent, and SPOKEN off the listener. The capability-path changes cost nothing that was working.
- ✅ **review, zero reds** — including the two fundamentals rows that were red in the last recorded run (RECAP aggregate + FUNDLEAD). NB that game had ONE flagged ply, so 1/1 is n=1, green rather than robust.
- ✅ **Learn, exit 0** — 27 spoken lines, the computed concept invariant voiced mid-game, 13 board lines gate-clean on perspective, 57 against the vacuity floor.
- ❌ **green — RUN UNUSABLE**, correctly refused (above).
- ✅ **`tactics-context-stale`: 0 of 145 captured events**, measured on prod 2026-09-20. ⚠️ The earlier "ZERO across all four runs" line reached the RIGHT NUMBER on NO EVIDENCE — until today `grep -rl tactics-context-stale scripts/` returned nothing, so no audit captured the event and that zero was absence-of-capture. Same answer, real instrument: G5a asserts the listener captured events at all, and runs first.
- Noted for the other session's #21, not acted on: `workers=60` alive on the review reopen, inside the band their census tracks.

✅ **THE MECHANISM IS VERIFIED AT THE DECISION POINT, AND IT IS NARROW BY
CONSTRUCTION (measured offline, 2026-09-20).** Rather than build a four-arm
browser instrument for an interrupt surface and discover the effect size
expensively, the same real recorded plies were run through the real
`computeNeed` with and without a proven profile: **198 of 198 clean posed plies
were LOWERED, by 25 each**, so the term fires exactly where it should. But one
proven tag is −25 and the term is capped at `NEED_THRESHOLD`, so green can only
ever SILENCE a ply whose need sits in **50..99** — below that the ply was
already silent, above it it still speaks.

So the prod picture is fully explained: the wire is live, review cannot show it
(walk posture narrates every ply), and on an interrupt surface only plies inside
that band will flip. 🔴 **A first cut of this measurement reported "0 flipped"
and that was the FIXTURE, not the product** — the synthetic plies scored 35
against a threshold of 50, so nothing spoke before green either. It now reports
the effect size and the band instead of a count that could only ever be zero.

**THE OPEN QUESTION IS DAVID'S, and it is a design one, not a bug:** is −25 per
proven capability the right weight? Green currently cannot quiet a ply the rest
of the model wants loudly (need ≥ 100), by design. Making it proportional, or
letting multiple proven tags stack past the cap, would widen the window — and
is exactly the kind of change that should be measured against the flip count
first, the way the bar was.

That is the exact shape the RED direction was in before WO-LOOP-01: every half
built and gated in isolation, the sentence never demonstrated end to end. The
red half was proven by SEEDING game A and reading game B's tape; green is
provable the same way, and the measurement comes first because if real play
never produces a proven capability then the lowering term can never fire and
`HELD_FOR_PROVEN` (or the posing bar) is the defect rather than the wire.

Not the main concept, and explicitly deprioritised (David 2026-09-20: "the
register doesnt get up to closing the loop"):
- 🟠 **FUNDLEAD — cause NAMED by measurement (2026-09-21), two halves left.** FUNDWHY's
  first run named it: the 150cp floor silenced the inaccuracy band (costs 104/99/86/74/72/69,
  all above INACCURACY_CP and below 150). ✅ FIXED — the gate is expected points now, and
  the recap spoke the result: "one of your four flagged moves stopped calculating too early".
  Still open, and neither is the floor:
  - 🔴 **the punishing PV is not persisted** for the mistake/blunder plies (`pvP` 0-1 plies,
    detector needs 3) — now the dominant cause.
  - 🔴 **an unconditional deferral**: "the punishment X is immediate — another fundamental
    owns it", and none fires. A yield must be conditional on the claim LANDING. Third
    instance of this shape tonight; the two that worked were fixed by making the yield
    check the handoff, or making a yield naming no claimant fail to compile.
- ✅ **FUNDLEAD's row was itself blind** — FUND_RE could not see 25 rotations across 15
  fundamentals, so it scored correct teaching as "no fundamental". Now derived from the real
  renderers and gated (`fundLeadStems.test.ts`), every rotation, negative-controlled.
- 🔴 C15 the voiced corpus register — a real defect the student hears, but polish next to the loop.
- 🔴 **C15b lesson BEATS are unscanned for gendered pronouns** — the peer's fix made the
  beat arm live (it read a field that does not exist, so it scanned nothing, ever). GENDERED
  never covered authored beats. Do NOT close by raising the 202 ceiling — that blesses rot;
  scan, read a sample, degender offline, then ceiling the ambiguous remainder.
  📌 **DON'T WRITE A NEW SCAN — the discriminator already exists and already runs** (2026-09-21). `curatedBeatSource.beatRegister` classifies a beat `spectator` when `PLAYER_PRONOUN = /\b(?:he|him|his)\b/i` appears in a SENTENCE that also names a colour — deliberately sentence-scoped so a historical aside ("Fischer and his 1972 match") is not swept up with "…and HE takes away Black's pin". That is exactly the distinction C15b needs, written and in production. A fresh grep for he/his would re-derive it worse, and would conflate the two cases the register rule keeps apart: "White develops the knight" is CORRECT for Watch, a gendered pronoun standing for a PLAYER never is.
  📌 **AND THE LIVE BLAST RADIUS IS ALREADY ZERO.** Those beats are `spectator`, and `curatedBeatAt` takes the surface's register as a REQUIRED parameter and refuses them on live boards. So this is not rot reaching a student mid-game — it is rot in the WATCH register, where the beat is otherwise correct. That bounds the item: measure with `beatRegister`, count only the beats whose spectator verdict comes from the pronoun clause rather than from theatre or own-side, and degrade THOSE offline. Ceiling the ambiguous remainder, never the whole count
- ✅ 11e the test-type-error ceiling 236 → **0**, now a hard gate — see §6 for the shapes and the two dead/red gates it exposed.
- 🟠 **A DEPLOY WITH ZERO BUNDLED CHANGES STILL EMITTED A NEW ENTRY HASH — so the hash is not a CONTENT detector** (measured once, 2026-09-21, n=1). `0863ced7c..0adb4c90a` touched only `.md`, two `scripts/*.mjs` and one `.test.ts`; `index-CL9P6Cc6.js` → `index-BGt0uyLR.js` and `sw.js` md5 `5d5bc0fc…` → `75c244b2…` anyway. **What that DOES prove:** identical client content does not imply an identical hash, so a changed hash carries no information about what the client will run — only that a build happened. **What it does NOT prove is "every deploy"**: one observation disproves the implication, it does not establish the general rule, and an earlier note of mine that said "EVERY deploy offers every live session a new worker" overstated exactly that — corrected here rather than left standing. TO SETTLE IT: capture entry-hash + `sw.js` md5 across the next three or four deploys, at least one of them genuinely bundle-identical. **WHY IT MATTERS, scoped honestly:** if it generalises, every push re-downloads the ~8.6 MB entry for every WEB reader and every OTA recipient, docs-only pushes included — a cost question for David, and a different question from §6 item 3 (which closed the MEMORY/parse concern, not the transfer one). Native App Store users are unaffected while the bundle is local (`capacitor.config.ts` `webDir: 'dist'`)
- 🟠 **G1's "verify the bundle hash advanced past your push" is weaker than it reads — FOR DAVID TO DECIDE, not to be edited into CLAUDE.md by a session.** It was written for STALENESS and it answers that correctly. But two sessions read it tonight as "my code is live" and reached opposite wrong conclusions within ten minutes, and the finding above shows the signal cannot support that reading at all. The check that does: grep the live chunk for a string only the new build contains, AND for the string it replaced. Recorded here so the decision is his
- ✅ E2 the two-deploy service-worker check — **RAN AND PASSED 5/5 on prod 2026-09-21**; see §6 for the run and for the finding that every deploy (docs-only included) offers a live session a new worker.
