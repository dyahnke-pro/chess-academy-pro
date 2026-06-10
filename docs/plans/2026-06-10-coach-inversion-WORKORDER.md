# WORK ORDER — Coach grounding inversion (zero-stumbling-block hand-off)

**Branch:** `coach-grounding-inversion` (NOT main — stay here until the whole
inversion is done and David says merge). **Read first:**
`docs/plans/2026-06-10-coach-chat-grounding-inversion.md` (the plan + the full
26-task inventory + the taxonomy table). This doc is the EXECUTION guide.

**The law (tattoo it):** the LLM decides NOTHING. Every chess fact — move, eval,
the *reason* a move is strong — is computed in code; the LLM only phrases it.
**The test:** if you're adding a validator, a gate, a regen, or a "use exactly
these squares" prompt — STOP. The LLM is still deciding. Compute it and route it
through `voiceFacts`.

**Why this matters (so you feel the weight):** this took David 3 months of
yelling to land. The band-aids (validators/regens/strippers) *worked just
enough* to hide that they were the disease, AND they fired 3–6 LLM calls per
turn — the amplifier behind a real Anthropic token-drain scare. Inversion fixes
correctness AND cost in one move.

---

## ✅ WHAT'S ALREADY BUILT (verified: 268 tests green, typecheck 0, lint 0)

1. **`voiceFacts()` — THE CHOKEPOINT** — `src/services/coachApi.ts` (search
   `export async function voiceFacts`). Takes a computed `facts` string + the
   provider config, makes ONE cheap call (cheap model, 240 tokens, voice-only
   system prompt), returns prose. Its doc comment is the law in code. **Every
   grounded answer voices through here.**
2. **`groundedAnswer.ts` — THE PURE LEAF** — `src/services/groundedAnswer.ts`.
   Imports ONLY `chess.js`, `./tacticClassifier`, and type-only `../coach/types`
   + `../types`. Imports NOTHING that could loop back. Contains:
   - `assembleMoveEvalAnswer({fen, bestMoveUci, evalCp?, mateIn?})` → best-move/eval answer
   - `assembleTacticsAnswer(tactics, studentColor)` → forks/hanging/mate (Phase 2)
   - `assembleProgressAnswer(badHabits)` → student history (Phase 6)
   - `explainBestMoveGrounded(...)` (moved here from coachFeatureService — see
     CIRCULAR gotcha) + `REVIEW_PIECE_NAME/VALUE`
   - `GroundedAnswer` interface: `{facts, bestMoveSan, bestMoveFromTo, sources}`
   - Tests: `groundedAnswer.test.ts` (14, all pure — copy these for new assemblers)
3. **Best-move inversion — WIRED LIVE** — `coachApi.ts` `getCoachChatResponse`,
   right after `masterPlayContext = await buildMasterPlayContext(grounding)`
   (search `GROUNDING INVERSION (Phase 1)`). For a `bestMoveQuestion` with master
   data: assemble → `voiceFacts` → return (with a `[BOARD: arrow:..]` marker),
   **falls through to the legacy path on any miss.** THIS BLOCK IS YOUR WIRING
   TEMPLATE — copy its shape for every other intent.

---

## ✅ SESSION 2 LANDED (2026-06-10, branch `claude/friendly-bohr-1hsl0g`)

STEP A, B, C + two STEP D items are DONE, committed, ship-check GREEN
(typecheck 0, lint 0 errors, content gates green, 322 coach tests pass).
Gate baseline driven **9 → 4**.

