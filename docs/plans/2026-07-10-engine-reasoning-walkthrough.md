# Coach deciphers WHY Stockfish likes a move — grounded, every surface

David 2026-07-10:
- "get the coach to walk someone through stockfish's reasoning for best moves in
  game review"
- "Or not just game review, but in general. Let's get the coach deciphering why
  Stockfish likes a move."
- "Remember coach is master of all now. No single isolated tabs."

## The gap

When a user ASKS "why is that the best move?" / "why does the engine like Nf5?" /
"walk me through the engine's line", the coach today routes to the THIN
`assembleMoveEvalAnswer` (names the move + the eval: "Nf5 is best. You're +2.3.")
— it never explains the engine's REASONING. The rich content exists
(`assembleMovePurpose`: geometry + outpost + PV plan + eval) but is only wired
into per-move AUTO commentary (`coachMoveCommentary.ts`), never reachable from a
typed/spoken question on any surface.

## The fix (G0: computed in code, voiced by the LLM)

The engine's "reasoning" = its principal variation. `buildEnginePlan(fen, side)`
already returns the PV in SAN + eval (`enginePlan.pvSan` = [bestMove, reply,
follow, reply2, ...]). We WALK that line, naming what each of the engine's moves
achieves (fork/pin/check/wins/outpost/develops — from `describeMoveGeometry`),
ending on the eval verdict. Pure board + engine facts; the LLM only phrases them.

### Chunks (one commit each)

1. **`assembleEngineReasoning`** (groundedAnswer.ts) — new pure assembler. Walks
   the PV: clause 1 = the best move + its geometry; clauses 2..N = "if <opp
   reply>, then <engine move> <geometry>" for the next 1-2 engine plies; final =
   the eval verdict from the student's POV. Reuses `describeMoveGeometry` +
   `evalPhrase`. Returns null on an illegal/empty PV (empty > generic > invented).
   Falls back to just clause-1 geometry + eval when the PV is a single move.
   Unit test on a known tactical FEN.

2. **`isWhyBestMoveQuestion`** + `whyBestMoveQuestion` flag (questionIntents.ts).
   Distinguishes "WHY is it best / explain the engine's thinking / walk me
   through the line" from the plain "WHAT's the best move" (`bestMoveQuestion`).
   Phrasings: why is that best, why does the engine like/pick/prefer X, explain
   the best move / the engine's move / the line, walk me through the engine('s)
   line/reasoning/thinking, break down the best move, what's the idea behind the
   engine's move, how does the engine see this, why not <my move>.

3. **Dispatch** (coachApi.ts) — `whyBestMoveQuestion` on `MasterGroundingOptions`
   + the `intentFired` gate + a branch BEFORE the thin `bestMoveQuestion` one:
   `enginePlan.pvSan` present → `assembleEngineReasoning` (full walk); else
   `engineBestMoveUci` present → single-move geometry + eval (lighter "why").
   Draws the best-move arrow. Voiced through `voiceFacts` (preferRaw).

4. **Centralize the PV in the spine** (coachService.ts) — "coach is master of all,
   no isolated tabs": when `whyBestMoveQuestion` fires, a FEN is present, and the
   surface didn't pre-inject `enginePlan`, build it on demand
   (`buildEnginePlan`). Best-effort + null-safe — so the reasoning walk works on
   EVERY surface (chat, teach, play, review, mic), not only the ones that already
   pre-build a plan. Existing plan/best-move behavior unchanged.

5. **Matrix + audit** — add a "why-best-move / engine-reasoning" family to the
   question matrix (3+ phrasings, escalating). ship-check, then push to main +
   3-instrument audit.

## Non-negotiables
- G0/G3: the LLM decides zero chess content — every move + reason is computed.
- Reasoning degrades SAFE: no PV → single-move geometry; no engine data → the
  existing thin best-move / safe default. Never free-LLM chess prose.
- Every surface, identical capability (spine-level, not per-tab).
