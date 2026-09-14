# Review-quality overhaul — full error inventory (2026-09-13)

David reviewed a real game on native iOS build `f8e0fd9` (game
`chesscom-1025633348`, Sicilian: Bowdler Attack, he was Black, lost) and logged
defects move-by-move + sent the 300-line audit log. His order: **"I want all
errors identified before anything gets touched."** So this is the identification
pass — every finding, its ROOT CAUSE at file:line, confirmed by reading the
pipeline. NO code has been touched.

Pipeline map (for every fix below):
`CoachGameReview.tsx` (walk UI) → `useReviewPlayback.ts` (auto-play state machine)
→ `coachFeatureService.ts` (`generateReviewNarrationSegments` / `buildReviewSegments`)
→ `reviewMoveTeaching.ts` (`buildReviewMoveTeaching` per-move why) +
`reviewOpponentCommentary.ts` + `reviewFullData.ts` (`describeMoveInfluence`) +
`reviewQuestionPlan.ts` (`selectReviewQuestions`) + `gameAnalysisService.ts`
(`classifyCpLoss`, budgeted Stockfish).

⚠️ NOTE: his device is on `f8e0fd9`, BEHIND the recent web deploys — some already-
shipped review fixes may not be on his phone. Confirm the build before attributing
a finding to code that's since changed. (Native ships via TestFlight only, on ask.)

---

## THE UNIFYING DISEASE (ties #8, #10, #11, #12 together)

