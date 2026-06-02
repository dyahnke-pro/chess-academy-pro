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

### Phase 2 — Entitlement scaffold + hard Paywall ⏳ next
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

## Next-session pickup
Phase 1 (PostHog) is on this branch. Next: Phase 2 (entitlement + hard paywall).
Keep everything no-op-without-keys; do NOT enable the live gate on `main` until
David approves the cutover (it locks every existing user out until they pay).
