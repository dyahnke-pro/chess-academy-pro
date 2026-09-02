# Microphone fixes — 2026-09-01 (session handoff)

Everything below is **landed on `main`** (commits `229e103c3` + `0f8f383ad`)
and **deployed to prod** (bundle `index-CdcWD-rs.js`). Full mic-test suite
green (55 tests: `voiceInputService.test.ts` + `voiceInputService.turnTaking.test.ts`).
ship-check `READY TO PUSH` on the latest tree.

## What was fixed + how it was verified

| Fix | File | Verification |
|---|---|---|
| **Web mic error copy** — reason-specific + actionable (was a blanket "not supported" for blocked-mic / network / thrash) | `SmartSearchBar.tsx` | ✅ **Verified LIVE on prod** — blocked mic shows "Microphone blocked. Allow mic access… (the 🎤 in your address bar)…" |
| **Web echo guard** — recognizer drops input while the coach's TTS plays, so it can't transcribe itself / cut itself off ("coach hearing itself") | `voiceInputService.ts` `onresult` + `primeVoiceServiceRef` | ✅ Unit-tested (echo-guard test) |
| **Mic-off-on-leave** (NON-NEGOTIABLE) — stops on tab-switch / minimize / background / close, on **both** web + native (Capacitor `appStateChange`) | `voiceInputService.ts` `attachLifecycleListeners` (now called on both paths) | ✅ Unit-tested (visibilitychange + pagehide); ✅ sim: mic grey after background→foreground |
| **iOS re-arm retry** — transient "Microphone is already in use" no longer kills the turn-taking conversation | `voiceInputService.ts` `restartNativeSession` | ✅ Unit-tested (transient-retry + non-transient-give-up) |
| **iOS plist strings** — inject `NSSpeechRecognitionUsageDescription` (missing = guaranteed first-tap crash) in fastlane CI + local setup | `ios-testflight.yml`, `scripts/inject-ios-plist-keys.mjs`, `package.json` | ✅ **Verified on sim** — both permission dialogs fire, no crash |
| **Web mic errors → PostHog** (`mic_start_failed`) — were invisible in durable analytics | `voiceInputService.ts` `onerror` | ✅ (observability; terminal web errors now mirrored) |

## Sim confirmations (rebuilt from latest `main`, watermark `229e103`)
- "How it works" onboarding modals: **GONE** (were the stale build; auto-open disabled `PageHelp.tsx:42`, David 2026-08-22).
- Analyzer **Stop** button: present in latest (`AppLayout.tsx:203-219`, `data-testid="bg-analysis-stop"`).
- Mic arms crash-free; off after backgrounding.

## OPEN — needs David / can't verify headless
1. **iOS live transcription (voice→text→coach→re-arm):** the iOS **Simulator ships no speech-recognition model** (sim log: `_EARSpeechRecognizer is nil`, `mini.json cannot open`), so the full voice loop can only be confirmed on a **real iPhone**. The crash fix + re-arm are verified/tested; the live loop is device-only. → **Cut a TestFlight build when David asks** (per "only when asked" rule; NOT auto-built).
2. **Web "mic red but not hearing me talk" (desktop Chrome):** likely tangled with the echo loop (coach heard itself → recognizer state corrupted / onSpeechStart cut things off). The **echo guard should resolve it** — David needs to **re-test on his unblocked Chrome against the new deploy** to confirm. If it persists, investigate the `crossOriginIsolated`/COEP `require-corp` tension with `webkitSpeechRecognition` (set for Stockfish SharedArrayBuffer) — but note recognition WAS producing results (it transcribed the coach), so COEP is probably NOT hard-blocking it.
3. **Web echo guard:** unit-tested, not live-verified (needs real mic + TTS). Confirm on unblocked Chrome.

## Separate bug found (NOT mic — flagged for later)
- **Prod audit stream is DEAD** — 0 events / 24h. The app's baked `AUDIT_STREAM_SECRET` no longer matches prod's rotated secret, so every post 401s and streaming self-disables (the exact rotation failure in CLAUDE.md's AUDIT-STREAM SECRET lesson). This is why "check the audit stream" kept coming up empty this session. Fix: re-sync the baked/profile secret to the current Vercel `AUDIT_STREAM_SECRET`.

## Next-session pickup
- If David asks: cut the TestFlight build (`daily-deploy.yml`, `external=false`) so iOS gets the crash/re-arm/mic-off fixes; then run the 3-instrument audit on `/coach/play` voice.
- Have David re-test web voice on his real (unblocked) Chrome vs the new deploy; if "not hearing" persists, dig into COEP × Web Speech.
- The E1/E2/P1/P2 backlog David queued is UNTOUCHED (parked until mic signed off).
