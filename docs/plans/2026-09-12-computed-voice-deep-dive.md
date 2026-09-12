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

(Deep-dive agents are mapping the clusters end-to-end; ranked findings below.)

### Cluster B — position-assessment calculators (landed)

1. **A real hang goes SILENT in a decided-but-winning position.** must-defend bump
   gated behind `if (contested)` (`narrationImportance.ts:103,108`) + `positionFacts.ts:348`
   early-returns before the mustDefend clause (:385) when `!importance.speak`.
   Student up a rook, their rook hangs to the opponent's next move → nothing
   speaks, though :393-399 has a purpose-built "you're on top — don't let them
   punch back" line. **Violates the locked importance doctrine (must-defend must
   fire).** Fix: let live `mustDefend.net≥3` (and mate) bypass the contested gate.
2. **`latentDanger` counts an ENEMY piece as the "shield"** (`latentDanger.ts:100-107,123`)
   → false "mind it before you open the line" on an alignment the student cannot
   open. Fix: only a student (or student-tradeable) piece counts as the openable shield.
3. **`tacticalRead.summarizeVerdict` states unverified material** (`tacticalRead.ts:92-94`):
   +2.8 positional edge → "up a piece" (G3 false material claim). Fix: frame by
   eval magnitude ("clearly better") unless a real material count backs it.
4. **`boardPlan` false "push the passer"** on blockaded / opposite-colored-bishop
   passers (`boardPlan.ts:44-46`). Fix: gate on the passer being advanceable.
5. **Two only-move definitions can disagree** (`positionFacts.ts:139-148` fan-only
   gap, no legalCount, vs `criticalityScan.ts:120` `legalCount===1`). Fix: thread
   `scanCriticality`/legalCount into `computeImportance`.
6. **`weaknessSignal.matchClauseKind` string-key drift** (`weaknessSignal.ts:113-127`,
   no compile-time link to weaknessSpine vocab — the exact drift `tacticVocabulary.ts`
   exists to prevent) + a kind collision (kingExposure/centralKingDanger emitted
   under `kind:'latent-danger'`, `positionFacts.ts:378,406`). Fix: own ClauseKind
   for king-safety; pin cluster-ids behind a shared typed Record.

**SEAM (unified-coach P1):** `studentWeaknesses` is wired into ORDERING
(`applyWeaknessBoost`) from 4 live surfaces, but `computeImportance` (the
speak/silent GATE) takes no weakness signal — so a persistent worsening weakness
can re-rank but never *un-silence* a fact. Selection stays position+rating-only.

### 🔴 THE DISEASE (root cause across clusters A + C) — `seeGain` is pin-blind

`seeGain` (`positionReadingService.ts:38`) is built on `chess.js.attackers()`,
which counts pieces by movement pattern, **ignoring pins & legality**. Exactly ONE
consumer was hardened (`explainBestMoveGrounded`'s cost clause drives off *legal*
captures + `captureHasCounterTactic`); every other `seeGain`/`attackers()` guard
inherited the blindness. It is the single root cause behind a whole class of
false claims. **Keystone fix: one shared legal-recapture-aware landing-safety /
SEE helper** (the `moves({verbose}).filter(m=>m.to===sq)` + pin-aware pattern
already at `groundedAnswer.ts:1771`), swept across every consumer below. Also:
`voiceFacts` can only SUBTRACT (strip invented numbers/terms/sentences) — it can
NEVER correct a false computed claim; correctness lives 100% upstream in these
computers.

### Cluster A — computed-voice core (`groundedAnswer.ts` + voiceFacts) (landed)

