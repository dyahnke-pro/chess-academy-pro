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

## Progress (2026-06-01 — session `app-play-store-readiness`)
Code/config gaps that don't need David's machines/accounts are now DONE on
this branch:
- **GAP 1 (icons) — pipeline built + PWA icons fixed.** `@capacitor/assets`
  installed; `scripts/build-app-icon.mjs` generates the brand mark (gold/black
  knight + glow) into `assets/` (Capacitor source) AND `public/icons/`
  (PWA). The runtime PWA manifest (`vite.config.ts`) + `index.html` now point
  at real PNGs — **the old `/icons/icon-192.png` 404 is fixed.** `npm run
  assets:generate` runs the icon build + `capacitor-assets generate` (wired
  into `setup:ios`/`setup:android`). *Native sizes still need the native
  projects generated on David's machine; final glow art pending David's pick.*
- **GAP 3 #5 (Android back-button) — DONE.** `@capacitor/app` + `useAndroidBackButton`
  hook (mounted in `App.tsx`): steps up routes, minimizes (not exits) at root.
  No-op on web/iOS.
- **GAP 2 (Android audio/mic) — DRAFTED.** `android-patches/` mirrors
  `ios-patches/`: manifest perms fragment + `MainActivity.java` (WebView
  `onPermissionRequest` mic grant + RECORD_AUDIO runtime request).
  `scripts/apply-android-patches.mjs` merges them after `cap sync`. **Still
  needs real-device verification — highest-risk item.**
- **GAP 4 (privacy policy) — DONE (web layer).** `/privacy` standalone route
  (`PrivacyPolicyPage`) renders chrome-free, so the prod URL
  `https://chess-academy-pro.vercel.app/privacy` is the hosted policy URL both
  stores require. Still need to fill the App Store privacy "nutrition label" +
  Play "Data safety" forms (content drafted in §Store listing below).

Remaining = David-gated (accounts, signing, devices, art lock) — see GAP 5/6
and the §David's checklist at the bottom.

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

## Store listing — drafts (fill the forms with these)

**App name:** Chess Academy Pro
**Subtitle (iOS, ≤30 chars):** Your AI chess coach
**Short description (Play, ≤80):** AI chess coach that learns from your games — talk to it, train with it.
**Category:** Education (primary), Games / Board (secondary)
**Age rating:** 4+ / Everyone (no objectionable content; has a kids section).
**Keywords (iOS):** chess,coach,training,openings,puzzles,tactics,endgame,AI,learn,improve
**Privacy policy URL:** https://chess-academy-pro.vercel.app/privacy
**Support URL:** (David — a simple page or the mailto works for v1)

**Full description (both stores):**
> Chess Academy Pro is an AI-powered chess coach that actually watches your
> games. Import your Chess.com or Lichess history and it analyzes every move
> with a real engine, then coaches you in plain language — ask it "why did I
> lose that endgame?" and it answers from games you've actually played.
>
> • Talk to your coach by voice or text — it explains ideas, not just moves
> • Opening masterclasses built from real master and pro games, taught
>   move-by-move with arrows and narration
> • Puzzles pulled from your own blunders, with spaced repetition so they stick
> • Adaptive difficulty — play against a coach tuned to your level
> • A friendly kids section for young learners
> • Works offline — your training data stays on your device
>
> No account required. Free to start.
>
> Pro players featured in the app are not affiliated with, and do not endorse,
> Chess Academy Pro. Lessons are derived from publicly available games and the
> established, general understanding of these openings.

**App Review notes (App Store Connect → "Notes for Reviewer"; Play → "App access / notes"):**
> No account or login is required — open the app and all features are available
> immediately (no demo credentials needed). Voice chat uses the microphone for
> speech-to-text only; audio is not stored or shared.
>
> Some opening lessons and repertoires reference named chess professionals
> (e.g. Magnus Carlsen, Hikaru Nakamura, Daniel Naroditsky, Levy Rozman). These
> names are used **nominatively and factually** — to identify whose publicly
> available games a lesson's move data is drawn from. The app does **not** claim
> any affiliation with, sponsorship by, or endorsement from these players, and a
> non-endorsement disclaimer is shown in-app on every player-attributed surface
> and under Settings → About. No player likeness, photo, logo, or copyrighted
> instructional content is used — only factual move data from public games plus
> the app's own original narration.

**Data declarations (App Store privacy label + Play Data safety):**
- **Data collected/linked to you:** none required (no account for core use).
- **Data used, not linked:** product analytics tied to an anonymous device ID
  (app functionality + analytics).
- **Microphone:** used for voice chat; audio processed for speech-to-text,
  **not stored, not shared.** Declare "Audio data → App functionality, not
  collected/stored."
- **Network:** chess positions/prompts → AI providers (DeepSeek/Anthropic);
  text → AWS Polly (TTS); public username → Lichess/Chess.com on import. These
  are processing-only, not sold.
- **Optional:** cloud sync (Supabase) stores training data only when the user
  opts in.

## David's checklist (the machine/account/device steps I can't do)

**Icon:** pick a glow option (session sent variants); I lock it into
`assets/` + regenerate. Then on your Mac, `npm run setup:ios` /
`setup:android` runs `capacitor-assets generate` to emit native sizes.

**iOS (App Store):**
1. `npm run setup:ios` on the Mac (regenerates `ios/`, applies AppDelegate
   patch + icons). Confirm `Info.plist` has `NSMicrophoneUsageDescription`
   (e.g. "Used for voice chat with your coach") + `ITSAppUsesNonExemptEncryption=false`.
2. Xcode: distribution signing (cert + provisioning profile under your Apple
   Developer account).
3. App Store Connect: create the listing, upload screenshots (6.7" + 6.1" +
   iPad if supported), paste metadata above, fill privacy label, submit.

**Android (Play Store):**
1. Google Play Console account ($25 one-time) if not already.
2. `npm run setup:android` on the machine (generates `android/`, applies
   patches + icons).
3. **Generate a release keystore and BACK IT UP SECURELY** — losing it means
   you can never update the app again. (Or use Play App Signing and keep the
   upload key safe.)
4. Build a signed AAB (`./gradlew bundleRelease` or Android Studio).
5. **Test on a real Android phone FIRST** (GAP 3 checklist in
   `android-patches/README.md`) — especially the WebView mic. This is the
   load-bearing step; the Android shell has never run on a device.
6. Play Console: create the listing, feature graphic (1024×500), screenshots,
   metadata above, Data safety form, submit to a closed/internal track first.

## Next-session pickup
Web-layer gaps (icons pipeline, back-button, privacy, android-patches draft)
are DONE on this branch. The next real action is David-gated: lock the icon
glow, then GAP 2 device verification (Android WebView mic) — that's where a
WebView wrapper most often breaks, and it gates the voice features. Until an
Android phone confirms voice works, treat Android as unverified.
