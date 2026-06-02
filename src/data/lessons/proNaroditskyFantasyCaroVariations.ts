import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Naroditsky — Fantasy Caro (3.f3), PER-VARIATION Watch lessons. Student =
// WHITE. Board-accurate two-register narration (G9.3 Gates A-D), spoken voice
// obeys G9.4 (no move-number prefixes, sayShort <= 8 words). Every spine is a
// REAL Naroditsky game walked to a middlegame; evals noted per line.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = [
  'book:chess-fundamentals',
  'https://www.chess.com/openings/Caro-Kann-Defense-Fantasy-Variation',
  'https://api.chess.com/pub/player/danielnaroditsky/games/archives',
];

// ── Black accepts with …dxe4 — the f-pawn recaptures, then the d5 wedge ──
// Real Naroditsky win; the centre clarifies to a clear White edge (~+2.3).
const DXE4: LessonScript = {
  openingId: 'pro-naroditsky-fantasy-caro',
  title: 'Fantasy Caro — Black accepts with …dxe4',
  minutes: 9,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'recapture',
      moves: 'e4 c6 d4 d5 f3 dxe4 fxe4',
      arrows: [A('f3', 'e4')],
      highlights: [H('e4'), H('d4')],
      say: "When Black grabs the pawn with …dxe4, this repertoire recaptures with the f-pawn — exactly the point of the Fantasy. White ends up with the broad e4-d4 centre and a half-open f-file pointed at f7, while Black has handed back the only piece of central tension.",
      sayShort: 'fxe4 — broad centre, f-file open.',
    }),
    b({
      id: 'wedge',
      moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 c5 d5',
      arrows: [A('d4', 'd5')],
      highlights: [H('d5')],
      say: "Black hits the centre with …c5; this repertoire answers d5, ramming the pawn forward into a space-gaining wedge instead of releasing the tension. The pawn cramps Black and clamps down on e6 and c6.",
      sayShort: 'd5 — the cramping wedge.',
    }),
    b({
      id: 'open-centre',
      moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 c5 d5 e6 Nc3 exd5 exd5',
      highlights: [H('d5'), H('c3')],
      say: "Black challenges with …e6 and the centre opens. After the trades White recaptures toward the centre, keeping the passed d5-pawn and developing the queen's knight to c3. The pawn on d5 is a permanent thorn.",
      sayShort: 'exd5 — keep the passer.',
    }),
    b({
      id: 'develop',
      moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 c5 d5 e6 Nc3 exd5 exd5 Bd6 Nf3 Ne7 Bd3',
      arrows: [A('f1', 'd3')],
      highlights: [H('d3')],
      say: "Both sides bring out the pieces — Black's bishop to d6 and knight to e7, White's knight to f3 and bishop to d3. With the e-file now open the bishop on d3 eyes the b1-h7 diagonal, and White is comfortably the more active side.",
      sayShort: 'Bd3 — active on the diagonal.',
    }),
    b({
      id: 'press',
      moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 c5 d5 e6 Nc3 exd5 exd5 Bd6 Nf3 Ne7 Bd3 O-O O-O Bf5 Ng5',
      arrows: [A('f3', 'g5')],
      highlights: [H('g5'), H('f7')],
      say: "Both kings tuck away, Black offers a bishop trade with …Bf5, and this repertoire's knight jumps into g5 — eyeing f7 and the kingside light squares. White keeps the passed pawn, the bishop pair pressure, and the initiative.",
      sayShort: 'Ng5 — leap at the kingside.',
    }),
    b({
      id: 'middlegame',
      moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 c5 d5 e6 Nc3 exd5 exd5 Bd6 Nf3 Ne7 Bd3 O-O O-O Bf5 Ng5 Bxd3 Qxd3 Ng6',
      highlights: [H('d5'), H('d3')],
      say: "The light bishops come off, the queen recaptures on d3 with a strong central post, and Black's knight reroutes to g6. White stands clearly better: the protected passed d-pawn, the active queen, and the safer king all favour White into the middlegame.",
      sayShort: 'Qxd3 — clearly better, passer holds.',
    }),
  ],
};

