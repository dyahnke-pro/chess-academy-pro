# Referral + review rewards — free opening credits (David 2026-09-06)

## Intent
Give a free opening class to:
1. A user who **recruits a new user** (referral), AND the new user too ("give one, get one").
2. A user who taps through the **happy-path review prompt** ("Enjoying the app?" → Yes → App Store sheet).

## Hard constraints / decisions (David 2026-09-06)
- **No login, only anonymous `device_id`.** A referral CANNOT be confirmed from
  the recruiter's word — it's confirmed from the NEW user's own app usage.
  → a referral **code** lands on the new user's device; the reward for BOTH
  qualifies only after the new user does something real.
- **Qualify bar = real use, not install.** Reward unlocks after the new user
  reaches their first genuine win (first lesson mastered / game reviewed —
  reuses the existing `recordPositiveMoment` win sites). "DL is not enough."
- **We get the usage data for free** — the qualify signal IS "what the new
  user did", flows to PostHog like everything else.
- **Apple reviews are anonymous — the app cannot read the star count** (no
  StoreKit callback; sheet is rate-limited ~3/yr). So we reward the *happy-path
  tap-through*, not a confirmed 5-star. Downside accepted (rewards intent).
- Reward has real value only on **native** (App Store, paywall live). Web is
  permanently unlocked, so credits are a harmless no-op there. Build is
  platform-agnostic; value lands on native.

## Entitlement model
Today: `FreeTierRecord.freeOpeningId: string|null` — ONE free masterclass pick,
gated in-page via `canViewOpening` (accessPolicy leaves /openings browsable;
the real gate is the first WLPP deep-dive tap in OpeningDetailPage).

Change (additive, back-compat, no Dexie migration — `loadFreeTier` merges over
DEFAULT_ROW so new fields backfill):
- `freeOpeningIds?: string[]` — the claimed set (superset of legacy single id).
- `earnedOpeningCredits?: number` — extra slots earned via reward.
- allowance = `1 + earnedOpeningCredits`; `canViewOpening(id)` = claimed
  includes id OR claimed.length < allowance. `claimFreeOpening` honors it.
- `grantOpeningCredits(n)` bumps `earnedOpeningCredits`.
- legacy `freeOpeningId` kept in sync (= first claimed) for old readers.

## Server (`api/referrals.ts`, Upstash Redis, mirrors api/messages.ts)
Keys: `ref:bydevice:<device>`→code, `ref:code:<code>`→device,
`ref:claimed:<newDevice>`→{referrer,ts,qualified}, `ref:credits:<device>`→int,
`ref:recruits:<referrer>`→int, `ref:review:<device>`→flag.
- `GET ?device=` → `{ code, credits, recruits, claimed }` (issues a code on first ask).
- `POST claim {device, code}` — device claims a code ONCE (lifetime); reject own
  code / already-claimed / unknown code. Records pending (qualified:false).
- `POST qualify {device}` — pending→qualified; +1 credit to BOTH new device and
  referrer, +1 recruit to referrer. Idempotent.
- `POST reviewReward {device}` — one-time (`ref:review` guard) +1 credit.
Credits are server truth (cross-device coordination is the only thing that
genuinely needs a server); client syncs `credits` → ledger `earnedOpeningCredits`.

## Client (`src/services/referralService.ts`)
`getStatus()`, `ensureSyncedCredits()` (server credits → ledger, max-wins),
`claimCode(code)`, `reportQualifyingUse()` (once-guarded, from win sites),
`grantReviewReward()` (from `handlePositiveResponse`).

## UI
- `ReferralPanel` inside the persistent NotificationBell: your code + Share +
  "Enter a friend's code" + "N free openings earned". (Bell is on every page.)
- Review reward: `handlePositiveResponse()` → `grantReviewReward()`.
- Qualify: `reportQualifyingUse()` alongside `recordPositiveMoment` win sites.

## PostHog events
`referral_code_claimed {ok}`, `referral_qualified {as:'recruit'|'referrer'}`,
`referral_reward_granted {source:'referral'|'review', credits}`.

## Gates / tests
`api/referrals.test.ts`, `referralService.test.ts`, `freeTierService.test.ts`
(credits/allowance), `NotificationBell`/`ReferralPanel` render. ship-check green,
push to main (web). Native carries it in the next iOS build.

## Status: shipped 2026-09-06 (web). Native carries it in the next iOS build.

No-auth note: the referral API is intentionally unauthenticated — every action
is capped at ONE credit per device and can only ever GIFT a credit (qualify also
credits the code owner), so there is no drain/grief vector. The freemium gate is
already local-Dexie-trust; this adds no new trust surface.
