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

7. **In-game analysis IS the review's analysis for coach games (David
   2026-09-05: "can we also use in game analysis to prevent any need for
   preview analysis?").** `/coach/play` already analyses every student ply at
   depth 10 before+after (`CoachGamePage.tsx:3058-3059`) and saves
   `annotations` (eval / bestMove / bestMoveEval / classification) at game end
   via `movesToAnnotations` (`:1963-2002`). Today the review discards it
   (depth 10 < 16). With the tier key (A.4) it opens with ZERO analysis. Close
   two gaps: (a) coach plies are filtered out (`:189` `!m.isCoachMove`) — keep
   them, the review narrates opponent moves too (the eval already exists from
   the same live call); (b) 🚨 TRAP: the coach's CHOSEN move is rating-
   throttled (`coachPlaySession.resolveConfig`) — the stored `bestMove` must
   come from the honest `analyzePosition` result, NEVER from the coach-move
   picker. Stamp `analysisTier: 'live'` + per-ply depth; flagged plies deepen
   in the background per A.3 like any other game.
8. **Lichess imports carry server evals — use them.** `[%eval]` comments are
   already parsed (`gameImportUtils.ts:70-130`, `parseEvalComments`) but only
   to flag blunders at import. Build full `annotations` from them (eval per
   ply → cpLoss → classification via the same thresholds; `bestMove` absent →
   the background deepen fills it for flagged plies only). Tier `'lichess'`.
   Zero local analysis for any game the user analysed on lichess. Chess.com's
   API ships no evals → those games take the background batch sweep, never a
   blocking pass. Net: no surface ever blocks on analysis; the ONLY local
   crunch left is the background sweep on chess.com imports.

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
   RESOLVED (David 2026-09-05, "all narrations pass through DNA"): the warm
   pass STAYS on the non-fundamentals lines; the fundamentals line is DNA-
   register templates spoken raw (see G.9).

