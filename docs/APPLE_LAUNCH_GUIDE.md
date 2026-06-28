# Apple App Store Launch Guide — Chess Academy Pro

**For David. You've never shipped an app before — this holds your hand
through every click.** Do the steps in order. Anything marked **[CLAUDE
DONE]** is already finished in the code; you don't touch it. Anything
marked **[YOU]** is a thing only you can do (it needs your Apple login,
your bank, or a legal signature).

Your app's fixed facts (you'll need these a lot):

| Thing | Value |
|---|---|
| App name | Chess Academy Pro |
| Bundle ID | `com.chessacademy.pro` |
| Apple Team ID | `7KATVL9274` |
| Price | $7.99 / month (auto-renewable) |
| Free trial | 7 days |
| RevenueCat entitlement id | `pro` |
| Privacy Policy URL | `https://chess-academy-pro.vercel.app/privacy` |
| Terms URL | `https://chess-academy-pro.vercel.app/terms` |
| Support URL | `https://chess-academy-pro.vercel.app/support` |
| Support email | dyahnke@gmail.com |

> The Privacy / Terms / Support pages are **[CLAUDE DONE]** — live at
> those URLs once this branch deploys. Open each in a browser to confirm
> before you paste them into App Store Connect.

---

## The big picture (what "done" looks like)

You're selling a **subscription**, so even though the app is free to
download, Apple treats you as a seller. That means three tracks have to
all be green before you can submit:

1. **Legal/banking** — sign Apple's Paid Apps Agreement + enter your bank
   and tax info. (Apple won't show your subscription to users until this
   is done.)
2. **The subscription product** — created in App Store Connect *and*
   wired to RevenueCat, with the 7-day trial.
3. **The app listing** — screenshots, description, privacy answers, age
   rating — then submit for review.

Realistic timeline: **a few days.** The long poles are the banking
agreement (instant-to-hours once you fill it) and Apple's review
(usually 24-48h). No multi-week wait like Google.

---

## STEP 1 — Apple Developer account [YOU] (probably already done)

You already have TestFlight working, so your **Apple Developer Program**
membership ($99/yr) is active. If you can log into
<https://appstoreconnect.apple.com> and see the app, skip to Step 2.

---

## STEP 2 — Sign the Paid Applications Agreement [YOU] 🔑 (this is the #1 thing people forget)

Without this, your subscription literally cannot be sold — the product
will sit in "Missing Metadata"/"Developer Action Needed" forever.

1. Go to <https://appstoreconnect.apple.com> → **Business** (or
   **Agreements, Tax, and Banking**).
2. Find **Paid Applications** in the agreements list. Status will say
   "New" or "Pending."
3. Click **View and Agree to Terms**. Accept.
4. **Set up Banking:** add a bank account for payouts.
5. **Set up Tax:** fill the U.S. tax forms (W-9 for a U.S. person/sole
   proprietor). Other regions' tax forms are optional — you can fill just
   the U.S. one to start.
6. Wait until the Paid Applications agreement shows **Active** (usually
   minutes to a few hours). **Do not proceed to Step 5 until it's
   Active.**

---

## STEP 2.5 — Enroll in the Apple Small Business Program [YOU] 💰 (do this — it's free money)

Apple takes **30%** of every subscription by default. The **Small Business
Program** drops that to **15%** for anyone earning under $1M/year — which is
you. On a $7.99 sub that's ~$1.20 more per subscriber per month, straight to
your pocket. It takes 5 minutes.

1. You must have **agreed to the Paid Applications Agreement first** (Step 2).
2. Go to <https://appstoreconnect.apple.com> → **Business** (Agreements, Tax,
   and Banking) — or search "Small Business Program" in App Store Connect.
3. Open **App Store Small Business Program** → **Enroll**.
4. Confirm your eligibility (under $1M proceeds) and submit. Approval is
   typically quick; the 15% rate applies going forward once enrolled.

> Do this before you have any revenue — there's no downside, and you don't want
> to be paying 30% on your first subscribers because you forgot.

---

## STEP 3 — Create a RevenueCat account + project [YOU + CLAUDE wired the code]

The app's purchase code is **[CLAUDE DONE]** (`src/services/billingService.ts`)
— it just needs your RevenueCat keys and a product configured. RevenueCat
is the middleman that makes "is this user subscribed?" one simple check.

