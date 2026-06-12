// The Coaches Library — our books, brought to life.
//
// SUPREME LAW (G0): the LLM authors NO words here. Every page's text is the
// book's OWN public-domain prose, reproduced faithfully (OCR de-garbled to the
// printed text, never paraphrased), and read aloud by the voice engine. Every
// board is FACTS — the position + moves are chess.js-validated, and where the
// original printed a drawn diagram we render a LIVE, playable board in its
// place. Nothing on this surface is invented.
//
// GOING TO MARKET — CITATIONS (David 2026-06-12): every book carries a full
// `citation` (edition, translator, publisher, year, public-domain basis, and
// the digitization source). We use ONLY editions that are public domain in the
// United States. Note the My System trap: the modern "21st Century Edition"
// (algebraic, 1991) is COPYRIGHTED and must never be used; we use the 1930
// Harcourt Brace edition (Philip Hereford's English version), public domain in
// the US since 1 Jan 2026.

import { PHILOSOPHY_OF_A_GENERAL } from './academy/philosophyOfAGeneral';
import mySystemData from './library/my-system.json';
import chessAndCheckersData from './library/chess-and-checkers.json';
import chessFundamentalsData from './library/chess-fundamentals.json';
import chessStrategyData from './library/chess-strategy.json';

export interface BookCitation {
  /** Publisher, place, year of the edition we reproduce (or "our work"). */
  readonly edition: string;
  /** Translator / "English version by", when applicable. */
  readonly translator?: string;
  /** Plain-language rights basis — "In the public domain…" for the classics,
   *  or our own copyright line for the house book. */
  readonly rights: string;
  /** Where the digitized text/scan comes from. */
  readonly sourceLabel: string;
  readonly sourceUrl: string;
}

export interface LivingBoard {
  /** chess.js-validated starting position (the book's diagram). */
  readonly fen: string;
  /** The book's line from that position, SAN, validated move-for-move. */
  readonly moves: ReadonlyArray<string>;
  readonly orientation: 'white' | 'black';
  /** Factual caption only (e.g. "White to play") — never teaching prose. */
  readonly caption: string;
}

export interface LibraryPage {
  readonly id: string;
  /** The book's own label for this page (e.g. "Example 13"). Factual. */
  readonly heading?: string;
  /** VERBATIM public-domain book text. Paragraphs split on a blank line.
   *  This is what is read aloud — authored by the master, not by us. */
  readonly text: string;
  /** When the book printed a diagram here, the live board that replaces it. */
  readonly board?: LivingBoard;
}

export interface LibraryBook {
  readonly id: string;
  readonly bookTitle: string;
  readonly author: string;
  readonly citation: BookCitation;
  /** The book's own catalogue subtitle / one-line factual descriptor. */
  readonly shelfNote: string;
  /** True = our own book (the house book), leads the shelf. */
  readonly house?: boolean;
  /** True = on the shelf, not yet brought to life (text/positions pending). */
  readonly comingToLife?: boolean;
  readonly pages: ReadonlyArray<LibraryPage>;
}

// ── Capablanca, Chess Fundamentals (1921, public domain) ─────────────────────
// The ENTIRE book ingested by scripts/build-library-capablanca.mjs (full clean
// Gutenberg prose; dense move-analysis filtered out of the audio). Capablanca's
// diagrams are IMAGES, so they can't be auto-extracted; the hand-validated
// combination boards (Examples 11 & 13) are spliced into the middle-game spot.
const CF_COMBINATION_PAGES: ReadonlyArray<LibraryPage> = [
  {
    id: 'cf-mg-ex11',
    heading: 'Some Winning Positions in the Middle-game — Example 11',
    text:
      'It is Black’s move, and thinking that White merely threatens to play ' +
      'Q-R6 and to mate at KKt7, Black plays 1...R-K1, threatening mate by way ' +
      'of R-K8. White now uncovers his real and most effective threat, viz.: ' +
      '1...R-K1; 2 QxP ch, KxQ; 3 R-R3 ch, K-Kt1; 4 R-R8 mate.',
    board: {
      fen: '5rk1/1b3p1p/ppq3p1/3p4/8/1P1P1R1Q/PBP3PP/6K1 b - - 0 1',
      moves: ['Re8', 'Qxh7+', 'Kxh7', 'Rh3+', 'Kg8', 'Rh8#'],
      orientation: 'white',
      caption: 'Black to move — White’s hidden mate',
    },
  },
  {
    id: 'cf-mg-ex13',
    heading: 'Example 13',
    text:
      'This is another very interesting type of combination. Black has a Rook ' +
      'for a Knight and should therefore win, unless White is able to obtain ' +
      'some compensation immediately. White, in fact, mates in a few moves ' +
      'thus: 1 Kt-B6 ch, PxKt (forced, otherwise QxP mates); 2 Q-Kt3 ch, K-R1; ' +
      '3 BxP mate.',
    board: {
      fen: '2q2rk1/1b3ppp/pp6/2p5/2P1N3/PP1Q4/1B3PPP/6K1 w - - 0 1',
      moves: ['Nf6+', 'gxf6', 'Qg3+', 'Kh8', 'Bxf6#'],
      orientation: 'white',
      caption: 'White to play and mate',
    },
  },
];

