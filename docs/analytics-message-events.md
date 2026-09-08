# PostHog events — in-app messages / bell (David 2026-09-08)

Answers "did people GET / READ my messages?" for the home-screen bell
(`NotificationBell` + `announcementsService`). All fired via
`analytics.captureEvent`, so every event carries the standard super-properties
(`platform`, `distribution`, `device_id`, geo, `build_id`, …). **Admin (David's
own bell) is excluded** from all of them — his fetch/read isn't a real user.

Filter to real users the same way as every other native question
(`platform='native'`, `distribution='appstore'`, exclude Cupertino/Sunnyvale
reviewers + `audit_run_id` + David's devices — see CLAUDE.md).

| Event | Fires when | Properties |
|---|---|---|
| `message_delivered` | A broadcast reaches a non-admin device (initial load or poll). **Once per message per device** (persisted dedup). | `message_id`, `message_title`, `message_date` |
| `message_read` | User expands a broadcast body (`kind:'broadcast'`, once per message per device), OR opens the bell on a fresh developer reply (`kind:'thread'`). | `message_id`, `message_title`, `kind`, `message_ts` (thread) |
| `message_dismissed` | User closes the bell (overlay/X) — the "saw it, didn't read it" signal. CTA taps don't count. | `broadcasts_shown`, `broadcasts_unread` |
| `message_cta_tapped` | User taps a bell CTA. | `cta` = `'invite'` \| `'feedback'` |

Dedup markers persist in Dexie `meta` (`messages.deliveredIds`,
`messages.readIds`, JSON id arrays bounded to 200). Gates:
`announcementsService.test.ts` (dedup logic) + `NotificationBell.test.tsx`
(each event fires with the right props).

Read receipts: `message_read` with `kind='broadcast'` and a given `message_id`
= that user read that broadcast. `message_delivered` without a matching
`message_read` = it reached them but they never opened it.
