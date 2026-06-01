import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Caruana — Caro-Kann MAIN Watch lesson. Student = BLACK. Spine is his real
// data line (data/sources/fabianocaruana-trees/caruana-caro-kann, 168 games),
// tree-extended to a 20-ply middlegame. The Two Knights with ...Bg4: pin and
// trade the light bishop, build the solid wall, then ...e5 to equalise. Board-
// accurate, two registers, G9.4 voice.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence', 'https://www.chess.com/openings/Caro-Kann-Defense', 'https://api.chess.com/pub/player/fabianocaruana/games/archives'];

export const PRO_CARUANA_CARO_KANN_LESSON: LessonScript = {
  openingId: 'pro-caruana-caro-kann',
  title: "Caruana's Caro-Kann",
  minutes: 10,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({ id: 'bg4', moves: 'e4 c6 Nf3 d5 Nc3 Bg4', say: "The Caro-Kann — the soundest defence to e4. After c6 and d5 Black challenges the centre, and against the Two Knights he plays the classical Bg4, pinning the f3-knight before White can trap the light bishop inside the pawn chain.", sayShort: '…Bg4 — pin the knight.', arrows: [A('c8', 'g4')], highlights: [H('g4')] }),
    b({ id: 'bxf3', moves: 'e4 c6 Nf3 d5 Nc3 Bg4 h3 Bxf3 Qxf3 e6', say: "White breaks the pin with h3; Black trades on f3, damaging nothing of his own, and builds the solid wall with e6. The light bishop has done its job and left — no bad bishop in this Caro.", sayShort: '…Bxf3, …e6 — trade and build.', arrows: [A('g4', 'f3')], highlights: [H('e6')] }),
    b({ id: 'nd7', moves: 'e4 c6 Nf3 d5 Nc3 Bg4 h3 Bxf3 Qxf3 e6 d3 Nd7 g3 Ngf6', say: "White plays the modest d3 and fianchettoes with g3; Black develops the knights to d7 and f6, harmonious and free of weaknesses, ready for the central break.", sayShort: '…Nd7, …Ngf6 — harmonious development.', arrows: [A('b8', 'd7')], highlights: [H('d7')] }),
    b({ id: 'bb4', moves: 'e4 c6 Nf3 d5 Nc3 Bg4 h3 Bxf3 Qxf3 e6 d3 Nd7 g3 Ngf6 Bg2 Bb4', say: "White completes the fianchetto with Bg2; Black pins the c3-knight with Bb4, fighting for the e4-square and the centre. Every black piece is active and purposeful.", sayShort: '…Bb4 — pin, fight for the centre.', arrows: [A('f8', 'b4')], highlights: [H('b4')] }),
    b({ id: 'castled', moves: 'e4 c6 Nf3 d5 Nc3 Bg4 h3 Bxf3 Qxf3 e6 d3 Nd7 g3 Ngf6 Bg2 Bb4 O-O O-O', say: "Both sides castle and Black has reached a fully sound Caro-Kann: the better pawn structure, no bad bishop — it was traded on f3 — and every piece active, the knights settled on d7 and f6 and the bishop pinning on b4. A comfortable, level middlegame where understanding outweighs memory. The Caro at its best.", sayShort: '…O-O — a fully sound Caro.', arrows: [A('b4', 'c3')], highlights: [H('d5')] }),
  ],
};
