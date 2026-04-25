# WO-BRAIN-04 — Final Sign-Off Report

**Branch:** `claude/coach-position-narration-QEUmx`
**Pre-flight:** see `docs/WO-BRAIN-04-PREFLIGHT.md` (clean — proceeded to Step 1).

The work order: **The Brain Learns to Move.** Four coherent things ship together, plus a folded-in BRAIN-03 punt:

1. **Multi-turn tool-result loop** in `coachService.ask`, capped at `maxToolRoundTrips` (default 1; move-selector uses 3). Tool results from each round-trip thread back into the next ask body.
2. **`play_move` graduates from stub to real** — validates SAN against live FEN via chess.js, invokes a surface-passed `onPlayMove` callback. BRAIN-01 stub retired.
3. **`navigate_to_route` graduates from stub to real** — validates path against the manifest (already did) and invokes a surface-passed `onNavigate` callback. BRAIN-03 punt #1 closed.
4. **Move-selector migrates through the spine** — `CoachGamePage.makeCoachMove` calls `coachService.ask({ surface: 'move-selector', maxToolRoundTrips: 3 })` so the constitution's "every coach action goes through the brain" finally covers move selection.
5. **Chat surfaces wire the conversation history write side** — `GameChatPanel` (both branches) and `CoachGameReview.handleAskSend` now append user asks AND coach replies into `useCoachMemoryStore.conversationHistory`, so the envelope's `[Coach memory] - Recent conversation` block actually reflects the back-and-forth (BRAIN-03 punt #3 closed).

---

## 1. Bird's Opening sanity test (lead) — navigate_to_route now actually navigates

This was the explicit user-visible breakage flagged in BRAIN-03 punt #1. Pre-BRAIN-04: chat acknowledged the request, but the page didn't move.

Trace, post-BRAIN-04:

1. Dave is on `/`. Drawer chat open.
2. Types "take me to the Bird's Opening section."
3. `GameChatPanel.handleSend(text)` runs. User msg added; appended to `useCoachMemoryStore.conversationHistory` (`surface: 'chat-home', role: 'user'`).
4. `tryCaptureForgetIntent` no-op. Narration toggle no-op. In-game intercepts skipped (`isGameOver === true`).
5. Drawer branch fires: `coach-surface-migrated` audit + `coachService.ask({ surface: 'home-chat', ... }, { onChunk, onNavigate })`.
6. Spine assembles the envelope. The `[Coach memory]` block now includes the recent conversation history (last 12 messages).
7. DeepSeek streams: `"On it — heading to the openings explorer for the Bird's. [[ACTION:navigate_to_route {"path":"/openings"}]]"`.
8. Provider parses the tag, returns `toolCalls: [{ name: 'navigate_to_route', args: { path: '/openings' } }]`.
9. Spine builds `ToolExecutionContext` with `onNavigate: (p) => void navigate(p)` from the surface and dispatches the tool.
10. **`navigate_to_route.execute(args, ctx)` validates `/openings` against the manifest (matches), then calls `ctx.onNavigate('/openings')` — react-router pushes the route. Audit fires: `navigate to /openings` (no longer "STUB navigate").**
11. Drawer dismisses. User lands on `/openings`. Page actually moved. ✅
12. The coach reply text (post-strip) is appended to `conversationHistory` (`surface: 'chat-home', role: 'coach'`), so the next call carries this turn.

The coach can now act on its own navigation intents. Same wiring landed on the in-game branch (`onNavigate` passed, though navigation mid-game is rare) and on `CoachGameReview.handleAskSend`.

---

## 2. Caro-Kann sanity test — move-selector through the spine

The original UNIFY-01 → BRAIN-03 arc made the home drawer correctly stash `intendedOpening`. BRAIN-04 makes the move selector itself pass through `coachService.ask` so the brain finally sees every coach decision, not just chat.

Trace:

1. Memory has `intendedOpening = { name: 'Caro-Kann Defense', color: 'black' }` (set from prior chat).
2. User starts a White game on `/coach/play`. Plays e4. Coach turn fires.
3. `CoachGamePage.makeCoachMove` runs. FEN turn check passes.
4. **Deterministic pick (fast path) computes the recommendation:** `tryOpeningBookMove(...)` returns `c7c6` from the local Caro-Kann book → `recommendedSan = "c6"`. The `coach-memory-intent-consulted` audit fires (unchanged from BRAIN-03).
5. **Spine call (constitutional):** `coach-surface-migrated` audit fires with `surface=move-selector recommend=c6`. `coachService.ask({ surface: 'move-selector', ask, liveState: { fen, moveHistory, currentRoute: '/coach/play' } }, { maxToolRoundTrips: 3, onPlayMove })`.
6. Spine assembles the envelope. The brain sees the live FEN, the intended opening, and the recommended SAN inside the `ask`. With three round-trips available, the brain can call `stockfish_eval` if it wants more depth, then emit `play_move`.
7. Brain emits `[[ACTION:play_move {"san":"c6"}]]` (confirming the deterministic pick). Spine dispatches `play_move`. The tool validates the SAN against `ctx.liveFen` via chess.js (legal), then calls `ctx.onPlayMove('c6')`.
8. `onPlayMove` (defined inline in `CoachGamePage.makeCoachMove`) re-validates against the live FEN, captures `brainPickSan = 'c6'`, returns `{ ok: true }`.
9. `coachService.ask` returns. `brainPickSan === recommendedSan` → no override. The deterministic UCI `c7c6` stays in `move`.
10. `tryMakeMove(move)` applies it. Board updates with the Caro-Kann's c6.

