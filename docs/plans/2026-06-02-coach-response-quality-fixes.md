# PLAN — Coach response-quality fixes (2026-06-02)

Driven by the adversarial board-grind audit (`scripts/audit-coach-board-grind.mjs`
+ `scripts/audit-coach-rigor-probes.mjs`, run against prod). The coach is strong
at factual board reads and resisting false premises/fabrication, but it (a)
hallucinates board state / tactics when asked to EVALUATE, and (b) gets its
legitimate plan answers strangled by the master-play claim-validator on off-book
positions. Findings, by severity:

| # | Sev | Finding | Fix |
|---|-----|---------|-----|
| 1 | P1  | `/coach/play` open positional questions ("name undefended pieces", "give me a plan", "most forcing move") → `claim-validator-trip` ×13 + `master-play-enforcement-fallback` ×2 + `llm-error` ×5 → canned "run it through the engine" deflection or 70s timeout. | **FIX C** |
| 2 | P1  | Post-castle: coach said "king on e8" when it was on g1 (board-confirmed). Set-positions read Kg1 correctly → board-state hallucination. | **FIX A** |
| 3 | P1  | Mate-in-1 missed + invented escape squares (named f7, occupied by the king's own pawn) on a set position. Engine-grounding didn't catch it. | **FIX A/B** |
| 4 | P1  | `/coach/chat` confirmed a FALSE premise ("Bb5 pins Nc6 to the king") and fabricated justification. The d7-pawn blocks the diagonal; not a pin. Rejected 4/5 other false premises — inconsistent. | **FIX D** (+A where a board exists) |
| 5 | P3  | `/coach/teach` "I played e4. Your move." with no active walkthrough → bled the prior French Q&A instead of a move-by-move reply. | **FIX E** |

Verified OK (no change): G5 brief cap HELD (real `/api/tts` text = 29 words vs 73-word bubble); G3 fabrication resistance (refused fake openings + Bongcloud stat); jailbreak declined; off-canonical spelling understood.

## The through-line
The app's doctrine is "code owns the facts, the LLM only writes prose." The live
coach Q&A is the one place that isn't enforced — it lets the LLM *compute* board
state and tactics, which is where it hallucinates. The fixes extend the existing
deterministic grounding (TacticsLiveContext / groundedSans) to cover board facts
and legal moves.

## Fixes

### FIX A/B — Deterministic BOARD FACTS block  (kills #2, #3; helps #4)
- Extend `TacticsLiveContext` (`src/coach/types.ts`) with `boardFacts?: { sideToMove, whiteKing, blackKing, inCheck, mateInOne }`.
- Compute in `buildTacticsLiveContext` (`src/services/liveTacticsContext.ts`) from the FEN via chess.js: king squares (board scan), in-check (`isCheck()` + turn), mate-in-1 (iterate `moves({verbose})`, apply, `isCheckmate()`).
- Render in `formatTacticsSubBlock` (`src/coach/envelope.ts`) ALWAYS when boardFacts present (king squares always exist), with a "GROUND TRUTH — never contradict" instruction: never put a king on a different square, never claim a false check, report the listed mate, and if none is listed do NOT claim a mate exists.
- Flows to `/coach/play` (GameChatPanel:624) and `/coach/teach` (CoachTeachPage:2021) — both already build the tactics context.

### FIX C — Ground legal moves everywhere  (kills #1)
- `buildGroundedSans` (`src/services/coachApi.ts`) already computes `chess.moves()` of `currentFen` — but only when `gameSans` is present (review surface). Drop that gate so legal moves are grounded on every surface. A legal move the coach suggests in a plan becomes "known" → no false SAN violation. Fabricated numbers/players/illegal moves stay gated (they don't depend on this set).

### FIX D — Anti-false-premise rule  (helps #4)
- Add a rule to the coach identity prompt (`src/coach/sources/identity.ts`): when the user ASSERTS a chess fact (a pin, move order, castling target, who's winning, a rule), verify it against the board facts / opening DB before agreeing; correct false premises — never confirm one to be agreeable.

### FIX E — Teach step-by-step move report  (kills #5)
- In `CoachTeachPage.handleSubmit`, detect `"I played <SAN>. Your move."` with no active walkthrough → apply the move to the live game (chess.js-validate), and route to the brain with a focused instruction (respond to THIS move only, with arrows per G6; don't summarize prior topics). Keep the existing `validateArrowClaims` finalization.

## Tests
- `claimValidator` / `coachApi.master-integration`: legal moves grounded → a legal-move plan answer on an off-book FEN passes; fabricated % still fails.
- `liveTacticsContext`: boardFacts king squares + mate-in-1 detection (the `6k1/5ppp/8/8/8/8/8/R6K` → `Ra8#` case; a quiet position → mateInOne null).
- `envelope`: formatTacticsSubBlock renders the board-facts line.

## Ship
All on `coach-fixes` (based on origin/main). One batched deploy to `main` at the
end (no preview builds). Then `ship-check`, push, wait for prod bundle, and
RE-RUN the board grind + rigor probes against prod to prove #1/#2/#3 are gone.

## Status
- [ ] FIX A/B board facts  - [ ] FIX C legal grounding  - [ ] FIX D prompt  - [ ] FIX E teach  - [ ] tests  - [ ] ship-check  - [ ] deploy main  - [ ] re-audit prod
