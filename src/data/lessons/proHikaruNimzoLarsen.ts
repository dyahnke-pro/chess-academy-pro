import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Hikaru Nakamura — Nimzo-Larsen Attack (1.b3), WHITE side. His signature
// surprise weapon (7,481 games, 87.3% in his archive). The lesson walks his
// most-played spine to a real middlegame (23 plies, G9.3 Gate B): the
// hypermodern b2-bishop is the whole story — slow build, then the long diagonal
// + the d4/d5 break decide. Board-accurate, two registers, no move-number
// prefixes (G9.4). Voice grounded in data/sources/hikaru-voice/per-opening/
// nimzo-larsen.md. Engine: +0.6 White at the spine terminus. Student plays WHITE.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';

interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = [
  'book:chess-fundamentals',
  'https://en.wikipedia.org/wiki/Nimzowitsch%E2%80%93Larsen_Attack',
  'https://www.chess.com/openings/Nimzowitsch-Larsen-Attack',
  'https://api.chess.com/pub/player/hikaru/games/archives',
];

export const PRO_HIKARU_NIMZO_LARSEN_LESSON: LessonScript = {
  openingId: 'pro-hikaru-nimzo-larsen',
  title: "This repertoire's Nimzo-Larsen Attack — the b2-Bishop Weapon",
  minutes: 12,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({
      id: 'b3',
      moves: 'b3',
      highlights: [{ square: 'b3', color: SOFT }],
      say: "The Nimzo-Larsen — This repertoire's favourite surprise weapon, the move that's beaten the likes of Ding Liren in super-GM blitz. b3 looks modest, but its whole point is the next move: the bishop is coming to b2, onto the longest diagonal on the board.",
      sayShort: 'b3 — prepare the long diagonal.',
    }),
    b({
      id: 'bb2',
      moves: 'b3 e5 Bb2',
      arrows: [{ from: 'b2', to: 'g7', color: VIS }],
      highlights: [{ square: 'b2', color: KEY }, { square: 'e5', color: SOFT }],
      say: "Black grabs the centre with e5, and this repertoire fianchettoes — Bb2. This is hypermodern chess: instead of fighting for the centre with pawns, we let Black build it, then lean on it from afar. The b2-bishop already eyes e5 and the long road to g7.",
      sayShort: 'Bb2 — lean on e5 from afar.',
    }),
    b({
      id: 'e3',
      moves: 'b3 e5 Bb2 Nc6 e3',
      highlights: [{ square: 'e3', color: SOFT }],
      say: "Nc6 defends e5, and we play e3 — a small move with a big idea. It opens the f1-bishop and, crucially, keeps the option of f4 to strike at e5 later. The position stays flexible; this repertoire loves that opponents have no booked-up lines here.",
      sayShort: 'e3 — flexible, keep f4 in reserve.',
    }),
    b({
      id: 'bb5',
      moves: 'b3 e5 Bb2 Nc6 e3 Nf6 Bb5',
      arrows: [{ from: 'b5', to: 'c6', color: VIS }],
      highlights: [{ square: 'b5', color: KEY }],
      say: "After Nf6, the bishop pins out to b5 — pressuring the c6-knight that holds e5 together. Take away the defender and the e5-pawn the b2-bishop is staring at starts to feel the heat.",
      sayShort: 'Bb5 — pressure the e5 defender.',
    }),
    b({
      id: 'na3',
      moves: 'b3 e5 Bb2 Nc6 e3 Nf6 Bb5 Bd6 Na3',
      arrows: [{ from: 'b1', to: 'a3', color: VIS }],
      highlights: [{ square: 'a3', color: SOFT }],
      say: "Black defends with Bd6, and the knight takes the unusual route to a3 — heading for c2, where it supports the d4-break that will blow the centre open. Odd-looking, but every this repertoire piece has a job on the long diagonal's behalf.",
      sayShort: 'Na3 — reroute toward c2 and d4.',
    }),
    b({
      id: 'c4',
      moves: 'b3 e5 Bb2 Nc6 e3 Nf6 Bb5 Bd6 Na3 Na5 Be2 a6 c4',
      arrows: [{ from: 'c2', to: 'c4', color: VIS }],
      highlights: [{ square: 'c4', color: KEY }, { square: 'd5', color: SOFT }],
      say: "The knight jumps to a5 and we drop the bishop back to e2; after a6, the c4 thrust grabs space and clamps the d5-square. The position is taking the shape of a reversed Sicilian where White has an extra tempo — exactly the comfortable edge this repertoire is after.",
      sayShort: 'c4 — grab space, clamp d5.',
    }),
    b({
      id: 'nc2',
      moves: 'b3 e5 Bb2 Nc6 e3 Nf6 Bb5 Bd6 Na3 Na5 Be2 a6 c4 O-O Nc2',
      arrows: [{ from: 'a3', to: 'c2', color: VIS }],
      highlights: [{ square: 'c2', color: KEY }],
      say: "Black castles, and the knight completes its journey to c2 — now everything supports the central break. The slow maneuvering the Nimzo-Larsen is known for is done; the position is loaded.",
      sayShort: 'Nc2 — the d4-break is loaded.',
    }),
    b({
      id: 'd4',
      moves: 'b3 e5 Bb2 Nc6 e3 Nf6 Bb5 Bd6 Na3 Na5 Be2 a6 c4 O-O Nc2 Nc6 d4',
      arrows: [{ from: 'd2', to: 'd4', color: VIS }],
      highlights: [{ square: 'd4', color: KEY }, { square: 'e5', color: SOFT }],
      say: "Nc6 comes back, and now d4! The break the whole setup was built for. It strikes at e5 — the very pawn the b2-bishop has watched since move two — and the long diagonal is about to burst open.",
      sayShort: 'd4 — strike e5, open the diagonal.',
    }),
    b({
      id: 'open',
      moves: 'b3 e5 Bb2 Nc6 e3 Nf6 Bb5 Bd6 Na3 Na5 Be2 a6 c4 O-O Nc2 Nc6 d4 exd4 exd4 Re8',
      arrows: [{ from: 'b2', to: 'g7', color: VIS }],
      highlights: [{ square: 'd4', color: KEY }],
      say: "Black trades on d4 and we recapture — exd4 — and there it is: the centre is open, White has a mobile d4-pawn, and the b2-bishop now rakes an unobstructed diagonal straight at Black's king. Black tucks a rook to e8 to contest the file.",
      sayShort: 'exd4 — the diagonal is unleashed.',
    }),
    b({
      id: 'nf3',
      moves: 'b3 e5 Bb2 Nc6 e3 Nf6 Bb5 Bd6 Na3 Na5 Be2 a6 c4 O-O Nc2 Nc6 d4 exd4 exd4 Re8 Nf3',
      highlights: [{ square: 'f3', color: SOFT }],
      say: "Nf3 develops the last minor piece, shoring up d4 and eyeing e5 and g5. Every white piece is now harmoniously placed, the centre is White's, and the engine confirms the pleasant edge — about half a pawn, the kind of nagging pull this repertoire converts in his sleep.",
      sayShort: 'Nf3 — develop, hold d4.',
    }),
    b({
      id: 'middlegame',
      moves: 'b3 e5 Bb2 Nc6 e3 Nf6 Bb5 Bd6 Na3 Na5 Be2 a6 c4 O-O Nc2 Nc6 d4 exd4 exd4 Re8 Nf3 Bf8 d5',
      arrows: [{ from: 'd4', to: 'd5', color: VIS }],
      highlights: [{ square: 'd5', color: KEY }],
      say: "Black retreats the bishop to f8 and this repertoire pushes d5 — the pawn rams forward, kicking the c6-knight and clamping the centre. White has a space-gaining passed-pawn candidate, the bishop pair on open diagonals, and the better-placed pieces. This is the Nimzo-Larsen dream: from a quiet b3, a dominant middlegame.",
      sayShort: 'd5 — clamp the centre, White is better.',
    }),
  ],
};