1. **[#1, confirmed] `assembleEngineReasoning` speaks bare "attacks the X" from an
   en-prise/irrelevant piece** (`groundedAnswer.ts:2381`, walk `:2397`).
   `describeMoveGeometry` returns "attacks…" truthily so `?? quietPurposePhrase`
   never runs; `explainBestMoveGrounded` filters this (`:1728`), the PV walk (and
   the puzzle "Explain why" via `explainPuzzleMoveGrounded`) does not. Fix: mirror
   the `!g.startsWith('attacks')` filter at both sites.
2. **fork/pin/material "landing-safe" fooled by a PINNED defender** (`:1976`
   `landingSafe = seeGain(c,to)<=0`, gating fork `:1980`/pin `:1996`/material `:2008`)
   → announces a winning tactic on a piece that actually hangs. Fix: legal-recapture
   landing safety (the disease fix).
3. **fork names the two highest-VALUE targets even if the high one is defended**
   (`:1987` — `realWin` needs only ONE target undefended/king, but phrasing leads
   with the two most valuable). → "forks the king and the pawn on b7" (king steps
   aside, pawn defended, nothing won). Fix: name only genuinely winnable targets.
4. **the other SEE assemblers never got the pinned-attacker fix** →
   false "hanging / in trouble / not safe": `assembleHangingAnswer:257`,
   `assemblePieceSafetyAnswer:404`, `assembleThreatAnswer:425`,
   `assembleSquareControlAnswer:713`. Fix: disease fix.
5. **bare-"attacks" primitive has no en-prise/winnable guard** (`:2014`) and leaks
   into `assembleMovePurpose:2256`, `describeMoveMerit:2158`, `explainMoveOrder`
   (`bestAttackFrom:1915`→`:2507`). Fix: emit "attacks" only when landingSafe AND
   (target undefended OR value(target)>value(mover)).
6. **`quietPurposePhrase` praises a developing piece that hangs** to a pinned-only
   defender (`:2091`). Fix: disease fix (shared).
7. **`assembleAttackAssessment` mis-counts king-zone attackers/defenders** (pins
   ignored, x-ray of one empty square counts full — `:1083-1092`) → "you have a
   real attack, press it" on a losing attack. Fix: real safe contact + exclude pins.
8. **`assembleThreatAnswer` "you can win the rook" ignores turn/legality** (`:418-443`).
   Fix: gate on side-to-move + an actual legal capture.

   *Solid (don't over-correct):* `explainBestMoveGrounded` (the reference),
   `assembleCandidateMoveAnswer`, eval sign/perspective (no bug found),
   `captureHasCounterTactic`, detectNewThreat family (err toward silence).

### Cluster C — tactics / causal / threat detectors (landed)

*Vocabulary drift is properly bridged* (`tacticVocabulary.ts` is a compile-time
`Record<Union,…>`; discovery/overload/removal-of-guard reconciled). Remaining:

1. **fork fires on a forker that is itself hanging** (`tacticsDetector.findForks:145-149`,
   `tacticClassifier.detectFork`, `missedTacticService:718-729`) — `winnable` gate
   checks only targets, never the forking piece's own safety. → false "you have a
   fork" that just loses the forker. Fix: SEE-gate the forker square.
2. **`missedTacticService.detectSkewer` is the OLD unfixed logic** (`:251-256`,
   `first>second && second>=1`, allows a pawn prize) — the false-skewer bug
   `tacticsDetector.findSkewers` was already fixed for; this file diverged. Fix:
   port the three-way threshold.
3. **mate-threat for the side-NOT-to-move is unverified** (`tacticsDetector.findMateThreats:297-311`)
   → false "White has a checkmate available" when the side to move simply parries.
   Fix: confirm the threat is unstoppable, or downgrade wording.
4. **double-check detection is DEAD everywhere** (`missedTacticService:546-589`,
   `tacticClassifier:334-389` count checkers via `moves()` which never captures the
   king → always 0). A real double check is mislabeled a fork; the validator then
   STRIPS legitimate "double check" mentions. Fix: `attackers(kingSq,mover).length>=2`.
5. **`seeGain` pin-blindness under causalChain + attackMap** (`causalChain.ts`
   `hasWinnablePiece:165`, `exploitedLoosePiece:235-251`, `targetWasSavable:178`;
   `computeAttackMap`) — the disease, in the cause→effect engine + the ground-truth
   prompt block. Fix: disease fix.
6. **`isCriticalThreat`/`scanUpcomingTactics` attribute the WHOLE line's eval to
   each pattern** (`tacticClassifier:722-730`, `tacticAlertService:302-311`) → a
   harmless depth-1 pin inside a big-swing line flagged "critical" (the noise David
   complained about); a real shot inside an equalizing line reads non-critical.
   Fix: evaluate at the tactic's own ply.
   *Also:* claim-validator lists `x_ray`/`double_check` no detector emits (strips
   legit mentions) + no `battery` entry; `detectMissedTactics` FEN/color-indexing
   depends on `CoachGameMove` conventions — verify.

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
