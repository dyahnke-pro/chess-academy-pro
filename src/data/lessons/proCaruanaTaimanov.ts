import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Caruana — Sicilian Taimanov MAIN Watch lesson. Student = BLACK. Spine is
// his real data line (caruana-taimanov-main-nc6), tree-extended to a 20-ply
// middlegame. Board-accurate, two registers, G9.4 voice. The Taimanov: ...e6 and
// ...Nc6 challenge the centre; after Nxc6 Black gets the half-open b-file and a
// strong ...d5 break.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Taimanov_Variation', 'https://www.chess.com/openings/Sicilian-Defense-Taimanov-Variation', 'https://api.chess.com/pub/player/fabianocaruana/games/archives'];

export const PRO_CARUANA_TAIMANOV_LESSON: LessonScript = {
  openingId: 'pro-caruana-taimanov',
  title: "Caruana's Taimanov Sicilian",
  minutes: 9,
  orientation: 'black',
  kind: 'main',
  sources: SRC,
  beats: [
    b({ id: 'e6', moves: 'e4 c5 Nf3 e6', say: "The Taimanov Sicilian — Caruana's flexible, less-forcing answer to e4. The early e6 keeps every option open, letting Black choose his structure based on what White reveals. Sound and rich in plans.", sayShort: '…e6 — the flexible Sicilian.', highlights: [H('e6')] }),
    b({ id: 'nc6', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nc3 a6', say: "Black opens the centre, develops the knight to c6 to pressure White's d4-knight, and plays the universal a6, controlling b5. Piece pressure first, pawn commitments later — the Taimanov's calling card.", sayShort: '…Nc6, …a6 — pressure and flexibility.', arrows: [A('b8', 'c6')], highlights: [H('c6')] }),
    b({ id: 'nxc6', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nc3 a6 Nxc6 bxc6 Bd3 d5', say: "White trades on c6 and Black recaptures with the b-pawn, accepting doubled c-pawns in return for the half-open b-file and a strong centre. Then d5 strikes — the freeing break that challenges White's e4 head-on.", sayShort: '…bxc6, …d5 — strike the centre.', arrows: [A('d7', 'd5')], highlights: [H('d5')] }),
    b({ id: 'oo', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nc3 a6 Nxc6 bxc6 Bd3 d5 O-O Nf6', say: "White castles and Black develops the knight to f6, reinforcing the d5-pawn and pressuring e4. Black's centre is broad and his pieces come out naturally — comfortable, active development.", sayShort: '…Nf6 — reinforce d5, hit e4.', arrows: [A('g8', 'f6')], highlights: [H('f6')] }),
    b({ id: 'mid', moves: 'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nc3 a6 Nxc6 bxc6 Bd3 d5 O-O Nf6 Qe2 Be7 Rd1 Qc7', say: "White develops the queen to e2 and the rook to d1, pressuring the d-file; Black calmly finishes with Be7 and Qc7. Black has the bishop pair, a mobile centre, and the half-open b-file for counterplay — a dynamic, fully playable middlegame.", sayShort: '…Qc7 — bishop pair, active game.', arrows: [A('d8', 'c7')], highlights: [H('c7')] }),
  ],
};
