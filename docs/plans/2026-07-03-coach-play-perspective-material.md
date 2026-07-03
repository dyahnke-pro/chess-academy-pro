# Coach Play — perspective inversion + material guess + phase-narration integration (2026-07-03)

David's TestFlight report (build 91): in Play-with-Coach, the opening→middlegame
phase narration cast a WHITE student as Black ("your knight on d4… target White's
pawn chain"), claimed "equal material" while the student was +2, and the phase
message landed as a detached bubble instead of flowing into the chat thread.

## Root causes (grounded)

1. **Perspective inversion (color).** `buildChessContextMessage`
   (`coachPrompts.ts:1079`) derives the tactics/threat perspective from the FEN
   **side-to-move** (`stm`), not the student's color. Phase narration fires right
   after the student's move, so the FEN says "opponent to move" → the tactics
   block is framed from the opponent's side → the brain voices it as "you" →
   color inverted. `usePhaseNarration` already computes the correct
   student-perspective tactics (`phaseTactics` via `event.playerColor`) and passes
   it as `liveState.tactics`, but the conflicting `userMessage` block (stm) plus
   "Black to move" overrides it.

2. **Material guess.** The 300 ms Stockfish race budget (`STOCKFISH_FAST_BUDGET_MS`
   in `usePhaseNarration`) loses on mobile → `stockfishAnalysis = null` → no eval
   reaches the brain → it guesses "equal material." Material is computable in code
   (G0) — it should be handed over, never guessed.

3. **Phase narration not integrated.** The phase text is spoken + shown as its own
   bubble, not appended to the coach chat `discussion` stream with the rest.

## Fix

- **F1 (perspective):** add `CoachContext.perspective?: 'w' | 'b'`.
  `buildChessContextMessage` uses `ctx.perspective ?? stm` for the tactics block.
  Existing callers (student on move) unaffected — stm == student then. Phase
  narration sets `perspective = event.playerColor`. G0: the color fact is
  computed in code and handed over, not inferred by the LLM.
- **F2 (material):** `buildChessContextMessage` always emits a code-computed
  material balance line from the FEN ("Material: White +2"), so the brain voices
  the real count instead of guessing.
- **F3 (stockfish budget):** raise the phase-narration fast budget so the eval
  actually lands on mobile (accuracy > ~1s latency); material grounding (F2)
  covers the case where it still times out.
- **F4 (integration):** append the finished phase narration to the coach chat
  `discussion` so it files into the rest of the narrations.

## Status
- F1 (perspective) — DONE. `CoachContext.perspective`; `buildChessContextMessage`
  uses `ctx.perspective ?? stm`; `usePhaseNarration` sets it from `event.playerColor`.
- F2 (material) — DONE. `computeMaterialBalance(fen)` always emitted (G0 floor).
- F3 (stockfish budget) — DONE + HARDENED. First cut just raised the race
  budget, but David caught that `analyzePosition(depth)`-raced-to-null still
  demands a target depth and throws away the result on timeout — 3s wouldn't
  reliably reach depth-8 on asm.js, so it'd be null again. Fixed properly:
  both hooks now use `analyzeWithBudget(fen, depth, budgetMs)`, which `stop()`s
  the engine at the budget and returns the BEST line reached so far (depth 5/6
  on asm, full depth on desktop which resolves early). We take what it found in
  the time instead of demanding a depth — never null unless the engine is dead
  (material floor covers that). Budget: asm 3000ms, desktop 1200ms. Stockfish is
  the #1 call; determinism is the fallback (David 2026-07-03).
- F4 (integration) — already wired (`CoachGamePage:1670` onReport →
  injectAssistantMessage). The disconnect was the wrong content; fixed by F1/F2.
- Capgo OTA (separate ask) — pending.

Tests: coachPrompts.test (computeMaterialBalance + material-always) +
usePositionNarration.test mock updated. ship-check green.

## Also flagged
- Per-move student narration may share the same stm-perspective latent bug
  (narrates after the student's move → opponent to move). Audit after F1 lands.
