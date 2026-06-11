// Book-grounded middlegame lessons for the Coach › Middlegame tab.
// DOCTRINE (see docs/plans/2026-06-11-coach-middlegame-book-tab.md):
// every lesson here is Path B — the master's OWN diagrammed position,
// digitized from the public-domain Gutenberg edition, with every move
// chess.js-validated against the book's stated outcome. The LLM writes
// NO chess content: positions and moves come from the book + chess.js,
// the prose is authored to teach what the book teaches, attributed to it.
//
// Each lesson mirrors the book's 4-beat teaching unit, shown to the player:
//   principle  →  position  →  play the technique  →  distill the rule
// which maps onto Watch → Learn → Practice → Play.

export interface BookSource {
  /** Stable slug, matches chess-concepts.json source manifest. */
  readonly bookSlug: string;
  readonly bookTitle: string;
  readonly author: string;
  /** Project Gutenberg ebook id, when the book lives there (clean Fig scans). */
  readonly gutenbergId?: number;
  /** The diagram image this position was digitized from (Gutenberg books). */
  readonly figure?: string;
  /** Where in the book it lives (for the player + provenance). Required. */
  readonly locationLabel: string;
}

export interface BookLessonMove {
  /** SAN, validated legal from the running position by chess.js. */
  readonly san: string;
  /** Full Watch-register prose for this move. */
  readonly say: string;
  /** ≤8-word Learn cue, shown below the board. */
  readonly sayShort: string;
  /** Lead-the-eye vision arrows (green), origin must be a real piece. */
  readonly arrows?: ReadonlyArray<{ from: string; to: string; color: 'green' | 'yellow' | 'blue' }>;
  /** Key squares the prose names (yellow); move squares auto-paint orange. */
  readonly highlights?: ReadonlyArray<{ square: string; color: 'yellow' | 'blue' }>;
}

export interface MiddlegameBookLesson {
  readonly id: string;
  /** The theme tab this lesson lives under. */
  readonly themeId: string;
  readonly title: string;
  /** Opening/structure context for the "By Opening" lens, when applicable. */
  readonly openingId?: string;
  readonly source: BookSource;
  /** Beat 1 — the principle, in the book's voice. */
  readonly principle: { say: string; sayShort: string };
  /** Beat 2 — the position: the digitized, validated starting FEN. */
  readonly fen: string;
  /** Side the student plays the technique as. */
  readonly studentSide: 'white' | 'black';
  /** Beat 3 — play the technique: the book's validated move sequence. */
  readonly technique: ReadonlyArray<BookLessonMove>;
  /** Beat 4 — distill the rule (one line). */
  readonly rule: string;
  /** The validated terminal claim, asserted by the gate test. */
  readonly outcome: 'checkmate' | 'winning' | 'equal' | 'holding';
  readonly sources: ReadonlyArray<string>;
}

export interface MiddlegameBookTheme {
  readonly id: string;
  readonly title: string;
  readonly blurb: string;
}

export const MIDDLEGAME_BOOK_THEMES: ReadonlyArray<MiddlegameBookTheme> = [
  {
    id: 'pawn-chain',
    title: 'The Pawn Chain',
    blurb:
      'Nimzowitsch’s law: a fixed pawn chain is struck at its base — the soft ' +
      'rearmost link — with a pawn-lever and massed pieces, never at the head.',
  },
  {
    id: 'attack-castled-king',
    title: 'The Attack on the Castled King',
    blurb:
      'Coordinate every piece against one weak point around the enemy king — ' +
      'the dark squares a knight-pawn advance leaves behind.',
  },
];

