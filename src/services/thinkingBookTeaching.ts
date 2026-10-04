// thinkingBookTeaching — the masters' own words on each habit of "Learn how to
// think" (David 2026-10-04: "make use of the books we have … the relevant
// teachings from them").
//
// Every quote is VERBATIM from the public-domain books in the Coaches Library,
// fetched by BOOK id + PAGE id + an exact sentence span — never by a text
// search (walk 2026-10-04: a search taught hanging pieces with a pin passage).
// The span is located by its first and last words inside that one page, so a
// rebuilt book that moves a sentence fails the test instead of quoting the
// wrong lines. A step with no passage that genuinely teaches it is SILENT:
// forcing moves and answering the danger have none in these books, and a
// stretched quote is worse than none.
//
// `chess-concepts.json` is NOT used here: its passages are rewritten prose,
// not the authors' words, so it may never be quoted as theirs.
import type { LibraryBook } from '../data/coachesLibrary';
import type { ThinkingStep } from './thinkingSteps';

export interface BookCite {
  bookId: string;
  pageId: string;
  /** The span starts at the first occurrence of `from` on the page … */
  from: string;
  /** … and ends at the end of the first `to` after it (inclusive). */
  to: string;
  /** How the coach introduces it. */
  intro: string;
}

export const THINKING_BOOK: Partial<Record<ThinkingStep, BookCite>> = {
  'their-move-changed': {
    bookId: 'edward-lasker-chess-strategy', pageId: 'cs-1',
    from: 'After certain particular dispositions', to: 'second stage in his development.',
    intro: 'Edward Lasker describes this step in Chess Strategy:',
  },
  'am-i-safe': {
    bookId: 'edward-lasker-chess-strategy', pageId: 'cs-1',
    from: 'loss of material must be avoided', to: 'a prospective Queen.',
    intro: 'Edward Lasker’s rule, from Chess Strategy:',
  },
  'their-targets': {
    bookId: 'edward-lasker-chess-strategy', pageId: 'cs-1',
    from: 'in any combination which includes a number of exchanges', to: 'must never be forgotten.',
    intro: 'Edward Lasker, in Chess Strategy, on counting:',
  },
  'hit-two': {
    bookId: 'edward-lasker-chess-and-checkers', pageId: 'cc-28',
    from: 'The advantage of attacking two men at once', to: 'can be saved.',
    intro: 'As Edward Lasker puts it in Chess and Checkers:',
  },
  'is-my-move-safe': {
    bookId: 'capablanca-chess-fundamentals', pageId: 'cf-27',
    from: 'No reason can be given', to: 'actually existed.',
    intro: 'Capablanca, in Chess Fundamentals, on a game lost from a winning position:',
  },
};

/** The verbatim span for a citation, or null when the page or the anchors are
 *  gone (never a nearby guess). Pure: the book is passed in. */
export function bookSpan(cite: BookCite, book: LibraryBook | undefined): string | null {
  const page = book?.pages.find((p) => p.id === cite.pageId);
  if (!page) return null;
  const text = page.text.replace(/\s+/g, ' ');
  const start = text.indexOf(cite.from);
  if (start < 0) return null;
  const endAt = text.indexOf(cite.to, start);
  if (endAt < 0) return null;
  const span = text.slice(start, endAt + cite.to.length).trim();
  return span.charAt(0).toUpperCase() + span.slice(1);
}

/** What the coach says for a step: the introduction and the quote. The
 *  library (~780 KB) is loaded on demand, never in the Learn bundle. */
export async function bookTeachingFor(step: ThinkingStep): Promise<string | null> {
  const cite = THINKING_BOOK[step];
  if (!cite) return null;
  try {
    const { getLibraryBook } = await import('../data/coachesLibrary');
    const span = bookSpan(cite, getLibraryBook(cite.bookId));
    return span ? `${cite.intro} “${span}”` : null;
  } catch {
    return null;
  }
}
