/**
 * coachMemoryService
 * ------------------
 * Persistent "what the coach has learned about this student" notes.
 *
 * Every coach turn (chat + move commentary) pulls these notes into the
 * system prompt so advice stays consistent over time — the coach can
 * remember "student blunders back-rank tactics when short on time",
 * "prefers aggressive openings", "stuck around 1250 ELO for 3 months",
 * etc., without us having to bake that into hand-crafted rules.
 *
 * Writes happen via the `[[REMEMBER: <note>]]` tag parser — the LLM
 * emits it in its reply, the dispatcher strips it from the visible
 * text and appends the note here.
 *
 * Size-capped to keep prompts cheap (see MAX_NOTES / MAX_NOTE_LENGTH).
 * Older notes are trimmed FIFO when we hit the cap.
 */
import { db } from '../db/schema';
import type { UserProfile } from '../types';

/** Maximum notes we keep around — roughly ~4KB once joined, small
 *  enough to inject into every prompt without bloating latency. */
export const MAX_NOTES = 40;
/** Per-note cap so a single rogue LLM reply can't eat the budget. */
export const MAX_NOTE_LENGTH = 240;

/**
 * Fetch the current coach memory for the main profile.
 * Returns an empty array when the profile is missing or memory hasn't
 * been initialised yet.
 */
export async function getCoachMemory(): Promise<string[]> {
  const profile = await db.profiles.get('main');
  return profile?.preferences.coachMemory ?? [];
}

/**
 * Append a note to the coach's persistent memory, deduping trivially
 * and trimming to MAX_NOTES. No-op when the note is empty or the
 * profile doesn't exist yet.
 */
export async function addCoachMemoryNote(note: string): Promise<void> {
  const trimmed = note.trim().slice(0, MAX_NOTE_LENGTH);
  if (!trimmed) return;

  const profile = await db.profiles.get('main');
  if (!profile) return;

  const existing = profile.preferences.coachMemory ?? [];
  // Skip exact duplicates (common when the LLM re-emits a REMEMBER
  // tag it already wrote earlier in the session).
  if (existing.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
    return;
  }

  const next = [...existing, trimmed].slice(-MAX_NOTES);
  await db.profiles.update('main', {
    preferences: { ...profile.preferences, coachMemory: next } as UserProfile['preferences'],
  });
}

/**
 * Replace the entire memory list. Exposed for a future "clear my
 * coach's memory" settings affordance; callers normally use
 * `addCoachMemoryNote` instead.
 */
export async function replaceCoachMemory(notes: string[]): Promise<void> {
  const profile = await db.profiles.get('main');
  if (!profile) return;
  const cleaned = notes
    .map((n) => n.trim().slice(0, MAX_NOTE_LENGTH))
    .filter((n) => n.length > 0)
    .slice(-MAX_NOTES);
  await db.profiles.update('main', {
    preferences: { ...profile.preferences, coachMemory: cleaned } as UserProfile['preferences'],
  });
}

/**
 * Format the memory block for prompt injection. Returns an empty
 * string when there's nothing to add, so callers can concatenate
 * without worrying about blank sections.
 */
export async function buildCoachMemoryBlock(): Promise<string> {
  const notes = await getCoachMemory();
  if (notes.length === 0) return '';
  const lines = notes.map((n) => `- ${n}`).join('\n');
  return `[Coach's memory — things you've learned about this student]\n${lines}`;
}

/** Regex matching the REMEMBER tag the coach emits in replies. */
const REMEMBER_TAG_RE = /\[\[REMEMBER:\s*([^\]]+?)\s*\]\]/gi;

/**
 * Strip `[[REMEMBER: ...]]` tags out of a coach message, persist each
 * extracted note, and return the cleaned text. Runs async but is
 * fire-and-forget safe for rendering — the tags are always removed
 * synchronously from the returned string.
 */
export function extractAndRememberNotes(text: string): string {
  const notes: string[] = [];
  const cleaned = text.replace(REMEMBER_TAG_RE, (_match, note: string) => {
    notes.push(note);
    return '';
  });
  // Fire-and-forget: don't block rendering on the DB write.
  for (const note of notes) {
    void addCoachMemoryNote(note);
  }
  // Collapse whitespace left behind by removed tags.
  return cleaned.replace(/\s{2,}/g, ' ').trim();
}

/** Test hook — exposed for unit tests to bypass the regex check. */
export function __test__getRememberRegex(): RegExp {
  return new RegExp(REMEMBER_TAG_RE.source, 'gi');
}
