# Push notifications (native iOS)

Built 2026-11-25. First use: when David answers a user in the bell's thread,
that phone gets a push — "New message from David" and the first ~100
characters of the reply — even with the app closed. A tap opens the app with
the bell open.

## How it works

| Piece | File |
|---|---|
| Ask, register, tap handling (iOS only; no-op on web/PWA) | `src/services/pushService.ts` |
| The ask's trigger: the student sends David something | `announcementsService.sendReply` / `postFeedbackToInbox` → `askForPushOnce` |
| Boot: re-register a phone that already allowed notifications | `App.tsx` → `startPush()` |
| The bell opening on a tap | `NotificationBell.tsx` (`OPEN_BELL_EVENT`, only the bell on screen) |
| Token filing | `api/push-register.ts` → Redis `push:device:<deviceId>` |
| APNs (ES256 JWT + HTTP/2) | `api/_lib/apns.ts` |
| Token book + "send to this device" | `api/_lib/pushTokens.ts` (`notifyDevice`, `devReplyAlert`) |
| The send | `api/messages.ts` action `devReply` |
| Native | `ios-patches/App/AppDelegate.swift` (token callbacks), `ios-patches/App/App.entitlements`, `scripts/ios-push-entitlements.mjs` (run by `ci_post_clone.sh` and `setup:ios`) |

**When the app asks:** the first time the student sends David a message in
the bell or submits in-app feedback — the moment an answer is expected. Never
at first launch. Asked once per install: a denial is recorded (`push.prompted`
in Dexie meta) and never re-asked. A phone that granted notifications for the
review reminders (the same iOS permission) registers silently at boot.

**Environment:** TestFlight and App Store builds use production APNs; only an
Xcode-run build (`distribution = development`) is sandbox. The client sends
its guess; the server retries the other host once on `BadDeviceToken` and
refiles the token under the host that answered. A 410 / `Unregistered` token is
deleted.

**Credentials** (Vercel env, never in code): `APNS_KEY` (the .p8 PEM; a
one-line value with `\n` escapes is accepted), `APNS_KEY_ID`, `APNS_TEAM_ID`.
Optional `APNS_TOPIC` (defaults to `com.chessacademy.pro`). Missing
credentials → the reply is filed and the response says `push: "no-config"`.

## Sending

Reply in the bell's admin Threads view as before. The `devReply` response now
carries `push`: `sent`, `no-token` (that device never allowed notifications or
is on an older build), `dead-token`, `failed` or `no-config`. A failed push
never fails the reply.

From the command line:

```bash
curl -s -X POST https://chess-academy-pro.vercel.app/api/messages \
  -H 'content-type: application/json' -H "x-admin-secret: $ADMIN_MESSAGE_SECRET" \
  -d '{"action":"devReply","device":"<device id>","body":"Your reply"}'
```

## Before the first push-capable build

1. Run the workflow **"ASC — enable Push Notifications capability"**
   (`.github/workflows/asc-push-capability.yml`, `dry_run` first if wanted). It
   turns on `PUSH_NOTIFICATIONS` for the bundle id; idempotent.
2. Cut the iOS build. `ci_post_clone.sh` wires the `aps-environment`
   entitlement and fails the build if it cannot.

PostHog: `push_permission` {result, trigger, prompted}, `push_registered`
{apns_environment, changed}, `push_opened` {open}, and `message_read` with
`via: 'push'` when a tap opens the bell.

Not verifiable without a device build: real APNs delivery, the iOS prompt, and
the tap opening the bell from a cold launch.
