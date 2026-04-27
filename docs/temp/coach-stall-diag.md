# Coach Stall Mid-Game on Main — Diagnostic

Repro: user played 1.d4. Coach played 1...Nf6 (one response). User played 2.Bg5. Coach went silent — never played its second move. User had to manually move black's pieces (h6, gxf6) to continue. Audit gap 15:54:23 → 15:55:53 (~90 s) shows ZERO `coach-brain-provider-called` audits, ZERO `coach-move-fallback-emergency` audits, ZERO `coach-move-stockfish-bypassed` audits.

**Important context note up front:** the WO references "PR #344's resilience layer". `git log` on `main` does NOT show a PR #344. The most recent merges are PR #336 / #337 / #338 / #342 / #343. No coach-resilience PR is on main. The greps below confirm this — the "resilience layer" the WO assumes exists is not in the code. That changes the diagnosis from "layer didn't catch it" to "layer was never landed."

---

## (1) Timeout wrapper / Promise.race / fallback-emergency search

```
src/components/Coach/CoachGamePage.tsx- *  withTimeout helper — not imported to avoid cross-module coupling
src/components/Coach/CoachGamePage.tsx- *  for a 3-line util. */
src/components/Coach/CoachGamePage.tsx-function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
src/components/Coach/CoachGamePage.tsx:  return Promise.race([
src/components/Coach/CoachGamePage.tsx-    promise,
src/components/Coach/CoachGamePage.tsx-    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
src/components/Coach/CoachGamePage.tsx-  ]);
src/components/Coach/CoachGamePage.tsx-}
src/components/Coach/CoachGamePage.tsx-
src/components/Coach/CoachGamePage.tsx-/**
src/components/Coach/CoachGamePage.tsx- * Evaluate a set of candidate SAN moves on the position reached AFTER
src/components/Coach/CoachGamePage.tsx- * each move. Uses Lichess cloud-eval (no auth, free, cached) per
src/components/Coach/CoachGamePage.tsx- * candidate in parallel. Candidates whose FEN has no cloud eval
src/components/Coach/CoachGamePage.tsx- * (404) are skipped — better to miss a trap than to mis-flag one.
src/components/Coach/CoachGamePage.tsx- *
src/components/Coach/CoachGamePage.tsx- * Eval is normalised to the MOVER's POV: positive = the candidate
src/components/Coach/CoachGamePage.tsx- * player got better, negative = they lost ground. This matches what
src/components/Coach/CoachGamePage.tsx- * `detectTrapInPosition` expects (it looks for popular moves where
src/components/Coach/CoachGamePage.tsx- * evalCp &lt;= -200 for the mover).
src/components/Coach/CoachGamePage.tsx- */
src/components/Coach/CoachGamePage.tsx-/** Max Lichess cloud-eval requests in flight at once. Previously
src/components/Coach/CoachGamePage.tsx- *  Promise.all fired 5+ candidates in parallel on every trap check,
src/components/Coach/CoachGamePage.tsx- *  which could 429 on the public endpoint or just pile up on slow
src/components/Coach/CoachGamePage.tsx- *  networks. 2-at-a-time is enough to keep latency reasonable
```


**Section (1) findings:**

- A `withTimeout` helper IS defined in `CoachGamePage.tsx` (lines around the function definition shown above), but the matches inside this function are **only the helper definition itself**.
- The actual `withTimeout(...)` call sites (verified via separate grep) are:
  - `src/components/Coach/CoachGamePage.tsx:108` — wraps Lichess cloud-eval in trap detection
  - `src/components/Coach/CoachGamePage.tsx:1917` — wraps an explorer fetch
  - `src/services/coachContextEnricher.ts:210/242/294/312/324/353/380/409` — wraps various data-fetch helpers
