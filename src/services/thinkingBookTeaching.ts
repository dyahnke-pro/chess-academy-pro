// thinkingBookTeaching — what the classic books teach about each habit of
// "Learn how to think", said in the coach's own words (David 2026-10-04: "We
// don't need to be quoting the books, just making sure the coach can teach the
// information").
//
// Each line TRANSLATES an idea a public-domain book in the Coaches Library
// teaches (the doctrine: the books own the IDEAS, the coach phrases them). The
// source is recorded by book id + page id + the sentence the idea comes from,
// and a test checks that sentence is still on that page — so the teaching
// stays grounded in the book even though the book is not read aloud.
//
// A step the books do not teach is SILENT (today: finding the candidates): no
// stretched idea. `chess-concepts.json` is not a source here — its
// passages are rewritten prose, not the books.
import type { LibraryBook } from '../data/coachesLibrary';
import type { ThinkingStep } from './thinkingSteps';

export interface BookIdea {
  /** The coach's own words for the book's idea. Code-authored, never a model. */
  teach: string;
  /** Where the idea comes from (recorded, checked by test, not spoken). */
  source: { bookId: string; pageId: string; anchor: string };
}

export const THINKING_BOOK: Partial<Record<ThinkingStep, BookIdea>> = {
  assess: {
    teach: 'Every move does one of three jobs: it brings a new piece into play, it attacks, or it defends. Which job you need is decided by the position, so read the position before you choose.',
    source: { bookId: 'emanuel-lasker-common-sense-in-chess', pageId: 'csc-6', anchor: 'What kind of move is required is determined by the exigencies of the position' },
  },
  'their-move-changed': {
    teach: 'Every player gets better at this the same way: by learning to sense danger one or two moves before it lands. The habit is simply asking it every move.',
    source: { bookId: 'edward-lasker-chess-strategy', pageId: 'cs-1', anchor: 'the beginner will develop the perception of threats' },
  },
  'am-i-safe': {
    teach: 'Treat losing material as off-limits, even a single pawn — any pawn can become a queen.',
    source: { bookId: 'edward-lasker-chess-strategy', pageId: 'cs-1', anchor: 'loss of material must be avoided' },
  },
  'answer-danger': {
    teach: 'A threat asks you one question before any other: can you let them do it, or must you stop it? Answer that first, then look for the move that stops it.',
    source: { bookId: 'james-mason-the-art-of-chess', pageId: 'aoc-19', anchor: 'Can I let him do it (if anything), or must I stop his little game?' },
  },
  'their-targets': {
    teach: 'When pieces can trade on one square, just count: how many attack it, how many defend it — and never forget what each of them is worth.',
    source: { bookId: 'edward-lasker-chess-strategy', pageId: 'cs-1', anchor: 'count the number of attacking and defending units' },
  },
  'forcing-moves': {
    teach: 'Moves that force the reply leave the other side very few choices, so the lines stay few enough to work out exactly. That is why the forcing moves get looked at first.',
    source: { bookId: 'emanuel-lasker-common-sense-in-chess', pageId: 'csc-6', anchor: 'on account of the many forced moves on the part of the defence, are usually few, and therefore subject to direct analysis' },
  },
  'hit-two': {
    teach: 'Chasing one piece away usually achieves nothing. Hit two at once and they can save only one.',
    source: { bookId: 'edward-lasker-chess-and-checkers', pageId: 'cc-28', anchor: 'The advantage of attacking two men at once' },
  },
  calculate: {
    teach: 'Often you have to see many moves ahead to find the right line — and with care you can see every consequence with certainty.',
    source: { bookId: 'edward-lasker-chess-strategy', pageId: 'cs-4', anchor: 'consider many moves ahead' },
  },
  'is-my-move-safe': {
    teach: 'Games are thrown away from winning positions by players who felt so safe they stopped looking for danger. Check every move, especially when you are ahead.',
    source: { bookId: 'capablanca-chess-fundamentals', pageId: 'cf-27', anchor: 'did not consider the danger that actually existed' },
  },
};

/** Whether the idea's source sentence is still on its page (test helper; a
 *  rebuilt book that moves it fails the test rather than drifting). */
export function sourceStillThere(idea: BookIdea, book: LibraryBook | undefined): boolean {
  const page = book?.pages.find((p) => p.id === idea.source.pageId);
  return !!page && page.text.replace(/\s+/g, ' ').includes(idea.source.anchor);
}

/** The coach's teaching line for a step, or null when the books are silent. */
export function bookTeachingFor(step: ThinkingStep): Promise<string | null> {
  return Promise.resolve(THINKING_BOOK[step]?.teach ?? null);
}
