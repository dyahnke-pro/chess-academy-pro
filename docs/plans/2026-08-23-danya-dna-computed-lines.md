# Danya DNA for computed lines — the real fix for "computed teaching is irrelevant or wrong"

Branch: `claude/danya-computed-lines` (off current shipping `main` = 8a67c600,
the 3.6 App Store line + paywall-off + reorder). NARRATION WORK — stays on the
branch, real-game audit before prod, David approves before ship (his standing
rule: "I should have had you push to branch").

## The bug (David's device log, 2026-08-22, native iOS)

Free-play `/coach/teach` speaks a teaching line per turn. Two kinds:
- **computed / board-true** — "pawn on d4 forks bishop on e3 and knight on c3",
  "White is slightly better (about 0.6)". CORRECT, but flat/robotic.
- **borrowed** (`voicePackage.ts` `borrowed` tier) — corpus notes transferred
  from a DIFFERENT board, framed "As a rule in these positions…": e.g. "The
  knight is lost but refuses to die quietly. It captures the rook, then gives
  check…" on a board where none of that happens. **WRONG / irrelevant.**

David: *"Most computed teaching are irrelevant or wrong to the current position."*

### Root cause
1. The `borrowed` tier is structure/concept transfer — inherently about another
   board. Since 2026-08-15 it only stands down for *event* lanes (mistake /
   coach-slip / drawback); the routine plan no longer silences it, so it fires
   on ~every turn.
2. `verify()` only rejects claims naming a *falsifiable* square/config ("knight
   on f6" when f6 empty). A borrowed note written as generic narrative names
   nothing checkable, so it passes grading and is spoken as if it describes THIS
   board.
3. `coachTeach.teachingTier.selectionSearch` "settles" on the least-false
   candidate instead of speaking nothing → empty > generic > invented violated.

## The fix (David's call, 2026-08-23): "getting the Danya DNA working for
## computed lines. That is the best fix."

Give the CORRECT board-computed lines the Naroditsky teaching voice, then let
them carry the turn — so the borrowed-narrative tier is no longer needed to
sound like teaching, and can stand down.

The engine already exists (ported from `claude/danya-chess-teaching-patterns-e1efik`
into `src/services/tacticalRead.ts`):
- `computeTacticalRead(fen,{engine})` → board-true `TacticalRead` (best line,
  verdict, key tactic named to pieces, tempting-but-wrong + refutation).
- `tacticalReadFromLines(fen, topLines, color)` → same, from ALREADY-computed
  MultiPV (latency-safe, no extra engine sweep).
- `tacticalReadFacts(read,{inGame:true})` → labeled facts string (the G0 seam).
- `TACTICAL_READ_DIRECTIVES` → Danya directives for `voiceFacts` (shape not
  script; strict grounding: no ungrounded piece/pattern, never reject best).
- `narrateTacticalRead` → deterministic fallback floor (no model available).
- G0 guards: `voiceNamesUngroundedMove`, `voiceRejectsBestMove`, `groundedMoveKeys`.

## Phased plan

- [x] **P1 — wire the computed read as the primary teach voice.** Per turn,
  build a `TacticalRead` from the turn's ALREADY-computed engine lines
  (`tacticalReadFromLines`, latency-safe) and phrase it via `voiceFacts` under
  `TACTICAL_READ_DIRECTIVES`, guarded by `voiceNamesUngroundedMove` /
  `voiceRejectsBestMove` (drop/regen on trip). Fallback = `narrateTacticalRead`.
- [x] **P2 — stand the borrowed tier down when the computed read spoke.**
  In `voicePackage.ts`, extend the stand-down key so `borrowed` yields whenever
  a board-true computed read is in `kept` (restores David's 2026-08-10 "the
  general rule yields to the particular board", fixing the 08-15 over-relaxation
  that let it fire on ~every turn). Kill the "settle on least-false" — a note
  with any false sentence is dropped, not spoken.
- [ ] **P3 — tune the Danya register** so it matches the reference ("didn't
  sound like the original" was the revert reason). Iterate with the narration
  listener capturing the exact spoken lines; compare to the Naroditsky tape
  rubric (concept-first, facts then the point, warm-but-rigorous, plays the line
  out, no praise/filler).
- [ ] **P4 — real-game narration audit** (the locked standard,
  `audit-review-real-game.mjs` shape): seed a real game, walk every ply, assert
  the spoken line is board-true AND in-voice; 3 instruments. On the branch.
- [ ] **P5 — David approves → reconcile branch onto current main → ship → prod
  audit.**

## Decisions log
- 2026-08-23 David: the Danya-computed-line approach is THE fix (over merely
  tightening the borrowed tier).
- Base = current main (8a67c600) so the eventual ship includes paywall-off +
  reorder; the old danya branch (508712a) predates the 3.6 reset and is the
  wrong base — only its `tacticalRead.ts` engine is reused.

## Key architectural finding (2026-08-23, before wiring)
Current main's free-play move narration is **DETERMINISTIC** — the `facts`
bundle in the trackA block is the AUDIT RECORD; the spoken line comes from
`buildVoicePackage` (code templates), NOT a per-move model call. They removed
model-per-move on purpose (2026-08-02 prompt-leak incidents: the student heard
the prompt read aloud). So the fix that FITS the architecture is the
**deterministic Danya read** (`narrateTacticalRead`: affirm→but→refute→line→
point→verdict), NOT routing through `voiceFacts`+directives per move. That was
my earlier assumption and it is wrong for this surface — do not add an LLM call
on the move hot path.

## Next-session pickup (concrete)
1. **Wire site:** `CoachTeachPage.tsx` trackA block. `studentBest =
   analyzeWithBudget(probe.fen(), COACH_TURN_DEPTH, 1200)` at ~L7065 gives
   `studentBest.topLines` — the engine lines already in hand (no new sweep).
2. **Enrich the RECOMMENDATION beat (~L7218+), don't add a competing beat**
   (the file is obsessed with dedup / double-speak). Build the read via
   `tacticalReadFromLines(probe.fen(), studentBest.topLines, playerColor,
   {maxPlies:6})` and fold `narrateTacticalRead(read)` (or its line+point+
   verdict clauses) into the existing rec beat — the branch's proven shape was
   `${recLineBase} Play it out: ${seq} — ${point}` (see branch
   508712a CoachTeachPage ~L7440-7476), plus `speakTemptingTurn` for the but-turn.
3. **P2 stand-down:** in `voicePackage.ts` extend `pvSpoke()` so `borrowed`
   yields when the computed read spoke (fix the 08-15 over-relaxation). Couple
   with P1 or it recreates "I need to hear the corpus!!".
4. **Then** capture a real line on the branch (narration listener) → tune to
   David's ear (P3) → real-game audit (P4) → approve → reconcile onto main.

NOTE: this is careful surgery on the coach's core with paying customers on the
App Store; the real-game narration audit (LLM + browser drive) MUST run on the
branch before it goes near prod. Do not ship on typecheck alone.
