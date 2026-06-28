# Play Store setup — click-by-click checklist (David)

Companion to `2026-06-28-google-play-submission.md`. Do these in order. Each
section is independent enough to pause/resume. ⏱ = waiting on Google.

---

## A. Register the Google Play developer account  ⏱ (START FIRST)

1. Go to **https://play.google.com/console/signup** — sign in with the Google
   account you want to OWN the app (use your main `dyahnke@gmail.com` or a
   dedicated one; whatever owns it is permanent).
2. Choose account type: **Personal** (an Individual account — fastest). If you'd
   rather ship under a company name you'd pick **Organization**, which needs a
   **D-U-N-S number** and takes longer — for a solo launch, **Personal**.
3. Pay the **$25 one-time** registration fee.
4. Fill the developer profile: legal name, address, contact email + phone.
5. **Identity verification** — Google will ask for a government ID (and for
   Personal accounts sometimes a selfie). Submit it. ⏱ **This is the long
   pole — verification can take a few hours to a few days.** You can't publish
   until it's "Verified".
6. Accept the Developer Distribution Agreement.

> ⚠️ **The 20-tester / 14-day rule.** Personal accounts created from late 2023
> on must run a **closed test with at least 20 testers for 14 continuous days**
> before Google grants access to **production**. So the realistic path is:
> internal testing (instant, just you) → closed testing (≥20 testers, 14-day
> clock) → apply for production. Start recruiting ~20 emails (friends, the
> TestFlight crowd) now so the clock starts the day the account verifies.

When the dashboard says **"Verified"**, move to B.

---

## B. Add the 4 Android signing secrets to GitHub  (do anytime — unblocks signed builds)

GitHub → your repo → **Settings → Secrets and variables → Actions →
New repository secret**. Add each (values are in the `android-signing-secrets.txt`
file I sent you):

