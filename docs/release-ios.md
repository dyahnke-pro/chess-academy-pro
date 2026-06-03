# Shipping to TestFlight — first-build runbook (Mac + Xcode)

A calm, click-by-click guide for the **first** TestFlight build of Chess
Academy Pro. You have a Mac, so we build straight through Xcode — no cloud
service needed. Nothing here touches your live web app or its users; the iOS
app is a separate channel, and every step is reversible.

Bundle ID: `com.chessacademy.pro` · App name: **Chess Academy Pro**

There are two slow, do-them-now items (steps 1 + 2) that run in the
background while you read the rest. Kick both off first.

---

## Step 1 — Enroll in the Apple Developer Program  *(slowest — start now)*

TestFlight requires the **paid** Apple Developer Program ($99/yr).

- Easiest with no fuss: on your **iPhone**, install the **"Apple Developer"**
  app (App Store) → sign in with your Apple ID → **Enroll**. It verifies your
  identity right on the phone.
- Or on the web: <https://developer.apple.com/programs/enroll/>.
- Individual enrollment usually approves in a **few hours to a day**. You'll
  get an email. Nothing below works until this is approved, so do it first.

## Step 2 — Install Xcode  *(big download — start now)*

- Mac App Store → search **Xcode** → Get (free, ~7 GB). Let it download while
  the Developer Program approves.
- After it installs, open it once and accept the license / let it install
  additional components.
- Sign Xcode into your Apple ID: **Xcode → Settings → Accounts → +** → Apple
  ID. (This is what lets Xcode sign + upload builds.)

---

## Step 3 — Create the app record in App Store Connect

*(Do this once the Developer Program is approved.)*

1. Go to <https://appstoreconnect.apple.com> → **My Apps** → **+** → **New App**.
2. Fill in:
   - **Platform:** iOS
   - **Name:** Chess Academy Pro
   - **Primary language:** English (U.S.)
   - **Bundle ID:** select `com.chessacademy.pro`
     *(if it's not in the list, create it first at
     <https://developer.apple.com/account/resources/identifiers/list> →
     **+** → App IDs → App → description "Chess Academy Pro", bundle ID
     `com.chessacademy.pro` → Register, then come back)*
   - **SKU:** anything unique, e.g. `chess-academy-pro`
   - **User access:** Full Access
3. Create. You don't need screenshots/description yet — that's only for the
   public App Store later, **not** for TestFlight.

---

## Step 4 — Build the web bundle with your keys

> **Prerequisite: Node 22+** — Capacitor 8's CLI requires NodeJS >= 22.0.0.
> Check with `node -v`; if it's older, install the **LTS** from
> <https://nodejs.org> (or `brew upgrade node` / `nvm install 22`) before
> running the steps below, or `cap add ios` will fatal out.

On your Mac, in the repo:

1. Create a `.env.local` (gitignored) with the **build-time** keys — mirror
   your Vercel Production values so the native app behaves like the web app:
   ```
   VITE_POSTHOG_KEY=phc_…              # the public phc_ key
   VITE_POSTHOG_HOST=https://chess-academy-pro.vercel.app/api/ph
   DEEPSEEK_KEY=…                      # so the coach works out of the box
   ANTHROPIC_KEY=…                     # fallback (optional)
   AUDIT_STREAM_SECRET=…               # so audit-stream works
   AUDIT_STREAM_URL=https://chess-academy-pro.vercel.app/api/audit-stream
   ```
   (Auth/payments keys get added here later when those features land.)
2. Build:
   ```bash
   npm install
   npm run build        # produces dist/ with the keys baked in
   ```

> Note: the native app bundles `dist/` and runs it locally, but its `/api/*`
> calls (TTS, lichess, audit-stream, the PostHog proxy) hit your Vercel
> deployment. The PostHog + audit-stream URLs above are already absolute, so
> they work from the app. If TTS/voice doesn't work on first install, that's
> the one thing to check — flag it to me and I'll point the API base at the
> absolute Vercel URL.

## Step 5 — Generate the iOS project

```bash
npm run setup:ios
```
This runs `cap add ios` + `cap sync ios`, copies the AVAudioSession patch
(`ios-patches/App/AppDelegate.swift`) in, and generates the app icons. It
creates the `ios/` folder (gitignored — regenerated any time).

---

## Step 6 — Open in Xcode + set signing

```bash
open ios/App/App.xcworkspace
```
**Open the `.xcworkspace`, not the `.xcodeproj`** (CocoaPods needs the
workspace).

In Xcode:
1. Left sidebar → click the blue **App** project → target **App** →
   **Signing & Capabilities** tab.
2. Check **Automatically manage signing**.
3. **Team:** pick your team (your name / the one from your Developer Program).
   Xcode will auto-create the signing certificate + provisioning profile.
   - If you see a red signing error, it's almost always "Team not selected" or
     "bundle ID taken" — re-pick the team; it self-heals.

## Step 7 — Archive

1. Top of Xcode, next to the Run button, set the device target to
   **Any iOS Device (arm64)** (NOT a simulator — simulators can't be
   archived for upload).
2. Menu: **Product → Archive**. This compiles a release build (~3-8 min).
3. When it finishes, the **Organizer** window opens with your archive.

## Step 8 — Upload to App Store Connect

1. In the Organizer, select the archive → **Distribute App**.
2. Choose **App Store Connect** → **Upload** → Next through the defaults
   (keep "Upload your app's symbols" checked) → **Upload**.
3. It validates + uploads (~2-5 min). On success you'll see "Upload complete."

## Step 9 — TestFlight

1. App Store Connect → your app → **TestFlight** tab. The build shows
   "Processing" for a few minutes (Apple is scanning it), then becomes ready.
2. First time only: Apple asks a few **Export Compliance** questions. The app
   uses standard HTTPS/encryption only → answer that it uses encryption but
   only **exempt** standard algorithms (no custom crypto). (If unsure, ask me.)
3. **Internal testing** (fastest, no Apple review): TestFlight → Internal
   Testing → add yourself (and up to 100 team testers). They get an email.
4. On the iPhone: install the **TestFlight** app (App Store) → accept the
   invite → install Chess Academy Pro → it runs like a real App Store app.

That's a shipped TestFlight build. 🎉

> **External testers** (people outside your team, up to 10,000) need a one-time
> lightweight Apple review of the first build (~a day) + a filled-in "What to
> test" + a beta description. Internal testers (you + team) skip all of that —
> use internal to validate first.

---

## Later: hands-off automated builds (optional)

`codemagic.yaml` in the repo root is a ready cloud-build pipeline (Codemagic).
Once you're comfortable with the manual flow, that lets you push a button on a
web dashboard (or auto-build on a tag) instead of opening Xcode each time —
and it's what we'd use for Android builds too. Not needed for the first build.

## When something looks scary

- A red signing error → 99% of the time it's the Team picker in step 6.
- "Invalid binary" email after upload → usually a missing icon or an Info.plist
  key; paste me the exact text and I'll tell you the one-line fix.
- Build processing stuck >30 min in TestFlight → occasionally Apple is slow;
  give it an hour. If still stuck, re-upload (step 7-8) with a bumped build
  number (Xcode → target → General → Build = increment the number).

Nothing here is destructive — worst case you delete a build in App Store
Connect and re-upload. You can't break production or lose anything.
