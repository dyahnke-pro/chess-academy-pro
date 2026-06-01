import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Caruana — Ruy Lopez per-variation Watch lessons. Student = WHITE. Spine
// from his real data (caruana-ruy-lopez-morphy-a6, tree-extended). Board-
// accurate, two registers, G9.4 voice.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Ruy_Lopez', 'https://www.chess.com/openings/Ruy-Lopez-Opening', 'https://api.chess.com/pub/player/fabianocaruana/games/archives'];

const MORPHY_CLOSED: LessonScript = {
  openingId: 'pro-caruana-ruy-lopez', title: 'Ruy Lopez — Morphy …a6 Closed', minutes: 9, orientation: 'white', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'ba4', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4', say: "When Black plays a6, Caruana retreats the bishop to a4, keeping the pin on the long diagonal. This is the Closed Ruy — the deepest, richest battleground in all of chess, where Caruana's preparation is unmatched.", sayShort: 'Ba4 — keep the pin.', arrows: [A('b5', 'a4')], highlights: [H('a4')] }),
    b({ id: 'oo', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1', say: "Black develops Nf6 and Be7, both sides preparing to castle, and White brings the rook to e1 to support the e4-pawn. This is the classical Ruy build-up — slow, sound, and full of long-term plans.", sayShort: 'Re1 — support e4.', arrows: [A('f1', 'e1')], highlights: [H('e1')] }),
    b({ id: 'bb3', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O', say: "Black gains queenside space with b5, and the bishop retreats to b3 — still on the powerful a2-g8 diagonal, eyeing the f7-square. Both sides complete their kingside castling. The stage is set for the central and queenside maneuvering.", sayShort: 'Bb3 — the a2-g8 diagonal.', arrows: [A('a4', 'b3')], highlights: [H('b3')] }),
    b({ id: 'a4', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O a4', say: "Caruana strikes the queenside with a4 — challenging Black's b5-pawn and opening lines where his pieces are better placed. A modern, aggressive way to fight the Closed Ruy that Caruana has used at the highest level.", sayShort: 'a4 — strike the queenside.', arrows: [A('a2', 'a4')], highlights: [H('a4')] }),
    b({ id: 'mid', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O a4 b4 a5 d6 c3 Rb8 h3', say: "Black locks the queenside with b4, White clamps with a5, and after c3 to prop the centre and h3 to make luft, the position settles into a rich Closed-Ruy middlegame. White has the bishop pair's potential and queenside space; the slow battle of plans begins — Caruana's natural habitat.", sayShort: 'c3, h3 — the rich middlegame.', highlights: [H('a5')] }),
  ],
};

export const PRO_CARUANA_RUY_LOPEZ_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-caruana-ruy-lopez::Morphy …a6 Closed': MORPHY_CLOSED,
};