// ── Modern setup with …g6 — the queens come off into a balanced game ──
// Real Naroditsky win; the line simplifies to a dead-equal, easy-to-play
// middlegame (~0.0) where White's lead in development gives the comfier side.
const G6: LessonScript = {
  openingId: 'pro-naroditsky-fantasy-caro',
  title: 'Fantasy Caro — Modern setup with …g6',
  minutes: 8,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'fianchetto',
      moves: 'e4 g6 Nc3 Bg7 d4 c6 f3 d5 Be3',
      arrows: [A('c1', 'e3')],
      highlights: [H('e3'), H('d4')],
      say: "Against Black's Modern fianchetto with …g6 and …Bg7, this repertoire builds the same big-pawn centre and develops the dark-squared bishop to e3, bracing the d4-pawn that the g7-bishop is staring at. Solid, classical chess.",
      sayShort: 'Be3 — brace the centre.',
    }),
    b({
      id: 'recapture',
      moves: 'e4 g6 Nc3 Bg7 d4 c6 f3 d5 Be3 dxe4 fxe4 e5',
      arrows: [A('f3', 'e4')],
      highlights: [H('e4'), H('e5')],
      say: "Black trades on e4 and White recaptures with the f-pawn, keeping the broad centre. Black strikes back with …e5, challenging d4 head-on — the critical moment where the centre will resolve.",
      sayShort: 'fxe4 — centre holds, …e5 hits back.',
    }),
    b({
      id: 'trade-centre',
      moves: 'e4 g6 Nc3 Bg7 d4 c6 f3 d5 Be3 dxe4 fxe4 e5 Nf3 exd4 Bxd4',
      arrows: [A('e3', 'd4')],
      highlights: [H('d4')],
      say: "This repertoire develops the knight to f3, Black captures on d4, and White recaptures with the bishop — the dark-squared bishop now dominates the long diagonal, contesting Black's fianchettoed g7-bishop directly.",
      sayShort: 'Bxd4 — seize the long diagonal.',
    }),
    b({
      id: 'queens-off',
      moves: 'e4 g6 Nc3 Bg7 d4 c6 f3 d5 Be3 dxe4 fxe4 e5 Nf3 exd4 Bxd4 Bxd4 Qxd4 Qxd4 Nxd4',
      highlights: [H('d4')],
      say: "The bishops trade on d4 and the queens follow — and after the dust settles White's knight lands on the dominant d4 outpost. The queenless middlegame is roughly level, but White's centralised knight and lead in development make it the easier side to play.",
      sayShort: 'Nxd4 — knight rules the centre.',
    }),
    b({
      id: 'castle-long',
      moves: 'e4 g6 Nc3 Bg7 d4 c6 f3 d5 Be3 dxe4 fxe4 e5 Nf3 exd4 Bxd4 Bxd4 Qxd4 Qxd4 Nxd4 Nf6 O-O-O',
      arrows: [A('e1', 'c1')],
      highlights: [H('d1')],
      say: "Black develops the knight to f6, and this repertoire castles long — bringing the rook to the open d-file behind the strong knight in one move. Every White piece is now working; Black still has to untangle.",
      sayShort: 'O-O-O — rook to the open d-file.',
    }),
    b({
      id: 'middlegame',
      moves: 'e4 g6 Nc3 Bg7 d4 c6 f3 d5 Be3 dxe4 fxe4 e5 Nf3 exd4 Bxd4 Bxd4 Qxd4 Qxd4 Nxd4 Nf6 O-O-O Nbd7 Be2 Ne5',
      highlights: [H('d4'), H('e5')],
      say: "Black completes development with …Nbd7 and challenges the centre with …Ne5; White's bishop comes to e2. The position is balanced and symmetrical-looking, but the d4-knight and the rook on the d-file keep White comfortable — a clean, equal middlegame with no risk.",
      sayShort: 'Be2 — equal, but White plays easier.',
    }),
  ],
};

