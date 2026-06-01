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
    b({ id: 'qc7', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Qc7', say: "Black develops the queen early to c7 — the flexible Taimanov move-order. The queen eyes the c-file and the e5-square, keeping Black's options open before committing the knights.", sayShort: '…Qc7 — flexible, eye the c-file.', arrows: [A('d8', 'c7')], highlights: [H('c7')] }),
    b({ id: 'a6', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Qc7 Nc3 a6 Be2 Nf6', say: "Black slots in the universal a6 to control b5, then develops the knight to f6 to pressure e4. Natural, harmonious development in classic Sicilian style.", sayShort: '…a6, …Nf6 — control b5, hit e4.', arrows: [A('g8', 'f6')], highlights: [H('f6')] }),
    b({ id: 'be7', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Qc7 Nc3 a6 Be2 Nf6 O-O Bc5 Nb3 Be7', say: "White castles; Black probes with Bc5 to provoke the knight to b3, then drops the bishop back to e7. A small finesse — Black gains a tempo on the knight before completing development.", sayShort: '…Bc5, …Be7 — provoke and regroup.', arrows: [A('f8', 'e7')], highlights: [H('e7')] }),
    b({ id: 'mid', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Qc7 Nc3 a6 Be2 Nf6 O-O Bc5 Nb3 Be7 Kh1 d6 f4 Nc6', say: "White tucks the king and expands with f4; Black props the centre with d6 and develops the knight to c6. A typical Scheveningen-style middlegame: Black's solid small centre against White's space, with counterplay on the c-file and queenside. Fully playable for Black.", sayShort: '…d6, …Nc6 — solid, counterplay coming.', arrows: [A('b8', 'c6')], highlights: [H('c6')] }),
  ],
};

export const PRO_CARUANA_TAIMANOV_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-caruana-taimanov::…Qc7 system': QC7,
};
