# WO-BRAIN-05a — Pre-Flight Audit

**Date:** April 25, 2026
**Status:** Clean — proceed to migration.
**Constitution:** `docs/COACH-BRAIN-00.md`. The constitution wins.

---

## 1. Production audit-log review since `848a16b`

**Constraint:** This environment does not have access to live production telemetry. Production audit-log review in the strict sense (open the deployed app's `__AUDIT__` queue, read entries since the merge timestamp) cannot be performed from here.

What I CAN verify, and did:

- **Audit-emission shape.** All seven `coach-brain-*` audit kinds plus `coach-surface-migrated` are still emitted by the spine and migrated surfaces (`coachService.ts`, `GameChatPanel.tsx`, `CoachGamePage.tsx`, `CoachGameReview.tsx`). No regression in shape.
- **No new error kinds added** since the merge — `git log --since='2026-04-25T15:00Z' src/services/appAuditor.ts` shows no kind enum changes after the merge.
- **Multi-turn loop cap audits.** `coachService.ts` emits one `coach-brain-provider-called` per round-trip plus a single `coach-brain-answer-returned` at the end. The hard-cap test (`multiTurnLoop.test.ts > hard-caps at maxToolRoundTrips even when the LLM keeps emitting tools`) is green, so a runaway LLM can't loop indefinitely.

**Gap to flag for Dave:** if the deployed app shows an unusual rate of `coach-brain-tool-called: navigate_to_route ok` followed by no react-router navigation, that would be a real `onNavigate` wiring miss in production that this environment cannot reproduce. None of the current callers (drawer + in-game + review-ask) appear to be in that shape from a static read; flagging as something to monitor manually after BRAIN-05a deploys.

**Verdict:** clean — no static signs of post-merge spine errors. Production telemetry monitoring is Dave's job, not mine.

---

## 2. Test suite re-run on main (`05f7100`)

Ran the affected suites against `main` after the BRAIN-04 squash (`848a16b`) and the stale-report-removal commit (`05f7100`).

| Suite | Tests | Result |
|---|---|---|
| `src/coach/__tests__/coachService.test.ts` | 5 | green |
| `src/coach/__tests__/envelope.test.ts` | 7 | green |
| `src/coach/__tests__/streaming.test.ts` | 4 | green |
| `src/coach/__tests__/ping.integration.test.ts` | 2 | green |
| `src/coach/__tests__/multiTurnLoop.test.ts` | 6 | green |
| `src/coach/__tests__/playMove.test.ts` | 8 | green |
| `src/coach/__tests__/navigateToRoute.test.ts` | 7 | green |
| `src/coach/__tests__/localOpeningBook.test.ts` | 8 | green |
| `src/stores/coachMemoryStore.test.ts` | 18 | green |
| `src/services/openingDetectionService.test.ts` (Caro-Kann + Sicilian + French + London + KID regression) | 28 | green |
| `src/hooks/useReviewPlayback.test.ts` | 10 | green |
| `src/hooks/useHintSystem.test.ts` | 9 | green |

**Total: 112 / 112 green.** Up from BRAIN-04 preflight's 104 by +8 (the new `localOpeningBook.test.ts` from the tightening).

`npm run typecheck` clean. Duration 6.88s for the affected suites.

Pre-existing failures elsewhere in the suite (`crypto.subtle.digest is not a function` in `CoachGameReview.test.tsx`, `db/database.test.ts`, etc.; `voiceService.speakForced is not a function` in a handful of mock-gap files) are unchanged and are not caused by BRAIN-04. They are tracked as test-environment cleanup outside the BRAIN arc.

---

## 3. BRAIN-04 punts revisit

Walking the (now-deleted) WO-BRAIN-04 final report's punt list to check for user-visible blockers BRAIN-05a inherits:

1. **Lichess opening lookup as the brain's only book source.** **CLOSED** by the tightening — `local_opening_book` cerebellum tool ships on main.
2. **Move-selector latency.** Still open. Every coach move waits on at least one DeepSeek round-trip. User-visible (~5s coach think time) but acceptable for the constitution's "every move through the brain" promise. Not a BRAIN-05a blocker; performance follow-up later.
3. **Brain doesn't see post-move Stockfish analysis.** Still open. Internal — student doesn't notice.
4. **`speak`, `request_hint_tier`, `record_blunder`, `record_hint_request` cerebrum tools still stubs (or audit-only).** Still open. These graduate alongside the surfaces that own them — `speak` and `request_hint_tier` migrate in BRAIN-05b/05c when the hint engine and phase narration migrate. No user-visible regression today.
5. **Conversation-history scope: chat surfaces only.** Still open. Live-coach interjections, phase narration, hint deliveries, blunder alerts and review walk callouts don't yet append. Visible only as "the brain's memory is a little thin in some surfaces" — not blocking.
6. **`routeChatIntent` belt-and-suspenders survives on the drawer branch.** Still open; BRAIN-06 cleanup. Mostly redundant now that `navigate_to_route` is real, but low-risk safety net.
7. **`CoachGamePage.tsx` pre-existing `no-unnecessary-condition` lint warnings.** Still open. Not in scope.

**No user-visible blocker for BRAIN-05a.** Punts 4 and 5 are the closest neighbours; both are explicitly BRAIN-05b/05c territory and are precisely what those WOs exist to address.

---

## 4. Live spine sanity ping

**Constraint:** Live in-browser ping (open devtools, `await coachService.ask({ surface: 'ping', ... })` against a real provider) cannot be run from this environment.

Static equivalent — `src/coach/__tests__/ping.integration.test.ts`:

- Test 1: Ping with intent set in memory → envelope reflects the intent → spine returns coach text + audit lifecycle complete (`coach-brain-ask-received` → `coach-brain-envelope-assembled` → `coach-brain-provider-called` → `coach-brain-answer-returned`).
- Test 2: Null-intent path — envelope still assembles, no tools, audit lifecycle clean.

Both green on `05f7100`. Spine is alive end-to-end against the mocked DeepSeek provider with the real envelope assembler, real memory snapshot, real tools registry (now 14, six cerebellum + eight cerebrum), real audit emissions.

**Verdict:** spine alive. Real-provider live ping is Dave's Step 4 of the WO acceptance criteria during felt-experience testing post-merge.

---

## 5. Audit-log invariant check — CoachChatPage and SmartSearchBar still bypass the spine

**Constraint:** Cannot run a fresh app session in a browser to capture an empty `coach-brain-ask-received` audit list. Static equivalent below.

**Static invariant:** every LLM call without a `coach-brain-ask-received` entry is a non-migrated surface. Files that EMIT `coach-surface-migrated` / `coach-brain-ask-received` (i.e., the migrated surfaces) on `main` (`05f7100`):

```
src/components/Coach/GameChatPanel.tsx        ← BRAIN-02 in-game branch + BRAIN-03 drawer branch
src/components/Coach/CoachGameReview.tsx      ← BRAIN-03 review-ask
src/components/Coach/CoachGamePage.tsx        ← BRAIN-04 move-selector
src/services/appAuditor.ts                    ← audit kind definition
src/coach/coachService.ts                     ← spine itself
src/coach/__tests__/coachService.test.ts      ← spine tests
src/coach/__tests__/ping.integration.test.ts  ← spine tests
```

`CoachChatPage.tsx` and `SmartSearchBar.tsx` are conspicuously absent. Static grep confirms both still call `runCoachTurn` from `services/coachAgentRunner.ts`:

```
src/components/Coach/CoachChatPage.tsx:9:
  import { runCoachTurn, detectNarrationToggle, applyNarrationToggle }
    from '../../services/coachAgentRunner';
src/components/Search/SmartSearchBar.tsx:8:
  import { runCoachTurn } from '../../services/coachAgentRunner';
```

**These are the two surfaces this WO migrates.** The invariant holds: pre-WO, opening either surface and sending a message produces zero `coach-brain-ask-received` audits because the LLM call goes through `runCoachTurn` → `runAgentTurn` (legacy path). Post-WO, every call from these surfaces will emit the full `coach-brain-*` audit lifecycle.

**Note on terminology:** the WO description uses "runAgentTurn"; the actual call sites use `runCoachTurn`, which is a thin wrapper around `runAgentTurn` that integrates the persistent `useCoachSessionStore` (so message append + dedupe + persistence happen inside one call). Migration target is the same — replace the LLM dispatch with `coachService.ask`.

After this WO, three surfaces remain on `runCoachTurn`/`runAgentTurn`:

- **Hint engine** (`useHintSystem.ts` and `HintButton.tsx` paths) — BRAIN-05b
- **Phase narration** (`usePhaseNarration.ts` + the LLM-driven phase-prose path) — BRAIN-05c
- **Live-coach interjections** (`useLiveCoach.ts` — opponent blunders, missed tactics, eval swings, recovery) — BRAIN-05c

The audit-log query that confirms the invariant after BRAIN-05a merges:

```js
__AUDIT__.copy()
  .filter(a => a.kind === 'coach-brain-ask-received')
  .map(a => /surface=([\w-]+)/.exec(a.summary)?.[1])
```

Should yield surfaces from the set `{game-chat, home-chat, review, move-selector, standalone-chat, smart-search, ping}` and nothing else. Hint, phase, live-coach are absent because they still bypass — that's the safety net before BRAIN-06 deletes `runAgentTurn`.

---

## 6. Migration plan summary (informational; not the WO's request)

Both target surfaces fit the BRAIN-02/03 template precisely:

- **`CoachChatPage`** — `runCoachTurn(...)` call at `src/components/Coach/CoachChatPage.tsx:236-258` becomes `coachService.ask({ surface: 'standalone-chat', ask: text, liveState: { surface: 'standalone-chat', currentRoute: '/coach/chat', userJustDid: text } }, { onChunk, onNavigate, maxToolRoundTrips: 1 })`. Streaming is preserved via the existing `provider.callStreaming` path (BRAIN-02 infrastructure). The `extraSystemPrompt` (`getChatSystemPromptAdditions` + `analysisContext` + `buildCoachMemoryBlock`) is dropped — the spine's identity prompt + memory snapshot + app map are the canonical replacement.
- **`SmartSearchBar` voice path** — `runCoachTurn(...)` call at `src/components/Search/SmartSearchBar.tsx:249-270` becomes `coachService.ask({ surface: 'smart-search', ask: text, liveState: { surface: 'smart-search', currentRoute: '/', userJustDid: text } }, { onChunk, onNavigate, maxToolRoundTrips: 1 })`. The TTS streaming pipeline (sentence-buffer → `speakOrQueue`) is unchanged; only the source of the chunks changes.

`CoachSurface` enum in `src/coach/types.ts` gains two new members: `'standalone-chat'` and `'smart-search'`. Spine tests get parameter coverage for the new labels.

**No spine-level changes** — the spine is mature post-BRAIN-04. Default `maxToolRoundTrips: 1` preserved for both new chat-style callers.

**Pre-existing intent-router intercepts kept** (`detectNarrationToggle`, `READ_THIS_RE`, `routeChatIntent`, `parseCoachIntent`) — same belt-and-suspenders pattern BRAIN-02/03 used. They run BEFORE the brain and may early-return; if they do, the brain doesn't see the message. BRAIN-06 cleanup retires them once the brain's tool path is fully trusted.

---

## 7. Verdict

**Clean — proceed to Step 1.**

- Spine green on `main` at `05f7100`.
- Two migration targets clearly identified, code-reviewed, fits the established pattern.
- No BRAIN-04 punts blocking.
- Audit-log invariant statically verified.
- Constitution constraints understood; no spine-level changes anticipated.

Production telemetry watch + felt-experience tests are Dave's job after the squash merge.
