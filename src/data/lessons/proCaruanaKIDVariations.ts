import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Caruana — King's Indian per-variation Watch lessons. Student = BLACK.
// Spine from his real data (tree-extended). Board-accurate, two registers, G9.4.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'concept:pos-center', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence', 'https://www.chess.com/openings/Kings-Indian-Defense', 'https://api.chess.com/pub/player/fabianocaruana/games/archives'];

const CLASSICAL: LessonScript = {
  openingId: 'pro-caruana-kid', title: "King's Indian — Classical 5.Nc3 + e4", minutes: 8, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'e4', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6', say: "Against the Classical with Nc3 and the full e4 centre, Black fianchettoes and plays the solid d6 — the main-line King's Indian. Black lets White build the big centre, then attacks it.", sayShort: '…d6 — the Classical KID.', highlights: [H('d6')] }),
    b({ id: 'e5', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5', say: "Both sides develop and castle, then Black strikes with e5 — the heart of the King's Indian, challenging White's d4-point directly.", sayShort: '…e5 — the King’s Indian break.', arrows: [A('e7', 'e5')], highlights: [H('e5')] }),
    b({ id: 'ne7', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7', say: "Black develops Nc6 to pressure d4; White closes the centre with d5, and the knight reroutes to e7, heading for the kingside. The pawn structure is locked — and that defines the plans.", sayShort: '…Ne7 — reroute toward the kingside.', arrows: [A('c6', 'e7')], highlights: [H('e7')] }),
    b({ id: 'nd7', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7 Ne1 Nd7', say: "With the centre closed it becomes a race of pawn storms: White's knight retreats to e1 to reroute toward the queenside, and Black plays Nd7 to clear the f-pawn for the thematic ...f5 kingside attack. The classic King's Indian battle of opposite wings.", sayShort: '…Nd7 — clear for the ...f5 storm.', arrows: [A('f6', 'd7')], highlights: [H('d7')] }),
  ],
};

export const PRO_CARUANA_KID_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-caruana-kid::Classical 5.Nc3 + e4': CLASSICAL,
};
