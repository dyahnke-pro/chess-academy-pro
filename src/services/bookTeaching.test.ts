import { describe, it, expect } from 'vitest';
import { parseBookRequest, findPassage, answerFromBooks, topicStems, type TeachableBook } from './bookTeaching';
import { COACHES_LIBRARY } from '../data/coachesLibrary';

const LIB = COACHES_LIBRARY as unknown as TeachableBook[];

describe('parseBookRequest — a request to be taught from the books', () => {
  it('reads an author, a title or "the books", and the topic', () => {
    expect(parseBookRequest('What does Nimzowitsch say about the blockade?')).toEqual({ bookIds: ['nimzowitsch-my-system'], topic: 'blockade' });
    expect(parseBookRequest('what does capablanca teach about rook endings')).toEqual({ bookIds: ['capablanca-chess-fundamentals'], topic: 'rook endings' });
    expect(parseBookRequest('teach me about passed pawns from My System')?.topic).toBe('passed pawns');
    expect(parseBookRequest('what do the books say about the centre')).toEqual({ bookIds: [], topic: 'centre' });
    expect(parseBookRequest('What does Emanuel Lasker say about defence?')?.bookIds).toEqual(['emanuel-lasker-common-sense-in-chess']);
    expect(parseBookRequest('read me from Steinitz')).toEqual({ bookIds: ['steinitz-modern-chess-instructor'], topic: null });
  });

  it('is not a book request without a source, a teaching verb, or when it is about this board', () => {
    expect(parseBookRequest('what does the engine say about this')).toBeNull();
    expect(parseBookRequest('what do the books say about this move')).toBeNull();
    expect(parseBookRequest('is Lasker better than Capablanca')).toBeNull();
    expect(parseBookRequest("what's my best move")).toBeNull();
  });
});

describe('teaching from the real library', () => {
  it('stems the topic so plurals and -ing forms match', () => {
    expect(topicStems('passed pawns')).toEqual(['pass', 'pawn']);
    expect(topicStems('forcing moves')).toEqual(topicStems('forced move'));
    expect(topicStems('defense')).toEqual(topicStems('defence'));
    expect(topicStems('attacking the king')).toEqual(['attack', 'king']);
  });

  it('Nimzowitsch on the blockade: a My System paragraph that names it, quoted and cited, with the reader page', () => {
    const a = answerFromBooks(parseBookRequest('what does nimzowitsch say about the blockade')!, LIB);
    expect(a.text).toMatch(/^Aron Nimzowitsch, \*My System\*/);
    expect(a.text).toMatch(/blockad/i);
    expect(a.path).toMatch(/^\/coach\/library\?book=nimzowitsch-my-system&page=\d+$/);
    // Verbatim: the quoted paragraph is in the book.
    const quoted = /“([^”]+)”/.exec(a.text)?.[1] ?? '';
    const book = LIB.find((b) => b.id === 'nimzowitsch-my-system')!;
    expect(book.pages.some((p) => p.text.replace(/\s+/g, ' ').includes(quoted))).toBe(true);
  });

  it('"the books" searches every classic; the house book is never quoted as a master', () => {
    const p = findPassage(LIB, 'passed pawn');
    expect(p).not.toBeNull();
    expect(p!.bookId).not.toBe('philosophy-of-a-general');
  });

  it('a topic the named book does not take up says so, and offers a book that does', () => {
    const a = answerFromBooks({ bookIds: ['steinitz-modern-chess-instructor'], topic: 'blockade' }, LIB);
    expect(a.text).toMatch(/^\*The Modern Chess Instructor\* doesn't take up “blockade” — /);
  });

  it('a topic no book takes up is an honest miss, with no page', () => {
    const a = answerFromBooks({ bookIds: [], topic: 'quantum entanglement' }, LIB);
    expect(a.text).toBe('I looked through the books and found no passage on “quantum entanglement”.');
    expect(a.path).toBeNull();
  });

  it('no topic: the book\'s own opening teaching', () => {
    const a = answerFromBooks({ bookIds: ['emanuel-lasker-common-sense-in-chess'], topic: null }, LIB);
    expect(a.text).toMatch(/^Emanuel Lasker, \*Common Sense in Chess\*/);
    expect(a.path).toMatch(/book=emanuel-lasker-common-sense-in-chess&page=\d+/);
  });
});

describe('chapters by number — the reader opens there', () => {
  it('reads "chapter 13 of Chess Fundamentals" and "lecture IX from Lasker"', async () => {
    const { parseBookRequest, answerFromBooks } = await import('./bookTeaching');
    const r = parseBookRequest('teach me chapter 13 of Chess Fundamentals');
    expect(r).toMatchObject({ bookIds: ['capablanca-chess-fundamentals'], chapter: '13' });
    const a = answerFromBooks(r!, LIB);
    expect(a.text).toMatch(/13\. THE OPPOSITION/);
    expect(a.path).toMatch(/book=capablanca-chess-fundamentals&page=\d+/);
    const l = answerFromBooks(parseBookRequest('read me lecture IX from Lasker')!, LIB);
    expect(l.text).toMatch(/Lecture 9/);
  });

  it('a chapter the book does not have is said plainly', async () => {
    const { answerFromBooks } = await import('./bookTeaching');
    expect(answerFromBooks({ bookIds: ['steinitz-modern-chess-instructor'], topic: null, chapter: '40' }, LIB).text)
      .toBe("I couldn't find chapter 40 in *The Modern Chess Instructor*.");
  });
});
