import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Caruana — Italian per-variation Watch lessons. Student = WHITE. Spine from
// his real data (tree-extended). Board-accurate, two registers, G9.4 voice.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Italian_Game', 'https://www.chess.com/openings/Italian-Game', 'https://api.chess.com/pub/player/fabianocaruana/games/archives'];

const TWO_KNIGHTS: LessonScript = {
  openingId: 'pro-caruana-italian', title: 'Italian — Two Knights 3...Nf6', minutes: 8, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'd3', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3', say: "Against the Two Knights move-order, Caruana sidesteps the sharp lines with the quiet d3 — transposing toward the same Pianissimo structure he loves. No early sacrifices, just a deep strategic battle.", sayShort: 'd3 — the quiet Pianissimo.', highlights: [H('d3')] }),
    b({ id: 'castle', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Bc5 c3 d6 O-O O-O', say: "Black develops Bc5 and both sides reach the familiar harmonious setup with c3, d6, and castling. Symmetrical and rich — the better maneuvering wins.", sayShort: 'O-O — the harmonious setup.', highlights: [H('g1')] }),
    b({ id: 'a4', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Bc5 c3 d6 O-O O-O Re1 a6 a4', say: "Caruana centralises the rook on e1 and grabs queenside space with a4, restraining Black's ...b5. Patient improving moves — the modern Italian is a maneuvering game.", sayShort: 'Re1, a4 — centralise, gain space.', arrows: [A('a2', 'a4')], highlights: [H('a4')] }),
    b({ id: 'nbd2', moves: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Bc5 c3 d6 O-O O-O Re1 a6 a4 Ba7 Nbd2 Be6', say: "Black tucks the bishop to a7; Caruana reroutes the knight via d2 toward f1 and g3, and Black offers a trade with Be6. A fully-developed Pianissimo middlegame where White's small space edge tells.", sayShort: 'Nbd2 — reroute, press the edge.', arrows: [A('b1', 'd2')], highlights: [H('d2')] }),
  ],
};

export const PRO_CARUANA_ITALIAN_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-caruana-italian::Two Knights 3...Nf6': TWO_KNIGHTS,
};
