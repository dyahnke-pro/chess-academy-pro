# Post-game review overhaul — PLAN (2026-09-05, not yet built)

**David's asks (2026-09-05), restated:** (A) the review blocks on a very long
analysis even though the import sweep already analysed the game, and re-opening
the same game restarts it; (B) the "better move" mini-walk plays itself — make it
button-only; (C) the main ply walk should play itself — slow, steady, waits for
narration, ~0.5s pause, then next move; (D) the board is locked — unlock it,
remove "Explore this position", any piece move IS exploring, and the coach must
narrate those moves; (E) every mistake must relate back to the fundamental the
student neglected, when there is one (the Alapin knight: same piece twice, gave
space, handed a tempo).

**Where the previous session left off:** the bulk-sweep speedups are on `main`
(`9fcbf13`…`eabcac6`, all 2026-09-05): 800ms/position batch budget, book-ply
skip, 3-worker phone pool, native-singleton budget. Nothing on the REVIEW side
has changed yet. This plan is entirely the review side.

**The example game, engine-verified (Stockfish 16, depth 18):**
KaiserlicheHoheit–Knight_Mare_01, chess.com daily 1023640032, Alapin (B22).
After `6.Nc3` best is `6...e6` (−0.14); the played `6...Nb6` is +1.19 for White
(≈105cp, a mistake). Refutation PV `7.d5! Ne5 8.a4` — the centre pawn gains
space, `a4–a5` hits the knight again. All three fundamentals David named are
board-true: knight's 3rd move (f6→d5→b6) with both bishops home, d5 conceded to
`d4–d5`, tempo handed (Nc3 hit it, d5 hits Nc6, a5 hits Nb6). `11...Nd5` was the
engine's top move — fine. This game is the fixture for every gate below.

---

## A. Analysis: trust what exists, deepen in the background, never re-crunch

### Disease (not "missing cache")
Review and bulk sweep already write the SAME record — `games.annotations` +
`fullyAnalyzed` + `analysisDepth` (`gameAnalysisService.ts:977` vs `:1262`).
The review rejects it through one gate, `gameNeedsAnalysis`
(`gameAnalysisService.ts:1027`): `depthUpgrade && analysisDepth < 16`.
- `analysisDepth` = the **minimum** depth over every position (`:583/:595/:611`,
  `:833/:857/:940`). The batch sweep (800ms) reaches ~10–13 on a phone → rejected
  → the review re-runs **all 81 positions at 5s each** (`REVIEW_POSITION_BUDGET_MS`
  `:488`), not skipping book plies (`:837`). 90–135s on iPhone; 216s measured.
- **The restart-on-reopen bug:** the review's own 5s search stalls at depth 15
  on one hard middlegame position → `achievedDepth = 15 < 16` → the game is
  re-flagged **forever**. Min-depth is the wrong staleness key.
- The walk's narration (`generateReviewNarration` → `buildReviewSegments` →
  `voiceReviewLines` LLM warm) is never persisted; every open re-pays the LLM
  pass. `useReviewEngineLines` MultiPV is memory-only (`useReviewEngineLines.ts:53`).

### Fix
1. **Render immediately when annotations exist, any depth.** The review-open
   path calls `gameNeedsAnalysis(rec, { depthUpgrade: false })`
   (`CoachReviewSessionPage.tsx:277`). Blocking spinner ONLY when annotations are
   absent entirely.
2. **When absent, run the FAST pass** — the batch budget (800ms/ply, book plies
   skipped, pool) — then render. ~20s on phone instead of 2–3 min.
3. **Deepen selectively, in the background, non-blocking.** After render, a
   `deepenReviewPlies(gameId)` job re-searches ONLY what the walk consumes:
   flagged plies (inaccuracy+) and `miss` plies → `bestMove` at depth 18
   (the sweep already does this per `:756-776`, so a swept game needs nothing),
   plus the top-3 swing plies for the summary. Patches `annotations[i]` in place,
   one `db.games.update` at the end. UI: a small "sharpening…" pill on the summary
   card; a deepened ply refreshes its segment only if the walk hasn't reached it
   (never rewrite text under the student). Accuracy % recomputes when it lands.
