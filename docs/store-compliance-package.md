# Store Compliance Package — Chess Academy Pro

> Pre-filled answers for the App Store + Google Play submission questionnaires,
> grounded in the actual code. Where a field depends on the planned billing
> change (RevenueCat / StoreKit / Play Billing, $7.99/mo + 7-day trial), it is
> flagged **[BILLING-PENDING]** — answer it the listed way only once billing
> ships.
>
> Maintainer note: keep this in sync with `src/components/Legal/PrivacyPolicyPage.tsx`
> and the data-flow files cited below. Last reviewed: 2026-06-28.

---

## 0. Ground truth — what the app actually does with data

Evidence from the code, so every answer below is defensible to a reviewer.

| Flow | What leaves the device | Destination | Identity attached? | Evidence |
|---|---|---|---|---|
| **Product analytics** | Curated audit events (page views, lesson started/completed, coach question asked, LLM cost, voice/narration diagnostics, crashes) + truncated context/summary strings, narration text (≤2000 chars) | PostHog Cloud (US, `us.i.posthog.com`) | **Anonymous device id only.** `identifyUser` exists but is gated on a Supabase user id "wired in Phase 3" — not active. No name/email sent. Respects DNT + opt-out. No-op entirely without `VITE_POSTHOG_KEY`. | `src/services/analytics.ts:71-145` (event allowlist), `:156-168` (props — no PII), `:227-230` (DNT), `:298-305` (identify gated) |
| **AI coaching (LLM)** | Chess position (FEN/PGN), the user's typed/spoken question, derived context: weakness profile, opening repertoire, engine analysis, and the user's **first name if set in their local profile** | DeepSeek (primary) and/or Anthropic (fallback) via `/api/llm-proxy` | First name only if the user entered one locally. **No email, no account, no payment data.** | `src/services/coachApi.ts:1-3` (providers), `src/services/coachPrompts.ts:281` ("greeting by name if the profile is known"), `api/llm-proxy.ts` |
| **Text-to-speech (TTS)** | The **coach's text response** (outbound text only). Polly returns synthesized audio. | AWS Polly via `/api/tts` (Edge) | None. Origin-allowlisted, rate-limited. | `api/tts.ts:233-289` (sends `Text`, gets `AudioStream`), `:286` |
| **Voice input (microphone)** | On-device speech→text. **No raw audio is uploaded by the app.** iOS uses `SFSpeechRecognizer` via `@capacitor-community/speech-recognition`; web uses `webkitSpeechRecognition`. Only the resulting transcript text is then used (and may go to the LLM as the "question"). | Apple/OS speech engine (native); browser speech engine (web). The app never persists or transmits the audio. | None | `src/services/voiceInputService.ts:211-216, 380-435`, plist strings below |
| **Game import** | The user's **public** Lichess / Chess.com username | Lichess / Chess.com public APIs (via proxy) | Public username only | `api/lichess-explorer.ts`, `api/chesscom-games.ts`, PrivacyPolicyPage:78-83 |
| **Optional cloud sync (BYO-Supabase)** | The user's training data backup (games, puzzles, openings, SRS, progress) | A **Supabase project the user owns and configured themselves** — they paste their own URL + anon key + user id | The user's own infra; we operate no account system | `src/services/syncService.ts:86-111` (raw REST to user's URL with user's anon key — **no `supabase.auth`, no `createClient`, no app sign-up**), `SyncSettingsPanel.tsx:46-78` |
| **Local storage** | Everything by default: imported games + analysis, puzzle/SRS history, opening progress, profile prefs, current-session chat | On-device IndexedDB (Dexie). Sync creds stored **AES-256-GCM encrypted** at rest. | n/a (local) | `src/db/schema.ts`, `src/services/cryptoService.ts:1` (AES-256-GCM Web Crypto) |
| **Crash/diagnostics** | JS exceptions + content-defect events forwarded as PostHog `$exception` | PostHog Error Tracking | Anonymous | `src/services/analytics.ts:319-371, 431-465` |

