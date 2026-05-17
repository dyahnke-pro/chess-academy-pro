# 2026-05-16 — Coach × Master-Play Integration (WO-COACH-MASTER-INTEGRATION)

**Branch / target:** committed directly to `main` (per David's "Land
every change on main as fast as possible" policy, after the harness
stopped blocking direct pushes mid-WO).
**WO source:** chat handoff 2026-05-16.
**Status (2026-05-17):** **v1 shipped on main.** Foundations + Layer
B + Layer D + cross-surface audit + 80 tests passing. Layer C (LLM
tool-use loop) and full coach-surface wiring deferred to follow-up PRs.

---

## What landed in v1 (commits on `main`)

| Commit | Scope |
|---|---|
| `27f2203e` | `masterPlayTypes` + `masterPlayCache` (LRU + in-flight dedup) — 17 tests |
| `d24f413b` | `masterPlayLookup` + fixture + `__testLocalDb` injection — 13 tests |
| `13fc5d9c` | `appAuditor.AuditKind` extended with 4 new kinds |
| `c1ae42da` | `claimValidator` (SAN/numeric/entity/comparative scanner) — 23 tests |
| `fdb1a79c` | `masterPlayWatcher` (Layer A — prefetch + look-ahead, kid-excluded) — 14 tests |
| `d21dfb1a` | `coachApi` Layer B (pre-injection) + Layer D (claim validator + retry + stock fallback) — 13 integration tests |
| `761c0ca2` | `useMasterPlayWatcher` hook + `scripts/audit-coach-master-integration.mjs` (10 scenarios) |
| `950809dc` | CLAUDE.md DON'T BREAK + audit-stream G2 + post-deploy matrix + AUDIT_INDEX row |
| `f5f60a12` | Audit script drain-timing fix (3.5s drain, 5s boot settle) |

**Total:** 80 vitest tests across 5 service test files + 13 integration
tests + 10-scenario Playwright audit, all green locally.

---

## Architecture (recap)

```
              [game state change]
                      │
                      ▼
        ┌─────────────────────────┐
        │  masterPlayWatcher      │  Layer A: silently prefetches
        │  (subscribes via        │  current FEN + top-3 children,
        │   useMasterPlayWatcher) │  populates LRU cache.
        └────────────┬────────────┘                  KID ROUTES EXCLUDED
                     │
                     ▼
           ┌──────────────────┐
           │  masterPlayCache │  in-memory LRU, keyed by position-FEN
           └────────┬─────────┘
                    │ (sync read)
                    ▼
   ┌────────────────────────────────────┐
   │   coachApi.getCoachChatResponse    │
   │                                    │
   │   Layer B: pre-injection           │  ← intent-detect user msg
   │   (reads cache for current FEN +   │     → buildMasterPlayContext
   │    look-ahead, injects             │     → renderMasterPlayContextBlock
   │    masterPlayContext into prompt)  │     → into system prompt
   │                                    │
   │   Layer C (DEFERRED to follow-up)  │  ← LLM may call
   │   lookup_master_play(fen) tool     │     lookup_master_play(fen)
   │   for follow-up positions          │     for follow-up positions
   │                                    │
   │   Layer D: claim validator gate    │  ← scans output, regenerate
   │   (post-response, up to 2 retries) │     if ungrounded; stock
   │                                    │     fallback after budget
   └────────────────┬───────────────────┘
                    │
                    ▼
           [response to user]
```

---

## What's deferred to follow-up PRs

### Follow-up PR #1 — Surface wiring through `coachService`
Status: **pending**

The v1 wiring adds the `grounding` parameter to `getCoachChatResponse`,
but coach surfaces (`/coach/chat`, `/coach/teach`, `/coach/play`, etc.)
call into the brain via `coachService.ask` — not directly. To get end-
to-end grounding on a real chat turn, the `grounding` option needs to
thread through `coachService` → spine → `getCoachChatResponse`.

Scope (single PR):
- Add `grounding?: MasterGroundingOptions` to `coachService.ask` signature
- Plumb through the spine dispatcher to the brain's chat-response path
- Mount `useMasterPlayWatcher(surface, fen)` in each coach surface's
  top-level component (10 surfaces; kid surfaces excluded)
- Update each surface's `coachService.ask` call to pass `currentFen` +
  `surface`

Once this lands, the existing audit script's UI-driven scenarios
(deferred today) become exercisable without the `page.evaluate`
workaround.

### Follow-up PR #2 — Layer C (LLM tool-use loop)
Status: **pending**

Layer B's look-ahead pre-injection covers the practical
"what if I play X?" follow-up case by pre-injecting the top-3 child
positions. Layer C generalizes this — the LLM can call
`lookup_master_play(fen)` for any deeper position.