1. Sign up at <https://app.revenuecat.com> (free tier covers you well past
   launch).
2. **Create a Project** → name it "Chess Academy Pro".
3. Add an **App** inside the project → platform **App Store** → bundle ID
   `com.chessacademy.pro`.
   - It will ask for an **App Store Connect App-Specific Shared Secret** —
     you generate that in App Store Connect after Step 5 (come back and
     paste it). For now you can continue.
4. **Get your iOS public SDK key:** Project Settings → **API Keys** →
   copy the **Apple / App Store** *public* key (starts with `appl_`). You'll
   paste this into your build env in Step 8. (This key is safe to ship in
   the app.)

> Leave RevenueCat open — you'll finish the Entitlement + Offering in
> Step 6 after the product exists.

---

## STEP 4 — Create the App record in App Store Connect [YOU] (if it doesn't exist)

If `com.chessacademy.pro` already shows under **Apps**, skip this.

1. App Store Connect → **Apps** → **+** → **New App**.
2. Platform: **iOS**. Name: **Chess Academy Pro**. Primary language:
   **English (U.S.)**. Bundle ID: select `com.chessacademy.pro`. SKU: any
   unique string, e.g. `chessacademypro001`. Full access.
3. Create.

---

## STEP 5 — Create the subscription product [YOU]

1. Open the app → sidebar **Monetization → Subscriptions** (or
   "In-App Purchases → Subscriptions").
2. **Create a Subscription Group** first → name it e.g. **"Chess Academy
   Pro"** (users can only have one active subscription per group — that's
   what you want).
3. Inside the group, **Create a Subscription**:
   - **Reference Name:** `Pro Monthly` (internal only).
   - **Product ID:** `chess_academy_pro_monthly` ← **write this down
     exactly; you paste it into RevenueCat in Step 6.**
   - **Duration:** 1 Month.
   - **Price:** $7.99 (pick the USD tier; Apple auto-fills other
     currencies).
4. **Add the 7-day free trial:** in the subscription, go to
   **Subscription Prices → Introductory Offers → +** → Type: **Free**,
   Duration: **1 week**, Eligibility: **New subscribers**.
5. **Localization (required or the product stays "Missing Metadata"):**
   add a display name **"Chess Academy Pro"** and a short description like
   *"Full access to the AI coach, masterclasses, and tactics."*
6. **Review screenshot:** Apple requires one screenshot of your paywall
   for the IAP review. Take a screenshot of the in-app paywall once the
   build with `VITE_PAYWALL_ENABLED=true` is on TestFlight (Step 8), and
   upload it here.
7. Generate the **App-Specific Shared Secret:** Subscriptions page (or
   App Information) → **App-Specific Shared Secret** → generate → copy →
   paste it into RevenueCat (Step 3.3).

---

## STEP 6 — Finish RevenueCat: Entitlement + Offering [YOU]

Back in RevenueCat:

1. **Entitlements** → **+ New** → Identifier exactly **`pro`** (the code
   checks this literal string — don't rename it).
2. **Products** → **+ New** → paste the App Store **Product ID**
   `chess_academy_pro_monthly`. Attach it to the **`pro`** entitlement.
3. **Offerings** → ensure there's an offering marked **current** (default
   id `default`) → add a **Package** (Monthly) pointing at the product.
   - The app reads the *current* offering's packages, so this must exist
     or the paywall shows "no plans available."

---

## STEP 7 — Privacy, age rating, and compliance answers [YOU — answers pre-written by CLAUDE]

Open **`docs/store-compliance-package.md`** — Claude pre-answered every
questionnaire from the actual code. In App Store Connect:

1. **App Privacy** (App Privacy section): click **Get Started** and answer
   using the "Apple App Privacy nutrition label" table in the compliance
   doc. Short version: you collect **anonymous usage/diagnostics** (not
   linked to identity, not used for tracking), and once billing is live,
   **Purchases**. You do **NOT** collect contacts, location, health, or
   audio.
2. **Age Rating:** answer the questionnaire → it lands at **9+**. The
   compliance doc explains why. **Do NOT enable the Kids Category** — the
   doc explains the COPPA trap if you do.
