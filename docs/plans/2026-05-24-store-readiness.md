# Store Readiness — App Store + Play Store production launch

**Status: PLANNING (David 2026-05-24).** Goal: ship Chess Academy Pro to the
Apple App Store (iOS) and Google Play (Android) for production. **No rewrite —
the app is already native via Capacitor 8.** This is config + native shell +
QA + store paperwork, separable from the masterclass content build.

## What's already in place (verified 2026-05-24)
- **Capacitor 8.1.0**, both platforms as deps: `@capacitor/core`, `@capacitor/ios`,
  `@capacitor/android`, `@capacitor/cli` — Android is NOT a new transition, it's
  already wired.
- `capacitor.config.ts`: `appId: com.chessacademy.pro`, `androidScheme: 'https'`,
  iOS content-inset/scroll/bg, SplashScreen config (incl. android keys).
- `ios/` and `android/` are **gitignored** — regenerated per-machine via the
  `setup:ios` / `setup:android` npm scripts (NOT committed). So native edits live
  in patch files copied over after `cap sync` (see `ios-patches/`).
- `npm run setup:ios` = `cap add ios; cap sync ios; cp ios-patches AppDelegate`.
- `npm run setup:android` = `cap add android; cap sync android` (exists, untested).
- iOS audio: `ios-patches/App/AppDelegate.swift` sets the AVAudioSession
  (`.playAndRecord`, mix/bluetooth/speaker) so Polly TTS + Web Speech mic survive
  route changes.

## The real gaps (what "production-ready" actually needs)

### GAP 1 — App icons + splash, both platforms (BLOCKER for store upload)
- No source icon/splash art in the repo; no `@capacitor/assets` tooling installed.
- **Action:** add `@capacitor/assets` (dev dep); drop a 1024×1024 `icon.png` and a
  splash source in `assets/`; run `npx capacitor-assets generate` → produces every
  iOS/Android size + the splash resources the config already references
  (`androidSplashResourceName: 'splash'`). *(Needs the source art from David.)*

### GAP 2 — Android audio/mic native parity (the iOS patch has no Android twin)
- `ios-patches/` handles the iOS audio session; there is **no `android-patches/`**.
- Android WebView does NOT grant mic or autoplay audio by default the way the
  patched iOS shell does. Streaming TTS playback + `webkitSpeechRecognition` mic
  input (`src/services/voiceInputService.ts`, `VoiceChatMic.tsx`) must be made to
  work in the Android WebView.
- **Action:** after `setup:android`, patch `AndroidManifest.xml` for
  `RECORD_AUDIO` + `MODIFY_AUDIO_SETTINGS`, set `MainActivity` to grant WebView
  media permission (`onPermissionRequest` → grant audio), and confirm audio
  autoplay. Likely a new `android-patches/` mirroring `ios-patches/`. **This is
  the highest-risk item** — Android WebView speech recognition is unreliable; if
  it fails, fall back to a native speech plugin (e.g. `@capacitor-community/speech-recognition`).

### GAP 3 — WebView-parity QA (iOS WKWebView ≠ Android WebView)
Test ON AN ANDROID DEVICE before submitting — these behave differently:
1. **Web Speech mic** (`voiceInputService`) — the big one (see GAP 2).
2. **Streaming TTS** (`/api/tts` → MediaSource/progressive playback) — Android
   MediaSource codec support + autoplay-after-gesture.
3. **Stockfish WASM** worker (eval bar / analysis) — WASM + Web Worker in Android WebView.
4. **Dexie/IndexedDB** — persistence + storage quota (Android WebView can evict).
5. Safe areas / notch insets, back-button (Android hardware/gesture back → must
   not exit the app from a sub-route; wire `@capacitor/app` backButton handler).

### GAP 4 — Permissions + privacy declarations (store-blocking)
- **iOS** `Info.plist`: `NSMicrophoneUsageDescription` (voice input). Verify it's
  in the generated `ios/` (add to an ios-patch if `cap sync` doesn't include it).
- **Android** `AndroidManifest.xml`: `RECORD_AUDIO`, `INTERNET`.
- **App Store privacy "nutrition label"** + **Play "Data safety" form**: declare
  mic usage, local storage (Dexie), and any Supabase cloud sync + the
  DeepSeek/Anthropic/Polly/Lichess network calls. Need a hosted **privacy policy URL**.

### GAP 5 — Signing + store accounts (David-only, needs machines)
- iOS: Apple Developer account (have it — TestFlight), distribution cert +
  provisioning profile, App Store Connect listing.
- Android: Google Play Console account ($25 one-time), generate + SECURELY STORE
  a **release keystore** (losing it = can't update the app ever), Play app listing.

### GAP 6 — Store listing metadata (both)
- Name, subtitle, full description, keywords, category (Education/Games),
  age rating, screenshots (per device class), feature graphic (Play).
- Apple guideline **4.2** ("minimum functionality / just a website") — low risk
  here (offline data, Stockfish, real interactivity) but frame the listing around
  the native/offline value to be safe.

## What I (Claude) can do from the sandbox vs what needs David's machine
**I can:** write/maintain this doc; add `@capacitor/assets` + an `assets/`
scaffold + config; draft `android-patches/` (manifest perms + MainActivity media-
grant) mirroring `ios-patches/`; add the `@capacitor/app` back-button handler in
the web layer; audit the web stack for WebView-compat issues; write the privacy-
disclosure checklist. **I cannot (no SDKs/signing/devices here):** run
`cap add/sync`, build in Xcode/Android Studio, sign, test on device, or upload.

## Suggested order (doesn't block the masterclass content build)
1. **GAP 4 web-layer + GAP 3 #5 back-button** — small code, do now.
2. **GAP 1 assets** — needs source art from David; then mechanical.
3. **GAP 2 Android audio/mic patch** — draft `android-patches/`, David tests on device.
4. **GAP 3 device QA** — David, on an Android phone (the load-bearing step).
5. **GAP 5/6 accounts + listings + signing** — David, in parallel.

## Next-session pickup
Android is config-wired but never generated/tested. The first real action is
GAP 2 (Android audio/mic) — that's where a WebView wrapper most often "breaks,"
and it gates the voice features the app is built around.
