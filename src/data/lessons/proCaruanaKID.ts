import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Caruana — King's Indian Defense MAIN Watch lesson. Student = BLACK. Spine
// is his real data line (data/sources/fabianocaruana-trees/caruana-kid, 110
// games), tree-extended to a 20-ply middlegame. The Fianchetto KID: ...Bg7,
// ...d6/...Nbd7, the ...e5 break, then ...exd4 to open the game. Board-accurate,
// two registers, G9.4 voice.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'concept:pos-center', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence', 'https://www.chess.com/openings/Kings-Indian-Defense', 'https://api.chess.com/pub/player/fabianocaruana/games/archives'];

export const PRO_CARUANA_KID_LESSON: LessonScript = {
  openingId: 'pro-caruana-kid',
  title: "This repertoire's King's Indian Defense",
  minutes: 10,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({ id: 'bg7', moves: 'd4 Nf6 c4 g6 Nf3 Bg7', say: "The King's Indian — Black's most combative answer to d4. With g6 and Bg7 Black fianchettoes the dark bishop onto the long diagonal, hands White the big centre on purpose, and prepares to strike back at it.", sayShort: '…Bg7 — the fianchetto.', arrows: [A('f8', 'g7')], highlights: [H('g7')] }),
    b({ id: 'oo', moves: 'd4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6', say: "White chooses the solid Fianchetto setup with g3 and Bg2; Black castles and plays d6, the classic KID pawn that supports the coming ...e5 break. Both sides build their fortresses.", sayShort: '…O-O, …d6 — castle and prepare …e5.', highlights: [H('d6')] }),
    b({ id: 'e5', moves: 'd4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O Nbd7 Nc3 e5', say: "White completes development; Black brings the knight to d7 and strikes the centre with e5 — the soul of the King's Indian, challenging White's d4-point head-on.", sayShort: '…e5 — the King’s Indian break.', arrows: [A('e7', 'e5')], highlights: [H('e5')] }),
    b({ id: 'c6', moves: 'd4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O Nbd7 Nc3 e5 e4 c6', say: "White builds the full centre with e4; Black props with c6, a flexible move that prepares ...Qb6 or ...exd4 and keeps the d5-square covered. The tension in the centre is the whole game.", sayShort: '…c6 — flexible, hold the centre.', highlights: [H('c6')] }),
    b({ id: 'exd4', moves: 'd4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O Nbd7 Nc3 e5 e4 c6 h3 Qb6 Re1 exd4', say: "Black activates the queen with Qb6, pressuring d4 and b2; White defends with Re1, and Black resolves the tension with exd4 — opening the long diagonal for the g7-bishop and giving Black active, dynamic play in the centre. The King's Indian counterattack is underway.", sayShort: '…Qb6, …exd4 — open the diagonal.', arrows: [A('d8', 'b6')], highlights: [H('d4')] }),
  ],
};