Scope (single PR):
- New helper `callChatWithOptionalTool` for Anthropic + DeepSeek
  (non-streaming; multi-turn tool-result loop)
- Integration into the grounded path of `getCoachChatResponse`
- Tool-dispatch handler that routes `lookup_master_play` calls
  through `masterPlayLookup`
- Integration tests for the tool-use loop on both providers

### Follow-up PR #3 — Audit script UI-driven scenarios
Status: **pending** (depends on PR #1)

Once surface wiring lands, replace the `page.evaluate` direct-service
calls in `audit-coach-master-integration.mjs` with real chat-input
sequences. Adds:
- Move 3 times on the live board + assert prefetch events fire
- Type "what should I play here?" in the chat → assert pre-injection
  fires + response contains a SAN from master context
- Navigate to `/kid/pawn-games`, send any kid-LLM request → assert
  zero master-play events
- Run the surface's existing audit script + confirm no regressions

### Follow-up PR #4 — Performance budgets
Status: **pending** (lower priority)

The WO asks for cache-hit ratio ≥80% on a 20-move scripted walkthrough
and p95 latency budgets. These are observability layers on top of the
audit script. Once UI scenarios land, add latency captures to the
audit report.

### Follow-up PR #5 — Provider scenarios
Status: **pending** (lower priority)

Force one scenario through DeepSeek (set `providerOverride`); assert
the claim validator catches DeepSeek's looser grounding. Validate the
Anthropic-401 → DeepSeek-fallback chain holds through the grounding
pipeline.

---

## Decisions log

- **2026-05-16 — Streaming surface unchanged for non-move-question turns.** Move-question intent triggers a non-streaming grounded path. Casual chat keeps the existing streaming surface. Rationale: streaming + multi-turn validation + retry is significantly more complex than non-streaming. Move questions are lower-frequency than chitchat; the latency hit is acceptable.
- **2026-05-16 — Look-ahead depth = 1 ply, 3 candidates (constant `LOOKAHEAD_CANDIDATES` in `masterPlayWatcher.ts`).** Matches WO. Configurable for future tuning.
- **2026-05-16 — In-memory LRU only; no Dexie persistence.** v1 scope.
- **2026-05-16 — Empty `openings-lichess-extended.json` treated as universal local-miss.** Parallel `claude/openings-db-enrichment` workstream populates the file; we ship anyway.
- **2026-05-16 — Empty Lichess response (totalGames:0 + moves:[]) collapses to source:'none'.** Cleaner downstream — claim validator's "no chess claims allowed" branch fires uniformly across local-miss / live-miss / empty-live.
- **2026-05-16 — Validator is a no-op when no `masterPlayContext` is provided.** Casual chat doesn't trip the gate. coachApi only passes context when Layer B engaged.
- **2026-05-17 — Direct push to main (no PR + squash-merge) on each foundation commit.** The harness's main-push block isn't enforced anymore; David's "Land every change on main as fast as possible" deployment policy applies. Each commit deploys to Vercel directly.
- **2026-05-17 — Layer C and surface wiring deferred from v1.** Layer B's look-ahead pre-injection already covers the practical use case for v1. Surface wiring requires plumbing `grounding` through `coachService` → spine, which touches many call sites and warrants its own focused PR.

---

## Next-session pickup

For the follow-up PRs above:

1. Check `git log --oneline -20` for the most recent main commits.
2. `npx vitest run src/services/masterPlay*.test.ts src/services/claimValidator.test.ts src/services/coachApi.master-integration.test.ts` — confirm baseline still green.
3. For surface wiring (PR #1):
   - Start with `src/services/coachService.ts` (if it exists; else find the spine dispatcher).
   - Search `grep -rn "coachService.ask" src/components/Coach/` for the 10 caller surfaces.
   - Add the watcher hook + threading.
4. For Layer C (PR #2):
   - Copy `callAnthropicWithTool` / `callDeepseekWithTool` as templates.
   - Drop `tool_choice` to make tools optional.
   - Loop on `tool_use` blocks until the LLM emits a `text` block.

---

## Out of scope

Per the original WO's "Out of scope" — explicitly NOT in this work:
- Stockfish-paired evaluation alongside master statistics
- Games-attribution DB for player/year claims (separate Lichess-dump-derived DB)
- Deeper than 10-ply enrichment of the local DB
- Cross-session cache persistence (Dexie-backed)
- Master-play stats visible in the openings tab UI
- Strategic prose validation (LLM-judge pass for non-SAN recommendations)
- In-game live-tournament data