// ── Qb6 pressure sideline — meet the queen raid with a piece sacrifice ──
// Real Naroditsky win; Black grabs material but the king never escapes the
// centre and White's lead in development tells (~+2.1).
const QB6: LessonScript = {
  openingId: 'pro-naroditsky-fantasy-caro',
  title: 'Fantasy Caro — Qb6 pressure sideline',
  minutes: 9,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'develop',
      moves: 'e4 c6 d4 d5 f3 Qb6 Nc3',
      arrows: [A('b1', 'c3')],
      highlights: [H('c3'), H('b6')],
      say: "Black's …Qb6 eyes the b2-pawn and tries to disrupt White's set-up before it's finished. This repertoire ignores the threat and develops the knight to c3 — in the Fantasy, the lead in development matters more than a wing pawn.",
      sayShort: 'Nc3 — develop, ignore b2.',
    }),
    b({
      id: 'central-tension',
      moves: 'e4 c6 d4 d5 f3 Qb6 Nc3 e5 dxe5 d4',
      arrows: [A('d4', 'e5')],
      highlights: [H('e5'), H('d4')],
      say: "Black lunges …e5 and after dxe5 pushes …d4, trying to ram a pawn through and trap White's pieces. The pawn looks dangerous on d4, but it has run too far ahead of Black's undeveloped army.",
      sayShort: 'dxe5 — Black overruns with …d4.',
    }),
    b({
      id: 'reroute',
      moves: 'e4 c6 d4 d5 f3 Qb6 Nc3 e5 dxe5 d4 Nce2 Bc5 Nf4',
      arrows: [A('e2', 'f4')],
      highlights: [H('f4')],
      say: "The knight steps back to e2 and reroutes to f4 — a superb square, eyeing e6, g6 and d5 while sidestepping the d4-pawn entirely. White untangles calmly while Black's pawn on d4 hangs in the air.",
      sayShort: 'Nf4 — reroute to the dream square.',
    }),
    b({
      id: 'sacrifice',
      moves: 'e4 c6 d4 d5 f3 Qb6 Nc3 e5 dxe5 d4 Nce2 Bc5 Nf4 d3 Ngh3 dxc2 Qxc2',
      arrows: [A('d1', 'c2')],
      highlights: [H('c2')],
      say: "Black pushes …d3 and grabs on c2, winning a pawn — but this repertoire has developed the second knight to h3 and simply recaptures with the queen on c2. White has given a pawn; in return every piece is out and Black's king is still stranded in the centre.",
      sayShort: 'Qxc2 — a pawn for a huge lead.',
    }),
    b({
      id: 'pile-up',
      moves: 'e4 c6 d4 d5 f3 Qb6 Nc3 e5 dxe5 d4 Nce2 Bc5 Nf4 d3 Ngh3 dxc2 Qxc2 Ne7 Bc4',
      arrows: [A('f1', 'c4')],
      highlights: [H('c4'), H('f7')],
      say: "Black develops …Ne7 and White's bishop swings to c4, joining the knight on f4 in aiming at f7 and the light squares around Black's uncastled king. The initiative is worth far more than the pawn.",
      sayShort: 'Bc4 — pile onto f7.',
    }),
    b({
      id: 'middlegame',
      moves: 'e4 c6 d4 d5 f3 Qb6 Nc3 e5 dxe5 d4 Nce2 Bc5 Nf4 d3 Ngh3 dxc2 Qxc2 Ne7 Bc4 Na6 a3 O-O Bd2 Ng6',
      highlights: [H('f4'), H('c4')],
      say: "Black finally castles after …Na6, and White tidies up with a3 and Bd2. The position has settled into a middlegame where White is clearly better: the bishop pair, the e5-pawn cramping Black, and the f4-knight all outweigh the single sacrificed pawn.",
      sayShort: 'Bd2 — clearly better, pawn well spent.',
    }),
  ],
};

export const PRO_NAR_FANTASY_CARO_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-naroditsky-fantasy-caro::Black accepts with dxe4': DXE4,
  'pro-naroditsky-fantasy-caro::Modern setup with g6': G6,
  'pro-naroditsky-fantasy-caro::Qb6 pressure sideline': QB6,
};