**Key compliance facts that fall out of the code:**
- **No app-managed account system exists.** No sign-up, no login, no app-issued credentials. Sync is bring-your-own-Supabase (user supplies infra they already control). This is decisive for Apple 5.1.1(v) and Play's deletion field (§4).
- **Microphone audio never leaves the device via the app** — only transcribed text does, and only to power the coach question. TTS is the inverse (text out, audio back).
- **No advertising, no ad SDKs, no data brokers, no data "sold/shared for cross-app tracking."** Analytics is product analytics on an anonymous id.
- **Kids mode** (`/kid/*`) runs the LLM under a restricted safety prompt, no SAN/PII requested, Ruth default voice, no ads. But it is **not isolated from PostHog analytics** — the app-wide anonymous analytics still runs under kid surfaces. This is the single most important fact for the age-rating decision (§3).
- **No first-party encryption beyond HTTPS/TLS + Web Crypto AES-256-GCM** for the locally-stored sync credentials. Qualifies for the standard export-compliance exemption (§6).

---

## 1. Apple — App Privacy "Nutrition Label"

Fill this in App Store Connect → App Privacy. For each data type, answer
**Collected? / Linked to identity? / Used for tracking?** "Tracking" in
Apple's sense = linking with third-party data for ads, or sharing with a data
broker. **We do none of that → "Used for Tracking" is NO across the board.**

| Apple data type | Collected? | Linked to user? | Tracking? | Purpose / notes |
|---|---|---|---|---|
| **Contact Info** (name, email, phone, address) | **No** | — | No | No account, no email collected. First name *if entered* stays local + is only sent to the LLM as conversational context — it is **not collected by us onto a server**, so it does not trigger this category. |
| **Health & Fitness** | No | — | No | — |
| **Financial Info** | **No** today. **[BILLING-PENDING]:** still **No** — RevenueCat/StoreKit/Play Billing handle the transaction; Apple/Google process payment, you never receive card data. | — | No | See **Purchases** row. |
| **Location** | No | — | No | No geolocation API used. |
| **Sensitive Info** | No | — | No | No race/religion/orientation/etc. |
| **Contacts** | No | — | No | No address-book access. |
| **User Content** — *Other User Content* (chat messages, voice transcript, gameplay/chess content sent to the coach) | **Yes** | **No** (anonymous) | No | Coach chat text + chess positions + transcribed voice are sent to DeepSeek/Anthropic (LLM) and coach text to AWS Polly **to provide the app functionality** (the coaching response / spoken audio). Not linked to identity; not used for tracking. Declare purpose: **App Functionality.** |
| **User Content** — *Audio Data* | **No** | — | No | The microphone is transcribed **on-device**; raw audio is never transmitted or stored by the app. Do **not** declare Audio Data as collected. (Plist usage strings still required — see §5.) |
| **Identifiers** — *User ID* | **No** | — | No | No account ⇒ no user id collected. (The PostHog distinct id is a device/anon id, declared under Diagnostics/Usage, not a User ID.) |
| **Identifiers** — *Device ID* | **Yes** (anonymous analytics id) | **No** | No | PostHog's anonymous distinct id, kept in a first-party cookie/localStorage by the library (`analytics.ts:30-34`). Purpose: **Analytics**. Not linked to identity, not for tracking. |
| **Purchases** | **No** today. **[BILLING-PENDING]: Yes** once subscription ships. | No | No | When the $7.99/mo + 7-day-trial subscription launches via RevenueCat/StoreKit, declare **Purchases — Collected, Not Linked, Not Tracking, Purpose: App Functionality** (subscription state). The *payment* itself is Apple's; you collect entitlement/transaction status. |
| **Usage Data** — *Product Interaction* | **Yes** | **No** | No | PostHog product events: page views, lesson/quiz/SRS funnel, coach question asked, feature usage (`analytics.ts:71-145`). Purpose: **Analytics** (+ **App Functionality** for crash-driven self-healing). |
| **Diagnostics** — *Crash Data / Performance* | **Yes** | **No** | No | JS crashes + content-defect events forwarded to PostHog Error Tracking (`analytics.ts:319-371`). Purpose: **App Functionality / Analytics**. |
| **Other Data** | No | — | No | — |

**Net Apple label:** *Data Not Linked to You* — Device ID, Product Interaction,
Crash/Diagnostics, Other User Content. **Used to Track You: nothing.**
**[BILLING-PENDING]** adds *Purchases* (still Not Linked, Not Tracking).