- **STEP A** — engine snapshot threaded. `MasterGroundingOptions` carries
  `engineBestMoveUci` / `engineEvalCp` / `engineMateIn` / `tactics`;
  `LiveState.engineBestMoveUci` added + populated in `CoachTeachPage` from the
  eval-bar analysis; `coachService.ask` threads them. The best-move interception
  now PREFERS the engine move over the master top move → **off-book positions
  ground** (the gap the master-only block couldn't cover). Eval is sign-flipped
  white-POV → side-to-move in the interception.
- **STEP B** — Phase 2 tactics + Phase 6 progress wired live. Detectors
  `isTacticsQuestion` / `isProgressQuestion`; interceptions call
  `assembleTacticsAnswer` / `assembleProgressAnswer` → `voiceFacts`. Progress
  engages even with no FEN.
- **detectBadHabits extracted to the leaf** `src/services/badHabitDetector.ts`
  (cycle-free; `coachFeatureService` re-exports). Progress now computes the
  FRESH habit profile in `coachApi` — no coachApi↔coachFeatureService cycle, no
  stale `profile.badHabits` shortcut.
- **STEP C** — regen loop KILLED. The grounded path is now ONE LLM call + ONE
  silent `validateClaims` backstop + in-code `stripUngroundedSentences` (drops
  whole sentences carrying a flagged claim; markers protected; case-insensitive).
  ZERO regens. A turn is AT MOST 1 LLM call. `buildRetryAddendum` deleted.
  master-integration tests updated to the strip contract (living-audit rule).
- **STEP D (partial):**
  - `intent_classify` LLM fallback DELETED (`classifyWithLlmFallback` in
    `coachSessionRouter`). `parseCoachIntent` is the ONLY routing path — the LLM
    no longer decides routing, and a 60-token call/qa-turn is gone.
  - Phase 4 "how do masters play this?" — pure `assembleMasterPlayAnswer` voices
    the master-play lookup's real top moves + frequencies; `isMasterPlayQuestion`
    detector + `masterPlayQuestion` flag + interception.
  - **Phase 3 plans** — pure `assemblePlanAnswer` voices the engine PV (replayed
    + chess.js-verified) as the plan: the student's moves + the expected reply +
    eval, arrow on the first move. Threaded via `enginePlan` in
    `MasterGroundingOptions` + the `planQuestion` interception. (NOT a thin
    raw-PV voicer — it validates the line replays legally and stops at the last
    legal ply, never voicing a bad line.)
- **Gate driven 9 → 1.** Beyond STEP C's removals: reworded the stock fallback
  to stop punting "run the position through the engine", and reworded the two
  false-positive doc/comments so the gate measures REAL band-aids. The remaining
  **1** is the single silent `validateClaims` backstop on the general chat
  path (kept deliberately per STEP C). It is the HONEST FLOOR until that general
  path is fully inverted — **do NOT delete the backstop to hit 0** (that removes
  the safety net, not the disease).

- **STEP E — leak audit — DONE.** `coach-llm-call` fires on EVERY coach LLM
  call with a `grounded` flag (true = assembler→voiceFacts; false = the general
  chat fallback + the grounded-by-injection narration tasks). audit-stream /
  PostHog now show the grounded:ungrounded ratio + every remaining ungrounded
  call type by `intent`. **This is the measured answer to "does the LLM still
  decide anywhere?" — pull the audit and read the `grounded=false` rows.**

### 🔭 STILL LEFT (the harder tail — each at FULL depth; finish line = gate 0)
The DECISION/Q&A paths are inverted. What remains splits in two:

1. **Grounded-by-injection NARRATION (do NOT shallow-template these).**
   `move_commentary`, `puzzle_feedback`, `game_post_review`, the reports
   (`weakness/bad_habit/weekly/daily/session`), `model_game_annotation`,
   `opening_overview`, `sideline_explanation`. They route through
   `getCoachCommentary`, already inject the facts + "never invent" rules +
   the narrationAuditor, and produce rich TEACHING prose. G0 permits the LLM
   to *phrase* computed facts — that's what these do. Forcing them through a
   templated facts-voicer REGRESSES the teaching quality (the cardinal
   shallow-work sin). The right next step for these is to TIGHTEN the
   fact-injection + lean on the auditor, NOT to template them. The leak audit
   tags them `grounded=false` so their volume is visible.
2. **Genuine remaining DECISION holes** (each needs new plumbing — do at full
   depth WITH review, not blind):
   - **Phase 5 concepts — DONE** (`assembleConceptAnswer`, `isConceptQuestion`,
     book-corpus grounded).
   - **Phase 4 pro-game refs** ("how does \<pro\> play X") — `playerGames`
     envelope is injected (`LivePlayerGamesContext` in liveState); thread it onto
     `MasterGroundingOptions` + assemble (count + the highest-rated-opponent win
     + variation). The detector is the fuzzy part (arbitrary pro names) — gate on
     the playerGames context being present rather than name-matching.
   - **Phase 5 endgame** — `/api/lichess-tablebase` is the TRUTH for ≤7-piece
     endings (win/draw/loss + DTZ + best move). Needs an async tablebase fetch in
     the chat path (like `buildMasterPlayContext`'s fetch) gated on an endgame FEN
     + an `isEndgameQuestion` detector. Network-dependent — verify proxy reach.
   - **whatif** ("what if I play X?") — needs a Stockfish eval of the hypothetical
     position IN the chat path, then voice the resulting eval+line.
   - **General chat-fallback** → assemble position facts (eval+tactics+master+
     book) and voice; only genuinely-non-chess chat stays free prose. Once that
     lands, the lone `validateClaims` backstop has nothing to guard → delete it
     → **gate 0**. Do NOT delete the backstop before then (it's the safety net,
     not the disease). This is also a PRODUCT call (terser grounded answers vs
     the current richer free prose) — confirm with David.

## 🔧 WHAT'S LEFT (original plan, in order)

### STEP A — Thread the engine snapshot to the chat layer (the load-bearing piece)
`assembleMoveEvalAnswer`/`assembleTacticsAnswer` need Stockfish's best move +
eval + the `liveTacticsContext`. Today those live at the SURFACE
(`CoachTeachPage`/`CoachGamePage`/`VoiceChatMic` — `engineSnapshot`,
`tacticsForAsk`), NOT in `getCoachChatResponse`. Thread them, additive + optional:
1. `MasterGroundingOptions` (`coachApi.ts`): add optional `engineBestMoveUci?`,
   `engineEvalCp?`, `engineMateIn?`, `tactics?: TacticsLiveContext`.
2. `coachService.ask` (`src/coach/coachService.ts`, the `autoGrounding` object
   ~line 845): pass them from `input.liveState` (engine snapshot + `tactics`).
3. `getCoachChatResponse`: use them in the interception. Best-move currently uses
   the *master* top move; once the engine move is threaded, prefer it (it's the
   true "best"). Off-book positions (no master data) then ALSO ground — that's
   the gap the current best-move block can't cover yet.
**Verify after:** `master-integration` stays 20/20.

### STEP B — Wire Phase 2 (tactics) + Phase 6 (progress) live
The assemblers exist + are tested. Just detect the intent + intercept:
1. Add detectors in `coachService.ts` next to `isBestMoveQuestion`/`isPlanQuestion`:
   `isTacticsQuestion` ("anything hanging / threat / fork / pin / in danger / mate?"),
   `isProgressQuestion` ("am I improving / what should I work on / my weaknesses?").
2. Thread flags through `MasterGroundingOptions` → `MasterPlayContext` (copy how
   `bestMoveQuestion` flows: grounding field → carried onto the context at the
   two `buildMasterPlayContext` return sites).
3. Intercept in `getCoachChatResponse` (same block as best-move): tactics →
   `assembleTacticsAnswer(grounding.tactics, studentColor)`; progress →
   `assembleProgressAnswer(await detectBadHabits(...))` → `voiceFacts` → return.
4. Fall through on null.

### STEP C — Kill the regen loop (the "1 call max" guarantee — David's directive)
Find the claim-validator REGEN loop in `coachApi.ts` (search
`claim-validator-trip` / the retry that re-calls the LLM up to 2×). **Replace
regen with in-code sentence-level strip** (model: `stripUngroundedPlayerStats`
in `claimValidator.ts` — drops whole sentences carrying an ungrounded claim, so
output stays grammatical, NO clipped fragments). Keep ONE validator pass as a
silent backstop; ZERO regens. **The ONE fallback contingency (David's rule):** a
single `voiceFacts`-class call over the computed facts — NEVER the multi-call
pipeline. After this, a turn is AT MOST 1 LLM call.

### STEP D — Walk the rest of the inventory (plan doc's table), one at a time
Each intent = (a) `isXQuestion` detector in coachService, (b) pure assembler in
`groundedAnswer.ts` + pure tests, (c) intercept in `getCoachChatResponse`, (d)
fall through. Fact sources are in the plan table: Phase 3 plans →
`middlegame-plans.json` (the `criticalPositionFen` match); Phase 4 opening/theory
→ master-play DB + `pro-game-references`; Phase 5 endgame → `/api/lichess-tablebase`
+ `chess-concepts.json`; `intent_classify` → make `parseCoachIntent` the only
path (delete the LLM fallback); reports (`weakness/bad_habit/weekly/daily/session`)
→ the computed profile, voiced.

### STEP E — Leak audit (LAST — David: "later todo")
Instrument every coach LLM call: tag `grounded` (came via an assembler→voiceFacts)
vs `ungrounded` (free reasoning / fallback). Emit `coach-ungrounded-llm-call`
(add the kind to `appAuditor.ts`'s audit-kind union + `analytics.ts`'s exception
list IF you want it tracked) with the detected intent + raw question. Now
audit-stream/PostHog shows EVERY remaining leak → a closeable list.

---

## 🚧 STUMBLING BLOCKS — ALREADY HIT, PRE-CLEARED FOR YOU

1. **CIRCULAR IMPORTS (David rejected the dynamic-import "dodge").** Pure
   computers go in the LEAF (`groundedAnswer.ts`). NEVER `import` `coachApi` (or
   anything that imports coachApi, e.g. `coachFeatureService`) from the leaf —
   that's the cycle. `coachApi` imports the leaf STATICALLY (top-level). If you
   need a pure helper that lives in a coachApi-tangled file, MOVE it to the leaf
   (that's exactly what was done with `explainBestMoveGrounded`). No `await
   import()` workarounds — fix the architecture.
2. **`npm run typecheck` ≠ `npx tsc --noEmit`.** The pre-push hook runs
   `npm run typecheck` (full project, stricter, includes tests). ALWAYS run it
   before declaring done — `npx tsc --noEmit` MISSED two real errors. Specific
   traps that bit me:
   - `ProviderConfig.preferredModel` is a `string | {commentary,analysis,reports}`
     UNION. Do NOT pass it as a model string — use `DEEPSEEK_MODEL_MAP.move_commentary`
     / `ANTHROPIC_MODEL_MAP.move_commentary` (plain strings) directly.
   - `masterPlayContext` is `MasterPlayContext | undefined` after
     `buildMasterPlayContext`. Guard it (`grounding.x && masterPlayContext && ...`).
3. **The push is gated by `ship-check` (pre-push hook).** A red typecheck/lint/
   test ABORTS the push silently-ish. Run `npm run ship-check` → must print
   `READY TO PUSH` BEFORE pushing. (Bypass only with `--no-verify` and only if
   you understand the cost — don't.)
4. **Don't break `master-integration.test.ts` (20 tests).** It's the coach-pipeline
   safety net. Its fetch mock matches `/api/llm/{deepseek,anthropic}` (the proxy
   paths — NOT `api.deepseek.com`). Every wiring change: re-run it, stay 20/20.
5. **Additive + fall-through ALWAYS.** Every interception returns the grounded
   answer ONLY on full success; on ANY miss it falls through to the existing path.
   That's how the live app can't break while you migrate intent by intent.
6. **Keys/proxy are already server-side.** Provider calls go through
   `DEEPSEEK_PROXY_BASE`/`ANTHROPIC_PROXY_BASE` (the `/api/llm` proxy). Do NOT
   reintroduce a baked key or call `api.deepseek.com` directly.
7. **FILE ISOLATION.** Another session owns the trap/pitfall DATA
   (`pro-repertoires.json`, `common-mistakes.json`, `punish-gems.json`,
   `lessons/*.ts`, `model-games.json`, `middlegame-plans.json`). DO NOT TOUCH
   them. Your lane is the 4 coach SERVICE files: `coachApi.ts`,
   `coachFeatureService.ts`, `groundedAnswer.ts`, `coachService.ts` (+ tests).

---

## VERIFICATION GAUNTLET (run before every local commit; full set before the push)
```
npm run typecheck                          # MUST be 0 errors (the real gate)
npx vitest run src/services/groundedAnswer.test.ts \
  src/services/coachFeatureService.test.ts \
  src/services/coachApi.master-integration.test.ts src/coach/
npx eslint src/services/{coachApi,coachFeatureService,groundedAnswer}.ts src/coach/coachService.ts
npm run ship-check                         # MUST print READY TO PUSH
```

## DEPLOY / DONE
- Commit locally as you go; **ONE push at the end** (David's rule — saves the
  Vercel cap, avoids churn). Push the branch, NOT main.
- "Done" = every ⛔/🟡 in the plan's inventory table is ✅, the claim validator
  goes near-silent (nothing ungrounded to catch), a turn is ≤1 LLM call, and
  `master-integration` is still 20/20.
- THEN: David decides the merge to main, after which run the post-deploy
  3-instrument audit + `scripts/audit-coach-bestmove-grounding.mjs` on prod.

## NEXT-SESSION FIRST MOVE
Read the plan doc → read `groundedAnswer.ts` (see the proven pattern) → read the
best-move interception in `coachApi.ts` (your template) → do STEP A (thread the
engine snapshot). That single step unlocks off-book best-move + every tactics/
eval intent. Go.

---

## 🔒 THE G0 GATE IS LIVE (mechanical enforcement — built 2026-06-10)
`src/services/coachInversion.gate.test.ts` FREEZES the band-aid count (validator
calls + regen + "cite NO / use EXACTLY / run it through the engine" prompts) in
`coachApi.ts` + `coachService.ts` at **BASELINE = 9**. It's wired into
`scripts/ship-check.mjs` GATE_TESTS, so adding a new band-aid makes the push go
RED. **As you remove a validator (because the answer is now computed), LOWER the
baseline to the new count. NEVER raise it. 0 = inversion complete.** That's the
teeth behind G0 — a written rule got ignored 8×; this one can't be.

---

## 🗂️ FULL SESSION CONTEXT — everything else in flight (don't lose this)

### Security incident (mostly fixed; ONE thing still owed)
- **LLM keys were leaked** in the public bundle AND git history. Fixed: provider
  calls now go through the server-side proxy `api/llm-proxy.ts`
  (`/api/llm/{deepseek,anthropic}`, Origin-allowlisted, edge, streams); keys
  removed from the bundle (verified zero `sk-`); the `VITE_*_API_KEY` Vercel env
  vars (which auto-bake into the client) were DELETED; `DEEPSEEK_KEY` +
  `ANTHROPIC_KEY` set server-side in Vercel.
- **DeepSeek key** `sk-92e…c9fe` was REVOKED (it was siphoned onto
  `deepseek-v4-pro`, 779 requests). New DeepSeek key is set server-side + works.
- **⚠️ STILL OWED:** the **Anthropic key `sk-ant-api03-8…3gAA` is the LEAKED one**
  (still in git history) and got drained (~$20, almost certainly siphoned —
  PostHog showed only 1 legit device). David must **ROTATE it** once testers are
  off the old build, then update `ANTHROPIC_KEY` in Vercel, and **set a hard
  spend cap** on the Anthropic account. Until then it's the bridge keeping the
  installed app alive.

### Phone / TestFlight (David owes a build)
- David's installed iPhone app is build **`ccad2845`** (2026-06-09) — the OLD
  pre-proxy bundle with **baked keys that are now dead**. Coach there limps on
  the Anthropic baked-key fallback (dies when that credit runs out). The fix is
  a NEW TestFlight build: `git pull` → **`unset VITE_DEEPSEEK_API_KEY
  VITE_ANTHROPIC_API_KEY`** (or the build re-bakes a key) → `npm run build`
  (verify `grep -rEo 'sk-ant-api[0-9]{2}|sk-[a-f0-9]{30}' dist/assets/*.js` is
  empty) → `npx cap sync ios` → `cp ios-patches/App/AppDelegate.swift
  ios/App/App/AppDelegate.swift` → open `ios/App/App.xcworkspace` → Archive →
  TestFlight. New bundle uses the proxy, no baked keys.

### Other coach fixes already landed on main this session
- Best-move/soundness answers (PR #712, merged). · Arrow grounding
  (`src/utils/arrowGrounding.ts` — `groundArrows`). · Board unlocks the instant
  the opponent moves, on BOTH Learn (`CoachTeachPage`, `opponentThinking` flag)
  and Play (`CoachGamePage:4619`, dropped the `isNarrating` lock + `voiceService.stop()`
  on move). These are the move-timing fixes; they ship in the new TestFlight too.

### Access / infra a fresh session has (don't re-ask)
- **PostHog** (product analytics, the app's audit system): the read key is in the
  env as **`Read_key_PostHog`** (`phx_…`). `scripts/posthog-query.mjs` now
  auto-resolves it (any `phx_` env var). Query: `node scripts/posthog-query.mjs
  "<HogQL>"`. Project 390808.
- **Vercel**: `VERCEL_TOKEN` is in the env (manage env vars / deploys via the
  API). teamId `team_EG9m215w9cQHWilBOPnOtIFS`, project `chess-academy-pro`.
- **Audit-stream**: `AUDIT_STREAM_SECRET` in the env. `GET
  https://chess-academy-pro.vercel.app/api/audit-stream?since=<ms>` with header
  `x-audit-secret`.
- **This environment has full internet + prod + Vercel access** (per CLAUDE.md
  standing note). The Chromium IndexedDB write-stall is the only sandbox quirk.

### Parallel sessions / file isolation
- Another session is building **trap/pitfall DATA** (`pro-repertoires.json`,
  `common-mistakes.json`, `punish-gems.json`, `lessons/*.ts`,
  `model-games.json`, `middlegame-plans.json`). **DO NOT TOUCH those files.** The
  inversion's lane is the 4 coach SERVICE files. Disjoint → no conflict.

### The cost stakes (the WHY behind the urgency)
The inversion is the ROOT fix for BOTH hallucination AND token cost. Every
decision moved to code = an LLM call avoided or shrunk: validator regens gone
(3–6 calls/turn → 1), prompts collapse (voice a tiny facts block, not the whole
board + "don't hallucinate"), and some surfaces go to ZERO LLM (the review path
already does — `buildDeterministicNarration` calls the model not once). That is
what stops the Anthropic-drain scare from being possible. Ship it.
