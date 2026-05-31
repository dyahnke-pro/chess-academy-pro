import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Samay Raina — vs Caro per-variation lessons (White). Names match
// pro-repertoires.json. Two registers; no move-number prefixes; green arrows only.
const VIS = 'rgba(40,185,95,0.92)'; const KEY = 'rgba(255,214,0,0.88)'; const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const OID = 'pro-samayraina-caro-white';
const SRC = ['concept:pos-development', 'concept:pos-bishop-pair', 'https://www.chess.com/openings/Caro-Kann-Defense', 'https://api.chess.com/pub/player/samayraina/games/archives'];

const KARPOV: LessonScript = {
  openingId: OID, title: 'vs Caro — 4…Nd7 (Karpov)', minutes: 5,
  orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'nd7', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nd7 Nf3 Ngf6 Nxf6+ Nxf6 Bd3',
      arrows: [], highlights: [{ square: 'd3', color: KEY }, { square: 'h7', color: SOFT }],
      say: "The solid Karpov Variation (…Nd7). Black avoids the pin and keeps a sturdy structure. We trade a pair of knights and develop Bd3 toward h7 — White has a small, safe edge in space and development against a famously rock-solid setup.",
      sayShort: 'Bd3 — safe space edge.' }),
    b({ id: 'develop', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nd7 Nf3 Ngf6 Nxf6+ Nxf6 Bd3 Bg4 c3 e6 O-O Bd6',
      arrows: [], highlights: [{ square: 'c3', color: KEY }, { square: 'd4', color: SOFT }],
      say: "We brace the centre with c3, castle, and reach a classic Caro middlegame. Black is solid but slightly passive; White's plan is the central or kingside expansion that the extra space allows.",
      sayShort: 'c3, O-O — classic Caro edge.' }),
    b({ id: 'plan', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nd7 Nf3 Ngf6 Nxf6+ Nxf6 Bd3 Bg4 c3 e6 O-O Bd6',
      arrows: [A('d1', 'e2'), A('f3', 'e5')], highlights: [{ square: 'e5', color: KEY }],
      say: "The plan: Qe2, Rd1 and a future Ne5 or the c4/d5 break to open lines for the bishop pair. White grinds the small structural and space edge — the classic way to beat the Caro is patience, not fireworks.",
      sayShort: 'Plan: Ne5/central break, grind.' }),
  ],
};

const EXF6: LessonScript = {
  openingId: OID, title: 'vs Caro — 4…Nf6 5.Nxf6 exf6', minutes: 5,
  orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'nf6', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ exf6',
      arrows: [], highlights: [{ square: 'f6', color: KEY }, { square: 'f7', color: SOFT }],
      say: "When Black recaptures on f6 with the e-pawn (the Tartakower), we get a structure with a clean pawn majority on the queenside — three-versus-two — while Black's kingside pawns are tripled-up and static. A pure structural battle.",
      sayShort: '…exf6 — White’s clean majority.' }),
    b({ id: 'develop', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ exf6 Bc4 Bd6 Qe2+ Qe7 Qxe7+ Kxe7',
      arrows: [], highlights: [{ square: 'c4', color: KEY }],
      say: "Bc4 develops with an eye on f7, and we are happy to trade queens — in the endgame Black's wrecked kingside pawn structure becomes a permanent liability while our queenside majority rolls.",
      sayShort: 'Bc4, trade queens — better ending.' }),
    b({ id: 'plan', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ exf6 Bc4 Bd6 Qe2+ Qe7 Qxe7+ Kxe7',
      arrows: [], highlights: [{ square: 'b4', color: KEY }, { square: 'f6', color: SOFT }],
      say: "The plan: advance the healthy queenside majority with a4-b4-b5 to create a passed pawn, while Black's kingside majority can never produce one. Trade pieces, keep the structure, and convert — a clean endgame technique lesson.",
      sayShort: 'Plan: run the queenside majority.' }),
  ],
};

export const PRO_SAMAYRAINA_CARO_WHITE_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::4…Nd7 (Karpov)`]: KARPOV,
  [`${OID}::4…Nf6 5.Nxf6 exf6`]: EXF6,
};
