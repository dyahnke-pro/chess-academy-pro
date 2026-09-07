import { db } from '../db/schema';
import { getDeviceId } from './deviceIdentity';

/** A message from the developer to users, shown behind the home-screen bell. */
export interface Announcement {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  body: string;
}

const LAST_SEEN_KEY = 'announcements.lastSeenId';

// Served from the app ORIGIN at runtime (not a bundled import) so a new message
// reaches native App Store users WITHOUT an App Store release — David publishes
// by editing public/announcements.json and pushing to main (David 2026-09-06).
const ANNOUNCEMENTS_URL = '/announcements.json';

/** Fetch the developer's messages, newest first. Never throws — a network/parse
 *  failure yields an empty list (the bell simply shows no dot). */
export async function fetchAnnouncements(): Promise<Announcement[]> {
  try {
    const res = await fetch(`${ANNOUNCEMENTS_URL}?cb=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = (await res.json()) as { messages?: Announcement[] };
    const list = Array.isArray(data.messages) ? data.messages : [];
    // Newest first — sort by (date, id) descending so the freshest is [0].
    return [...list]
      .filter((m) => m && typeof m.id === 'string')
      .sort((a, b) => `${b.date}${b.id}`.localeCompare(`${a.date}${a.id}`));
  } catch {
    return [];
  }
}

/** The id of the newest message this device has opened, or null. */
export async function getLastSeenId(): Promise<string | null> {
  try {
    const rec = await db.meta.get(LAST_SEEN_KEY);
    return typeof rec?.value === 'string' ? rec.value : null;
  } catch {
    return null;
  }
}

/** Mark everything up to (and including) the newest message as seen. */
/** Notify every mounted bell (the app now renders one per header/sidebar) that
 *  the seen-marker moved, so they all clear the red dot together — not just the
 *  instance the user tapped. */
function announceSeen(): void {
  try { window.dispatchEvent(new CustomEvent('messages-seen')); } catch { /* no window */ }
}

export async function markAllSeen(latestId: string): Promise<void> {
  try {
    await db.meta.put({ key: LAST_SEEN_KEY, value: latestId });
  } catch {
    /* best-effort — the red dot reappearing is harmless */
  }
  announceSeen();
}

/** Pure: is the newest message unseen? Drives the red dot. */
export function hasUnread(messages: Announcement[], lastSeenId: string | null): boolean {
  if (messages.length === 0) return false;
  return messages[0].id !== lastSeenId;
}

// ── Two-way messages (v2, David 2026-09-06) ─────────────────────────────────
// Broadcasts + a private per-device thread, served by /api/messages (Upstash
// Redis). Falls back to the static announcements file when the API is
// unreachable/unconfigured, so the bell never goes blank.

export interface ThreadMessage {
  from: 'dev' | 'user';
  body: string;
  ts: number;
}

/** A durably-captured in-app feedback submission (admin-only to read). */
export interface FeedbackItem {
  id: string;
  device: string;
  message: string;
  category: string;
  rating: number | null;
  route: string;
  name: string;
  email: string;
  ts: number;
}

const MESSAGES_API = '/api/messages';
const ADMIN_SECRET_KEY = 'messages.adminSecret';
const LAST_SEEN_THREAD_KEY = 'messages.lastSeenThreadTs';
const LAST_SEEN_FEEDBACK_KEY = 'messages.lastSeenFeedbackTs';

function toAnnouncement(b: { id: string; title: string; body: string; ts: number }): Announcement {
  return { id: b.id, title: b.title, body: b.body, date: new Date(b.ts).toISOString().slice(0, 10) };
}

/** Broadcasts (newest first) + this device's thread. Never throws. */
export async function fetchInbox(): Promise<{ broadcasts: Announcement[]; thread: ThreadMessage[] }> {
  try {
    const device = await getDeviceId();
    const res = await fetch(`${MESSAGES_API}?device=${encodeURIComponent(device)}&cb=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const data = (await res.json()) as { broadcasts?: { id: string; title: string; body: string; ts: number }[]; thread?: ThreadMessage[] };
      const broadcasts = (Array.isArray(data.broadcasts) ? data.broadcasts : [])
        .filter((b) => b && typeof b.id === 'string')
        .map(toAnnouncement)
        .sort((a, b) => `${b.date}${b.id}`.localeCompare(`${a.date}${a.id}`));
      const thread = Array.isArray(data.thread) ? data.thread : [];
      return { broadcasts, thread };
    }
  } catch { /* fall through to the static file */ }
  return { broadcasts: await fetchAnnouncements(), thread: [] };
}

/** A user replies into their own thread. Returns whether it was accepted. */
export async function sendReply(body: string): Promise<boolean> {
  const text = body.trim();
  if (!text) return false;
  try {
    const device = await getDeviceId();
    const res = await fetch(MESSAGES_API, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'reply', device, body: text }),
    });
    return res.ok;
  } catch { return false; }
}

/** True when the thread carries a developer reply newer than last seen. */
export function hasUnreadThread(thread: ThreadMessage[], lastSeenTs: number): boolean {
  return thread.some((m) => m.from === 'dev' && m.ts > lastSeenTs);
}