3. **THE FUNDAMENTAL IS STATED FIRST; everything else is supporting evidence
   (David 2026-09-05: "I want the fundamental flaw stated first and then the
   other computer narration following it as supporting evidence").** Reorder
   the capped cascade (`coachFeatureService.ts:1373-1580`) into fixed template
   slots whenever ≥1 fundamental attributes:
   1. **Verdict = the fundamental(s)** (≤3, ranked by eval share).
   2. **Evidence, fixed order:** the PV punishment (moves from `evidence`), the
      refutation / tactic (`whyItFailed`, `[tactic]`, `[loose]`), the eval
      swing, the lasting concession (`describeConcessions`).
   3. **The better move + its why** (`explainBestMoveGrounded`).
   Tactical faults are fundamentals too — a hanging piece is "loose pieces
   drop off", an ignored threat is "answer the threat first" — so the
   fundamental leads on EVERY flagged move that has one and the tactic is its
   evidence. Only a flagged move with NO attributable fundamental falls back
   to today's order. Raw-spoken, deterministic (2c). Fixture rendering:
   "Third move of the same knight while both bishops sleep — and it steps off
   d5. d4–d5 arrives with tempo and a4–a5 hits the knight again; the eval
   swings a pawn. …e6 kept it planted and d5 closed."
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

## Sequencing (locked 2026-09-05; each phase = one commit, one deploy at the end)
1. **A** — analysis: tier key, non-blocking deepen, narration persistence,
   in-game + lichess evals. What David feels on the phone; independent of
   the rest.
2. **E** — the full fundamentals set (below) as pure services + attribution
   + tests on the fixture game; deterministic DNA-register templates.
3. **C** — auto-advance + ⏯ control (one pacer, shared with B and D).
4. **B + D + G** — button-only narrated playout, free board, explore
   narration, the complaint-hardening items.
5. **F** — game card.
6. Audit: clone `scripts/audit-review-real-game.mjs` → seed the Alapin PGN
   UNANALYZED, `muteTtsForAudit`, 3 instruments; assert: walk starts < 30s on
   a cold game, re-open is instant (no `review-analyze-spinner`), ply 12
   narration leads with the fundamentals, walk auto-advances and pauses on a
   completed board move only, explored move gets a spoken line, "Show me"
   speaks per ply, recap aggregates fundamentals. Plus
   `audit-vacuity-check.mjs --changed`. Then `ship-check`, push `main`, prod
   audit. iOS build only when David asks.

### E — THE FULL FUNDAMENTALS SET (David 2026-09-05: "All fundamentals are in
scope. The more we have the more accurate we can be.")
Every row is an attributor per E.2b (pattern + punishment-in-PV +
counterfactual), deterministic per E.2c, with a tag + device + fixture test.
Rows marked NEW need a detector; the rest need wiring into the review.

Opening: same-piece-twice · tempo-handed (NEW) · space-conceded (NEW) ·
neglected-development · early-queen-sortie · king-left-in-centre ·
greedy/wing-pawn-grab-uncastled · early-edge-pawns · knights-before-bishops ·
buried-own-bishop · premature-centre-break · knight-to-the-rim (NEW).

Middlegame: loose-piece (LPDO) · ignored-threat · passive-when-forcing-existed
(checks-captures-threats) · weakened-king-shield (NEW) · created-pawn-weakness
· overextended-pawn (NEW) · traded-active-for-passive / gave-bishop-pair (NEW)
· wrong-trade-for-material-situation (NEW: ahead → trade pieces, behind →
trade pawns) · worst-piece-unimproved · rook-ignored-open-file (NEW).

Endgame: passive-king (NEW detector, tag exists) · mistimed-pawn-break (NEW
detector, tag exists) · rook-in-front-of-passed-pawn / Tarrasch (NEW).

Tags: add `tempo-handed`, `space-conceded`, `overextended-pawn`,
`bad-trade-material` (+ devices in `principles.ts`); the rest map onto the
existing `misconceptionTags.ts` set. Cap per ply stays 3, ranked by the eval
share the PV punishment explains; PV-verified rows outrank co-occurrence-only
rows (rim knight, knights-before-bishops, rook/open-file) which speak only
when nothing PV-verified attached.

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

## F. Game card: WIN / LOSS, not "1-0" (David 2026-09-05)

"currently reads 0-1 or 1-0 but the order changes based on color of pieces.
Remove the 1-0 and replace with green win or red loss."

- `ReviewGameCard.tsx:119` prints the raw `{result}`; its `didYouWin`
  (`:169-181`) returns `null` for every IMPORTED game because it never
  consults the user's identity — so the icon is the neutral glyph and the
  text is a colour-relative score the student has to decode.
- The correct resolver already exists, module-private, in
  `CoachReviewSessionPage.tsx` (`inferPlayerColor(game, identity)` ≈ `:50-90`:
  coach-game side detection, then exact match on chess.com / lichess handle /
  profile name, then substring fallback). Lift it into a service
  (`src/services/playerIdentity.ts`, `resolvePlayerColor`), use it from BOTH
  the session page and the card. No second heuristic.
- Card renders a badge from `(result, playerColor)`:
  **WIN** (green: `bg-emerald-500/15 text-emerald-400`), **LOSS** (red:
  `bg-red-500/15 text-red-400`), **DRAW** (neutral), and a muted `?` only
  when the identity genuinely can't be resolved (no handle set) — never a
  silent wrong colour. The `1-0`/`0-1` string is GONE from the card.
- Same resolver fixes `pickOpponent` (`:162-167`): show the OPPONENT's name
  ("vs KaiserlicheHoheit"), not the "white – black" pair.
- `ReviewSummaryCard.tsx:61-66` already derives win/loss from
  `(result, playerColor)` — reuse its shape, don't fork it.
- Gate: `ReviewGameCard.test.tsx` — imported game as Black with `0-1` →
  WIN badge; as White with `0-1` → LOSS; draw → DRAW; unknown identity → `?`.
  Ships in phase 4 (UI pass) — it's ~40 lines.

## G. Top-down user-complaint hardening (David 2026-09-05: "I like your suggestions", minus the rating-scaled cap)

1. **Only a COMPLETED move pauses auto-advance** — never a tap, never a
   touch-scroll across the board (phones scroll the page through the board).
   The ⏯ control visibly flips to a "Paused" state so every stop is explained.
2. **Exploration is unmistakable:** a persistent "Exploring — Resume game"
   banner while `walkExplorationFen !== null`; Forward/Back EXIT exploration
   and step the REAL game (never the sideline).
3. **Exploration replies with the engine's best move at fixed depth** — not
   the rating-matched `resolveConfig('medium', 1500)` opponent. Truth, not a
   sparring partner; same fixed-depth rule as §E.2c.
4. **Fundamentals don't nag, they ACCUMULATE.** First occurrence in full;
   repeats in a shortened DNA stem ("the same piece again — …"). The
   end-of-game recap AGGREGATES attributed fundamentals into the headline
   weakness ("three of your five mistakes handed over tempo") — computed
   counts, deterministic, feeds the weakness spine + drill queue. Highest-
   value item in this section.
5. **The summary FREEZES during the walk.** Background deepen never shifts
   accuracy % / counts mid-walk; it applies at walk end or next open. If the
   deepen UN-flags a ply, its persisted attribution is invalidated (inputs
   changed → recompute on the final-tier evals; determinism is per-input).
6. **No unexplained `?` on cards:** when identity can't be resolved, a
   one-time hint on the review list — "Set your chess.com / lichess username
   in Settings to see results."
7. **⏭ = next key moment**, not end-of-game; `KeyMomentNav` becomes a
   first-class control so an 80-move auto-walk can skip quiet stretches.
8. ~~Rating-scaled fundamentals cap~~ — REJECTED by David. Up to 3 attach at
   every rating.
9. **Voice:** the fundamentals line is authored IN the DNA register as
   deterministic templates (rotated stems) and spoken raw; the rest of the
   walk keeps its existing DNA warm pass. Resolves the "warm pass scope"
   question: keep it on the non-fundamentals lines.
10. **After "Show me" the walk stays paused** (only Play restarts, per rule).
    The ⏯ "Paused" state (item 1) is what makes this read as intended.
