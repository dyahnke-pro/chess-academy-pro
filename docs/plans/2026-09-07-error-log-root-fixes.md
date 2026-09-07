# 2026-09-07 — Error-log root-cause fixes (autonomous overnight)

David: "root cause fixes. Test each fix as a new build. Gain full context by
reading every bit of code. Get the connective tissue right the first time. Each
new build needs a new FULL context gain. Audit. When it's all working and
verified, send OTA."

Scope = the failures that actually appeared in prod telemetry, MINUS what other
sessions already fixed (best-move/hint `e11a8d3`, coach-answering PR #928, the
review-overhaul batch, Upstash `d07f30f`). "Two openings" is by-design — NOT in
scope. Verified each item's files via `git log` before planning (nothing below
was patched by tonight's landings).

## Fixes (each: root cause → change → build/ship-check → prod audit)

### #1 — Engine `getBestMove` hang → board freeze  🔴 (David's crash report)
- **Symptom:** WLPP Play (`OpeningPlayMode`) / endgame playout — you move, the
  coach never replies, board locks, no recovery but killing the app. Fires when
  the iOS Stockfish worker dies mid-game.
- **Root cause:** `stockfishEngine.getBestMove` (`:1613`) is a bare Promise that
  resolves ONLY on a `bestmove` message — no timeout, no reject, no `this.pending`
  registration, so the 30s `hardTimeout`/`recoverStuckAnalysis` backstop that
  protects `analyzePosition` never covers it. `getCoachMove` (`coachPlaySession.ts:202`)
  awaits it bare. Dead worker ⇒ pending forever ⇒ freeze. (The old `handlePlayerMove`
  freeze in `docs/temp/coach-freeze-still-diag.md` was already closed by the
  2026-06-16 `hardTimeout` on `analyzePosition`.)
- **Fix (two layers, disease + tissue):**
  1. `getBestMove` gets an internal watchdog: no `bestmove` within
     `max(moveTimeMs+5000, 8000)ms` → `forceRestart` (tears down the dead worker
     so the next call respawns) → reject. The engine can no longer hang.
  2. `getCoachMove` catches an engine failure and returns a legal fallback move
     (chess.js) so the opponent ALWAYS moves — the play surface never stalls.
- **Caller audit (contract change hang→reject):** 8/9 callers already tolerate a
  rejection (try/catch, `.catch`, `withTimeout`, `Promise.race`). Only
  `ModelGameViewer.tsx:259` had a bare `.then` → add `.catch`.
- **Audit:** unit test (dead worker → getBestMove rejects, not hangs) +
  `audit-coach-play` / `audit-coach-full-games` hung-worker injection.

### #2 — review-pv-playback discards warm narration every ply  🟠
- **Root cause:** register/fact-length mismatch. `CoachGameReview.tsx:1326` calls
  `voiceFacts` with intent `review-pv-playback` + `warm`; `coachApi.ts:2415-2417`
  maps every `review-*` to the verbose `'review'` register (700 tok, 8-moment
  story) while the fact is ONE sentence (`pvPlayback.ts plyFactsString`), so the
  budget `facts*2+2 = 4` (`voiceContainment.ts:136`) is blown every ply → warm
  line discarded, flat computed line served.
- **Fix:** give per-ply pv-playback a compact register (small sentence budget /
  token cap) instead of the story register, or scale the budget off intent.
- **Audit:** `audit-review-overhaul-prod` — warm line survives; gate-trip count → ~0.

### #3 — mistake-review fidelity false-positive  🟠
- **Root cause:** `mistakeNarrationVoice.ts:97` `mustPreserve:[SAN]` (e.g. `Bxc3+`);
  `coachApi.ts droppedTokens` substring-matches the literal SAN, but the register
  is told "say the idea, not the notation" → prose lacks the literal `Bxc3+` →
  trip → flat line. Substring assumption holds for a bare square, breaks for a
  full capture/check SAN.
- **Fix:** normalize SAN (strip piece letter / `x` / `+` / `#`, match destination
  square) before the `droppedTokens` compare.
- **Audit:** `voiceFactsFidelity` unit + review audit on a capture/check mistake.

### #4 — voice warmup race (first review line silent)  🟡
- **Root cause:** fire-and-forget `warmup()` (3s probe) races the first review
  narration; `isPollyLive()` false ⇒ cloud skipped ⇒ silent (WEB_SPEECH fallback
  is OFF). Not robotic — silent.
- **Fix:** gate first narration on warmup completion (or one quick cloud retry);
  fix the misleading "→ Web Speech" summary. Don't touch tier logic.

### #5–7 (verify; likely small/cosmetic)
- **5 stutter** — Watch beat re-fires ~40s (dedup guard masks audio). Fire once /
  voice-promise-gated advance.
- **6 unbuilt-opening** — tool-name near-miss FIXED (`bbd58a7`); deepening landed
  (`9c1df28`). Verify no dead-end.
- **7 OTA download-failed** — likely phantom `downloadFailed` reply-shape (per
  CLAUDE.md OTA note). Verify transient vs real.

## Order / rules
- One fix per commit, land on `main`, prod-audit before the next (each a "new
  build" with fresh full context).
- OTA once, at the end, ONLY if every landed fix is verified green. Anything not
  verifiable HOLDS — reported in the morning, not OTA'd.
- Root cause, never bandaid. Connective tissue verified per caller.
</content>
</invoke>
