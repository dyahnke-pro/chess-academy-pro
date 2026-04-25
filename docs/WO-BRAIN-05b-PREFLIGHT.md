# WO-BRAIN-05b — Pre-Flight Audit

**Date:** April 25, 2026
**Status:** Clean — proceed to migration.
**Constitution:** `docs/COACH-BRAIN-00.md`. The constitution wins.

---

## 1. Production audit-log review since `6de50eb`

**Constraint:** This environment does not have access to live production telemetry. Static review only.

What I CAN verify, and did:

- **Audit emission shape is intact.** `coach-brain-*` and `coach-surface-migrated` audits are still emitted from the spine and from the four migrated chat / move surfaces. The two new surface labels from BRAIN-05a (`standalone-chat`, `smart-search`) are wired in `CoachChatPage.tsx:233-249` and `SmartSearchBar.tsx:269-286`.
- **No new error kinds added since 05a merge.** `git log --since='2026-04-25T20:43Z' src/services/appAuditor.ts` is empty.

**Gap to flag for Dave:** monitor for `coach-brain-tool-called: navigate_to_route` audits from `surface=standalone-chat` or `surface=smart-search` that don't actually move the user — that would be an `onNavigate` wiring miss in production this environment cannot reproduce. Both 05a callers wire `onNavigate: (path) => void navigate(path)` from a static read, so this is a watch-out, not a known issue.

**Verdict:** clean — no static signs of post-merge spine errors.

---

## 2. Test suite re-run on main (`6de50eb`)

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
| `src/services/openingDetectionService.test.ts` | 28 | green |
| `src/hooks/useReviewPlayback.test.ts` | 10 | green |
| `src/hooks/useHintSystem.test.ts` | 9 | green |

**Total: 112 / 112 green.** Same baseline as 05a's preflight (no test count change since 05a added zero tests). `npm run typecheck` clean.

Pre-existing environment failures elsewhere in the suite (`crypto.subtle.digest` Dexie, `voiceService.speakForced` mock gaps) are unchanged and unrelated to the BRAIN arc.

---

## 3. BRAIN-05a punts revisit

The 05a commit body (`824759c`) didn't enumerate punts in a dedicated section, but a static walk of the merged code yields these candidates:

1. **Pre-LLM intent intercepts kept on standalone chat** (`detectNarrationToggle`, `READ_THIS_RE`, `routeChatIntent`). These run BEFORE the brain and may early-return without ever calling `coachService.ask`. Same belt-and-suspenders pattern as `GameChatPanel`. **Not user-visible** — exact same behavior the user feels today, just with a brain backstop. BRAIN-06 cleanup.
2. **Voice modality not surfaced to the brain.** Both new surfaces use `userJustDid: text`; the spine's identity prompt knows nothing about whether the student spoke or typed. **Not user-visible** — coach voice is identical either way. Could matter later if we want voice-versus-text behavioral differences (e.g., shorter replies for voice).
3. **No conversation-history label distinct for `smart-search` background voice exchanges in some prior code paths.** Resolved in 05a by adding `chat-smart-search` to the `CoachMessage.surface` enum. **Closed.**

**No user-visible blockers.** The hint engine migration doesn't touch any of these.

---

## 4. Live spine sanity ping

**Constraint:** Live in-browser ping cannot be run from this environment. Static equivalent — `src/coach/__tests__/ping.integration.test.ts` (2 tests green) — passes against the real envelope assembler, real memory snapshot, real 14-tool registry, and real audit emissions.

**Verdict:** spine alive end-to-end against the mocked provider. Real-provider ping is Dave's job after the squash.

---

## 5. Hint engine baseline check

**Static invariant:** every LLM call without a `coach-brain-ask-received` entry is a non-migrated surface. `useHintSystem.ts` does NOT call `coachService.ask` and IS in the list of files importing `getCoachChatResponse` from `services/coachApi`:

```
src/hooks/useHintSystem.ts:34:
  import { getCoachChatResponse } from '../services/coachApi';
src/hooks/useHintSystem.ts:319:
  response = await getCoachChatResponse(
    [{ role: 'user', content: userMessage }],
    addition,  // HINT_TIER_1_ADDITION | HINT_TIER_2_ADDITION | HINT_TIER_3_ADDITION
    undefined,
    'hint',
    800,
    'medium',
  );
```

This is the migration target. The dispatch builds:
- `userMessage` from `buildChessContextMessage(baseCtx)` containing FEN, last-move SAN, move number, PGN, opening name, Stockfish analysis, and tier-specific `additionalContext` (e.g., for T1: "Best move (for your reference, DO NOT state it): Nf6. Diagnose the WHY in 1-2 sentences without naming any piece or square.")
- `addition` is one of the three `HINT_TIER_*_ADDITION` system-prompt strings from `coachPrompts.ts`.

**Confirms hint engine is on the legacy path.** Post-WO, opening the app and tapping the hint button will fire `coach-brain-ask-received: surface=hint` on every tap.

**Note on tooling debt:** `useHintSystem` calls `getCoachChatResponse` directly from `services/coachApi` — NOT through `runCoachTurn`/`runAgentTurn`. So the WO's reference to "the hint engine on `runAgentTurn`" is approximately right; the actual call is a deeper-level direct LLM dispatch. The migration target is the same — replace the LLM dispatch with `coachService.ask`. `getCoachChatResponse` itself stays alive (it's used by other surfaces — `VoiceChatMic`, `MiddlegamePractice`, `CoachGamePage` for inline narration, etc.) and dies in BRAIN-06.

After this WO, two surfaces remain on the legacy LLM path:

- **Phase narration** (`usePhaseNarration` + the LLM-driven phase-prose path)
- **Live-coach interjections** (`useLiveCoach` — opponent blunders, missed tactics, eval swings, recovery)

Both are BRAIN-05c.

---

## 6. Migration plan (informational)

1. **Extend the envelope's `[Coach memory]` block** to render a compact recent-hints summary instead of a per-record list. WO format: `Recent hint requests: 3 in the last 10 plies (T1, T1→T2, T1→T2→T3)`. The "→" notation maps directly: every `tierReached: 1` → `T1`, every `tierReached: 2` → `T1→T2`, every `tierReached: 3` → `T1→T2→T3` (because the store ratchets monotonically through tiers on the same FEN). Themes summary deferred — `HintRequestRecord.classificationTag` is reserved-but-not-populated, so no theme data exists yet.
2. **Migrate `useHintSystem.requestHint`** to `coachService.ask({ surface: 'hint', ask, liveState }, { maxToolRoundTrips: 2, onChunk })`.
3. **Pass tier instructions in the `ask` text**, not via `extraSystemPrompt`. Reuse the existing `HINT_TIER_*_ADDITION` strings — battle-tested.
4. **Remove the deterministic `useCoachMemoryStore.recordHintRequest` call.** Per WO: the brain's `record_hint_request` cerebrum tool is fully implemented and the spine dispatches it. The ask text instructs the brain to log every tap.
5. **Stream via `onChunk`** to feed `speakHintText` sentence-by-sentence. The current code speaks the full text after the LLM finishes; switching to streaming per-sentence is a UX win on top of the migration.
6. **Audit `coach-surface-migrated` with `surface=hint`**.

No spine-level changes anticipated.

---

## 7. Verdict

**Clean — proceed to Step 1.**

- Spine green on `main` at `6de50eb`.
- Hint engine target clearly identified, dispatch site at `useHintSystem.ts:319`.
- 05a punts revisit — no user-visible blockers.
- Audit-log invariant statically verified.
- Constitution constraints understood; no spine-level changes anticipated.