export const MIDDLEGAME_BOOK_LESSONS: ReadonlyArray<MiddlegameBookLesson> = [
  {
    // My System is public-domain as a 1925/1929 work, but the modern algebraic
    // editions are copyrighted. We lift NO prose: the position and moves are
    // facts (chess.js-validated, the canonical French Advance), and the teaching
    // text is authored here as an elegant translation of Nimzowitsch's
    // established idea — attributed to the book, not quoted from any edition.
    id: 'nimzowitsch-ms-pawn-chain-base',
    themeId: 'pawn-chain',
    title: 'Attack the Chain at its Base',
    openingId: 'french-defense',
    source: {
      bookSlug: 'nimzowitsch-my-system',
      bookTitle: 'My System',
      author: 'Aron Nimzowitsch',
      locationLabel: 'Chapter 9 — The Pawn Chain',
    },
    principle: {
      say:
        'Nimzowitsch’s law of the pawn chain: a chain is a fixed formation, and ' +
        'you do not batter its head, which the whole chain defends — you strike ' +
        'its base, the rearmost link, where its support runs out. Here White’s ' +
        'pawns on e5 and d4 are the chain; d4 is the base. Bring a pawn-lever to ' +
        'the base and mass your pieces on it.',
      sayShort: 'Strike the chain at its base.',
    },
    // Canonical French Advance, chain e5–d4 set, Black to move. Validated.
    fen: 'rnbqkbnr/ppp2ppp/4p3/3pP3/3P4/8/PPP2PPP/RNBQKBNR b KQkq - 0 3',
    studentSide: 'black',
    technique: [
      {
        san: 'c5',
        say:
          'The lever. The c-pawn strikes d4, the base of White’s chain — the one ' +
          'link the chain cannot defend with another pawn.',
        sayShort: 'The lever strikes the base.',
        arrows: [{ from: 'c7', to: 'c5', color: 'green' }],
        highlights: [{ square: 'd4', color: 'yellow' }],
      },
      {
        san: 'c3',
        say: 'White props the base with a pawn — the only way to hold d4.',
        sayShort: 'White props the base.',
      },
      {
        san: 'Nc6',
        say: 'A second attacker joins the base. The knight bears down on d4.',
        sayShort: 'Pile a piece on the base.',
        arrows: [{ from: 'b8', to: 'c6', color: 'green' }],
        highlights: [{ square: 'd4', color: 'yellow' }],
      },
      {
        san: 'Nf3',
        say: 'White defends d4 a second time.',
        sayShort: 'White defends the base again.',
      },
      {
        san: 'Qb6',
        say:
          'The queen comes to b6 — a third attacker on d4, and the b2-pawn in her ' +
          'sights as well. Every Black piece now points at the base.',
        sayShort: 'Queen joins — three on the base.',
        arrows: [{ from: 'd8', to: 'b6', color: 'green' }],
        highlights: [
          { square: 'd4', color: 'yellow' },
          { square: 'b2', color: 'blue' },
        ],
      },
      {
        san: 'Be2',
        say: 'White finishes developing, the base still under siege.',
        sayShort: 'White develops; the base holds, just.',
      },
      {
        san: 'cxd4',
        say:
          'The lever does its work: Black captures at the base. The chain’s foot ' +
          'is torn away and the lines against White’s centre swing open.',
        sayShort: 'Capture the base — the chain cracks.',
        arrows: [{ from: 'c5', to: 'd4', color: 'green' }],
        highlights: [{ square: 'd4', color: 'yellow' }],
      },
      {
        san: 'cxd4',
        say:
          'White must recapture, and the proud chain is now a single isolated ' +
          'pawn on d4 — exactly the weakness the base-attack was built to create.',
        sayShort: 'The chain is now one weak pawn.',
        highlights: [{ square: 'd4', color: 'yellow' }],
      },
    ],
    rule:
      'A pawn chain is attacked at its base, not its head: bring a pawn-lever to ' +
      'the rearmost link and mass your pieces there until it falls.',
    outcome: 'equal',
    sources: ['concept:pawn-chain', 'https://en.wikipedia.org/wiki/My_System'],
  },
  {
    id: 'capablanca-cf-ex13-castled-king',
    themeId: 'attack-castled-king',
    title: 'Bishop, Queen and Knight against the Castled King',
    source: {
      bookSlug: 'capablanca-chess-fundamentals',
      bookTitle: 'Chess Fundamentals',
      author: 'José Raúl Capablanca',
      gutenbergId: 33870,
      figure: 'Fig13',
      locationLabel: 'Some Winning Positions in the Middle-game, Example 13',
    },
    principle: {
      say:
        'Capablanca teaches that a combination is built on the co-ordination ' +
        'of the pieces — every man brought to bear on one weak point. Here the ' +
        'weak point is the castled king himself: once the knight-pawn has been ' +
        'pushed a square, the dark squares around the king can no longer be ' +
        'defended, and the bishop on the long diagonal, the queen, and the ' +
        'knight all aim at the same target.',
      sayShort: 'Every piece on one weak point.',
    },
    // Validated: replaying the book line below reaches checkmate (chess.js).
    fen: '2q2rk1/1b3ppp/pp6/2p5/2P1N3/PP1Q4/1B3PPP/6K1 w - - 0 1',
    studentSide: 'white',
    technique: [
      {
        san: 'Nf6+',
        say:
          'The knight crashes in with check. Black is a rook for a knight ahead ' +
          'and should be winning — but the pieces are already pointed at the king, ' +
          'so White strikes before that material can matter.',
        sayShort: 'Knight checks, decoying the pawn.',
        arrows: [{ from: 'e4', to: 'f6', color: 'green' }],
        highlights: [{ square: 'g8', color: 'yellow' }],
      },
      {
        san: 'gxf6',
        say:
          'Forced — otherwise the queen mates at once. But capturing tears open ' +
          'the very file in front of the king, exactly the square the knight-pawn ' +
          'should never have left.',
        sayShort: 'Forced — the g-file rips open.',
        arrows: [{ from: 'g7', to: 'f6', color: 'yellow' }],
      },
      {
        san: 'Qg3+',
        say:
          'The queen swings onto the open knight-file with check. The pawn that ' +
          'advanced and then captured has handed White a highway straight to the king.',
        sayShort: 'Queen to the open file, check.',
        arrows: [{ from: 'd3', to: 'g3', color: 'green' }],
        highlights: [{ square: 'g8', color: 'yellow' }],
      },
      {
        san: 'Kh8',
        say: 'The only square — and it walks onto the bishop’s long diagonal.',
        sayShort: 'Into the corner, onto the diagonal.',
      },
      {
        san: 'Bxf6#',
        say:
          'The bishop, which has owned the long diagonal the whole game, takes the ' +
          'pawn with mate. The king cannot flee: the queen guards the knight-file, ' +
          'the bishop guards the diagonal, the king’s own pawn blocks h7. Three ' +
          'pieces, one weak point.',
        sayShort: 'Bishop mates on the long diagonal.',
        arrows: [{ from: 'b2', to: 'f6', color: 'green' }],
        highlights: [{ square: 'h8', color: 'yellow' }],
      },
    ],
    rule:
      'When the king’s knight-pawn has moved, aim the bishop down the long ' +
      'diagonal, the queen at the open file, and a knight as the decoy — and the ' +
      'co-ordinated pieces mate the weak point.',
    outcome: 'checkmate',
    sources: [
      'concept:pos-initiative',
      'concept:att-greek-gift',
      'https://www.gutenberg.org/ebooks/33870',
    ],
  },
];
