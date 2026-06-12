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

export interface BookCitation {
  /** Publisher, place, year of the edition we reproduce. */
  readonly edition: string;
  /** Translator / "English version by", when applicable. */
  readonly translator?: string;
  /** Plain-language public-domain basis statement. */
  readonly publicDomain: string;
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
  /** True = on the shelf, not yet brought to life (text/positions pending). */
  readonly comingToLife?: boolean;
  readonly pages: ReadonlyArray<LibraryPage>;
}

// ── Capablanca, Chess Fundamentals (1921, public domain) ─────────────────────
const CAPABLANCA_CHESS_FUNDAMENTALS: LibraryBook = {
  id: 'capablanca-chess-fundamentals',
  bookTitle: 'Chess Fundamentals',
  author: 'José Raúl Capablanca',
  citation: {
    edition: 'Harcourt, Brace and Company, New York, 1921',
    publicDomain: 'Published 1921. In the public domain in the United States.',
    sourceLabel: 'Project Gutenberg (ebook #33870)',
    sourceUrl: 'https://www.gutenberg.org/ebooks/33870',
  },
  shelfNote: 'The 1921 classic — first principles of endings, middlegame and openings.',
  pages: [
    {
      id: 'cf-mg-ex11',
      heading: 'Some Winning Positions in the Middle-game — Example 11',
      text:
        'It is Black’s move, and thinking that White merely threatens to play ' +
        'Q-R6 and to mate at KKt7, Black plays 1...R-K1, threatening mate by way ' +
        'of R-K8. White now uncovers his real and most effective threat, viz.: ' +
        '1...R-K1; 2 QxP ch, KxQ; 3 R-R3 ch, K-Kt1; 4 R-R8 mate.',
    },
    {
      id: 'cf-mg-ex12',
      heading: 'Example 12',
      text:
        'This same type of combination may come as the result of a somewhat more ' +
        'complicated position. White is a piece behind, and unless he can win it ' +
        'back quickly he will lose; he therefore plays: 1 KtxKt, B-Kt4. He cannot ' +
        'take the Kt because White threatens mate by QxP ch followed by R-R3 ch. ' +
        '2 Kt-K7 ch, QxKt; 3 RxQ, BxR; 4 Q-Q7 and White wins one of the two ' +
        'Bishops, remains with a Queen and a Bishop against a Rook and Bishop, and ' +
        'should therefore win easily.\n\nThese two examples show the danger of ' +
        'advancing the KKtP one square, after having Castled on that side.',
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
    {
      id: 'cf-mg-coordination',
      heading: 'The Principle Behind Them',
      text:
        'It will be seen that all the combinations shown have for a foundation ' +
        'the proper co-ordination of the pieces, which have all been brought to ' +
        'bear against a weak point.',
    },
  ],
};

// ── Nimzowitsch, My System (1930 Hereford edition, public domain) ────────────
// Text reproduced from the public-domain Harcourt Brace 1930 edition (Internet
// Archive). The pawn-chain Nimzowitsch defines is the French Advance; the live
// board is that chain and Black's strike at its base — chess.js-validated.
const NIMZOWITSCH_MY_SYSTEM: LibraryBook = {
  id: 'nimzowitsch-my-system',
  bookTitle: 'My System',
  author: 'Aron Nimzowitsch',
  citation: {
    edition: 'Harcourt, Brace and Company, New York, 1930',
    translator: 'Philip Hereford',
    publicDomain: 'Published 1930. In the public domain in the United States (since 1 January 2026).',
    sourceLabel: 'Internet Archive',
    sourceUrl: 'https://archive.org/details/mysystemchesstre0000aron',
  },
  shelfNote: 'The middlegame bible — the pawn chain, the outpost, prophylaxis.',
  pages: [
    {
      id: 'ms-chain-def',
      heading: 'Chapter XI — The Pawn-Chain · §1. The base of the chain',
      text:
        'After 1. P-K4, P-K3; 2. P-Q4, P-Q4; 3. P-K5, a Black and White ' +
        'pawn-chain has been formed. The Pawns at Q4, K5, and at K3, Q4 are the ' +
        'several links in the chain. The Pawn at Q4 is to be regarded as the base ' +
        'or foot of the White chain, while the Pawn at K3 plays a like rôle in ' +
        'Black’s. Accordingly we call the bottommost link of the chain, on which ' +
        'all the other links depend, the base.',
      board: {
        // After 1.e4 e6 2.d4 d5 3.e5 — the chain e5–d4 (base d4) vs e6–d5.
        fen: 'rnbqkbnr/ppp2ppp/4p3/3pP3/3P4/8/PPP2PPP/RNBQKBNR b KQkq - 0 3',
        moves: ['c5', 'c3', 'Nc6', 'Nf3', 'Qb6', 'Be2', 'cxd4', 'cxd4'],
        orientation: 'white',
        caption: 'The chain is set — Black strikes the base (d4)',
      },
    },
    {
      id: 'ms-chain-attack-base',
      heading: '§2. The attack against the base',
      text:
        'To recapitulate: P-K5, that is to say the formation of a pawn-chain, ' +
        'always creates two theatres of war, of which the enemy wing, cramped by ' +
        'the advance, forms one, and the base of the enemy pawn-chain the other. ' +
        'And further, P-K5 is inspired by the desire to attack.\n\nThe attack on ' +
        'Black’s PQ4 which was present before the advance of our KP has been ' +
        'transferred to Black’s PK3, which has been reduced to immobility by our ' +
        'PK5, so as to be exposed to a flank attack by P-KB4-B5.',
    },
  ],
};

// ── The rest of the shelf — coming to life as text + positions are digitized ─
const SHELF: ReadonlyArray<LibraryBook> = [
  {
    id: 'edward-lasker-chess-strategy',
    bookTitle: 'Chess Strategy',
    author: 'Edward Lasker',
    citation: {
      edition: 'E. P. Dutton and Company, New York, 1915',
      translator: 'J. du Mont (English edition)',
      publicDomain: 'Published 1915. In the public domain.',
      sourceLabel: 'Project Gutenberg (ebook #5614)',
      sourceUrl: 'https://www.gutenberg.org/ebooks/5614',
    },
    shelfNote: 'The middlegame and positional play — weak squares, the chain, the file.',
    comingToLife: true,
    pages: [],
  },
  {
    id: 'edward-lasker-chess-and-checkers',
    bookTitle: 'Chess and Checkers',
    author: 'Edward Lasker',
    citation: {
      edition: 'E. P. Dutton and Company, New York, 1918',
      publicDomain: 'Published 1918. In the public domain.',
      sourceLabel: 'Project Gutenberg (ebook #4913)',
      sourceUrl: 'https://www.gutenberg.org/ebooks/4913',
    },
    shelfNote: 'The way to mastership — how the pieces cooperate.',
    comingToLife: true,
    pages: [],
  },
];

export const COACHES_LIBRARY: ReadonlyArray<LibraryBook> = [
  CAPABLANCA_CHESS_FUNDAMENTALS,
  NIMZOWITSCH_MY_SYSTEM,
  ...SHELF,
];

export function getLibraryBook(id: string): LibraryBook | undefined {
  return COACHES_LIBRARY.find((b) => b.id === id);
}
