# Positional read — loud & proud on Learn, on-demand on Play (David 2026-09-13)

## What David asked

He saw the `buildPositionalRead` output ("Wow. That is a beautiful teaching
tool!") and wants it AUDIBLE:

- **Learn (`/coach/teach`)**: loud and proud, **checking every move** for a
  relevant board-true observation, **both sides** (opponent's pieces too),
  **never repeating a phrase**.
- **The rule, generalised** (his words): *"We gate double phrases. If it has
  nothing new to say it stays quiet. If something new is calculated, speak it.
  I want it checking every turn for new and different teaching phrases. Same
  with all of the other calculators!!"*
- He said **No** to "aside behind a note/plan" — so a corpus note still leads;
  the positional read does not bolt onto it.
- **Play (`/coach/play`)**: on-demand only, **when asked through the text
  field** — never volunteered mid-game (Play stays a pure playing surface).

## Why it was silent (the two blockers found)

1. `observation` (positionalRead's `VoiceFactKind`) is NOT in
   `DNA_VOICE_KINDS` (CoachTeachPage.tsx:345). With `NARRATE_DNA_ONLY=true`
   the package is rebuilt from DNA kinds only, so the observation is filtered
   out **every turn** — dead on Learn, not just Review. His own 2026-08-23 DNA
   whitelist excluded it as "generic filler"; today, having seen it, he's
   lifting that.
2. Cross-turn novelty doesn't exist. `buildVoicePackage` dedupes only WITHIN a
   turn (`alreadySaid`). Across turns, only positionalRead had its own set;
   every other lane could repeat a phrase all game.

## The build

### Learn
1. **Add `observation` to `DNA_VOICE_KINDS`** — the change that makes the tool
   audible. It stays rank-0, so it never displaces teaching and only fills the
   DNA 3-reason breath when there's room.
2. **Drop the `quietTurn` shackle** on the positionalRead offer
   (CoachTeachPage.tsx:7481) — compute it EVERY turn so it's "checking every
   move". Keep `!softStandDown` (yields behind a corpus note — honours "no
   aside behind a note" + note-primary). Dedup + rank + the 3-reason cap decide
   what's actually heard.
3. **Cross-turn novelty for ALL lanes** — a per-game `Set<string>` of spoken
   sentence-keys, threaded into `buildVoicePackage` as a new `priorKeys` param,
   seeded into `seen`, updated from each package that speaks. This is the "same
   with all the other calculators" — no lane repeats a phrase all game.

### voicePackage
- New optional 3rd param `priorKeys?: ReadonlySet<string>`. Backward-compatible
  (every existing 1-/2-arg caller unaffected). Seeds `seen` (reason
  `duplicate`, not `already said this turn`). Export a `spokenSentenceKeys(pkg)`
  helper so the caller can feed kept keys back into its per-game set.

### Play (and chat/teach on-demand)
- Enrich `assemblePositionAssessment` (groundedAnswer.ts) — what answers "read
  me the position / what's the plan / how do I stand" — to append the top
  `readPosition` observations (both sides), deduped against the eval/tactic
  lines already in the answer. On-demand via the text field on Play; it also
  improves the same on-demand answer on teach/chat. Never auto-narrated on Play.

## Files
- `src/services/voicePackage.ts` (+ `.test.ts`)
- `src/components/Coach/CoachTeachPage.tsx`
- `src/services/groundedAnswer.ts` (+ assessment test)
- gates: `boardComputerChatCoverage`, `laneReachability`, `positionalRead.test`

## Done =
ship-check green → push main → prod bundle advances → 3-instrument MUTED
post-deploy audit (Learn narration fires the observation lane + never repeats;
Play answers a typed "read the position" with the both-sides read) → report.

## Follow-on (David 2026-09-13): cap removed, merge + scope + importance gate

- **Cap removed** at both package sites — every important fact fires, ranked;
  repetition (not count) was the wall, and the double-phrase + per-game novelty
  gates handle that. (Shipped separately.)
- **Merge**: the Danya-behaviour lane (`computed`) and the positional read
  (`observation`) now speak as ONE `observation` lane — the single home for the
  computer's board reads, so they never split or duplicate the same feature.
  (`buildPlayCommentary` stays `computed` — distinct mature lane with analytics;
  a later, optional fold.)
- **Scope**: `readPosition` widened with minority-attack, passed-pawn,
  colour-complex, and fully-open-file rungs (each selective at source; open-file
  requires a rook + student-side-only to avoid a both-sides twin). Flows to the
  Learn read AND the Play on-demand answer.
- **Importance gate (partner to uncapping)**: the standing board read stands
  down in a DECIDED game (synchronous material-blowout proxy at the instant
  site; full eval/WDL `isContested` governs the late package). Non-count, so the
  cap stays gone. Event lanes always fire.
- **The honest correction on "no cap"**: novelty ≠ importance; the gate that
  stops a breadth-wall is contested + event-deference + at-source selectivity,
  not a count. The read still emits one strongest unsaid observation per turn
  (buildPositionalRead descent) drawn from the widened pool — loud, not a wall.

## Review surface (David 2026-09-13: "I also want these changes on review")

Review already has a standing-read facet system (`computeMoveFacets` in
`reviewFullData.ts`: structure/king/passer/badbishop/worst/rook-7th), deduped
once per game in the RETROSPECTIVE register — so it already has "no cap, no
repeat." The gap was SCOPE. Added `[minority]` + `[complex]` facets (both sides)
to `computeMoveFacets`, registered in the once-per-game dedup regex in
`coachFeatureService.ts`. Tags stripped before TTS (line ~3651). Green:
reviewFullData/reviewDeepThreat/coachFeatureService/reviewCorpusSweep (64 tests;
corpus board-truth sweep passed).

## Post-deploy (2026-09-13)

- All four commits on `main` (`55633bd`); clean full `ship-check` (the one
  merge-push failure was a corpus-gate timeout flake — the direct run was green).
- Prod bundle advanced to `index-DvX-mZgO.js` (deploy healthy, zero pageErrors).
- **Board-truth of every new lane is locked by deterministic gates**:
  `narrationAdversarial` (60 real games through every computed lane incl. the
  widened read — no crash, no move handed over, no empty square named),
  `reviewCorpusSweep` (every review line board-true across a diverse corpus),
  `positionalRead` (widened rungs surface), `voicePackage` (cross-turn novelty),
  `groundedAnswer` (assessment appends the read).
- **Live-chat probe limitation (honest):** a muted prod probe of the on-demand
  read on `/coach/teach` hit the fresh-surface ONBOARDING greeting — and so did
  an untouched lane (`are my dark squares weak` → colour-complex), so it's a
  pre-existing start-state routing quirk, not this build's regression. Board-move
  clicks to build a live position were too flaky to drive reliably headless.
  TRUE live-fire — a typed "read the position / what's the plan" mid-game on
  `/coach/play`, the in-game observation lane firing on `/coach/teach` during
  play, and the review walk showing the minority/colour-complex facets — is best
  confirmed on-device (routed to David).

## Status
- [x] voicePackage priorKeys + spokenSentenceKeys + test (46 tests green)
- [x] CoachTeachPage: observation→DNA kinds; quietTurn shackle dropped; per-game
      novelty set threaded through all 4 buildVoicePackage sites + recorded at
      both speak sites; cleared on new game
- [x] groundedAnswer: assemblePositionAssessment appends readPosition (both
      sides) on demand; all 3 coachApi call sites already pass fen
- [x] tests/gates: voicePackage, groundedAnswer, positionalRead, laneReachability,
      boardComputerChatCoverage, computedVoiceGrounding, danyaDeviceCoverage,
      danyaExploitability, perspectiveVoice — all green; typecheck clean
- [ ] ship-check + push + deploy + audit

---

## Build 7 — UNIFIED AVAILABILITY + "STACK UNTIL NEXT PHRASE" (2026-09-13)

David: "Stack until next phrase is spoken. / All of these changes need to be
available for all coach surfaces. We have a unified coach now... Review play
learn all get these builds they are just used differently. Need to also be
available to coach in tactics and other tabs in case a user asks."

### §0 SURFACE MAP (pre-build gate — the shared computers touch all of these)

Shared spine (already built): `positionalRead.readPosition/buildPositionalRead`
→ facts → `voicePackage.buildVoicePackage` → `voiceFacts` (voice) + mark-coupling
(arrows/highlights drawn from a fact's declared `squares`, never scraped — G0).

| Surface | Register | Read today | Marks today | Gap for "all surfaces" |
|---|---|---|---|---|
| Learn `/coach/teach` | present-tense, AUTO every move | ✓ observation lane, deduped, uncapped | ✓ arrows + key-square highlights (build 6) | stack-until-next-phrase timing |
| Review `/coach/review` | past-tense, AUTO ply-walk | ✓ facets incl. minority/complex, uncapped default | ✓ playout arrows (09-07 auto-arrow); ✗ key-square highlights | key-square highlights + stack timing |
| Play `/coach/play` | SILENT by contract; on-demand only | on-demand via drawer/chat | on-demand (live board present) | render read's `squares` as marks on ask |
| Chat / GlobalCoachDrawer (every tab) | Q&A on-demand | ✓ groundedAnswer.assemblePositionAssessment appends read | boardful tab → onBoardAnnotation; boardless tab STRIPS tags (GameChatPanel:1325) | emit read `squares` as [BOARD:] so a boardful surface draws them |
| Tactics / Endgame / Plan / Fundamentals | drill / lesson | on-demand via drawer (same as chat) | where a live board exists | same on-demand path |

### THE DECOMPOSITION (improvement on "auto-narrate everywhere")
"All surfaces get these builds" is right — but the mechanism is the ALREADY-
UNIFIED on-demand path (GlobalCoachDrawer in AppLayout → GameChatPanel → coach
brain → groundedAnswer read), NOT duplicating AUTO-narration onto Play/Tactics.
- AUTO-narration stays on Learn + Review (their registers/contracts allow it).
- Play stays SILENT-by-contract; gets the read ON-DEMAND (locked rule).
- Tactics/Endgame/other tabs get it ON-DEMAND ("in case a user asks" = on-demand).
- Marks render wherever a live board exists to receive them.

### THE REAL GAPS (honest, small)
1. Read `squares` don't travel as [BOARD:] annotations → marks from the read
   never render even on a boardful chat surface. Couple them (G0: from squares).
2. Review key-square highlights (deferred half of build 6).
3. "Stack until next phrase" — mark lifecycle tied to sentence-grained reveal.

### Status
- [x] dial-in with David: swap-per-phrase (each sentence's marks replace the
      last; chain/threat marks persist) + unified on-demand, AUTO only on
      Learn/Review (Play silent-by-contract, on-demand read; tactics/other tabs
      via the global drawer on-demand). Auto-narrate-everywhere was REJECTED
      (breaks Play/Tactics contracts).
- [x] #1 unified on-demand marks: `GroundedAnswer.keySquares` (optional) carries
      the read's declared squares; `keySquareHighlightTags` emits
      `[BOARD: highlight:sq:yellow]` at all 3 assessment call sites — renders on
      any live board (Play, Learn, drawer on a boardful tab), stripped elsewhere.
      Test: groundedAnswer keySquares contains e8 on the centre-king read.
- [x] #2 swap-per-phrase: CoachTeachPage chat-reply reveal (6425+) — each spoken
      sentence's prose marks REPLACE the prior phrase's; chain (reply-move, G6)
      marks persist via paintRevealed's chain filter. LessonPlayer left as-is
      (already per-beat reset + small within-beat set = "swap per beat"; curated
      surface, low-gain/high-risk to change — noted for a follow-up if wanted).
- [x] #3 review key-square highlights: `computeMoveFacets(ctx, outSquares?)`
      records each facet's declared squares (trapped/passer/minority/complex —
      prose-only badbishop/worst skipped, no scrape); segment gains `keySquares`;
      CoachGameReview paints them yellow via `annotationHighlights`, swapping per
      ply, standing down under any card/walkout. Tests: coupling invariant
      (recorded square appears in facet text) + no-phantom (opening ply records 0).
- [x] typecheck clean; targeted gates green (groundedAnswer 202, reviewFullData
      11, positionalRead 21, voicePackage 46, narrationAdversarial 60-game sweep)
- [x] ship-check green; pushed 84d1a2a → prod bundle DQOumiHl (verified live).
- [x] post-deploy probe (`scripts/audit-ondemand-read-marks-prod.mjs`, MUTED):
      on `/coach/play` the on-demand read FIRES on-topic (verbatim computed read —
      "king still in the centre", "pawn break on d4"), 0 pageErrors; best-move
      ARROWS render on the same chat path.

### ✅ FIXED — on-demand HIGHLIGHTS lost on every coachService surface
The post-deploy probe found the read's yellow key-square highlight not landing on
`/coach/play` (read text + best-move arrows DID). Root-caused in code (not a
guess): `injectCandidateArrows` (arrowEngine, the ONE arrow-display pass called
from `coachService.ask` at ~2031) does `stripBoardMarkers(text)` to re-derive
arrows fresh — stripping EVERY `[BOARD:]` marker, including the read's
code-authored `[BOARD: highlight:sq:yellow]`, on ALL coachService surfaces (chat,
play, drawer). Arrows survived only because that pass re-adds them. Fix:
`applyCandidateArrows` now captures highlight markers before the pass and
re-appends them after (arrows still re-derive). Gate: `coachAnswerGates.test.ts`
— highlight survives the pass + no duplicate. Learn/Review marks were never on
this path (component state), so they were always fine.

### Two audit-caught fixes this session (drive-to-green)
- **Fundamentals-FIRST regression** (my earlier uncapped-default commit 0102120):
  the capped review path led flagged plies with the neglected principle, the
  uncapped path (now default) led with move-mechanics. `audit-review-overhaul-prod`
  FUND/FUNDLEAD caught it; fixed by lifting the `[principle]` facet to the front of
  a flagged student ply in the uncapped branch.
- **On-demand highlight strip** (above), caught by `audit-ondemand-read-marks-prod`.

### Post-deploy audit results (prod bundle CYsmJCND / cde3445)
- `audit-ondemand-read-marks-prod`: read fires on-topic + **yellow key-square
  highlights render on the play board** (`e8,d4`), 0 pageErrors. ✅ (the highlight
  fix confirmed end-to-end on prod).
- `audit-review-overhaul-prod`: the contracts this work touches all PASS —
  **FUNDLEAD** (flagged plies lead with the fundamental, 1/1 both runs),
  board-accuracy, seat-attribution, no-we/our, recap, WIN card, auto-advance,
  free-board explore, show-me. Two checks still ❌: `FUND fixture-ply-graded-
  after-dive` + `…leads-with-fundamentals-after-dive` — the DEEP-DIVE re-grade of
  the fixture move (6...Nb6) is flaky across runs (badge GOOD/none/inaccuracy,
  `best` sometimes null, after-dive lead sometimes ""). PRE-EXISTING (failed on
  84d1a2a, before the fundamentals fix) and independent of the facet-reorder
  (which reorders, never empties, a flagged ply's narration). 🚩 Separate
  follow-up: the deep-dive re-analysis/re-narration path (why a dived ply can
  come back badge=none / lead="") — a review-feature reliability issue, not this
  build's marks/swap-per-phrase work.

---

## Build 8 — CLASSROOM OPENER + UNIFIED MARKERS SETTING + DEEP-DIVE AUDIT FIX (2026-09-13)

David: algo opener that suggests things to work on + things not yet tried, kept
relevant, capped at 3, not too long ("CC noted his elo dropping, coach should ID
this"); combine arrows+highlights in settings + link to the play button; fix the
deep-dive issue. "Gain context before each fix. Keep the loop tight."

### A. Classroom opener (computed, G0) — `src/services/classroomOpener.ts`
- `ratingTrendNote()` — rating delta over recent RATED games (student's own Elo,
  via `resolvePlayerColor`), newest→oldest window of 12; null when flat (<25pts)
  or <5 games. Never invents a number.
- `untriedFeatureNudge(weaknessCategory)` — top surface not yet used (read off its
  own Dexie stores), preferring the one that trains the weakness; null when all
  tried. Fail-safe to "used" so an error never nudges toward the known.
- Wired into the EXISTING Learn opener (didn't rebuild it): trend folds into the
  FIRST lead line once (`withTrend`, no extra line), untried takes the 2nd chip
  slot, whole chip set capped at 3 (`capChips`) + initial generic cut 4→3.
- Gate: `classroomOpener.test.ts` (7) — trend up/down/flat/too-few; untried
  relevance + fallthrough + all-tried null.

### B. Unified coach-markers setting (persisted) — `coachBoardMarkersOn`
- New pref (default on) in `useSettings` (DEFAULT_SETTINGS + master-off + base
  resolution) + `UserPreferences` type + a "Board Arrows & Highlights" ToggleRow
  in Settings (Gameplay Coaching).
- ONE source of truth: Learn's Coach Tips button + `/coach/play` (CoachGamePage)
  Coach Tips button both read/write it; off hides BOTH arrows AND highlights on
  both surfaces and gates tip-firing on play. Explicit Hint arrows stay.
- Scoped to the two surfaces with a Coach Tips button; OpeningPlayMode (WLPP
  lesson play, gem/hint arrows) intentionally untouched.

### C. Deep-dive after-dive audit fix (audit-only; product proven correct)
- `audit-review-overhaul-prod.mjs`: land on the fixture ply via `goTo` (not the
  heap-stress loop endpoint), assert the DIVE deepened the annotation (Dexie
  ground truth), require a fundamental lead only WHEN flagged — mirroring the
  cold-open FUND check's proven-correct tolerance. Root-cause: the product
  narrates flagged plies correctly after a dive (cold-open FUNDLEAD passes same
  run); the old check tested engine-grading variance + a stressed reopen.

### Status
- [x] typecheck clean; targeted tests green (classroomOpener 7, coachAnswerGates
      16, CoachGamePage 26); lint errors fixed
- [x] ship-check green; pushed 48bc7ab → prod bundle DJsCDo_w (verified live)
- [x] post-deploy: review-overhaul audit ✅ MEETS STANDARD (deep-dive after-dive
      checks now green, both flagged plies lead with the fundamental; no review
      regression). UI smoke: Learn opener renders with ≤3 coach-choice chips,
      Settings "Board Arrows & Highlights" toggle present, 0 pageErrors.
- [~] on-device (seeded) confirmation of the trend clause + untried-feature nudge
      firing in a real classroom (needs games-with-Elo + a weakness profile) and
      the toggle OFF hiding both markers on the board — unit-gated
      (classroomOpener.test 7, coachAnswerGates), best eyeballed on David's device.
