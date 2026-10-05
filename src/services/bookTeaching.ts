// bookTeaching — the coach teaches from the library when the student asks
// (David 2026-10-05: "Make sure coach can teach from the books if someone asks
// it to"): "what does Lasker say about the centre?", "teach me the blockade
// from My System", "what do the books say about passed pawns?".
//
// G0: the coach decides nothing here. The passage is the book's own public-
// domain prose, chosen by a computed match (topic words found in the
// paragraph, a heading match counting extra), quoted verbatim with its book
// and chapter, and the page is offered in the reader. A topic the named book
// does not take up is said plainly — and if another book does, that one is
// offered instead. Nothing is paraphrased, nothing invented.
//
// PURE over a minimal book shape; the real library (~1 MB of text) is loaded
// by the caller only when a request is recognised.

export interface TeachableBook {
  id: string;
  bookTitle: string;
  author: string;
  pages: ReadonlyArray<{ heading?: string; text: string }>;
  /** Our own book: never quoted as a master's teaching. */
  house?: boolean;
}

export interface BookRequest {
  /** Book ids the student named; empty = every book ("the books"). */
  bookIds: string[];
  /** What they want taught; null = "teach me from <book>" with no topic. */
  topic: string | null;
}

export interface BookPassage {
  bookId: string;
  bookTitle: string;
  author: string;
  pageIndex: number;
  heading: string | null;
  paragraph: string;
}

/** Who and what the student can name → the book ids. Longest names first so
 *  "Emanuel Lasker" wins over "Lasker". */
