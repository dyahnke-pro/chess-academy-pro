import { db } from '../db/schema';

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
export async function markAllSeen(latestId: string): Promise<void> {
  try {
    await db.meta.put({ key: LAST_SEEN_KEY, value: latestId });
  } catch {
    /* best-effort — the red dot reappearing is harmless */
  }
}

/** Pure: is the newest message unseen? Drives the red dot. */
export function hasUnread(messages: Announcement[], lastSeenId: string | null): boolean {
  if (messages.length === 0) return false;
  return messages[0].id !== lastSeenId;
}