**Shallow budgeted analysis mis-reads tactical/sacrificial positions.**
`REVIEW_POSITION_BUDGET_MS = 8_000` (`gameAnalysisService.ts:746`), review eval
depth 16 with a movetime budget. A sacrifice looks like material loss at low
depth, so:
- the "better move" the review suggests is a quiet move, not the tactic (#8);
- the student's winning sac is graded an inaccuracy (#11);
- the QUESTION planner mis-routes: `find-shot` requires the student was ALREADY
  clearly better (`evalBeforeMover >= GUIDED_FIND_MIN_EVAL_CP`,
  `reviewQuestionPlan.ts:106-108`). A sac/tactic that FLIPS the eval doesn't
  qualify, so the moment falls through to a remedial `trap`/`why` (#10, #12).

Fix the depth-on-tactics root and three symptoms clear at once. This is the
highest-value + hardest work.

---

## A. STRUCTURAL / deterministic

### A1. Duplicate narration on review entry (#1) — CONFIRMED
"Coach said the same line twice — once during 'sharpening analysis before entering
review', again directly after entering." Plus the audit log shows the intro / plies
re-spoken 2–4× from background/foreground visibility cycles.
- Root cause: `useReviewPlayback.ts:170-183` resets `introSpokenRef.current = false`
  every time the `narration` object identity changes. A **background deepen** that
  lands mid-review changes the annotations → `reviewNarrationCacheKey` changes
  (`CoachGameReview.tsx:546`) → `walkNarration` regenerates → new `narration`
  object → intro re-speaks AND the walk snaps to ply 0 (`:182`). The "sharpening
  analysis" phase speaks the first-pass intro; the deepen completes and re-speaks it.
- The 2026-09-05 fix (`CoachGameReview.tsx:478-482`) only stopped the *legacy
  summary* from speaking on mount — it did NOT stop the deepen-regenerate re-speak.
- FIX: freeze the review against mid-session narration-identity churn (there's a
  freeze ref hinted at `:139`), or gate the intro speak on a per-GAME id, not the
  bundle identity. Speak the intro exactly once per game open.

### A2. Auto-play does not resume after pause (#6) — CONFIRMED code defect
"Click play → plays that one move then stops; hit play again to get auto going;
and it restates the narration it just said before advancing."
- `togglePausePlay` (`useReviewPlayback.ts:480-494`) resume branch calls
  `speakCurrent(currentPly, currentText)` — RE-SPEAKS the current ply but NEVER
  sets `autoRef.current = true` / `setIsAutoPlaying(true)`, so `scheduleAdvance`
  bails at `:254` (`if (!autoRef.current) return`) → no auto-advance. The proper
  `play()` (`:464`) sets autoRef; the toggle doesn't route through it.
- The main ▶ button (`CoachGameReview.tsx:3769`) DOES call `play()` (looks
  correct in code — VERIFY live). The relabeled "Replay narration" button
  (`:3824`) calls `togglePausePlay` — that's the buggy path.
- The "restates the narration it just said first" complaint hits BOTH buttons:
  `play()` also re-speaks the current ply (`:477`) on resume. If the ply was
  already fully spoken when paused, resume should advance to the NEXT ply, not
  re-speak the current one.
- FIX: `togglePausePlay` resume routes through `play()` (sets auto). On resume,
  if the current ply's narration already completed, advance instead of re-speaking.

### A3. Playout arrows appear all at once, not as each move is named (#3) — CONFIRMED
- `CoachGameReview.tsx:2389-2413`: the auto-arrow effect paints
  `spokenLineArrows` CUMULATIVELY on a fixed `700 + i*1000ms` timer, decoupled
  from the spoken narration. The arrows race ahead of / behind the words.
- FIX: reveal each line arrow AS its move's clause is spoken — drive the reveal
  off the narration segments (the same per-sentence lead-the-eye sync Learn uses,
  `segmentReveal`), one arrow at the moment that move is named.

---

## B. CONTENT / perspective

### B1. Check narration: redundant + wrong perspective (#5) — CONFIRMED
"'check comes with check so it forces their king to react' — redundant, and they
are checking ME, so it's MY king, not their king." (Heard in the proposed line.)
- Redundancy: `sanitizeForTTS` expands the SAN "+" → ", check", then a template
  ALSO appends "with check". Sources that append it: `pvPlayback.ts:425`,
  `dnaLineNarrator.ts:102`, `continuationMoveNarration.ts:114`
  ("with check, so the reply is forced"). Double "check".
- Perspective: `reviewMoveTeaching.ts:284` returns "The check forces THEIR king
  to react — YOU set the tempo and keep the initiative" — written assuming the
  STUDENT is the checker. `frameTeachingForOpponent`
  (`coachFeatureService.ts:1034-1057`) reframes opponent moves with a shallow
  regex that only swaps the piece subject (`:1045` "The check…" → "Your
  opponent's check…") and LEAVES "their king" + "you set the tempo" intact —
  both now wrong when the OPPONENT checks the student.
- `groundedMoveWhy.ts:29` has the same fixed "forcing the king to react".
- FIX: whose king is in check = the side-to-move's king (compute it, don't
  assume the student). Drop the redundant "with check" when the SAN already
  carries "+". Make the reframe seat-aware, not a subject-swap regex. SWEEP all
  check/threat templates for the same you/they inversion.

### B2. "Be7 covers f8, getting into the game" — trivial/wrong point (#7) — CONFIRMED
Ply 12: narration said Be7 "covers f8, getting into the game." f8 is the bishop's
own now-empty origin — meaningless mechanics — and it MISSED the real point (Be7
unpinned the knight + pressured their bishop). Same shape at ply 13 (Nd2 "covers
f1").
- Root cause: `reviewMoveTeaching.ts:320-324`, the (f) LAST-RESORT fallback:
  `The <piece> settles on <to>, covering <holds> and getting into the game.`
  where `holds = eyes.controlled[0]` — the first empty square the piece controls,
  which can be its own origin / a back-rank square.
- WHY it fell to (f): `buildReviewMoveTeaching` has NO pin/unpin detection, and
  `winnableTarget` (`:191-194`) excludes DEFENDED equal pieces — so pressure on a
  defended bishop never surfaces. Be7 has no central target (`:205-210`), no
  check, no winnable target, no file, no central control → falls all the way to (f).
- FIX: (a) never report "covering" an EMPTY square or the piece's own origin;
  (b) DETECT the real developing points — UNPIN (the moved piece was pinned, or
  it un-blocks a pin on a friendly piece) and NEW PRESSURE (a second attacker /
  a pin created on an enemy piece) — and lead with those. Move-influence quality
  upgrade. NB `describeMoveInfluence` (`reviewFullData.ts:580`) already dropped
  the "guards own square" filler — the surviving offender is the (f) fallback.

### B3. Proposed-line narrations generic, "no computer behind them" (#4)
- The show-me / walk-the-line playout (`CoachGameReview.tsx` runShowMePlayout /
  walkSpokenLine ~`:2160`, `:3368`) narrates the projected line, but the per-move
  text reads generic vs the computed played-move facets.
- FIX: tie each proposed-line move to its computed WHY (the PV `plyFactsClause` /
  `plyFactsString` from `pvPlayback.ts`, the same fact-computer the played moves
  use). No filler prose — G0.

### B4. Proposed-line narration cut off at ply 15 (#9)
- The projected-line narration truncated mid-sentence. Suspect a length/segment
  budget clipping the spoken line, or the next auto-advance/voice.stop()
  superseding it before it finishes.
- FIX: repro against his FEN; let the projected-line narration finish (segment it
  so a hold doesn't cut it, or don't supersede until the promise resolves).

---

## C. QUESTION QUALITY

### C1. Remedial / pointless questions (#10, #12) — CONFIRMED, tied to the disease
- #10 (ply 15): asked "the knight on d2 looks like it's just sitting there — do
  you take it?" → answer "it's poisoned" (defended by the king). That's a `trap`
  question (`reviewQuestionPlan.ts:112-114` playedCaptureIsPoisoned →
  `buildTrapQuestion`). It fired on the obvious defended non-capture INSTEAD of
  the real tactic he missed — because the missed tactic never qualified as a
  `find-shot` (the disease: shallow eval didn't show him "already better", so
  `:104-108` skipped find-shot and fell to trap/why).
- #12 (ply 17): "another question that had no answer. Confusing and pointless."
  A `why`/`trap` moment whose real content (a tactic) wasn't found → an empty
  question. (Note the why-picker UI was stripped 2026-08-28,
  `CoachGameReview.tsx:987-995` — a planned `why` now just advances; so the
  pointless questions are `trap`/turning-point cards, not why-pickers.)
- FIX: gate questions on real, answerable content — run tactic detection so a
  missed shot routes to find-shot (fixes the disease), and never surface a
  trivial defended-capture "trap" as the question. Suppress a moment with no
  meaningful answer.

---

## D. ANALYSIS DEPTH (the disease, detailed)

### D1. Review is MISSING tactics (#8) — "REVIEW CANNOT BE MISSING TACTICS!"
Ply 14: review suggested a quiet pawn move to kick a bishop; a TACTIC was there.
- Root cause: the budgeted best-move (`gameAnalysisService.ts`, budget depth) at
  ply 14 returned the quiet move; `detectTactics` isn't consulted for the
  "better move" on a non-flagged ply. `deepenBestMoveOnSlip` (BEST_MOVE_DEPTH,
  `:34`) only re-deepens on a CLASSIFIED slip.
- FIX: run tactic detection / a deeper probe on flagged AND tactically-rich plies
  so the review surfaces the tactic as the better line.

### D2. A brilliant sac graded an INACCURACY (#11) — the big one
His found move (chess.com = BRILLIANT) the app graded inaccuracy; it then feeds
the weakness profile as a false "mistake" he'd be drilled on.
- Root cause: `classifyCpLoss` (`gameAnalysisService.ts:242`) checks `isBrilliant()`
  ONLY on the eval-GAIN branches (`:335`, `:344`, negative cpLoss). A sac the
  shallow eval scores as a material LOSS produces POSITIVE cpLoss → hits
  `:341-343` (blunder/mistake/inaccuracy) and `isBrilliant()` is NEVER consulted.
  The `detectBrilliancy` gate exists but is unreachable on the +cpLoss path.
- FIX: on a material-SACRIFICING candidate the shallow eval flags as +cpLoss,
  RE-DEEPEN (BEST_MOVE_DEPTH or deeper) before classifying — if the deeper eval
  recovers/wins, it is NOT a mistake; then run `isBrilliant()` so a sound sac can
  reach the `great`/`brilliant` class. Same shallow read as D1/#10/#12.
- Blast radius (bigger than review): `classifyCpLoss` also feeds mistake-puzzles +
  `computeWeaknessProfile`, so fixing it stops a brilliancy becoming a drilled
  "weakness" across the whole data pipeline.

---

## E. ADDITIONAL (proactive, beyond David's list)

- E1. Perspective bug B1 is SYSTEMIC — `frameTeachingForOpponent` reframes with a
  subject-swap regex that can't fix internal "you"/"their" pronouns. Sweep every
  seat-free template it reframes (`reviewMoveTeaching` returns), not just the check.
- E2. A3 arrow-timing should adopt the SAME per-sentence reveal engine as the
  Learn swap-per-phrase work already shipped — unify lead-the-eye across surfaces.
- E3. "Checks, captured, threats" (audit Finding 27): NOT reproduced in our
  templates (all say "captures"). Likely David's transcription or a corpus line;
  low priority — verify against the exact audit string before acting.
- E4. master-play-lookup `source=none` for the Bowdler Qh5 position (Finding 296):
  the Bowdler is a rare sideline with no masters coverage — expected (empty >
  invented), not a bug. Confirm it degrades silently, don't fabricate.
- E5. Audit-log noise: the review playback emitted ~208 of 300 findings (4 events
  per arrow key) and evicted the actual game from the buffer
  (`useReviewPlayback.ts:367-372` already trimmed this once) — confirm the trim
  is on his build; if the log is still 4/arrow, the diagnostic is eating the
  evidence again.

---

## Fix order (tight loops, per CLAUDE.md — clarify with David before each build)
1. **A1/A2/A3** — deterministic structural (dup intro, auto-resume, arrow sync).
2. **B1 + sweep (E1), B2** — perspective + move-influence quality.
3. **D2 then D1** — the analysis disease (sac-aware re-deepen); C1 + B3/B4 fall
   out of it. Highest value, hardest, biggest blast radius (weakness pipeline).
Batch the deploy (Vercel/Netlify caps). 3-instrument MUTED review audit after
main push (`scripts/audit-review-overhaul-prod.mjs`). ship-check before push.
