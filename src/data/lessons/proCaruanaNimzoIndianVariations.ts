import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Pro Caruana — Nimzo-Indian per-variation Watch lessons. Student = BLACK.
// Spines from his real data (tree-extended). Board-accurate, two registers, G9.4.

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
interface BeatInit { id: string; moves: string; say: string; sayShort: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const A = (from: string, to: string): AnnotationArrow => ({ from, to, color: VIS });
const H = (square: string): AnnotationHighlight => ({ square, color: KEY });
const SRC = ['book:chess-fundamentals', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Nimzo-Indian_Defence', 'https://www.chess.com/openings/Nimzo-Indian-Defense', 'https://api.chess.com/pub/player/fabianocaruana/games/archives'];

const RUBINSTEIN: LessonScript = {
  openingId: 'pro-caruana-nimzo-indian', title: 'Nimzo-Indian — Rubinstein with …c5', minutes: 8, orientation: 'black', kind: 'variation', sources: SRC,
  beats: [
    b({ id: 'c5', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 c5', say: "Against the Rubinstein e3, Black strikes at once with c5, hitting White's d4-pawn and refusing to let White build an unchallenged centre. The central fight starts immediately.", sayShort: '…c5 — challenge d4 now.', arrows: [A('c7', 'c5')], highlights: [H('c5')] }),
    b({ id: 'bxc3', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 c5 Bd3 Nc6 Nf3 Bxc3+ bxc3', say: "Both sides develop, and Black trades the bishop for the knight; White recaptures with the b-pawn. Now White has the classic Nimzo target — doubled, weak c-pawns on c3 and c4.", sayShort: '…Bxc3 — double White\'s pawns.', arrows: [A('b4', 'c3')], highlights: [H('c3')] }),
    b({ id: 'd6e5', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 c5 Bd3 Nc6 Nf3 Bxc3+ bxc3 d6 e4 e5', say: "Black plays d6 and then meets White's e4 with e5, locking the centre. With the pawns fixed, Black will play against the doubled c-pawns while White's bishops are blunted by the closed structure.", sayShort: '…d6, …e5 — lock the centre.', highlights: [H('e5')] }),
    b({ id: 'ne7', moves: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 c5 Bd3 Nc6 Nf3 Bxc3+ bxc3 d6 e4 e5 d5 Ne7 Nh4 g6', say: "White closes with d5 and Black reroutes the knight to e7, heading for the kingside; White's knight goes to h4 and Black plays g6. A classic blocked Nimzo middlegame — Black's structure is sound and the doubled c-pawns remain a long-term target.", sayShort: '…Ne7, …g6 — sound, target c-pawns.', arrows: [A('c6', 'e7')], highlights: [H('e7')] }),
  ],
};

export const PRO_CARUANA_NIMZO_INDIAN_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-caruana-nimzo-indian::Rubinstein with …c5': RUBINSTEIN,
};
