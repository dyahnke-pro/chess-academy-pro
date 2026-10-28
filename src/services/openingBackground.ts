// openingBackground — WHO AN OPENING IS NAMED AFTER AND WHO MADE IT FAMOUS
// (David 2026-10-28: "yes to internet searches" — background only: never a
// move, never a verdict on the line, always with its source). Read from
// Wikipedia on the student's own device when they ask about an opening: a
// shared server is rate-limited within seconds, a phone is not. Cached for the
// session. The sentence is CHOSEN in code (`backgroundSentence`) — the first
// one that tells history and names no move — so nothing is phrased or invented.

export interface OpeningBackground {
  sentence: string;
  /** The Wikipedia article it came from. */
  title: string;
  url: string;
}

/** Any move written in a sentence ("1. e4", "Nf3", "…a6", "O-O"). */
const MOVE_RE = /\b\d+\s*\.(?:\s*\.\.)?|\.\.\.|…|\b(?:[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8]|[a-h][1-8](?:=[QRBN])?)\b|\bO-O\b/;
/** A verdict on the line — the engine's job, never a page's. */
const VERDICT_RE = /\b(?:refut\w*|unsound|dubious|advantage|equali[sz]\w*|winning|losing|best|strongest|weak\w*|good|bad|bust\w*|incorrect|correct)\b/i;
/** History: who named, found, played or popularised it, and when. */
const HISTORY_RE = /\bnamed\s+(?:after|for)\b|\bintroduc\w*|\bpopulari[sz]\w*|\banaly[sz]\w*\b|\binvent\w*|\bdevised\b|\bdeveloped\s+by\b|\bfirst\s+(?:played|recorded|mentioned|appeared|analy[sz]ed|published|used|seen)\b|\b(?:played|favou?red|adopted|employed|championed|used)\s+by\b|\b1[4-9]\d\d\b|\b20[0-2]\d\b|\bcentury\b/i;

/** The first sentence of `text` that tells the opening's history and names no
 *  move and no verdict, or null. Pure. */
export function backgroundSentence(text: string): string | null {
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => s.trim());
  for (const s of sentences) {
    if (s.length < 30 || s.length > 320) continue;
    if (MOVE_RE.test(s) || VERDICT_RE.test(s)) continue;
    if (HISTORY_RE.test(s)) return s;
  }
  return null;
}

/** The Wikipedia titles to try, most specific first: "Sicilian Defense:
 *  Najdorf Variation" → "Sicilian Defence, Najdorf Variation", then "Sicilian
 *  Defence". Wikipedia spells Defence the British way. */
export function wikipediaTitles(name: string): string[] {
  const british = (s: string): string => s.replace(/\bDefense\b/g, 'Defence').trim();
  const [family, rest] = name.split(':');
  const variation = rest?.split(',')[0]?.trim();
  const titles: string[] = [];
  if (variation) titles.push(`${british(family)}, ${variation}`);
  titles.push(british(family));
  return titles;
}

interface QueryPage { title: string; missing?: boolean; extract?: string; description?: string }
interface QueryResponse {
  query?: {
    pages?: QueryPage[];
    normalized?: { from: string; to: string }[];
    redirects?: { from: string; to: string }[];
  };
}

/** The background a Wikipedia query answer gives for `titles`, in their order
 *  of preference. Pure — the network half is `fetchOpeningBackground`. */
export function backgroundFromResponse(titles: readonly string[], body: QueryResponse): OpeningBackground | null {
  const q = body.query;
  if (!q?.pages) return null;
  const follow = (t: string): string => {
    let out = t;
    for (const n of q.normalized ?? []) if (n.from === out) out = n.to;
    for (const r of q.redirects ?? []) if (r.from === out) out = r.to;
    return out;
  };
  for (const t of titles) {
    const page = q.pages.find((p) => p.title === follow(t) && !p.missing);
    if (!page?.extract) continue;
    // A chess page only: "London System" could be anything else.
    if (!/\bchess\b/i.test(`${page.description ?? ''} ${page.extract.slice(0, 400)}`)) continue;
    const sentence = backgroundSentence(page.extract);
    if (sentence) return { sentence, title: page.title, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}` };
  }
  return null;
}

const cache = new Map<string, Promise<OpeningBackground | null>>();

/** The opening's background from Wikipedia, or null (no page, no history
 *  sentence, offline, or slower than `timeoutMs` — the brief never waits on it). */
export function fetchOpeningBackground(name: string, timeoutMs = 2500): Promise<OpeningBackground | null> {
  const hit = cache.get(name);
  if (hit) return hit;
  const titles = wikipediaTitles(name);
  const url = 'https://en.wikipedia.org/w/api.php?action=query&prop=extracts%7Cdescription&explaintext=1&redirects=1'
    + `&format=json&formatversion=2&origin=*&titles=${encodeURIComponent(titles.join('|'))}`;
  const job = (async (): Promise<OpeningBackground | null> => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) return null;
      return backgroundFromResponse(titles, await res.json() as QueryResponse);
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  })();
  cache.set(name, job);
  // A failure is not remembered: the next ask tries again.
  void job.then((r) => { if (!r) cache.delete(name); });
  return job;
}
