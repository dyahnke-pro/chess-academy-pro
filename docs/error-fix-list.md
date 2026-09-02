# Native error fix-list (for a fix-focused session)

Compiled 2026-09-02 from PostHog native-iOS telemetry. Errors are ordered by
**real-user blast radius first**. "Real users" = the 35–36 cohort after the
5-step contamination filter in `CLAUDE.md` (§ native-user recipe); "testing" =
David's/CC's dev + real-play/simulator audit devices (identified by ≥2 private
`build_id`s). A bug that only surfaced in testing is still a real bug — fix it —
but it is NOT evidence of a widespread user problem.

**How to re-pull any row:** PostHog MCP (`execute-sql`), native-user filter from
`CLAUDE.md`. Exclude dev devices `4589387b…`, `cd0d0525…`, `baabb7eb…` (and treat
`1afcf2a8…` Garanhuras as the ±1 borderline) when measuring real-user impact.

---

## P0 — real users, widespread or app-breaking

### E1. OTA update download fails for ~47% of real users 🔴
- **Evidence:** `ota_download_failed` — **17 of 36 real users**, 21×, through 2026-08-29. It retries (`ota_download_complete` usually follows) but fails often.
- **Impact:** nearly half of real users hit a failed OTA bundle download. Flaky update pipeline; worst case a user is stuck on a stale bundle.
- **Where to look:** the OTA update service (search `ota_download_failed` emitter, the OTA boot/download path, `ota_*` events). Check bundle host/CDN reachability on cellular, size/timeout, retry/backoff.

### E2. Stockfish WASM engine crashes / times out on some iOS devices 🔴
- **Evidence (real user, Garanhuras, one session):**
  - `RuntimeError: call_indirect to a signature that does not match` ×**136**
  - `RuntimeError: Unreachable code should not be executed`, `Out of bounds call_indirect`
  - `Stockfish initialization timed out after 45s — worker never signaled`
  - `no bestmove in 12000ms — variant=ios-native depth=18` (many, multiple devices, incl. today)
- **Impact:** the engine behind eval / best-move / analysis crashes hard or hangs on specific iOS devices; the 136-crash user had one session and never returned (app likely unusable for them).
- **Where to look:** `src/services/stockfishEngine.ts`, the `ios-native` variant + its WASM build/threading, the variant-fallback chain (`stockfish_variant_fallback`). Identify the failing device/iOS (pull `$os_version` + `$device` for the crash device) and confirm the WASM build runs there; tighten the init/per-move timeout + fallback to the asm/single-thread variant.

---

## P1 — real users, smaller footprint

### E3. Eval bar silently stops updating 🟠
- **Evidence:** `eval_bar_analysis_failed` — "eval-bar analysis empty/timed-out after player move; bar not updated" (real users). Downstream of E2.
- **Where to look:** the eval-bar analysis path that consumes Stockfish; ensure a timeout renders a graceful state, not a frozen bar.