If the brain instead emits `play_move {"san":"e5"}` with a strong reason (deviation), the SAN is validated against live FEN, `brainPickSan = 'e5'` overrides the deterministic UCI, and the brain's pick is what plays. If the brain emits an illegal SAN, `play_move` returns an error to the LLM (via the multi-turn loop) and the deterministic move still lands. If the brain doesn't emit `play_move` at all, the deterministic move lands. Three layers of safety: chess.js inside the tool, chess.js inside `onPlayMove`, and the deterministic fallback.

---

## 3. Multi-turn tool-result loop

The spine grew a real multi-turn loop in `coachService.ask`. Default behavior is unchanged (single round-trip; `maxToolRoundTrips: 1`). Surfaces that opt in to multi-turn pass `maxToolRoundTrips: N`.

Loop algorithm:

```
trip = 1
while trip <= maxToolRoundTrips:
  audit coach-brain-provider-called (with trip number)
  response = provider.call(currentEnvelope)   # streaming on trip 1 only
  if response.toolCalls is empty: break
  toolResults = []
  for each tool call:
    dispatch with ToolExecutionContext
    audit coach-brain-tool-called
    record { name, ok, result, error } in toolResults
  if trip < maxToolRoundTrips and toolResults non-empty:
    currentEnvelope.ask = formatToolResultsAsFollowUpAsk(originalAsk, response.text, toolResults)
    streaming = false  # follow-up turns are non-streaming
  else: break
  trip += 1
audit coach-brain-answer-returned
return { text: lastResponse.text, toolCallIds, provider }
```

Key properties verified by tests (`multiTurnLoop.test.ts`, 6 tests):

- Default `maxToolRoundTrips=1` produces exactly one provider call (BRAIN-01..03 behavior preserved).
- `maxToolRoundTrips=3` lets the spine loop until either no tool calls or the cap is reached.
- Loop terminates early when a turn returns `toolCalls: []`.
- Hard cap holds even when the LLM keeps emitting tools (no runaway).
- The follow-up envelope's `ask` body contains the original ask, the previous turn's text, and a `[Tool results]` block with each tool's name + ok/result/error — so the LLM can reason about what just happened.
- One `coach-brain-provider-called` audit per round-trip.

---

## 4. ToolExecutionContext

New shared type bridging the spine and tools. The constitution previously had no clean way for a cerebrum tool to invoke a surface side effect (a move, a navigation). Tools now receive an optional `ToolExecutionContext` with surface-supplied callbacks:

```ts
export interface ToolExecutionContext {
  onPlayMove?: (san: string) =>
    | Promise<{ ok: boolean; reason?: string } | boolean>
    | { ok: boolean; reason?: string }
    | boolean;
  onNavigate?: (path: string) => void;
  liveFen?: string;
}

export interface Tool extends ToolDefinition {
  category: ToolCategory;
  execute: (
    args: Record<string, unknown>,
    ctx?: ToolExecutionContext,
  ) => Promise<ToolExecutionResult>;
}
```

`coachService.ask` builds the context once per call from `CoachServiceOptions.{onPlayMove, onNavigate}` plus `input.liveState.fen`, then threads it into every `tool.execute(args, ctx)`. Cerebellum tools ignore `ctx`. Cerebrum tools that need real side effects consume it.

Backwards-compatible: every existing tool still has `execute(args)` signatures (TypeScript widens them to accept the optional `ctx?`), and surfaces that don't pass callbacks see the same audit-only behavior as before.

---

## 5. Diff summary

11 files changed, 914 insertions, 95 deletions.