3. **Export Compliance:** when asked "does your app use encryption?" the
   answer is **standard encryption only → exempt**. (The code already sets
   `ITSAppUsesNonExemptEncryption=false`, so the build won't even ask each
   time.)
4. **Account deletion:** Apple asks if your app has account creation. It
   does **not** (no sign-up — sync is bring-your-own-Supabase). So the
   "offer in-app account deletion" requirement does **not** apply. The
   compliance doc states this.

---

## STEP 8 — Build the paid version to TestFlight [YOU push a button, CLAUDE wired the rest]

The app ships the paywall **dormant** by default (safe). To turn it on for
the build, two env vars must be present when CI builds:

- `VITE_PAYWALL_ENABLED=true`
- `VITE_REVENUECAT_IOS_KEY=appl_…` (your key from Step 3.4)

**Where to put them:** add both to the **Vercel project env (Production)**
AND to the **GitHub Actions secrets** the iOS build uses (the iOS workflow
bakes the web bundle). Then:

1. In GitHub → **Actions** → run the **"Daily deploy + TestFlight"**
   workflow (or the iOS TestFlight workflow) with `external=false`
   (internal only — installs on your phone in minutes, no review).
2. Install from TestFlight. **Confirm:** you should now see the paywall on
   a fresh install, with the price, the 7-day trial line, Restore
   Purchases, and working Terms/Privacy links.
3. Use a **Sandbox tester** (App Store Connect → Users and Access →
   Sandbox) to test the *purchase* without real money: sign out of the App
   Store on your phone, start the trial in the app, sign in with the
   sandbox account when prompted. Confirm the wall drops and the app
   unlocks.
4. **Take the paywall screenshot** here and upload it to the IAP review
   (Step 5.6).

> If you DON'T set these two env vars, the build is identical to today
> (no wall) — so nothing breaks if you build before you're ready.

---

## STEP 9 — App listing: screenshots + copy [screenshots = YOU or CLAUDE, copy = CLAUDE DONE]

1. **Copy:** open **`docs/store-listing-copy.md`** — the App Store name,
   subtitle, promotional text, description, and the 100-char keyword field
   are all written and length-checked. Paste them into the **App Store**
   tab.
2. **Screenshots (required):** you need 6.7" (iPhone 15/16 Pro Max) and
   6.5" sizes, plus iPad if you support it. Easiest: take them on your
   phone from the TestFlight build. (Claude can also auto-generate them
   with the browser — ask and I'll produce a set you upload.)
3. **Support URL:** `https://chess-academy-pro.vercel.app/support`
   **Marketing URL** (optional): your landing page.
4. **Privacy Policy URL:** `https://chess-academy-pro.vercel.app/privacy`

---

## STEP 10 — Submit for review [YOU]

1. In the app's **App Store** version page, scroll to **In-App Purchases**
   and **add the `Pro Monthly` subscription to the version** (a first-time
   subscription must be submitted *with* the app version — easy to miss).
2. Fill **App Review Information**: give Apple **demo instructions** —
   tell them the trial unlocks everything, and how to start it. Provide
   the sandbox tester note if useful.
3. Click **Add for Review → Submit**.
4. Apple reviews (usually 24-48h). If they reject, the reason is almost
   always one of: missing paywall disclosure (we have it), broken Restore
   (we have it), or the subscription not attached to the version (Step
   10.1). Fix and resubmit — resubmissions are fast.

---

## Cheat sheet — who does what

| Task | Owner |
|---|---|
| Purchase code, paywall UI, Restore, Terms/Privacy/Support pages, entitlement wiring | **[CLAUDE DONE]** |
| Listing copy + compliance answers (pre-written) | **[CLAUDE DONE]** |
| Sign Paid Apps Agreement + banking/tax | **[YOU]** |
| RevenueCat account + keys + entitlement `pro` + offering | **[YOU]** |
| Create subscription product + 7-day trial in ASC | **[YOU]** |
| Set the 2 env vars + run the build | **[YOU]** (one button) |
| Screenshots | **[YOU]** (or ask Claude) |
| Submit for review | **[YOU]** |

When you're ready to start, do Steps 1-2 first and tell me when the Paid
Apps Agreement is **Active** — I'll walk you through 3-6 live.