- **`CoachGamePage.tsx:1542` — the coach-turn `coachService.ask` call — is NOT wrapped in `withTimeout`**. The bare `await coachService.ask(...)` blocks the move-selection effect indefinitely if anything inside the spine hangs.
- `coachService.ts` itself contains no `Promise.race` / `setTimeout` / `AbortController` — nothing in the spine times out tool dispatch loops, the round-trip mutex, or envelope assembly.
- The PROVIDERS (`src/coach/providers/deepseek.ts:58` and `src/coach/providers/anthropic.ts:43`) DO have a 30-second `Promise.race` timeout around the LLM API call. This is the only existing timeout protection in the spine. It only fires once `coach-brain-provider-called` has been logged.

No matches at all for the literal strings `coach-move-fallback` / `Promise.race` inside `CoachGamePage.tsx` other than the `withTimeout` helper. There is no fallback audit anywhere in the move-selection path.

---

## (2) Audit-kind registration + actual call sites

```
```


**Section (2) findings:**

**The grep produced ZERO matches.** Across `src/services/appAuditor.ts`, all of `src/coach/`, and all of `src/components/Coach/`, none of the three audit kinds exist:
- `coach-move-stockfish-bypassed` — not in the `AuditKind` union, not at any call site
- `coach-move-llm-fallback` — not in the union, not at any call site
- `coach-move-fallback-emergency` — not in the union, not at any call site

These kinds exist neither in the type definitions nor as logged events anywhere in the repo. **The fallback chain the user expected does not exist in code.** That's why the audit log showed no fallback events during the stall — there is no fallback to fire.

(For reference, the actual `AuditKind` union on main includes: stockfish-cache-hit, stockfish-cache-miss, stockfish-prefetch-fired, stockfish-error, stockfish-variant-resolved, stockfish-variant-fallback. The coach-move-* kinds the WO names are net-new.)

---

## (3) Coach-turn move-selection call stack

```

  // Coach makes a move when it's their turn.
  // Uses an AbortController (not a ref guard) to handle React strict-mode
  // double-invocation and dependency-change re-runs safely.
  useEffect(() => {
    const isCoachTurn =
      gameState.status === 'playing' &&
      !game.isGameOver &&
      ((playerColor === 'white' && game.turn === 'b') ||
       (playerColor === 'black' && game.turn === 'w'));

    if (!isCoachTurn) return;

    setIsCoachThinking(true);
    const abortController = new AbortController();
    const isCancelled = (): boolean => abortController.signal.aborted;

    const applyCoachMove = (
      result: MoveResult,
      evaluation: number,
      preMoveEval: number | null = null,
      bestMove: string | null = null,
    ): void => {
      moveCountRef.current += 1;

      const coachMove: CoachGameMove = {
        moveNumber: moveCountRef.current,
        san: result.san,
        fen: result.fen,
        isCoachMove: true,
        commentary: '',
        evaluation,
        classification: null,
        expanded: false,
        bestMove,
        bestMoveEval: null,
        preMoveEval,
      };

      setCoachLastMove({ from: result.from, to: result.to });
      setGameState((prev) => ({
        ...prev,
        moves: [...prev.moves, coachMove],
      }));
      // Narrate the coach's move when narration mode is on. Falls
      // back to a short SAN announcement since applyCoachMove doesn't
      // generate LLM commentary on the engine's side.
      // Stop any in-flight TTS (a stale voice-chat reply still playing,
      // the previous move's narration that overran) before the coach's
      // move speaks. Without this the coach narration and a prior
      // voice-chat reply can overlap — the student hears two voices
      // at once. Matches the player-move path's guard below.
```


**Section (3) findings:**

The coach-turn pipeline is a single `useEffect` keyed off turn changes:
- (a) Trigger: `useEffect` watches `gameState.status`, `game.isGameOver`, `playerColor`, `game.turn`. When `isCoachTurn` becomes true it sets `isCoachThinking` and creates an `AbortController`.
- (b) Awaited result: `await coachService.ask({ surface: 'move-selector', ... }, { maxToolRoundTrips: 3, onPlayMove })` at line 1542. `onPlayMove` captures the SAN into a local `brainPickSan` variable, which is later read to feed `game.makeMove`.
- (c) Stuck-ask state-machine path: **YES, this exists.** The `await` at line 1542 has no timeout. The function it calls (the spine) has no timeout outside the providers' 30s LLM-call wrapper. If the spine hangs BEFORE the provider call (envelope assembly, tool dispatch in a follow-up round-trip, the round-trip loop's setup), the `await` never resolves and never throws.

