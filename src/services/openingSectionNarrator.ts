/**
 * openingSectionNarrator
 * ----------------------
 * Generate cohesive, teaching-quality spoken narrations for the
 * "Traps & Pitfalls" and "Watch Out For" sections of an opening detail
 * page. The on-disk data for these sections is a short list of bullet
 * strings; joining them with periods ("foo. bar. baz.") and feeding
 * that to the narrator produces a dry, disconnected readout.
 *
 * This service takes the bullet list + opening context, asks the LLM
 * for one paragraph that explains WHY these traps/warnings matter and
 * how to recognize them at the board, and caches the result in Dexie's
 * `meta` table. On cache hit the call resolves immediately; on LLM
 * failure we gracefully fall back to the joined bullet string.
 */
import { getCoachChatResponse } from './coachApi';
import { db } from '../db/schema';

/** Cache version — bump to invalidate all cached paragraphs when the
 *  prompt / output format changes. */
const CACHE_VERSION = 'v1';

export type OpeningSectionKind = 'traps' | 'warnings';

export interface OpeningSectionNarrationInput {
  openingId: string;
  openingName: string;
  /** 'white' | 'black' | 'both' — which side the user plays as. */
  color?: string;
  kind: OpeningSectionKind;
  /** The raw bullet strings from the opening record. */
  bullets: string[];
}

/**
 * Return a paragraph-length narration that covers every bullet in
 * `bullets` but reads as one cohesive explanation. Falls back to the
 * joined bullet string if the LLM is unavailable, so narration always
 * works — it just won't be as deep.
 */
export async function narrateOpeningSection(
  input: OpeningSectionNarrationInput,
): Promise<string> {
  const trimmed = input.bullets.map((b) => b.trim()).filter((b) => b.length > 0);
  if (trimmed.length === 0) return '';

  const cacheKey = buildCacheKey(input, trimmed);
  const cached = await readCache(cacheKey);
  if (cached) return cached;

  try {
    const paragraph = await requestParagraph(input, trimmed);
    if (paragraph) {
      await writeCache(cacheKey, paragraph);
      return paragraph;
    }
  } catch (err: unknown) {
    console.warn('[openingSectionNarrator] LLM call failed:', err);
  }

  // Fallback to the raw joined bullets so narration still works.
  return trimmed.join('. ');
}

async function requestParagraph(
  input: OpeningSectionNarrationInput,
  bullets: string[],
): Promise<string> {
  const sectionLabel =
    input.kind === 'traps' ? 'traps and pitfalls' : 'things to watch out for';

  const colorClause = input.color
    ? ` The student is studying this opening from the ${input.color} side.`
    : '';

  const systemAdditions = [
    'You are a chess opening coach narrating a short teaching segment that will be read aloud.',
    `Produce ONE flowing paragraph (3-6 sentences, 80-140 words) covering every bullet about the ${sectionLabel} in the given opening.`,
    'Do NOT list the bullets verbatim. Weave them into a cohesive explanation: what the danger is, why it arises from this opening\'s structure, and one concrete visual cue (a square, file, diagonal, or tactical motif) the student should watch for.',
    'Cite squares, pieces, and motifs concretely. Avoid generic filler like "be careful", "this is important", or "the position is sharp".',
    'Write in plain prose suitable for text-to-speech — no markdown, no bullet characters, no headings.',
    'Return only the paragraph. No preface, no quotation marks.',
  ].join(' ');

  const bulletList = bullets.map((b, i) => `${i + 1}. ${b}`).join('\n');
  const userMessage = [
    `Opening: ${input.openingName}.${colorClause}`,
    '',
    `Bullets covering ${sectionLabel}:`,
    bulletList,
    '',
    `Write one cohesive paragraph (80-140 words) covering every bullet.`,
  ].join('\n');

  const raw = await getCoachChatResponse(
    [{ role: 'user', content: userMessage }],
    systemAdditions,
    undefined,
    'chat_response',
    500,
  );
  return sanitize(raw);
}

function sanitize(raw: string): string {
  if (!raw) return '';
  // Strip wrapping quotes and markdown code fences if the model adds any.
  let out = raw.trim();
  if (out.startsWith('```')) {
    out = out.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
  }
  if ((out.startsWith('"') && out.endsWith('"')) || (out.startsWith('\u201C') && out.endsWith('\u201D'))) {
    out = out.slice(1, -1).trim();
  }
  return out;
}

function buildCacheKey(
  input: OpeningSectionNarrationInput,
  bullets: string[],
): string {
  const bulletHash = simpleHash(bullets.join('|'));
  return `opening-section-narr:${CACHE_VERSION}:${input.openingId}:${input.kind}:${bulletHash}`;
}

/** Cheap FNV-style string hash — collision-resistant enough for a
 *  cache key prefix on a single-user database. */
function simpleHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16);
}

interface CachedParagraph {
  version: string;
  createdAt: number;
  paragraph: string;
}

async function readCache(key: string): Promise<string | null> {
  try {
    const entry = await db.meta.get(key);
    if (!entry) return null;
    const payload = parseCache(entry.value);
    if (!payload) return null;
    if (payload.version !== CACHE_VERSION) return null;
    return payload.paragraph;
  } catch {
    return null;
  }
}

async function writeCache(key: string, paragraph: string): Promise<void> {
  if (!paragraph.trim()) return;
  const payload: CachedParagraph = {
    version: CACHE_VERSION,
    createdAt: Date.now(),
    paragraph,
  };
  try {
    await db.meta.put({ key, value: JSON.stringify(payload) });
  } catch {
    // Cache write failures shouldn't break the narration.
  }
}

function parseCache(raw: string): CachedParagraph | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'version' in parsed &&
      'paragraph' in parsed
    ) {
      const p = parsed as { version: unknown; paragraph: unknown };
      if (typeof p.version === 'string' && typeof p.paragraph === 'string') {
        return { version: p.version, paragraph: p.paragraph, createdAt: 0 };
      }
    }
  } catch {
    /* fall through */
  }
  return null;
}