### E4. Coach "can't verify" wall on answerable questions 🟠
- **Evidence:** `coach_grounding_gate_tripped` — 5 real users, 25×. Free-text asks like "how to improve middlegame", "why is Qe1 correct", "review my last game", pasted PGNs, and chess.com links return the stock *"I can't verify that precisely from grounded data right now…"* fallback.
- **Impact:** real (small today, because real users barely use coach chat — but it's the headline feature). Also intent misrouting: "why do I struggle with **calculation**" → treated "calculation" as an opponent; "what is black's **opening**" → gave a concept lecture.
- **Where to look:** the grounding gate + intent classifier in `coachApi.ts` / `getCoachChatResponse`. Add handling for review-of-my-game and game-paste/link intents; loosen the gate for questions code CAN ground (engine "why is X best", general improvement teaching).
- **Note:** most of the raw volume for this was the Lake Butler DEV device — verify against the real-user subset before sizing.

### E5. Coach perspective speaks in color, not "you/they" 🟠
- **Evidence:** live `coach_answer.answer_text` — "…forced mate in 6 **for white**", "**Black** is slightly better" when the user asked "for **me**".
- **Impact:** the exact confusion a user reported ("who's side it's talking about"). The 2026-08-28 `perspectiveVoice.test.ts` gate only covers SHIPPED static narration — the **runtime coach-answer path is ungated** and still emits color.
- **Where to look:** the runtime answer voicing (`voiceFacts` / coach-answer formatting). Bring it under the you/they standard.

### E6. Lichess explorer rate-limited → opening data empty 🟡
- **Evidence:** `lichess_error` "rate-limit cooldown 30s"; `coach_opponent_masters_miss` "source=none totalGames=0 … falling to stockfish".
- **Where to look:** `/api/lichess-explorer` proxy — caching, backoff, UA fallback; reduce calls / cache more so lookups don't empty out.

### E7. Dexie/IndexedDB transaction errors 🟡
- **Evidence:** "Attempt to delete range from database without an in-progress transaction"; "Attempt to iterate a cursor that doesn't exist".
- **Where to look:** Dexie usage where a transaction closes before an async delete/iterate completes; wrap in a live transaction or await correctly.

### E8. Mic input fails 🟡
- **Evidence:** `mic_start_failed` — "native permission denied" (real users) and "Microphone is already in use by another application" (audio-session conflict). Historical (July): "SpeechRecognition plugin is not implemented on iOS" (likely fixed by the SPM speech patch — verify it's in the shipped build).
- **Where to look:** mic permission priming UX; AVAudioSession config in `ios-patches/App/AppDelegate.swift` (`.playAndRecord` + `.mixWithOthers`) — confirm it's live so TTS holding the session doesn't block the mic.

---

## P2 — correctness / polish

### E9. Coach hallucinated board state (caught by the net) 🟠
- **Evidence:** `$exception` — "dropped hint sentence — piece-on-square: d4 is empty", "stripped 1 disproven sentence from hint bubble", "Piece-letter shorthand survived sanitizeForTTS".
- **Impact:** the safety net stripped false claims (good), but the brain still generated "the piece on d4…" when d4 was empty, and one raw shorthand leaked into TTS. Mostly on testing devices, but it's a G0/G3 correctness issue.
- **Where to look:** the narration grounding for hint bubbles; the `sanitizeForTTS` shorthand path.

### E10. Raw grounding text leaked to the user in step-by-step narration 🟠
- **Evidence:** on "I played e5 / d3 / e4", 3 of 4 replies showed raw internal facts ("The student played e5. The coach replied Ng8. quiet knight move f6->g8, no capture. Teaching about this OPENING…") instead of prose, with no `[VOICE:]` marker → nothing spoken.
- **Impact:** when the narration LLM call doesn't run, the fallback dumps the raw fact string to the UI and goes silent. (Seen on the dev device, but it's a real failure mode.)
- **Where to look:** the step-by-step narration fallback in the teach/play path — the raw grounded-facts string must never be the user-visible answer; ensure a prose synthesis or a clean silent state.

### E11. Double-fire race → contradictory coach answers 🟡
- **Evidence:** same question, same second, two different `coach_answer`s — a real grounded answer AND the "can't verify" fallback (e.g. "Doesn't that mess the structure up" → "The best move is c4…" + two fallbacks). `feedback_submitted` also double-fires.
- **Where to look:** the coach submit handler (debounce/guard against double submit) and the feedback submit handler.

### E12. `unbuilt_opening_lesson` empty state 🟡
- **Evidence:** 1 real user hit an opening with no `LessonScript` (G9.3 Gate A class) → fell to an empty/legacy state.
- **Where to look:** which opening id fired it (pull the event's props); either build the lesson or route to a graceful state.

---

## NOT a bug — do not chase

- **`voice_fallover` "→ Web Speech" is a warmup/cooldown LOG, not robotic playback.** Verified 2026-09-02: every actually-spoken narration used `voiceService.speakCloud` (cloud voice); there is **no** Web-Speech tier in `voice_spoken`/`coach_narration_spoken` sources. David never heard robotic, and neither did real users. 660 of the 736 were the Lake Butler dev device. Don't "fix" the voice tier based on this event.
- **`audit_kind`** is the app's own `logAppAudit` telemetry taxonomy, not an error/automation marker.

---

## Sizing note (read before you prioritize)

Real users **barely use the coach chat** (Learn 7 users, Play 6, Review 4; ~6 total coach exchanges among real users). Most coach-chat error volume (E4/E5/E9/E10/E11) came from the Lake Butler DEV device — the bugs are real, but their *current user impact* is small. The two errors that actually hit a lot of real users are **E1 (OTA download)** and **E2 (engine WASM crash/timeout)** — start there.