export async function getLastSeenThreadTs(): Promise<number> {
  try { const rec = await db.meta.get(LAST_SEEN_THREAD_KEY); return typeof rec?.value === 'string' ? Number(rec.value) || 0 : 0; } catch { return 0; }
}
export async function markThreadSeen(ts: number): Promise<void> {
  try { await db.meta.put({ key: LAST_SEEN_THREAD_KEY, value: String(ts) }); } catch { /* best-effort */ }
  announceSeen();
}

// ── Admin (David only) ──────────────────────────────────────────────────────
// The secret is entered once on David's device and stored in Dexie; it is sent
// as x-admin-secret and validated SERVER-SIDE. It never ships in the bundle.

export async function getAdminSecret(): Promise<string | null> {
  try { const rec = await db.meta.get(ADMIN_SECRET_KEY); return typeof rec?.value === 'string' && rec.value ? rec.value : null; } catch { return null; }
}
export async function setAdminSecret(secret: string): Promise<void> {
  try { await db.meta.put({ key: ADMIN_SECRET_KEY, value: secret.trim() }); } catch { /* best-effort */ }
}

export async function sendBroadcast(title: string, body: string): Promise<boolean> {
  const secret = await getAdminSecret();
  const text = body.trim();
  if (!secret || !text) return false;
  try {
    const res = await fetch(MESSAGES_API, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-admin-secret': secret },
      body: JSON.stringify({ action: 'broadcast', title: title.trim() || 'Message', body: text }),
    });
    return res.ok;
  } catch { return false; }
}

export async function fetchAllThreads(): Promise<{ device: string; messages: ThreadMessage[] }[]> {
  const secret = await getAdminSecret();
  if (!secret) return [];
  try {
    const res = await fetch(`${MESSAGES_API}?threads=1&cb=${Date.now()}`, { cache: 'no-store', headers: { 'x-admin-secret': secret } });
    if (!res.ok) return [];
    const data = (await res.json()) as { threads?: { device: string; messages: ThreadMessage[] }[] };
    return Array.isArray(data.threads) ? data.threads : [];
  } catch { return []; }
}

export async function sendDevReply(device: string, body: string): Promise<boolean> {
  const secret = await getAdminSecret();
  const text = body.trim();
  if (!secret || !text) return false;
  try {
    const res = await fetch(MESSAGES_API, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-admin-secret': secret },
      body: JSON.stringify({ action: 'devReply', device, body: text }),
    });
    return res.ok;
  } catch { return false; }
}

// ── Feedback (David 2026-09-07) ─────────────────────────────────────────────
// A user submits feedback (PUBLIC); David's admin bell lists it + alerts on new
// arrivals (ADMIN, gated by the same secret). "For me only" rides the admin
// secret — no other user can read the feedback list, so no other user's bell
// lights for it.

/** POST a feedback item to the durable inbox. Fire-and-forget: never throws,
 *  so a store hiccup can't break the user's send flow. Returns acceptance. */
export async function postFeedbackToInbox(input: {
  message: string;
  category: string;
  rating?: number | null;
  route?: string;
  name?: string;
  email?: string;
}): Promise<boolean> {
  const text = input.message.trim();
  if (!text) return false;
  try {
    const device = await getDeviceId();
    const res = await fetch(MESSAGES_API, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'feedback',
        device,
        message: text,
        category: input.category,
        rating: typeof input.rating === 'number' ? input.rating : null,
        route: input.route ?? '',
        name: input.name ?? '',
        email: input.email ?? '',
      }),
    });
    return res.ok;
  } catch { return false; }
}

/** Admin: fetch captured feedback, newest first. Empty without the secret. */
export async function fetchFeedback(): Promise<FeedbackItem[]> {
  const secret = await getAdminSecret();
  if (!secret) return [];
  try {
    const res = await fetch(`${MESSAGES_API}?feedback=1&cb=${Date.now()}`, { cache: 'no-store', headers: { 'x-admin-secret': secret } });
    if (!res.ok) return [];
    const data = (await res.json()) as { feedback?: FeedbackItem[] };
    return Array.isArray(data.feedback) ? data.feedback : [];
  } catch { return []; }
}

/** True when any feedback is newer than the admin last viewed it. Drives the
 *  bell's red dot for David only (this is only ever called with admin data). */
export function hasUnreadFeedback(items: FeedbackItem[], lastSeenTs: number): boolean {
  return items.some((f) => f.ts > lastSeenTs);
}

export async function getLastSeenFeedbackTs(): Promise<number> {
  try { const rec = await db.meta.get(LAST_SEEN_FEEDBACK_KEY); return typeof rec?.value === 'string' ? Number(rec.value) || 0 : 0; } catch { return 0; }
}
export async function markFeedbackSeen(ts: number): Promise<void> {
  try { await db.meta.put({ key: LAST_SEEN_FEEDBACK_KEY, value: String(ts) }); } catch { /* best-effort */ }
  announceSeen();
}

/** Verify a candidate admin secret against the server (200 = valid, 401 = not).
 *  Used to gate the admin UI so a wrong key never fakes it. */
export async function verifyAdminSecret(secret: string): Promise<boolean> {
  const s = secret.trim();
  if (!s) return false;
  try {
    const res = await fetch(`${MESSAGES_API}?threads=1&cb=${Date.now()}`, { cache: 'no-store', headers: { 'x-admin-secret': s } });
    return res.ok;
  } catch { return false; }
}
