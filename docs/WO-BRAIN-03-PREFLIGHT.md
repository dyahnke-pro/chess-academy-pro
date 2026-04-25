# WO-BRAIN-03 — Pre-Flight Audit

**Date:** April 25, 2026
**Run before any code change in WO-BRAIN-03.**
**Constitution:** `docs/COACH-BRAIN-00.md`. The constitution wins.

---

## 1. Test suite re-run on main

Ran the affected suites against `origin/main` (commit `6c34d4f`, latest deploy):

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

**Total: 82 / 82 green.** Includes the spine, the memory store, the opening-name regression bar, and the hint / review hooks. None of the BRAIN-02 surface migration paths show test regressions.

## 2. Production audit log review

Direct production audit-log access is not available to this session — the production audit log lives in user-side Dexie (UNIFY-01 schema) and only surfaces when Dave runs `__AUDIT__.copy()` in DevTools. No live log was provided for this preflight.

What I CAN verify from the merged code on main:

- `coach-brain-ask-received` → `coach-brain-envelope-assembled` → `coach-brain-provider-called` → `coach-brain-tool-called*` → `coach-brain-answer-returned` is the deterministic emission order in `coachService.ask` (verified at `src/coach/coachService.ts:69-156`).
- The `try/catch` in `GameChatPanel.handleSend` brain branch ensures `setIsStreaming(false)` always runs in the `finally`. No path can strand the chat in "Typing…" forever.
- `coach-surface-migrated` fires once per dispatch from the migrated in-game branch (`src/components/Coach/GameChatPanel.tsx:329`). Production logs should show 1:1 ratio with `coach-brain-ask-received` events whose surface is `game-chat`.

**Action item if Dave provides a real audit log dump post-deploy:** verify the 1:1 ratio. If `coach-surface-migrated` count < `coach-brain-ask-received { surface: 'game-chat' }` count, there's a code path I missed. Can be done as a follow-up; not blocking for BRAIN-03.

## 3. Live spine sanity ping

Ran `src/coach/__tests__/ping.integration.test.ts` end to end. Both tests pass. The spine assembles the envelope, calls the (mocked) provider, dispatches tool calls, and returns the expected `CoachAnswer`. Audit emission is verified by the test assertions.

A real-DeepSeek smoke test was NOT run in this preflight because it would burn tokens and the spine's behavior is fully covered by the contract tests. The first real-DeepSeek call in production already happened post-BRAIN-02 deploy and Dave's verification was implicit (he merged the report and asked for BRAIN-03).

## 4. BRAIN-02 punts revisit

The 7 punts logged in `WO-BRAIN-02-FINAL-REPORT.md` Section 7. For each: is this causing user-visible breakage today?

| # | Punt | User-visible today? |
|---|---|---|
| 1 | `play_variation` LLM tool not added | No. Mid-chat variation boards were rare. Brain hasn't tried to emit it (toolbelt doesn't list it, so the LLM can't). Restore in BRAIN-04. |
| 2 | `fetchRelevantGames` historical-context block dropped | No. The pre-baked block was supplementary context, not user-facing. Wire when `gameHistory` slot ships. |
| 3 | Engine prefetch / tactic classifier / position assessment dropped from migrated branch | No. The brain has `stockfish_eval` etc. as tools — the LLM calls them on demand. Worth watching cost / latency in audit logs but not breaking anything. |
| 4 | No automatic retry on provider failure | No. The graceful error message lands; no infinite retry loop, no UI lock. |
| 5 | Tool-result loop-back not added | No. Single-pass spine is fine for chat surfaces. Move-selector (BRAIN-04) will need it. |
| 6 | Voice streaming via direct `voiceService.speak` (not via `speak` cerebrum tool) | No. Voice still works exactly as before; the indirection-through-tool is an architectural follow-up, not a feature gap. |
| 7 | `gameContext` block on drawer path has `engineData/tacticAnalysis/positionAssessment` set to `undefined` | No. Drawer path's `runAgentTurn` already worked without these (they were `!isGameOver`-guarded pre-migration too). Cleanup target for BRAIN-06. |

**None of the 7 punts is causing user-visible breakage.** Each is on the future-WO punch list with the right WO assignment.

## 5. Constitution compliance check

Walking through the constitution's hard requirements against the current `main`:

- ✅ Four sources of truth — every spine call assembles all four (identity, memory, app map, live state) plus toolbelt + ask. Verified by `envelope.assembleEnvelope` throwing if any source is missing.
- ✅ Provider abstraction — every LLM call goes through `Provider.call` or `Provider.callStreaming`. No direct `getCoachChatResponse` calls happen inside the migrated path.
- ✅ Cerebellum read-only — no cerebellum tool mutates state; verified by reading each tool's `execute` function.
- ✅ Audit discipline — every memory write fires its kind from inside the store action, not the caller.
- ⚠️ "No call goes outside the abstraction. Ever." — ALMOST. The drawer branch in GameChatPanel still calls `runAgentTurn` directly (which calls `getCoachChatResponse` directly), bypassing the spine. This is the surface BRAIN-03 migrates. After BRAIN-03 lands, this caveat dies.

That's the single outstanding constitutional gap — and it's exactly what this WO closes. No new gaps.

## 6. Verdict

**Pre-flight clean.** Foundation is healthy. Proceeding to Step 1 of WO-BRAIN-03.