4. **Replace the staleness key.** Add `GameRecord.analysisTier: 'batch' |
   'review'` (+ per-annotation `depth`). `gameNeedsAnalysis` becomes: no
   annotations → true; legacy-unit → true; otherwise **false**. "Needs
   deepening" is a separate, non-blocking predicate (`tier === 'batch'` or any
   flagged ply with `depth < 18`). Review tier is terminal → the re-run-forever
   loop dies. Keep `analysisDepth` written for back-compat readers.
5. **Persist the narration.** `games.reviewNarration = { rev: REVIEW_NARRATION_REV,
   annotationsHash, segments, summary }`. Re-open = instant. Invalidate on
   annotation change (deepen lands) or rev bump. Dexie: unindexed field on
   `games`, no schema bump needed (v34 stays).
6. Sweep for the same pattern: `AnalyzeGamesButton`, `GameInsightsPage`,
   `GameViewer` all route through `gameNeedsAnalysis` — verify none regress.

Pushback on the framing: "use the pre-analysis to help" undersells it — the
pre-analysis IS the review's data; the fix is to stop distrusting it and to move
deepening off the critical path. Trade-off to accept: on a never-swept game the
walk starts on batch-depth evals; a borderline inaccuracy may reclassify when
the deepen lands (surfaced by the pill, never silently).

Gates: `gameAnalysisService.test.ts` (rewrite `:159-204` to the tier contract:
batch-tier game does NOT block; review-tier game never re-flags; deepen touches
only flagged plies), new `reviewNarrationCache.test.ts`.

## B. "Better move" playout — button only, and narrated

- Kill the auto-fire effect `CoachGameReview.tsx:2008-2026` (walk-the-line
  plays itself on ply landing). The `walk-the-line-btn` (`:3629`) stays.
- "Show me" (`walk-show-me-btn` `:3531`) currently runs the SILENT 4-ply
  `runShowMePlayout` (`:3103-3199`, timers 350/600ms, "no narration" by design).
  Rewire it to the narrated `playBetterLineOut` (`:1307-1400`) — real PV via
  `computePvLine`, per-ply why from `PlyFacts`/`buildReviewMoveTeaching`,
  voiced through `voiceReviewLines`, closing eval verdict. It is dead code today
  (its only trigger `pendingBetterLineRef` is never assigned, `:1225/:1664`).
  Paced by the same voice-then-0.5s pacer as §C. Main-walk auto-advance
  pauses for the playout; resumes on "Resume game".
- Delete `runShowMePlayout` + `pendingBetterLineRef` remnants after rewire.

## C. Main walk auto-advances — voice-gated, ~0.5s, pausable

- `useReviewPlayback` gets `autoAdvance` state. `commitPly` already awaits
  nothing (`:261` sets ply, `:312` fires `speakForced` and forgets). New: the
  speak promise resolution (`:222-226`) → `setTimeout(advance, PAUSE_MS)` → calls
  **`handleWalkForward`** (not `goForward`) so find-shot / trap / rewind /
  turning-point stops still fire at their planned plies. Token-guarded like
  `useStrictNarration.playStep` (`useStrictNarration.ts:109-153`) — same contract,
  don't build a second timer scheme.
- Pause rules: any open card pauses; card resolve resumes. Back / jump / move-list
  tap / any board drag pauses (manual = intent). Forward tap while paused =
  single step. A real Play/Pause control returns to `review-nav-controls`
  (`:3555`) — the "Stop narration" rename at `:3597` existed only because there
  was no auto-advance.
- Silent plies (no narration text): fixed ~800ms hold (matches the
  `useStrictNarration` floor). Voice OFF (`coachReviewVoice`): text-proportional
  hold (reading WPM, as `WalkthroughMode` `READING_WPM`).
