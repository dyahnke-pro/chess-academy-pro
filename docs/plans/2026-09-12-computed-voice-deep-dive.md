# Deep dive: calculation tools + the computed coach voice (2026-09-12)

**Assignment (David 2026-09-12):** "agreed with number 1 [the en-prise 'attacks'
clause] — it also illustrates the opportunity to improve the calculators and
computed narration. so lets improve that. and then figure out what else needs
improving. i want a full deep dive of all calculation tools and the computed
coach voice. get a solid understanding. this will be your scoped assignment."

So: understand every calculator + the computed-voice pipeline cold, enumerate
every place a COMPUTED chess claim can be false / misleading / thin / drifting
(G0: the LLM only rephrases; G3: never invent), rank by user impact, and fix in
order — starting with #1. Each fix ships with tests + gates + a prod audit.

## Context — what just shipped (done, verified)

- Grounded "why this was the best move" now auto-speaks on every DRILL/WEAKNESS
  solve (My Mistakes + Weakness drills, `MistakePuzzleBoard`) — was button-only.
  `voiceService.speakGrounded` gained `bypassBriefCap` (full why even on "brief";
  still honors silent). Those surfaces already had "Keep playing this position →"
  (play out vs the coach to mate/draw).
- The plain Tactics rush (`PuzzleBoard`) was left FAST (David: "leave the rush as
  a speed drill") — it keeps its instant grounded one-liner on solve; the full
  gated why was reverted off it.
- Prod-verified muted: `scripts/audit-drill-why-prod.mjs` 7/7 (seeds a real Nxe5
  tactic, solves by clicking, asserts the grounded why fires via
  `voiceService.speakGrounded`, zero /api/tts). On `main` (commit 7aa5948).

## The map (what feeds the spoken/written coach)

Computed facts → code SPINE selects/orders → `voiceFacts` phrases → actuators
(voice + board + arrows). Everything upstream of `voiceFacts` is deterministic.

- **Computed-voice core** — `groundedAnswer.ts` (describeMoveGeometry,
  quietPurposePhrase, evalPhrase, explainBestMoveGrounded, assembleEngineReasoning,
  captureHasCounterTactic, seeGain, detectNewThreat, describe*Threat*,
  explainMoveOrder) + `coachApi.ts` `voiceFacts` / `explainPuzzleMoveGrounded`.
- **Position assessment** — positionFacts, criticalityScan, narrationImportance,
  perturbation, deliberation, threatOut, kingSafety, opponentIntent, latentDanger,
  boardPlan, positionalRead, tacticalRead.
- **Tactics / causal / threats** — tacticsDetector, liveTacticsContext,
  tacticAlertService, missedTacticService, tacticClaimValidator, causalChain,
  causalChainVoice, threatCheck.
- **Assemblers / consumers** — coachFeatureService.buildReviewSegments,
  CoachTeachPage live commentary, openingIdeasNarrator, pvPlayback, corpus
  retrieval (teachingNoteForBoard / noteAtPosition).

## Open findings (ranked; grows as the deep dive lands)

Evaluated 2026-09-12 by running the real reasoning engine on ~35 real puzzles
across themes (fork/pin/mate/sac/hanging/skewer/quiet/trapped/defensive) and
checking every claim against the board. Verdict: **claims are chess-valid — no
hallucinations** (pins name real pins w/ correct squares, forks name the actual
two pieces, mates/captures real; the "pins the knight to the queen with no
knight" class does NOT reproduce). Weaknesses found (imprecise, not false):

1. **[CONFIRMED, agreed to fix] En-prise "attacks" in the PV walk.**
   `assembleEngineReasoning` (groundedAnswer.ts ~2381) uses `describeMoveGeometry`
   which can return `it attacks the {x}` from a piece that is itself immediately
   recapturable — and it can DROP the capture the move actually made when SEE is
   negative. Real case: `Qxf6` (a queen-for-two-rooks trade) narrated as "Qxf6 —
   it attacks the rook on f1", omitting the f6 capture, spoken from a queen White
   recaptures next move. `explainBestMoveGrounded` already bans bare "attacks" for
   exactly this reason (line ~1728 `!geo.startsWith('attacks')`); the PV walk does
   not. Fix direction: apply the same en-prise/attacks guard in the PV walk, and
   prefer naming the capture (or the forced sequence) over a bare attack.
2. **Low-value fork targets named as the lead.** "forks the king and the pawn on
   d5" / "forks the pawn on c2 and the pawn on g2" — board-true but names an
   irrelevant target when the real point (a skewered rook, piece activity) lands
   in a later clause. Fix direction: rank fork targets by value / down-weight
   pawn-only forks when a stronger clause exists.
3. **Thin whys on positional / deflection / pawn-race moves.** e.g. "Rxc5… then
   h5" with no idea. Not wrong, just uninformative (the geometry engine can't see
   the idea and — by design — won't invent). Passed-pawn pushes DO get a good
   maxim. Fix direction: widen `quietPurposePhrase` coverage (deflection, zugzwang,
   king activity, the opposition) where board-provable.
4. **No eval verdict in the drill why at runtime.** `explainPuzzleMoveGrounded`
   does not pass evalCp/mateIn to `assembleEngineReasoning`, so "advantage"
   (non-forcing) solves state the moves but not the resulting edge. Fix direction:
   thread the puzzle's engine eval into the verdict clause.

(Deep-dive agents are mapping the three calculator clusters end-to-end; their
ranked findings append here.)

### Cluster D — review/teach assemblers & consumers (landed)

*The corpus note-SELECTION layer (danyaTeachingService) is the MOST hardened —
exact-position/FEN-transposition only, name-match arm deleted, floating notes
fenced to tactics/endgame; no name-based selection or repeated-note bug found.
`pvPlayback` and `reviewMoveTeaching` are also solid.* Issues:

1. **`augmentWithProjections` #4 (better-line why) skips the `delivers` gate**
   (`coachFeatureService.ts:2539-2558`; `render()` `:2457` falls back to the ROOT
   promise) → can spell "…and you're winning" on a line the engine's terminal
   re-eval never confirmed (worker hiccup). Fix: gate #4 on `line.delivers` like
   #3/#5, or refuse a verdict when `terminalEvalCp===null` and not mate.
2. **`resolveCuratedOpeningIdeas` name-match drift** (`reviewOpeningTheory.ts:135-143`,
   bidirectional `includes`, no identifying-token discipline) — safe across today's
   43 entries but a future short entry ("English","London") substring-hits unrelated
   games → wrong opening key-ideas in the review plan. Fix: reuse `identifyingTokens`/
   `GENERIC_TOKENS` (≥1 shared identifying token).
3. **Review beats leak PRESENT-TENSE/live register** (`coachFeatureService.ts:2009`
   "this is the moment to throw your pieces at it", `:2131` "is coming off the board",
   `:1850` "threatens", `:1767` "you're now threatening") — violates the 2026-07-19
   two-register rule (review = retrospective). Fix: past-frame these in the review
   path, or route only through live surfaces. *(voice-judgment — confirm w/ David.)*
4. **`moveWhy` theory dives can put "you" on the opponent's move**
   (`reviewOpeningTheory.ts:506-515` → `reviewMoveTeaching.ts:284` "you set the
   tempo") when the dive move isn't the student's. Fix: seat-neutralize / pass mover-seat.
5. **SAN-only dedupe keys silence genuinely-new threats** (`coachFeatureService.ts:1841,1801,1107`)
   — a later different tactic with the same SAN dropped as a repeat. Fix: key on SAN+fenBefore/targets.
6. **Causal-lead + recurrence recap have no per-game dedupe** (`coachFeatureService.ts:1340-1372,2266`).
   Fix: a per-game seen-set keyed on chain signature / weakness label.

---

## CONSOLIDATED RANKING (cross-cluster, by user impact)

**Tier 1 — the disease (false chess claims; one keystone fix):**
- **P1 (keystone): pin/legality-aware landing-safety + SEE helper**, replacing raw
  `seeGain(to)<=0` / raw `attackers()` across: describeMoveGeometry landing-safe +
  fork-target selection + bare-attacks primitive (A#2/#3/#5), quietPurposePhrase
  (A#6), the four safety assemblers + attack assessment + threat "you can win"
  (A#4/#7/#8), fork forker-safety (C#1), causalChain + attackMap (C#5). One helper,
  swept everywhere (sweep-don't-spot-fix). + **the #1 en-prise "attacks" filter in
  `assembleEngineReasoning`** (A#1, agreed). Ships with a real-position gate test.

**Tier 2 — independent false/misleading claims:**
- must-defend silenced in a decided-but-winning position (B#1) — violates the locked
  importance doctrine; a real hang goes unspoken.
- tacticalRead verdict states unverified material "up a piece" from a positional edge (B#3, G3).
- mate-threat for the side-not-to-move unverified → false "checkmate available" (C#3, G3).
- latentDanger enemy-piece-as-shield false warning (B#2); boardPlan false "push the passer" (B#4).
- augmentWithProjections #4 ungated "you're winning" verdict (D#1).
- missedTacticService diverged skewer logic mislabels the missed tactic (C#2).
- review present-tense register leaks (D#3) + "you" on opponent dive move (D#4). *(voice-judgment.)*

**Tier 3 — coverage / robustness / thinness:**
- isCriticalThreat uses whole-line eval, not per-ply → the "critical" noise David complained about (C#6).
- double-check detection dead everywhere + validator strips legit mentions (C#4).
- reviewOpeningTheory name-match drift (D#2); claim-validator vocab gaps (C#6b);
  SAN-only dedupe (D#5); causal-lead/recap dedupe (D#6).
- thin whys on positional/deflection moves + no eval verdict in the drill why
  (my hands-on eval #3/#4); widen quietPurposePhrase coverage.
- **SEAM:** `computeImportance` is not weakness-aware (unified-coach P1) — weaknesses
  re-rank but can't un-silence. Bigger design change; sequence after the correctness fixes.

## Improvements & additions (strengthen + build upon — David 2026-09-12: "areas for improvements and additions… how can we strengthen and build upon what we already have")

Beyond fixing errors, where the computed voice can get RICHER and more robust:

**Strengthen what exists**
- **Widen `quietPurposePhrase` / positional coverage.** Today it covers outpost /
  centre / develop-eyeing / king-activity / passed-pawn. Add board-provable ideas:
  prophylaxis, the good-vs-bad bishop, space gain, weak-square control, restriction,
  the opposition/key-squares (endgame), zugzwang, deflection/decoy purpose — so quiet
  moves get a real WHY instead of a thin/silent line (kills the "Rxc5… then h5" class).
- **Eval verdict in the drill/puzzle why.** Thread the engine eval into
  `assembleEngineReasoning` so non-forcing "advantage" solves state the resulting
  edge ("…leaving you clearly better / up a piece"), not just the move geometry.
- **Fork/tactic naming precision.** Name the genuinely winnable target and quantify
  ("wins the knight" vs "forks — but only the pawn falls").
- **Per-ply criticality** (fixing C#6) directly improves what gets flagged "critical".
- **Expand the causal-chain pattern library.** Only 2 patterns today
  (premature-queen→discovery, removed-defender). Add: overloaded defender,
  back-rank creation, trapped-piece-by-restriction, zwischenzug, decoy/deflection
  chains, pawn-break→open-line. The cross-move engine is where the deepest teaching
  lives.
- **Structure→plan library** (`boardPlan`): today only passed-pawn + IQP. Add
  minority attack, hanging pawns, backward pawn/weak square, opposite-side-castling
  attack, bishop pair, open-file seizure, blockade. Each a board-gated real plan.

**Additions (new capability)**
- 🌟 **A computed-voice REGRESSION GATE** — the single highest-leverage addition.
  Codify the hands-on eval method (run `describeMoveGeometry` / `assembleEngineReasoning`
  / the assemblers on a curated corpus of real positions across themes, assert the
  claim shape is board-true) as a permanent vitest gate in ship-check. This deep
  dive found ~20 issues by running the engine on real puzzles by hand; a gate turns
  that into "the build catches a reintroduced false claim." Fits the repo's gate
  culture (narrationAccuracy/lessonIntegrity are the precedent). Build it alongside P1.
- **Double-check as a first-class motif** (C#4 is dead) — real detection + teaching.
- **King-attack plan beat** — after fixing the mis-count (A#7), turn it into a real
  "you have an attack — the plan is …" computed beat.
- **Endgame computed voice** — the dive is opening/middlegame-centric; compute
  opposition / key squares / rule of the square / Lucena-Philidor-Vancura from the
  board where the corpus is thin.
- **Weakness-aware importance GATE (the SEAM / unified-coach P1)** — let a student's
  persistent, worsening weakness *un-silence* a relevant fact, not just re-rank it.
  The biggest "build upon": the coach speaks to THIS student, not just this board.

## Phased plan

- **P0 — deep dive + this doc.** In progress (3 cluster agents + assembler review).
- **P1 — fix #1** (en-prise "attacks" / dropped-capture in the PV walk). Contained
  to `assembleEngineReasoning`; blast radius = every surface that calls it (review,
  chat, teach, puzzle why). Add a focused gate test (real positions) + re-run the
  computed-voice eval + a prod audit.
- **P2..Pn — the ranked list** from the deep dive, each its own change + gate +
  audit.

## Decisions log

- 2026-09-12: rush stays a fast speed drill (no full gated why); full why lives in
  drills/weaknesses. (David.)
- 2026-09-12: fix #1 approved; broadened into this deep-dive assignment. (David.)

## Sequencing logic

Fix the computed-voice core first (#1 and its neighbors in `groundedAnswer.ts`) —
it's the single chokepoint every surface's claims flow through, so one fix there
improves review + chat + teach + puzzles at once. Calculator-cluster findings
follow, ordered by how user-visible the wrong/thin claim is.

## Next-session pickup

1. Read this doc. 2. Check the deep-dive findings section (agent reports folded
in). 3. `scripts/audit-drill-why-prod.mjs` is the muted prod pattern for a solve
+ grounded-why assertion — clone per surface. 4. The computed-voice eval method:
run `assembleEngineReasoning` / `describeMoveGeometry` on real `src/data/puzzles.json`
entries across themes and read the output against the board (a throwaway vitest
that console.logs is the fastest harness). 5. Every fix stays G0/G3 (compute in
code, never let the LLM decide) and ships with a gate + prod audit.
