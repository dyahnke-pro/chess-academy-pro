// The Coaches Library — our books, brought to life.
//
// SUPREME LAW (G0): the LLM authors NO words here. Every page's text is the
// book's OWN verbatim public-domain prose, read aloud by the voice engine.
// Every board is FACTS — the position + moves are chess.js-validated, and
// where the original book printed a drawn diagram we render a LIVE, playable
// board in its place. Nothing on this surface is invented.
//
// A book "comes to life" when we have BOTH its public-domain TEXT and the
// digitized positions for its diagrams. Books we have on the shelf but whose
// clean public-domain text / positions aren't ingested yet are listed with
// `comingToLife: true` (honest: on the shelf, not yet alive).

export interface LivingBoard {
  /** chess.js-validated starting position (read off the book's diagram). */
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
  /** Project Gutenberg id when the public-domain text lives there. */
  readonly gutenbergId?: number;
  /** The book's own catalogue subtitle / one-line factual descriptor. */
  readonly shelfNote: string;
  /** True = on the shelf, not yet brought to life (text/positions pending). */
  readonly comingToLife?: boolean;
  readonly pages: ReadonlyArray<LibraryPage>;
}

// ── Capablanca, Chess Fundamentals — the first fully-alive book ──────────────
// Public-domain text from Project Gutenberg 33870. The three combinations of
// "Some Winning Positions in the Middle-game" (Examples 11–13); Example 13's
// drawn diagram (Fig13) becomes a live board. FEN + line chess.js-validated to
// mate (see middlegameBookLessons.test.ts).

const CAPABLANCA_CHESS_FUNDAMENTALS: LibraryBook = {
  id: 'capablanca-chess-fundamentals',
  bookTitle: 'Chess Fundamentals',
  author: 'José Raúl Capablanca',
  gutenbergId: 33870,
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

// ── The rest of the shelf ────────────────────────────────────────────────────
// On the shelf; brought to life as their text + positions are digitized.
const SHELF: ReadonlyArray<LibraryBook> = [
  {
    id: 'edward-lasker-chess-strategy',
    bookTitle: 'Chess Strategy',
    author: 'Edward Lasker',
    gutenbergId: 5614,
    shelfNote: 'The middlegame and positional play — weak squares, the chain, the file.',
    comingToLife: true,
    pages: [],
  },
  {
    id: 'nimzowitsch-my-system',
    bookTitle: 'My System',
    author: 'Aron Nimzowitsch',
    shelfNote: 'The middlegame bible — the pawn chain, the outpost, prophylaxis. (1929 text pending.)',
    comingToLife: true,
    pages: [],
  },
  {
    id: 'edward-lasker-chess-and-checkers',
    bookTitle: 'Chess and Checkers',
    author: 'Edward Lasker',
    gutenbergId: 4913,
    shelfNote: 'The way to mastership — how the pieces cooperate.',
    comingToLife: true,
    pages: [],
  },
];

export const COACHES_LIBRARY: ReadonlyArray<LibraryBook> = [
  CAPABLANCA_CHESS_FUNDAMENTALS,
  ...SHELF,
];

export function getLibraryBook(id: string): LibraryBook | undefined {
  return COACHES_LIBRARY.find((b) => b.id === id);
}