const CAPABLANCA_CHESS_FUNDAMENTALS: LibraryBook = (() => {
  const ingested = chessFundamentalsData.pages as LibraryPage[];
  const at = Math.max(0, ingested.findIndex((p) => /RELATIVE VALUE/i.test(p.heading)));
  const pages =
    at > 0
      ? [...ingested.slice(0, at), ...CF_COMBINATION_PAGES, ...ingested.slice(at)]
      : [...ingested, ...CF_COMBINATION_PAGES];
  return {
    id: chessFundamentalsData.id,
    bookTitle: chessFundamentalsData.bookTitle,
    author: chessFundamentalsData.author,
    citation: chessFundamentalsData.citation as BookCitation,
    shelfNote: 'The 1921 classic — first principles of endings, middlegame and openings.',
    pages,
  };
})();

// ── Nimzowitsch, My System (1930 Hereford edition, public domain) ────────────
// The ENTIRE book, ingested from the public-domain Harcourt Brace 1930 edition
// (Internet Archive) by scripts/build-library-mysystem.mjs → my-system.json:
// every chapter, paginated by section, read aloud. The dense move-analysis OCR
// is filtered out of the spoken prose (it belongs on the boards). Validated
// live boards are merged onto their diagram pages by a text marker.
const MY_SYSTEM_BOARDS: ReadonlyArray<{ match: string; board: LivingBoard }> = [
  {
    match: 'Black and White pawn-chain has been formed',
    board: {
      // After 1.e4 e6 2.d4 d5 3.e5 — the chain e5–d4 (base d4) vs e6–d5.
      fen: 'rnbqkbnr/ppp2ppp/4p3/3pP3/3P4/8/PPP2PPP/RNBQKBNR b KQkq - 0 3',
      moves: ['c5', 'c3', 'Nc6', 'Nf3', 'Qb6', 'Be2', 'cxd4', 'cxd4'],
      orientation: 'white',
      caption: 'The chain is set — Black strikes the base (d4)',
    },
  },
];

const NIMZOWITSCH_MY_SYSTEM: LibraryBook = {
  id: mySystemData.id,
  bookTitle: mySystemData.bookTitle,
  author: mySystemData.author,
  citation: mySystemData.citation as BookCitation,
  shelfNote: 'The middlegame bible — the pawn chain, the outpost, prophylaxis.',
  pages: (mySystemData.pages as LibraryPage[]).map((pg) => {
    const hit = MY_SYSTEM_BOARDS.find((b) => pg.text.includes(b.match));
    return hit ? { ...pg, board: hit.board } : pg;
  }),
};

