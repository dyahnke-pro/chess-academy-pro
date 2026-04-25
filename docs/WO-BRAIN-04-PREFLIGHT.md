# WO-BRAIN-04 — Pre-Flight Audit

**Date:** April 25, 2026
**Run before any code change in WO-BRAIN-04.**
**Constitution:** `docs/COACH-BRAIN-00.md`. The constitution wins.

---

## 1. Test suite re-run on main

Ran the affected suites against `origin/main` (commit `790ea88`, BRAIN-03 squash-merged via PR #326):

| Suite | Tests | Result |
|---|---|---|
| `src/coach/__tests__/coachService.test.ts` | 5 | green |
| `src/coach/__tests__/envelope.test.ts` | 6 | green |
| `src/coach/__tests__/ping.integration.test.ts` | 2 | green |
| `src/coach/__tests__/streaming.test.ts` | 4 | green |
| `src/stores/coachMemoryStore.test.ts` | 18 | green |
| `src/services/openingDetectionService.test.ts` (Caro-Kann + Sicilian + French + London + KID regression) | 28 | green |
| `src/hooks/useReviewPlayback.test.ts` | 10 | green |
| `src/hooks/useHintSystem.test.ts` | 9 | green |

**Total: 82 / 82 green.** Identical bar to BRAIN-03 preflight. Spine, memory store, opening regression, and the hint / review hooks all clean. Duration 10.25s.

## 2. Production audit log review

Direct production audit-log access still isn't available to this session — production audit log lives in user-side Dexie (UNIFY-01 schema) and surfaces only when Dave runs `__AUDIT__.copy()` in DevTools. No live log was provided for this preflight.

What I CAN verify from merged code on `origin/main`:

- **BRAIN-03 migration is live on both `GameChatPanel` branches.** `src/components/Coach/GameChatPanel.tsx` lines 11, 289–375, 424–460 confirm both the in-game branch (`!isGameOver`) and the home / drawer branch (`isGameOver`) call `coachService.ask`. The legacy `runAgentTurn` direct path is no longer reached from `GameChatPanel`.
- **`CoachGameReview.handleAskSend` is live on the spine.** `src/components/Coach/CoachGameReview.tsx:601` calls `coachService.ask({ surface: 'review', ... })`.
- **`coach-surface-migrated` audit fires from every migrated branch.** Production logs should show 1:1 ratio of `coach-surface-migrated` to `coach-brain-ask-received` for `surface ∈ { game-chat, home-chat, review }`.
- **Move-selector still bypasses the spine.** `src/components/Coach/CoachGamePage.tsx:1495` calls `tryOpeningBookMove(game.fen, game.history, requestedOpeningMoves, aiColor)` directly — this is the constitutional gap WO-BRAIN-04 closes.

**Action item if Dave provides a real audit log dump post-deploy:** verify the 1:1 ratio for the three migrated surfaces. Carry-forward from BRAIN-03; not blocking BRAIN-04.

## 3. Live spine sanity ping

Ran `src/coach/__tests__/ping.integration.test.ts` end to end. Both tests pass. Spine assembles the envelope, calls the (mocked) provider, dispatches tool calls, returns the expected `CoachAnswer`. Audit emission is verified by the test assertions.

A real-DeepSeek smoke test was NOT run in this preflight because (a) it would burn tokens and (b) the spine's behavior is fully covered by contract tests + the BRAIN-03 round-trip logs from the previous WO. Real-DeepSeek calls have already happened in production for BRAIN-02 + BRAIN-03 surfaces.

## 4. BRAIN-03 punts revisit

The 7 punts logged in `WO-BRAIN-03-FINAL-REPORT.md` Section 8. For each: is this causing user-visible breakage today, and is BRAIN-04 closing it?

| # | Punt | User-visible today? | Closed by BRAIN-04? |
|---|---|---|---|
| 1 | `navigate_to_route` is still a stub | **Yes** — Dave said "take me to the Bird's Opening section" works in chat audit but the page doesn't actually navigate. The audit captures the intent; the user has to navigate manually. | **YES.** Spec Step 3: graduate `navigate_to_route` from stub to real via surface-passed `onNavigate` callback. Validates path against manifest (already does) AND invokes `void navigate(path)` from the surface. |
| 2 | `fetchRelevantGames` historical-context block fully dropped on both branches | No. Past games aren't user-visible context anywhere today; the slot is schema-only. | No. Wire when `gameHistory` populated end-to-end (likely BRAIN-05 or a dedicated `gameHistory` micro-WO). |
| 3 | No chat history sent in the envelope | Subtle. Coach replies feel "stateless" in a back-and-forth. The envelope formatter ALREADY emits `- Recent conversation:` from `memory.conversationHistory` (envelope.ts:94–101), capped at 12 msgs. The gap is on the WRITE side — `GameChatPanel` / `CoachGameReview` don't append user/coach messages to `useCoachMemoryStore.conversationHistory`. Only `useLiveCoach` writes today. | **YES (partially).** Spec Step 5: append both the user ask and the coach reply to `conversationHistory` from each migrated chat surface. Last 10 msgs threaded into the envelope. (The envelope read path is already there; only the write side needs wiring.) |
| 4 | Review-ask dropped `INTERACTIVE_REVIEW_ADDITION` system-prompt augmentation | No user complaint yet. Behavioral change worth watching. | No. Out of scope for BRAIN-04. The "one voice" constitution prefers the unaugmented identity prompt; revisit only if a regression appears. |
| 5 | Pre-existing `routeChatIntent` belt-and-suspenders survives on the drawer branch | No — a defensive intercept that runs BEFORE the brain. Today this is a safety net for the still-stub `navigate_to_route`. | **Soft.** Once `navigate_to_route` graduates in BRAIN-04, the `routeChatIntent` legacy intercept becomes redundant. **Don't delete in BRAIN-04** — leaving it as belt-and-suspenders for one more deploy cycle. Cleanup in BRAIN-06. |
| 6 | Voice streaming via direct `voiceService.speak` (not via `speak` cerebrum tool) | No. Voice still works exactly as before. | No. Architectural follow-up; BRAIN-05 reroutes when phase narration migrates. |
| 7 | `surface: 'review-ask'` label was dropped (used `'review'`) | No. Single label covers post-game Ask panel. | No. Optional cleanup if a downstream consumer needs the distinction. |

**Two of the seven punts (#1 navigate_to_route, #3 chat history) are explicitly scoped into BRAIN-04.** The remaining five are non-breaking and stay on the punt list with their assigned WOs.

## 5. Constitution compliance check

Walking through the constitution's hard requirements against the current `main`:

- ✅ **Four sources of truth** — every spine call assembles all four (identity, memory, app map, live state) plus toolbelt + ask. `assembleEnvelope` throws if any source is missing.
- ✅ **Provider abstraction** — every LLM call from a migrated surface goes through `Provider.call` or `Provider.callStreaming`. No direct `getCoachChatResponse` calls happen inside `GameChatPanel` (both branches) or `CoachGameReview.handleAskSend`.
- ✅ **Cerebellum read-only** — none of the 5 cerebellum tools (lichess opening lookup, lichess master games, lichess puzzles, stockfish eval, stockfish classify) mutates state.
- ✅ **Audit discipline** — every memory write fires its audit kind from inside the store action, not the caller.
- ⚠️ **"No call goes outside the abstraction. Ever."** — Move-selector still calls `tryOpeningBookMove` + `getAdaptiveMove` directly at `CoachGamePage.tsx:1495`. This is the surface BRAIN-04 migrates. After BRAIN-04, the spine owns the move decision: cerebellum (`stockfish_eval`, `lichess_opening_lookup`) for data, cerebrum (`play_move`) for the side effect.
- ⚠️ **`runAgentTurn` still alive** — `CoachChatPage` standalone + `SmartSearchBar` voice both depend on it. Migrates in BRAIN-05; `runAgentTurn` is "deprecated, in use" until then.
- ⚠️ **Cerebrum side-effect tools (`play_move`, `navigate_to_route`) still stubs.** Both audit-only. BRAIN-04 closes the navigate stub (Step 3) and wires `play_move` to a real callback (Step 2). `speak`, `clear_memory`, and the rest stay stubbed until their owning surfaces migrate.

That's the outstanding constitutional surface BRAIN-04 closes (move selector + the two stub side-effect tools). No new gaps.

## 6. Pre-existing surface map

The full map of LLM dispatchers, post-BRAIN-03:

| Surface | Path | On the spine? |
|---|---|---|
| In-game chat (`!isGameOver`) | `GameChatPanel.handleSend` | ✅ BRAIN-02 |
| Home / drawer chat (`isGameOver`) | `GameChatPanel.handleSend` | ✅ BRAIN-03 |
| Review-ask | `CoachGameReview.handleAskSend` | ✅ BRAIN-03 |
| **Move selector** | `CoachGamePage.makeCoachMove` (~line 1495) | ❌ — direct `tryOpeningBookMove` / `getAdaptiveMove` |
| Hint engine | `useHintSystem.useEffect` → `getCoachChatResponse` | ❌ |
| Phase narration | `usePhaseNarration` → `getCoachChatResponse` | ❌ |
| Live coach interjections | `useLiveCoach` → `runAgentTurn` | ❌ |
| `/coach/chat` standalone | `CoachChatPage` → `runAgentTurn` | ❌ |
| `SmartSearchBar` voice | `runAgentTurn` | ❌ |

BRAIN-04 closes one row (move selector). BRAIN-05 closes the rest.

## 7. Verdict

**Pre-flight clean.** Foundation is healthy:
- 82/82 tests green on `origin/main`.
- BRAIN-03 surfaces verified live on the spine.
- BRAIN-03 punts #1 and #3 explicitly in scope for BRAIN-04.
- No new constitutional gaps surfaced; remaining gaps all have assigned future WOs.

Proceeding to Step 1 of WO-BRAIN-04.
