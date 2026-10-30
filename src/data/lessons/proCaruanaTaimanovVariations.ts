import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Caruana — Taimanov per-variation Watch lessons. Student = BLACK. Spines
// from his real data (tree-extended). Board-accurate, two registers, G9.4 voice.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Taimanov_Variation', 'https://www.chess.com/openings/Sicilian-Defense-Taimanov-Variation', 'https://api.chess.com/pub/player/fabianocaruana/games/archives'];

const QC7: LessonScript = {
  openingId: 'pro-caruana-taimanov', title: 'Taimanov — the …Qc7 System', minutes: 8, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'a6', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6', say: "…a6 comes first. The pawn takes b5 away from White's knights, and that protects your queen's plan: put the queen on c7 at once and Nb5 attacks it, the knight eyeing d6 as well. With the pawn on a6 the queen can come to c7 next.", sayShort: '…a6 first — no Nb5 for White.', arrows: [A('d4', 'b5')], highlights: [H('b5')] }),
    b({ id: 'qc7', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 Nc3 Qc7 Be2 Nf6', say: "Nc3, and now the queen goes to c7. It eyes the c-file and the e5-square, and with b5 covered no knight can chase it. Be2 is a calm developing move; …Nf6 develops and hits the e4-pawn.", sayShort: '…Qc7, …Nf6 — c-file, hit e4.', arrows: [A('c7', 'e5'), A('f6', 'e4')], highlights: [H('c7'), H('e4')] }),
    b({ id: 'be7', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 Nc3 Qc7 Be2 Nf6 O-O Bc5 Nb3 Be7', say: "White castles; you probe with …Bc5, hitting the d4-knight, and it retreats to b3 before the bishop drops back to e7. The knight on b3 stands further from the centre, and your development is nearly complete.", sayShort: '…Bc5, …Be7 — provoke and regroup.', arrows: [A('f8', 'e7')], highlights: [H('e7')] }),
    b({ id: 'mid', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6 Nc3 Qc7 Be2 Nf6 O-O Bc5 Nb3 Be7 Kh1 d6 f4 Nc6', say: "White tucks the king away on h1 and expands with f4; you prop the centre with …d6 and develop the knight to c6. A typical Scheveningen middlegame: your small, solid centre against their space, with counterplay on the c-file and the queenside.", sayShort: '…d6, …Nc6 — solid, counterplay coming.', arrows: [A('b8', 'c6')], highlights: [H('c6')] }),
  ],
};

export const PRO_CARUANA_TAIMANOV_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-caruana-taimanov::…Qc7 system': QC7,
};
