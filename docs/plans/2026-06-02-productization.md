# Productization Plan — Auth, Payments, Analytics, Mobile Distribution

**Owner:** David · **Started:** 2026-06-02 · **Branch:** `claude/serene-newton-HOdmQ`
(draft PR; does NOT touch `main`/prod until David approves the cutover — half-built
auth/paywall must not reach beta testers).

> NOTE: the repo's top-level `PLAN.md` is owned by the active pro-rep content
> build. This productization effort lives here to avoid clobbering it.

## The pivot

Chess Academy Pro was built as a single-user local app. David is taking it to
market: real accounts, a **hard paywall (pay to use the whole app)**, product
analytics, and distribution on **both** iOS (TestFlight → App Store) and Android
(Google Play).

Most of this is pure code I can write now; the rest is **hard-blocked on accounts
only David can create** (see Provisioning Checklist). Everything degrades
gracefully — no keys = feature no-ops, today's app keeps working.

### Decisions (locked 2026-06-02)

| Question | Decision |
|---|---|
| Payments | **RevenueCat** — wraps Apple IAP (App Store requirement) + Google Play + Stripe(web) behind one `isPro` entitlement |
| Auth | **Supabase Auth** — reuses the existing Supabase project; email/pw + Apple + Google |
| Analytics | **PostHog Cloud US** — bridged from the existing `logAppAudit` event system |
| Mobile | **iOS + Android** — Capacitor 8 already in place (`setup:ios` / `setup:android` exist) |
| **Gating** | **HARD PAYWALL — pay to use everything (David 2026-06-02: "gate the whole app, pay to play/use all").** Not freemium. One entitlement gate after login. |

### Monetization model (reconciled from David's prior conversation)

