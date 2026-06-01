import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Caruana — Caro-Kann per-variation Watch lessons. Student = BLACK. Spine
// from his real data (tree-extended). Board-accurate, two registers, G9.4 voice.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence', 'https://www.chess.com/openings/Caro-Kann-Defense', 'https://api.chess.com/pub/player/fabianocaruana/games/archives'];

const ADVANCE: LessonScript = {
  openingId: 'pro-caruana-caro-kann', title: 'Caro-Kann — Advance 3.e5 Bf5', minutes: 8, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'bf5', moves: 'e4 c6 d4 d5 e5 Bf5', say: "White grabs space with e5, and here's the Caro's whole point: ...Bf5! The light-squared bishop develops OUTSIDE the pawn chain — the very piece that stays trapped in the French.", sayShort: '…Bf5 — the bishop escapes.', arrows: [A('c8', 'f5')], highlights: [H('f5')] }),
    b({ id: 'c5', moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5', say: "Black builds the wall behind the freed bishop with e6, then strikes the centre with c5 — challenging White's d4-e5 chain at its base. Active, principled play.", sayShort: '…e6, …c5 — build and strike.', arrows: [A('c7', 'c5')], highlights: [H('c5')] }),
    b({ id: 'qb6', moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 Be3 Qb6 Nc3 Nc6', say: "White props the centre with Be3; Black piles on with Qb6, hitting b2 and d4, and develops Nc6 to add pressure. Black's pieces swarm White's centre.", sayShort: '…Qb6 — pressure d4 and b2.', arrows: [A('d8', 'b6')], highlights: [H('b6')] }),
    b({ id: 'cxd4', moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 Be3 Qb6 Nc3 Nc6 O-O cxd4 Nxd4 Nxd4', say: "Both sides develop and Black resolves the tension with cxd4, trading down. After the knight trades on d4, Black has the freed light bishop, a sound structure, and easy equality — the comfortable Caro middlegame.", sayShort: '…cxd4 — trade into equality.', arrows: [A('c5', 'd4')], highlights: [H('d4')] }),
  ],
};

// Exchange (3.exd5) — spine from his real Exchange Caro games.
const EXCHANGE: LessonScript = {
  openingId: 'pro-caruana-caro-kann', title: 'Caro-Kann — Exchange 3.exd5', minutes: 8, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'cxd5', moves: 'e4 c6 d4 d5 exd5 cxd5', say: "White takes the Exchange Caro. Black recaptures with the c-pawn into a clean, open structure — and crucially the light-squared bishop, so often the Caro problem child, is now free to develop outside the pawn chain.", sayShort: '…cxd5 — free the light bishop.', highlights: [H('d5')] }),
    b({ id: 'nc6', moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6', say: "White develops the bishop to d3; Black brings the knight to c6, pressuring the d4-pawn and developing toward the centre.", sayShort: '…Nc6 — pressure d4.', highlights: [H('c6'), H('d4')] }),
    b({ id: 'nf6', moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6', say: "White props d4 with c3; Black's knight to f6 develops and controls the central light squares e4 and d5.", sayShort: '…Nf6 — control the centre.', highlights: [H('f6')] }),
    b({ id: 'bg4', moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4', say: "White's bishop comes to f4 eyeing the queenside; Black answers by developing the light bishop actively to g4 — the very piece that is usually buried behind the Caro pawn chain gets an excellent open diagonal outside it.", sayShort: '…Bg4 — the good bishop, active.', arrows: [A('c8', 'g4')], highlights: [H('g4')] }),
    b({ id: 'qb3', moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4 Qb3', say: "White probes with the queen to b3, hitting the b7-pawn and the d5-point. Black holds comfortably — defending b7 and keeping the sound, symmetrical structure. A balanced, instructive Exchange middlegame.", sayShort: 'Qb3 — probe; Black holds.', highlights: [H('b3'), H('b7'), H('d5')] }),
  ],
};

export const PRO_CARUANA_CARO_KANN_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-caruana-caro-kann::Advance 3.e5 Bf5': ADVANCE,
  'pro-caruana-caro-kann::Exchange 3.exd5': EXCHANGE,
};
