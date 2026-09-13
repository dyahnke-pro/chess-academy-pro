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

1. **A real hang goes SILENT in a decided-but-winning position.** ✅ DONE
   (2026-09-13, B#1). The must-defend bump was inside `if (contested)`
   (`narrationImportance.ts`) and `positionFacts.ts` early-returned before the
   mustDefend clause when `!importance.speak`. Fix: moved the `threatNet >= 3`
   bump OUT of the contested gate (alongside the mate override) — swings/decisions
   stay gated (failure #2 preserved), but an incoming hang always earns voice
   (doctrine item #3, "catches the hanging-piece the flat bar hides"); the
   winning case becomes the purpose-built "consolidate — don't let them punch
   back" beat. Belt-and-suspenders: `renderRankedBriefing`'s early-return now
   also bypasses on a live `mustDefend.net>=3`. Gates: 2 new narrationImportance
   tests (decided-but-winning hang speaks; a mere decided swing stays silent).
   35/35 (importance + positionFacts) green.
2. **`latentDanger` counts an ENEMY piece as the "shield".** ✅ DONE (2026-09-13,
   B#2). Key realization: a shield is ALWAYS an enemy piece (the walk takes the
   first STUDENT piece as P1), so the `shields===1` "latent — mind it before you
   open the line" warning was ALWAYS a line the student cannot open standing-still
   → a false prophylaxis. Fix: skip the `shields===1` enemy-shielded case in
   `detectLatentDanger`; the standing warning now fires only on an already-open
   pin (`shields===0`, "that file is a pin"). The student-OPENS-it-by-trading
   case keeps its correct, separate framing via `detectTradeCreatesPin`
   ("before you trade on X…"). Gate: the stale latent-fixture test rewritten to
   assert the enemy-shielded alignment returns null. latentDanger 11/11.
3. **`tacticalRead.summarizeVerdict` states unverified material** (`tacticalRead.ts:92-94`):
   +2.8 positional edge → "up a piece" (G3 false material claim). Fix: frame by
   eval magnitude ("clearly better") unless a real material count backs it.
4. **`boardPlan` false "push the passer"** on blockaded passers. ✅ DONE
   (2026-09-13, B#4). `structurePlan` said "push it — make them deal with the
   promotion" without checking the pawn can advance. Added `passerBlock` (chess.js
   read of the square in front): clear → push it; enemy blockader → "challenge or
   dislodge that blockader first"; own piece → "clear the way before it can
   advance." Gates: 2 new boardPlan tests (blockaded + self-blocked never say
   "push it"). boardPlan 6/6. (OCB permanent-blockade with an empty front square
   is a deeper positional judgment — left out per "empty > invented"; the
   concrete blockade case is the board-true fix.)
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
4. **double-check detection is DEAD everywhere.** ✅ DONE (2026-09-13, C#4).
   Both `detectDoubleCheck` (missedTacticService + tacticClassifier) counted
   checkers by asking `chess.moves()` for a move landing ON the enemy king —
   which chess.js NEVER generates (no king-capture), so the count was always 0
   and double check was never detected (mislabeled a fork; the claim-validator
   then stripped legit "double check" mentions as not-in-vocabulary). Replaced
   with `chess.attackers(kingSq, movingColor)` (direct, turn-independent). The
   validator already had a `double_check` vocabulary entry — it just never had a
   live detection to back it, so this ALSO un-strips legit mentions, no validator
   change needed. Gate: 2 new tacticClassifier tests (a discovered double check
   is detected; a single check is not). tacticClassifier 26/26, missedTactic 36/36.
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

- **P0 — deep dive + this doc.** ✅ DONE (4 clusters mapped; findings above).
- **P1 — the keystone (`describeMoveGeometry` + the pin-aware SEE primitive).** ✅ DONE.
  Added `legalSeeGain` / `landingIsSafe` / `capturesWinMaterial` (legal-capture SEE,
  pin-aware by construction) to `positionReadingService.ts`. Rewrote
  `describeMoveGeometry`: landing-safety (fork/pin/material) now pin-aware
  (`landingIsSafe`, was pin-blind `seeGain(c,to)<=0`); fork now names only the
  genuinely WINNABLE targets (`capturesWinMaterial`, fixes "forks the king and the
  pawn"); the bare-"attacks" clause is safety-guarded at the SOURCE (kills the
  12/12 real en-prise-"attacks" hits AND #1 — the PV walk `assembleEngineReasoning`
  now never gets an unsafe attack, no consumer-side filter needed). Permanent gate
  `computedVoiceGrounding.test.ts` (11 tests: 6 real hanging-piece negatives, the
  pin-aware SEE unit, 4 real fork/pin/mate/capture positives) wired into ship-check.
  Verified: gate 11/11, groundedAnswer+positionReading 323/323, narrationAccuracy
  1834/1834 — no regression.
- **P1b — sweep the pin-aware SEE into the chat safety answers.** ✅ DONE (commit
  a45d899 on main). New `legalSeeGainFor(fen, square, capturingColor)`; swept
  `assembleHangingAnswer`, `assemblePieceSafetyAnswer`, `assembleThreatAnswer`,
  `assembleSquareControlAnswer` (→ legalSeeGainFor) and `quietPurposePhrase`
  landing-safety (→ landingIsSafe). Gate extended (pinned-attacker not "in
  trouble" / not listed loose). No regression (groundedAnswer 200, positionReading
  109). NB: verified deterministically by the gate + unit tests; a dedicated
  coach-CHAT prod audit ("is my bishop safe?" on a seeded pin) is a recommended
  follow-up addition (the chat wiring is unchanged, only the computation).
- **P1c-fork — fork forker-safety in `tacticsDetector.findForks`.** ✅ DONE.
  A fork the OPPONENT (to move) can meet by simply capturing the forker is no
  fork; gated with `capturesWinMaterial`, but ONLY when it's the opponent's move
  (if the forker's side is to move they capture a target first — the subtlety the
  old comment deferred, and which a real test fixture caught). Gate: tacticsDetector
  "does NOT call it a fork when the opponent just captures the forker". 35/35 +
  the groundTruth board-truth property test still green.
- **P1c-mate — false "checkmate available" for the side NOT to move.** ✅ DONE.
  `findMateThreats` now only reports the not-to-move side's mate-in-1 when it's
  genuinely unstoppable (`mateThreatIsUnstoppable` — every legal defense still
  leaves a mate-in-1); the side-to-move's own mate is still reported. Gate: 2 new
  tacticsDetector tests (parryable Rd8# with Black to move is NOT announced; the
  side-to-move's Rd8# is). groundTruth mate-puzzle test still green.
  **Follow-through (2026-09-13):** the fix left `tacticalRead.test.ts`'s
  mate_threat-downgrade fixture stale — its old parryable position no longer
  emits a mate_threat, so the wording-downgrade test went red. Regrounded it on
  a chess.js-verified UNSTOPPABLE not-to-move mate (`r5r1/8/8/2k5/8/7p/2P4P/7K w`
  — Black threatens Ra1#, White's only moves c3/c4 can't stop it), the shape the
  C#3 gate still emits. tacticalRead 42/42 green.
- **P1c-skewer — `missedTacticService.detectSkewer` diverged logic.** ✅ DONE.
  Ported the gated three-way threshold from `tacticsDetector.findSkewers`
  (front > attacker, front > back, back ≥ 3 — never a pawn prize); the old
  `front>back, back>=1` fired false skewers. No regression (missedTactic 36+26).
- **B#3 — `tacticalRead.summarizeVerdict` unverified "up a piece".** ✅ DONE
  (2026-09-13). The verdict mapped eval→material wording (+2.8 → "up a piece")
  with NO material check — a G3 false claim. Now the material clause is licensed
  ONLY by the board: added `materialDeltaPawns` (student-POV net material at the
  line's TERMINAL position, via `terminalMaterialDelta` + `getMaterialAdvantage`)
  and `materialLabel` (smallest honest label the count supports). Both live call
  sites (`computeTacticalRead`, `tacticalReadFromLines`) now pass the terminal
  material; the eval-only caller (`lineOutcomeClause`) passes none and frames by
  MAGNITUDE ("a decisive advantage" / "a winning advantage" / "clearly better")
  — never inventing material. Eval-gate + board-gate together are self-consistent
  (a truncation-artifact material count can't leak: it only speaks inside a
  winning eval band, and the eval already accounts for the recapture). NB: latent
  — no runtime surface currently speaks `verdict.text` (narrateTacticalRead /
  tacticalReadFacts are the "fallback floor", uncalled; CoachTeachPage +
  danyaBehaviors use the clause helpers, not the verdict). Fixed for correctness
  + to keep a future wiring honest. Gate: 3 new summarizeVerdict tests (positional
  edge stays magnitude-only; material claimed only when backed; bare eval invents
  nothing) + lineOutcomeClause regrounded to magnitude. tacticalRead 45/45.
- **A#7 — `assembleAttackAssessment` king-zone count is pin-blind.** ✅ DONE
  (2026-09-13). The attacker/defender count drove off raw `c.attackers()`, which
  is geometric — a piece pinned to its OWN king counted as a full attacker/
  defender, flipping "you have a real attack, press it" on a losing attack.
  (Verified chess.js `attackers()` already respects blockers — the flagged
  "x-ray of an empty square" does NOT reproduce; pins were the real defect.) Added
  `absolutePinRay` (removes the piece, confirms an enemy slider then checks the
  king along that exact line) + `bearsOnSquare` (a pinned piece is counted toward
  a zone square only when it lies on the pin ray). Swept both the attacker and
  defender loops. Gate: 2 new computedVoiceGrounding tests (control counts two
  bearing pieces; the first-rank-pinned rook is dropped → one). groundedAnswer
  200/200, positionReading 109/109, gate 15/15. **This is the last cheap-ish
  P1c item; the remaining ones are the counterfactual engine.**
- **C#5 — causalChain rode the pin-blind `seeGain` at every SEE site.** ✅ DONE
  (2026-09-13). Not a bulk-swap: verified all 8 `seeGain` call sites share ONE
  semantics ("is the piece on `square` winnable by its enemy") and introduced a
  local `winnableGain(chess, square)` that preserves it exactly but drives off
  the already-gated pin-aware `legalSeeGainFor` (forces enemy-of-owner regardless
  of recorded turn). Swept `hasWinnablePiece`, `targetWasSavable` (×2),
  `buildRemovedDefenderChain` (×4 incl. the proof string), `chainAvailableFor`,
  `findAllowedChain` (×2). Also hardened `exploitedLoosePiece`'s "loose" test:
  the geometric `after.attackers(_, enemy).length > 0` counted a defender pinned
  to its own king as a live guard (→ a genuinely loose piece read as defended and
  the chain went unbuilt); replaced with `winnableGain(after, sq) >= VAL[type]`
  (the mover wins the FULL piece iff there is no real, unpinned recapturer).
  `seeGain` import dropped (fully unused after the swap). Correctness inherited
  from the gated primitive; causalChain 26/26 + causalChainVoice 6/6 confirm no
  regression. `computeAttackMap` was not found in this file (stale reference).
- **P1c-rest — remaining Tier-2/3 items (NEXT):** latentDanger enemy-shield (B#2),
  boardPlan false push-passer (B#4), augmentWithProjections #4 ungated verdict
  (D#1), narrationImportance must-defend-when-winning (B#1), double-check dead
  detection (C#4), isCriticalThreat whole-line eval (C#6). Each its own pass + gate.
- **P2..Pn — the Tier-2/Tier-3 ranked list + Improvements & additions**, each its
  own change + gate + audit.

## Decisions log

- 2026-09-12: rush stays a fast speed drill (no full gated why); full why lives in
  drills/weaknesses. (David.)
- 2026-09-12: fix #1 approved; broadened into this deep-dive assignment. (David.)

## Sequencing logic

Fix the computed-voice core first (#1 and its neighbors in `groundedAnswer.ts`) —
it's the single chokepoint every surface's claims flow through, so one fix there
improves review + chat + teach + puzzles at once. Calculator-cluster findings
follow, ordered by how user-visible the wrong/thin claim is.

## SHIPPED so far (2026-09-13 session) — all on `main`, gated, prod-verified

Tier-1 disease (pin-blind SEE), fully swept: P1 keystone + P1b chat assemblers +
P1c-fork + P1c-mate + P1c-skewer + **A#7** (attack-assessment) + **C#5**
(causalChain: all 8 SEE sites via `winnableGain` + exploitedLoosePiece loose
test). Tier-2: **B#3** (verdict material honesty), **B#1** (must-defend bypasses
the contested gate), **B#2** (no enemy-shielded "latent pin"), **B#4** (no "push"
on a blockaded passer). Tier-3: **C#4** (double-check detection revived).
Incidental: a `tsc -b` build unblock on main (parallel session fixed the same
first; dup dropped). Each shipped with a real-position gate; ship-check green
each push.

## Next-session pickup

**DONE (above).** **HELD:** **D#1** (review: don't spell "you're winning" on an
unverified line) is committed but NOT pushed — it edits `coachFeatureService.ts`,
whose co-located `coachFeatureService.test.ts` has a PRE-EXISTING red test from
another session's `strategicWhyLed` led-vs-selfContained change (`:50` still
expects "It develops the knight…" but the code now says "It develops into the
game…"). That stale test blocks the shared changed-file gate for any change to
that file. Re-apply D#1 (`git cherry-pick` the saved commit / re-do the small
`render()` edit at the `terminalEvalCp` fallback) once that session updates their
test. Flagged to David.

**REMAINING (ranked, lower impact):**
- **C#6** (isCriticalThreat/scanUpcomingTactics attribute the WHOLE line's eval
  to every pattern → early-pin "critical" noise). NEEDS a design pass: the honest
  fix is per-ply evals, but `scanUpcomingTactics` is sync + engine-free (takes
  precomputed topLines). Thread a per-ply eval (or attribute `lineMate`/decisive
  eval only to the ply that causes it) — not a safe one-line heuristic. Deferred
  deliberately (empty > a fuzzy fix).
- **D#2** (reviewOpeningTheory bidirectional-`includes` name-match drift — reuse
  `identifyingTokens`/`GENERIC_TOKENS`), **D#5** (SAN-only dedupe keys silence a
  genuinely-new same-SAN threat — key on SAN+fenBefore/targets), **D#6** (causal-
  lead/recap per-game dedupe). D#5/D#6 live in `coachFeatureService.ts` → BLOCKED
  by the same stale test as D#1 until it's fixed; D#2 is in reviewOpeningTheory.ts
  (clean).
- **SEAM / unified-coach P1:** make `computeImportance` weakness-aware (let a
  persistent worsening weakness UN-SILENCE a fact, not just re-rank) — the biggest
  "build upon"; a real design change, sequence last.
- **Improvements & additions** (§ above): widen `quietPurposePhrase` coverage,
  grow the causal-chain pattern library + structure→plan library, eval-verdict in
  the drill why, the computed-voice regression-gate corpus.

**Method reminders:** 1. `scripts/audit-drill-why-prod.mjs` is the muted prod
pattern (clone per surface). 2. The eval method: run the calculator on real
`src/data/puzzles.json` positions and read output vs board (throwaway console.log
vitest). 3. The pin-aware SEE primitives are `legalSeeGain`/`legalSeeGainFor`/
`landingIsSafe`/`capturesWinMaterial` (positionReadingService) — reuse, never
reach for raw `seeGain`/`attackers()` at a safety/winnability decision. 4. Every
fix stays G0/G3 and ships with a real-position gate. 5. `coachFeatureService.ts`
is a HOT parallel-session surface — coordinate before editing.
