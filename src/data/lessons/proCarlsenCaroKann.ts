import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Magnus Carlsen — Caro-Kann, BLACK. 514 games (online + OTB), 72%. The
// French without the bad bishop: …c6 supports …d5, the light-squared bishop
// escapes to f5 BEFORE …e6 locks it in. Main line = the Advance with …Bf5.
// Variations cover the Two Knights, the Exchange and the d3 King's-Indian-Attack.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence', 'https://www.chess.com/openings/Caro-Kann-Defense', 'https://api.chess.com/pub/player/magnuscarlsen/games/archives'];

export const PRO_CARLSEN_CARO_KANN_LESSON: LessonScript = {
  openingId: 'pro-carlsen-caro-kann',
  title: "This repertoire's Caro-Kann — Advance with …Bf5",
  minutes: 11,
  orientation: 'black',
  kind: 'variation',
  sources: SRC,
  beats: [
    b({ id: 'caro', moves: 'e4 c6 d4 d5 e5 Bf5', arrows: [A('f5', 'b1')], highlights: [H('d5'), H('f5')], say: "The Caro-Kann supports …d5 with …c6 — and the whole point comes on move three: against the Advance, Black develops the light-squared bishop to f5, OUTSIDE the pawn chain, before playing …e6. That's the French-player's dream: the bad bishop is free, and the structure is rock-solid.", sayShort: 'Bf5 — the good bishop, out first.' }),
    b({ id: 'e6', moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 a5', highlights: [H('e6'), H('a5')], say: "With the bishop safely outside, Black plays …e6 to complete the chain and …a5 to grab queenside space and stop White's b4. The structure is the French Advance, but Black's pieces are far happier. Solid, with a clear queenside plan.", sayShort: 'e6, a5 — solid chain, grab space.' }),
    b({ id: 'c5break', moves: 'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 a5 O-O a4 Nc3 Nd7', arrows: [A('d7', 'b6')], highlights: [H('a4'), H('d7')], say: "Black clamps with …a4, freezing White's queenside, and brings the knight to d7, heading for b6 or to support the …c5 break. Every piece has a job: pressure d4, undermine the e5-pawn, and play on the queenside where Black has the space.", sayShort: 'a4, Nd7 — clamp, prep …c5.' }),
  ],
};

const TWO_KNIGHTS: LessonScript = {
  openingId: 'pro-carlsen-caro-kann', title: 'vs Two Knights', minutes: 6, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'd5', moves: 'e4 c6 Nc3 d5 Nf3 dxe4 Nxe4 Nf6', arrows: [A('f6', 'e4')], highlights: [H('e4')], say: "Against the Two Knights, Black plays …d5 and after the trade on e4 develops …Nf6, hitting the centralised knight. Black gets free, equal development by challenging White's only active piece. No fuss, full equality.", sayShort: 'd5, Nf6 — hit the e4-knight.' }),
    b({ id: 'nxf6', moves: 'e4 c6 Nc3 d5 Nf3 dxe4 Nxe4 Nf6 Nxf6+ exf6 d4 Bd6 Bd3 O-O', arrows: [A('d6', 'h2')], highlights: [H('f6')], say: "After Nxf6+ exf6, Black recaptures toward the centre, opening the e-file and freeing the dark-squared bishop. The doubled f-pawns are healthy — they grip e5 and g5 — and Black's two bishops eye White's kingside. A comfortable, slightly unbalanced middlegame.", sayShort: 'exf6 — bishops and the e-file.' }),
  ],
};

const EXCHANGE: LessonScript = {
  openingId: 'pro-carlsen-caro-kann', title: 'Exchange', minutes: 6, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'cxd5', moves: 'e4 c6 d4 d5 exd5 cxd5', highlights: [H('d5')], say: "The Exchange Variation — White trades on d5, giving Black a free game with the light-squared bishop already unobstructed. Black recaptures with the c-pawn and develops naturally; the symmetrical structure is comfortable and the so-called 'bad' bishop is anything but.", sayShort: 'cxd5 — free, symmetrical, comfy.' }),
    b({ id: 'bf5', moves: 'e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4', arrows: [A('g4', 'd1')], highlights: [H('g4')], say: "Black mirrors White's setup, develops …Nc6 and …Nf6, and pins with …Bg4 — getting the light bishop active again. The position is a balanced Exchange where understanding, not memory, decides. This repertoire is happy to grind these from full equality.", sayShort: 'Bg4 — active bishop, balanced.' }),
  ],
};

const KIA_D3: LessonScript = {
  openingId: 'pro-carlsen-caro-kann', title: 'vs 2.Nf3 d3 (KIA)', minutes: 5, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'd5', moves: 'e4 c6 Nf3 d5 d3 dxe4 dxe4 Qxd1+ Kxd1', highlights: [H('e4')], say: "Against the quiet Nf3 and d3 King's-Indian-Attack setup, Black strikes with …d5 and forces the queens off — …dxe4, dxe4, …Qxd1+ Kxd1. White loses castling rights, and in the queenless middlegame Black's solid structure and easy development give a pleasant, risk-free game.", sayShort: 'Trade queens — White loses castling.' }),
    b({ id: 'nf6', moves: 'e4 c6 Nf3 d5 d3 dxe4 dxe4 Qxd1+ Kxd1 Nf6 Nbd2 Bg4', arrows: [A('g4', 'f3')], highlights: [H('f6'), H('g4')], say: "Black develops …Nf6 hitting e4 and pins with …Bg4. With the queens gone and White's king stuck in the centre, Black has nothing to fear and a slight initiative. The endgame-like position suits a technical player perfectly.", sayShort: 'Nf6, Bg4 — press the stuck king.' }),
  ],
};

export const PRO_CARLSEN_CARO_KANN_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-carlsen-caro-kann::vs Two Knights': TWO_KNIGHTS,
  'pro-carlsen-caro-kann::Exchange': EXCHANGE,
  'pro-carlsen-caro-kann::vs 2.Nf3 d3 (KIA)': KIA_D3,
};