Pulled together from `LAUNCH_PLAYBOOK.md` (David's marketing/pricing doc),
`docs/llm-usage-cap-audit.md` (cost control), and David's 2026-06-02 messages.

- **Price:** **$7.99/month** (`LAUNCH_PLAYBOOK.md`). Optional annual offering TBD.
- **Free 1-week trial** for every new user (David 2026-06-02) — RevenueCat
  introductory free-trial offer. Trial active ⇒ `isPro` true.
- **First ~50 users free / beta cohort free** (David 2026-06-02) — granted as a
  **RevenueCat promotional entitlement** (server/dashboard-granted, flows through
  the same `isPro` check; no payment). Mirrors the playbook's
  "Beta Tester — Locked for life" plan.
- **Lifetime price lock for beta signups** — anyone who subscribes during beta
  keeps $7.99/mo for life. App Store / Play grandfather existing subscribers when
  you raise the price later; RevenueCat preserves it. No app code needed beyond
  the offering config.
- **Hard wall after trial/grant expires:** not Pro ⇒ the Paywall is the only
  thing that renders (plus account / logout / restore-purchases). No per-feature
  gates to tune.

### ⚠️ Cost-control is a dependency of the paywall (don't ship the wall without it)

A flat $7.99/mo with **unlimited** LLM coach + Polly voice can lose money on a
heavy user — and a 1-week free trial is a wide-open door for token-burn abuse.
`docs/llm-usage-cap-audit.md` already specs the fix (not yet implemented): a
**per-user monthly $ cap + daily request cap** at one chokepoint in
`coachApi`/`coachCostService`, with a graceful "you've hit your cap" state. This
must land alongside (or before) the trial goes live. The PostHog `llm_call`
event added in Phase 1 is exactly the beta telemetry that doc asks for to set the
thresholds. Tracked as **Phase 4.5** below.

> Onboarding/calibration runs BEFORE the wall so the trial starts on a warmed app.

---

## 🔑 Provisioning Checklist — DAVID DOES THESE (I can't)

- [ ] **Apple Developer Program** — $99/yr (developer.apple.com).
- [ ] **App Store Connect** — app record for `com.chessacademy.pro`.
- [ ] **App Store Connect API key** (.p8 + Key ID + Issuer ID) → CI/fastlane. Add to GH Actions secrets.
- [ ] **Google Play Console** — $25 one-time. App for `com.chessacademy.pro`.
- [ ] **Google Play service-account JSON** → CI/fastlane. GH secret.
- [ ] **RevenueCat** — project + Apple/Play apps + `pro` entitlement + `$7.99/mo` offering **with a 1-week introductory free trial**. Public SDK keys (iOS / Android / Web).
  - [ ] Matching IAP products in App Store Connect + Play Console (price $7.99/mo, 7-day free trial).
  - [ ] (Web) connect Stripe in RevenueCat for browser checkout.
  - [ ] Set up a **promotional entitlement** for the first-~50/beta cohort (granted free, no payment).
- [ ] **PostHog Cloud US** — project + Project API key (`phc_…`).
- [ ] **Supabase** — `Project URL` + `anon` key. Enable Email + Apple + Google providers; set OAuth redirect URLs.
- [ ] **Legal** — privacy policy + terms URLs (both stores require them); account-deletion path (Apple requires it).

### Where the keys go
- **Client (build-time, baked):** `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_REVENUECAT_IOS_KEY`, `VITE_REVENUECAT_ANDROID_KEY`, `VITE_REVENUECAT_WEB_KEY` → Vercel env (Production) + `.env.local` dev.
- **CI secrets (GH Actions):** Apple API key, Play service account, iOS signing certs, Android keystore.

---

## Phased plan

### Phase 1 — PostHog analytics ✅ DONE (this branch)
- `src/services/analytics.ts` — PostHog wrapper; no-ops without `VITE_POSTHOG_KEY`. `init / identify / capture / reset` + an audit→PostHog bridge (curated allowlist of high-signal kinds, not the 200 forensic ones).
- Bridge hook in `appAuditor.logAppAudit` (one fire-and-forget line).
- Init at app boot in `App.tsx`. Opt-out respected via `analyticsOptOut` preference.
- Env vars added to `.env.example`. Tests: `analytics.test.ts`.

### Phase 1.5 — Crash detection (PostHog Error Tracking) ✅ DONE (on main)
- David 2026-06-02: "add the crash detection." The Sentry env slots
  (`VITE_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`) are EMPTY/unwired, so rather than
  stand up a second vendor we forward the app's existing crash audit-events
  (`uncaught-error`, `unhandled-rejection`, `error-boundary` — all already
  route through `logAppAudit`) into PostHog Error Tracking as `$exception`s,
  via the `mirrorAuditEvent` bridge in `analytics.ts` (`captureException`).
  No-op without the PostHog key. Live the moment the key's set (it is).
- Remaining (David's toggle): turn on **Session Replay** in the PostHog
  project settings to watch a crash repro; optionally wire Sentry later if a
  dedicated error-management tool is wanted (needs a real DSN).

> **STATUS UPDATE 2026-06-28 (branch `claude/focused-pascal-x5kqil`) — Apple-first
> launch push (David: "$7.99/mo + 1-week free trial; get it on Apple first").**
> Phases 2 + 4 landed, flag-gated and dormant:
> - **Phase 2 (Paywall UI + gate):** `src/components/Paywall/PaywallPage.tsx`
>   (Apple 3.1.2-compliant: price, 7-day trial terms, auto-renew disclosure,
>   Restore Purchases, Terms/Privacy links, loading/empty/error) +
>   `PaywallGate.tsx` wrapping `<AppLayout>` in `App.tsx`. Shows only when
>   `VITE_PAYWALL_ENABLED=true` AND `!isPro`.
> - **Phase 4 (RevenueCat):** `src/services/billingService.ts` — NATIVE-ONLY
>   (iOS/Android) for launch; web stays open/free (web-Stripe deferred). Feeds
>   `entitlementStore`. `initBilling` wired at boot in `App.tsx`. No-ops without
>   a platform key. Tests: `billingService.test.ts`.
> - **Legal/Support:** `/terms` (EULA w/ subscription terms) + `/support` routes
>   added alongside `/privacy`, mounted OUTSIDE the gate.
> - **Android project** generated (`cap add android` + patches; gitignored,
>   regen in CI). `@revenuecat/purchases-capacitor` added to package.json.
> - **Docs for David:** `docs/APPLE_LAUNCH_GUIDE.md` (click-by-click),
>   `docs/store-listing-copy.md` (verified copy), `docs/store-compliance-package.md`.
> - **Phase 3 (Supabase Auth) DEFERRED & likely UNNEEDED for v1:** RevenueCat
>   uses an anonymous app-user-id, so a paid launch needs no account system —
>   which also avoids Apple's account-deletion mandate. Restore Purchases covers
>   cross-device. Build auth later only if cloud accounts are wanted.
> - **REMAINING before the wall goes live:** David's console steps (Apple Paid
>   Apps Agreement + banking, RevenueCat keys, ASC subscription product) per the
>   guide; set `VITE_PAYWALL_ENABLED=true` + `VITE_REVENUECAT_IOS_KEY`; on-device
>   sandbox purchase QA; and **Phase 4.5 cost caps** (below) before the trial
>   opens to real users.

### Phase 2 — Entitlement scaffold + hard Paywall ✅ DONE (this branch, flag-gated)
- `src/stores/entitlementStore.ts` (Zustand) — `isPro`, `status`, `source`. Single source of truth.
- `src/hooks/useEntitlement.ts`.
- `src/components/Paywall/` — full-screen Paywall (loading/empty/error states). Wraps the app: not Pro → Paywall renders instead of routes (except account/auth/restore).
- `AppGate` wrapper in App.tsx: `signed-out → Auth`, `signed-in & !pro → Paywall`, `pro → app`.
- Dexie: cache last-known entitlement on profile (version bump + upgrade fn) so a cold offline launch for a paying user isn't locked out.
- Tests.

### Phase 3 — Supabase Auth ⏳
- `@supabase/supabase-js`; `src/services/authService.ts` (email/pw, Apple, Google) — no-ops without keys (app stays local/today's behavior, gate disabled).
- `src/stores/authStore.ts`; `src/components/Auth/` (Login/Signup/forgot/account) with loading/empty/error.
- Link Supabase user id → RevenueCat app user id.
- RLS migrations under `supabase/migrations/`.
- `/account` route (router.tsx + nav). Retroactive: existing local profiles keep working until the gate is enabled; signing in links them.
- Tests.

### Phase 4 — RevenueCat payments ⏳
- `@revenuecat/purchases-capacitor` (native) + `@revenuecat/purchases-js` (web). Capacitor platform-detect.
- `src/services/billingService.ts` — `getOfferings / purchase / restore / entitlementStatus` → feeds `entitlementStore`. Surfaces the 1-week trial + $7.99/mo offering; honors promotional (beta-grant) entitlements identically.
- Paywall → purchase; restore button in account.
- Identify RevenueCat with Supabase user id. Tests (mock SDK).

### Phase 4.5 — Per-user LLM/voice cost caps ⏳ (paywall dependency)
- Implement the chokepoint from `docs/llm-usage-cap-audit.md`: per-user monthly
  $ cap + daily request cap in `coachApi`/`coachCostService`, with a graceful
  "cap reached" state. Protects margin on the flat $7.99 plan and stops trial
  token-burn abuse. Use the Phase-1 PostHog `llm_call` telemetry to set thresholds.
- MUST land before the 1-week trial goes live to real users.

### Phase 5 — iOS TestFlight pipeline ⏳
- `fastlane/Fastfile` lane `beta` (build→sign→upload TestFlight); keeps `ios-patches/AppDelegate.swift` sync.
- `.github/workflows/ios-testflight.yml` (manual dispatch, macOS runner, App Store Connect API key).
- `docs/release-ios.md`.

### Phase 6 — Android / Google Play ⏳
- Verify `npm run setup:android` builds; `scripts/apply-android-patches.mjs` audio/permission parity.
- fastlane Android lane `playbeta` (AAB→internal track). `.github/workflows/android-play.yml`.
- `docs/release-android.md`. Android QA: back button, audio session, native parity.

### Phase 7 — Production hardening / legal ⏳
- Privacy policy + terms; account deletion. Store listings (David authors copy).
- G1 3-instrument post-deploy audits for auth + paywall surfaces.

## Sequencing logic
PostHog first (self-contained, instrument before the wall). Entitlement scaffold
next (auth + payments both depend on it). Auth before payments (RevenueCat keys
off the auth user id). iOS/Android pipelines last (most account-blocked, don't
affect the running app).

## Decisions log
- 2026-06-02 — RevenueCat / Supabase Auth / PostHog US / iOS+Android. (David)
- 2026-06-02 — **Hard paywall, pay-to-use-all** (not freemium). (David)
- 2026-06-02 — **$7.99/mo + 1-week free trial + first-~50/beta free + lifetime
  price-lock for beta signups.** Reconciled from `LAUNCH_PLAYBOOK.md` + David's
  messages. (David)
- 2026-06-02 — Cost caps (`llm-usage-cap-audit.md`) are a PAYWALL DEPENDENCY,
  not optional — flat price + unlimited AI + free trial = margin/abuse risk.
- 2026-06-02 — **First-run flow: Login → auto-start 7-day trial → full app →
  trial ends → paywall pops.** Trial starts automatically on signup (lowest
  friction); the wall only appears at trial expiry. (David)
- 2026-06-02 — **Beta cohort = RevenueCat promotional entitlements** (granted from
  the RC dashboard; flows through the same `isPro` check, no app code). The
  trial→paywall flow is the primary path for everyone else. (David)
- 2026-06-02 — Vercel "Ignored Build Step" (build only `main`) is WORKING — the
  PR #708 preview deploy was skipped/ignored, so branch+PR work does NOT burn the
  Vercel build cap. Branch-based productization work is safe on that front.
- 2026-06-02 — Stays on a branch + draft PR, NOT straight to `main`: half-built
  auth/paywall must not reach beta testers' production app. Overrides the usual
  push-to-main default for this multi-phase feature. Confirm cutover with David.
- 2026-07-26 — **Revenue funnel wired** (`billingAnalytics.ts`): checkout /
  trial / purchase / failed / cancelled / restore + free-tier pressure events +
  paid-vs-free person properties, all no-op-without-key. Fixed the root gap —
  `billing-*` audit kinds were never mirrored to PostHog. Remaining: the
  RevenueCat→PostHog server integration (dashboard toggle, David) for
  renewal/refund/churn visibility. (David: "wire in.")

## PostHog event catalog — revenue + upgrade funnel (added 2026-07-26)

The money funnel was invisible: `billingService` audited purchases via
`logAppAudit`, but the `billing-*` kinds were never on the PostHog mirror
allowlist, so PostHog showed 0 sales while App Store Connect showed real
proceeds. Fixed by firing the funnel DIRECTLY (so events carry numeric revenue +
person properties the audit-mirror can't). Single source of truth for names +
payloads: `src/services/billingAnalytics.ts` (`BILLING_EVENT`).

**Money events** (native-only — iOS/Android; web is `unconfigured`/free):

| Event | Fired from | Key properties |
|---|---|---|
| `checkout_started` | `PaywallPage.handleSubscribe` | `package_id`, `price`, `currency`, `is_annual`, `period`, `walled_feature?` |
| `plan_selected` | `PaywallPage` plan button | `package_id`, `is_annual`, `period` |
| `paywall_dismissed` | `PaywallPage` back-to-free link | `walled_feature?` |
| `trial_started` | `billingService.purchasePackage` (period TRIAL/INTRO) | `package_id`, `price`, `period`, `period_type` |
| `purchase_completed` | `billingService.purchasePackage` (period NORMAL) | …+ `revenue`, `$revenue` |
| `purchase_failed` | `purchasePackage` catch (non-cancel) | `package_id`, `error_message` |
| `purchase_cancelled` | `purchasePackage` catch (userCancelled) | `package_id` |
| `restore_completed` / `restore_failed` | `restorePurchases` | `became_pro` / `error_message` |

**Upgrade-pressure events** (fire wherever the soft gate is live):

| Event | Fired from | Key properties |
|---|---|---|
| `free_puzzle_limit_reached` | `usePuzzleMeter.consume` (spend that empties the bucket) | — |
| `free_opening_claimed` | `OpeningDetailPage` first deep dive | `opening_id` |
| `second_opening_walled` | `OpeningDetailPage` deep dive into a 2nd opening | `attempted_opening_id`, `claimed_opening_id` |

(The kid-window expiry is intentionally NOT a distinct event — `paywall_viewed`
already carries `feature: 'kid'` at the route wall. Kept off to respect the
event budget after the 2026-06-11 edge-request incident.)

**Person properties** (`$set` via `billingAnalytics.syncSubscriptionPerson`, on
every entitlement resolve — boot/renewal/purchase — plus `App.tsx` boot):
`is_pro`, `subscription_status` (trial/subscription/promo/free), `plan`
(annual/monthly), `subscription_expires_at`, `first_seen_at` (`$set_once`),
`last_seen_at`. These let EVERY engagement metric be broken down by paid-vs-free
and give clean retention cohorts.

### RevenueCat → PostHog server integration (DAVID DOES THIS — dashboard toggle)

Client events miss everything that happens while the app is CLOSED: renewals,
cancellations, refunds, billing-issue churn, trial-expiry-without-conversion.
Those are the churn/LTV signals — and only RevenueCat's server-side integration
can send them. Setup (RevenueCat dashboard → Integrations → PostHog):
1. Paste the PostHog **project API key** (`phc_…`) + host `https://us.i.posthog.com`.
2. Enable the events: initial purchase, trial start, trial conversion, renewal,
   cancellation, uncancellation, billing issue, refund, expiration.
3. Set the integration's user-id to RevenueCat's app-user id — it MATCHES the id
   `App.tsx` already `identify()`s with (`getStableAnalyticsId`), so server-side
   subscription events attach to the SAME PostHog person as the client usage
   events. Payment ↔ usage links for free.

Without this, PostHog sees first purchases but never renewals/refunds/churn.

## Next-session pickup
Phase 1 (PostHog) is on this branch. Next: Phase 2 (entitlement + hard paywall).
Keep everything no-op-without-keys; do NOT enable the live gate on `main` until
David approves the cutover (it locks every existing user out until they pay).

Revenue funnel instrumentation landed 2026-07-26 (`billingAnalytics.ts`) — the
one remaining piece is the RevenueCat→PostHog dashboard toggle above (David).
