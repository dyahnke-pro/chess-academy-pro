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