| Name | Value |
|---|---|
| `ANDROID_KEYSTORE_PASSWORD` | (in the file) |
| `ANDROID_KEY_PASSWORD` | (same) |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ANDROID_KEYSTORE_B64` | (the long one-line base64) |

After this, re-run the **Android → Google Play** workflow (Actions tab →
"Android → Google Play" → Run workflow) and it produces a **signed** `.aab`
artifact you can download.

---

## C. Create the app in Play Console  (after A is Verified)

1. Console → **All apps → Create app**.
2. App name: **Chess Academy Pro** · Default language: **English (US)** ·
   App or game: **App** · Free or paid: **Free**.
3. Tick the declarations (developer program policies, US export laws).
4. **Create app.** You now have an app shell with a package slot — the package
   name `com.chessacademy.pro` is locked in when the first AAB is uploaded.

---

## D. Service account for API automation  (the "automate it" path)

This is the Google analog of the App Store Connect API key — it lets me push
AABs + listing updates from CI without you clicking.

1. Play Console → **Setup → API access**.
2. Click **"Create new service account"** → it links you to **Google Cloud
   Console**. (If you have no Cloud project, create one — name it anything,
   e.g. "chess-academy-play".)
3. In Cloud Console → **IAM & Admin → Service Accounts → Create service
   account**. Name: `play-publisher`. Skip the optional role grants. **Create
   and continue → Done.**
4. Click the new service account → **Keys → Add key → Create new key → JSON →
   Create.** A `.json` file downloads. **Keep it private.**
5. Back in Play Console → **Setup → API access** → click **Refresh**, find
   `play-publisher`, click **Manage Play Console permissions / Grant access**.
   Grant **Admin (or at least: Release to testing tracks + Edit store listing +
   Manage production releases)** for this app. **Invite/Save.**
6. Base64 that JSON and add it as a GitHub secret named
   `PLAY_SERVICE_ACCOUNT_JSON_B64`:
   - Mac terminal: `base64 -i ~/Downloads/play-publisher-*.json | pbcopy`
     then paste into the secret value. (Or just send me the JSON and I'll
     handle the base64 + tell you what to paste — your call.)

Once that secret exists, the **Android → Google Play** workflow with
**`upload: true`** pushes the AAB straight to the **internal** track, and
`fastlane android play_listing` pushes the store listing.

---

## E. RevenueCat → Google Play  (subscriptions)

The app already bills through RevenueCat for both stores — this just wires the
Google side. **No app code changes.**

1. **Create the two subscriptions in Play Console** → **Monetize →
   Subscriptions → Create subscription** (do this twice):
   - Product ID `chess_academy_pro_monthly` — add a base plan, **auto-renewing,
     P1M (monthly)**, price **$7.99**; add an **offer → free trial, 7 days**.
   - Product ID `chess_academy_pro_yearly` — base plan **auto-renewing, P1Y
     (yearly)**, price **$79.99**; **offer → free trial, 7 days**.
   - ⚠️ Use the **same product IDs** as your App Store products if you can — it
     keeps RevenueCat clean. (If the App Store IDs differ, that's fine,
     RevenueCat maps them per store.)
2. **RevenueCat dashboard** → your project → **Apps → + New → Google Play
   Store**:
   - Package: `com.chessacademy.pro`.
   - Upload the **same service-account JSON** from step D (RevenueCat needs it
     to read purchases). Grant it the "Financial data / View financial data"
     permission in Play Console if RC asks.
3. RevenueCat → **Products** → import/create the two Play products → attach both
   to your existing **`pro` entitlement** and your **default offering** (the
   same entitlement/offering iOS already uses).
4. RevenueCat → **API keys** → copy the **Google / Android public SDK key**
   (starts `goog_…`). Add it to the build env as **`VITE_REVENUECAT_ANDROID_KEY`**
   (set it where the other `VITE_*` keys live — Vercel env for web, and it bakes
   into the Android bundle via the build). Send it to me and I'll confirm it's
   wired and ship a build that reads it.

---

## F. First release + the console forms  (after C/D, account Verified)

1. **Build + upload:** Actions → **Android → Google Play** → Run workflow with
   `upload: true`, `track: internal`. (Or download the signed AAB artifact and
   upload by hand under **Testing → Internal testing → Create release**.)
2. **One-time content forms** (Console → Policy / Dashboard "Set up your app"):
   - **App access** — if any feature needs login, give a test login; otherwise
     "All functionality is available without restrictions."
   - **Ads** — **No** (app has no ads).
   - **Content rating** — fill the **IARC questionnaire** (it's a chess app:
     no violence/sex/etc → comes back Everyone/PEGI 3).
   - **Target audience & content** — choose your age groups (not directed at
     children → keeps it out of the Families program; pick 13+/18+ to match).
   - **Data safety** — mirror your iOS privacy answers: collected =
     gameplay/purchase data → **App functionality**; product interaction →
     **Analytics**; **no** data shared with third parties for tracking; data
     encrypted in transit.
   - **Government app** — No. **Financial features** — No (subscriptions ≠
     financial-services). **Health** — No.
   - **Privacy policy URL:** `https://chess-academy-pro.vercel.app/privacy`
3. **Store listing** — I push the text + graphics via
   `fastlane android play_listing` once the service account is live (or you
   upload them from `fastlane/metadata/android/` by hand).
4. Promote **internal → closed (≥20 testers, 14 days) → production**, then
   **Submit for review**.

---

## What I (Claude) do vs. what's yours
- **Mine (once D's service account secret exists):** build signed AABs, push to
  tracks, push the listing text + graphics, bump versions, re-run on changes.
- **Yours (account-gated, can't be automated):** account registration + ID
  verification, creating the app, creating the service account + Play
  subscriptions, the content-rating/data-safety questionnaires, recruiting the
  20 testers, and the final Submit.
- **Needs a real Android phone (either of us, but you have the device):** the
  runtime QA — voice mic in WebView, streaming TTS playback, Stockfish WASM,
  back-button/insets (`android-patches/README.md` checklist).
