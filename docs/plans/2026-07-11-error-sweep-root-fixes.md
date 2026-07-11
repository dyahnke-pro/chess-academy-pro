# Error-Sweep Root-Cause Fixes (2026-07-11)

Source: full 5-day error sweep (PostHog `$exception` + error events + Sentry,
2026-07-06 → 07-11) after the mic-build + coach-fix session. Sentry: clean.
PostHog surfaced 4 real issues + hygiene. This plan holds the ROOT-CAUSE fix
for each (David: "Root cause fixes only") — no bandaids, no watchdog tuning.

Ranked by user impact. Each phase = one PR-sized change, independently
shippable, straight to `main` per deploy policy.

---

## Phase 1 — Stockfish: bounded-time search (kills the whole stall family)

**Symptoms (≈35 events):** `stockfish-analysis-stalled: no bestmove in
12000/30000ms — variant=asm`, `forced worker respawn`, `budget grace exceeded
(engine not responding to stop)`, `coach-opponent-stockfish-error` (opponent
fails to move), `eval_bar_analysis_failed` (incl. current build).

**Root cause (confirmed in code):** `stockfishEngine._dispatchAnalysis`
(src/services/stockfishEngine.ts:1104) issues **`go depth ${depth}`** with no
time bound. Call sites request fixed depths tuned for fast engines
(PLAN_DEPTH=18 in enginePlanContext; eval-bar depths). On iOS **web**
(Safari/PWA — 51 engine loads in 5 days) the only viable engine is the
single-threaded **asm.js** build (multi OOMs the iPhone heap; WASM-single
call_indirect-traps on WebKit; lila hangs — all hard-won, do NOT revisit).
On asm.js the search runs synchronously inside the worker's event loop, so:
- depth 18 can take arbitrary time (30s+ observed → watchdog kills worker);
- the `stop` command sits UNPROCESSED in the worker's message queue — that is
  the literal meaning of "budget grace exceeded (engine not responding to
  stop)". `analyzeWithBudget`'s budget system CANNOT work on this variant by
  construction.

The native app is fine (117 `ios-native` loads — plugin runs Stockfish as an
ARM binary). The stalls are the iOS-web population.

**Root fix:** never issue an unbounded search on a variant whose event loop
blocks. UCI supports combined limits — **`go depth ${depth} movetime ${budgetMs}`**
stops at whichever limit is reached first, and movetime is enforced INSIDE the
engine's search loop (no event-loop needed — exactly why it works where `stop`
cannot).

1. `_dispatchAnalysis` gains a variant-aware time budget appended to the `go`
   command: asm → ~5000ms, single → ~8000ms, multi/lila/ios-native → none
   (keep pure depth; they honor `stop` and are fast). One map at the top of
   the file, applied at the single `go depth` call site.
2. The analysis result's `depth` field reports the deepest completed `info`
   line actually parsed (the parser already reads per-line `depth`) instead
   of echoing the REQUESTED depth — so `stockfishCache` entries are honest
   about what they hold and `getCachedStockfish` consumers (enginePlanContext,
   eval bar) can see a shallower-than-requested result.
