# Two-way developer ↔ user messages (the bell, v2)

David 2026-09-06: "When only I click on it, I want the option of sending a
message to all users. Directly reply then can happen from within that message
thread." → the bell becomes a two-way channel: David broadcasts to all users;
each user can reply; David reads replies and replies back inside that user's
thread.

## Why NOT Supabase RLS (correction to the v1 pitch)

I first proposed Supabase-RLS. It cannot securely scope anonymous users: the app
has no login, only an anonymous `device_id`, and RLS keyed on a `device_id`
COLUMN gates nothing (any client can read/write any device's rows by spoofing
the value). Securing it would need Supabase anonymous Auth. The app's own
established pattern for app-written shared state is simpler and already secure:
a **Vercel API route + Upstash Redis** (exactly `api/audit-stream.ts`), where the
route holds the creds and enforces every rule SERVER-SIDE. No client secret, no
RLS gymnastics. That is what this builds.

## Backend — `api/messages.ts` (+ Upstash Redis, mirrors audit-stream)

Redis keys:
- `msg:broadcasts` — list of `{id,title,body,ts}` (David → all).
- `msg:thread:<deviceId>` — list of `{from:'dev'|'user',body,ts}` (1:1).
- `msg:devices` — sorted set (score = last activity) of deviceIds with a thread,
  so the admin can enumerate threads newest-first.

Endpoints (method + action dispatch, open CORS + server-side gates):
- `GET  ?device=<id>` → `{broadcasts, thread}` — public, device-scoped read.
- `POST {action:'reply', device, body}` → append `{from:'user'}` to that thread
  + bump `msg:devices`. Public, device-scoped, rate-limited per device.
- `POST {action:'broadcast', title, body}` + `x-admin-secret` → append a
  broadcast. **Admin** (secret === `ADMIN_MESSAGE_SECRET`).
- `POST {action:'devReply', device, body}` + `x-admin-secret` → append
  `{from:'dev'}` to a device thread. **Admin.**
- `GET  ?threads=1` + `x-admin-secret` → list device threads newest-first.
  **Admin.**

Graceful degradation: no Redis configured → in-memory fallback (dev). No
`ADMIN_MESSAGE_SECRET` → admin writes 501 (never silently accept). Bounded:
`ltrim` broadcasts to 100, each thread to 200; no per-message object storage
(the blob-ops incident).

## Client

- `announcementsService` → fetch broadcasts + this device's thread from
  `/api/messages?device=<id>`, FALLBACK to the static `/announcements.json` when
  the API is unreachable/unconfigured (so the bell never goes blank).
- `NotificationBell`:
  - User view: broadcasts + the thread, a reply composer (textarea → POST reply),
    poll on open. Unread dot already covers new broadcasts; extend to unseen dev
    replies.
  - Admin view (David only): a "Broadcast to all" composer + a threads list he
    can open and reply into. Gated in the UI by his confirmed `device_id`s AND by
    the stored admin secret; the WRITE is gated server-side regardless.
- Admin secret entry: shown only on David's devices (device-gated), stored once
  in Dexie `meta` (`adminMessageSecret`), sent as `x-admin-secret`.

## Gates
- `api/messages.test.ts` — pure handler tests (mock Redis): device-scoped read,
  user reply append, admin broadcast requires the secret (401 without), devReply
  requires it, threads list requires it.
- `NotificationBell.test.tsx` — reply composer posts; admin composer hidden for a
  normal device, shown for a David device.
- `ADMIN_MESSAGE_SECRET` must be set in Vercel (flag to David) — until then admin
  writes 501 and the one-way broadcast path via the static JSON still works.

Status: shipped — api/messages (6 tests) + bell two-way UI (3 tests) green; ADMIN_MESSAGE_SECRET set in Vercel (prod+preview).