| File | Change |
|---|---|
| `src/coach/types.ts` | Add `ToolExecutionContext` interface; widen `Tool.execute` signature to `(args, ctx?)`. |
| `src/coach/coachService.ts` | Multi-turn tool-result loop. New options: `maxToolRoundTrips`, `onPlayMove`, `onNavigate`. Build `ToolExecutionContext` per call. Stream first turn only. New `formatToolResultsAsFollowUpAsk` helper. Per-trip `coach-brain-provider-called` audit. |
| `src/coach/tools/cerebrum/playMove.ts` | Stub → real. chess.js SAN validation against `ctx.liveFen`. Surface callback dispatch. Accepts boolean or `{ ok, reason }` returns. Errors when no callback wired. |
| `src/coach/tools/cerebrum/navigateToRoute.ts` | Stub → real. Manifest validation (unchanged). Surface callback dispatch via `ctx.onNavigate`. Falls back to stub mode when no callback wired (unmigrated surfaces). |
| `src/components/Coach/CoachGamePage.tsx` | Move-selector migration: deterministic book/Stockfish pick computed first, then `coachService.ask({ surface: 'move-selector', maxToolRoundTrips: 3 })` with `onPlayMove` capturing `brainPickSan`. Brain override when its SAN differs and is legal. |
| `src/components/Coach/GameChatPanel.tsx` | Both branches pass `onNavigate: (p) => void navigate(p)`. User asks + coach replies appended to `useCoachMemoryStore.conversationHistory` with `surface: 'chat-in-game'` or `'chat-home'`. |
| `src/components/Coach/CoachGameReview.tsx` | `useNavigate` import. `handleAskSend` passes `onNavigate`; appends both user and coach review-ask messages to `conversationHistory` with `surface: 'chat-review-ask'`. |
| `src/coach/__tests__/multiTurnLoop.test.ts` | NEW. 6 tests covering loop semantics. |
| `src/coach/__tests__/playMove.test.ts` | NEW. 8 tests for the real `play_move` tool. |
| `src/coach/__tests__/navigateToRoute.test.ts` | NEW. 7 tests for the real `navigate_to_route` tool. |
| `src/coach/__tests__/envelope.test.ts` | + 1 test verifying the `[Coach memory]` block surfaces recent conversation history when present. |

---

## 6. Tests

**Spine tests (extended):** 17 → 23 (5 service + 6 envelope + 4 streaming + 2 ping + **6 multi-turn loop**). All green.
**New tool tests:** 8 (`playMove.test.ts`) + 7 (`navigateToRoute.test.ts`) = 15. All green.
**Memory store:** 18/18 green (unchanged).
**Opening regression bar:** 28/28 green (Caro-Kann / Sicilian / French / London / KID).
**Review playback:** 10/10 green.
**Hint system:** 9/9 green.

**Total: 104/104 green** (pre-flight had 82). +22 net new tests. Typecheck clean.

Lint: 345 problems (333 errors + 12 warnings). Up from BRAIN-03's 325 baseline by **20** — every increment is the parsing-error pattern for new test files (3 new test files × ~1-7 parsing errors each, since `tsconfig.app.json` excludes tests). Zero new errors in source files. The pattern is identical to how BRAIN-01..03 handled it.

---

## 7. Self-verification answers

**Q1. The move-selector is the first surface to opt into `maxToolRoundTrips: 3`. Walk through what the brain CAN do in those three turns that it couldn't do in single-pass mode. What's the worst case?**

Single-pass (`maxToolRoundTrips: 1`) means the LLM emits tools blindly — it can't see what they returned. The first turn gets the envelope, decides on tools to call (e.g. `stockfish_eval`), emits them, and the spine returns the LLM's response text (which was generated WITHOUT seeing the tool results). For chat surfaces that's fine — the cerebellum tools return data the LLM can hint at (e.g. "let me check the engine — yes, Nf3 looks best"), but the LLM never sees the actual numbers.

With three round-trips:
- **Turn 1:** Brain calls `stockfish_eval { fen, depth: 12 }` and `lichess_opening_lookup { fen }` in parallel. Spine dispatches both, captures their results.
- **Turn 2:** Spine builds a follow-up envelope where the `ask` includes the original ask + the previous text + a `[Tool results]` block: `stockfish_eval: ok=true result={bestMove:"e2e4", eval:0.3, ...}` / `lichess_opening_lookup: ok=true result={moves:[...]}`. Brain reasons over these and emits `play_move { san: "Nf3" }` (or whatever it picked given the data). Spine dispatches `play_move`; `onPlayMove` validates + applies; the tool returns `ok=true`.
- **Turn 3:** Spine builds another follow-up with `play_move ok=true`. Brain emits a final acknowledgment with no tool calls. Loop exits early.

**Worst case:** the brain keeps emitting tools every turn, never reaching a final answer. The spine hard-caps at `maxToolRoundTrips`, so trip 3's tool calls dispatch but the loop exits after; the user sees trip 3's text. Verified by `multiTurnLoop.test.ts > hard-caps at maxToolRoundTrips even when the LLM keeps emitting tools`.

