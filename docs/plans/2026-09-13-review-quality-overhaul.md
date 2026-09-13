# Review-quality overhaul — David's live-game findings (2026-09-13)

David reviewed a real game and logged defects move-by-move. Audit log incoming
(will pin exact strings + FENs to repro the content/analysis bugs against HIS
game). This doc catalogs every finding, the root cause where known, and the fix
plan. Grouped by class + tractability.

## A. STRUCTURAL / deterministic (root-caused, no audit log needed)

### A1. Duplicate narration on review entry (#1)
Coach said the same line twice — once during "sharpening analysis before entering
review", again directly after entering. Two speak sites fire the same intro:
the pre-walk/analyzing phase AND the walk mount. Root cause: the intro
(`coachFeatureService` review-intro voiceFacts) is spoken on the analyzing
screen AND re-spoken when `walkNarration` mounts. FIX: speak the intro exactly
once — gate the mount-time speak if the analyzing-phase already spoke it.

### A2. Auto-play does not resume after pause (#6) — ROOT-CAUSED
"Click play → plays that one move then stops; hit play again to get auto going;
and it restates the narration it just said before advancing." Root cause in
`useReviewPlayback.ts`: the Pause/Play button's resume path (`togglePausePlay`
else-branch) calls `speakCurrent(...)` — it RE-SPEAKS the current ply (the
repeat) but never sets `autoRef.current = true` / `setIsAutoPlaying(true)`, so
`scheduleAdvance` bails (`!autoRef.current`) → no auto-advance. The proper
`play()` sets autoRef; the button doesn't route through it. FIX: resume routes
through `play()` (sets auto), and does NOT re-speak a ply already spoken — if the
pause happened AFTER the ply's narration, advance to the NEXT ply; only re-speak
when paused mid-sentence.

### A3. Playout arrows appear all at once, not as each move is named (#3)
The proposed-line arrows flash cumulatively on a fixed cadence BEFORE/around the
statement. Root cause: `CoachGameReview` auto-arrow effect (~line 2389) paints
`spokenLineArrows` on a `700 + i*1000ms` timer, NOT synced to the spoken move
naming. FIX: reveal each line arrow AS its move is named — drive the reveal off
the narration segments (the same lead-the-eye sync Learn uses), one arrow per
move at the moment that move's clause is spoken.

## B. CONTENT / perspective (need audit log to pin exact strings)

### B1. Check narration: redundant + wrong perspective (#5)
"check comes with check so it forces their king to react" — (a) "check comes
with check" is redundant; (b) the OPPONENT is checking the student, so it's the
student's king ("your king"), not "their king". Perspective inversion in a
check/threat template (candidates: `continuationMoveNarration.ts:114`,
`groundedAnswer.ts` check clauses, `dnaLineNarrator.ts`). FIX: fix the pronoun
(whose king is in check = side-to-move's king) + drop the redundant clause.
SWEEP for the same you/they inversion across the review check/threat templates.

### B2. Move-influence names a trivial/wrong point (#7) — "Be7 covers f8"
Ply 12: "you played Be7 and it covers f8, getting into the game." f8 is the
bishop's own (now-empty) origin — defending it is meaningless mechanics, and it
MISSED the real point (Be7 unpinned the knight + pressures their bishop).
`describeMoveInfluence` only emits "eyes X / fights for center"; the "covers f8"
comes from a guards/boardDelta clause that reports defending an empty origin
square. FIX: (a) never report "covers/guards" an EMPTY square or the piece's own
origin; (b) detect the real developing-move points — UNPIN (the moved piece was
pinned / it blocks a pin on a friend) and NEW PRESSURE on an enemy piece — and
lead with those. This is a move-influence QUALITY upgrade.

### B3. Narrations generic, "no computer behind them" (#4)
The proposed-line move narrations read generic, not computed per-move. Tie each
proposed-line move to its computed WHY (the PV/eval fact for that move), same as
the played-move facets — no filler prose.

### B4. Narration cut off at ply 15 (#9)
The proposed-line narration truncated mid-sentence. Likely a length cap / segment
budget clipping the spoken line. FIX: find the clip and let the proposed-line
narration finish (or segment it so it isn't cut).

## C. QUESTION QUALITY (need audit log)

### C1. Remedial / pointless questions (#10, #12, #17)
- Ply 15: asked "why didn't you take the knight on d2 with your queen" when it
  was defended by the king — an obviously-bad non-move. Should have asked about
  the TACTIC the student missed.
- Ply 17: "another question that had no answer. Confusing and pointless."
Root cause: `reviewQuestionPlan.ts` selects questions that don't clear a
"is this actually interesting/answerable" bar. FIX: only ask when there's a real
decision (a missed shot / a genuine fork), never about a defended-capture
non-move; suppress questions with no meaningful answer.

## D. ANALYSIS DEPTH / QUALITY (deep — repro against HIS game via the log)

### D1. Review is MISSING tactics (#8) — "REVIEW CANNOT BE MISSING TACTICS!"
Ply 14: the review suggested a quiet pawn move to kick a bishop, but a TACTIC was
available that the student (and the review) missed. The "better move" wasn't the
best. Root cause: budgeted review analysis (`REVIEW_POSITION_BUDGET_MS`) too
shallow to find the tactic, OR the tactic detector isn't consulted for the
"better move" suggestion. FIX: run tactic detection (detectTactics / a deeper
probe) on flagged/critical plies so the review surfaces the tactic as the better
line, not a quiet move.

### D2. A brilliant sac graded as an INACCURACY (#11) — the big one
The tactic the student finally FOUND (chess.com graded it BRILLIANT) the app
grades an INACCURACY. Root cause: shallow budgeted eval sees the sacrifice as
material loss (negative at low depth) and never sees the compensation/forced
win, so cpLoss classifies it a mistake. FIX: sac-aware classification — when a
move sacrifices material but leads to a forced tactic/mate or eval recovery at
deeper depth, it must NOT be graded a mistake. Deepen analysis on
material-losing candidate moves before classifying; recognize a brilliancy
(sound sac) class. This is the highest-value + hardest item.

## E. WHAT ELSE I SEE (proactively, beyond David's list)
- The perspective bug (B1) is likely SYSTEMIC — the review's check/threat
  templates were written opponent-POV; sweep all of them, not just the one line.
- Arrow timing (A3) + the swap-per-phrase work already done on Learn: Review's
  playout arrows should adopt the SAME per-sentence reveal engine, unifying the
  lead-the-eye behavior across surfaces.
- "getting into the game" (bad-bishop phrase) leaking onto a GOOD developing move
  (B2) suggests the bad-bishop/development facet fires without checking the move
  actually IS a bad piece — verify the facet's precondition.
- Sac-grading (D2) is not review-only: the SAME shallow classification feeds the
  weakness profile + mistake puzzles, so a brilliancy becomes a false "mistake"
  the student gets drilled on. Fixing D2 improves the whole data pipeline.

## Fix order (tight loops)
1. Structural first (A1/A2/A3) — deterministic, no log needed.
2. Content/perspective (B1–B4) + questions (C1) — once the audit log pins strings.
3. Analysis depth (D1/D2) — repro HIS game from the log; the hardest, highest value.
Batch the deploy per CLAUDE.md; 3-instrument review audit after.