const SOURCES: ReadonlyArray<{ re: RegExp; ids: string[] }> = [
  { re: /\bemanuel\s+lasker\b|\bcommon\s+sense\s+in\s+chess\b|\bcommon\s+sense\b/i, ids: ['emanuel-lasker-common-sense-in-chess'] },
  { re: /\bedward\s+lasker\b/i, ids: ['edward-lasker-chess-strategy', 'edward-lasker-chess-and-checkers'] },
  { re: /\bchess\s+and\s+checkers\b/i, ids: ['edward-lasker-chess-and-checkers'] },
  { re: /\bchess\s+strategy\b/i, ids: ['edward-lasker-chess-strategy'] },
  // A bare "Lasker" is the world champion, Emanuel; Edward needs his name.
  { re: /\blasker'?s?\b/i, ids: ['emanuel-lasker-common-sense-in-chess'] },
  { re: /\bcapablanca'?s?\b|\bchess\s+fundamentals\b/i, ids: ['capablanca-chess-fundamentals'] },
  { re: /\bnimzo(?:witsch|vich|vitch)?'?s?\b|\bmy\s+system\b/i, ids: ['nimzowitsch-my-system'] },
  { re: /\bmason'?s?\b|\bthe\s+art\s+of\s+chess\b/i, ids: ['james-mason-the-art-of-chess'] },
  { re: /\bsteinitz'?s?\b|\bmodern\s+chess\s+instructor\b/i, ids: ['steinitz-modern-chess-instructor'] },
];
const ALL_BOOKS = /\b(?:the|your|our)\s+(?:books|classics|library|old\s+masters'?\s+books)\b|\bthe\s+classic\s+books\b/i;

/** The words that frame a request, never part of its topic. */
const FRAME = /\b(?:what|does|did|do|would|say|says|said|teach|teaches|write|writes|wrote|think|thinks|explain|explains|recommend|me|about|on|regarding|concerning|from|according|to|using|out|of|in|read|find|show|tell|the|a|an|chapter|chapters|passage|section|part|page|book|books|how|handle|treat|his|her|their|please|can|you|could)\b/gi;
const NOT_A_TOPIC = /\b(?:this|that|these|here|my|move|moves|position|line)\b/i;

/** Read a request to be taught from the books, or null when it is not one.
 *  A source must be named (an author, a title, or "the books"); an ask about
 *  THIS board ("what do the books say about this move") is left to the
 *  opening/board lanes. */
export function parseBookRequest(ask: string): BookRequest | null {
  const text = ask.trim();
  if (!text) return null;
  let bookIds: string[] | null = null;
  let srcSpan: [number, number] | null = null;
  for (const s of SOURCES) {
    const m = s.re.exec(text);
    if (m) { bookIds = s.ids; srcSpan = [m.index, m.index + m[0].length]; break; }
  }
  if (!bookIds) {
    const m = ALL_BOOKS.exec(text);
    if (!m) return null;
    bookIds = [];
    srcSpan = [m.index, m.index + m[0].length];
  }
  // A teaching verb or framing must be present: "Lasker" alone is not a request.
  if (!/\b(?:say|says|said|teach|teaches|write|writes|wrote|think|thinks|explain|recommend|according\s+to|read|chapter|passage|section|from|out\s+of|handle|treat)\b/i.test(text)) return null;
  const withoutSource = (text.slice(0, srcSpan![0]) + ' ' + text.slice(srcSpan![1])).replace(/[?.!,;:"“”]/g, ' ');
  const about = /\b(?:about|on|regarding|concerning)\s+(.+?)\s*$/i.exec(withoutSource);
  const raw = (about ? about[1] : withoutSource).replace(FRAME, ' ').replace(/\s+/g, ' ').trim();
  if (raw && NOT_A_TOPIC.test(raw) && bookIds.length === 0) return null;
  return { bookIds, topic: raw.length >= 3 ? raw.toLowerCase() : null };
}

const STOP = new Set(['and', 'or', 'with', 'for', 'when', 'why', 'is', 'are', 'it', 'its', 'to', 'of', 'in', 'on', 'the', 'a', 'an', 'how', 'do', 'does', 'what']);

/** British and American spellings meet (the books use both), and the
 *  scanner's page markers ("{82}") go. */
function normalise(s: string): string {
  return s.toLowerCase()
    .replace(/\{\d+\}/g, ' ')
    .replace(/defense/g, 'defence').replace(/\bcenter/g, 'centre').replace(/offense/g, 'offence');
}

/** A word's stem: common endings off, so "forcing" and "forced" meet at
 *  "forc", "pawns" at "pawn", "attacking" at "attack". */
function stem(w: string): string {
  for (const end of ['ings', 'ing', 'ions', 'ion', 'ed', 'es', 's']) {
    if (w.endsWith(end) && w.length - end.length >= 4) return w.slice(0, -end.length);
  }
  return w;
}

/** The topic's words as stems, stop words out. */
export function topicStems(topic: string): string[] {
  const words = normalise(topic).split(/[^a-z]+/).filter((w) => w.length >= 3 && !STOP.has(w));
  return [...new Set(words.map(stem))];
}

const countOf = (hay: string, st: string): number => (hay.match(new RegExp(`\\b${st}`, 'g')) ?? []).length;

/** How much of a paragraph is moves rather than prose (descriptive "P-K4",
 *  "Kt-B3", "(12)" numbering or algebraic "Nf3"): a line of moves read aloud
 *  is not teaching. */
function notationShare(body: string): number {
  const words = body.split(/\s+/).length;
  const moves = (body.match(/\b(?:[KQRBP]|Kt)[x-][A-Za-z]{0,2}\d|\(\d+\)|\b[KQRBN]x?[a-h][1-8]\b|\b[a-h]x?[a-h]?[1-8]\b/g) ?? []).length;
  return words === 0 ? 1 : moves / words;
}

/** How much of a paragraph is scan debris: tokens that are neither words
 *  nor numbers ("‘.", "7]", "tbat"-style breaks show up as stray marks). */
function garbleShare(body: string): number {
  const toks = body.split(/\s+/);
  const bad = toks.filter((t) => /[\[\]{}|\\]|^[‘’'.]+$|[a-z][A-Z]{2,}|\d[a-z]{2,}/.test(t)).length;
  return toks.length === 0 ? 1 : bad / toks.length;
}

/** The paragraph in these books that teaches the topic best, or null.
 *  It must carry every topic word (most of them, for a long topic); then the
 *  topic recurring, a heading that names it, and prose over move lists decide.
 *  A fragment cut by a page break (starting mid-sentence) only wins when
 *  nothing whole does. Ties keep book and page order. */
export function findPassage(books: readonly TeachableBook[], topic: string): BookPassage | null {
  const stems = topicStems(topic);
  if (stems.length === 0) return null;
  const need = stems.length <= 2 ? stems.length : Math.ceil(stems.length * 0.6);
  let best: { p: BookPassage; score: number } | null = null;
  for (const book of books) {
    if (book.house) continue;
    book.pages.forEach((page, pageIndex) => {
      const heading = page.heading ?? '';
      const headLc = normalise(heading);
      for (const para of page.text.split(/\n\s*\n/)) {
        const body = para.replace(/\{\d+\}/g, ' ').replace(/\s+/g, ' ').trim();
        if (body.length < 80) continue;
        const lc = normalise(body);
        const found = stems.filter((st) => countOf(lc, st) > 0);
        if (found.length < need) continue;
        const recur = stems.reduce((n, st) => n + Math.min(countOf(lc, st), 6), 0);
        const fragment = /^[a-z]/.test(body) ? 25 : 0;
        // A paragraph ABOUT the topic names it in its first sentence.
        const first = lc.split(/(?<=[.!?])\s/)[0] ?? '';
        const topicSentence = stems.some((st) => countOf(first, st) > 0) ? 8 : 0;
        const score = found.length * 10 + recur * 3 + stems.filter((st) => countOf(headLc, st) > 0).length * 12
          + topicSentence - notationShare(body) * 60 - garbleShare(body) * 200 - fragment + Math.min(body.length, 600) / 300;
        if (!best || score > best.score) {
          best = { score, p: { bookId: book.id, bookTitle: book.bookTitle, author: book.author, pageIndex, heading: heading || null, paragraph: body } };
        }
      }
    });
  }
  return best ? (best as { p: BookPassage }).p : null;
}

/** The book's opening teaching (no topic named): its first substantive paragraph. */
export function openingPassage(book: TeachableBook): BookPassage | null {
  for (let i = 0; i < book.pages.length; i++) {
    const page = book.pages[i];
    const para = page.text.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).find((p) => p.length >= 120);
    if (para) return { bookId: book.id, bookTitle: book.bookTitle, author: book.author, pageIndex: i, heading: page.heading ?? null, paragraph: para };
  }
  return null;
}

export interface BookAnswer {
  text: string;
  /** The reader, opened at the page quoted. */
  path: string | null;
  /** The chat chip that opens it (`read_book`, id "<bookId>@<page>"). */
  offer: { type: 'read_book'; id: string } | null;
}

const cite = (p: BookPassage): string => `${p.author}, *${p.bookTitle}*${p.heading ? ` — ${p.heading}` : ''}`;
export const readerPath = (p: BookPassage): string => `/coach/library?book=${encodeURIComponent(p.bookId)}&page=${p.pageIndex}`;
const offerFor = (p: BookPassage): BookAnswer['offer'] => ({ type: 'read_book', id: `${p.bookId}@${p.pageIndex}` });

/** Teach from the books: the passage, quoted and cited, or an honest miss. */
export function answerFromBooks(req: BookRequest, library: readonly TeachableBook[]): BookAnswer {
  const named = req.bookIds.length > 0 ? library.filter((b) => req.bookIds.includes(b.id)) : library.filter((b) => !b.house);
  const whose = req.bookIds.length > 0 ? named.map((b) => `*${b.bookTitle}*`).join(' or ') : 'the books';
  if (!req.topic) {
    const p = named.length > 0 ? openingPassage(named[0]) : null;
    if (!p) return { text: `I couldn't find ${whose} in the library.`, path: null, offer: null };
    return { text: `${cite(p)}:\n\n“${p.paragraph}”\n\nThe book is open at that page in the library — ask me about any topic in it.`, path: readerPath(p), offer: offerFor(p) };
  }
  const hit = findPassage(named, req.topic);
  if (hit) return { text: `${cite(hit)}:\n\n“${hit.paragraph}”\n\nThe whole page is open in the library.`, path: readerPath(hit), offer: offerFor(hit) };
  if (req.bookIds.length > 0) {
    const elsewhere = findPassage(library.filter((b) => !req.bookIds.includes(b.id)), req.topic);
    if (elsewhere) {
      return {
        text: `${whose} doesn't take up “${req.topic}” — ${elsewhere.author} does, in *${elsewhere.bookTitle}*${elsewhere.heading ? ` — ${elsewhere.heading}` : ''}:\n\n“${elsewhere.paragraph}”`,
        path: readerPath(elsewhere),
        offer: offerFor(elsewhere),
      };
    }
  }
  return { text: `I looked through ${whose} and found no passage on “${req.topic}”.`, path: null, offer: null };
}

/** The coach's answer to a book request, or null when the ask is not one.
 *  The library (~1 MB of text) loads only here, on demand. */
export async function teachFromBooks(ask: string): Promise<BookAnswer | null> {
  const req = parseBookRequest(ask);
  if (!req) return null;
  const { COACHES_LIBRARY } = await import('../data/coachesLibrary');
  return answerFromBooks(req, COACHES_LIBRARY as unknown as TeachableBook[]);
}