**Provide a privacy "choices" note:** the app exposes an analytics opt-out
(`setAnalyticsOptOut`, `analytics.ts:411`) and respects Do-Not-Track — mention
in the App Privacy "data not collected / user can disable" context if asked.

---

## 2. Google Play — Data Safety Form

Play Console → App content → Data safety. Two questions per type: **Collected?**
and **Shared?** ("Shared" = transferred to a third party; sending data to a
*service provider* that processes it on your behalf and only for you is
**not** "sharing" under Play's definition, but you must still disclose
**collection** and processing).

**Global answers:**
- **Is all data encrypted in transit?** → **Yes** (all endpoints HTTPS/TLS:
  `/api/tts`, `/api/llm-proxy`, PostHog, Lichess/Chess.com, the user's Supabase).
- **Do you provide a way to request data deletion?** → **Yes — via the app
  (clear local data) and by email** (`dyahnke@gmail.com`). See §4 for the URL.
- **Has your app been independently reviewed against a security standard?** →
  No (optional; leave unchecked).

| Play data type | Collected? | Shared? | Processed ephemerally? | Required (vs optional)? | Purpose |
|---|---|---|---|---|---|
| **App activity — Page views / taps / other in-app actions** | **Yes** | No | No (retained in PostHog) | Optional (user can opt out) | Analytics |
| **App activity — Other user-generated content** (coach chat text, chess positions, voice transcript text) | **Yes** | No* | **Yes** for the LLM/TTS round-trip (sent to generate a response, not retained by us) | Optional | App functionality (AI coaching, voice) |
| **App info & performance — Crash logs** | **Yes** | No | No | Optional | App functionality / analytics |
| **App info & performance — Diagnostics** | **Yes** | No | No | Optional | Analytics |
| **Device or other IDs** | **Yes** (anonymous analytics id) | No | No | Optional | Analytics |
| **Personal info** (name, email, user ids) | **No** | — | — | — | No account; first name stays local. |
| **Financial info** | **No** today. **[BILLING-PENDING]:** Play Billing handles payment — you do **not** collect financial info (purchase/entitlement state is managed by the billing SDK, not "financial info" in Play's sense). | — | — | — | — |
| **Location / Health / Contacts / Messages / Photos / Audio files / Files** | **No** | — | — | — | Mic audio is transcribed on-device; no audio file collected. |

\* *PostHog, DeepSeek, Anthropic, and AWS Polly are **service providers /
processors***. Under Play's rules, sending data to a processor that acts on
your behalf is disclosed as **collection/processing**, not as **sharing**.
Answer **"No" to Shared** for these, but **do** list each as a third party that
processes the data in your privacy policy (already done — PrivacyPolicyPage:67-89).
The user's own Supabase is the user's own infrastructure, not a third party you
share to.

**Note (no Android project yet):** there is no `AndroidManifest.xml` in the
repo — the Play build is forward-looking. When the Android target is added,
declare `RECORD_AUDIO` (mic) and ensure no `INTERNET`-adjacent ad SDKs creep
in. The Data Safety answers above hold regardless of platform.

---

## 3. Age Rating

### 3a. Recommendation (decision-ready)

**Rate it general audience. Do NOT enrol in Apple's Kids Category or Google's
"Designed for Families." Keep kid mode as an in-app feature.** This matches the
strong prior and the code supports it.

- **Apple:** target **9+**. (Justification below — the open-ended AI chat is the
  reason it isn't 4+.)
- **Google (IARC):** expect **Everyone** or **Everyone 10+**; answer the
  questionnaire honestly (no violence/sex/gambling/drugs; user-generated AI
  chat present) and accept the IARC-assigned rating.

### 3b. Why not 4+ / why 9+ on Apple

The deciding factor is the **open-ended AI coach chat** plus the fact that the
LLM is a third party (DeepSeek/Anthropic). Even with grounding guardrails, an
LLM free-text surface is "infrequent/mild" unrestricted web-ish content from
Apple's reviewer perspective and pushes off 4+. There is **no** violence, sexual
content, gambling, mature themes, or in-app web browser. **9+** is the honest,
defensible floor. (If a reviewer pushes back on the chat, 12+ is the fallback;
do not go to 17+ — nothing here warrants it.)

### 3c. Apple Age-Rating Questionnaire — concrete answers

| Apple question | Answer |
|---|---|
| Cartoon/Fantasy Violence | None |
| Realistic Violence / Prolonged Graphic Violence | None |
| Sexual Content / Nudity | None |
| Profanity / Crude Humor | None |
| Alcohol, Tobacco, Drugs | None |
| Simulated Gambling | None |
| Horror/Fear, Mature/Suggestive Themes | None |
| Medical/Treatment Info | None |
| Contests | None |
| **Unrestricted Web Access** | **No** (no in-app browser) |
| **User-Generated Content** | The app has an AI chat. There is no user-to-user UGC sharing/social feed, so the classic UGC moderation flags don't apply — but disclose the AI chat honestly in review notes. |
| Made for Kids (Kids Category) | **No** |

### 3d. The compliance burden you AVOID by staying general audience

Opting into **Apple Kids Category** or **Google Designed for Families** would
trigger requirements this codebase currently **violates**, so opting in is the
wrong call:

1. **Third-party analytics ban.** Apple Kids Category and Google DFF forbid
   sending personal data (incl. analytics identifiers) to third parties / using
   third-party analytics & ads without verifiable-parental-consent gating. The
   app runs **PostHog analytics app-wide, including under `/kid/*`**
   (`analytics.ts` mirrors audit events globally; kid surfaces are not excluded).
   To enter the kids program you'd have to **rip analytics out of kid mode** (or
   the whole app) and prove it.
2. **COPPA verifiable parental consent.** Kids programs assume under-13 as the
   primary audience and impose COPPA: no behavioral data collection without VPC,
   strict data-handling, a COPPA-specific privacy policy. The current
   anonymous-analytics + LLM-chat design isn't built for a VPC flow.
3. **Third-party AI/LLM surface scrutiny.** An open AI chat sending text to
   DeepSeek/Anthropic is exactly what kids programs are strictest about
   (external processing of children's content). You'd need contractual + consent
   machinery you don't have.
4. **No third-party ad SDKs** (you already comply — but the program audits for
   it continuously).

**Conclusion:** general-audience 9+ keeps kid mode as a *feature* under the
existing anonymous-analytics + safety-prompt model, with **none** of the COPPA /
no-third-party-analytics burden. The privacy policy already frames kid mode
correctly (PrivacyPolicyPage:101-109). If you ever want the marketing benefit of
the families program, that's a separate project (excise analytics from kid mode,
build a VPC gate) — not a checkbox.

---

## 4. Account Deletion

### Apple Guideline 5.1.1(v)

**Does not apply.** 5.1.1(v) requires an in-app account-deletion path **only for
apps that offer account creation.** This app offers **no account creation** —
confirmed in code: `syncService.ts` talks raw REST to the *user's own* Supabase
project with the *user's own* anon key (`:105-111`); there is **no
`supabase.auth`, no `createClient`, no sign-up/login, no app-issued
credential**. Optional BYO-Supabase sync is the user backing up to infrastructure
they already own and control.

**Action for App Review notes:** state plainly — *"The app has no account
system. All data is stored locally on-device and is deletable by clearing app
data. Optional cloud sync uses the user's own self-hosted Supabase instance,
which the user controls and can delete directly. Guideline 5.1.1(v) does not
apply."* You can still keep/strengthen the in-settings "clear all local data"
control as a courtesy.

### Google Play "data deletion" field

Play's Data Safety asks for a **deletion mechanism**, and (for apps with
accounts) a **deletion URL**. With no accounts:
- **In-app deletion:** Yes — clear local data from app settings / device.
- **URL field:** point it at the **privacy policy's deletion section**, which
  already documents the email request path:
  `https://chess-academy-pro.vercel.app/privacy` (or the final marketing domain
  + `/privacy`). The policy states synced copies can be deleted by contacting
  `dyahnke@gmail.com` (PrivacyPolicyPage:91-99). That satisfies the field.
- Optionally add a dedicated `/data-deletion` route later that just anchors the
  same instructions; not required for launch.

---

## 5. Required URLs / Fields Checklist

| Field | Value / status | Notes |
|---|---|---|
| **Privacy Policy URL** | `https://<prod-domain>/privacy` — **route exists** (`src/App.tsx:314`, standalone no-chrome page). | Today: `https://chess-academy-pro.vercel.app/privacy`. Swap to the final marketing domain when set. Required by BOTH stores. |
| **Support URL** | **TODO** — needs a reachable page or a `mailto:`. | Minimum viable: a simple `/support` page or reuse `mailto:dyahnke@gmail.com`. Apple requires a Support URL; Play requires support contact (email is acceptable for Play). |
| **Marketing URL** | Optional. | Can omit or point at a landing page. |
| **ToS / EULA** | **TODO (recommended, [BILLING-PENDING] effectively required).** | Apple defaults to the standard Apple EULA if none provided — fine for launch. **Once the subscription ships**, add an EULA + clear subscription terms (price, period, auto-renew, trial) per Apple 3.1.2 / Play subscription policy. Link it in-app near the paywall. |
| **App Privacy questionnaire** | Filled per §1. | App Store Connect. |
| **Data Safety form** | Filled per §2. | Play Console. |
| **Age rating** | §3 — Apple 9+, Google IARC Everyone/10+. | |
| **Export compliance** | §6 — exempt, already declared in CI. | |
| **Account deletion** | §4 — N/A (Apple) / privacy-URL (Play). | |
| **Copyright / contact** | `dyahnke@gmail.com`. | |

---

## 6. Export Compliance

**Answer: uses only standard/exempt encryption → exempt. Declare
`ITSAppUsesNonExemptEncryption = false`.**

The app's only cryptography is:
- **HTTPS/TLS** for all network calls (standard transport encryption — exempt).
- **Web Crypto AES-256-GCM** to encrypt the user's BYO-Supabase credentials at
  rest in IndexedDB (`src/services/cryptoService.ts:1`). This is a standard,
  widely-available algorithm used for local data protection — also within the
  exemption (no proprietary/non-standard crypto, not a primary-function
  encryption product).

This is **already wired**, so no new action is needed:
- `ios/App/ci_scripts/ci_post_clone.sh:79-80` sets
  `ITSAppUsesNonExemptEncryption = false` in Info.plist.
- `scripts/ci/distribute-testflight.mjs:83-84` PATCHes the build's
  `usesNonExemptEncryption: false` so TestFlight builds are immediately
  installable (no "Missing Compliance" stall).

When Apple asks the export-compliance questions on first submission, answer:
**"Does your app use encryption? Yes" → "Does it qualify for any of the
exemptions? Yes — only uses standard encryption (HTTPS) and standard algorithms
for local data."** No CCATS / self-classification report (year-end report)
needed at this scale. For Google Play, no separate export-compliance step is
required; the same exemption logic holds.

---

## 7. Pre-submission TODO (the only real gaps)

1. **Support URL** — stand up a `/support` page or use `mailto:dyahnke@gmail.com`
   (Apple requires it). *(blocking for Apple)*
2. **Final domain** — if moving off `chess-academy-pro.vercel.app`, update the
   privacy-policy URL everywhere (store fields + Play deletion URL).
3. **[BILLING-PENDING] when subscription ships:**
   - Add *Purchases* to the Apple label and confirm Play billing answers (§1, §2).
   - Add an EULA + subscription terms screen near the paywall (§5).
   - Add `paywall_viewed` / `checkout_started` / `purchase_completed` PostHog
     events (already anticipated in `analytics.ts:20-23`) — still anonymous,
     no new PII.
4. **(Optional, recommended) Kid-mode analytics carve-out** — if you ever want
   to keep the families-program door open, exclude `/kid/*` from PostHog. Not
   required for the general-audience launch, but it tightens the kid-mode
   privacy story and the PrivacyPolicyPage's "no third-party tracking in kid
   mode" claim (currently the app-wide anonymous analytics technically runs
   under kid surfaces — see §3d.1).

---

*Grounded against: `src/services/analytics.ts`, `src/services/coachApi.ts`,
`src/services/coachPrompts.ts`, `api/tts.ts`, `src/services/voiceInputService.ts`,
`src/services/syncService.ts`, `src/components/Settings/SyncSettingsPanel.tsx`,
`src/services/cryptoService.ts`, `src/components/Legal/PrivacyPolicyPage.tsx`,
`ios/App/ci_scripts/ci_post_clone.sh`, `scripts/ci/distribute-testflight.mjs`,
`src/App.tsx`. No code modified.*