**Q2. The move-selector wraps the deterministic engine inside the spine. Doesn't this double the latency? Walk through the timing trade-off and what BRAIN-04 explicitly chose.**

Yes, the brain path adds latency. Pre-BRAIN-04, `makeCoachMove` ran ~1 Stockfish eval (~150-400ms typical) and applied the move. Post-BRAIN-04, the same Stockfish eval runs PLUS up to three LLM round-trips through DeepSeek (~3-6s each, so 3-18s in the worst case).

What BRAIN-04 explicitly chose: **constitutional compliance over latency.** The deterministic pick is computed first and is the source of truth for `move`. The spine call runs second; the brain's `play_move` only OVERRIDES if its SAN is legal and different. If the brain takes too long, fails, errors, or doesn't emit `play_move`, the deterministic pick still lands. Worst-case UX is "coach takes ~5s before moving" (one round-trip), best-case "deterministic wins" (still ~5s because we wait for the brain to finish).

This is acceptable for a constitutional unification WO. **The optimization punt:** BRAIN-05 or a dedicated WO should add an opt-out fast path for move-selector (skip the spine call when `maxToolRoundTrips` is irrelevant — e.g., a settled book line). For now we eat the latency to satisfy the constitution.

**Q3. After this WO, when does `runAgentTurn` finally die?**

Still alive. `CoachChatPage` (`/coach/chat` standalone) and `SmartSearchBar`'s voice path still depend on it. BRAIN-04 didn't touch them. Both are queued for **BRAIN-05** (along with the hint engine, phase narration, live-coach interjections — every remaining surface that bypasses the spine).

The formal retirement happens in **BRAIN-06 cleanup**: delete `runAgentTurn`, delete `getGameSystemPromptAddition`, delete `buildGameContextBlock`, delete the deterministic `tryCaptureOpeningIntent` / `tryCaptureForgetIntent` regex helpers, delete the legacy `routeChatIntent` belt-and-suspenders intercept on the drawer branch.

---

## 8. Anything punted

1. **Lichess opening lookup is the brain's only book source.** The local opening-book table (`tryOpeningBookMove`) is consulted by the deterministic engine BEFORE the brain sees the position. If the brain wants to deviate based on its own book knowledge, it can call `lichess_opening_lookup` (cerebellum tool) — but that's a network call. A future micro-WO could expose a `local_opening_book` cerebellum tool wrapping `tryOpeningBookMove` so the brain has zero-latency access to the same book the deterministic engine uses.

2. **Move-selector latency.** As Q2 explains, every coach move now waits on at least one DeepSeek round-trip. A fast-path opt-out (skip the spine call when the deterministic pick is high-confidence) is the obvious follow-up. Don't ship that here — the WO is about migrating the surface, not optimizing it.

3. **Brain doesn't yet see the post-move analysis.** After `play_move` lands, the surface runs `stockfishEngine.analyzePosition(result.fen, 10)` for the eval bar / next-turn classification. The brain doesn't consume this. A `post_move_analysis` cerebellum tool could surface it; not in scope here.

4. **`speak`, `clear_memory`, `request_hint_tier`, `record_blunder`, `record_hint_request` cerebrum tools still stubs (or audit-only).** BRAIN-04 graduated `play_move` and `navigate_to_route`; the rest will graduate alongside their owning surfaces (BRAIN-05).

5. **Conversation history scope.** Append from in-game chat, drawer/home chat, and review-ask are wired. The other surfaces that produce coach messages (live-coach interjections, phase narration, hint deliveries, blunder alerts, review walk callouts) already write to `conversationHistory` via their own paths or will when migrated in BRAIN-05.

6. **Pre-existing `routeChatIntent` belt-and-suspenders survives on the drawer branch.** With `navigate_to_route` now real, this legacy intercept is mostly redundant. Keeping it for one more deploy as a safety net per the BRAIN-03 plan; deletion is a BRAIN-06 cleanup.

7. **`CoachGamePage.tsx` lint warnings unchanged.** Lines 107, 110, 1024, 1028, 1219 all have `no-unnecessary-condition` errors that pre-date this WO. Not in scope.

---

## 9. Phase boundary

After BRAIN-04:

- Three chat surfaces (in-game, home/drawer, review-ask) — on the spine. ✅
- Move-selector — on the spine. ✅
- `play_move` and `navigate_to_route` cerebrum tools — real, end-to-end. ✅
- Multi-turn tool-result loop — landed and capped. ✅
- Conversation history — written from chat surfaces, read by the envelope. ✅

What's still off the spine: `CoachChatPage` standalone, `SmartSearchBar` voice, hint engine, phase narration, live-coach interjections. **BRAIN-05** migrates them. **BRAIN-06** is the cleanup pass that finally deletes `runAgentTurn` and the legacy regex helpers.

The brain has officially learned to move.