// ── Edward Lasker, Chess Strategy — the ENTIRE book ingested ─────────────────
// Full Gutenberg prose (scripts/build-library-chessstrategy.mjs). Heavily
// game-based, so the read-aloud is the conceptual chapter prose (the game
// analysis is filtered out — it belongs on boards, not yet extracted from its
// image diagrams). Three hand-polished highlight pages lead the book.
const CS_CURATED: ReadonlyArray<LibraryPage> = [
  {
    id: 'cs-mobility',
    heading: 'Chapter III — General Principles of Chess Strategy · Mobility',
    text:
      'For quick development is of the utmost importance, and he who succeeds ' +
      'first in placing all his pieces, from their initial awkward positions, ' +
      'to such places as give them command of the greatest possible number of ' +
      'squares, has the better chance of concentrating a superior force on some ' +
      'important point. It follows that White, having the first move, is, so to ' +
      'speak, always morally justified in attacking, whilst Black should assume ' +
      'the defensive.',
  },
  {
    id: 'cs-pawn-permanence',
    heading: 'Mobility — the pawns',
    text:
      'Pawn formation is of a more permanent character than that of the pieces, ' +
      'in consequence of the latter’s greater mobility. When we have made a rash ' +
      'move with a piece, to which our attacking disposition may have tempted ' +
      'us, we may still have a chance of retrieving the position by timely ' +
      'retreat. Once a pawn has moved it cannot turn back.',
  },
  {
    id: 'cs-pawn-skeleton',
    heading: 'The Pawn Skeleton',
    text:
      'As a consequence of the pawns having so little mobility, this “pawn ' +
      'skeleton” often preserves its shape right into the end-game. Applying ' +
      'the general strategical principles to the formation of the pawn skeleton, ' +
      'the learner acquires the understanding of the leading idea underlying ' +
      'each opening without having to burden his memory.',
  },
];

const EDWARD_LASKER_CHESS_STRATEGY: LibraryBook = {
  id: chessStrategyData.id,
  bookTitle: chessStrategyData.bookTitle,
  author: chessStrategyData.author,
  citation: chessStrategyData.citation as BookCitation,
  shelfNote: 'The middlegame and positional play — weak squares, the chain, the file.',
  pages: [...CS_CURATED, ...(chessStrategyData.pages as LibraryPage[])],
};

// ── Edward Lasker, Chess and Checkers — the ENTIRE book, auto-animated ────────
// Ingested by scripts/build-library-chessandcheckers.mjs: every chapter read
// aloud, and EVERY printed diagram auto-extracted from the book's own ASCII
// boards into a LIVE board, with the adjacent algebraic line chess.js-validated
// (most animate; pure study positions stay as the position). Born-digital
// Gutenberg text, so the prose is clean.
const EDWARD_LASKER_CHESS_AND_CHECKERS: LibraryBook = {
  id: chessAndCheckersData.id,
  bookTitle: chessAndCheckersData.bookTitle,
  author: chessAndCheckersData.author,
  citation: chessAndCheckersData.citation as BookCitation,
  shelfNote: 'The way to mastership — how the pieces cooperate.',
  pages: chessAndCheckersData.pages as LibraryPage[],
};

// ── Our book — the house book, leading the shelf ─────────────────────────────
// "The Philosophy of A General" is our OWN authored doctrine (not a master's
// text), so unlike the public-domain classics we may write its words — and we
// own them. Adapted from the Academy manuscript: each chapter is a page, read
// the same audiobook way (board-free doctrine; live boards can be added later).
const HOUSE_BOOK: LibraryBook = {
  id: 'philosophy-of-a-general',
  bookTitle: PHILOSOPHY_OF_A_GENERAL.title,
  author: 'Chess Academy Pro',
  citation: {
    edition: 'Chess Academy Pro — original work',
    rights: '© Chess Academy Pro. Our own book, written for this app.',
    sourceLabel: 'Chess Academy Pro',
    sourceUrl: 'https://chess-academy-pro.vercel.app',
  },
  shelfNote: PHILOSOPHY_OF_A_GENERAL.subtitle,
  house: true,
  pages: PHILOSOPHY_OF_A_GENERAL.chapters.map((ch) => ({
    id: `pog-${ch.id}`,
    heading: `${ch.label} · ${ch.title}`,
    text: ch.paragraphs.join('\n\n'),
  })),
};

export const COACHES_LIBRARY: ReadonlyArray<LibraryBook> = [
  HOUSE_BOOK,
  CAPABLANCA_CHESS_FUNDAMENTALS,
  NIMZOWITSCH_MY_SYSTEM,
  EDWARD_LASKER_CHESS_AND_CHECKERS,
  EDWARD_LASKER_CHESS_STRATEGY,
];

export function getLibraryBook(id: string): LibraryBook | undefined {
  return COACHES_LIBRARY.find((b) => b.id === id);
}
