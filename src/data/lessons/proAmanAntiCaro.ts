import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Aman Hambleton (chessbrah) — Caro-Kann Two Knights (WHITE) (448 games,
// 83.5% — his best-scoring White opening). Spine = 2.Nc3 d5 3.Nf3 vs ...Bg4,
// walked to a real middlegame.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = [
  'book:caro-kann',
  'concept:pos-development',
  'https://www.chess.com/openings/Caro-Kann-Defense-Two-Knights-Attack',
  'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence',
  'https://api.chess.com/pub/player/chessbrah/games/archives',
];

export const PRO_AMAN_ANTI_CARO_LESSON: LessonScript = {
  openingId: 'pro-aman-anti-caro',
  title: "Aman's Two Knights Caro — Fast, Easy, 83%",
  minutes: 9,
  orientation: 'white',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({ id: 'nc3', moves: 'e4 c6 Nc3', arrows: [A('b1', 'c3')], highlights: [H('c3')],
      say: "Against the Caro-Kann, the Two Knights Attack starts with Nc3 — a quick, low-theory developing move that sidesteps the main-line theory entirely. This is Aman's best-scoring White opening, an eye-popping 83%.",
      sayShort: 'Nc3 — quick, low-theory.' }),
    b({ id: 'nf3', moves: 'e4 c6 Nc3 d5 Nf3', arrows: [A('g1', 'f3')], highlights: [H('f3')],
      say: "Black challenges the centre with …d5 and White develops the second knight with Nf3 — the Two Knights setup. Both knights are out fast, the pieces flow, and White keeps an easy, natural game with the e4-tension.",
      sayShort: 'Nf3 — both knights out fast.' }),
    b({ id: 'bg4', moves: 'e4 c6 Nc3 d5 Nf3 Bg4 h3 Bxf3 Qxf3', arrows: [A('d1', 'f3')], highlights: [H('f3')],
      say: "Black plays the natural …Bg4 to pin; White breaks the pin with h3 and after …Bxf3 recaptures with the queen. White gets the bishop pair, a lead in development, and the half-open structure to work with — a pleasant, easy edge.",
      sayShort: 'Qxf3 — bishop pair, develop.' }),
    b({ id: 'e6', moves: 'e4 c6 Nc3 d5 Nf3 Bg4 h3 Bxf3 Qxf3 e6 d4 dxe4 Qxe4', highlights: [H('e4')],
      say: "Black plays …e6 and resolves the centre with …dxe4; White recaptures Qxe4, centralising the queen on a strong square. White has more space, the bishop pair, and a smooth, harmonious setup — the Two Knights delivers an easy game.",
      sayShort: 'Qxe4 — centralise, more space.' }),
    b({ id: 'nf6', moves: 'e4 c6 Nc3 d5 Nf3 Bg4 h3 Bxf3 Qxf3 e6 d4 dxe4 Qxe4 Nf6 Qd3 Nbd7 Be2', arrows: [A('f1', 'e2')], highlights: [H('e2')],
      say: "Black develops …Nf6 and …Nbd7, White retreats the queen to d3 and develops Be2 — calm, harmonious play. White keeps the bishop pair and a small space edge, with the easy plan of castling and pressing. No theory, just good moves.",
      sayShort: 'Be2 — calm, keep the edge.' }),
    b({ id: 'middlegame', moves: 'e4 c6 Nc3 d5 Nf3 Bg4 h3 Bxf3 Qxf3 e6 d4 dxe4 Qxe4 Nf6 Qd3 Nbd7 Be2 Bd6 O-O O-O Rd1', arrows: [A('f1', 'd1')], highlights: [H('d1'), H('d4')],
      say: "Both sides finish developing and castle, and White lifts the rook to d1, backing the d4-pawn and eyeing the d-file. White has reached the ideal Two Knights middlegame: the bishop pair, a small but real space advantage, the better structure, and an easy long-term plan of central pressure. Simple, sound, and — at 83% — devastatingly effective.",
      sayShort: 'Rd1 — bishop pair, central pressure.' }),
  ],
};
