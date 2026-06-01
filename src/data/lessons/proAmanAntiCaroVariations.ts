import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Aman Hambleton (chessbrah) — Caro Two Knights (White) variation lessons.

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
  'https://api.chess.com/pub/player/chessbrah/games/archives',
];

export const PRO_AMAN_ANTI_CARO_VARIATION_LESSONS: Record<string, LessonScript> = {
  // ── Two Knights vs …Bg4 main tab ──
  'pro-aman-anti-caro::Two Knights (…Bg4)': {
    openingId: 'pro-aman-anti-caro',
    title: 'Two Knights vs …Bg4 — Bishop Pair, Easy Edge',
    minutes: 8,
    orientation: 'white',
    kind: 'variation',
    sources: SRC,
    beats: [
      b({ id: 'qxf3', moves: 'e4 c6 Nc3 d5 Nf3 Bg4 h3 Bxf3 Qxf3', arrows: [A('d1', 'f3')], highlights: [H('f3')],
        say: "Black pins with …Bg4; h3 breaks the pin and Qxf3 recaptures, handing White the bishop pair and a lead in development. The easy, natural Two Knights edge.",
        sayShort: 'Qxf3 — bishop pair.' }),
      b({ id: 'qxe4', moves: 'e4 c6 Nc3 d5 Nf3 Bg4 h3 Bxf3 Qxf3 e6 d4 dxe4 Qxe4', highlights: [H('e4')],
        say: "After …e6 and …dxe4, the queen recaptures on e4, centralising on a strong square. White has more space, the bishop pair, and a smooth setup.",
        sayShort: 'Qxe4 — centralise.' }),
      b({ id: 'be2', moves: 'e4 c6 Nc3 d5 Nf3 Bg4 h3 Bxf3 Qxf3 e6 d4 dxe4 Qxe4 Nf6 Qd3 Nbd7 Be2', arrows: [A('f1', 'e2')], highlights: [H('e2')],
        say: "White retreats the queen to d3 and develops Be2 — calm, harmonious play, keeping the bishop pair and the small space edge with an easy plan to castle and press.",
        sayShort: 'Be2 — calm, keep the edge.' }),
      b({ id: 'middlegame', moves: 'e4 c6 Nc3 d5 Nf3 Bg4 h3 Bxf3 Qxf3 e6 d4 dxe4 Qxe4 Nf6 Qd3 Nbd7 Be2 Bd6 O-O O-O Rd1', arrows: [A('f1', 'd1')], highlights: [H('d1')],
        say: "Both castle and Rd1 backs the d4-pawn. White has the ideal Two Knights middlegame: the bishop pair, a real space edge, the better structure, and an easy long-term plan of central pressure. Simple, sound, and devastatingly effective at 83%.",
        sayShort: 'Rd1 — central pressure.' }),
    ],
  },

  // ── vs …dxe4 (direct trade) ──
  'pro-aman-anti-caro::vs …dxe4': {
    openingId: 'pro-aman-anti-caro',
    title: 'Two Knights vs …dxe4 — Queen on e4',
    minutes: 8,
    orientation: 'white',
    kind: 'variation',
    sources: SRC,
    beats: [
      b({ id: 'nxe4', moves: 'e4 c6 Nc3 d5 Nf3 dxe4 Nxe4 Nf6 Qe2', arrows: [A('d1', 'e2')], highlights: [H('e2')],
        say: "When Black trades …dxe4 directly, Nxe4 recaptures and Qe2 prepares to keep the centralised knight or recapture on e4 with the queen — a slightly offbeat order that scores brilliantly.",
        sayShort: 'Qe2 — flexible recapture.' }),
      b({ id: 'qxe4', moves: 'e4 c6 Nc3 d5 Nf3 dxe4 Nxe4 Nf6 Qe2 Nxe4 Qxe4 Nd7 Bc4', arrows: [A('f1', 'c4')], highlights: [H('c4')],
        say: "After the knight trade the queen sits proudly on e4, and Bc4 develops actively, aiming at the f7-square. White's pieces are coordinated and active while Black is still untangling.",
        sayShort: 'Bc4 — active, eye f7.' }),
      b({ id: 'ne5', moves: 'e4 c6 Nc3 d5 Nf3 dxe4 Nxe4 Nf6 Qe2 Nxe4 Qxe4 Nd7 Bc4 Nf6 Ne5', arrows: [A('f3', 'e5')], highlights: [H('e5')],
        say: "White plants a knight on the strong e5-outpost, controlling key central squares and cramping Black. The pieces dominate the centre while Black struggles to free his position.",
        sayShort: 'Ne5 — the central outpost.' }),
      b({ id: 'middlegame', moves: 'e4 c6 Nc3 d5 Nf3 dxe4 Nxe4 Nf6 Qe2 Nxe4 Qxe4 Nd7 Bc4 Nf6 Ne5 e6 Qe2 Bd6 d4 O-O O-O', highlights: [H('d4'), H('e5')],
        say: "White builds the centre with d4, keeps the knight on e5, and castles into a dominant middlegame. White has more space, active pieces, and the cramping e5-knight — a clean positional bind. Black is solid but passive, and White presses comfortably. The Two Knights' 83% in action.",
        sayShort: 'O-O — dominant bind, press.' }),
    ],
  },
};
