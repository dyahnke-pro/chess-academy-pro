# Messaging + Referral + Push — build plan (David 2026-09-07)

David's asks this session:
1. Bell inbox: sent messages as **collapsed title bullets, newest-first, tap to expand**. Tighter for him and users.
2. **Auto-send two messages to all new users** (welcome broadcasts, always present):
   - `2026-09-06-welcome` — "A note from the developer" (already in announcements.json).
   - `2026-09-07-free-openings` — the free-openings announcement (this build).
3. **Referral code** — NOT a cold popup (David: "I don't love that idea"). Instead: keep the
   existing "Invite a friend" → ReferralPanel entry, add a non-blocking nudge at a
   high-intent moment (a genuine win / paywall). Popup only if he later insists.
4. **Push notifications** — David chose "build it (big)".

## Root cause found (fixes the "not sure it sent" pain)
`fetchInbox` uses `/api/messages` (Redis) as PRIMARY and only falls back to
`announcements.json` when the API is UNREACHABLE. Redis currently returns `ok` with
`broadcasts: []` (empty / Upstash cap-degraded), so the fallback never fires and the
welcome note in `announcements.json` is invisible to everyone. Fix: **merge** the static
`announcements.json` (pinned welcome set) with the Redis broadcasts (dedup by id,
newest-first) instead of using it fallback-only. Welcome messages then always show; future
Redis broadcasts appear alongside.

## Workstreams

### 1. Bell reorg — DONE this build
- Broadcast list renders collapsed rows (● title + date), newest-first, tap toggles body.
- Expand state = a `Set<string>` of expanded ids.

### 2. Auto-welcome broadcasts — DONE this build
- Add message #2 to `public/announcements.json`.
- `fetchInbox` merges announcements.json + Redis broadcasts (dedup by id, newest-first).
- Reaches native App Store users at runtime with NO release (origin-served file) + survives
  Redis being down/capped.

### 3. Referral surfacing — PENDING David's OK on approach
- Entry already exists (Invite a friend → ReferralPanel with code + Share).
- Proposed: non-blocking nudge after a genuine win / at the paywall; no modal.
- NOT built yet — confirm approach first.

### 4. Push notifications — PLANNED (needs David + a new iOS build)
Real push does not exist (no `@capacitor/push-notifications`, no APNs, no send endpoint).
To build:
- Add `@capacitor/push-notifications`; register device tokens (store in Redis by device_id).
- **From David (external, I can't do these):** an **Apple Push key (.p8)** from the Apple
  Developer account (Keys → +, APNs) + its Key ID + Team ID; add the **Push Notifications
  capability** to the App ID.
- Add the entitlement in the iOS project config (`npm run setup:ios` / ios-patches).
- `api/push-send.ts`: admin-gated (x-admin-secret), sends via APNs (`node-apn` or raw JWT)
  to stored tokens. Rate-limited; forward-only; one publisher.
- Wire a "Push to all" action into the admin bell (alongside Broadcast).
- **Cut a new iOS build + submit to App Store.** Only users who UPDATE receive pushes;
  current installs get nothing until they update.
- Gate + audit before shipping.

## Sequencing
1–2 ship now (web/main → OTA later). 3 waits on David's OK. 4 is the deliberate native track.

## Decisions log
- 2026-09-07: referral = non-blocking nudge, NOT a modal (David ambivalent, I pushed back).
- 2026-09-07: welcome delivery = announcements.json merge (origin-served, release-free).
- 2026-09-07: push = full build, blocked on David's Apple Push key + a new iOS build.
