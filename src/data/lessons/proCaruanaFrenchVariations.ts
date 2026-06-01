import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Caruana — French per-variation Watch lessons. Student = BLACK. Spine from
// his real data (tree-extended). Board-accurate, two registers, G9.4 voice.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'concept:pawn-minority-attack', 'https://en.wikipedia.org/wiki/French_Defence', 'https://www.chess.com/openings/French-Defense', 'https://api.chess.com/pub/player/fabianocaruana/games/archives'];

const WINAWER: LessonScript = {
  openingId: 'pro-caruana-french', title: 'French — Winawer 3...Bb4', minutes: 8, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'bb4', moves: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5', say: "The Winawer — the sharpest French. Black pins the c3-knight with Bb4 and strikes the pawn chain at once with c5, refusing White any quiet build-up.", sayShort: '…Bb4, …c5 — pin and strike.', arrows: [A('f8', 'b4')], highlights: [H('c5')] }),
    b({ id: 'bxc3', moves: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7', say: "White questions the bishop with a3; Black trades on c3, doubling White's pawns and damaging the queenside for good, then ...Ne7 heads to attack the centre.", sayShort: '…Bxc3 — double White’s pawns.', arrows: [A('b4', 'c3')], highlights: [H('c3')] }),
    b({ id: 'qc7', moves: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7 Qg4 Qc7', say: "White lunges Qg4 at g7; Black ignores it with Qc7, eyeing the weak c3-pawns and e5. The poisoned-pawn main line — Black gives up the kingside pawns for a crushing structural and central counterattack.", sayShort: '…Qc7 — counterattack the centre.', arrows: [A('d8', 'c7')], highlights: [H('c7')] }),
    b({ id: 'cxd4', moves: 'e4 e6 d4 d5 Nc3 Bb4 e5 c5 a3 Bxc3+ bxc3 Ne7 Qg4 Qc7 Qxg7 Rg8 Qxh7 cxd4', say: "White grabs g7 and h7; Black opens the c-file with cxd4, smashing into White's tripled, shattered queenside. Black has a raging initiative against the weak pawns and centre — full compensation and more. Winawer chaos, in Black's favour.", sayShort: '…cxd4 — smash the queenside.', arrows: [A('c5', 'd4')], highlights: [H('d4')] }),
  ],
};

export const PRO_CARUANA_FRENCH_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-caruana-french::Winawer 3...Bb4': WINAWER,
};