- Pause tiers (fork Q1): 500ms after unflagged plies; ~1500ms after flagged
  (inaccuracy+) plies so the eye lands on the arrow before it moves on.
- Stops at the last ply (turning-point card owns the end).

## D. Free board, no Explore button, narrated exploration

- `walkBoardInteractive` (`CoachGameReview.tsx:3062-3068`) → `true` unless a
  playout is running (show-me / sequence / cameo / theory playback). Drop the
  `walkExploreToggleOn` state + the `walk-explore-toggle-btn` (`:3516-3530`).
- Drag start / square click = explore: pause auto-advance, set
  `walkExplorationFen`. On a **flagged student ply** the board is shown from
  `fenBefore` with the green arrow (as explore does today at `:3015`), so
  moving a piece there = trying the better move (fork Q2). Elsewhere: from the
  shown position, either side movable.
- **Narrate the explored move (G0 — computed, then voiced):** in the explore
  branch (`:3401-3451`) after the student's move: `analyzeWithBudget` depth 12
  (~1.5s, the surface's existing ad-hoc pattern `:687`) → cpLoss vs best →
  `moveReason.classifyMoveReason` + `whyItFailed` / `explainBestMoveGrounded`
  (merit or fault) → `voiceFacts({ intent: 'review-explore', warm: true })` →
  `reviewSay`. ≤2 sentences. Then the existing Stockfish reply plays and
  `describeStudentThreat`/`mustDefend` on it gets one sentence if a real threat
  exists, else silence. Cache per FEN via `stockfishFenCache`.
- Fix while here: Ask-chat grounds on the game FEN (`:2559`), not the explored
  one — while exploring, ground on `walkExplorationFen`.
- `walk-resume-game-btn` stays as the exit; exploring past the current ply
  never mutates `annotations`.

## E. Every mistake names the fundamental it neglected

### What exists, unwired
`principleDetector.detectPrincipleViolations` (`principleDetector.ts:52`) —
same-piece-twice, early-queen, wing-pawn-grab-uncastled, knights-before-bishops,
early-edge-pawns — is used ONLY by `/coach/teach` think-aloud. The review's sole
principle clause is `prematureBreakWhy` (`reviewFullData.ts:80`).
`misconceptionTags.ts` already has the opening bucket (`neglected-development`,
`king-stuck-center`, `greedy-pawn-grab`, `left-book-early`) with devices in
`principles.ts`. `moveReason.classifyMoveReason` bottoms out at
`'lost-the-thread'` (`moveReason.ts:74`) — the natural insertion point.

### Build
1. **New facet `[principle]`** in `computeMoveFacets` (`reviewFullData.ts:163`),
   STUDENT plies only, opening only (≤ ply 24), and ONLY on plies the engine
   already flagged (inaccuracy+). That is David's "if there is one" made
   rigorous: the engine proves it was a mistake; the detector names why. A
   principle never attaches to a good/book move (`3...Nd5` is a non-capture
   knight relocation with 0 minors developed — the raw detector WOULD fire; the
   flag-gate stops it).
2. **Two new detectors** (the ones David named that don't exist), both computed
   from the board + the engine PV, never from vibes:
   - `tempo-handed` — the played move is a non-capturing retreat/relocation and
     (a) the opponent's previous move attacked that piece while developing, OR
     (b) the PV's first reply attacks the moved piece / a piece it uncovered
     with a developing or pawn move. `6...Nb6`: (a) Nc3 hit it, (b) `d5` hits
     Nc6 and `a4–a5` hits Nb6.
   - `space-conceded` — a piece retreats out of the centre box (c4–f5) toward
     its own back rank and the PV's first reply is a central pawn advance past
     its 4th rank (`d4–d5`, `e4–e5`). Names the square given up.
   - Reuse: `same-piece-twice` (principleDetector), `neglected-development`
     (`misconceptionClassifier.ts:292`), `king-stuck-center` (`:261`),
     `greedy-pawn-grab` (`:252`), blocks-own-bishop (`boardDelta.ts` BLOCKS),
     `prematureBreakWhy` (already there). Cap 3 principles per ply.
2b. **ATTRIBUTION, not detection (David 2026-09-05: "make sure the calculator
   is able to associate the error to the fundamental, like I did in my
   example").** A fundamental attaches to a flagged move ONLY when all three
   computed conditions hold — `attributePrinciples(fenBefore, playedSan,
   bestSan, pvAfterPlayed, pvAfterBest)`:
   1. **Pattern** — the played move exhibits it (board + move history).
   2. **Punishment in the PV** — the refutation line after the played move is
      the kind the fundamental predicts:
      - tempo-handed: an opponent PV move attacks with gain (develops / pushes
        a centre pawn) AND the student's PV reply is non-developing (retreat,
        same piece again, defensive pawn).
      - space-conceded: a centre pawn advances to rank 5 (own-side view) onto
        or over the square the piece left.
      - same-piece-twice / neglected-development: developed-minor count for
        the student at the END of the played-PV is lower than at the end of
        the best-PV (a real tempo deficit, not a rule recital).
      - king-safety family: PV contains checks / attacks landing on the
        student's king zone.
      - loose piece: PV captures it.
      - buried bishop: the bishop still has ≤1 legal move at PV end.
   3. **Counterfactual** — the best-move PV does NOT contain that punishment
      (after `6...e6`, `d5` is gone). Both PVs already exist per flagged ply
      because the better-line walk (§B) computes them → zero extra engine
      cost.
   Output `PrincipleAttribution { principle, evidence: { patternSquares,
   pvMoves, counterfactualClean } }`; narration names ONLY squares/moves from
   `evidence` (narrationAccuracy holds by construction). A pattern that is
   present but never punished in the PV (rim knight nobody kicks,
   knights-before-bishops with no development gap) stays SILENT. Ranking when
   >3 attach: by the eval share the PV punishment explains (material > tempo
   count > space squares). Fixture assertion: `6...Nb6` attaches exactly
   same-piece-twice + space-conceded + tempo-handed; `3...Nd5` attaches
   nothing (not flagged); `11...Nd5` attaches nothing (engine-best).

2c. **DETERMINISTIC, END TO END (David 2026-09-05, emphatic: "This all needs
   to be deterministic!!").**
   - `attributePrinciples` is a pure function of (fenBefore, history, played,
     best, pvPlayed, pvBest). No model in the loop.
   - The two PVs it consumes are searched at a FIXED DEPTH (`go depth N`, no
     `movetime`) so a slow phone and a fast desktop get the same line. Pin
     `ATTRIBUTION_DEPTH` (start 14; the fixture must hold at it) and record it
     on the result.
   - Computed ONCE and PERSISTED on the annotation
     (`annotations[i].principles: PrincipleAttribution[]` + `attributionDepth`)
     alongside §A's persistence — never recomputed on re-open, never differs
     between opens.
   - The fundamentals beat is rendered from code templates and spoken RAW
     (`voiceFacts` `preferRaw` path) — NO `voiceReviewLines` rephrase on this
     line. Same words every time; every square/move in them is from
     `evidence`. Template variety comes from deterministic stem rotation keyed
     on ply index (Narration Voice Rule 9), not from a model.
   - Gate: `principleAttribution.test.ts` runs the fixture twice and asserts
     byte-identical output; `reviewNarrationFidelity` extended so a warmed
     line may never ADD or DROP a fundamental.
   OPEN (asked 2026-09-05): whether the `voiceReviewLines` warm pass is pulled
   off the REST of the walk too (raw templates everywhere) or stays on the
   non-fundamentals lines.

3. **The principle LEADS the mistake beat** in the capped cascade
   (`coachFeatureService.ts:1373-1580`) — ahead of the tactical `whyItFailed`
   when the engine found no tactic (`lost-the-thread`); after it when there was
   one (the hanging piece outranks the principle). Computed clause list →
   `voiceReviewLines` phrases it. Target register for the fixture ply: "Three
   fundamentals in one move: the knight's third trip while both bishops sleep,
   it steps off d5, and White's d4–d5 arrives with tempo — space and time in one
   go. …e6 kept it planted."
4. **Feed the loop:** the principle → misconception tag → `captureMisconception`
   → weakness spine + `principle` drill kind, so a repeated fundamental becomes
   a drill. `tempo-handed`/`space-conceded` need tags + devices (fork Q3) or fold
   into `neglected-development`/`misplaced-piece`.
5. Sweep: the same facet feeds `/coach/teach` think-aloud already — don't fork
   a second detector; extend `principleDetector.ts` and call it from both.

Gates: `principleDetector.test.ts` (+2 rules, with the Alapin fixture: ply 12
fires all three, ply 6 does not), `reviewFullData.test.ts` (`[principle]` facet
only on flagged student opening plies), `coachFeatureService.test.ts` (the
principle leads a no-tactic mistake, trails a tactical one),
`misconceptionClassifier.test.ts` if tags are added. `narrationAccuracy`
contract holds (every square named is on the board).

---

## Sequencing (each phase = one commit, one deploy at the end per the cap rule)
1. **E** first — pure services + tests, no UI; the fixture game drives it.
2. **A** — the tier key + non-blocking deepen + narration persistence.
3. **C** — auto-advance (one pacer, shared with B and D).
4. **B + D** — button-only playout, free board, explore narration (same file).
5. Audit: clone `scripts/audit-review-real-game.mjs` → seed the Alapin PGN
   UNANALYZED, `muteTtsForAudit`, 3 instruments; assert: walk starts < 30s on a
   cold game, re-open is instant (no `review-analyze-spinner`), ply 12 narration
   names the fundamentals, walk auto-advances and pauses on a board drag,
   explored move gets a spoken line, "Show me" speaks per ply. Plus
   `audit-vacuity-check.mjs --changed`. Then `ship-check`, push `main`, prod
   audit. iOS build only when David asks.

## Decisions (David 2026-09-05)
- **Pause tiers:** 0.5s after unflagged plies, 1.5s after flagged plies. LOCKED.
- **"Show me better move" button STAYS** — David: "I still want a show me
  better move button." It is the narrated `playBetterLineOut` (§B), never
  auto-fired. Exploration is a separate thing: a piece move on the board plays
  from the position SHOWN (retry-your-own-move = step Back first, or tap Show
  me). The `fenBefore` swap dies with the Explore button.
- **New tags `tempo-handed` + `space-conceded`** with devices. LOCKED.
- **Explore narration = the SAME format the walk already uses** — David: "use
  the same format as we already have." So an explored move runs through the
  existing per-move segment builder (`buildReviewSegments` capped mode on a
  one-ply synthetic segment → `voiceReviewLines`), NOT a new tight template.
  The engine reply gets the opponent-move treatment the walk already gives
  (`buildOpponentMoveTeaching` / silent when unremarkable).
- **Play/Pause button sits BETWEEN the two arrows** in `review-nav-controls`
  (`CoachGameReview.tsx:3555-3593`): `[⏮] [◀] [⏯] [▶] [⏭]`. The existing
  "Stop/Replay narration" control (`:3597`) folds into it.
- **A user piece move auto-PAUSES; auto resumes ONLY when Play is pushed.**
  Applied to every user intervention (board drag, Back, Forward tap, move-list
  jump, key-moment jump). Assumption to confirm at build time: the walk's OWN
  stops (find-shot / trap / rewind / turning-point cards) resume auto-advance
  when the card resolves, since those are the walk pausing itself, not the
  student stepping in. If David wants Play required there too, one flag.
- Auto-advance starts ON when the walk starts (`start-walk-btn`).

## Status
PLAN ONLY — David 2026-09-05: "Do not build yet." Nothing committed.