Specific hang vectors visible in the spine flow on main:
1. With `maxToolRoundTrips: 3` and the parallel-read-tool dispatch from PR #337, the brain typically emits a stockfish_eval + lichess_opening_lookup in turn 1, then play_move in turn 2. If a tool dispatch on a SECOND or THIRD round-trip hangs (e.g. lichess Explorer 401 on a stale token, Stockfish worker stuck after multi-thread bundle hung mid-load), the round-trip for-loop never exits.
2. `stockfishEngine.queueAnalysis` serializes against any in-flight analysis. If the speculative prefetch from PR #337 (`stockfish-prefetch-fired` on every move) is itself blocked because the multi-thread bundle is hung, the queue blocks. The brain's eval is wrapped in `analyzeWithBudget` (300ms race), but the prefetch is NOT — and the brain's call sits behind the prefetch in the queue.
3. Tool dispatch in `coachService.ts` has no per-tool timeout. `Promise.allSettled` over read-only tools waits for the slowest to settle; one hung tool blocks the dispatch.

After a successful first coach move, `setIsCoachThinking(false)` runs in the success / finally path. If the second-turn ask hangs, `isCoachThinking` stays true forever, the user sees a board with no engine response, and the only way out is for the user to move pieces manually — which is exactly the reported behaviour.

---

## Diagnosis

**Of the three failure modes named in the WO, the answer is (A), with the additional truth that the "timeout wrapper" the WO refers to does not exist anywhere in the move-selection pipeline.**

(A) Timeout wrapper covers chat-ask path, not coach-turn-ask path: **TECHNICALLY TRUE BUT NEITHER PATH IS COVERED.** `CoachGamePage.tsx:1542` (coach-turn ask) has no timeout. `GameChatPanel.tsx` chat-path ask is also unwrapped. The only timeout in the entire spine pipeline lives inside the providers (`deepseek.ts:58`, `anthropic.ts:43` — 30 s LLM-API `Promise.race`). That timeout is too narrow to catch a stall that happens BEFORE the provider call (which the audit log proves: zero `coach-brain-provider-called` audits during the 90-second gap).

(B) Timeout wrapper covers everything but fallback chain itself has a hang: **NOT POSSIBLE — fallback chain doesn't exist.** `coach-move-stockfish-bypassed`, `coach-move-llm-fallback`, `coach-move-fallback-emergency` are not in the `AuditKind` union, not in any source file, not at any call site. There is no fallback chain in code.

(C) Coach-turn pipeline bypasses the wrapped ask function entirely: **NOT POSSIBLE — there is no wrapped ask function.** Every `coachService.ask` callsite on main is bare-`await`.

**Real failure mode (combined):** the move-selector `coachService.ask` at `CoachGamePage.tsx:1542` hung somewhere before the provider was called (most likely in the round-trip loop or a tool dispatch — Stockfish bundle hang during prefetch is the strongest candidate given the 1.d4 → Nf6 → Bg5 stall pattern, where the second turn's prefetch + queueAnalysis would be the first to feel a multi-thread runtime crash). Because the spine has no timeout above the provider boundary, and `CoachGamePage` doesn't wrap the call in `withTimeout`, and the fallback audit kinds the WO references were never landed, nothing fired and the user saw silence. The "resilience layer from PR #344" the WO mentions is not present in `main`'s git history — it appears to have been never opened or never merged. A real fix needs all three pieces: a timeout wrapper around the coach-turn ask, the fallback chain (Stockfish-bypass → LLM-bypass → emergency-random-legal-move), and the audit kinds to make each fallback level visible.
