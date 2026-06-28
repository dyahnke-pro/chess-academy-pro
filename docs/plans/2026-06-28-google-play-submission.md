# Google Play submission — Chess Academy Pro

**Status:** in progress (2026-06-28). iOS App Store submission is done (v2.8,
awaiting David's final Submit). This plan tracks the Android/Play path.

Package: `com.chessacademy.pro` · versionName `2.8` · versionCode `80` (parity
with the iOS build). Billing is RevenueCat — same `pro` entitlement fronts both
StoreKit and Google Play Billing, so **no app code changes** are needed for
Android; only config.

---

## Build validated ✅
`android-play.yml` ran GREEN on CI (2026-06-28, run 28334961943): web build →
`cap add android` → sync → patches → assets → `./gradlew bundleRelease` → AAB
produced + uploaded as the `app-release-aab` artifact. Built UNSIGNED (signing
secrets not added yet) — that's expected; it proves the pipeline compiles. Once
the 4 `ANDROID_*` secrets are in, the same workflow emits a SIGNED AAB.
> Still owed: on-device runtime QA (WebView mic, streaming TTS, Stockfish WASM,
> back-button, insets) per `android-patches/README.md` — needs a real phone.

## What's DONE in the repo (this session)

- **Android signing** wired in `android/app/build.gradle`: release builds sign
  from `android/keystore.properties` when present (CI writes it from secrets);
  absent the file, local/debug builds still work unsigned. `*.jks` /
  `keystore.properties` are gitignored — signing material lives ONLY in GitHub
  secrets.
- **Version** sourced from env (`APP_VERSION` / `ANDROID_VERSION_CODE`) with
  2.8 / 80 fallbacks, so a new upload bumps the code without a code edit.
- **Upload keystore generated** (RSA-2048, 10000-day). The 4 signing secrets
  must be added to GitHub (values handed to David in chat — NOT committed).
  - Upload cert SHA-256: `B6:B4:9F:69:77:DC:56:FF:E8:11:68:5B:AF:64:EF:62:69:73:24:A0:70:BA:2A:4F:E6:8C:3E:DF:8C:9D:54:34`
    (Play App Signing manages the real app key; this is the upload key.)
- **CI**: `.github/workflows/android-play.yml` builds a signed `.aab`
  (`./gradlew bundleRelease`), uploads it as an artifact, and — when
  `upload: true` + the service-account secret is present — pushes it to a Play
  track via fastlane `supply`.
- **fastlane Android lanes** in `fastlane/Fastfile`: `android play_beta`
  (binary → track) and `android play_listing` (text + graphics, no binary).
- **Play listing** in `fastlane/metadata/android/en-US/`:
  - `title.txt` (27/30), `short_description.txt` (75/80),
    `full_description.txt` (2.7k/4000), `changelogs/80.txt` (320/500).
  - `images/icon/icon.png` (512×512), `images/featureGraphic/featureGraphic.png`
    (1024×500), 8 `phoneScreenshots` (1398×2796, exactly 2:1 — padded from the
    approved iPhone 6.7 shots since Play caps aspect at 2:1), 4
    `tenInchScreenshots` (2064×2752).

---

## David's action items — ORDERED BY CRITICAL PATH

### 1. ⏳ Register the Google Play Console developer account — START NOW
The long pole. https://play.google.com/console — $25 one-time, then **identity
verification** (can take a few days for personal accounts). Everything below is
blocked until this clears.

> **Personal-account gotcha:** accounts created recently must run a **closed
> test with 20+ testers for 14 continuous days** before Google grants
> production access. If that applies, we go: internal testing → closed test (20
> testers, 14 days) → production. Plan for the two-week clock.

### 2. Add the 4 Android signing secrets to GitHub
Settings → Secrets and variables → Actions. Values are in the chat handoff:
`ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
`ANDROID_KEY_PASSWORD`. (Once added, the `android-play.yml` workflow can build a
signed AAB immediately — even before the account clears.)

### 3. Create the app in Play Console (one-time, manual)
`supply` cannot create the app. In the console: All apps → Create app → name
"Chess Academy Pro", language en-US, App, Free. Set package
`com.chessacademy.pro` on the first AAB upload.

### 4. Service account for API automation (the "automate it" path)
1. Play Console → Setup → API access → link/create a Google Cloud project.
2. In Cloud Console, create a service account; grant it access back in Play
   Console (Users & permissions) with Release + Edit-store-listing perms.
3. Create a JSON key for it; base64 it; add as GitHub secret
   `PLAY_SERVICE_ACCOUNT_JSON_B64`.
4. After that, `android-play.yml` with `upload: true` drives uploads, and
   `fastlane android play_listing` pushes the listing — same hands-off pattern
   as the App Store Connect API work.

### 5. RevenueCat → Google Play (subscriptions)
1. Play Console → Monetize → Subscriptions: create `chess_academy_pro_monthly`
   ($7.99) and `chess_academy_pro_yearly` ($79.99), each with a 7-day free-trial
   offer (mirror the App Store products).
2. RevenueCat dashboard → add a Google Play app for `com.chessacademy.pro`,
   upload the same service-account JSON, attach the two products to the existing
   `pro` entitlement + offering.
3. Set `VITE_REVENUECAT_ANDROID_KEY` (the `goog_…` public SDK key) in the build
   env so the Android bundle resolves entitlements. (Code already reads it —
   `src/services/billingService.ts`.)

### 6. First release flow
1. Run `android-play.yml` → download the `app-release-aab` artifact (or let
   `upload: true` push it to **internal testing**).
2. In Play Console, complete the one-time forms: **Content rating** (IARC
   questionnaire), **Data safety** (mirror the iOS privacy answers: gameplay/
   purchase data → app functionality; product interaction → analytics; no
   tracking), **Target audience & content**, **Ads** (none), **Government app**
   (no), **News app** (no).
3. Promote internal → closed (20 testers, 14 days if required) → production.

---

## Automation ready to use
- Build + (optional) upload: `android-play.yml` (workflow_dispatch; inputs:
  `track`, `release_status`, `upload`, `version_code`).
- Listing only: `fastlane android play_listing` (after the service account is
  wired).
- Binary to a track: `fastlane android play_beta`
  (`PLAY_TRACK`/`PLAY_RELEASE_STATUS` env).

## Secrets reference (GitHub Actions)
| Secret | Purpose |
|---|---|
| `ANDROID_KEYSTORE_B64` | base64 upload keystore (.jks) |
| `ANDROID_KEYSTORE_PASSWORD` | keystore store password |
| `ANDROID_KEY_ALIAS` | key alias (`upload`) |
| `ANDROID_KEY_PASSWORD` | key password |
| `PLAY_SERVICE_ACCOUNT_JSON_B64` | base64 Play Developer API service-account JSON |
