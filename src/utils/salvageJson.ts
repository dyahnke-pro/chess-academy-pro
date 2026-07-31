/**
 * Recover the complete prefix of a TRUNCATED JSON document.
 *
 * Why this exists (David 2026-07-31, "the narrations were repetitive and
 * sounded nothing like Naroditsky! Garbage!"): a walkthrough's narration comes
 * back as one tool-call JSON blob. When the model runs into `max_tokens` the
 * blob is cut mid-array, `JSON.parse` throws, and the generator dropped the
 * WHOLE lesson to template ideas — every move narrated by the same generic
 * sentence stamp. Losing the last two ideas is a papercut; losing all thirty
 * is the garbage he heard.
 *
 * This is pure structural recovery, NOT repair-by-guessing: it keeps only
 * elements the model actually finished emitting, discards the partial tail,
 * and closes the containers that were left open. Nothing is invented, so it
 * stays inside G0/G3 — the caller still validates the shape it gets back.
 */

/** Parse `raw`, falling back to its longest complete prefix when truncated.
 *  Returns null when nothing salvageable is there (no element ever completed,
 *  or the prefix still isn't valid JSON). */
export function parseJsonSalvaging(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    /* truncated or malformed — try the prefix below */
  }
  const prefix = completePrefix(raw);
  if (prefix === null) return null;
  try {
    return JSON.parse(prefix) as unknown;
  } catch {
    return null;
  }
}

/** True when `raw` doesn't parse but a complete prefix of it does — i.e. the
 *  model was cut off rather than emitting something structurally wrong. Used
 *  for honest audit wording ("truncated at N of M" vs "malformed"). */
export function isTruncatedJson(raw: string): boolean {
  try {
    JSON.parse(raw);
    return false;
  } catch {
    /* fall through */
  }
  const prefix = completePrefix(raw);
  if (prefix === null) return false;
  try {
    JSON.parse(prefix);
    return true;
  } catch {
    return false;
  }
}

/**
 * Cut `raw` back to the last point where every emitted value was complete,
 * then close the still-open containers.
 *
 * The cut point is the last comma outside a string: everything before a comma
 * is, by JSON's grammar, a finished element. Recording the container stack at
 * that comma tells us exactly which brackets to close.
 */
function completePrefix(raw: string): string | null {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  let cutAt = -1;
  let cutStack: string[] = [];

  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{' || ch === '[') { stack.push(ch); continue; }
    if (ch === '}' || ch === ']') { stack.pop(); continue; }
    if (ch === ',' && stack.length > 0) {
      // Everything up to (not including) this comma is complete.
      cutAt = i;
      cutStack = [...stack];
    }
  }
  if (cutAt < 0) return null;

  let out = raw.slice(0, cutAt);
  for (let i = cutStack.length - 1; i >= 0; i -= 1) {
    out += cutStack[i] === '{' ? '}' : ']';
  }
  return out;
}
