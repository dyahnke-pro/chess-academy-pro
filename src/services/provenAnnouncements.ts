/**
 * provenAnnouncements — the ONE memory of which skills the student has been
 * told they FIXED (David 2026-10-18: the same five "Fixed" chips on every
 * Learn game).
 *
 * A skill is announced once, ever. Two producers used to decide it alone:
 * Learn diffed proven tags against a snapshot taken when the page mounted, and
 * the heat map against the greens it saw last time. Neither remembered what had
 * already been SAID, so a tag that turned green again — a background re-pass of
 * an old game, or green dropping and coming back — was announced again, game
 * after game. Both now claim through here, and a claimed tag stays claimed.
 */
import { db } from '../db/schema';

const KEY = 'proven_announced_v1';

async function readAnnounced(): Promise<Set<string>> {
  try {
    const row = await db.meta.get(KEY);
    return new Set(JSON.parse(row?.value ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

/** The tags in `tags` never announced before, now marked announced. */
export async function claimProvenAnnouncements(tags: Iterable<string>): Promise<string[]> {
  const done = await readAnnounced();
  const fresh = [...new Set(tags)].filter((t) => !done.has(t));
  if (fresh.length === 0) return [];
  for (const t of fresh) done.add(t);
  try { await db.meta.put({ key: KEY, value: JSON.stringify([...done]) }); } catch { /* best effort */ }
  return fresh;
}

/** Mark tags announced without announcing them (green before this memory existed). */
export async function markProvenAnnounced(tags: Iterable<string>): Promise<void> {
  await claimProvenAnnouncements(tags);
}
