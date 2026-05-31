import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Hikaru — Caro-Kann (1...c6) per-variation Watch lessons. Hand-authored from
// his real data spines. Student = BLACK. Board-accurate, two registers, G9.4
// voice. The Caro story: get the light bishop OUT before the wall, build solid,
// break with ...c5.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence', 'https://www.chess.com/openings/Caro-Kann-Defense', 'https://api.chess.com/pub/player/hikaru/games/archives'];

const ADVANCE: LessonScript = {
  openingId: 'pro-hikaru-caro-kann', title: "Caro-Kann vs Advance — the Bishop Out", minutes: 8, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'bf5', moves: 'e4 c6 d4 d5 e5 Bf5', arrows: [A('c8', 'f5')], highlights: [H('f5')], say: "White grabs space with e5, and here's the Caro's whole point: ...Bf5! The light-squared bishop develops OUTSIDE the pawn chain — the very piece that stays trapped in the French Defense.", sayShort: '…Bf5 — the bishop escapes.' }),
    b({ id: 'h6', moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 h6', highlights: [H('e6')], say: "Black builds the solid wall with ...e6 behind the freed bishop, and ...h6 makes a safe square so White can't harass it with Nh4 or g4. Rock-solid.", sayShort: '…e6, …h6 — solid, bishop safe.' }),
    b({ id: 'nd7', moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 h6 O-O Nd7', highlights: [H('d7')], say: "Both sides castle and Black develops ...Nd7, heading to support the ...c5 break that will challenge White's advanced centre. Harmonious and low-risk.", sayShort: '…Nd7 — eye the ...c5 break.' }),
    b({ id: 'mid', moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 h6 O-O Nd7 Nbd2 Ne7 Nb3 Qc7', arrows: [A('d8', 'c7')], highlights: [H('c7')], say: "Black reroutes the knight to e7 and centralises the queen on c7, pressuring the e5-pawn and preparing ...c5. The classic Caro: a solid wall, the good bishop already out, an easy plan against the centre. Comfortable equality with no weaknesses.", sayShort: '…Qc7 — pressure e5, no weaknesses.' }),
  ],
};

const EXCHANGE: LessonScript = {
  openingId: 'pro-hikaru-caro-kann', title: "Caro-Kann vs Exchange — Easy Development", minutes: 7, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'cxd5', moves: 'e4 c6 d4 d5 exd5 cxd5', highlights: [H('d5')], say: "The Exchange Variation trades in the centre, leaving a symmetrical structure. Black has the half-open c-file and a clean, easy game — no theory to fear.", sayShort: '…cxd5 — symmetrical, easy game.' }),
    b({ id: 'bf5', moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 g6 Nf3 Bf5', arrows: [A('c8', 'f5')], highlights: [H('f5')], say: "Black develops naturally — ...Nc6, ...g6, and ...Bf5 to trade off White's good light-squared bishop. The fianchetto and the active pieces give Black full equality.", sayShort: '…Bf5 — trade the good bishop.' }),
    b({ id: 'mid', moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 g6 Nf3 Bf5 O-O', highlights: [H('f5')], say: "Both sides castle into a balanced, symmetrical middlegame. Black's pieces are harmoniously placed, the structure is sound, and there's nothing to fear — a comfortable game where understanding outweighs memory.", sayShort: 'O-O — balanced, comfortable.' }),
  ],
};

const TWO_KNIGHTS: LessonScript = {
  openingId: 'pro-hikaru-caro-kann', title: "Caro-Kann vs Two Knights — the ...Bg4 Pin", minutes: 7, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'bg4', moves: 'e4 c6 Nc3 d5 Nf3 Bg4', arrows: [A('c8', 'g4')], highlights: [H('g4')], say: "Against the Two Knights, Black plays ...d5 and the classical ...Bg4 — pinning the f3-knight against the queen. The light bishop gets active before anything can trap it.", sayShort: '…Bg4 — pin the knight.' }),
    b({ id: 'e6', moves: 'e4 c6 Nc3 d5 Nf3 Bg4 h3 Bxf3 Qxf3 e6', highlights: [H('e6')], say: "White breaks the pin with h3; Black trades on f3, damaging nothing of his own, and plays ...e6 to build the solid structure. Black is fully comfortable.", sayShort: '…Bxf3, …e6 — solid structure.' }),
    b({ id: 'mid', moves: 'e4 c6 Nc3 d5 Nf3 Bg4 h3 Bxf3 Qxf3 e6 d3 g6 Bd2 Bg7 O-O-O Nd7 g4', arrows: [A('f8', 'g7')], highlights: [H('g7')], say: "Black fianchettoes the dark bishop to g7 and develops ...Nd7. White castles long and pushes g4, but Black's rock-solid structure and harmonious pieces hold everything together. A comfortable Caro middlegame.", sayShort: '…Bg7, …Nd7 — rock-solid Caro.' }),
  ],
};

export const PRO_HIKARU_CARO_KANN_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-hikaru-caro-kann::vs Advance 3.e5 Bf5': ADVANCE,
  'pro-hikaru-caro-kann::vs Exchange': EXCHANGE,
  'pro-hikaru-caro-kann::vs Two Knights': TWO_KNIGHTS,
};