3. Delete nothing: the stall watchdog + respawn stay as the safety net — with
   the budget they should ~never fire (that's the verification signal).

**Verify:** unit test on the `go` command composition per variant (mock
worker, assert `go depth 18 movetime 5000` for asm, `go depth 18` for multi);
existing stockfishEngine tests stay green. Post-deploy: PostHog
`stockfish-analysis-stalled` count for `variant=asm` goes to ~0 over the next
active iOS-web session (query in the plan owner's follow-up).

**Files:** `src/services/stockfishEngine.ts` (+ its test).

---

## Phase 2 — One shared origin gate for api/*, covering deployment URLs

**Symptoms (8 events, 2026-07-09):** `403 forbidden origin` from
`https://chess-academy-l8nh98ocd-dyahnke-pros-projects.vercel.app` (a raw
Vercel DEPLOYMENT URL opened on the iPhone) — killed smart_search + stage-gen
for the session; one of the two `coach_non_answer`s matches it to the second.

**Root cause:** `api/llm-proxy.ts` `PREVIEW_ORIGIN_RE` only matches
`chess-academy-pro*.vercel.app`, but Vercel deployment URLs use
`<project>-<hash>-<team>.vercel.app` — the allowlist misses the app's OWN
deployment URLs. `api/tts.ts` carries a SEPARATE copy of the same allowlist
(same gap, plus drift risk — two lists that must stay in sync never do).

**Root fix:**
1. Extract ONE shared module `api/_lib/allowedOrigin.ts` (same layer as
   `usageGuard`) exporting `originAllowed(origin)` + `corsHeaders(...)`.
2. Allowlist = the two app-scheme origins + prod + `PREVIEW_ORIGIN_RE`
   widened to the project's real deployment-URL shape:
   `^https:\/\/chess-academy-[a-z0-9-]+(-dyahnke-pros-projects)?\.vercel\.app$`.
   (Still scoped to this project + team — the gate's anti-quota-burn purpose
   is intact; arbitrary third-party origins stay blocked.)
3. `api/llm-proxy.ts` and `api/tts.ts` both import it; delete the local
   copies. Any future `api/*` gate uses the same module.

**Verify:** unit test the regex against: prod URL, preview URL, deployment
URL (the exact one from PostHog), `capacitor://` scheme, and a hostile
`https://chess-academy-pro.evil.com` (must fail). NB the Phase-6 TS2835 fix
touches the same files — land these together.

**Files:** `api/_lib/allowedOrigin.ts` (new), `api/llm-proxy.ts`,
`api/tts.ts` (+ tests).

---

## Phase 3 — Explorer: stop querying positions that cannot have data

**Symptoms (13 events, one session):** `lichess_error: rate-limit cooldown
30s` — master-play grounding dark for 30s stretches mid-game.

**Root cause:** the proxy already has CDN caching (`s-maxage=86400` +
stale-while-revalidate), which works for OPENING positions — but
`masterPlayWatcher.prefetchMasterPlay` fires for the current FEN + top-3
child positions on EVERY position change, including deep-middlegame FENs that
are (a) unique → guaranteed cache miss, and (b) out of every explorer's book →
guaranteed empty result. A 40-move game ≈ 100+ wasted Lichess calls from one
user; the 429s are self-inflicted fan-out, not load.

**Root fix — out-of-book PREFETCH cutoff (data-driven, not a rate hack):**
⚠️ CORRECTNESS NUANCE (caught in plan review 2026-07-11): "empty parent ⇒
empty children" is FALSE under transpositions — the explorer keys by
POSITION, so a child position reachable via other move orders can carry
games while this parent has none. Therefore the cutoff applies to
PREFETCH ONLY, never to on-demand lookups:
1. When the CURRENT position returns `totalGames === 0`, skip the
   speculative child prefetch for that position (session-scoped; re-arms on
   new game / take-back / a position that returns games again). On-demand
   lookups (the user reaches a position, or asks a master-play question)
   still always fire — a transposition re-entry loses only the prefetch
   latency win, never the answer.
2. Negative results are cached client-side (the existing lookup cache already
   holds results — ensure empties are cached too, not just hits).
3. No new throttles, no cooldown tuning — the circuit breaker stays as the
   backstop and should stop tripping because the speculative call volume
   collapses to the in-book prefix of each game (~10-15 plies).

**Verify:** unit test — parent-empty ⇒ no child PREFETCH while an on-demand
lookup for the same child still fires; new-game re-arms.
Post-deploy: `lichess_error` rate-limit count during an active session → ~0.

**Files:** `src/services/masterPlayWatcher.ts` /
`src/services/masterPlayLookup.ts` (whichever owns the prefetch fan-out —
confirm at build time), + tests.

---

## Phase 4 — coach_tool_callback_rejected: leave the guard, monitor

**Symptoms (2 events):** the brain called `play_move` with the STUDENT's move
(Bd4, f4); the guard refused and looped the refusal back.

**Root-cause read:** the guard IS the designed defense (G0: code decides, the
refusal text teaches the model mid-conversation) and it held both times. Two
events in 5 days, self-correcting. There is no code defect here — the "root
cause" is LLM stochasticity, already contained. **No action** beyond a
monthly PostHog glance; escalate only if the rate grows.

---

## Phase 5 — Rewrite audit-coach-play to the current surface contract

**Symptoms:** 5 expectations failing on CI since ≥ 1f152ba0 (pre-dating the
07-11 fixes): `coach-hub-tile-clicked`/`route-changed` absent on render,
`coach-turn-checkpoint` absent after a move, `coach-opening-auto-detected`
absent, `coach-memory-conversation-appended` 0.

**Root cause:** the audit script (last touched 2026-07-06, `de1a5bca`)
pre-dates the 07-08→07-10 coach-surface rework (~200 commits). The audit
events all still exist in code — the script's FLOW no longer reaches them
(selectors/flow drift: hub tile selectors, onboarding dismissal, the reworked
chat drawer). Classic AUDITS-ARE-LIVING violation: the contract moved, the
audit didn't.

**Root fix:** update the script's flow to the current surfaces (drive the
REAL current selectors; assert post-states per the adversarial-audit
doctrine — every step must prove it reached its expected state, no
click-if-visible no-ops), then wire it back green in `post-deploy-audit.yml`.
While in there: the run has been RED/cancelled on every push since 07-11
02:06 — a red post-deploy audit that everyone ignores is worse than none
(silent-no-op lesson, 2026-06-30). Getting it green again is the point.

**Files:** `scripts/audit-coach-play.mjs` (+ AUDIT_INDEX row unchanged).

---

## Phase 6 — Hygiene (small, land together)

1. **TS2835 build noise** — `api/tts.ts` imports `./_lib/usageGuard` /
   `./_lib/ttsLang`, `api/llm-proxy.ts` imports `./_lib/usageGuard` without
   the `.js` extension; Vercel's node16/nodenext function compiler prints
   errors on every build (tolerated today, one flag-flip from fatal). Root
   fix: add the `.js` extensions (ESM-correct). Lands with Phase 2 (same
   files).
2. **Internal prompts pollute `coach_question_asked`** — the ask-received
   audit logs the full composed hint prompt as `askText`. Root fix: in
   `coachService.askImpl`, for `INTERNAL_ASK_SURFACES` emit a synthetic
   label (`[internal:hint]` + tier) instead of the prompt body, so PostHog's
   Q&A telemetry carries only real user questions. (The routing side was
   already fixed 2026-07-11, `37bc0490`.)

---

## Sequencing

Phase 1 first (biggest live impact, smallest diff), then 2+6 together (same
files), then 3, then 5. Phase 4 is a no-op by design. Each phase: tests →
ship-check → push to main → bundle-hash check → G2 audit-stream pull → the
matching PostHog verification query. iOS builds only when David asks (the
native app is unaffected by Phases 1-3 web fixes except via the next build).

## Verification queries (PostHog, post-deploy)

- P1: `SELECT count() FROM events WHERE event='$exception' AND
  toString(properties.$exception_types) LIKE '%stockfish%' AND timestamp >
  <deploy>` → expect ~0 with `variant=asm`.
- P2: `coach-llm-provider-error … 403 forbidden origin` → 0.
- P3: `lichess_error` rate-limit cooldowns per active session → ~0.
