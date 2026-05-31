import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Eric Rosen — Budapest per-variation lessons (Black). Names match
// pro-repertoires.json. Two registers; no move-number prefixes; green arrows only.
const VIS = 'rgba(40,185,95,0.92)'; const KEY = 'rgba(255,214,0,0.88)'; const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const OID = 'pro-ericrosen-budapest';
const SRC = ['concept:pos-initiative', 'concept:pos-development', 'https://www.chess.com/openings/Budapest-Gambit', 'https://api.chess.com/pub/player/imrosen/games/archives'];

const VS_NF3: LessonScript = {
  openingId: OID, title: 'Budapest — vs Nf3 (…Bc5)', minutes: 6,
  orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'nf3', moves: 'd4 Nf6 c4 e5 dxe5 Ng4 Nf3 Bc5',
      arrows: [A('c5', 'f2')], highlights: [{ square: 'c5', color: KEY }, { square: 'f2', color: KEY }],
      say: "When White defends e5 with Nf3 instead of Bf4, the bishop swings to c5 — pointing straight at f2. Combined with the g4-knight, that is two pieces trained on White's most sensitive square before White has castled.",
      sayShort: '…Bc5 — aim at f2.' }),
    b({ id: 'develop', moves: 'd4 Nf6 c4 e5 dxe5 Ng4 Nf3 Bc5 e3 Nc6 Nc3 Ngxe5',
      arrows: [], highlights: [{ square: 'e5', color: KEY }],
      say: "We develop …Nc6 to add pressure and then regain the pawn with …Ngxe5, trading into a position where our knight sits proudly on e5 and the c5-bishop rakes the a7-g1 diagonal. Active equality with the easier game to play.",
      sayShort: '…Ngxe5 — pawn back, active pieces.' }),
    b({ id: 'oo', moves: 'd4 Nf6 c4 e5 dxe5 Ng4 Nf3 Bc5 e3 Nc6 Nc3 Ngxe5 Nxe5 Nxe5 Be2 O-O',
      arrows: [A('e5', 'd3')], highlights: [{ square: 'e5', color: KEY }, { square: 'd3', color: SOFT }],
      say: "After the knight trade and castling, Black is fully developed with the e5-knight eyeing d3 and f3, the bishop on c5 hitting f2, and a rook coming to e8. A comfortable, fighting game where Black's piece activity fully compensates for White's small structural edge.",
      sayShort: '…O-O — comfortable, active equality.' }),
  ],
};

const VS_NC3: LessonScript = {
  openingId: OID, title: 'Budapest — vs Nc3 (declined)', minutes: 5,
  orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'nc3', moves: 'd4 Nf6 c4 e5 Nc3 exd4 Qxd4 Nc6',
      arrows: [A('c6', 'd4')], highlights: [{ square: 'd4', color: KEY }],
      say: "If White declines the gambit with Nc3, we simply take on d4 and, after Qxd4, hit the queen with …Nc6 — gaining a tempo and quick development. Declining the Budapest just hands Black an easy, equal game.",
      sayShort: '…Nc6 — hit the queen, develop.' }),
    b({ id: 'bb4', moves: 'd4 Nf6 c4 e5 Nc3 exd4 Qxd4 Nc6 Qd1 Bb4',
      arrows: [], highlights: [{ square: 'b4', color: KEY }, { square: 'c3', color: SOFT }],
      say: "The queen retreats and we pin the c3-knight with …Bb4 — the same active, pressuring idea that runs through Rosen's whole repertoire. Black develops with threats while White is still sorting out the queen.",
      sayShort: '…Bb4 — pin and pressure c3.' }),
    b({ id: 're8', moves: 'd4 Nf6 c4 e5 Nc3 exd4 Qxd4 Nc6 Qd1 Bb4 Nf3 O-O Bd2 Re8',
      arrows: [], highlights: [{ square: 'e8', color: KEY }, { square: 'e2', color: SOFT }],
      say: "We castle and bring the rook to e8, seizing the open e-file and pinning White's pieces to the king. Black is fully mobilised with the more active army — declining the gambit cost White the initiative for nothing.",
      sayShort: '…Re8 — seize the e-file, equal+.' }),
  ],
};

export const PRO_ERICROSEN_BUDAPEST_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::vs Nf3 (…Bc5)`]: VS_NF3,
  [`${OID}::vs Nc3 (Declined)`]: VS_NC3,
};
